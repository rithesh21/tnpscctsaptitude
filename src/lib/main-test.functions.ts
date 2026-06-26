import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin role required");
}

// =============== LIST EVENTS ===============
export const listMainEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("main_test_events")
      .select("*")
      .order("scheduled_date", { ascending: false })
      .limit(50);
    return data ?? [];
  });

// =============== ADMIN CREATE EVENT ===============
export const adminCreateMainEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      scheduled_date: z.string(),
      opens_at: z.string(),
      closes_at: z.string(),
      duration_minutes: z.number().int().min(5).max(180),
      new_question_ratio: z.number().min(0).max(1),
      repeat_question_ratio: z.number().min(0).max(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("main_test_events")
      .insert({ ...data, status: "scheduled" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// =============== START MAIN TEST ===============
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const startMainTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: event } = await supabase
      .from("main_test_events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!event) throw new Error("Event not found");

    const now = new Date();
    if (now < new Date(event.opens_at)) throw new Error("Main Test has not opened yet");
    if (now > new Date(event.closes_at)) throw new Error("Main Test window has closed");

    // Already attempted?
    const { data: existing } = await supabase
      .from("tests")
      .select("id, status")
      .eq("user_id", userId)
      .eq("main_event_id", data.eventId)
      .maybeSingle();
    if (existing) {
      if (existing.status === "in_progress") return { testId: existing.id };
      throw new Error("You have already attempted this week's Main Test");
    }

    const { data: pattern } = await supabase.from("test_pattern_settings").select("*").eq("id", 1).maybeSingle();
    if (!pattern) throw new Error("Pattern missing");

    const { data: topics } = await supabase.from("topics").select("*").order("sort_order");
    if (!topics) throw new Error("No topics");

    const unitI = topics.filter((t) => t.unit === "I");
    const unitII = topics.filter((t) => t.unit === "II");

    const total = pattern.unit1_count + pattern.unit2_count;
    const repeatTotal = Math.floor(total * event.repeat_question_ratio);

    // Distribute repeat budget proportionally across units
    const repeatU1 = Math.round((pattern.unit1_count / total) * repeatTotal);
    const repeatU2 = repeatTotal - repeatU1;
    const freshU1 = pattern.unit1_count - repeatU1;
    const freshU2 = pattern.unit2_count - repeatU2;

    const { data: seenRows } = await supabase
      .from("user_seen_questions")
      .select("question_id")
      .eq("user_id", userId);
    const seenSet = new Set<string>((seenRows ?? []).map((r) => r.question_id));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Helper to pick from a unit
    async function pickUnit(units: typeof unitI, freshCount: number, repeatCount: number, exclude: Set<string>) {
      const picked: string[] = [];
      // Repeat pool: previously seen
      if (repeatCount > 0 && seenSet.size > 0) {
        const topicIds = units.map((t) => t.id);
        const { data } = await supabaseAdmin
          .from("questions")
          .select("id")
          .in("topic_id", topicIds)
          .in("id", Array.from(seenSet))
          .eq("is_active", true)
          .limit(repeatCount * 10);
        const pool = shuffle((data ?? []).map((r: { id: string }) => r.id).filter((id) => !exclude.has(id))).slice(0, repeatCount);
        pool.forEach((id) => {
          picked.push(id);
          exclude.add(id);
        });
      }
      // Fresh pool: unseen
      if (freshCount > 0) {
        const topicIds = units.map((t) => t.id);
        let query = supabaseAdmin
          .from("questions")
          .select("id")
          .in("topic_id", topicIds)
          .eq("is_active", true)
          .limit(freshCount * 10);
        if (seenSet.size > 0) query = query.not("id", "in", `(${Array.from(seenSet).join(",")})`);
        const { data } = await query;
        const pool = shuffle((data ?? []).map((r: { id: string }) => r.id).filter((id) => !exclude.has(id))).slice(0, freshCount);
        pool.forEach((id) => {
          picked.push(id);
          exclude.add(id);
        });
      }
      // Backfill if short
      const stillNeed = (freshCount + repeatCount) - picked.length;
      if (stillNeed > 0) {
        const topicIds = units.map((t) => t.id);
        const { data } = await supabaseAdmin
          .from("questions")
          .select("id")
          .in("topic_id", topicIds)
          .eq("is_active", true)
          .limit(stillNeed * 10);
        const pool = shuffle((data ?? []).map((r: { id: string }) => r.id).filter((id) => !exclude.has(id))).slice(0, stillNeed);
        pool.forEach((id) => {
          picked.push(id);
          exclude.add(id);
        });
      }
      return picked;
    }

    const exclude = new Set<string>();
    const picksU1 = await pickUnit(unitI, freshU1, repeatU1, exclude);
    const picksU2 = await pickUnit(unitII, freshU2, repeatU2, exclude);
    const all = shuffle([...picksU1, ...picksU2]);

    if (all.length === 0) throw new Error("Question bank too small for Main Test");

    const { data: testRow, error } = await supabaseAdmin
      .from("tests")
      .insert({
        user_id: userId,
        test_type: "main",
        main_event_id: data.eventId,
        time_limit_seconds: event.duration_minutes * 60,
        total_questions: all.length,
        status: "in_progress",
      })
      .select("id")
      .single();
    if (error || !testRow) throw new Error(error?.message ?? "Failed");

    const tqRows = all.map((qid, i) => ({ test_id: testRow.id, question_id: qid, position: i + 1 }));
    await supabaseAdmin.from("test_questions").insert(tqRows);

    // Mark all as seen too
    const seenInsert = all.map((qid) => ({ user_id: userId, question_id: qid }));
    await supabaseAdmin.from("user_seen_questions").upsert(seenInsert, { onConflict: "user_id,question_id" });

    // Update event status to open if first attempt
    if (event.status === "scheduled") {
      await supabaseAdmin.from("main_test_events").update({ status: "open" }).eq("id", data.eventId);
    }

    return { testId: testRow.id };
  });

// =============== SCORE EVENT (admin) ===============
export const adminScoreMainEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tests } = await supabaseAdmin
      .from("tests")
      .select("id, user_id, score, total_time_seconds, status")
      .eq("main_event_id", data.eventId)
      .eq("status", "submitted");

    if (!tests || tests.length === 0) {
      throw new Error("No submitted Main Test attempts to score");
    }

    // Sort: score DESC, then time ASC
    const sorted = [...tests].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.total_time_seconds ?? 0) - (b.total_time_seconds ?? 0);
    });

    await supabaseAdmin.from("leaderboard_entries").delete().eq("main_event_id", data.eventId);
    const n = sorted.length;
    const entries = sorted.map((t, i) => ({
      main_event_id: data.eventId,
      user_id: t.user_id,
      score: t.score,
      time_taken_seconds: t.total_time_seconds ?? 0,
      rank: i + 1,
      percentile: Math.round(((n - i) / n) * 100 * 10) / 10,
    }));
    await supabaseAdmin.from("leaderboard_entries").insert(entries);
    await supabaseAdmin.from("main_test_events").update({ status: "scored" }).eq("id", data.eventId);
    return { scored: entries.length };
  });

// =============== LEADERBOARD ===============
export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eventId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let eventId = data.eventId;
    if (!eventId) {
      const { data: latest } = await context.supabase
        .from("main_test_events")
        .select("id")
        .eq("status", "scored")
        .order("scheduled_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      eventId = latest?.id;
    }
    if (!eventId) return { event: null, entries: [] };

    const { data: event } = await context.supabase
      .from("main_test_events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();
    const { data: entries } = await context.supabase
      .from("leaderboard_entries")
      .select("rank, score, time_taken_seconds, percentile, user_id, profiles!inner(name)")
      .eq("main_event_id", eventId)
      .order("rank")
      .limit(100);
    return { event, entries: entries ?? [] };
  });

export const getMyMainStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const { data: next } = await supabase
      .from("main_test_events")
      .select("*")
      .gte("closes_at", now)
      .order("opens_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    let myAttempt: { id: string; status: string; score: number } | null = null;
    if (next) {
      const { data } = await supabase
        .from("tests")
        .select("id, status, score")
        .eq("user_id", userId)
        .eq("main_event_id", next.id)
        .maybeSingle();
      myAttempt = data;
    }
    // Latest scored result
    const { data: latestScored } = await supabase
      .from("main_test_events")
      .select("id, scheduled_date")
      .eq("status", "scored")
      .order("scheduled_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    let myRank: { rank: number; score: number; percentile: number } | null = null;
    if (latestScored) {
      const { data } = await supabase
        .from("leaderboard_entries")
        .select("rank, score, percentile")
        .eq("main_event_id", latestScored.id)
        .eq("user_id", userId)
        .maybeSingle();
      myRank = data;
    }
    return { next, myAttempt, latestScored, myRank };
  });
