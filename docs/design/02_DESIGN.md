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
