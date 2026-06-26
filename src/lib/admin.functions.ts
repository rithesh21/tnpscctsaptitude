import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const QuestionShape = z.object({
  topic_id: z.string().uuid(),
  difficulty: z.enum(["easy", "medium", "hard", "very_hard"]),
  stem: z.string().min(3),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const adminUpsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), data: QuestionShape }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload = { ...data.data, created_by: context.userId };
    if (data.id) {
      const { error } = await context.supabase.from("questions").update(data.data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("questions").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      topicId: z.string().uuid().optional(),
      difficulty: z.enum(["easy", "medium", "hard", "very_hard"]).optional(),
      search: z.string().optional(),
      page: z.number().int().min(0).default(0),
      pageSize: z.number().int().min(1).max(100).default(25),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("questions")
      .select("id, stem, difficulty, correct_option, is_active, topic_id, topics!inner(name, unit)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * data.pageSize, data.page * data.pageSize + data.pageSize - 1);
    if (data.topicId) q = q.eq("topic_id", data.topicId);
    if (data.difficulty) q = q.eq("difficulty", data.difficulty);
    if (data.search && data.search.trim().length > 0) q = q.ilike("stem", `%${data.search.trim()}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

// =============== BULK UPLOAD ===============
const BulkRow = z.object({
  topic_slug: z.string(),
  difficulty: z.string(),
  stem: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
  correct_option: z.string(),
  explanation: z.string().optional().nullable(),
});

export const adminBulkUploadQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(BulkRow) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: topics } = await context.supabase.from("topics").select("id, slug");
    const slugMap = new Map((topics ?? []).map((t) => [t.slug, t.id]));
    const validDiffs = new Set(["easy", "medium", "hard", "very_hard"]);
    const validOpts = new Set(["A", "B", "C", "D"]);

    const errors: { row: number; reason: string }[] = [];
    const inserts: any[] = [];
    data.rows.forEach((r, i) => {
      const line = i + 2; // header at line 1
      const topicId = slugMap.get(r.topic_slug.trim());
      if (!topicId) return errors.push({ row: line, reason: `Unknown topic_slug "${r.topic_slug}"` });
      const diff = r.difficulty.trim().toLowerCase();
      if (!validDiffs.has(diff)) return errors.push({ row: line, reason: `Invalid difficulty "${r.difficulty}"` });
      const correct = r.correct_option.trim().toUpperCase();
      if (!validOpts.has(correct)) return errors.push({ row: line, reason: `Invalid correct_option "${r.correct_option}"` });
      if (!r.stem.trim() || !r.option_a || !r.option_b || !r.option_c || !r.option_d) {
        return errors.push({ row: line, reason: "Missing required field" });
      }
      inserts.push({
        topic_id: topicId,
        difficulty: diff,
        stem: r.stem.trim(),
        option_a: r.option_a,
        option_b: r.option_b,
        option_c: r.option_c,
        option_d: r.option_d,
        correct_option: correct,
        explanation: r.explanation ?? null,
        created_by: context.userId,
      });
    });

    let inserted = 0;
    if (inserts.length > 0) {
      // chunk to avoid huge payloads
      const CHUNK = 500;
      for (let i = 0; i < inserts.length; i += CHUNK) {
        const slice = inserts.slice(i, i + CHUNK);
        const { error, count } = await context.supabase.from("questions").insert(slice, { count: "exact" });
        if (error) throw new Error(error.message);
        inserted += count ?? slice.length;
      }
    }
    return { inserted, errors };
  });

// =============== PATTERN SETTINGS ===============
export const adminGetPattern = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("test_pattern_settings").select("*").eq("id", 1).maybeSingle();
    return data;
  });

export const adminUpdatePattern = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      unit1_count: z.number().int().min(1).max(50),
      unit2_count: z.number().int().min(1).max(50),
      pct_easy: z.number().int().min(0).max(100),
      pct_medium: z.number().int().min(0).max(100),
      pct_hard: z.number().int().min(0).max(100),
      pct_very_hard: z.number().int().min(0).max(100),
      daily_practice_cap: z.number().int().min(1).max(100),
      main_test_new_ratio: z.number().min(0).max(1),
      main_test_repeat_ratio: z.number().min(0).max(1),
      main_test_duration_minutes: z.number().int().min(5).max(180),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("test_pattern_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============== ADMIN DASHBOARD ===============
export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { count: totalQuestions } = await context.supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    const { data: byTopic } = await context.supabase
      .from("questions")
      .select("topic_id, difficulty, topics!inner(name, unit, sort_order)")
      .eq("is_active", true);

    const topicStats = new Map<
      string,
      { name: string; unit: string; sortOrder: number; total: number; byDiff: Record<string, number> }
    >();
    for (const r of (byTopic ?? []) as any[]) {
      const key = r.topic_id;
      const s = topicStats.get(key) ?? {
        name: r.topics.name,
        unit: r.topics.unit,
        sortOrder: r.topics.sort_order,
        total: 0,
        byDiff: { easy: 0, medium: 0, hard: 0, very_hard: 0 } as Record<string, number>,
      };
      s.total++;
      s.byDiff[r.difficulty as string] = (s.byDiff[r.difficulty as string] ?? 0) + 1;
      topicStats.set(key, s);
    }

    const { count: totalUsers } = await context.supabase.from("profiles").select("id", { count: "exact", head: true });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: testsToday } = await context.supabase
      .from("tests")
      .select("id", { count: "exact", head: true })
      .gte("started_at", startOfDay.toISOString());

    const { data: nextMain } = await context.supabase
      .from("main_test_events")
      .select("*")
      .gte("closes_at", new Date().toISOString())
      .order("opens_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: lastMain } = await context.supabase
      .from("main_test_events")
      .select("id, scheduled_date")
      .eq("status", "scored")
      .order("scheduled_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    let lastMainParticipants = 0;
    if (lastMain) {
      const { count } = await context.supabase
        .from("leaderboard_entries")
        .select("id", { count: "exact", head: true })
        .eq("main_event_id", lastMain.id);
      lastMainParticipants = count ?? 0;
    }

    return {
      totalQuestions: totalQuestions ?? 0,
      totalUsers: totalUsers ?? 0,
      testsToday: testsToday ?? 0,
      topicStats: Array.from(topicStats.values()).sort((a, b) => a.sortOrder - b.sortOrder),
      nextMain,
      lastMain,
      lastMainParticipants,
    };
  });

// =============== ANALYTICS ===============
export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    // Most-missed questions (top 20 by incorrect ratio with at least 3 attempts)
    const { data: tq } = await context.supabase
      .from("test_questions")
      .select("question_id, is_correct, questions!inner(stem, topics!inner(name))")
      .not("is_correct", "is", null)
      .limit(5000);
    const counts = new Map<string, { stem: string; topic: string; right: number; total: number }>();
    for (const r of (tq ?? []) as any[]) {
      const k = r.question_id;
      const s = counts.get(k) ?? { stem: r.questions.stem, topic: r.questions.topics.name, right: 0, total: 0 };
      s.total++;
      if (r.is_correct) s.right++;
      counts.set(k, s);
    }
    const missed = Array.from(counts.entries())
      .filter(([, s]) => s.total >= 3)
      .map(([id, s]) => ({ id, ...s, missRate: 1 - s.right / s.total }))
      .sort((a, b) => b.missRate - a.missRate)
      .slice(0, 20);

    // Weekly main test participation
    const { data: events } = await context.supabase
      .from("main_test_events")
      .select("id, scheduled_date, status")
      .order("scheduled_date", { ascending: false })
      .limit(10);
    const participation: { date: string; count: number }[] = [];
    for (const e of events ?? []) {
      const { count } = await context.supabase
        .from("leaderboard_entries")
        .select("id", { count: "exact", head: true })
        .eq("main_event_id", e.id);
      participation.push({ date: e.scheduled_date, count: count ?? 0 });
    }

    return { missed, participation };
  });

// =============== REPORTS QUEUE ===============
export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("question_reports")
      .select("id, reason, status, created_at, question_id, questions!inner(stem, topics!inner(name))")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["open", "resolved", "dismissed"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("question_reports").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
