import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate, jsonError, allowedOrigin, corsHeaders } from "../_shared/auth.ts";

const ERP_BASE = Deno.env.get("ERP_BASE_URL");
const ERP_KEY = Deno.env.get("ERP_API_KEY");
const ERP_SECRET = Deno.env.get("ERP_API_SECRET");

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
    return jsonError(403, { error: "forbidden", message: "Only an admin can run ERP sync." }, origin);
  }

  if (!ERP_BASE || !ERP_KEY || !ERP_SECRET) {
    return jsonError(
      400,
      { error: "no_erp_config", message: "ERPNext credentials not configured. Add them in Tools and APIs." },
      origin,
    );
  }

  const headers = {
    "Authorization": `token ${ERP_KEY}:${ERP_SECRET}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Process up to 10 pending jobs
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: jobs, error: jobsError } = await supabase
    .from("erp_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("created_at")
    .limit(10);

  if (jobsError) {
    return jsonError(500, { error: "db_error", message: jobsError.message }, origin);
  }

  const results = [];
  for (const job of jobs ?? []) {
    try {
      await supabase.from("erp_jobs").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", job.id);

      if (job.type === "create_dress_item") {
        const payload = job.payload as { code: string; name: string; description?: string; category?: string };
        // The atelier's own ERPNext item groups, one per app category.
        const groups: Record<string, string> = {
          wedding: Deno.env.get("ERP_GROUP_WEDDING") ?? "Wedding (Bridal)",
          party: Deno.env.get("ERP_GROUP_PARTY") ?? "Party (Evening)",
          engagement: Deno.env.get("ERP_GROUP_ENGAGEMENT") ?? "Milka (Engagement)",
          veil: Deno.env.get("ERP_GROUP_VEIL") ?? "Veil (Tarha)",
          jumpsuit: Deno.env.get("ERP_GROUP_JUMPSUIT") ?? "Dresses",
        };
        const group = groups[(payload.category ?? "").toLowerCase()] ??
          (Deno.env.get("ERP_GROUP_DEFAULT") ?? "Dresses");

        // ERPNext gives every item its own code from its naming series
        // ("RAW-2026-00081"); the code the app wants cannot be forced. The
        // app's code goes into the item NAME, which is how the atelier's own
        // catalogue is written ("WD-", "PD-" prefixes).
        const itemName = payload.code ? `${payload.code} ${payload.name}`.trim() : payload.name;

        const itemRes = await fetch(`${ERP_BASE}/api/resource/Item`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            item_name: itemName,
            description: payload.description ?? "",
            item_group: group,
            stock_uom: "Nos",
            is_stock_item: 1,
          }),
        });
        const itemData = await itemRes.json();
        if (!itemRes.ok) throw new Error(JSON.stringify(itemData));

        // Store the code ERPNext really gave, not the one we asked for.
        const itemCode = itemData?.data?.item_code ?? payload.code;
        await supabase
          .from("dresses")
          .update({ erp_item_code: itemCode, erp_sync_status: "synced", erp_synced_at: new Date().toISOString() })
          .eq("code", payload.code);
        await supabase.from("erp_sync_log").insert({
          entity: "dress",
          entity_id: job.payload && "dressId" in job.payload ? (job.payload as { dressId: string }).dressId : null,
          action: "create",
          http_status: itemRes.status,
          message: `Created ${itemCode} (${itemName}) in ${group}`,
        });
        await supabase.from("erp_jobs").update({ status: "done" }).eq("id", job.id);
        results.push({ id: job.id, status: "done", item_code: itemCode });
      } else {
        await supabase.from("erp_jobs").update({ status: "failed", last_error: "unknown job type" }).eq("id", job.id);
        results.push({ id: job.id, status: "failed", error: "unknown job type" });
      }
    } catch (e) {
      const message = String(e).slice(0, 500);
      // A network failure here means the cloud cannot reach the ERPNext
      // server - which is the normal case when ERPNext sits on a private
      // network (Tailscale) that Supabase is not part of. The job is handed
      // back to the queue immediately so the sync agent on the ERPNext
      // machine can pick it up on its next poll. Any other failure waits a
      // minute, so a broken ERPNext is not hammered every few seconds.
      const unreachable = /dns|resolve|connect|network|fetch failed|TLS/i.test(message);
      const retryInMs = unreachable ? 0 : 60000;
      await supabase
        .from("erp_jobs")
        .update({
          status: "pending",
          last_error: message,
          run_after: new Date(Date.now() + retryInMs).toISOString(),
        })
        .eq("id", job.id);
      await supabase.from("erp_sync_log").insert({
        entity: "dress",
        entity_id: null,
        action: "error",
        http_status: null,
        message,
      });
      results.push({
        id: job.id,
        status: unreachable ? "queued_for_agent" : "failed",
        error: message.slice(0, 200),
      });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
});
