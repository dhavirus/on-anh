// define-words — Vietnamese meaning + example for flashcards. Each word is
// generated at most once and cached on word_bank for every learner.
import { getAuthedContext } from "../_shared/client.ts";
import { callClaude, extractJson } from "../_shared/anthropic.ts";

// Keeps one response well under callClaude's 1024 max_tokens.
const MAX_WORDS = 10;

const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

Deno.serve(async (req) => {
  const ctx = await getAuthedContext(req);
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.word_ids)
    ? [...new Set(body.word_ids.filter(Number.isInteger))].slice(0, MAX_WORDS)
    : [];
  if (!ids.length) return Response.json({ error: "word_ids is required" }, { status: 400 });

  const { data: words } = await ctx.supabaseAdmin
    .from("word_bank").select("id, lemma, pos, cefr_level, meaning_vi").in("id", ids);
  const missing = (words ?? []).filter((w) => !w.meaning_vi);

  if (missing.length) {
    const system = `You write flashcard backs for Vietnamese learners of English.
Return ONLY a JSON array, one element per input word: {"id": number, "meaning_vi": string, "example_en": string, "example_vi": string}
- meaning_vi: the most common Vietnamese meaning for that part of speech (pos is a Penn-style tag: NN noun, VV verb, JJ adjective, RB adverb...). Short: a word or phrase, at most two senses separated by ";".
- example_en: one short, natural, original sentence using the word, pitched at the word's CEFR level.
- example_vi: a natural Vietnamese translation of example_en.
Use only the ids given.`;
    const result = await callClaude(system, JSON.stringify(missing.map(({ meaning_vi: _, ...w }) => w)));
    await ctx.supabaseAdmin.from("llm_usage").insert({
      user_id: ctx.user.id, function_name: "define-words", model: result.model,
      input_tokens: result.inputTokens, output_tokens: result.outputTokens,
    });

    let items: unknown = [];
    try { items = extractJson(result.text); } catch { /* nothing saved; the next review retries */ }

    // Clamp before persisting: only requested, still-missing ids; strings with length caps.
    const pending = new Set(missing.map((w) => w.id));
    for (const it of Array.isArray(items) ? items : []) {
      const meaning = text(it?.meaning_vi, 200);
      if (!pending.has(it?.id) || !meaning) continue;
      pending.delete(it.id);
      await ctx.supabaseAdmin
        .from("word_bank")
        .update({ meaning_vi: meaning, example_en: text(it.example_en, 300), example_vi: text(it.example_vi, 300) })
        .eq("id", it.id)
        .is("meaning_vi", null); // a concurrent request may have filled it first
    }
  }

  const { data: out } = await ctx.supabaseAdmin
    .from("word_bank").select("id, meaning_vi, example_en, example_vi").in("id", ids);
  return Response.json({ words: out ?? [] });
});
