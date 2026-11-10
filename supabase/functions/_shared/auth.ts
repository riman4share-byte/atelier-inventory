// Shared auth guard for the Edge Functions.
//
// The project gateway's built-in JWT verification (verify_jwt) fails to
// resolve on this project (503 "name resolution failed"), so every function
// is deployed with --no-verify-jwt and authenticates here instead: the
// bearer token is validated by Supabase Auth and the caller's role is read
// from the profiles table. Only staff and admins get through, and the
// admin-only functions (erp-sync, save-integration) require the admin role.
//
// Deliberately dependency-free: plain fetch against the Supabase REST API,
// so the cold start needs no network module resolution.

export interface Caller {
  id: string;
  role: "staff" | "admin";
}

const API = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

/**
 * Validates the Authorization header and returns the caller's profile.
 * Returns null when the caller is anonymous, disabled, or unknown.
 */
export async function authenticate(req: Request): Promise<Caller | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token || !API || !SERVICE_KEY) return null;

  // 1. The token must be a real, active session for this project.
  const userRes = await fetch(`${API}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY },
  });
  if (!userRes.ok) return null;
  const user = (await userRes.json().catch(() => null)) as { id?: string } | null;
  if (!user?.id) return null;

  // 2. The account must be staff or admin.
  const profileRes = await fetch(
    `${API}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!profileRes.ok) return null;
  const rows = (await profileRes.json().catch(() => [])) as Array<{ role?: string }>;
  const role = rows[0]?.role;
  if (role !== "staff" && role !== "admin") return null;

  return { id: user.id, role };
}

/** Writes a JSON error response with the correct CORS headers. */
export function jsonError(
  status: number,
  body: Record<string, unknown>,
  origin: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

/** The allowed browser origin(s) for this app. */
export function allowedOrigin(req: Request): string {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = [
    "https://atelier-inventory.pages.dev",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  return allowed.includes(origin) ? origin : "";
}
