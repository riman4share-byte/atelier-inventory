import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate, jsonError, allowedOrigin, corsHeaders } from "../_shared/auth.ts";

interface BgRemoveRequest {
  imageUrl: string;
  provider?: "photoroom" | "removebg";
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

Deno.serve(async (req) => {
  const origin = allowedOrigin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const caller = await authenticate(req);
  if (!caller) {
    return jsonError(401, { error: "unauthorized", message: "Sign in to use this feature." }, origin);
  }

  let body: BgRemoveRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, { error: "bad_request", message: "Invalid JSON" }, origin);
  }

  const { imageUrl, provider } = body;
  if (!imageUrl) {
    return jsonError(400, { error: "bad_request", message: "imageUrl required" }, origin);
  }
  if (!isAllowedImageUrl(imageUrl)) {
    return jsonError(400, { error: "bad_image", message: "Images must be hosted by this project's storage." }, origin);
  }

  const photoroomKey = Deno.env.get("PHOTOROOM_API_KEY");
  const removebgKey = Deno.env.get("REMOVEBG_API_KEY");

  if ((provider === "photoroom" || !provider) && photoroomKey) {
    try {
      const res = await fetch(imageUrl);
      if (res.ok) {
        const imageBlob = await res.blob();
        const form = new FormData();
        form.append("image_file", imageBlob, "image.jpg");
        const providerRes = await fetch("https://sdk.photoroom.com/v1/segment", {
          method: "POST",
          headers: { "x-api-key": photoroomKey },
          body: form,
        });
        if (providerRes.ok) {
          const buf = await providerRes.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return new Response(
            JSON.stringify({ cutout: btoa(binary), mimeType: "image/png", provider: "photoroom" }),
            { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
          );
        }
      }
    } catch {
      // fall through to remove.bg
    }
  }

  if (removebgKey) {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
      const imageBlob = await res.blob();
      const form = new FormData();
      form.append("image_file", imageBlob, "image.jpg");
      form.append("size", "auto");
      const providerRes = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": removebgKey },
        body: form,
      });
      if (providerRes.ok) {
        const buf = await providerRes.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return new Response(
          JSON.stringify({ cutout: btoa(binary), mimeType: "image/png", provider: "removebg" }),
          { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
        );
      }
      const errText = await providerRes.text();
      return jsonError(502, { error: "provider_error", message: errText.slice(0, 300) }, origin);
    } catch (e) {
      return jsonError(502, { error: "network_error", message: String(e) }, origin);
    }
  }

  return jsonError(
    400,
    { error: "no_key", message: "No background-removal key configured. Add one in Tools and APIs." },
    origin,
  );
});
