# Atelier Inventory

Inventory, photo capture and movement tracking for a wedding dress atelier.
Mobile-first, installable later as a PWA, Arabic and English with full RTL.

**Phase 1 (foundation) and Phase 2 (gallery) are built, and Phase 3 (inventory
table, dashboard, exports) is built.** Schema, roles, access policies, the dress
gallery, the table view, the dashboard and the export/share tools are in place.
Capture, materials and admin tools arrive in later phases — see
[Phase status](#phase-status).

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

### Run Supabase locally (no cloud project)

`supabase/config.toml` is committed, so the CLI can run the whole backend in
Docker:

```bash
npx supabase start          # applies supabase/migrations on first run
npx supabase status -o env  # API_URL, ANON_KEY, SERVICE_ROLE_KEY
```

This project uses **54341** (API), **54342** (Postgres), **54343** (Studio) and
**54344** (mail) because another stack on this machine owns the default ports.
Analytics is disabled locally: on Windows it needs a TCP-exposed Docker daemon.

Create `.env.local` from `.env.example`, paste those three values plus
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, then:

```bash
npm run seed
npm run dev
npm run rls:test
npx supabase stop        # when finished
```

`npx supabase db reset` re-applies every migration. Studio: http://127.0.0.1:54343.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) and open
   **Project settings → API**. Copy the project URL, the `anon` key, and the
   `service_role` key into `.env.local`.
2. Apply the migrations, in filename order:
   - **With the CLI:** `npx supabase link --project-ref <ref>` then
     `npx supabase db push`.
   - **Locally:** `npx supabase start` (see above) applies them automatically.
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

| Command             | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Vite dev server on `http://localhost:5173`                       |
| `npm run build`     | Typecheck, then production build into `dist/`                    |
| `npm run preview`   | Serve the production build                                       |
| `npm run typecheck` | `tsc --noEmit`                                                   |
| `npm run lint`      | ESLint (flat config, no explicit `any`)                          |     | `npm run test` | Vitest unit tests |
| `npm run types:gen` | Regenerate `src/lib/database.generated.ts` from the local schema |
| `npm run seed`      | Seed admin, settings, materials, dresses                         |
| `npm run rls:test`  | Live RLS acceptance checks against your project                  |

## Structure

```
docs/design/            design system + twelve-screen mockup (visual reference)
scripts/                seed and RLS test (Node, service role, never bundled)
src/
  components/layout/    app shell, bottom navigation, screen header, guards UI
  components/ui/        button, text field, segmented control, spinner
  features/auth/        session, profile, login, route guards
  features/dashboard/   home screen: counts, values, attention list (Phase 3)
  features/dresses/     gallery, table view, dress page, form, exports, share links (Phases 2–3)
  features/capture/     camera and upload (Phase 4)
  features/materials/   materials library (Phase 9)
  features/settings/    account and language (admin)
  i18n/                 en/ar strings, language detection, RTL
  lib/                  Supabase client, database types, env, query client
  pages/                setup, forbidden, not found, public share page
  styles/index.css      design tokens (light + dark)
supabase/migrations/    schema, RLS, storage policies, code-suggestion and share-read RPCs
```

## Design

The visual source of truth is `docs/design/02_DESIGN.md` plus the twelve-screen
mockup at `docs/design/atelier-inventory-mockup.html` (open it in a browser).
Tokens live only in `src/styles/index.css` and are exposed to Tailwind; no
component hard-codes a colour. Arabic switches the document to `dir="rtl"`,
`lang="ar"` and the Cairo typeface, and every screen uses logical spacing.

## Phase status

| Phase | Status |
| ---------------------------- | ------------------------------------------------- || 1 — Foundation | **Built** — schema, RLS, auth, roles, shell, i18n; migrations, seed and RLS verified on local Supabase |
| 2 — Gallery and CRUD | **Built** — hero counts, search, status filters, infinite-scroll grid, dress page with create/edit/status/soft-delete+undo; verified with 17 live checks on local Supabase |
| 3 — Inventory views, exports | **Built** — table view with sort/columns/saved views/bulk status, dashboard, Excel/CSV, magazine-style per-page PDF catalog with QR, share links; verified with 16 live checks + 12 browser checks |
| 4 — Capture and upload | Not started |
| 5 — AI draft | Not started |
| 6 — Background cleanup | Not started |
| 7 — Codes, QR, labels | Not started |
| 8 — Customers and movements | Not started (tables not created yet) |
| 9 — Materials | **Built** — materials library, stock tracking, low-stock alerts |
| 10 — Control panel | **Built (UI)** — admin tools panel; Vault storage lands on cloud deploy |
| 11 — ERPNext | Deferred — needs owner's ERPNext details |
| 12 — Polish, PWA, deploy | **Partial** — PWA manifest + icons + error boundary; offline shell and CI smoke tests pending |

## Security notes

- The browser bundle only ever sees `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. The service role key is used by two Node scripts and
  is never imported from `src/`.
- Provider API keys (Phase 10) will live in Supabase Vault and be reached only
  through Edge Functions. The `integrations` table stores a Vault secret id.
- Storage buckets are private; photos are read with short-lived signed URLs.
- `app_settings` and `integrations` are admin-only in the database. Staff cannot
  read them even with a crafted API call.
- `service_role` gets explicit table grants because newer Supabase CLIs no
  longer auto-expose new tables. It bypasses RLS, lives only in scripts and
  (from Phase 5) Edge Functions, and is never in the browser bundle.
- Share links are public by design: the only public door is the
  security-definer function `get_shared_dresses(token)`, which returns just the
  shared dresses and never lets callers list tokens or status. Anon sessions
  cannot read or write `share_links` rows directly (verified live).
- Exports (Excel, CSV, printed catalog, stock report) are **English-only** by an
  owner decision of 2026-11-09; the app UI stays bilingual. Also recorded in
  `GAPS.md` (G-12).
- The stock ledger has no update or delete policy: it is append-only.
- The `profiles` trigger blocks a non-admin from changing any role, including
  their own.

## Known limitations

See [`GAPS.md`](./GAPS.md) for the living register, including the items that
still need a real Supabase project, a phone and real photos to verify.
