// Run: node supabase/functions/_shared/plan.test.ts  (ESM via supabase/functions/package.json)
import assert from "node:assert/strict";
import { clampPlan } from "./plan.ts";

const NOW = Date.parse("2026-09-26T00:00:00Z");
const units = [{ id: 1, accuracy: 0.9 }, { id: 2, accuracy: 0.6 }];
const base = { cefr: "A2", cefrChangedAt: null, unlocked: units, now: NOW };

// new_word_count: out of range, fractional, garbage
assert.equal(clampPlan({ new_word_count: 99 }, base).newWordCount, 5);
assert.equal(clampPlan({ new_word_count: -4 }, base).newWordCount, 1);
assert.equal(clampPlan({ new_word_count: 2.6 }, base).newWordCount, 3);
assert.equal(clampPlan({ new_word_count: "lots" }, base).newWordCount, 3);
assert.equal(clampPlan(null, base).newWordCount, 3);

// cefr_delta: clamped to ±1, one step at a time
assert.equal(clampPlan({ cefr_delta: 3 }, base).targetCefr, "B1");
assert.equal(clampPlan({ cefr_delta: -7 }, base).targetCefr, "A1");
assert.equal(clampPlan({ cefr_delta: 0 }, base).levelChanged, false);
// ladder ends: no C2, nothing below A1
assert.deepEqual(
  (({ targetCefr, levelChanged }) => ({ targetCefr, levelChanged }))(clampPlan({ cefr_delta: 1 }, { ...base, cefr: "C1" })),
  { targetCefr: "C1", levelChanged: false },
);
assert.equal(clampPlan({ cefr_delta: -1 }, { ...base, cefr: "A1" }).targetCefr, "A1");

// 7-day rule
const changed = (daysAgo: number) => new Date(NOW - daysAgo * 864e5).toISOString();
assert.equal(clampPlan({ cefr_delta: 1 }, { ...base, cefrChangedAt: changed(3) }).targetCefr, "A2");
assert.equal(clampPlan({ cefr_delta: 1 }, { ...base, cefrChangedAt: changed(7) }).targetCefr, "B1");

// grammar unit: must be unlocked, else the weakest unlocked one, else null
assert.equal(clampPlan({ grammar_focus_unit_id: 1 }, base).grammarUnitId, 1);
assert.equal(clampPlan({ grammar_focus_unit_id: 42 }, base).grammarUnitId, 2);
assert.equal(clampPlan({ grammar_focus_unit_id: "1" }, base).grammarUnitId, 2);
assert.equal(clampPlan({ grammar_focus_unit_id: 1 }, { ...base, unlocked: [] }).grammarUnitId, null);

// rationale: string only, capped
assert.equal(clampPlan({ rationale: 5 }, base).rationale, null);
assert.equal(clampPlan({ rationale: "x".repeat(900) }, base).rationale!.length, 500);

console.log("plan clamp: all checks passed");
