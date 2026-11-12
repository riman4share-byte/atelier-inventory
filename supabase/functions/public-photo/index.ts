import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonError, allowedOrigin, corsHeaders } from "../_shared/auth.ts";

/**
 * A short-lived link to one photograph, for the public page.
 *
 * A customer who scans the QR on a hang tag has to see the dress, but the
 * photographs live in a private bucket. The browser cannot sign an object it
 * has no rights to, so the signature is made here, where the function's
 * rights are the owner's.
 *
 * The dress's public token is the key. It is the same unguessable token
 * that is already printed on the tag, and a guess still gets nothing: the
 * function only ever answers for a dress whose token the caller holds.
 *
 * The link lasts ten minutes. It is enough for the page to load and the
 * photograph to be looked at, and short enough that it cannot be passed on
 * and kept.
 */

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

  // The dress must exist, must not be deleted, and the public page must be
  // switched on.
  const settings = await fetch(
    `${supabaseUrl}/rest/v1/app_settings?select=public_qr_page&id=eq.1&limit=1`,
    { headers },
  );
  const settingsRows = (await settings.json()) as { public_qr_page?: boolean }[];
  if (!settingsRows[0]?.public_qr_page) {
    return jsonError(404, { error: "not_found" }, origin);
  }

  const dresses = await fetch(
    `${supabaseUrl}/rest/v1/dresses?select=id&public_token=eq.${encodeURIComponent(token)}&deleted_at=is.null&limit=1`,
    { headers },
  );
  const dressRows = (await dresses.json()) as { id: string }[];
  const dress = dressRows[0];
  if (!dress) {
    return jsonError(404, { error: "not_found" }, origin);
  }

  // The first photograph of the dress, in the order the staff arranged.
  const photos = await fetch(
    `${supabaseUrl}/rest/v1/dress_photos?select=original_path&dress_id=eq.${dress.id}&order=sort_order,created_at&limit=1`,
    { headers },
  );
  const photoRows = (await photos.json()) as { original_path: string }[];
  const photo = photoRows[0];
  if (!photo) {
    // No photograph is not an error: the page falls back to its placeholder.
    return new Response(JSON.stringify({ url: null }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  // Sign it with the owner's rights.
  const signed = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/dress-originals/${photo.original_path}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ expiresIn: 600 }),
    },
  );
  if (!signed.ok) {
    return jsonError(502, { error: "sign_failed" }, origin);
  }
  const signedBody = (await signed.json()) as { signedURL?: string };
  if (!signedBody.signedURL) {
    return jsonError(502, { error: "sign_failed" }, origin);
  }

  return new Response(JSON.stringify({ url: `${supabaseUrl}/storage/v1${signedBody.signedURL}` }), {
    status: 200,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
});
