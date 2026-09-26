// plan-day — ARCHITECTURE.md §5. Called once on the first app open of the
// day; idempotent (one daily_plans row per user per day, no LLM on repeat).
import { getAuthedContext } from "../_shared/client.ts";
import { callClaude, extractJson } from "../_shared/anthropic.ts";
import { todayIn, addDays } from "../_shared/dates.ts";
import { clampPlan } from "../_shared/plan.ts";

const PLAN_COLUMNS = "id, plan_date, new_word_count, target_cefr, grammar_focus_unit_id, rationale";

Deno.serve(async (req) => {
  const ctx = await getAuthedContext(req);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = ctx.user.id;
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("target_cefr, timezone, cefr_changed_at")
    .eq("id", userId)
    .single();
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const today = todayIn(profile.timezone);

  // 1. Already planned today -> no LLM call.
  const existing = await ctx.supabase
    .from("daily_plans").select(PLAN_COLUMNS).eq("user_id", userId).eq("plan_date", today).maybeSingle();
  if (existing.data) return Response.json({ plan: existing.data });

  // 2. Deterministic stats.
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [{ data: reviews }, { data: responses }, { data: mastery }, { data: streak }, { count: dueCount }] = await Promise.all([
    ctx.supabase.from("word_reviews").select("quality").eq("user_id", userId).gte("reviewed_at", since),
    // Admin client: practice_items has no learner select policy, so the embed needs it.
    // Practice items that target a word count as vocab reviews too.
    ctx.supabaseAdmin
      .from("practice_responses")
      .select("is_correct, practice_items!inner(target_word_id)")
      .eq("user_id", userId)
      .gte("responded_at", since)
      .not("practice_items.target_word_id", "is", null),
    ctx.supabase
      .from("unit_mastery")
      .select("unit_id, attempts, rolling_accuracy, grammar_units(title_en)")
      .eq("user_id", userId)
      .eq("unlocked", true),
    ctx.supabase.from("user_streaks").select("current_streak, last_active_date").eq("user_id", userId).maybeSingle(),
    ctx.supabase
      .from("user_word_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review_date", today),
  ]);

  // §5: correct reviews / total reviews over 14 days (flashcard pass = SM-2 quality >= 3).
  const outcomes = [...(reviews ?? []).map((r) => r.quality >= 3), ...(responses ?? []).map((r) => r.is_correct)];
  const total = outcomes.length;
  const retention = total ? outcomes.filter(Boolean).length / total : null;
  const streakAlive = streak && streak.last_active_date >= addDays(today, -1);
  const unlocked = (mastery ?? []).map((m: any) => ({
    id: m.unit_id,
    title: m.grammar_units?.title_en,
    accuracy: m.rolling_accuracy,
    attempts: m.attempts,
  }));

  const stats = {
    current_cefr: profile.target_cefr,
    vocab_retention_14d: retention,
    reviews_14d: total,
    current_streak: streakAlive ? streak!.current_streak : 0,
    words_due_today: dueCount ?? 0,
    unlocked_grammar_units: unlocked,
  };

  // 3. LLM proposes; code decides. On failure return an error and persist
  // nothing, so the next open retries (generate-practice has its own defaults).
  const system = `You plan one day of English study for a Vietnamese learner.
Return ONLY JSON, no prose: {"new_word_count": integer 1-5, "cefr_delta": -1 | 0 | 1, "grammar_focus_unit_id": integer | null, "rationale": string (one short sentence)}
Guidance: low retention or many words due -> fewer new words and delta 0 or -1; high retention (>0.85) over enough reviews -> more new words, delta +1 only if consistently strong.
grammar_focus_unit_id must be one of the listed unlocked units (prefer weaker accuracy), else null.`;
  const result = await callClaude(system, JSON.stringify(stats)).catch(() => null);
  let raw: any;
  try {
    raw = extractJson(result!.text);
  } catch {
    return Response.json({ error: "Could not produce a plan" }, { status: 502 });
  }
  await ctx.supabaseAdmin.from("llm_usage").insert({
    user_id: userId,
    function_name: "plan-day",
    model: result!.model,
    input_tokens: result!.inputTokens,
    output_tokens: result!.outputTokens,
  });

  // 4. Clamp before persisting.
  const { newWordCount, targetCefr, levelChanged, grammarUnitId, rationale } = clampPlan(raw, {
    cefr: profile.target_cefr,
    cefrChangedAt: profile.cefr_changed_at,
    unlocked,
  });

  const { data: plan, error } = await ctx.supabaseAdmin
    .from("daily_plans")
    .insert({
      user_id: userId,
      plan_date: today,
      new_word_count: newWordCount,
      target_cefr: targetCefr,
      grammar_focus_unit_id: grammarUnitId,
      rationale,
      raw_llm_response: raw,
    })
    .select(PLAN_COLUMNS)
    .single();

  if (error) {
    // Lost a race with a concurrent call (unique user_id+plan_date): serve the winner's plan.
    const winner = await ctx.supabase
      .from("daily_plans").select(PLAN_COLUMNS).eq("user_id", userId).eq("plan_date", today).maybeSingle();
    if (winner.data) return Response.json({ plan: winner.data });
    return Response.json({ error: "Could not save plan" }, { status: 500 });
  }

  if (levelChanged) {
    await ctx.supabaseAdmin
      .from("profiles")
      .update({ target_cefr: targetCefr, cefr_changed_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return Response.json({ plan });
});
