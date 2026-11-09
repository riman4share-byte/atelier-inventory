import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_MODEL = "gemini-2.5-flash";

interface DescribeRequest {
  dressId: string;
  imageUrls: string[];
  existingNames: string[];
}

interface DressDraft {
  name_en: string;
  name_ar: string;
  silhouette: string;
  neckline: string;
  sleeves: string;
  fabrics: string[];
  color: string;
  description_en: string;
  description_ar: string;
  suggested_materials: string[];
  confidence: string;
}

const SYSTEM_PROMPT = `You are a fashion copywriter for a wedding dress atelier. You receive up to 4 photos of one dress and must return a single JSON object (no markdown, no code fences) with these fields:

- name_en: short, elegant English name (2-4 words), unique (avoid the names listed in "existing names")
- name_ar: elegant Arabic name (2-4 words)
- silhouette: one of: A-line, mermaid, ball gown, sheath, empire, trumpet, fit-and-flare, other
- neckline: e.g. sweetheart, V-neck, off-shoulder, illusion, bateau, scoop
- sleeves: e.g. sleeveless, cap, short, 3/4, long, off-shoulder
- fabrics: array of visible fabrics (lace, tulle, satin, chiffon, organza, crepe, beading, sequins, etc.)
- color: primary color (ivory, white, champagne, blush, etc.)
- description_en: 2-3 sentence marketing description in English, describing only what is visible
- description_ar: 2-3 sentence marketing description in Arabic, describing only what is visible
- suggested_materials: array of materials that would pair well (crystals, pearls, beads, lace trim, etc.)
- confidence: "high", "medium", or "low" based on photo clarity

Return ONLY valid JSON. No explanation, no markdown.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "no_key", message: "No vision API key configured. Add one in Tools and APIs." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: DescribeRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request", message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { dressId, imageUrls, existingNames } = body;
  if (!dressId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return new Response(JSON.stringify({ error: "bad_request", message: "dressId and at least one imageUrl required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const urls = imageUrls.slice(0, 4);

  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const mime = res.headers.get("content-type") || "image/jpeg";
      imageParts.push({ inlineData: { mimeType: mime, data: b64 } });
    } catch {
      // skip failed images
    }
  }

  if (imageParts.length === 0) {
    return new Response(JSON.stringify({ error: "no_images", message: "Could not fetch any images" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userText = existingNames && existingNames.length > 0
    ? `Existing dress names (avoid duplicates): ${existingNames.slice(0, 50).join(", ")}\n\nDescribe this dress.`
    : "Describe this dress.";

  const geminiBody = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT + "\n\n" + userText },
          ...imageParts,
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: "provider_error", message: errText.slice(0, 500) }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      let parsed: DressDraft;
      try {
        const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        if (attempt === 0) continue;
        return new Response(JSON.stringify({ error: "parse_error", message: "AI returned invalid JSON", raw: rawText }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ draft: parsed, model: GEMINI_MODEL, raw: data }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
      );
    } catch (e) {
      if (attempt === 0) continue;
      return new Response(JSON.stringify({ error: "network_error", message: String(e) }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "unknown", message: "Unexpected failure" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
});
