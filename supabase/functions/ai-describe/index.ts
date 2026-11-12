import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate, jsonError, allowedOrigin, corsHeaders } from "../_shared/auth.ts";
import { GATE_PROMPT, parseGate, type GateResult } from "./gate.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";

/**
 * Two models, on purpose.
 *
 * The gate is a cheap question asked of a small model: is this a garment?
 * A photo of a room or a face is refused there, before the expensive
 * description is asked for. That is what keeps the token bill down: the
 * rejected photos never reach the big call.
 *
 * The description itself is asked of a stronger model, because it has to
 * read a garment properly and say what it cannot see.
 */
const GATE_MODEL = "gemini-3.5-flash-lite";
const DESCRIBE_MODEL = "gemini-3-flash-preview";

interface DescribeRequest {
  dressId: string;
  imageUrls: string[];
  existingNames: string[];
}

interface DressDraft {
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
}

/** One call to Gemini. Returns the raw text, or null if the call failed. */
async function askGemini(
  apiKey: string,
  model: string,
  text: string,
  imageParts: GeminiPart[],
  options: { temperature: number; maxOutputTokens: number; json?: boolean },
): Promise<string | null> {
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
  };
  if (options.json) generationConfig.responseMimeType = "application/json";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text }, ...imageParts] }],
          generationConfig,
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
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
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const mime = res.headers.get("content-type") || "image/jpeg";
      imageParts.push({ inlineData: { mimeType: mime, data: btoa(binary) } });
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
  let gate: GateResult = { verdict: 'unclear', subject: '', reason: '' };
  let gateSeenGarment = false;

  for (const part of imageParts) {
    const gateText = await askGemini(apiKey, GATE_MODEL, GATE_PROMPT, [part], {
      temperature: 0,
      maxOutputTokens: 120,
      json: true,
    });
    if (!gateText) continue;
    const answer = parseGate(gateText);
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
      }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  // ---- STAGE 2: the description --------------------------------------------
  const names = (existingNames ?? []).filter(Boolean).slice(0, 50);
  const userText = names.length > 0
    ? `Names already used in this catalogue (do not repeat these, and do not pick a name in the same style): ${names.join(", ")}\n\nCatalogue this garment.`
    : "Catalogue this garment.";

  const geminiBody = {
    contents: [{
      parts: [{ text: SYSTEM_PROMPT + "\n\n" + userText }, ...imageParts],
    }],
    generationConfig: {
      // Low temperature on purpose: this is a catalogue entry, not a poem.
      // The name still has to be picked, but it must follow the picture.
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${DESCRIBE_MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(geminiBody),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        return jsonError(502, { error: "provider_error", message: errText.slice(0, 300) }, origin);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      let parsed: DressDraft;
      try {
        const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        if (attempt === 0) continue;
        return jsonError(502, { error: "parse_error", message: "AI returned invalid JSON" }, origin);
      }

      return new Response(
        JSON.stringify({ draft: parsed, model: DESCRIBE_MODEL, raw: data }),
        { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    } catch (e) {
      if (attempt === 0) continue;
      return jsonError(502, { error: "network_error", message: String(e) }, origin);
    }
  }

  return jsonError(500, { error: "unknown", message: "Unexpected failure" }, origin);
});
