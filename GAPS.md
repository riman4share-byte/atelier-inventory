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

**Status:** open · **Phase:** 1
The PDF approach and embedded Arabic font are not chosen yet. Phase 3 must prove
letter shaping and RTL order with a test document.

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

### G-28 · Screens for Phases 2–9 are intentional empty shells

**Status:** open · **Phase:** 1
Dresses, Capture and Materials render a titled empty state. They contain no
dead buttons and no fake data. They are not the Phase 2/4/9 screens.

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
