import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface BgRemoveRequest {
  imageUrl: string;
  provider?: "photoroom" | "removebg";
}

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

  let body: BgRemoveRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request", message: "Invalid JSON" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { imageUrl, provider } = body;
  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "bad_request", message: "imageUrl required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch the source image
  let imageBlob: Blob;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`fetch image failed: ${imgRes.status}`);
    imageBlob = await imgRes.blob();
  } catch (e) {
    return new Response(JSON.stringify({ error: "image_fetch_failed", message: String(e) }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const photoroomKey = Deno.env.get("PHOTOROOM_API_KEY");
  const removebgKey = Deno.env.get("REMOVEBG_API_KEY");

  // Try Photoroom first
  if ((provider === "photoroom" || !provider) && photoroomKey) {
    try {
      const form = new FormData();
      form.append("image_file", imageBlob, "image.jpg");
      const res = await fetch("https://sdk.photoroom.com/v1/segment", {
        method: "POST",
        headers: { "x-api-key": photoroomKey },
        body: form,
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return new Response(JSON.stringify({ cutout: btoa(binary), mimeType: "image/png", provider: "photoroom" }), {
          status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    } catch {
      // fall through to remove.bg
    }
  }

  // Fallback: remove.bg
  if (removebgKey) {
    try {
      const form = new FormData();
      form.append("image_file", imageBlob, "image.jpg");
      form.append("size", "auto");
      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": removebgKey },
        body: form,
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return new Response(JSON.stringify({ cutout: btoa(binary), mimeType: "image/png", provider: "removebg" }), {
          status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      const errText = await res.text();
      return new Response(JSON.stringify({ error: "provider_error", message: errText.slice(0, 300) }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "network_error", message: String(e) }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "no_key", message: "No background-removal key configured. Add one in Tools and APIs." }), {
    status: 400, headers: { "Content-Type": "application/json" },
  });
});
