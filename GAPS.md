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

**Status:** open · **Phase:** 1
The app has no sign-up screen, but if “Allow new users to sign up” stays enabled
in the Supabase dashboard, anyone with the public project URL can create an
account (which the trigger would make `staff`). The README makes this a setup
step; it cannot be enforced from the repository.

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

**Status:** resolved 2026-11-09 · **Phase:** 1
The three migrations apply to a real local Supabase stack (CLI 2.109.1,
Postgres 17) on ports 54341/54342. `npm run seed` created the admin, five
materials and four dresses; the seeded admin signed in with role `admin` and
read `app_settings` and `dresses`; `npm run rls:test` passed 15/15. Cloud
projects were not touched, but the local stack runs the same Supabase
components. Signup stays enabled locally; a cloud project must disable it
(G-22).

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
