# OpenCode Build Prompt – Atelier Inventory App

Paste this whole file into OpenCode as the project brief. Place `mockup/atelier-inventory-mockup.html` and `02_DESIGN.md` in the repo under `/docs/design/` first. Appendix A at the bottom contains the full design system.

---

## 0. How you must work (read first)

You are building a production-ready web app, phase by phase.

1. Work on **one phase at a time**, in order. Do not start the next phase until the owner replies "next phase".
2. At the end of each phase, print a **Phase report**: what was built, how to run and test it, the acceptance checklist with each item marked pass/fail, and any new entries in `GAPS.md`.
3. Maintain `GAPS.md` in the repo root as a living honest register: every limitation, assumption, shortcut, and unverified behavior, with status (open / resolved) and phase. Never delete entries; mark them resolved with the date. Carry it forward every phase.
4. Do not invent API behavior. When integrating a third-party API, read its current documentation first, and mark in `GAPS.md` anything you could not verify without a real key.
5. Deliver complete files, not snippets. No placeholder `TODO` code in shipped paths. If something cannot be finished, say so in the report and in `GAPS.md`.
6. Keep every secret out of the browser bundle and out of git.
7. Match the design in Appendix A and the mockup exactly. If you must deviate, say why in the phase report.

## 1. Product summary

A mobile-first web app (installable PWA) for a wedding dress atelier that has no inventory yet. Staff photograph or upload each dress. The app drafts a name and description with AI (Arabic and English), cleans the photo background in one tap, assigns a unique code and QR code, lets staff edit everything, and saves it to a cloud database. A materials and accessories library (crystals, beads, pearls, lace, fabric) tracks stock and links to dresses. An admin-only control panel stores API keys for the tools the app uses and lets the admin swap providers without code changes.

Users: atelier owner (admin) and staff. Main device: a phone on the shop floor. Secondary: desktop for review and printing.

## 2. Decisions already made

- **Cloud:** Supabase (Postgres, Auth, Storage, Edge Functions, Vault for secrets), with automatic backups enabled.
- **Languages:** Arabic and English, full RTL support, switchable per user.
- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, react-i18next, Zod, vite-plugin-pwa.
- **Hosting:** Vercel or Netlify for the frontend; Supabase for backend.
- **Design:** Appendix A and the mockup.
- **Local-only mode:** out of scope for v1 (record in `GAPS.md`).
- **ERPNext:** the owner uses ERPNext. Dresses and materials sync into it as Items (Phase 11), using the REST API and, as a fallback, an import file.

## 3. Data model (Postgres, via SQL migrations in `/supabase/migrations`)

Use UUID primary keys, `created_at`/`updated_at` timestamps, soft delete (`deleted_at`) on dresses and materials. Enable Row Level Security on every table.

- `profiles` (id → auth.users, full_name, role `admin | staff`, language `en | ar`)
- `app_settings` (single row: atelier_name, logo_path, code_prefix default `RF`, next_code_number, default_language, public_qr_page boolean default false, western_digits boolean default true)
- `dresses` (id, code unique e.g. `RF-0042`, name_en, name_ar, description_en, description_ar, silhouette, neckline, sleeves, fabrics text[], color, size_label, status enum `available | reserved | rented | sold`, listing_type enum `sale | rent | both`, sale_price, rent_price, notes, ai_raw jsonb, ai_model text, created_by)
- `dress_photos` (id, dress_id, angle enum `front | back | side | neckline | detail | other`, original_path, clean_path nullable, background_style jsonb nullable, sort_order, width, height)
- `materials` (id, name_en, name_ar, category enum `crystal | bead | pearl | fabric | lace | trim | button | zipper | other`, color, size, supplier, unit enum `piece | gram | kg | meter`, stock_qty numeric, low_stock_threshold numeric, unit_cost numeric nullable, photo_path, notes)
- `dress_materials` (dress_id, material_id, quantity numeric, note) primary key (dress_id, material_id)
- `stock_movements` (id, material_id, delta numeric, reason enum `purchase | used | adjustment | return`, dress_id nullable, created_by)
- `integrations` (id, kind enum `vision | background_removal | translation | storage | erp | custom`, provider text, label, endpoint nullable, model nullable, config jsonb, vault_secret_id uuid nullable, enabled boolean, last_test_at, last_test_status `ok | failed | untested`, last_test_message)
- `audit_log` (id, user_id, action, entity, entity_id, diff jsonb)
- `share_links` (id, token unique, dress_ids uuid[], show_prices boolean default false, expires_at, revoked boolean, created_by)
- `erp_sync_log` (id, entity enum `dress | material`, entity_id, action enum `create | update | skip | error`, http_status, message, created_at)
- Movements and customers: see Phase 8 for `customers`, `dress_movements`, `dress_reservations`, and `erp_jobs` (Phase 11).
- Add to `dresses` and `materials`: `erp_item_code text`, `erp_sync_status enum not_synced | pending | synced | error | stale default not_synced`, `erp_synced_at`, `erp_error text`.

RLS rules:

- Staff and admin can read and write dresses, photos, materials, dress_materials, stock_movements.
- Only admin can read or write `integrations`, `app_settings`, and manage `profiles`.
- API key values live only in Supabase Vault. The `integrations` table stores the Vault secret id, never the key. No query from the browser can ever return a key; the UI only shows the last 4 characters, which the Edge Function returns as `key_hint`.
- Storage buckets `dress-originals`, `dress-clean`, `material-photos`, `branding`: private, accessed with signed URLs generated on demand.

## 4. Architecture rules

- All third-party AI and image calls go through **Supabase Edge Functions** (Deno). The browser never sees provider keys.
- Provider adapters: one TypeScript interface per kind, one file per provider, selected by the active `integrations` row.
  - `VisionProvider.describeDress(images[], language[]) → DressDraft` (Zod-validated JSON: name_en, name_ar, silhouette, neckline, sleeves, fabrics[], color, description_en, description_ar, suggested_materials[], confidence notes). Ship three adapters from the start: **Anthropic (Claude)**, **Google Gemini**, and **OpenAI-compatible** (a custom base URL, which also covers a local model server such as Ollama or LM Studio later). The admin picks the provider, pastes the key, and types the model name in the control panel; each adapter reads the Gemini or Claude image format as documented by that provider (verify against the provider's current docs before coding, and note anything unverified in `GAPS.md`). Free-tier and paid keys are treated the same by the app, but show a hint in the control panel: "Free-tier keys may allow the provider to use your photos to improve its products. Use a paid key for real client designs." Make the model name a setting, never hard-coded.
  - `BackgroundRemovalProvider.removeBackground(image) → PNG with alpha`. Start with Photoroom and remove.bg adapters, plus a "custom endpoint" adapter (for a self-hosted rembg server).
  - Adding a new provider = adding one adapter file and one registry line, with no UI changes.
- Compositing the cleaned cutout onto a new background and applying brightness/contrast enhancement happens **in the browser with Canvas**, so the owner can re-style a photo without paying for another API call. The original is always kept.
- Validate all AI output with Zod; if invalid, retry once with a repair prompt, then show an error and let the user fill the form manually.
- Every Edge Function checks the caller's JWT and role.

## 5. Phases

### Phase 1 – Foundation

Scaffold the repo (Vite, TS, Tailwind, ESLint, Prettier, Vitest). Implement the design tokens from Appendix A as CSS variables mapped into Tailwind, light and dark. Set up i18n with `en` and `ar`, RTL switching, fonts, and the app shell with bottom navigation (Dresses, Capture, Materials, Settings). Supabase project setup instructions, migrations for every table above, RLS policies, storage buckets, seed script (one admin, sample materials, 4 sample dresses without photos). Auth with email and password, role-aware routing, protected routes. `.env.example`, `README.md`, `GAPS.md`.
**Acceptance:** app runs on phone-width and desktop; light/dark both correct; language toggle flips to RTL with no layout breakage; login works; staff cannot reach Settings; RLS verified with a test script that attempts forbidden reads and writes.

### Phase 2 – Dress gallery and manual CRUD

Gallery screen exactly like the mockup: hero banner with live counts, search (name, code, fabric, color), status filter chips, 2-column grid with pastel placeholder tiles, infinite scroll. Dress page with photo viewer (swipe between angles), editable fields in both languages, status segmented control, listing type and prices, soft delete with undo. Empty and error states using the copy rules.
**Acceptance:** create, edit, change status, delete and restore a dress by hand; search and filters combine correctly; all text exists in both languages.

### Phase 3 – Inventory views and exports

Goal: the owner can see the whole inventory in several ways and take it out of the app in useful formats.

- **View switcher** on the Dresses screen: Grid | Table. The table has one row per dress: photo thumbnail, code, name, status, listing type, size, color, fabrics, sale price, rent price, materials count, created date. Sortable and filterable columns, column chooser, saved views, server-side pagination, sticky header, horizontal scroll on phones, row checkboxes with a bulk action bar (change status, export selected, and later "Sync to ERPNext").
- **Dashboard** as the home screen: counts by status in pastel tiles, total listed sale value and rental value (clearly labelled), "needs attention" list (dresses without photos, description or price; materials below threshold once Phase 9 exists), recently added dresses.
- **Export sheet** (bottom sheet on mobile): format, language, scope ("current filters", "selected", "everything"), and options. Formats:
  1. **Excel (.xlsx) and CSV** for dresses (later also materials, customers and movements). UTF-8 with BOM so Arabic opens correctly in Excel. Includes the QR URL column. Columns configurable.
  2. **PDF catalog**: photos, names, codes, descriptions, optional QR. Choose Arabic, English, or both; 1, 2 or 4 dresses per page; optional cover with atelier name and logo. **A "Show prices" toggle, off by default, chosen at export time.** Internal costs are never included in the catalog.
  3. **PDF stock report**: summary counts plus table, for the owner or accountant.
  4. **Photos ZIP**: clean photo when it exists, original otherwise, named by dress code.
  5. **Share link** (`share_links` table: token, dress ids, expires_at, show_prices, revoked): a read-only page for one dress or a selection, no login, expiring and revocable, never shows internal cost or status.
- Arabic PDFs must render with correct letter shaping and right-to-left order. Pick a PDF approach that handles this (for example pdfmake with an embedded Arabic font, or print-optimized HTML to PDF) and prove it with a test document. Record the approach in `GAPS.md`.
- Exports of more than about 2,000 rows or any ZIP run in an Edge Function and return a signed download link; smaller exports run in the browser.
  **Acceptance:** switch between grid and table with filters preserved; export 20 dresses to Excel and open it with Arabic text intact; generate the catalog in Arabic, English and both, with and without prices; the ZIP contains correctly named photos; a share link opens without login, expires on time, and can be revoked.

### Phase 4 – Capture and upload

Capture screen like the mockup: live camera through `getUserMedia` (rear camera preferred), the angle checklist chips (front, back, side, neckline, detail, plus add custom), corner guides, shutter, and "Upload photos instead" (multi-select). Resize in the browser to a max of 2000 px on the long side, JPEG quality 0.85, strip EXIF location, upload to `dress-originals`. Retake, reorder, delete per photo. Graceful fallback when camera permission is denied. Works offline: queue uploads in IndexedDB and sync when online, with a visible queue status.
**Acceptance:** 6 photos captured on a real phone and saved to one draft dress; camera denial shows a clear message and the upload path still works; going offline mid-session and back online completes the uploads.

### Phase 5 – AI draft (name, description, attributes)

Edge Function `ai-describe` using the active vision integration. Review screen like the mockup: AI-filled fields are visually marked until edited; staff can regenerate, edit anything, and write their own. Name suggestions should be short and elegant, avoid duplicating existing names in the database, and the function must be told the existing names. Descriptions in Arabic and English written as marketing copy, but only describing what is visible. Store `ai_raw` and the model used. Show cost-safe behavior: limit to 4 images per request, downscaled.
**Acceptance:** with a real key, a dress photo set returns a valid draft within 15 s; invalid JSON is retried then falls back to manual form; no key present shows a clear "Add a vision key in Tools and APIs" message with a link.

### Phase 6 – One-tap background cleanup

"Clean background" button on the review screen and the dress page. Flow: call `bg-remove` Edge Function → receive cutout PNG → composite in the browser on the chosen background (studio white, soft gray, blush gradient, custom color) → apply mild auto-enhance (brightness, contrast, slight saturation, adjustable with one slider) → show Before/After segmented toggle → save to `dress-clean` and set `clean_path`. Batch option: "Clean all angles". Originals never overwritten; "Revert to original" always available.
**Acceptance:** works on at least 10 real dress photos; lace, tulle and veil edge cases are tested and the results documented honestly in `GAPS.md` with sample outcomes; re-styling the background needs no new API call.

### Phase 7 – Codes, QR and printable labels

Auto-generate the code on save using `app_settings` (prefix + zero-padded number, transaction-safe so two phones never collide). QR encodes the dress URL `/d/:code`. Behavior of that URL: logged-in staff see the full dress page; anyone else sees a minimal public card (photo, name, description, no prices or status) only if `public_qr_page` is on, otherwise a "Staff only" page. Print: single hang tag and batch sheet, with sizes configurable (default 50×30 mm tag and A4 grid), as PDF generated in the browser (code, name, QR, atelier name or logo). Test scanning from a printed label.
**Acceptance:** two simultaneous saves never produce the same code; the QR scans from a printed tag at 50×30 mm with a normal phone; public page respects the setting.

### Phase 8 – Customers and movement tracking (in / out)

Goal: every dress is a **unique piece (quantity is always 1)**. Staff can always see where it is, who has it, since when and when it is due back, with a permanent history, and the owner can export all of it.

**Data (new tables):**

- `customers` (id, full_name, phone, whatsapp, email, notes, erp_customer text nullable, erp_contact text nullable, erp_sync_status, deleted_at). Personal data: RLS on, access limited to staff and admin, every export logged in `audit_log`.
- `dress_movements` (id, dress_id, direction enum `out | in`, reason enum `rental | sale_delivery | fitting | alteration | cleaning | photoshoot | return | other`, customer_id nullable, from_location, to_location, occurred_at, due_at nullable, deposit_amount nullable, condition_notes, condition_photo_paths text[], performed_by, source enum `app | erpnext`, erp_stock_entry text nullable, erp_sync_status, corrects_movement_id nullable). **The ledger is append-only: no edits and no deletes.** A mistake is fixed by adding a correcting movement that points at the wrong one.
- `dress_reservations` (id, dress_id, customer_id, from_date, to_date, event_date nullable, status enum `active | fulfilled | cancelled`, notes). Used to prevent double booking.
- Add to `dresses`: `location` enum `in_atelier | with_customer | alteration | cleaning | photoshoot | other` and `current_customer_id`, both derived from the latest movement by a database trigger and never edited by hand.
- Locations are configurable in `app_settings` because they become warehouses in ERPNext in Phase 11.

**Flows:**

- **Check out** (bottom sheet, mockup screen 12): pick the customer (search, or add new with name and phone), reason, due date, optional deposit, condition notes and up to 4 condition photos. The app blocks a check-out when the dress is already out or has an overlapping active reservation, and says why.
- **Check in**: confirm the return, record the condition (notes and photos), flag damage or missing accessories, and set the next location (back in atelier, alteration, cleaning). Late returns are marked overdue automatically.
- **Reserve**: select dates and event date; shows on the dress page and on a simple reservation calendar view; a conflict check runs on save.
- Status suggestions: check-out for rental suggests `rented`, check-in suggests `available`, sale delivery suggests `sold`. Staff confirm; the app never changes status silently.
- **Dress page** shows "Where is it now" (location pill, customer, since, due), the full timeline of movements and reservations, and the buttons Check out, Check in, Reserve.
- **Customer page**: contact details, current and past items, all movements.
- **Dashboard additions**: Out now, Due back this week, Overdue, Reserved this month.

**Exports (Excel and PDF, in Arabic and English):**

- Movement history with filters (date range, dress, customer, reason, direction).
- Dress history card (one dress, full timeline, photos).
- Customer statement (items taken, dates, returns, deposits).
- Hand-over and return receipt PDF for printing or WhatsApp: dress photo, code, description, condition notes, deposit, due date, signature lines. The template is editable by the admin. It is a record, not a legal contract, and the owner should have any terms text reviewed by their own advisor.

**Acceptance:** check out and check in 10 dresses across 3 customers; a second check-out of a dress that is already out is refused; overlapping reservations are refused; a wrong movement is fixed by a correcting entry and the history still shows both; overdue items appear on the dashboard; the receipt and the movement history export correctly in Arabic and English; photos attach on a real phone.

### Phase 9 – Materials and accessories

Materials screen like the mockup: category chips, search, rows with glossy swatch or photo, stock bar, low-stock pill. Add and edit materials (both languages), adjust stock with a reason (writes `stock_movements`), and low-stock list. On the dress page and review screen, a "Materials used" picker lets staff tag materials with quantities; optional setting to auto-deduct stock when a dress is saved with materials (off by default, documented). Filter dresses by material ("all dresses with pearls"). The AI's `suggested_materials` appear as unconfirmed suggestions that staff accept or dismiss.
**Acceptance:** add 10 materials, tag them across 3 dresses, filter by material from the gallery, receive a low-stock indicator when stock drops below threshold, and see the full stock movement history.

### Phase 10 – Control panel (Tools and APIs, admin only)

Screen like the mockup. For each kind (vision, background removal, translation, storage, erp, custom): provider dropdown (vision: Claude, Gemini, OpenAI-compatible), label, model or endpoint, key input (write-only), enabled toggle, **Test connection** (runs a real minimal call through an Edge Function and stores the result), **Test all**, and **Add another tool**. Keys saved via an Edge Function into Vault; the UI shows only the last 4 characters. Only one integration per kind can be active at a time (except custom). Clear errors for bad keys, quota, and timeouts. Audit log entry on every change.
**Acceptance:** switching the active background-removal provider changes the next cleanup with no redeploy; a key cannot be read back from the browser, network tab, or any API response; staff users cannot open the screen or call the functions.

### Phase 11 – ERPNext integration

Goal: dresses and materials from the app appear as Items in the owner's ERPNext, without double entry.

**Two paths, build both:**

- **Path A – ERPNext import file (no API needed).** Export a CSV matching ERPNext's Item Data Import template. The admin downloads the Item import template from their own ERPNext (Data Import, Item, "Download Template") and uploads it; the app reads the column headers and maps its fields to them, so it adapts to the instance's version and custom fields. Be explicit in the UI that photos cannot travel in this file, because import files need a reachable URL and the app's photo links are private and expire.
- **Path B – Direct sync through the ERPNext REST API (recommended).** Implemented in an Edge Function `erp-sync`, using the credentials stored in the control panel.

**Control panel additions (kind `erp`):** base URL, API key, API secret (write-only, stored in Vault), company, default warehouse, item group for dresses, item group for materials, selling price list, default currency, unit-of-measure mapping (piece → Nos, gram → Gram, kg → Kg, meter → Meter), and the names of any custom fields. Buttons: Test connection (reads the Item doctype and the chosen warehouse and price list, reports exactly what is missing), Dry run, Sync all.

**Mapping (dress → Item):**

- `item_code` = dress code (for example RF-0042), the permanent link. Re-syncing updates the same Item and never creates a duplicate.
- `item_name` = English name; Arabic name, description in both languages, silhouette, neckline, sleeves, fabrics, color, size, the QR URL, and the app status go to the Item description and to custom fields (the app can list the custom fields to create; creating them automatically is optional and requires an admin role in ERPNext).
- `item_group`, `stock_uom` = Nos, `is_stock_item` = on, `standard_rate` or an Item Price row in the chosen price list for the sale price.
- Main photo uploaded through the file upload API and attached to the Item so it appears in ERPNext.
- Opening stock: optional "create opening stock of 1 in the chosen warehouse" using a stock entry, off by default, with a clear warning to avoid double counting if stock already exists.
- **Materials → Items** in the materials item group, with unit of measure and valuation rate from `unit_cost`. Stock quantities are pushed only as opening stock; day-to-day stock movements stay in the app unless the owner decides ERPNext owns stock.

**Source-of-truth rules (shown in the UI, configurable):** the app owns photos, names, descriptions and the physical status of a dress; ERPNext owns accounting, invoices, and stock valuation. Default conflict policy after the first push: the app overwrites descriptive fields, ERPNext keeps price and stock.

**Behavior:**

- Per-record sync status on `dresses` and `materials` (`not_synced | pending | synced | error | stale`) shown as a pill in the table view and on the dress page, with the last error message. Editing a synced dress marks it `stale`.
- Bulk sync from the table selection and from the control panel, with progress, retries with backoff, and a log in `erp_sync_log`. One failure never stops the batch and never changes app data.
- Dry run lists what would be created, updated or skipped, and changes nothing.
- Optional read-back (off by default): a scheduled function reads Sales Invoice lines for dress items and proposes marking the dress as `sold` in the app; staff confirm. Rentals are not a built-in ERPNext flow, so rental accounting stays in ERPNext as normal invoices and the app's movement ledger holds who has which dress.

**Movements and customers (both sides stay in step):**

- **Locations become warehouses.** Create one ERPNext warehouse per app location (for example Atelier Floor, With Customer, Alteration, Cleaning). A dress is always a stock quantity of 1 in exactly one warehouse.
- **Movement → Stock Entry.** Each app movement creates an ERPNext Stock Entry of type Material Transfer (1 Nos of the dress Item from the source to the destination warehouse). The app's movement id is stored on the Stock Entry (custom field or remarks) so a retry never creates a second entry. Entries are pushed in `occurred_at` order. If ERPNext rejects one (for example the item is not in the source warehouse), the app shows the exact reason and keeps the movement flagged `error`; it never silently edits history on either side.
- **Read-back for movements made in ERPNext.** A scheduled job reads new Stock Entries and Stock Ledger Entries for dress Items since a stored cursor. Entries not created by the app land in a review inbox, "Movements made in ERPNext"; staff accept them (recorded with `source = erpnext`) or flag them. This is what keeps both sides true when someone moves a dress directly in ERPNext.
- **Customers.** Picking a customer in the app searches ERPNext Customers live; creating a customer in the app can create the ERPNext Customer and Contact (name, phone, email) when the admin enables it. Link by the ERPNext customer name stored in `erp_customer`.
- **Sale.** When a dress is marked sold, the app stores the ERPNext Sales Invoice reference found by read-back. The app does not create invoices unless the owner asks for it later.
- **Dashboard feed.** Document in `docs/ERPNEXT.md` which ERPNext documents and fields carry the movement data (warehouse transfers, custom fields), so an existing ERPNext dashboard can read dress location, due dates and overdue items directly from ERPNext.

**Local ERPNext, bridge mode (important):** a cloud Edge Function cannot reach an ERPNext server on a private network (for example one running at home or on a NAS). So build the ERPNext client as a pure TypeScript package `packages/erp-client`, used in two places: (a) the Edge Function `erp-sync` for an ERPNext with a public URL, and (b) a standalone Node service `apps/erp-bridge` shipped as a Docker image, which runs on the same network as ERPNext, makes only **outbound** connections, pulls pending jobs from an `erp_jobs` table (id, type, payload, status, attempts, last_error, run_after), executes them against ERPNext, and writes the results back. The control panel chooses the mode per integration (`direct` or `bridge`) and shows when the bridge last checked in.

**Testing safety:** all development and testing uses a local or sandbox ERPNext with synthetic data only. Add `ERP_ENV = local | production` to the configuration; in `production` mode every sync, import and Stock Entry creation requires an explicit confirmation step, and the control panel shows a persistent "PRODUCTION" banner. Never point test runs at a live ERPNext.

**Acceptance:** against a sandbox ERPNext, sync 10 dresses and 5 materials; run the sync twice and see no duplicates; photo and price visible in ERPNext; a wrong key or a missing warehouse gives a clear message naming the problem; a failed item is retried without affecting others; check-out and check-in of 5 dresses create matching Stock Entries with no duplicates on retry; a movement made directly in ERPNext shows up in the review inbox; bridge mode works with the ERPNext on the local network and the app in the cloud; production mode asks for confirmation; the API secret cannot be retrieved from the browser; Path A produces a file that imports cleanly into the same sandbox.

### Phase 12 – Polish, PWA and deploy

Installable PWA (manifest, icons, splash), offline shell, update prompt. Performance: gallery thumbnails generated and cached (Supabase image transformations or a thumbnail step), lazy loading, Lighthouse mobile performance ≥ 85 and accessibility ≥ 95. Error boundary, toasts, loading skeletons. Full backup: admin button that exports every table plus all photos as one ZIP (day-to-day exports already exist from Phase 3). Playwright smoke tests for login, create dress, capture-upload fallback, QR page, and RTL. Deployment guide for Vercel/Netlify plus Supabase, including enabling backups, setting CORS, and rotating keys. Final `README.md`, `GAPS.md` review, and an owner handbook (`docs/HANDBOOK.md`, English and Arabic) with screenshots of each screen.
**Acceptance:** fresh clone to running production in under 30 minutes by following the guide; all smoke tests pass; handbook covers daily use.

### Phase 13 (optional, only if the owner asks) – 360 view

Turntable workflow: record a 10–15 s video while the dress rotates or capture 24–36 shots, extract frames in the browser, generate a drag-to-rotate viewer on the dress page. Document the physical setup needed (turntable, fixed light, plain wall).

## 6. Quality bar for every phase

- TypeScript strict mode, no `any` in shipped code, Zod at every boundary.
- Unit tests for data logic (code generation, stock math, provider adapters with mocked responses); component tests for forms; RLS tests.
- Every screen works at 360 px width, in light and dark, in English and Arabic RTL.
- Loading, empty, error and offline states for every data-driven screen.
- Accessibility: focus rings, labels, 44 px tap targets, contrast per Appendix A.
- No secrets in the repo. `.env.example` lists every variable with comments.
- Conventional commits, one commit series per phase, tagged `phase-N`.

## 7. Known gaps to record in GAPS.md from day one

Seed these entries in Phase 1 and update them as reality is tested:

1. AI fabric and material guesses from photos are approximate (tulle vs organza, crystal size). Manual tagging is the source of truth.
2. Photo quality drives AI and background results; a fixed spot with good light and a plain wall is recommended.
3. Background removal struggles with lace, tulle and veils; results must be reviewed.
4. AI and background APIs cost per image; no cost dashboard in v1.
5. A true interactive 360 viewer needs the turntable workflow (Phase 13 only).
6. Local-only / on-premises mode is not built in v1.
7. Arabic AI copy quality depends on the chosen model and needs human review before publishing.
8. Offline sync handles uploads only, not offline edits of existing records.
9. ERPNext field names, mandatory fields, custom fields and API behavior differ by version and by instance; nothing is verified until tested against the owner's real or sandbox ERPNext.
10. ERPNext has no built-in rental flow; rental status lives in the app.
11. The CSV import path cannot carry photos; only the direct API path can.
12. Arabic PDF rendering depends on the chosen PDF library and font; must be proven with a test document.
13. Source of truth for stock (app or ERPNext) must be decided by the owner before enabling stock sync.
14. Dress photos are sent to the chosen vision AI provider; the AI step must be optional (staff can fill the form manually) and the provider is chosen in the control panel.
15. Customer names and phone numbers are personal data; the owner is responsible for consent and local data-protection compliance (this is not legal advice), and the app provides access control, audit logging, export and delete.
16. A cloud Edge Function cannot reach an ERPNext on a private network; bridge mode is required there and adds a component the owner must run and keep updated.
17. Two-way movement sync depends on ERPNext Stock Entry and Stock Ledger behavior in the owner's version and warehouse setup; verify on the sandbox first.

## 8. First action

Start Phase 1 now. Before writing code, reply with: (a) the repo structure you will create, (b) the list of environment variables, (c) any question you must ask the owner. Then proceed.

Questions to collect from the owner before Phase 11 (do not block earlier phases): ERPNext version and hosting (Frappe Cloud or self-hosted), company name, default currency, warehouse for dresses, item group names, selling price list, whether stock quantities should be managed in ERPNext or in the app, and whether custom fields can be created.

---

# Appendix A – Design system

# Atelier Inventory – Design System

Source of truth for the look and feel. The visual reference is `mockup/atelier-inventory-mockup.html` (open it in a browser; it follows light/dark mode). If this file and the mockup disagree, ask the owner before choosing.

## 1. Personality

Bright, feminine, confident, and fast to use with one hand on a shop floor. A boutique rack, not a spreadsheet. Playful color is allowed, but every screen has one clear primary action.

## 2. Color tokens

| Token          | Light                           | Dark                            | Use                                        |
| -------------- | ------------------------------- | ------------------------------- | ------------------------------------------ |
| `--bg`         | #FDEFF4                         | #1A0F18                         | App background                             |
| `--surface`    | #FFFFFF                         | #27161F                         | Cards, sheets, phone frame                 |
| `--ink`        | #2B1424                         | #FFF0F6                         | Primary text                               |
| `--muted`      | #8A6B7C                         | #C9A3B6                         | Secondary text                             |
| `--line`       | #F3D9E4                         | #43283A                         | Borders, dividers                          |
| `--soft`       | #FFF1F6                         | #33202B                         | Chips, rows, inputs on surface             |
| `--accent`     | #D81B73                         | #FF5CA8                         | Primary brand (raspberry)                  |
| `--accent2`    | #7B3FE4                         | #A98BFF                         | Gradient partner (violet)                  |
| `--gold`       | #E0A526                         | #F2C14E                         | Low-stock, highlights                      |
| `--accent-ink` | #FFFFFF                         | #2B1424                         | Text on accent                             |
| `--c1..c4`     | #FFD9E6 #E6DCFF #FFE8C7 #D3F2E4 | #5A2A42 #3F3068 #5C4220 #1F4A38 | Pastel tiles (blush, lilac, apricot, mint) |

Danger (errors, failed sync): pill `#FDE0E0` / `#B3261E` (dark: `#4A2020` / `#FF9A94`).

Status colors (pill background / text):

- Available: `#D3F2E4` / `#14804F` (dark: `#1F4A38` / `#7FE0AE`)
- Reserved: `#FFE8C7` / `#A15C00` (dark: `#5C4220` / `#FFC978`)
- Rented: `#E6DCFF` / `#5A2FC4` (dark: `#3F3068` / `#C3B0FF`)
- Sold: `#EEE3E9` / `#6E5A66` (dark: `#3A2733` / `#D5BBC9`)

Primary gradient: `linear-gradient(135deg, var(--accent), var(--accent2))`, used on primary buttons, the gallery hero banner and the shutter button only.

Implement as CSS variables on `:root` with a `prefers-color-scheme: dark` override, mapped into the Tailwind theme. Never hard-code hex values in components.

## 3. Typography

- Headings and dress names: serif. Stack `'Fraunces', 'Iowan Old Style', Palatino, Georgia, serif` (load Fraunces through `@fontsource-variable/fraunces`).
- UI text: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
- Arabic (both headings and UI): `'Cairo', 'Noto Naskh Arabic', system-ui, sans-serif` (load Cairo through `@fontsource-variable/cairo`). Arabic text gets 1.5 line-height and no letter-spacing.
- Scale (px): 11 note, 12 caption, 13 body-small, 14 body, 16 input, 20 screen title, 24 hero title. Input font size is never below 16 on mobile to prevent iOS zoom.
- Sentence case everywhere. No all-caps labels.

## 4. Shape, spacing, elevation

- Radius: 99px pills and chips, 12px inputs, 16px buttons and list rows, 18–20px photo tiles and cards, 30px phone-width sheets.
- Spacing scale: 4, 6, 8, 10, 12, 16, 20, 24.
- Shadow: only on primary buttons (`0 8px 16px -10px var(--accent)`) and the outer frame. No shadow on every card.
- Minimum tap target 44×44 px.

## 5. Components

- **Primary button:** gradient, white text, 700 weight, 13px vertical padding, full width on mobile.
- **Secondary button:** `--soft` background, `--accent` text, no shadow.
- **Chip:** pill, `--soft` background; selected chip uses `--accent` with `--accent-ink` text.
- **Segmented control:** `--soft` track, selected segment `--accent` with white text (used for status).
- **Status pill:** 10.5px, 700 weight, colors from the status table.
- **Dress card:** 3:4 photo tile in a pastel tint (cycles `c1..c4` by id when there is no photo; real photos use a soft `--soft` backdrop), serif name, code, status pill.
- **Material row:** glossy circular swatch or photo, name, supplier line, stock bar (gradient; gold when below threshold), quantity pill.
- **Integration tile:** colored icon square, provider name, masked key line, toggle.
- **AI field:** a field filled by AI has `--accent` border and `--soft` background until the user edits it, then it turns into a normal field.
- **Camera view:** dark gradient, four glowing accent corner guides, a pill hint, big gradient shutter.
- **Bottom navigation:** four items (Dresses, Capture, Materials, Settings). Active item uses `--accent` and a filled icon tile. Settings is hidden for non-admin staff.

- **Table row (inventory table):** 56px high, 40px rounded thumbnail, code in muted, serif name, status pill, price at the end; sticky header; no zebra stripes. A selection bar slides up from the bottom (gradient background) with the count and actions.
- **Stat tile (dashboard):** pastel `c1..c4` tile, large serif number, small label; tapping filters the gallery by that status.
- **Export sheet:** bottom sheet with chips for format, language and scope, a toggle for "Show prices" (off by default), one primary button "Export".
- **Location pill:** In atelier (ok), With customer (info), Alteration (warn), Cleaning (off), Overdue (danger). Always shown next to the status pill on the dress page.
- **Movement timeline:** a vertical line in `--line`, a filled dot per entry (`--accent2` for out, `--ok` for in), each entry a `--soft` card with reason pill, customer, dates, condition note and thumbnails. Corrections are shown with a small "Correction" pill and never hide the entry they fix.
- **Check-out sheet:** bottom sheet, customer search field first, reason chips, due-date field, deposit, condition notes, photo slots, one primary button "Check out dress".
- **Sync pill (ERPNext):** Not synced (off), Pending (info), Synced (ok), Stale (warn), Error (danger).

## 6. Screens (see the mockup)

1. Capture
2. Review and edit (AI draft, clean background, materials tags)
3. Dress gallery (hero banner with counts, search, status filters, 2-column grid)
4. Materials and accessories (category chips, stock bars, low-stock)
5. Dress page and QR label (photo viewer, status switch, QR, print hang tag)
6. Control panel (admin only) with API tiles
7. Dashboard
8. Inventory table with selection bar
9. Export sheet
10. ERPNext sync panel
11. Dress page with where-is-it-now and movement timeline
12. Check-out sheet

## 7. Motion

Motion only responds to a user action: sheet open/close, chip select, status change, save confirmation. No entrance animations on load. Respect `prefers-reduced-motion`.

## 8. Arabic and RTL

- Set `dir="rtl"` and `lang="ar"` on `<html>` when Arabic is selected.
- Use logical CSS (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`). Never `left`/`right` for layout.
- Mirror directional icons (back arrows, chevrons). Do not mirror the QR code, photos, or numbers.
- Digits: Western digits (0–9) by default so codes like RF-0042 stay consistent. Make it a setting.
- Both languages are first-class: every dress has `name_en`, `name_ar`, `description_en`, `description_ar`.

## 9. Accessibility

- Contrast of text on every background at least 4.5:1 in both modes (check the pastel tiles and status pills).
- Visible focus ring: 2px `--accent` outline with 2px offset.
- Every icon-only button has an accessible name in both languages.
- Status is never conveyed by color alone (always a text label).

## 10. Copy rules

Plain verbs, active voice, sentence case. Buttons say what happens: "Save dress", "Clean background", "Print hang tag". Errors say what failed and what to do ("Background removal failed. Check the API key in Tools and APIs, then try again."). Empty states invite action ("No dresses yet. Tap Capture to add your first one.").

---

# Appendix B – Mockup

The file `mockup/atelier-inventory-mockup.html` shows the twelve core screens (Capture, Review and edit, Dress gallery, Materials, Dress page with QR, Control panel, Dashboard, Inventory table, Export sheet, ERPNext sync, Dress movement timeline, Check-out sheet). Treat it as the visual spec for layout, color, spacing and tone. Real photos replace the placeholder silhouettes.
