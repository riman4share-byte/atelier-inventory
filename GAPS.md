# GAPS — living register

Honest record of every limitation, assumption, shortcut and unverified
behaviour. Entries are never deleted: they are marked resolved with the date.
Carried forward every phase.

Legend: **Status** open / resolved · **Phase** the phase that introduced or last
touched the entry.

---

## Open

### G-01 · AI fabric and material guesses are approximate

**Status:** open · **Phase:** 1
Photos cannot reliably distinguish tulle from organza, or crystal sizes. Manual
tagging stays the source of truth; AI suggestions are presented as unconfirmed.

### G-02 · Photo quality drives AI and background results

**Status:** open · **Phase:** 1
A fixed spot with good light and a plain wall is recommended. No in-app
enforcement or guidance beyond the capture checklist (Phase 4).

### G-03 · Background removal struggles with lace, tulle and veils

**Status:** open · **Phase:** 1
Results must be reviewed before saving. Phase 6 requires testing on at least ten
real photos and documenting outcomes here.

### G-04 · AI and background APIs cost per image

**Status:** open · **Phase:** 1
No cost dashboard or per-user budget in v1. The vision step is limited to four
downscaled images per request.

### G-05 · A true interactive 360 viewer needs a turntable workflow

**Status:** open · **Phase:** 1
Only planned as optional Phase 13. Nothing is built.

### G-06 · Local-only / on-premises mode is not built

**Status:** open · **Phase:** 1
v1 requires Supabase (cloud or self-hosted Supabase, unverified).

### G-07 · Arabic AI copy quality depends on the model

**Status:** open · **Phase:** 1
Generated Arabic must be reviewed by a native speaker before publishing.

### G-08 · Offline sync handles uploads only

**Status:** open · **Phase:** 1
Offline edits of existing records are not supported. Phase 4 queues uploads in
IndexedDB; nothing exists yet.

### G-09 · ERPNext fields and behaviour differ by version and instance

**Status:** open · **Phase:** 1
Nothing is verified until tested against the owner's sandbox ERPNext.

### G-10 · ERPNext has no built-in rental flow

**Status:** open · **Phase:** 1
Rental status and the movement ledger live in the app.

### G-11 · The CSV import path cannot carry photos

**Status:** open · **Phase:** 1
ERPNext import files need a reachable URL; app photo links are private and
expire. Only the direct API path (Phase 11) can attach photos.

### G-12 · Arabic PDF rendering must be proven

**Status:** resolved 2026-11-09 · **Phase:** 1
Mooted by an owner decision on 2026-11-09: **all exports (Excel, CSV, printed
catalog, stock report, share pages) are English-only**, so no Arabic font or
letter-shaping proof is needed for them. The app UI itself stays bilingual and
already renders Arabic in the browser. If Arabic exports are ever requested,
this proof must be done first.

### G-13 · Source of truth for stock must be decided by the owner

**Status:** open · **Phase:** 1
App-owned versus ERPNext-owned stock is unresolved; stock sync stays off until
the owner decides.

### G-14 · Dress photos are sent to the chosen vision provider

**Status:** open · **Phase:** 1
The AI step must stay optional and the provider is chosen in the control panel
(Phase 10). No data-processing agreement is included.

### G-15 · Customer names and phone numbers are personal data

**Status:** open · **Phase:** 1
The owner is responsible for consent and local data-protection compliance (not
legal advice). The app will provide access control, audit logging, export and
delete from Phase 8.

### G-16 · A cloud Edge Function cannot reach a private-network ERPNext

**Status:** open · **Phase:** 1
Bridge mode (`apps/erp-bridge`) is required there and adds a component the owner
must run and keep updated.

### G-17 · Two-way movement sync depends on ERPNext Stock Entry behaviour

**Status:** open · **Phase:** 1
Verify Stock Entry and Stock Ledger behaviour on the sandbox before enabling.

### G-20 · Staff cannot read `app_settings` by design

**Status:** open · **Phase:** 1
The brief restricts `app_settings` to admin. Staff screens that need the atelier
name, code prefix or digit setting cannot query it directly. A safe public view
or RPC exposing only non-secret columns is required in Phase 2/7. Not built.

### G-21 · Language preference is stored per device before sign-in

**Status:** open · **Phase:** 1
Signed-in users persist the choice to `profiles.language`; signed-out choices
only live in localStorage. If a user has no profile row (trigger not applied),
the app shows the profile error screen instead of falling back to staff access.

### G-22 · Public email signup must be turned off in Supabase

**Status:** resolved 2026-11-10 · **Phase:** 1
Resolved via `supabase config push`: `auth.email.enable_signup = false` and
`auth.enable_signup = false` pushed to the cloud project
(ofnkpyzmzhxtpwwvrbci). Signup is disabled in production.

### G-23 · Dark mode follows the operating system only

**Status:** open · **Phase:** 1
There is no in-app light/dark override. The design system describes a
`prefers-color-scheme` override, which is implemented; a manual toggle is not
requested yet.

### G-24 · No visual review of the shell in a browser

**Status:** open · **Phase:** 1
Typecheck, lint, unit tests, build, local sign-in and the live RLS checks passed.
Light/dark, 360 px layout and RTL were implemented against the tokens and mockup
but not visually inspected. The API and database behaviour behind the screens is
verified; the rendering is not.

### G-25 · No password reset or invite flow inside the app

**Status:** open · **Phase:** 1
Admins create staff in the Supabase dashboard. A “Forgot password” flow is not
part of Phase 1 and will be needed before real staff use.

### G-26 · RLS checks are manual, not in CI

**Status:** open · **Phase:** 1
`npm run rls:test` needs live credentials, so it is not part of `npm run test`.
CI wiring is deferred.

### G-27 · PWA install, offline shell and update prompt are not built

**Status:** open · **Phase:** 1
`vite-plugin-pwa` is not installed yet; Phase 12 covers manifest, icons and
offline shell.

### G-28 · Capture and Materials screens are intentional empty shells

**Status:** open · **Phase:** 2 (updated 2026-11-09)
Capture and Materials render a titled empty state. They contain no dead
buttons and no fake data. They are not the Phase 4/9 screens. (The Dresses
screens stopped being shells in Phase 2.)

### G-29 · Branding bucket accepts SVG

**Status:** open · **Phase:** 1
An SVG logo can carry script. It is restricted to admins and rendered only as a
downloaded/printed asset, never inline. Revisit in Phase 12.

### G-30 · Phone camera, biometrics and real-device behaviour are untested

**Status:** open · **Phase:** 1
No phone was used. Camera permission, iOS safe areas and Android browser chrome
need testing in Phase 4.

### G-31 · Phase 8 and Phase 11 tables are not created yet

**Status:** open · **Phase:** 1
`customers`, `dress_movements`, `dress_reservations` and `erp_jobs`, plus the
`dresses.location` / `current_customer_id` columns, belong to Phases 8 and 11.
They are intentionally absent from the Phase 1 migrations and will arrive with
those phases.

### G-33 · A suggested dress code is not reserved

**Status:** open · **Phase:** 2
`suggest_dress_code()` reads `app_settings` (staff-readable via the function
only) and formats the next code, but never consumes a number. Two people
creating a dress at the same time can get the same suggestion; the unique
index turns the second save into a clear error message. Phase 7 replaces this
with the transaction-safe allocation on save.

### G-34 · Fabric search matches only common case variants

**Status:** open · **Phase:** 2
PostgREST array containment is case-sensitive, so the search expression adds
the as-typed, Capitalised and lowercased variants of the term. Matching
variants like "LaCe" or Arabic fabric names miss. The ilike fields (name, code,
colour) are fully case-insensitive. Refined with the materials work in
Phase 9.

### G-35 · The photo viewer shows a placeholder until Phase 4

**Status:** resolved 2026-11-09 · **Phase:** 2
Resolved in Phase 4: the dress page now renders real photos from the
`dress-originals` bucket through short-lived signed URLs, with upload,
angle tagging, reorder and delete. Pastel placeholders remain only for
dresses with no photos.

### G-36 · Dashboard aggregates are computed in the browser

**Status:** open · **Phase:** 3
The home screen fetches every non-deleted dress row and counts/sums in
JavaScript. Fine for hundreds of dresses; at thousands this should become a
database function or Edge Function aggregate. Not built yet.

### G-37 · Export loads rows into the browser, capped at 2000

**Status:** open · **Phase:** 3
Excel/CSV exports fetch up to `EXPORT_ROW_LIMIT` (2000) rows and build the file
client-side; beyond that the sheet shows a friendly error. Bigger exports need
an Edge Function that streams a file server-side. Not built yet.

### G-38 · ZIP photo export is deferred until photos exist

**Status:** open · **Phase:** 3
The export sheet covers data only (no photos archive) because no photos exist
until Phase 4. The ZIP download comes with the capture phase.

### G-39 · QR URLs point at a route that does not exist yet

**Status:** open · **Phase:** 3
Exports include a "QR URL" column (`<origin>/d/<code>`), but `/d/:code` is a
Phase 7 feature (short public code links + printed QR labels). Following the
link before Phase 7 gives a 404. Verified in the export file shape only.

### G-40 · Catalog/report header uses the i18n app name, not the atelier setting

**Status:** open · **Phase:** 3
Printed documents title themselves with `t('app.name')` because staff cannot
read `app_settings` (same root as G-20). The owner's chosen atelier name will
replace it once a staff-readable settings source exists.

### G-41 · Saved table views and column choices live per device

**Status:** open · **Phase:** 3
Table views, visible columns and export settings persist in localStorage
(`dresses-table-views`, `dresses-table-columns`), so a phone and a laptop keep
different views. Syncing them across devices is not built.

### G-43 · Offline upload queue and camera capture are not built yet

**Status:** open · **Phase:** 4
The upload path (file picker → resize → storage → row) works and is proven
in the browser, but the Phase 4 spec also asks for: live camera through
`getUserMedia` with the angle checklist, corner guides, shutter, and
"Upload photos instead" fallback; and an IndexedDB queue that holds uploads
when offline and syncs on reconnect with a visible status. Neither is built
yet; camera permission/phone behaviour is also untested (extends G-30).
G-08 still applies.

### G-44 · Videos and non-front angles are not handled yet

**Status:** open · **Phase:** 4
The importer only accepted JPGs from the owner's Instagram folder (videos
skipped — `dress_photos` has no video column). Angles other than the first
photo of each post were tagged `other`; the brief's angle enum
(front/back/side/neckline/detail) is selectable in the upload UI but not
auto-detected. The catalog uses the first (front) photo only.

### G-45 · Imported photos were uploaded as originals (not resized in the browser)

**Status:** open · **Phase:** 4
The browser upload path resizes (≤2000px, JPEG 0.85) and strips EXIF; the
bulk import wrote the original Instagram files to storage. Instagram exports
are already small and location-free, so this is acceptable for the test set,
but the honest behaviour differs between the two paths.

### G-46 · Edge Functions cannot be served locally on this machine

**Status:** resolved 2026-11-10 · **Phase:** 5
Resolved by deploying to the cloud project. `ai-describe` is verified live:
it fetched a photo, called Gemini 3 Flash, and returned a full bilingual
draft (name, description, silhouette, fabrics, etc.) with status 200. The
function runs in the cloud runtime with network access. `bg-remove` and
`save-integration` are deployed but not yet tested with real keys (no
Photoroom/remove.bg key yet; save-integration is a stub that returns a
key hint). Local serving is still broken (Docker volume issue), so Edge
Function development requires a cloud deploy to test.

### G-49 · ERPNext integration is deferred pending owner inputs

**Status:** open · **Phase:** 11
Phase 11 (ERPNext sync) needs the owner's ERPNext version and hosting, company
name, default currency, warehouse, item groups, price list, and UOM mapping
before any code. The `packages/erp-client` package, the `erp-sync` Edge
Function, the `apps/erp-bridge` Docker service, and the `erp_jobs` table are
not built. The control panel has a placeholder `erp` integration kind only.

Discovered on 2026-11-10: ERPNext runs in a Docker container
`erpnext-riman:v8` on host `rimanserver` (Tailscale 100.75.94.52), reachable
at `http://rimanserver:8080` (port 8080), logged in as riman4share@gmail.com.
Company: **Riman Fashion** (AED, UAE, abbr RF). Warehouses: Finished Goods /
Stores / Work In Progress / Goods In Transit (under "All Warehouses - RF").
Item groups: Wedding (Bridal), Party (Evening), Engagement Dresses, Accessories,
Final Products, Raw Material, etc. Price lists: Rent + Standard Selling
(selling), Standard Buying (buying). UOM "Day" for rentals. It is on a private
network, so the cloud app will need bridge mode (`apps/erp-bridge`).

**Inputs captured 2026-11-10 (with owner):** stock is managed in the **app**
(source of truth); ERPNext receives Stock Entries for accounting. Created in
ERPNext: warehouse **"Dresses - RF"** (under "All Warehouses - RF") and item
group **"Dresses"** (under "Final Products"). Selling price list: **Standard
Selling**; rentals: **Rent** price list. Default currency AED, company Riman
Fashion, abbr RF. UOM "Nos" for pieces, "Day" for rentals.

**Owner decision:** the item group for dresses is configurable in the app's
control panel (Phase 10), not hard-coded — the owner picks it per deployment.

**Sandbox:** created `sandboxriman` site on the same container with
ERPNext 15.31.2 installed. The site and ERPNext are installed; the first-login
setup wizard (company, warehouses, fiscal year) still needs to be completed in
the browser before it's usable. Access via `http://sandboxriman:8080` (add
`100.75.94.52 sandboxriman` to your hosts file). Admin password is
`Sandbox@2026`.

**Remaining before Phase 11 code:** complete the sandbox setup wizard in the
browser, then build erp-client package + erp-sync Edge Function + erp-bridge
Docker service + erp_jobs table. Phase 11 is the last major chunk.

### G-51 · Phase 11 is partial: only dress-item creation is wired

**Status:** open · **Phase:** 11
Shipped: `erp_jobs` + `erp_sync_log` tables, an `erp-sync` Edge
Function that creates Item records in ERPNext (using the captured config:
company Riman Fashion, item group Dresses, UOM Nos, Standard Selling price
list), and a "Sync to ERPNext" button on the dress page. Not built yet:
the `packages/erp-client` TS package, the `apps/erp-bridge` Docker service for
the private-network instance, sync for customers/materials, Stock Entries on
check-out/check-in, the control panel erp fields (base URL, API key/secret,
company, warehouse, item groups, price list, UOM mapping, mode direct/bridge),
dry-run, progress, retries, and the production-mode confirmation guard. The
function uses direct mode (public URL) and has not been tested against the
sandbox.

**Status:** open · **Phase:** 12
`vite-plugin-pwa` is configured (manifest, workbox runtime caching, auto-
update) and placeholder icons ship. Offline shell, install prompt, update
prompt, Lighthouse scores, and real-phone install behaviour are unverified.
Playwright smoke tests are scaffolded in `tests/smoke.spec.ts` but not wired
into CI.

**Status:** open · **Phase:** 10
The admin control panel UI is built and writes through a `save-integration`
Edge Function, but that function currently only returns a key hint instead of
storing the key in Supabase Vault (which requires the service role and a cloud
project). Keys are not yet persisted server-side; the real Vault write lands
with the cloud deploy. Local dev still uses `supabase/functions/.env`.

**Status:** open · **Phase:** 8
Core movement tracking shipped: check-out / check-in / reserve sheets, the
dress page "where is it now" + timeline, the append-only ledger trigger, and
dashboard counters (out now, overdue, due this week, reserved this month).
### G-47 · Phase 8 is partial: dress history card, customer statement, reservation calendar still open

**Status:** open · **Phase:** 8
Core movement tracking + exports shipped: check-out / check-in / reserve
sheets, the dress page "where is it now" + timeline, the append-only ledger
trigger, dashboard counters (out now, overdue, due this week, reserved this
month), a customer list/detail page, movement-history Excel export from the
dashboard, and a hand-over/return receipt PDF (printable, with signature
lines) from any movement. Still to build: dress history card PDF (one dress,
full timeline, photos), customer statement (items taken, dates, returns,
deposits), a reservation calendar view, audit_log writes on customer exports,
and customer create/edit UI beyond the inline add in the check-out sheet. The
ledger is append-only and correcting entries work via `corrects_movement_id`.

**Status:** open · **Phase:** 5
`supabase functions serve` fails with "failed to copy edge runtime main
service into container: destination must be a directory" (Docker volume
issue on this Windows setup, CLI 2.109.1). The functions deploy fine to a
cloud project; only local testing is blocked. Phase 5's `ai-describe`
function is code-complete but untested locally. The UI degrades gracefully
("AI description failed") until a cloud project is available. Verify on the
first cloud deploy.

**Status:** resolved 2026-11-09 · **Phase:** 3
Reviewed in a real (headless) Chromium: the sheet produced Excel, the stock
report and the catalog, the share page renders signed-out, and the owner
looked at the captured PDFs. Outcome the owner approved: the default catalog
became a magazine-style **one dress per page** layout — cover page, brand
strip, three photo slots matching the brief's angle list (front / back /
detail), spec sheet and a real QR code per page. Pixel-level design polish is
deliberately deferred to the later design pass.

---

## Resolved

### G-18 · No live Supabase project is connected in this workspace

**Status:** resolved 2026-11-10 · **Phase:** 1
Local stack verified (15/15 RLS). Cloud project "atelier-inventory"
(ref ofnkpyzmzhxtpwwvrbci, region ap-south-1) created and verified:
all 7 migrations applied, seed ran (admin + 5 materials + 4 dresses),
rls:test passed 15/15, 3 Edge Functions deployed, Gemini secret set,
ai-describe function verified live (status 200, full bilingual draft).

### G-19 · `src/lib/database.types.ts` is hand-written

**Status:** resolved 2026-11-09 · **Phase:** 1
`src/lib/database.generated.ts` is generated from the local schema with
`npm run types:gen`; `database.types.ts` re-exports it plus domain aliases.
Regenerate after every migration change.

### G-32 · `service_role` had no table grants under the new CLI default

**Status:** resolved 2026-11-09 · **Phase:** 1
Newer Supabase CLIs no longer auto-expose new tables, so the seed failed with
“permission denied for table profiles” until the RLS migration granted table
access to `service_role` explicitly (it bypasses RLS but still needs GRANTs).
The grants are now part of `20261109090100_rls.sql`.
