import {
  matchDictionary,
  matchKeyboard,
  matchRepeat,
  matchSequence,
  matchL33t,
  matchCommonRoot,
} from "./matchers.js";
import { computeScore } from "./score.js";
import type { PasscoreResult } from "./score.js";

export type { PasscoreResult };

export function passcore(password: string): PasscoreResult {
  const matches = [
    ...matchDictionary(password),
    ...matchL33t(password),
    ...matchCommonRoot(password),
    ...matchKeyboard(password),
    ...matchRepeat(password),
    ...matchSequence(password),
  ];

  return computeScore(password, matches);
}

