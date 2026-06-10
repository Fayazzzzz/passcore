import { getRank } from "./dictionary.js";

export interface MatchResult {
  type: "dictionary" | "keyboard" | "repeat" | "sequence" | "l33t";
  token: string;
  rank?: number;
}

const L33T_TABLE: Record<string, string[]> = {
  a: ["4", "@"],
  b: ["8"],
  c: ["(", "{", "[", "<"],
  e: ["3"],
  g: ["6", "9"],
  i: ["1", "!", "|"],
  l: ["1", "|"],
  o: ["0"],
  s: ["5", "$"],
  t: ["7", "+"],
  x: ["%"],
  z: ["2"],
};

const KEYBOARD_ROWS = [
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "1234567890",
  "!@#$%^&*()",
];
const KEYBOARD_ADJACENCY = buildAdjacency();

function buildAdjacency(): Record<string, Set<string>> {
  const adj: Record<string, Set<string>> = {};
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (!adj[ch]) adj[ch] = new Set();
      if (i > 0) adj[ch].add(row[i - 1]);
      if (i < row.length - 1) adj[ch].add(row[i + 1]);
    }
  }
  const numpad = ["789", "456", "123", "0"];
  for (const row of numpad) {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (!adj[ch]) adj[ch] = new Set();
      if (i > 0) adj[ch].add(row[i - 1]);
      if (i < row.length - 1) adj[ch].add(row[i + 1]);
    }
  }
  return adj;
}

const KEYBOARD_PATTERNS = [
  "qwerty","asdfg","zxcvb",
  "asdf","sdfg","fghj","ghjk",
  "1234","2345","3456","4567","5678","6789",
  "4321","9876","8765","7654",
];

export function matchDictionary(password: string): MatchResult[] {
  const rank = getRank(password.toLowerCase());
  if (rank !== undefined) {
    return [{ type: "dictionary", token: password, rank }];
  }
  return [];
}

export function matchKeyboard(password: string): MatchResult[] {
  const lower = password.toLowerCase();
  if (lower.length < 4) return [];

  let adjacentPairs = 0;
  for (let i = 0; i < lower.length - 1; i++) {
    const a = lower[i];
    const b = lower[i + 1];
    if (KEYBOARD_ADJACENCY[a]?.has(b) || KEYBOARD_ADJACENCY[b]?.has(a)) {
      adjacentPairs++;
    }
  }

  if (adjacentPairs / (lower.length - 1) >= 0.6) {
    return [{ type: "keyboard", token: password }];
  }

  for (const pat of KEYBOARD_PATTERNS) {
    if (lower.includes(pat)) {
      return [{ type: "keyboard", token: password }];
    }
  }

  return [];
}

export function matchRepeat(password: string): MatchResult[] {
  if (/^(.)\1{2,}$/.test(password)) {
    return [{ type: "repeat", token: password }];
  }

  if (/^(..+?)\1{2,}$/.test(password)) {
    return [{ type: "repeat", token: password }];
  }

  const charCounts: Record<string, number> = {};
  for (const ch of password) {
    charCounts[ch] = (charCounts[ch] ?? 0) + 1;
  }
  const maxCount = Math.max(...Object.values(charCounts));
  if (password.length >= 4 && maxCount / password.length >= 0.6) {
    return [{ type: "repeat", token: password }];
  }

  return [];
}

export function matchSequence(password: string): MatchResult[] {
  if (password.length < 4) return [];

  const step = password.charCodeAt(1) - password.charCodeAt(0);
  if (Math.abs(step) !== 1) return [];

  for (let i = 1; i < password.length - 1; i++) {
    if (password.charCodeAt(i + 1) - password.charCodeAt(i) !== step) {
      return [];
    }
  }

  return [{ type: "sequence", token: password }];
}

// Strips leading/trailing digits and common symbols, then checks if the
// remaining core word is a dictionary match. Catches patterns like
// Password1!, baseball123, Welcome1, Admin123!, etc.
export function matchCommonRoot(password: string): MatchResult[] {
  const lower = password.toLowerCase();
  const stripped = lower
    .replace(/^[^a-z]+/, "")   // strip leading non-alpha
    .replace(/[^a-z]+$/, "");  // strip trailing non-alpha
  if (stripped.length < 4 || stripped === lower) return [];
  const rank = getRank(stripped);
  if (rank !== undefined) {
    return [{ type: "dictionary", token: password, rank }];
  }
  return [];
}

export function matchL33t(password: string): MatchResult[] {
  const subs: Array<[string, string]> = [];
  for (const [letter, l33ts] of Object.entries(L33T_TABLE)) {
    for (const l33t of l33ts) {
      if (password.toLowerCase().includes(l33t)) {
        subs.push([l33t, letter]);
      }
    }
  }

  if (subs.length === 0) return [];

  let candidate = password.toLowerCase();
  for (const [l33t, letter] of subs) {
    candidate = candidate.split(l33t).join(letter);
  }

  if (candidate === password.toLowerCase()) return [];

  // Direct match
  const rank = getRank(candidate);
  if (rank !== undefined) {
    return [{ type: "l33t", token: password, rank }];
  }

  // Decoded string may contain non-alpha separators (e.g. N0=Acc3ss → no=access).
  // Check each alpha segment of length >= 4.
  const segments = candidate.split(/[^a-z]+/).filter((s) => s.length >= 4);
  for (const seg of segments) {
    const segRank = getRank(seg);
    if (segRank !== undefined) {
      return [{ type: "l33t", token: password, rank: segRank }];
    }
  }

  return [];
}
