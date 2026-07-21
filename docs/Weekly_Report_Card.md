# Change Request — Weekly Progress Card Redesign (Satori)

**Context:** The weekly progress report is generated as a PNG via **Vercel Satori** (HTML/JSX → SVG → PNG). The current card is off-brand (blue panels/bars), has a rendering bug (overlapping peak tooltip), lots of empty space, and shows only steps/km/chart. This change redesigns it into a **branded, celebratory recap** that also surfaces points, badges, rank, and streak. A mockup is attached — match its layout and identity. Keep the same Satori generation pipeline; only the template and the data passed to it change.

---

## 1. Satori constraints (must follow — these caused the current bugs)

Satori supports only a **subset of CSS**, so:
- **Flexbox only.** Every section is `display:flex` (row/column). No CSS grid, no floats, no `position:absolute` overlays for content (the overlapping "11,219 Steps" tooltip came from an absolute element — remove it).
- **The chart target band and bars:** build the plot as a fixed-height flex row of bar columns; render the 7k–9k band as a single flex layer behind the bars using a wrapper with layered children (Satori allows `position:absolute` only for simple, explicitly-sized layers — keep it to one background band, not floating tooltips). If layering is fragytle, draw the whole chart as an inline **SVG** instead (Satori renders SVG reliably) — this is the safest option for bars + band + labels.
- **Fonts:** pass the brand font buffers (regular + bold, and the condensed display face if used) into Satori's `fonts` option at every weight you render, or text falls back and spacing drifts.
- **No emoji** — Satori won't render them without an emoji source. Use small **inline SVGs** for the flame / check / badge icons (as in the app dashboard).
- **Fixed share size:** render a **square 1080×1080** (WhatsApp/Instagram-safe; no crop). Design content to **fill the full 1080×1080** — no large empty band top, bottom, or side. (A 1080×1350 portrait is an optional alternative, but 1080×1080 is the default.)

---

## 2. Brand & layout

- Palette: teal `#0F6E56` / `#0A5443`, gold `#F2B705` / `#FFD24A`, cream/gold background `#FCF6E8`→`#FBEFD2`, text `#3A2E12` / muted `#8A7B4F`. **Remove all blue.** Chart bars = teal; peak bar = gold.
- Division accent drives highlights: **Riser** gold `#C9931E`, **Strider** green `#3FAE86`, **Elite** teal `#0F6E56`. Render the group as a colored **crest chip**, not plain caps text.
- **Layout: single column, full-width sections** (do NOT use a two-column mid — it collapses/overflows and leaves an empty half; the attached mockup is single-column). Top→bottom: **Header** (STEP UP + "Weekly progress report" + week dates) → **Name + crest** (title-case the name) → **Headline banner** (teal, the week's story) → **Stats row** (4 tiles across, full width) → **Daily-steps chart** (full width) → **Points breakdown** (full width) → **Badges unlocked** (full width) → **Footer** (rank/movement + streak + division push note). Every section is a full-width flex column child.

---

## 3. Data to pass into the template (per user, per week)

Compute from the user's **approved** activities in the target week (and cumulative where noted):
- `week_label`, `week_range` (e.g., "Week 2 of 4", "Mon 6 Jul – Sun 12 Jul"), `name`, `division`.
- `total_steps`, `distance_km` (existing conversion), `target_days_met` / `days_in_week` (e.g., 7/7).
- `week_points` and its split: `base` (target_points), `push` (over-target bonus), `consistency`, `stars`.
- `daily`: array of 7 (or 8 for W4) `{ day_label, steps, target, met }` for the chart.
- `peak_steps` and which day.
- `target_low` / `target_high` for the week (band, e.g., 7000–9000).
- `badges_unlocked_this_week`: array of `{ name, type }` (Perfect Week, streak milestone, Beast ×N, Star, PB, etc.).
- `rank`, `rank_delta` (movement vs last week, +/-), `division`.
- `current_streak`.
- `headline`: pick the best story server-side — priority: Perfect Week → new Personal Best → streak milestone → big rank jump → "Solid week". Pass a short string + subline.
- `push_note`: division-specific text (Riser: "every step past 10,000 counted 2×"; Strider/Elite per their rule) + the push credit.

---

## 4. Section specs

**Header:** "STEP UP" (teal), "Weekly progress report" eyebrow, week range + "Week N of 4" right-aligned. Thin gold divider.

**Name + crest:** "Prepared for" · title-case name · division crest chip in the division accent.

**Headline banner (teal):** the `headline` big + subline (e.g., "Perfect week — 7 for 7." / "Every target hit, and a new PB of 11,219.").

**Stats row (4 tiles, full width):** Total steps · Distance · Target days met (7/7) · Points this week (**teal tile**, `+{week_points}` in white). Note: if a tile needs a different background (the teal points tile), use a selector specific enough to beat the shared tile style — a base `.tile{background:#fff}` will otherwise override it (this caused the points value to render white-on-white in the first build).

**Points breakdown (full width):** a segmented flex bar Base / Push / Consistency (/ Stars if >0) with a value legend and a `+{week_points} total` label. This is the game — it must be present.

**Badges unlocked (full width):** chips for each badge earned that week, inline SVG icon + name. This is the most shareable element — always show at least the top 1–3.

**Daily-steps chart (full width):** bars for each day (teal; peak gold-capped, labeled cleanly — no floating tooltip); a shaded **target band** at `target_low`–`target_high` so viewers see bars clearing it; day labels M T W T F S S under bars. Prefer rendering the whole chart as inline SVG.

**Footer:** rank chip `"{Division} #{rank}"` with movement (`▲ up {delta}` / `▼`), a streak chip (`"{n}-day streak alive"`), and the division `push_note` right-aligned.

---

## 5. Acceptance criteria

1. No blue anywhere; bars teal, peak gold, background cream/gold, division crest in the correct accent.
2. No overlapping/floating tooltip; the peak is labeled cleanly.
3. Card fills a **1080×1080** frame with no large empty band (top, bottom, or side).
3a. Layout is **single column, full-width sections** — no empty half from a collapsed two-column grid.
3b. The teal Points tile shows `+{week_points}` in **white and visible** (no white-on-white).
4. Shows, at minimum: headline, total steps, distance, target-days, **week points + Base/Push/Consistency breakdown**, **badges unlocked this week**, the daily chart **with target band**, and **rank + movement + streak**.
5. Chart bars align to a baseline and clear (or not) the shaded target band correctly; day labels present.
6. All icons are inline SVG (no emoji); brand fonts embedded; renders identically headless on Vercel.
7. Name is title-cased; redundant "100% / 7/7" duplication removed.

*(Reference: same teal-and-gold identity as the app dashboard and the participant brochure, so the recap, app, and posters feel like one product.)*
