import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }
  // Stub: real implementation stores the key in Supabase Vault via service role
  // and returns only the last 4 characters. Local serving is blocked (G-46);
  // verified on the first cloud deploy.
  try {
    const body = await req.json();
    const key = String(body?.key ?? "");
    if (!key) {
      return new Response(JSON.stringify({ error: "missing_key" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const hint = key.slice(-4);
    return new Response(JSON.stringify({ ok: true, hint }), {
      status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
});
