import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Difficulty = "easy" | "medium" | "hard" | "very_hard";

interface TopicRow {
  id: string;
  unit: "I" | "II";
  name: string;
  slug: string;
  sort_order: number;
}

interface PatternRow {
  unit1_count: number;
  unit2_count: number;
  pct_easy: number;
  pct_medium: number;
  pct_hard: number;
  pct_very_hard: number;
  daily_practice_cap: number;
  main_test_new_ratio: number;
  main_test_repeat_ratio: number;
  main_test_duration_minutes: number;
}

// Distribute total slots among topics with rotation across tests
function distributeSlots(topics: TopicRow[], slots: number, seed: number): Map<string, number> {
  const n = topics.length;
  const base = Math.floor(slots / n);
  const extra = slots - base * n;
  const map = new Map<string, number>();
  // Rotate which topics get the extra slot based on the seed (test count)
  const offset = seed % n;
  for (let i = 0; i < n; i++) {
    const t = topics[(i + offset) % n];
    map.set(t.id, base + (i < extra ? 1 : 0));
  }
  return map;
}

// Split a count of questions across the 4 difficulty buckets
function splitDifficulty(count: number, pattern: PatternRow): Record<Difficulty, number> {
  if (count === 0) return { easy: 0, medium: 0, hard: 0, very_hard: 0 };
  const pct: [Difficulty, number][] = [
    ["easy", pattern.pct_easy],
    ["medium", pattern.pct_medium],
    ["hard", pattern.pct_hard],
    ["very_hard", pattern.pct_very_hard],
  ];
  const totalPct = pct.reduce((s, [, p]) => s + p, 0) || 100;
  const raw = pct.map(([d, p]) => ({ d, raw: (p / totalPct) * count }));
  // Largest remainder
  const floors = raw.map((x) => ({ d: x.d, n: Math.floor(x.raw), rem: x.raw - Math.floor(x.raw) }));
  let assigned = floors.reduce((s, x) => s + x.n, 0);
  floors.sort((a, b) => b.rem - a.rem);
  let i = 0;
  while (assigned < count) {
    floors[i % floors.length].n += 1;
    assigned++;
    i++;
  }
  const out = { easy: 0, medium: 0, hard: 0, very_hard: 0 } as Record<Difficulty, number>;
  for (const f of floors) out[f.d] = f.n;
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard", "very_hard"];

// Pick questions for one topic respecting difficulty mix and excluding seen ids
async function pickForTopic(
  supabase: any,
  topicId: string,
  total: number,
  pattern: PatternRow,
  excludeIds: Set<string>,
  preferSeen: Set<string> | null, // if non-null, prefer these (Main Test repeat slots)
): Promise<string[]> {
  if (total === 0) return [];
  const mix = splitDifficulty(total, pattern);
  const picked: string[] = [];

  for (const diff of DIFF_ORDER) {
    const want = mix[diff];
    if (want <= 0) continue;
    let q = supabase
      .from("questions")
      .select("id")
      .eq("topic_id", topicId)
      .eq("difficulty", diff)
      .eq("is_active", true)
      .limit(want * 5);

    if (preferSeen) {
      q = q.in("id", Array.from(preferSeen));
    }

    const { data } = await q;
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    let pool: string[] = ids.filter((id) => !excludeIds.has(id));
    pool = shuffle(pool).slice(0, want);
    pool.forEach((id) => picked.push(id));
    pool.forEach((id) => excludeIds.add(id));
  }

  // If buckets were underfilled, borrow from any difficulty for this topic
  if (picked.length < total) {
    const need = total - picked.length;
    let q = supabase
      .from("questions")
      .select("id")
      .eq("topic_id", topicId)
      .eq("is_active", true)
      .limit(need * 10);
    if (preferSeen) q = q.in("id", Array.from(preferSeen));
    const { data } = await q;
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    const pool = shuffle(ids.filter((id) => !excludeIds.has(id))).slice(0, need);
    pool.forEach((id) => {
      picked.push(id);
      excludeIds.add(id);
    });
  }

  return picked;
}

// =============== START PRACTICE TEST ===============
export const startPracticeTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ timeLimitMinutes: z.number().int().min(1).max(180).nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load pattern, topics
    const { data: pattern } = await supabase
      .from("test_pattern_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (!pattern) throw new Error("Test pattern not configured");

    // Daily cap check
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: takenToday } = await supabase
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("test_type", "practice")
      .gte("started_at", startOfDay.toISOString());
    if ((takenToday ?? 0) >= pattern.daily_practice_cap) {
      throw new Error(`Daily limit reached (${pattern.daily_practice_cap} practice tests per day).`);
    }

    // Load topics
    const { data: topics } = await supabase
      .from("topics")
      .select("id, unit, name, slug, sort_order")
      .order("sort_order");
    if (!topics || topics.length === 0) throw new Error("No topics configured");

    const unitI = topics.filter((t) => t.unit === "I");
    const unitII = topics.filter((t) => t.unit === "II");

    // Load seen ids for this user (to exclude)
    const { data: seenRows } = await supabase
      .from("user_seen_questions")
      .select("question_id")
      .eq("user_id", userId);
    const seenSet = new Set<string>((seenRows ?? []).map((r) => r.question_id));

    // Rotation seed: count of practice tests so far
    const { count: practiceCount } = await supabase
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("test_type", "practice");

    const exclude = new Set<string>(seenSet);
    const u1 = distributeSlots(unitI, pattern.unit1_count, practiceCount ?? 0);
    const u2 = distributeSlots(unitII, pattern.unit2_count, practiceCount ?? 0);

    const allPicked: string[] = [];
    for (const t of unitI) {
      const ids = await pickForTopic(supabase, t.id, u1.get(t.id) ?? 0, pattern, exclude, null);
      allPicked.push(...ids);
    }
    for (const t of unitII) {
      const ids = await pickForTopic(supabase, t.id, u2.get(t.id) ?? 0, pattern, exclude, null);
      allPicked.push(...ids);
    }

    if (allPicked.length === 0) {
      throw new Error("No fresh questions available. Ask the admin to add more questions to the bank.");
    }

    const shuffled = shuffle(allPicked);

    // Create test row + test_questions rows via service role (only minimal writes)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: testRow, error: testErr } = await supabaseAdmin
      .from("tests")
      .insert({
        user_id: userId,
        test_type: "practice",
        time_limit_seconds: data.timeLimitMinutes ? data.timeLimitMinutes * 60 : null,
        total_questions: shuffled.length,
        status: "in_progress",
      })
      .select("id")
      .single();
    if (testErr || !testRow) throw new Error(testErr?.message ?? "Failed to create test");

    const tqRows = shuffled.map((qid, idx) => ({
      test_id: testRow.id,
      question_id: qid,
      position: idx + 1,
    }));
    await supabaseAdmin.from("test_questions").insert(tqRows);

    // Mark seen
    const seenInsert = shuffled.map((qid) => ({ user_id: userId, question_id: qid }));
    await supabaseAdmin.from("user_seen_questions").upsert(seenInsert, { onConflict: "user_id,question_id" });

    return { testId: testRow.id };
  });

// =============== GET TEST QUESTIONS (sanitized) ===============
export const getTestForTaking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ testId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: test } = await supabase
      .from("tests")
      .select("id, user_id, test_type, started_at, time_limit_seconds, status, total_questions, main_event_id")
      .eq("id", data.testId)
      .maybeSingle();
    if (!test || test.user_id !== userId) throw new Error("Test not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tqs } = await supabaseAdmin
      .from("test_questions")
      .select("position, selected_option, question_id, questions!inner(id, stem, option_a, option_b, option_c, option_d, topic_id, difficulty, topics!inner(name, unit))")
      .eq("test_id", data.testId)
      .order("position");

    const questions = (tqs ?? []).map((row: any) => ({
      position: row.position,
      selectedOption: row.selected_option,
      questionId: row.question_id,
      stem: row.questions.stem,
      options: {
        A: row.questions.option_a,
        B: row.questions.option_b,
        C: row.questions.option_c,
        D: row.questions.option_d,
      },
      topicName: row.questions.topics.name,
      topicUnit: row.questions.topics.unit,
      difficulty: row.questions.difficulty as Difficulty,
    }));

    return { test, questions };
  });

// =============== SUBMIT TEST ===============
export const submitTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      testId: z.string().uuid(),
      answers: z.record(z.string(), z.enum(["A", "B", "C", "D"]).nullable()),
      timeSpent: z.record(z.string(), z.number().int().min(0)).optional(),
      totalTimeSeconds: z.number().int().min(0),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: test } = await supabase
      .from("tests")
      .select("id, user_id, status, total_questions")
      .eq("id", data.testId)
      .maybeSingle();
    if (!test || test.user_id !== userId) throw new Error("Test not found");
    if (test.status !== "in_progress") throw new Error("Test already submitted");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tqs } = await supabaseAdmin
      .from("test_questions")
      .select("id, question_id, position, questions!inner(correct_option, explanation, topic_id, topics!inner(name, unit))")
      .eq("test_id", data.testId)
      .order("position");

    let score = 0;
    const updates: { id: string; selected: any; correct: boolean; time: number }[] = [];
    const topicStats = new Map<string, { name: string; correct: number; total: number }>();

    for (const row of tqs ?? []) {
      const r = row as any;
      const selected = data.answers[String(r.position)] ?? null;
      const correct = selected != null && selected === r.questions.correct_option;
      if (correct) score++;
      updates.push({
        id: r.id,
        selected,
        correct: selected == null ? false : correct,
        time: data.timeSpent?.[String(r.position)] ?? 0,
      });
      const topicName = r.questions.topics.name;
      const s = topicStats.get(topicName) ?? { name: topicName, correct: 0, total: 0 };
      s.total++;
      if (correct) s.correct++;
      topicStats.set(topicName, s);
    }

    // Bulk update test_questions
    for (const u of updates) {
      await supabaseAdmin
        .from("test_questions")
        .update({ selected_option: u.selected, is_correct: u.correct, time_spent_seconds: u.time })
        .eq("id", u.id);
    }

    await supabaseAdmin
      .from("tests")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score,
        total_time_seconds: data.totalTimeSeconds,
      })
      .eq("id", data.testId);

    return {
      score,
      total: test.total_questions,
      topicBreakdown: Array.from(topicStats.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

// =============== GET TEST RESULTS (full review) ===============
export const getTestResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ testId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: test } = await supabase
      .from("tests")
      .select("*")
      .eq("id", data.testId)
      .maybeSingle();
    if (!test || test.user_id !== userId) throw new Error("Test not found");
    if (test.status !== "submitted") throw new Error("Test not yet submitted");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tqs } = await supabaseAdmin
      .from("test_questions")
      .select("position, selected_option, is_correct, time_spent_seconds, questions!inner(id, stem, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, topics!inner(name, unit))")
      .eq("test_id", data.testId)
      .order("position");

    const topicStats = new Map<string, { name: string; correct: number; total: number }>();
    const questions = (tqs ?? []).map((row: any) => {
      const topicName = row.questions.topics.name;
      const s = topicStats.get(topicName) ?? { name: topicName, correct: 0, total: 0 };
      s.total++;
      if (row.is_correct) s.correct++;
      topicStats.set(topicName, s);
      return {
        position: row.position,
        selectedOption: row.selected_option,
        isCorrect: row.is_correct,
        timeSpent: row.time_spent_seconds,
        questionId: row.questions.id,
        stem: row.questions.stem,
        options: {
          A: row.questions.option_a,
          B: row.questions.option_b,
          C: row.questions.option_c,
          D: row.questions.option_d,
        },
        correctOption: row.questions.correct_option,
        explanation: row.questions.explanation,
        difficulty: row.questions.difficulty,
        topicName,
        topicUnit: row.questions.topics.unit,
      };
    });

    return {
      test,
      questions,
      topicBreakdown: Array.from(topicStats.values()).sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

// =============== HISTORY ===============
export const getMyHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("tests")
      .select("id, test_type, started_at, submitted_at, score, total_questions, status, total_time_seconds, main_event_id")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// =============== DASHBOARD INFO ===============
export const getDashboardInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: pattern } = await supabase.from("test_pattern_settings").select("*").eq("id", 1).maybeSingle();
    const { count: takenToday } = await supabase
      .from("tests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("test_type", "practice")
      .gte("started_at", startOfDay.toISOString());

    const { data: recent } = await supabase
      .from("tests")
      .select("id, test_type, score, total_questions, submitted_at, status")
      .eq("user_id", userId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(5);

    // Next main test
    const { data: nextMain } = await supabase
      .from("main_test_events")
      .select("id, scheduled_date, opens_at, closes_at, status, duration_minutes")
      .gte("closes_at", new Date().toISOString())
      .order("opens_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      takenToday: takenToday ?? 0,
      dailyCap: pattern?.daily_practice_cap ?? 10,
      recent: recent ?? [],
      nextMain,
    };
  });

// =============== REPORT QUESTION ===============
export const reportQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ questionId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("question_reports").insert({
      user_id: userId,
      question_id: data.questionId,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
