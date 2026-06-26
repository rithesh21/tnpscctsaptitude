
# Aptitude & Reasoning Mock Test Platform — Build Plan (V1, Full PRD)

A web platform where registered users take 25-question MCQ mock tests (15 Aptitude + 10 Reasoning), with a ranked Saturday Main Test and admin tools to grow the question bank.

## 1. Stack & Foundations

- **Frontend:** TanStack Start (existing scaffold) + Tailwind + shadcn/ui.
- **Backend:** Lovable Cloud (Postgres + Auth + Storage) — enabled on first build step.
- **AI:** Lovable AI Gateway (`google/gemini-3-flash-preview`) used in a one-time seeding script to generate ~50 sample MCQs across the 16 sub-topics × 4 difficulties.
- **Auth:** Email + password only (no Google, no OTP for V1). Standard Lovable Cloud auth with a `profiles` table and a separate `user_roles` table (`user` / `admin`) — roles are *not* stored on profiles.

## 2. Topics (from PRD §3.1)

**Unit I — Aptitude (10 sub-topics, 15 Qs/test):** Simplification, Percentage, HCF, LCM, Ratio & Proportion, Simple Interest, Compound Interest, Area, Volume, Time & Work.

**Unit II — Reasoning (6 sub-topics, 10 Qs/test):** Logical Reasoning, Puzzles, Dice, Visual Reasoning, Alpha-Numeric Reasoning, Number Series.

Each topic carries 4 difficulties: Easy / Medium / Hard / Very Hard (10/20/30/40 default mix).

## 3. Database Schema

Tables (all under `public`, RLS enabled, with explicit grants):

- `profiles` — id (=auth.users.id), name, target_exam, avatar_url.
- `user_roles` — user_id, role (`'user' | 'admin'`); helper `has_role(uid, role)` security-definer fn.
- `topics` — id, unit (`I`/`II`), name, slug, sort_order.
- `questions` — id, topic_id, difficulty (`easy|medium|hard|very_hard`), stem (text), option_a..d, correct_option (`A|B|C|D`), explanation (nullable), is_active, created_by, timestamps.
- `test_pattern_settings` — singleton row: unit1_count=15, unit2_count=10, easy/med/hard/vhard mix, daily_cap=10, main_test_new_ratio=0.7, main_test_repeat_ratio=0.3, main_test_day (`Saturday`), main_test_open/close times.
- `tests` — id, user_id, test_type (`practice|main`), main_event_id (nullable), started_at, submitted_at, time_limit_seconds (nullable), score, status (`in_progress|submitted|expired`).
- `test_questions` — test_id, question_id, position, selected_option, is_correct, time_spent_seconds.
- `user_seen_questions` — user_id, question_id, first_seen_at (drives the "no repeat until exhausted" rule).
- `main_test_events` — id, scheduled_date, opens_at, closes_at, new_question_ratio, repeat_question_ratio, status (`scheduled|open|closed|scored`).
- `leaderboard_entries` — main_event_id, user_id, score, time_taken_seconds, rank, percentile.
- `question_reports` — id, user_id, question_id, reason, status, created_at (for "report this question" flow).

### Security model
- `correct_option` and `explanation` are NEVER selected by the frontend during a test. Test fetch uses an RPC `get_test_questions(test_id)` that returns only stem + options. Scoring happens server-side via `submit_test(test_id, answers jsonb)`.
- RLS: users read/write only their own `tests`, `test_questions`, `user_seen_questions`. Admins (via `has_role`) get full CRUD on `questions`, `topics`, `test_pattern_settings`, `main_test_events`, and read access to all `tests` / `leaderboard_entries`.
- `leaderboard_entries` readable by all authenticated users.

## 4. Server Functions (`createServerFn`, all `requireSupabaseAuth`)

- `startPracticeTest()` — checks daily cap, picks 15 Unit-I + 10 Unit-II questions respecting (a) per-topic rotation, (b) difficulty mix, (c) `user_seen_questions` exclusion. Falls back gracefully if a topic/difficulty bucket is exhausted. Marks chosen questions as seen, returns test_id + sanitized questions.
- `submitTest(testId, answers, timeSpentMap)` — scores, writes `test_questions`, sets `tests.score` and `status='submitted'`, returns per-question correctness + explanations + topic-wise breakdown.
- `getMyResults(testId)` — returns full review (correct answers + user's answers + explanations).
- `getMyHistory()` — list of submitted tests with scores and topic strengths.
- `startMainTest()` — only callable inside the open window; blends `new_question_ratio` fresh + `repeat_question_ratio` previously-seen questions; enforces compulsory timer; one attempt per user per event.
- `getLeaderboard(eventId?)` — current/past weekly leaderboard with rank + percentile.
- `reportQuestion(questionId, reason)`.

**Admin-only** (gated with `has_role` check):
- `adminUpsertQuestion`, `adminDeleteQuestion`, `adminBulkUploadQuestions(rows)`, `adminUpdatePattern`, `adminCreateMainEvent`, `adminScoreMainEvent` (computes leaderboard), `adminGetAnalytics` (per-topic remaining-fresh counts, most-missed questions, weekly participation).

A scheduled job is *not* available in V1; instead `adminScoreMainEvent` is a manual button after the window closes (PRD allows this for V1).

## 5. Routes (TanStack file-based)

Public:
- `/` — landing page (hero, how it works, leaderboard preview).
- `/auth` — sign in / sign up tabs.
- `/leaderboard` — current week public leaderboard preview (limited fields).

Authenticated (`_authenticated/`):
- `/dashboard` — daily-cap status, "Start Practice Test" CTA, Saturday Main Test countdown, recent results, topic-strength radar.
- `/practice/new` — confirm timer (optional) → starts test.
- `/test/$testId` — exam UI: question palette, single-option select, optional timer, mark-for-review, submit.
- `/test/$testId/result` — score, topic breakdown, per-question review with explanations.
- `/history` — past tests.
- `/main-test` — Saturday Main Test landing (countdown / "Start" when open / "Awaiting results" / "Your rank").
- `/profile` — edit name, target exam, avatar.

Admin (`_authenticated/admin/` gated by `has_role('admin')`):
- `/admin` — dashboard (bank totals, DAU, tests today, upcoming Main Test).
- `/admin/questions` — searchable/filterable table; add/edit modal with 4 options + radio for correct answer.
- `/admin/questions/bulk` — CSV upload with preview-before-commit and row-level error report.
- `/admin/pattern` — edit `test_pattern_settings`.
- `/admin/main-tests` — create/schedule weekly events, trigger scoring.
- `/admin/analytics` — remaining-fresh-per-topic, most-missed questions, week-over-week Main Test participation.
- `/admin/reports` — user-reported questions queue.

## 6. Test-Taking UI

Mobile-first single-column layout; question palette collapses to a drawer on small screens. Visual states: unattempted / attempted / marked-for-review / current. Optional countdown timer (auto-submit on zero); stopwatch always runs in background. Per-question time tracked silently for analytics. Compulsory timer flag respected for Main Test.

## 7. Question Selection Algorithm

For each new test (pseudocode):

```text
for each unit in [I, II]:
  slots = pattern[unit].total_questions
  per_topic = rotate_distribution(topics_in_unit, slots, user_id)  # fair rotation across tests
  for each (topic, count) in per_topic:
    diff_mix = scale_mix(default_mix, count)  # 10/20/30/40 -> integer counts
    pick `count` questions where topic=topic, difficulty buckets per diff_mix,
         AND question_id NOT IN user_seen_questions
    if bucket underfilled, borrow from adjacent difficulty
mark all picked questions as seen
```

Main Test: same shape but `floor(0.30 * 25)` slots are filled from `user_seen_questions` (previously practiced), the rest fresh.

## 8. Bulk Upload (CSV)

Columns: `topic_slug, difficulty, stem, option_a, option_b, option_c, option_d, correct_option, explanation`. Parsed client-side with PapaParse → preview table → server function validates each row (exactly one correct option, valid topic/difficulty) → returns `{ inserted, errors: [{row, reason}] }`. Invalid rows are reported, not silently skipped.

## 9. AI Seeding (one-time)

A migration won't run AI calls, so seeding is done via the bundled `ai-gateway` skill script run from the sandbox: generate ~3 MCQs per (16 topics × 4 difficulties) ≈ ~200 questions in a JSON file, then load via a follow-up SQL insert. This gives the platform enough content to demo every flow on day one.

## 10. Design Direction

Clean, focused, "study app" aesthetic: deep indigo + off-white surface, single accent (warm amber) for CTAs and the Main Test countdown, generous whitespace, monospaced timer, large tap targets. Distinct exam mode (full-bleed, minimal chrome) vs dashboard mode (cards + sidebar). I'll commit to one direction rather than offering picks, since you chose "Full PRD" scope — say the word if you'd prefer me to generate 3 visual directions first.

## 11. Build Order

1. Enable Lovable Cloud → migrations (tables, RLS, grants, `has_role`, seed `topics` + default `test_pattern_settings`).
2. Auth pages + `profiles` + `user_roles` + admin bootstrap (manually promote first signup to admin via a small one-time admin promotion screen guarded by an env-derived secret code, or seed the role for a specific email).
3. AI-seed ~200 questions into the bank.
4. Practice test flow end-to-end (start → take → submit → review).
5. Daily cap + "no repeat" enforcement + history page.
6. Admin question CRUD + bulk CSV upload.
7. Main Test event model, taking flow, scoring, leaderboard.
8. Admin pattern editor + analytics + reports queue.
9. Dashboard polish, mobile pass, empty states, error/notFound boundaries on every route.

## Out of Scope (per PRD §1.4)

Payments, native apps, proctoring, descriptive answers, multi-language.

---

**Open items to flag now (won't block the build):**
- Admin bootstrap: I'll make the first registered user an admin automatically *only* if the `user_roles` table is empty. Tell me if you'd rather hard-code an admin email.
- Main Test scoring: manual "Score now" button after the window closes (no cron in V1).
