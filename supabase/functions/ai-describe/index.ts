import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate, jsonError, allowedOrigin, corsHeaders } from "../_shared/auth.ts";
import { GATE_QUESTION, parseDecision, type GateResult } from "./gate.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";

/**
 * Two models, on purpose.
 *
 * The gate is one yes/no question asked through the Decisions API: is this
 * a garment? A photo of a room or a face is refused there, before the
 * expensive description is asked for. The Decisions API answers with a
 * calibrated probability and no output tokens at all, so the gate is
 * nearly free. That is what keeps the token bill down: the rejected photos
 * never reach the big call.
 *
 * The description itself is asked of a stronger model, because it has to
 * read a garment properly and say what it cannot see.
 */
const GATE_MODEL = "gemini-decision-1";
/**
 * The description is asked of one of these, in order.
 *
 * Every model has its own quota on the free tier, and the good ones run
 * out at different times, so more than one is needed: a model that is out
 * of quota is skipped and the next is used, and the feature keeps working.
 *
 * Measured against a real photograph of a wedding gown on the free tier:
 *
 *   gemini-3.1-flash-lite   4.5s   3,446 tokens   works
 *   gemini-3.5-flash-lite  11.8s   4,222 tokens   works
 *   gemini-3.6-flash        out of quota
 *   gemini-3.8-flash        temporarily overloaded
 *   gemini-3-flash-preview  out of quota
 *
 * The 3.1 flash-lite is first: it is the fastest and the cheapest of the
 * ones that work. The 3.6 and 3.8 stay in the list behind it, because
 * their quotas come back and they are the stronger models.
 */
const DESCRIBE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
] as const;

interface DescribeRequest {
  dressId: string;
  imageUrls: string[];
  existingNames: string[];
}

interface DressDraft {
  is_a_garment?: boolean;
  name_en: string;
  name_ar: string;
  garment_type: string;
  silhouette: string;
  neckline: string;
  sleeves: string;
  fabrics: string[];
  color: string;
  embellishment: string;
  hem_train: string;
  back_closure: string;
  description_en: string;
  description_ar: string;
  suggested_materials: string[];
  confidence: string;
}

/** Only images hosted by this project's own storage may be fetched. */
function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "ofnkpyzmzhxtpwwvrbci.supabase.co" || host.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

interface GeminiPart {
  inlineData?: { mimeType: string; data: string };
  text?: string;
  /** How finely the model should read the picture. */
  mediaResolution?: 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 'MEDIA_RESOLUTION_HIGH';
}

/** Waits without blocking anything else. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** What one Gemini call cost, in tokens. */
interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

interface GeminiAnswer {
  text: string;
  usage: TokenUsage;
  raw: unknown;
}

/** One call to Gemini. Returns the answer and what it cost. */
async function askGemini(
  apiKey: string,
  model: string,
  text: string,
  imageParts: GeminiPart[],
  options: {
    temperature: number;
    maxOutputTokens: number;
    json?: boolean;
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  },
): Promise<GeminiAnswer | { error: string } | null> {
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
  };
  if (options.json) generationConfig.responseMimeType = "application/json";
  // Thinking tokens are billed as output and are counted against
  // maxOutputTokens, so a model left on its default "high" reasoning can
  // spend the whole budget thinking and return a truncated answer. The
  // budget is set here instead.
  if (options.thinkingLevel) {
    generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
  }

  try {
    // The resolution hint travels with each picture.
    const parts = imageParts.map((part) => {
      if (!part.inlineData || !part.mediaResolution) return { inlineData: part.inlineData };
      return {
        inlineData: part.inlineData,
        mediaResolution: { level: part.mediaResolution },
      };
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text }, ...parts] }],
          generationConfig,
        }),
      },
    );
    if (!res.ok) {
      // The provider's own words, so a failure can be read rather than
      // guessed at.
      const detail = await res.text().catch(() => "");
      return { error: `${res.status} ${detail.slice(0, 300)}` };
    }
    const data = await res.json();
    const usage = (data?.usageMetadata ?? {}) as {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
    return {
      text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      usage: {
        input: usage.promptTokenCount ?? 0,
        output: usage.candidatesTokenCount ?? 0,
        total: usage.totalTokenCount ?? 0,
      },
      raw: data,
    };
  } catch (e) {
    return { error: `request failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * One yes/no question, asked through the Decisions API.
 *
 * The answer is a calibrated probability and there are no output tokens, so
 * this costs a fraction of what a text model would. Returns null when the
 * API could not answer, so the caller can go on to describe the photo
 * rather than refusing it.
 */
async function askDecision(
  apiKey: string,
  image: { type: 'image'; data: string; mime_type: string; resolution: 'low' },
): Promise<(GateResult & { usage: TokenUsage }) | null> {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/decisions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          model: GATE_MODEL,
          input: [image],
          questions: { is_garment: GATE_QUESTION },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const usage = (data?.usage ?? {}) as {
      total_input_tokens?: number;
      total_output_tokens?: number;
      total_tokens?: number;
    };
    const answer = parseDecision(data);
    if (!answer) return null;
    return {
      ...answer,
      usage: {
        input: usage.total_input_tokens ?? 0,
        output: usage.total_output_tokens ?? 0,
        total: usage.total_tokens ?? 0,
      },
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const caller = await authenticate(req);
  if (!caller) {
    return jsonError(401, { error: "unauthorized", message: "Sign in to use this feature." }, origin);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonError(400, { error: "no_key", message: "No vision key configured. Add one in Tools and APIs." }, origin);
  }

  let body: DescribeRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, { error: "bad_request", message: "Invalid JSON body" }, origin);
  }

  const { dressId, imageUrls, existingNames } = body;
  if (!dressId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return jsonError(400, { error: "bad_request", message: "dressId and at least one imageUrl required" }, origin);
  }

  const urls = imageUrls.slice(0, 4).filter(isAllowedImageUrl);
  if (urls.length === 0) {
    return jsonError(400, { error: "bad_image", message: "Images must be hosted by this project's storage." }, origin);
  }

  // Fetch images and base64-encode them.
  const imageParts: GeminiPart[] = [];
  const gateImages: { type: 'image'; data: string; mime_type: string; resolution: 'low' }[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // The bytes are encoded in chunks. Building the string one character
      // at a time is quadratic and burns the function's CPU budget on a
      // large photograph, which is enough to get it killed.
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const mime = res.headers.get("content-type") || "image/jpeg";
      const data = btoa(binary);
      // The description reads the picture at medium resolution. High
      // resolution costs more tokens and more compute in the function
      // without showing the model anything it cannot already read.
      imageParts.push({ inlineData: { mimeType: mime, data }, mediaResolution: 'MEDIA_RESOLUTION_MEDIUM' });
      // The gate only needs to know whether a garment is there, so it reads
      // the picture at low resolution. That is where the saving is.
      gateImages.push({ type: 'image', data, mime_type: mime, resolution: 'low' });
    } catch {
      // skip failed images
    }
  }

  if (imageParts.length === 0) {
    return jsonError(400, { error: "no_images", message: "Could not fetch any images" }, origin);
  }

  // ---- STAGE 1: the gate ---------------------------------------------------
  // The photographs are judged one at a time, cheapest first. The first
  // "garment" verdict stops the search, so a good photo costs one call. A
  // photo that looks like something else is checked against the next
  // picture, because staff sometimes photograph a detail shot first.
  let gate: GateResult = { verdict: 'unclear', subject: '', reason: '', confidence: 0, probability: 0 };
  let gateSeenGarment = false;
  let gateUsage: TokenUsage = { input: 0, output: 0, total: 0 };

  for (const image of gateImages) {
    const answer = await askDecision(apiKey, image);
    if (!answer) continue;
    gateUsage = {
      input: gateUsage.input + answer.usage.input,
      // The Decisions API never produces output tokens.
      output: gateUsage.output + answer.usage.output,
      total: gateUsage.total + answer.usage.total,
    };
    if (answer.verdict === 'garment') {
      gate = answer;
      gateSeenGarment = true;
      break;
    }
    // Keep the first refusal as the answer, but keep looking.
    if (gate.verdict !== 'not_garment') gate = answer;
  }

  if (!gateSeenGarment && gate.verdict === 'not_garment') {
    // Refused. The expensive model is never called, so this costs almost
    // nothing.
    return new Response(
      JSON.stringify({
        rejected: true,
        subject: gate.subject,
        reason: gate.reason,
        model: GATE_MODEL,
        usage: gateUsage,
      }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // ---- STAGE 2: the description --------------------------------------------
  const names = (existingNames ?? []).filter(Boolean).slice(0, 50);
  const userText = names.length > 0
    ? `Names already used in this catalogue (do not repeat these, and do not pick a name in the same style): ${names.join(", ")}\n\nCatalogue this garment.`
    : "Catalogue this garment.";

  // The models are tried in turn. A model that is out of quota is skipped
  // rather than being reported to the owner as a broken feature.
  let lastError = '';
  let lastRateLimit = false;

  for (const model of DESCRIBE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const answer = await askGemini(apiKey, model, SYSTEM_PROMPT + "\n\n" + userText, imageParts, {
        temperature: 0.3,
        // Generous, because the thinking tokens come out of this same budget.
        maxOutputTokens: 8192,
        json: true,
        // Enough reasoning to read the garment carefully, but not the default
        // "high", which spent the budget thinking and truncated the answer.
        thinkingLevel: 'medium',
      });

      if (!answer) {
        lastError = 'The vision service did not answer.';
        await sleep(600);
        continue;
      }
      if ('error' in answer) {
        lastError = answer.error;
        // A rate limit is not a failure: the atelier describes several
        // dresses in a row and the free tier allows only so many a day.
        // Wait a moment and try the same model again, then move on to the
        // next one rather than telling the owner the AI is broken.
        if (answer.error.startsWith('429')) {
          lastRateLimit = true;
          if (attempt < 1) {
            await sleep(3000);
            continue;
          }
          break;
        }
        break;
      }

      let parsed: DressDraft;
      try {
        const cleaned = answer.text
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // The answer is included so the failure can be read, not guessed at.
        lastError = 'AI returned invalid JSON';
        if (attempt < 1) continue;
        break;
      }

      // The second safety net. The gate is a probability and can be wrong;
      // the description model has read every photograph carefully and can
      // say there is no garment here either.
      if (parsed.is_a_garment === false) {
        return new Response(
          JSON.stringify({
            rejected: true,
            subject: '',
            reason: parsed.description_en || 'The photographs do not show a garment.',
            model,
            gateProbability: gate.probability,
            usage: {
              gate: gateUsage,
              describe: answer.usage,
              total: gateUsage.total + answer.usage.total,
            },
          }),
          { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          draft: parsed,
          model,
          raw: answer.raw,
          gateProbability: gate.probability,
          usage: {
            gate: gateUsage,
            describe: answer.usage,
            total: gateUsage.total + answer.usage.total,
          },
        }),
        { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }
  }

  // Every model was out of quota or failed.
  if (lastRateLimit) {
    return jsonError(429, {
      error: 'rate_limited',
      message: 'The AI service is busy. Wait a moment and describe again.',
      detail: lastError,
    }, origin);
  }
  return jsonError(502, { error: "provider_error", message: lastError || "Unexpected failure" }, origin);
});
