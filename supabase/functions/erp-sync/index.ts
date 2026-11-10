import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ERP_BASE = Deno.env.get("ERP_BASE_URL");
const ERP_KEY = Deno.env.get("ERP_API_KEY");
const ERP_SECRET = Deno.env.get("ERP_API_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  if (!ERP_BASE || !ERP_KEY || !ERP_SECRET) {
    return new Response(JSON.stringify({ error: "no_erp_config", message: "ERPNext credentials not configured. Add them in Tools and APIs." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const headers = {
    "Authorization": `token ${ERP_KEY}:${ERP_SECRET}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Process up to 10 pending jobs
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: jobs, error: jobsError } = await supabase
    .from("erp_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("created_at")
    .limit(10);

  if (jobsError) {
    return new Response(JSON.stringify({ error: "db_error", message: jobsError.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const job of jobs ?? []) {
    try {
      await supabase.from("erp_jobs").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", job.id);

      // Create an Item in ERPNext for a dress
      if (job.type === "create_dress_item") {
        const payload = job.payload as { code: string; name: string; description?: string };
        const itemRes = await fetch(`${ERP_BASE}/api/resource/Item`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            item_code: payload.code,
            item_name: payload.name,
            description: payload.description ?? "",
            item_group: "Dresses",
            stock_uom: "Nos",
            is_stock_item: 1,
          }),
        });
        const itemData = await itemRes.json();
        if (!itemRes.ok) throw new Error(JSON.stringify(itemData));

        await supabase.from("dresses").update({ erp_item_code: payload.code, erp_sync_status: "synced", erp_synced_at: new Date().toISOString() }).eq("code", payload.code);
        await supabase.from("erp_sync_log").insert({ job_id: job.id, entity: "dress", action: "create_item", status: "success", message: `Created ${payload.code}` });
        await supabase.from("erp_jobs").update({ status: "done" }).eq("id", job.id);
        results.push({ id: job.id, status: "done" });
      } else {
        await supabase.from("erp_jobs").update({ status: "failed", last_error: "unknown job type" }).eq("id", job.id);
        results.push({ id: job.id, status: "failed", error: "unknown job type" });
      }
    } catch (e) {
      await supabase.from("erp_jobs").update({ status: "pending", last_error: String(e).slice(0, 500), run_after: new Date(Date.now() + 60000).toISOString() }).eq("id", job.id);
      await supabase.from("erp_sync_log").insert({ job_id: job.id, entity: "dress", action: job.type, status: "failed", message: String(e).slice(0, 500) });
      results.push({ id: job.id, status: "failed", error: String(e).slice(0, 200) });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
