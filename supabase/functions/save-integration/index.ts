import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate, jsonError, allowedOrigin, corsHeaders } from "../_shared/auth.ts";

/**
 * Admin-only: stores an API key for an integration and returns only the last
 * 4 characters. The key itself is written to Supabase Vault; no query can
 * ever return it.
 */
Deno.serve(async (req) => {
  const origin = allowedOrigin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const caller = await authenticate(req);
  if (!caller) {
    return jsonError(401, { error: "unauthorized", message: "Sign in to use this feature." }, origin);
  }
  if (caller.role !== "admin") {
    return jsonError(403, { error: "forbidden", message: "Only an admin can change integrations." }, origin);
  }

  let body: { kind?: string; provider?: string; model?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, { error: "bad_request", message: "Invalid JSON" }, origin);
  }

  const key = String(body?.key ?? "");
  if (!key) {
    return jsonError(400, { error: "missing_key", message: "No key supplied" }, origin);
  }

  const hint = key.slice(-4);
  const secretName = `integration_${body.kind ?? "unknown"}_${body.provider ?? "unknown"}`
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: secretId, error } = await supabase.rpc("store_integration_secret", {
      p_secret_name: secretName,
      p_secret_value: key,
    });
    if (error) {
      // Vault write is not available in this environment: keep the key
      // server-side only, still never returning it.
      console.error("vault write failed:", error.message);
      return jsonError(503, { error: "vault_unavailable", message: "Key storage is not available yet." }, origin);
    }

    // Record the integration (no key value, only the secret's uuid).
    const kindValue = body.kind ?? "custom";
    await supabase.from("integrations").delete().eq("kind", kindValue).eq("provider", body.provider ?? "custom");
    const { error: integrationError } = await supabase.from("integrations").insert({
      kind: kindValue,
      provider: body.provider ?? "custom",
      label: body.provider ?? "Integration",
      model: body.model ?? null,
      vault_secret_id: secretId ?? null,
      enabled: true,
      last_test_status: "untested",
    });
    if (integrationError) console.error("integration insert failed:", integrationError.message);

    return new Response(JSON.stringify({ ok: true, hint }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (e) {
    return jsonError(500, { error: "storage_error", message: String(e) }, origin);
  }
});
