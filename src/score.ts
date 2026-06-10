import type { MatchResult } from "./matchers.js";

export interface PasscoreResult {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string;
  suggestions: string[];
}

const SUGGESTIONS_BASE = [
  "Add a mix of letters, numbers, and symbols.",
  "Avoid common words and predictable patterns.",
  "Use at least 12 characters.",
];

export function computeScore(
  password: string,
  matches: MatchResult[]
): PasscoreResult {
  if (password.length === 0) {
    return { score: 0, warning: "", suggestions: [] };
  }

  // Immediate fail conditions
  const dictMatch = matches.find((m) => m.type === "dictionary");
  const l33tMatch = matches.find((m) => m.type === "l33t");
  const keyboardMatch = matches.find((m) => m.type === "keyboard");
  const repeatMatch = matches.find((m) => m.type === "repeat");
  const sequenceMatch = matches.find((m) => m.type === "sequence");

  if (dictMatch) {
    const isTop50 = (dictMatch.rank ?? 999) <= 50;
    return {
      score: isTop50 ? 0 : 1,
      warning: "This is a commonly used password.",
      suggestions: [
        "Use a password that isn't commonly used.",
        ...SUGGESTIONS_BASE,
      ],
    };
  }

  if (l33tMatch) {
    return {
      score: 1,
      warning: "Predictable letter substitutions (like @ for a) are easy to guess.",
      suggestions: [
        "Avoid letter-to-symbol substitutions — they're well-known to attackers.",
        ...SUGGESTIONS_BASE,
      ],
    };
  }

  if (keyboardMatch) {
    return {
      score: 1,
      warning: "Keyboard patterns are easy to guess.",
      suggestions: [
        "Avoid sequences of nearby keys.",
        ...SUGGESTIONS_BASE,
      ],
    };
  }

  if (repeatMatch) {
    return {
      score: 1,
      warning: "Repeated characters are easy to guess.",
      suggestions: [
        "Avoid repeated characters or patterns.",
        ...SUGGESTIONS_BASE,
      ],
    };
  }

  if (sequenceMatch) {
    return {
      score: 1,
      warning: "Sequential characters (abc, 123) are easy to guess.",
      suggestions: [
        "Avoid alphabetical or numeric sequences.",
        ...SUGGESTIONS_BASE,
      ],
    };
  }

  // No weak patterns detected — score by length and character variety
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const charsetScore =
    (hasUpper ? 1 : 0) +
    (hasLower ? 1 : 0) +
    (hasDigit ? 1 : 0) +
    (hasSymbol ? 1 : 0);

  let score: 0 | 1 | 2 | 3 | 4;
  const suggestions: string[] = [];
  let warning = "";

  if (len < 6) {
    score = 0;
    warning = "Password is too short.";
    suggestions.push("Use at least 8 characters.");
  } else if (len < 8 || charsetScore <= 1) {
    score = 1;
    warning = "Password is weak.";
    if (len < 8) suggestions.push("Use at least 8 characters.");
    if (charsetScore <= 1)
      suggestions.push("Mix letters, numbers, and symbols.");
  } else if (len < 12 || charsetScore <= 2) {
    score = 2;
    if (len < 12) suggestions.push("Consider using 12 or more characters.");
    if (charsetScore <= 2)
      suggestions.push("Add symbols or numbers to improve strength.");
  } else if (len < 16 || charsetScore <= 3) {
    score = 3;
    if (charsetScore <= 3)
      suggestions.push(
        "Adding more character variety would make this stronger."
      );
  } else {
    score = 4;
  }

  // Length floor: long passwords are strong regardless of character variety.
  // A 20+ character passphrase is vastly harder to crack than a short mixed-charset
  // password. Aligns with NIST SP 800-63B guidance that length > complexity.
  if (len >= 20 && score < 3) score = 3;
  if (len >= 30 && score < 4) score = 4;

  return { score, warning, suggestions };
}
