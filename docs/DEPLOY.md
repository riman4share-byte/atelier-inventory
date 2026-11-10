# Deploying Atelier Inventory

## Prerequisites

- Node.js 20.12+, npm 10+
- A Supabase cloud project (free tier is enough)
- A Cloudflare account (free tier is enough)
- The Supabase CLI (`npx supabase` or installed locally)

## 1. Supabase (backend)

### Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a name (e.g. `atelier-inventory`), a region close to you, and a strong DB password. Save the password.
3. Wait for the project to be ready (1-2 minutes).

### Link and push migrations

```bash
cd "E:\inventory app"
npx supabase link --project-ref <your-project-ref>
npx supabase db push --yes
```

This applies all 8 migrations (schema, RLS, storage, RPCs, code allocation, customers/movements, ERPNext job queue).

### Seed the database

Update `.env.local` with your cloud values:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Project Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SEED_ADMIN_EMAIL=owner@atelier.local
SEED_ADMIN_PASSWORD=Atelier-dev-2026
SEED_ATELIER_NAME=Atelier
```

Then:

```bash
npm run seed
npm run rls:test   # expect 15/15
```

### Disable public signup

Go to **Authentication → Providers → Email** in the dashboard and turn off
"Allow new users to sign up" (G-22). Or push via config:

```bash
# Edit supabase/config.toml: set enable_signup = false under [auth] and [auth.email]
npx supabase config push --yes
```

### Deploy Edge Functions

```bash
npx supabase functions deploy ai-describe
npx supabase functions deploy bg-remove
npx supabase functions deploy save-integration
npx supabase functions deploy erp-sync
npx supabase secrets set GEMINI_API_KEY=<your-gemini-key>
```

Photoroom/remove.bg keys can be added later via the control panel.

## 2. Cloudflare Pages (frontend)

### Build

```bash
npm run build
```

This produces `dist/` with the production bundle.

### Deploy via Cloudflare dashboard

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Name the project (e.g. `atelier-inventory`).
3. Upload the `dist/` folder.
4. Set environment variables:
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Deploy. You'll get a URL like `atelier-inventory.pages.dev`.

### Or deploy via CLI

```bash
npx wrangler pages deploy dist --project-name=atelier-inventory
```

Set env vars in the Cloudflare dashboard under **Settings → Environment variables**.

## 3. Post-deploy

- Open the deployed URL, sign in with the seed admin credentials
- Go to **Settings → Tools and APIs** to add your Gemini/Photoroom keys
- Print a test hang tag and scan the QR code from a phone
- Update `GAPS.md`: mark G-18, G-22, G-46 as resolved
- Update `README.md` phase table if needed

## 4. ERPNext (optional)

ERPNext runs on your private server (`rimanserver:8080`). The cloud app
cannot reach it directly. Use bridge mode:

1. Complete the sandbox setup wizard at `http://sandboxriman:8080`
2. Build and run `apps/erp-bridge` on a machine on the same network as ERPNext
3. In the control panel, set the ERP integration mode to `bridge`

See `docs/REMBG_SETUP.md` for the self-hosted background removal setup.

## 5. Local development

To switch back to local development, restore `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54341
VITE_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service role key>
SEED_ADMIN_EMAIL=owner@atelier.local
SEED_ADMIN_PASSWORD=Atelier-dev-2026
SEED_ATELIER_NAME=Atelier
```

Then run `npx supabase start` and `npm run dev`.
