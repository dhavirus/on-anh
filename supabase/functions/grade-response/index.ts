// grade-response — ARCHITECTURE.md §5.
import { getAuthedContext } from "../_shared/client.ts";
import { callClaude, extractJson } from "../_shared/anthropic.ts";
import { userToday } from "../_shared/dates.ts";
import { normalize, applySm2, SM2_DEFAULTS } from "../_shared/grading.ts";

Deno.serve(async (req) => {
  const ctx = await getAuthedContext(req);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { item_id, submitted_answer } = await req.json();
  if (!item_id || typeof submitted_answer !== "string") {
    return Response.json({ error: "item_id and submitted_answer are required" }, { status: 400 });
  }

  const userId = ctx.user.id;
  const today = await userToday(ctx.supabase, userId);

  // supabaseAdmin bypasses RLS (practice_items has no authenticated
  // select policy by design — §1 principle 3), so ownership must be
  // checked manually here rather than relying on a policy.
  const { data: item } = await ctx.supabaseAdmin
    .from("practice_items")
    .select("id, correct_answer, target_word_id, grammar_unit_id, session_id, practice_sessions(user_id)")
    .eq("id", item_id)
    .single();

  if (!item || (item as any).practice_sessions?.user_id !== userId) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  const exactMatch = normalize(submitted_answer) === normalize(item.correct_answer);

  let isCorrect: boolean;
  let gradedBy: "exact" | "llm";
  let explanationVi: string;
  let llmResult: Awaited<ReturnType<typeof callClaude>> | null = null;

  if (exactMatch) {
    isCorrect = true;
    gradedBy = "exact";
    explanationVi = "Chính xác!";
  } else {
    gradedBy = "llm";
    const system = `You judge a Vietnamese English-learner's answer against an expected answer,
then write a short Vietnamese explanation. Return ONLY JSON, no prose:
{"is_correct": boolean, "explanation_vi": string}
is_correct is true only if the learner's answer is a valid alternative phrasing with the same
meaning and grammar as the expected answer — not just topically related. The Vietnamese
explanation should briefly reference what the learner actually wrote versus the expected form.`;
    const userMessage = JSON.stringify({
      expected_answer: item.correct_answer,
      learner_answer: submitted_answer,
    });
    llmResult = await callClaude(system, userMessage);
    try {
      const parsed = extractJson(llmResult.text) as { is_correct?: unknown; explanation_vi?: unknown };
      isCorrect = parsed.is_correct === true;
      explanationVi =
        typeof parsed.explanation_vi === "string" && parsed.explanation_vi.trim()
          ? parsed.explanation_vi
          : "Chưa đúng, hãy xem lại đáp án đúng bên dưới.";
    } catch {
      isCorrect = false;
      explanationVi = "Chưa đúng, hãy xem lại đáp án đúng bên dưới.";
    }
  }

  await ctx.supabaseAdmin.from("practice_responses").insert({
    item_id,
    user_id: userId,
    submitted_answer,
    is_correct: isCorrect,
    graded_by: gradedBy,
    explanation_vi: explanationVi,
  });

  // SM-2 update, only when this item targets a specific vocabulary word.
  if (item.target_word_id) {
    const { data: existing } = await ctx.supabaseAdmin
      .from("user_word_progress")
      .select("ease_factor, interval_days, repetitions, lapses")
      .eq("user_id", userId)
      .eq("word_id", item.target_word_id)
      .maybeSingle();

    const quality = !isCorrect ? 1 : gradedBy === "exact" ? 5 : 4;
    const updated = applySm2(existing ?? SM2_DEFAULTS, quality, today);

    await ctx.supabaseAdmin.from("user_word_progress").upsert(
      {
        user_id: userId,
        word_id: item.target_word_id,
        ...updated,
      },
      { onConflict: "user_id,word_id" }
    );
  }

  // Streak: bumped by a DB trigger on practice_responses (§6), not here.

  if (llmResult) {
    await ctx.supabaseAdmin.from("llm_usage").insert({
      user_id: userId,
      function_name: "grade-response",
      model: llmResult.model,
      input_tokens: llmResult.inputTokens,
      output_tokens: llmResult.outputTokens,
    });
  }

  return Response.json({
    is_correct: isCorrect,
    correct_answer: item.correct_answer,
    explanation_vi: explanationVi,
    graded_by: gradedBy,
  });
});
