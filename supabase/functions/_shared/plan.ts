// plan-day step 4 (ARCHITECTURE.md §5): clamp the LLM's proposal before
// persisting. Pure function so it can be tested without an LLM or DB.

// EFLLex ships A1..C1 only (no C2), so the ladder stops at C1.
export const LADDER = ["A1", "A2", "B1", "B2", "C1"];
const WEEK_MS = 7 * 864e5;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface UnlockedUnit { id: number; accuracy: number }

export function clampPlan(
  raw: any,
  current: { cefr: string; cefrChangedAt: string | null; unlocked: UnlockedUnit[]; now?: number },
) {
  const now = current.now ?? Date.now();
  const newWordCount = clamp(Math.round(Number(raw?.new_word_count)) || 3, 1, 5);

  const mayChangeLevel = !current.cefrChangedAt || new Date(current.cefrChangedAt).getTime() <= now - WEEK_MS;
  const delta = mayChangeLevel ? clamp(Math.trunc(Number(raw?.cefr_delta)) || 0, -1, 1) : 0;
  const idx = LADDER.indexOf(current.cefr);
  const next = idx + delta;
  const levelChanged = idx >= 0 && delta !== 0 && next >= 0 && next < LADDER.length;
  const targetCefr = levelChanged ? LADDER[next] : current.cefr;

  const ids = new Set(current.unlocked.map((u) => u.id));
  const weakest = [...current.unlocked].sort((a, b) => a.accuracy - b.accuracy)[0]?.id ?? null;
  const grammarUnitId: number | null = ids.has(raw?.grammar_focus_unit_id) ? raw.grammar_focus_unit_id : weakest;

  const rationale = typeof raw?.rationale === "string" ? raw.rationale.slice(0, 500) : null;
  return { newWordCount, targetCefr, levelChanged, grammarUnitId, rationale };
}
