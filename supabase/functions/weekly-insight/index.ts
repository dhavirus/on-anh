// weekly-insight — ARCHITECTURE.md §5. Cron, weekly. Reporting only: it
// never changes scheduling. Idempotent per (learner, week).
import { createClient } from "npm:@supabase/supabase-js@2";
import { callClaude, extractJson } from "../_shared/anthropic.ts";
import { todayIn, addDays } from "../_shared/dates.ts";

const FALLBACK_VI = "Chưa tạo được nhận xét tuần này. Hãy xem các con số bên dưới.";

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: learners } = await admin.from("profiles").select("id, timezone");
  const summary = { written: 0, skipped_inactive: 0, already_done: 0, failed: 0 };

  // ponytail: sequential, one LLM call per active learner. Fine for a handful
  // of learners; batch or fan out if the group ever grows past ~50.
  for (const { id: userId, timezone } of learners ?? []) {
    const today = todayIn(timezone);
    const periodStart = addDays(today, -7);
    const periodEnd = addDays(today, -1);

    const { count } = await admin
      .from("progress_insights").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("period_start", periodStart);
    if (count) { summary.already_done++; continue; }

    const [thisWeek, lastWeek] = await Promise.all([
      admin.rpc("weekly_stats", { p_user: userId, p_start: periodStart, p_end: periodEnd }),
      admin.rpc("weekly_stats", { p_user: userId, p_start: addDays(today, -14), p_end: addDays(today, -8) }),
    ]);
    if (thisWeek.error || lastWeek.error) { summary.failed++; continue; }

    const stats = { this_week: thisWeek.data, last_week: lastWeek.data };
    // Nothing done in either week: no LLM call, no row.
    if (!thisWeek.data.active_days && !lastWeek.data.active_days) { summary.skipped_inactive++; continue; }

    const system = `You write a short weekly progress note for a Vietnamese learner of English.
Input: deterministic stats for this week and last week. Return ONLY JSON: {"summary_vi": string}
summary_vi: 3-5 plain Vietnamese sentences, warm but honest. Address the learner as "bạn" (learners may be older relatives; never "em"). Say what improved and what is stuck,
citing the numbers. Suggest one concrete focus for next week. Do not invent numbers.`;
    let summaryVi = FALLBACK_VI;
    try {
      const result = await callClaude(system, JSON.stringify(stats));
      await admin.from("llm_usage").insert({
        user_id: userId, function_name: "weekly-insight", model: result.model,
        input_tokens: result.inputTokens, output_tokens: result.outputTokens,
      });
      const parsed = extractJson(result.text) as { summary_vi?: unknown };
      if (typeof parsed.summary_vi === "string" && parsed.summary_vi.trim()) {
        summaryVi = parsed.summary_vi.trim().slice(0, 1500);
      }
    } catch (e) {
      console.error("weekly-insight LLM failed", userId, e);
    }

    const { error } = await admin.from("progress_insights").insert({
      user_id: userId, period_start: periodStart, period_end: periodEnd, stats, summary_vi: summaryVi,
    });
    if (error) summary.failed++; else summary.written++;
  }

  return Response.json(summary);
});
