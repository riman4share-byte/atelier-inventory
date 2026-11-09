# Atelier Inventory

Inventory, photo capture and movement tracking for a wedding dress atelier.
Mobile-first, installable later as a PWA, Arabic and English with full RTL.

**Phase 1 (foundation) is built.** The shell, sign-in, roles, schema and access
policies are in place. The gallery, capture, materials and admin tools arrive in
later phases — see [Phase status](#phase-status).

## Stack

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS mapped to the design tokens in `docs/design/02_DESIGN.md`
- React Router, TanStack Query, react-i18next, Zod
- Supabase: Postgres, Auth, Storage, RLS (Edge Functions from Phase 5)
- Vitest + Testing Library

## Requirements

- Node.js 20.12 or newer (the scripts use `process.loadEnvFile`)
- npm 10+
- A Supabase project (free tier is enough to start)

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run dev
```

Without Supabase values the app opens a **Connect Supabase** screen instead of
failing. That is expected on a fresh clone.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) and open
   **Project settings → API**. Copy the project URL, the `anon` key, and the
   `service_role` key into `.env.local`.
2. Apply the migrations, in filename order:
   - **With the CLI:** `npx supabase link --project-ref <ref>` then
     `npx supabase db push`.
   - **Without the CLI:** open the SQL editor and run the three files in
     `supabase/migrations/` in order
     (`..._init.sql`, `..._rls.sql`, `..._storage.sql`).

   The migrations create every table, enum, index, trigger, RLS policy and the
   four private storage buckets (`dress-originals`, `dress-clean`,
   `material-photos`, `branding`).

3. Run the seed:

   ```bash
   npm run seed
   ```

   This creates the admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`,
   the settings row, five sample materials and four sample dresses without
   photos. It is idempotent.

4. In **Authentication → Providers → Email**, keep email + password enabled and
   **turn off “Allow new users to sign up”**. The app has no sign-up screen; with
   public signup left on, anyone who finds your project URL could create a staff
   account. Add staff from **Authentication → Users → Add user** (or Invite).
5. Prove the access rules:

   ```bash
   npm run rls:test
   ```

   The script creates two temporary users (staff and admin) and a temporary
   dress, runs the access checks through the public API, prints pass/fail and
   deletes everything it created. It refuses to run without the service role key.

6. Sign in at `/login` with the seed admin. Settings appears in the bottom
   navigation for admins only.

## Scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Vite dev server on `http://localhost:5173`      |
| `npm run build`     | Typecheck, then production build into `dist/`   |
| `npm run preview`   | Serve the production build                      |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm run lint`      | ESLint (flat config, no explicit `any`)         |
| `npm run test`      | Vitest unit tests                               |
| `npm run seed`      | Seed admin, settings, materials, dresses        |
| `npm run rls:test`  | Live RLS acceptance checks against your project |

## Structure

```
docs/design/            design system + twelve-screen mockup (visual reference)
scripts/                seed and RLS test (Node, service role, never bundled)
src/
  components/layout/    app shell, bottom navigation, screen header, guards UI
  components/ui/        button, text field, segmented control, spinner
  features/auth/        session, profile, login, route guards
  features/dresses/     gallery (Phase 2)
  features/capture/     camera and upload (Phase 4)
  features/materials/   materials library (Phase 9)
  features/settings/    account and language (admin)
  i18n/                 en/ar strings, language detection, RTL
  lib/                  Supabase client, database types, env, query client
  pages/                setup, forbidden, not found
  styles/index.css      design tokens (light + dark)
supabase/migrations/    schema, RLS, storage policies
```

## Design

The visual source of truth is `docs/design/02_DESIGN.md` plus the twelve-screen
mockup at `docs/design/atelier-inventory-mockup.html` (open it in a browser).
Tokens live only in `src/styles/index.css` and are exposed to Tailwind; no
component hard-codes a colour. Arabic switches the document to `dir="rtl"`,
`lang="ar"` and the Cairo typeface, and every screen uses logical spacing.

## Phase status

| Phase                        | Status                                            |
| ---------------------------- | ------------------------------------------------- |
| 1 — Foundation               | **Built** — schema, RLS, auth, roles, shell, i18n |
| 2 — Gallery and CRUD         | Not started (screen is an empty shell)            |
| 3 — Inventory views, exports | Not started                                       |
| 4 — Capture and upload       | Not started                                       |
| 5 — AI draft                 | Not started                                       |
| 6 — Background cleanup       | Not started                                       |
| 7 — Codes, QR, labels        | Not started                                       |
| 8 — Customers and movements  | Not started (tables not created yet)              |
| 9 — Materials                | Not started                                       |
| 10 — Control panel           | Not started                                       |
| 11 — ERPNext                 | Not started                                       |
| 12 — Polish, PWA, deploy     | Not started                                       |

## Security notes

- The browser bundle only ever sees `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. The service role key is used by two Node scripts and
  is never imported from `src/`.
- Provider API keys (Phase 10) will live in Supabase Vault and be reached only
  through Edge Functions. The `integrations` table stores a Vault secret id.
- Storage buckets are private; photos are read with short-lived signed URLs.
- `app_settings` and `integrations` are admin-only in the database. Staff cannot
  read them even with a crafted API call.
- The stock ledger has no update or delete policy: it is append-only.
- The `profiles` trigger blocks a non-admin from changing any role, including
  their own.

## Known limitations

See [`GAPS.md`](./GAPS.md) for the living register, including the items that
still need a real Supabase project, a phone and real photos to verify.
