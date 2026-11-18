import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonError, allowedOrigin, corsHeaders } from "../_shared/auth.ts";

interface PhotoRequest {
  token: string;
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  let body: PhotoRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, { error: "bad_request" }, origin);
  }

  const token = body.token;
  if (!token || typeof token !== "string") {
    return jsonError(400, { error: "bad_request", message: "token required" }, origin);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) {
    return jsonError(500, { error: "no_key" }, origin);
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Resolve the share link to dress IDs.
  const shareRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_shared_dresses`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ p_token: token }),
    },
  );
  if (!shareRes.ok) {
    return jsonError(404, { error: "not_found" }, origin);
  }
  const dresses = (await shareRes.json()) as { id: string }[];
  if (!dresses || dresses.length === 0) {
    return new Response(JSON.stringify({ photos: {} }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const dressIds = dresses.map((d) => d.id);

  // Fetch the first photo path for each dress.
  const photoRes = await fetch(
    `${supabaseUrl}/rest/v1/dress_photos?select=dress_id,original_path,angle,sort_order&dress_id=in.(${dressIds.join(",")})&order=sort_order.asc`,
    { headers },
  );
  if (!photoRes.ok) {
    return new Response(JSON.stringify({ photos: {} }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  const photoRows = (await photoRes.json()) as { dress_id: string; original_path: string; angle: string }[];

  // Pick the front photo for each dress.
  const photoPathByDress = new Map<string, string>();
  for (const row of photoRows) {
    if (!photoPathByDress.has(row.dress_id)) {
      photoPathByDress.set(row.dress_id, row.original_path);
    }
  }

  // Sign all photo URLs in one batch.
  const paths = [...photoPathByDress.values()];
  if (paths.length === 0) {
    return new Response(JSON.stringify({ photos: {} }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  const signRes = await fetch(`${supabaseUrl}/storage/v1/object/sign/dress-originals`, {
    method: "POST",
    headers,
    body: JSON.stringify({ paths, expiresIn: 600 }),
  });
  if (!signRes.ok) {
    return new Response(JSON.stringify({ photos: {} }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
  const signed = (await signRes.json()) as { path: string; signedUrl: string }[];

  const photos: Record<string, string> = {};
  for (const entry of signed) {
    if (entry.signedUrl) {
      // Find which dress this path belongs to.
      for (const [dressId, path] of photoPathByDress) {
        if (path === entry.path) {
          photos[dressId] = entry.signedUrl;
          break;
        }
      }
    }
  }

  return new Response(JSON.stringify({ photos }), {
    status: 200,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
});
