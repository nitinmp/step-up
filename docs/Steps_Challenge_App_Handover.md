# Steps Challenge — App Handover & Design Spec

**For:** Cursor coding agent
**Goal:** Build a mobile-first web app to run a 29-day group steps challenge: participants log daily steps (with a photo), the app scores them automatically, and everyone sees their target-vs-achievement and a live leaderboard. Admins moderate entries.

This document is the source of truth for **business rules, data model, and UI**. Where something is a judgment call, it is marked **[CONFIRM]** — implement the stated default but leave it easy to change.

---

## 1. Tech stack & deployment

- **Framework:** Next.js (App Router, TypeScript, React Server Components where sensible).
- **DB:** Postgres on Vercel (Vercel Postgres / Neon). Use a typed query layer — **Drizzle ORM** preferred (lightweight, good on Vercel); Prisma acceptable.
- **Auth:** Credentials-based (mobile number + password). Use **Auth.js (NextAuth) Credentials provider** with JWT session, or a custom cookie-session — either is fine. Passwords hashed with **bcrypt**.
- **Image storage:** **Vercel Blob** for activity photos. Store the returned URL on the activity row.
- **Styling:** Tailwind CSS. Match the visual identity in §9.
- **Hosting:** Vercel. All secrets via Vercel env vars.
- **Timezone:** All challenge dates are **IST (Asia/Kolkata)**. Store dates as `DATE` (no time) for activity day; compare "today" in IST. **[CONFIRM]**

---

## 2. The challenge (domain facts)

- **Duration:** 29 days, **29 Jun 2026 → 27 Jul 2026**, grouped into 4 weeks (Week 4 has 8 days). *(Earlier this was described as "28 days"; the target schedule defines 29. Treat the schedule in §3 as authoritative.)* **[CONFIRM]**
- **Participants:** ~19 (dynamic — created via registration). Roles: `user`, `admin`.
- Daily target rises through the month; the points earned per day also rise each week. Bonuses reward being top stepper and being consistent.

---

## 3. Challenge configuration (seed data)

Store this in the DB (do **not** hardcode in app logic — the scoring engine reads it, and admins may edit targets). Seed a `challenge_day` row per date.

| Date | Week | Day rate (pts) | Target steps |
|---|---|---|---|
| 2026-06-29 | 1 | 5 | 5000 |
| 2026-06-30 | 1 | 5 | 5000 |
| 2026-07-01 | 1 | 5 | 6000 |
| 2026-07-02 | 1 | 5 | 6000 |
| 2026-07-03 | 1 | 5 | 6000 |
| 2026-07-04 | 1 | 5 | 7000 |
| 2026-07-05 | 1 | 5 | 7000 |
| 2026-07-06 | 2 | 10 | 7000 |
| 2026-07-07 | 2 | 10 | 7000 |
| 2026-07-08 | 2 | 10 | 8000 |
| 2026-07-09 | 2 | 10 | 8000 |
| 2026-07-10 | 2 | 10 | 8000 |
| 2026-07-11 | 2 | 10 | 9000 |
| 2026-07-12 | 2 | 10 | 9000 |
| 2026-07-13 | 3 | 15 | 9000 |
| 2026-07-14 | 3 | 15 | 9000 |
| 2026-07-15 | 3 | 15 | 10000 |
| 2026-07-16 | 3 | 15 | 10000 |
| 2026-07-17 | 3 | 15 | 10000 |
| 2026-07-18 | 3 | 15 | 11000 |
| 2026-07-19 | 3 | 15 | 11000 |
| 2026-07-20 | 4 | 20 | 11000 |
| 2026-07-21 | 4 | 20 | 11000 |
| 2026-07-22 | 4 | 20 | 11000 |
| 2026-07-23 | 4 | 20 | 12000 |
| 2026-07-24 | 4 | 20 | 12000 |
| 2026-07-25 | 4 | 20 | 12000 |
| 2026-07-26 | 4 | 20 | 13000 |
| 2026-07-27 | 4 | 20 | 13000 |

Global config constants (store in a `challenge_config` single-row or key/value table so they're editable):
- `star_of_day_points = 50`
- `star_of_week_points = 100`
- `beast_multiplier = 2` (badge only, no points)
- Consistency tiers (days met within a week → bonus): `5 → 10`, `6 → 20`, `7 → 35` (8 days in week 4 still caps at 35).

---

## 4. Scoring engine (the heart of the app)

Scoring has two layers. Keep them separate.

### 4a. Per-activity base points (deterministic)
Computed from a single activity's `steps` against that day's `target` and `day_rate (R)`:

```
if steps >= target:
    base_points = R * (1 + floor((steps - target) / 1000))
else:
    base_points = 0
```

Example (Week 3, R=15, target 10000): 13,200 steps → `15 * (1 + floor(3200/1000)) = 15 * (1+3) = 60`.

Store `base_points` on the activity row at create/edit time. Only **approved** activities count.

### 4b. Derived bonuses (depend on the whole field — recompute, never store as truth)
These change as others log, so compute them in a single **standings function** that runs on demand (data is tiny: ~19 users × 29 days). Consider only `status = 'approved'` activities.

- **Star of the Day (+50):** For each date, find max steps among all users. Every user matching that max (and steps > 0) gets +50. Ties → all tied users get it.
- **Star of the Week (+100):** For each week, sum each user's steps across that week; the user(s) with the highest weekly total (> 0) get +100. Ties → all get it.
- **Consistency bonus (per week):** For each user and week, count `days_met` (days with an approved activity where steps ≥ that day's target). Apply tiers `5→10, 6→20, 7→35`. Sum across the 4 weeks.
- **Beast Mode badge (no points):** Any activity where `steps ≥ beast_multiplier * target`. Track as a count/flag for display only.

### 4c. Totals
```
user_total = Σ(approved base_points)
           + Σ(star_of_day 50s)
           + Σ(weekly consistency bonus)
           + Σ(star_of_week 100s)
```
Leaderboard ranks by `user_total` desc. Tie-break by total steps desc, then earliest registration. Expose a breakdown (base / star-day / week-star / consistency) for transparency on the user's dashboard.

> **Implementation note:** Provide one server function `computeStandings()` returning, per user: total, breakdown, days_met, star_day_count, week_star_count, beast_count, rank. Reuse it for the leaderboard and each user's dashboard. Cache per request; no materialized view needed at this scale.

---

## 5. Data model (Postgres)

```sql
-- users
id            uuid pk default gen_random_uuid()
name          text not null
mobile        varchar(15) not null unique      -- store normalized (digits only, +country optional)
password_hash text not null
role          text not null default 'user'     -- 'user' | 'admin'
created_at    timestamptz not null default now()

-- challenge_day  (seed from §3)
date          date pk
week_no        int not null                     -- 1..4
day_rate       int not null                     -- 5/10/15/20
target_steps   int not null

-- challenge_config (single row, or key/value)
star_of_day_points   int not null default 50
star_of_week_points  int not null default 100
beast_multiplier     int not null default 2
consistency_5        int not null default 10
consistency_6        int not null default 20
consistency_7        int not null default 35
start_date           date not null
end_date             date not null

-- activity
id            uuid pk default gen_random_uuid()
user_id       uuid not null references users(id)
activity_date date not null references challenge_day(date)
steps         int not null check (steps >= 0)
photo_url     text not null                     -- mandatory
status        text not null default 'approved'  -- 'approved' | 'disapproved'  ([CONFIRM] see §7)
base_points   int not null default 0            -- recomputed on create/edit
admin_note    text                              -- reason on disapprove/edit
edited_by     uuid references users(id)         -- admin who last edited
created_at    timestamptz not null default now()
updated_at    timestamptz not null default now()
unique (user_id, activity_date)                 -- one entry per user per day
```

Index `activity(activity_date)` and `activity(user_id)`.

---

## 6. Auth & roles

- **Register:** name, mobile, password (+ confirm). Validate mobile (10-digit Indian by default, configurable), password min length 8. Reject duplicate mobile. Hash with bcrypt. **[CONFIRM]** whether registration is open to anyone or restricted (e.g., invite/allow-list) — default: open self-registration.
- **Login:** mobile + password.
- **Session:** JWT/cookie carrying `userId` and `role`. Protect all app routes; redirect unauthenticated users to login.
- **Admin:** `role = 'admin'`. First admin seeded via env/seed script. Admins see an extra Admin tab and admin-only routes. Server must enforce role on every admin action (never trust the client).

---

## 7. Approval workflow **[CONFIRM]**

Default (matches "points are calculated and added on upload, admin can later disapprove/edit"):
- New activity is created as **`approved`** and immediately counts toward points/leaderboard.
- Admin can **disapprove** (excludes it from all scoring; user still sees it flagged with the admin note) or **edit** (change steps/date → `base_points` recomputed, standings refresh).
- Users can **never** edit or delete an activity. They can only view. If they made a mistake, they ask an admin.

Alternative to support behind a config flag: `pending → approved` moderation (activity doesn't count until an admin approves). Build the status field so either flow is possible; ship the default.

---

## 8. App structure & UI requirements

Mobile-first. Bottom tab bar (app-like). Tabs: **Activities · Log · Leaderboard** and **Admin** (admins only). Top bar shows app name + the user's current rank/points chip.

### 8.0 Auth screens
- **Register** and **Login**: clean, centered card, brand header. Single-column, large tap targets. Inline validation, clear errors ("This mobile number is already registered"). Link to switch between login/register.

### 8.1 Tab 1 — Activities (My Activities + Dashboard)
Primary "home" view for a logged-in user.

- **Header summary card:** user's total points (big), current rank (e.g., "#4 of 19"), and a small breakdown row (base · stars · consistency). Badge counts: ⭐ ×N, 🔥 ×N.
- **Target vs achievement:** a per-day list (most recent first) covering the challenge days. Each row shows:
  - Date + week pill (W1–W4)
  - Target steps vs **achieved** steps (with a small progress bar; green when met, amber when under, gold ring if they were Star of the Day)
  - Points earned that day (base) and any badges (⭐ if star-of-day, 🔥 if beast)
  - Status chip if `disapproved` (red) with the admin note
- Days with no activity yet show "Not logged" and a quick link to the Log tab (only for today / past days within the window).
- Keep it scannable: the number that matters (steps vs target, points) should be readable at a glance.

### 8.2 Tab 2 — Log Activity
- Form fields:
  - **Date** picker — defaults to today; selectable within the challenge window; **disallow** future dates and dates already logged (show "Already logged — ask an admin to edit"). **[CONFIRM]** whether past-date back-logging is allowed; default: allow any past date within the window.
  - **Steps** — numeric input, required, ≥ 0.
  - **Photo** — **mandatory** image upload (camera or gallery on mobile). Show a thumbnail preview; block submit until a photo is attached. Upload to Vercel Blob.
- On submit: create activity (status `approved`), compute `base_points`, then show a **confirmation** with the points earned that day and any badge unlocked ("Nice — Star of the Day so far!"). Then route to / refresh Activities.
- Friendly empty/error states; disable submit while uploading; handle large images (compress client-side if feasible).

### 8.3 Leaderboard
- Ranked list of all participants by total points. Each row: rank, name, points, days-met, ⭐ count, 🔥 count.
- **Top 3 highlighted** gold / silver / bronze (matches the spreadsheet/brochure styling).
- Highlight the current user's own row wherever they sit.
- Optional small toggle: "This week" vs "Overall" (overall is the default and required; weekly is nice-to-have). **[CONFIRM]**
- This is the screenshot people will share — make it look great.

### 8.4 Admin section (admins only)
- **Activity moderation table:** all activities, filterable by user, date, and status. Each row shows user, date, steps, target, computed points, status, and a **photo thumbnail** (click to enlarge — this is the proof).
  - Actions: **Approve / Disapprove** toggle (disapprove requires/permits a note), **Edit** (steps and/or date → recompute points, record `edited_by`).
  - Make it obvious when an edit changes someone's points.
- **Participants:** list users, promote/demote admin. **[CONFIRM]** ability to reset a user's password.
- **Config (nice-to-have):** edit daily targets / day rates / bonus values from the UI; otherwise editable via seed/DB.
- Every admin mutation re-runs `computeStandings()` so the leaderboard reflects changes immediately.

---

## 9. Visual design direction

Reuse the identity already established for this challenge (the tracker sheet and the participant brochure) so the app, sheet, and poster feel like one product.

**Palette**
- Deep teal (brand): `#0F6E56` (and darker `#0A5443` for gradients/headers)
- Gold / amber accent: `#F2B705` (targets, highlights, Star)
- Background: warm off-white `#FBF9F3`; surfaces white `#FFFFFF`
- Text: charcoal `#16302A`; muted `#55615C`
- Status: success green for "met", amber for "under", red `#D7402F` for disapproved/beast
- Medals: gold `#FFD966`, silver `#D9D9D9`, bronze `#E0B084`

**Type:** clean sans (e.g., Inter). Big, confident numbers for steps/points/rank. Generous spacing; sentence case; plain verbs ("Log steps", not "Submit").

**Iconography / badges:** ⭐ Star of the Day, 🏆 Star of the Week, 🔥 Beast Mode, ✅ Consistency. Use the same meaning everywhere.

**Signature element (carry over from the brochure):** the idea that targets **climb** each week — show week pills and let later weeks feel "bigger." A small ascending visual on the dashboard header is a nice touch, not required.

**Quality floor:** responsive to small phones, large tap targets, visible focus states, fast first paint, sensible loading/empty states. The leaderboard and activity list must look clean enough to screenshot into WhatsApp.

---

## 10. API routes (suggested)

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout

GET  /api/me                      -> profile + standings breakdown
GET  /api/activities              -> current user's activities + daily target/achievement
POST /api/activities              -> create (multipart: steps, date, photo) — auto base_points
GET  /api/leaderboard             -> computeStandings(), ranked

# admin (role-guarded)
GET  /api/admin/activities        -> all, with filters
PATCH /api/admin/activities/:id   -> edit steps/date (recompute) | approve/disapprove (+note)
GET  /api/admin/users
PATCH /api/admin/users/:id        -> role change / password reset [CONFIRM]
```

Image upload: client requests a Vercel Blob upload (or posts multipart to the route which forwards to Blob); persist returned URL. Enforce "photo required" on the **server**, not just the client.

---

## 11. Validation, security, edge cases

- One activity per (user, date) — enforce at DB (unique) and API.
- Reject future dates and dates outside `start_date…end_date`.
- Photo required — server-side check; validate mime/type and size.
- All admin actions role-checked server-side.
- Disapproved activities excluded from every scoring path.
- Recompute `base_points` whenever steps/date change.
- bcrypt for passwords; never return password_hash; rate-limit login/register.
- Normalize mobile numbers before storing/comparing.
- Empty states: no activities yet, leaderboard before anyone logs, day not yet logged.

---

## 12. Decisions to confirm before/while building

1. **29 vs 28 days** — schedule in §3 says 29 (ends 27 Jul). Confirm or trim the last day.
2. **"Star of the week"** — defined here as highest **total weekly steps**. Confirm (vs. single biggest day).
3. **Approval flow** — default is auto-approve + admin moderation (§7). Confirm vs. pending-approval.
4. **Registration** — open self-registration vs. allow-list/invite.
5. **Back-logging** — allow logging any past day in the window vs. today-only.
6. **Weekly leaderboard view** — overall is required; is a weekly view wanted?
7. **Admin password reset** for users — in scope?
8. **Timezone** — IST assumed for "today" and day boundaries.

---

## 13. Suggested build order

1. Project scaffold (Next.js + Tailwind + Drizzle + Vercel Postgres), schema + seed (§3, §5).
2. Auth (register/login/session/roles) + route protection.
3. `computeStandings()` engine (§4) with unit tests against the worked examples.
4. Log Activity (Vercel Blob upload, base-points calc) → Activities list with target-vs-achievement.
5. Leaderboard.
6. Admin moderation (approve/disapprove/edit + recompute).
7. Visual polish to the identity in §9; empty/loading states; mobile QA.

---

### Appendix — worked scoring examples (use as test cases)
- Week 1 (R=5), target 5000, steps 10000 → base `5*(1+floor(5000/1000)) = 5*6 = 30`.
- Week 3 (R=15), target 10000, steps 13200 → `15*(1+3) = 60`.
- Consistency: user meets 6 days in a week → +20; meets all 7 → +35.
- Perfect month, top stepper every day & week (illustrative upper bound): base + (29×50 star-of-day) + (4×100 week-star) + (4×35 consistency).
- Beast: Week 1 target 5000, steps ≥ 10000 → 🔥 badge (adds **0** points).
