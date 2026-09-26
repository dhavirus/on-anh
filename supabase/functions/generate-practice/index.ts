// generate-practice — ARCHITECTURE.md §5.
// Called when the learner picks a topic and explicitly asks for a new
// practice set. One LLM call per invocation; nothing here runs on a
// schedule or on login.
import { getAuthedContext } from "../_shared/client.ts";
import { userToday } from "../_shared/dates.ts";
import { callClaude, extractJson } from "../_shared/anthropic.ts";
import { givesAwayAnswer } from "../_shared/grading.ts";

const ALLOWED_ITEM_TYPES = ["fill_blank", "reorder", "short_answer"];
const MAX_ITEMS = 8;

// daily_plans (M5) may not exist yet for a given user/day — that's a real
// ordering gap between M4 and M5 in the spec (generate-practice's own
// description reads from a plan that plan-day, a LATER milestone,
// creates). Fall back to sane defaults rather than depending on it.
const DEFAULT_NEW_WORD_COUNT = 3;


Deno.serve(async (req) => {
  const ctx = await getAuthedContext(req);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { topic_id } = await req.json();
  if (!topic_id) {
    return Response.json({ error: "topic_id is required" }, { status: 400 });
  }

  const userId = ctx.user.id;
  const today = await userToday(ctx.supabase, userId);

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("target_cefr")
    .eq("id", userId)
    .single();

  const { data: plan } = await ctx.supabase
    .from("daily_plans")
    .select("id, new_word_count, target_cefr, grammar_focus_unit_id")
    .eq("user_id", userId)
    .eq("plan_date", today)
    .maybeSingle();

  const targetCefr = plan?.target_cefr ?? profile?.target_cefr ?? "A2";
  const newWordCount = plan?.new_word_count ?? DEFAULT_NEW_WORD_COUNT;

  // Due reviews.
  const { data: dueRows } = await ctx.supabase
    .from("user_word_progress")
    .select("word_id, word_bank(id, lemma, pos, cefr_level)")
    .eq("user_id", userId)
    .lte("next_review_date", today);

  // Unseen words from the chosen topic at the target level.
  const { data: existingProgress } = await ctx.supabase
    .from("user_word_progress")
    .select("word_id")
    .eq("user_id", userId);
  const knownWordIds = new Set((existingProgress ?? []).map((r) => r.word_id));

  const { data: topicWords } = await ctx.supabase
    .from("word_topics")
    .select("word_id, word_bank(id, lemma, pos, cefr_level)")
    .eq("topic_id", topic_id);

  const newWords = (topicWords ?? [])
    .map((r: any) => r.word_bank)
    .filter((w: any) => w && w.cefr_level === targetCefr && !knownWordIds.has(w.id))
    .slice(0, newWordCount);

  const dueWords = (dueRows ?? []).map((r: any) => r.word_bank).filter(Boolean);
  const targetWords = [...dueWords, ...newWords];

  if (targetWords.length === 0) {
    return Response.json({ error: "No words available for practice on this topic" }, { status: 422 });
  }

  // Grammar constraints: only units the learner has actually unlocked
  // on the grammar page (§5 step 2 — new grammar never appears here
  // before it's been passed there).
  const { data: masteryRows } = await ctx.supabase
    .from("unit_mastery")
    .select("unit_id, grammar_units(id, title_en, explanation_md)")
    .eq("user_id", userId)
    .eq("unlocked", true);
  const unlockedUnits = (masteryRows ?? []).map((r: any) => r.grammar_units).filter(Boolean);

  const system = `You write short English practice exercises for a Vietnamese learner.
Return ONLY a JSON array, no prose, no markdown fences. Each element:
{"item_type": "fill_blank" | "reorder" | "short_answer", "prompt": string, "correct_answer": string, "target_word_id": number | null, "grammar_unit_id": number | null}
Rules:
- One item per target word listed below (use its id as target_word_id).
- prompt is a short original English sentence or task using that word naturally.
- If unlocked grammar units are listed, weave 1-2 of them into relevant items (set grammar_unit_id), otherwise leave grammar_unit_id null.
- correct_answer must be a single unambiguous exact answer.
- Never put the answer (or a hint like "(use: word)") in the prompt.
- Do not invent word or unit ids outside the ones provided.`;

  const userMessage = JSON.stringify({
    target_words: targetWords.map((w: any) => ({ id: w.id, lemma: w.lemma, pos: w.pos, cefr_level: w.cefr_level })),
    unlocked_grammar_units: unlockedUnits.map((u: any) => ({ id: u.id, title_en: u.title_en })),
  });

  const result = await callClaude(system, userMessage);

  let rawItems: unknown;
  try {
    rawItems = extractJson(result.text);
  } catch {
    return Response.json({ error: "Model did not return valid JSON" }, { status: 502 });
  }
  if (!Array.isArray(rawItems)) {
    return Response.json({ error: "Model response was not a JSON array" }, { status: 502 });
  }

  // §1 principle 4 — clamp/validate before persisting anything the
  // model returned. Drop malformed items rather than trust them.
  const validWordIds = new Set(targetWords.map((w: any) => w.id));
  const validUnitIds = new Set(unlockedUnits.map((u: any) => u.id));

  const items = rawItems
    .filter(
      (it: any) =>
        it &&
        ALLOWED_ITEM_TYPES.includes(it.item_type) &&
        typeof it.prompt === "string" &&
        it.prompt.trim().length > 0 &&
        typeof it.correct_answer === "string" &&
        it.correct_answer.trim().length > 0 &&
        (it.target_word_id === null || validWordIds.has(it.target_word_id)) &&
        (it.grammar_unit_id === null || validUnitIds.has(it.grammar_unit_id)) &&
        !givesAwayAnswer(it.prompt, it.correct_answer)
    )
    .slice(0, MAX_ITEMS);

  if (items.length === 0) {
    return Response.json({ error: "Model returned no usable items" }, { status: 502 });
  }

  const { data: session, error: sessionError } = await ctx.supabaseAdmin
    .from("practice_sessions")
    .insert({ user_id: userId, topic_id, daily_plan_id: plan?.id ?? null })
    .select("id")
    .single();
  if (sessionError || !session) {
    return Response.json({ error: "Could not create practice session" }, { status: 500 });
  }

  const rowsToInsert = items.map((it: any, i: number) => ({
    session_id: session.id,
    item_type: it.item_type,
    prompt: it.prompt,
    correct_answer: it.correct_answer,
    target_word_id: it.target_word_id,
    grammar_unit_id: it.grammar_unit_id,
    position: i + 1,
  }));

  const { data: insertedItems, error: itemsError } = await ctx.supabaseAdmin
    .from("practice_items")
    .insert(rowsToInsert)
    .select("id, item_type, prompt, target_word_id, grammar_unit_id, position");
  if (itemsError || !insertedItems) {
    return Response.json({ error: "Could not save practice items" }, { status: 500 });
  }

  await ctx.supabaseAdmin.from("llm_usage").insert({
    user_id: userId,
    function_name: "generate-practice",
    model: result.model,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
  });

  // correct_answer deliberately excluded — see the select() above.
  return Response.json({ session_id: session.id, items: insertedItems });
});
