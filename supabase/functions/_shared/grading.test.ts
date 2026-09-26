// Run: node supabase/functions/_shared/grading.test.ts
import assert from "node:assert/strict";
import { givesAwayAnswer } from "./grading.ts";

assert.equal(givesAwayAnswer("I _____ water for tea. (use: boil)", "boil"), true);
assert.equal(givesAwayAnswer("The water is boiling. It will _____ soon.", "boil"), false); // word boundary
assert.equal(givesAwayAnswer("What does a chef do?", "cook"), false);
assert.equal(givesAwayAnswer("Put in order: store / to / went / I", "I went to the store."), false);
assert.equal(givesAwayAnswer("Is it (a+b)?", "(a+b)"), true); // regex chars escaped, no throw
console.log("grading: all checks passed");
