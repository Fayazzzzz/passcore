import { describe, it, expect } from "vitest";
import { passcore } from "../src/index.js";
import {
  matchDictionary,
  matchKeyboard,
  matchRepeat,
  matchSequence,
  matchL33t,
  matchCommonRoot,
} from "../src/matchers.js";

// ─── Dictionary detection ────────────────────────────────────────────────────

describe("dictionary detection", () => {
  it("flags #1 most common password", () => {
    const r = passcore("123456");
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.warning).toMatch(/commonly used/i);
  });

  it("flags 'password' (rank 2)", () => {
    const r = passcore("password");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'iloveyou'", () => {
    const r = passcore("iloveyou");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'letmein'", () => {
    const r = passcore("letmein");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags case-insensitive (PASSWORD)", () => {
    const r = passcore("PASSWORD");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("matchDictionary returns rank for known password", () => {
    const matches = matchDictionary("password");
    expect(matches).toHaveLength(1);
    // rank 1 = top-50, rank 51 = rest of dictionary
    expect(matches[0].rank).toBe(1);
  });

  it("matchDictionary returns empty for unknown password", () => {
    const matches = matchDictionary("xK9#mP2$vLqR");
    expect(matches).toHaveLength(0);
  });
});

// ─── Keyboard pattern detection ─────────────────────────────────────────────

describe("keyboard pattern detection", () => {
  it("flags 'qwerty'", () => {
    const r = passcore("qwerty");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags '1q2w3e4r'", () => {
    const r = passcore("1q2w3e4r");
    expect(r.score).toBeLessThanOrEqual(2);
  });

  it("flags 'qwertyuiop' (in dict as common password, also keyboard pattern)", () => {
    const r = passcore("qwertyuiop");
    expect(r.score).toBeLessThanOrEqual(1);
    // qwertyuiop is in the breach dictionary — dict match fires before keyboard check
    expect(r.warning).toBeTruthy();
  });

  it("flags 'wertyu' as keyboard pattern (substring of qwerty row, not in dict)", () => {
    const r = passcore("wertyu");
    expect(r.score).toBeLessThanOrEqual(2);
    expect(r.warning).toMatch(/keyboard/i);
  });

  it("flags 'asdfghjkl'", () => {
    const r = passcore("asdfghjkl");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("matchKeyboard detects qwerty walk", () => {
    const matches = matchKeyboard("qwerty");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe("keyboard");
  });
});

// ─── Repeat detection ────────────────────────────────────────────────────────

describe("repeat detection", () => {
  it("flags 'aaaaaa'", () => {
    const r = passcore("aaaaaa");
    expect(r.score).toBeLessThanOrEqual(1);
    // aaaaaa is in the breach dictionary — dict match fires first
    expect(r.warning).toBeTruthy();
  });

  it("flags 'cccccc' as repeat (not in dict)", () => {
    const r = passcore("cccccc");
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.warning).toMatch(/repeated/i);
  });

  it("flags '111111'", () => {
    const r = passcore("111111");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'ababab' (short unit repeat)", () => {
    const r = passcore("ababab");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("matchRepeat detects single-char repeat", () => {
    const matches = matchRepeat("aaaaa");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe("repeat");
  });

  it("matchRepeat detects two-char repeat unit", () => {
    const matches = matchRepeat("ababab");
    expect(matches.length).toBeGreaterThan(0);
  });
});

// ─── Sequence detection ──────────────────────────────────────────────────────

describe("sequence detection", () => {
  it("flags 'abcdefgh'", () => {
    const r = passcore("abcdefgh");
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.warning).toMatch(/sequential/i);
  });

  it("flags '12345678'", () => {
    const r = passcore("12345678");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'zyxwvuts' (reverse sequence)", () => {
    const r = passcore("zyxwvuts");
    expect(r.score).toBeLessThanOrEqual(2);
  });

  it("matchSequence detects ascending sequence", () => {
    const matches = matchSequence("abcdef");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe("sequence");
  });

  it("matchSequence detects descending sequence", () => {
    const matches = matchSequence("fedcba");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("matchSequence ignores non-sequence", () => {
    const matches = matchSequence("xK9mP2v");
    expect(matches).toHaveLength(0);
  });
});

// ─── L33t speak detection ────────────────────────────────────────────────────

describe("l33t speak detection", () => {
  it("flags 'p@ssword' (also in dict directly)", () => {
    const r = passcore("p@ssword");
    expect(r.score).toBeLessThanOrEqual(1);
    // p@ssword is in breach dict — flagged as common password
    expect(r.warning).toBeTruthy();
  });

  it("flags 'm0nk3y' via l33t substitution (monkey, not in dict as-is)", () => {
    const r = passcore("m0nk3y");
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.warning).toMatch(/substitution/i);
  });

  it("flags 'passw0rd'", () => {
    const r = passcore("passw0rd");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'p@$$w0rd'", () => {
    const r = passcore("p@$$w0rd");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("matchL33t decodes @ → a substitution", () => {
    const matches = matchL33t("p@ssword");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe("l33t");
  });

  it("matchL33t decodes 0 → o substitution", () => {
    const matches = matchL33t("passw0rd");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("flags 'N0=Acc3ss' (l33t with internal symbol separator)", () => {
    const r = passcore("N0=Acc3ss");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'adobe123' (brand root from breach data + digits)", () => {
    const r = passcore("adobe123");
    expect(r.score).toBeLessThanOrEqual(1);
  });
});

// ─── Strong password controls ────────────────────────────────────────────────

describe("strong password scoring", () => {
  it("scores a random strong password as 3 or 4", () => {
    const r = passcore("xK9#mP2$vLqR");
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("scores a long passphrase highly", () => {
    const r = passcore("correct-horse-battery-staple-42!");
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("scores empty string as 0", () => {
    const r = passcore("");
    expect(r.score).toBe(0);
  });

  it("scores very short password as 0", () => {
    const r = passcore("abc");
    expect(r.score).toBe(0);
  });

  it("a strong password has no warning", () => {
    const r = passcore("xK9#mP2$vLqR!Tz7");
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.warning).toBe("");
  });
});

// ─── Common root detection (word + digits/symbols) ───────────────────────────

describe("common root detection", () => {
  it("flags 'Password1!' (password + suffix)", () => {
    const r = passcore("Password1!");
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.warning).toMatch(/commonly used/i);
  });

  it("flags 'baseball123'", () => {
    const r = passcore("baseball123");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'football123'", () => {
    const r = passcore("football123");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'Admin123' (admin is in dictionary)", () => {
    const r = passcore("Admin123");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("flags 'Welcome1'", () => {
    const r = passcore("Welcome1");
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("matchCommonRoot detects word+digits pattern", () => {
    const matches = matchCommonRoot("password123!");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe("dictionary");
  });

  it("matchCommonRoot ignores passwords with no strippable affixes", () => {
    const matches = matchCommonRoot("password");
    expect(matches).toHaveLength(0); // no affix stripped — matchDictionary handles exact match
  });

  it("matchCommonRoot ignores strong passwords", () => {
    const matches = matchCommonRoot("xK9#mP2$vLqR");
    expect(matches).toHaveLength(0);
  });
});

// ─── Long passphrase scoring ──────────────────────────────────────────────────

describe("long passphrase scoring", () => {
  it("scores 'correct-horse-battery-staple' (28 chars) as 3 or 4", () => {
    const r = passcore("correct-horse-battery-staple");
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("scores a 20+ char lowercase passphrase as at least 3", () => {
    const r = passcore("this-is-a-long-passphrase");
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("scores a 30+ char passphrase as 4", () => {
    const r = passcore("correct-horse-battery-staple-extra");
    expect(r.score).toBe(4);
  });
});

// ─── API shape contract ──────────────────────────────────────────────────────

describe("API shape", () => {
  it("always returns score, warning, suggestions", () => {
    for (const pw of ["", "abc", "password", "xK9#mP2$vLqR"]) {
      const r = passcore(pw);
      expect(r).toHaveProperty("score");
      expect(r).toHaveProperty("warning");
      expect(r).toHaveProperty("suggestions");
      expect([0, 1, 2, 3, 4]).toContain(r.score);
      expect(typeof r.warning).toBe("string");
      expect(Array.isArray(r.suggestions)).toBe(true);
    }
  });
});
