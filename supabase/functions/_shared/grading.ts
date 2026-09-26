import { addDays } from "./dates.ts";

// ARCHITECTURE.md §5 grade-response step 1: normalize, then exact match.
const CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  "won't": "will not",
  "wouldn't": "would not",
  "can't": "cannot",
  "couldn't": "could not",
  "shouldn't": "should not",
  "mustn't": "must not",
  "i'm": "i am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "i'll": "i will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "we'll": "we will",
  "they'll": "they will",
};

export function normalize(input: string): string {
  let s = input.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  for (const [contraction, expanded] of Object.entries(CONTRACTIONS)) {
    s = s.replaceAll(contraction, expanded);
  }
  return s;
}


// Drop items whose prompt contains the answer as a whole word/phrase,
// e.g. "I _____ water. (use: boil)" with answer "boil".
export function givesAwayAnswer(prompt: string, answer: string): boolean {
  const a = normalize(answer).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!\\w)${a}(?!\\w)`).test(normalize(prompt));
}

// ARCHITECTURE.md §6 — same formula as the client-side flashcard review
// in app.js, ported to the server for LLM-practice grading. Different
// runtimes (browser vs Deno), no shared module without build tooling,
// so this is a deliberate small duplication rather than a forced
// abstraction across the two.
export interface Sm2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
}

export function applySm2(state: Sm2State, quality: number, today: string): Sm2State & { next_review_date: string } {
  const next: Sm2State = { ...state };
  if (quality < 3) {
    next.repetitions = 0;
    next.interval_days = 1;
    next.lapses = state.lapses + 1;
  } else {
    next.repetitions = state.repetitions + 1;
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    next.ease_factor = Math.max(1.3, state.ease_factor + delta);
    if (next.repetitions === 1) next.interval_days = 1;
    else if (next.repetitions === 2) next.interval_days = 6;
    else next.interval_days = Math.round(state.interval_days * next.ease_factor);
  }
  return { ...next, next_review_date: addDays(today, next.interval_days) };
}

export const SM2_DEFAULTS: Sm2State = { ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0 };
