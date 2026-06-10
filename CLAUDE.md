# passcore — Project Context for Claude Code

## What this is

`passcorelib` — a lightweight password strength estimator. Drop-in **replacement** (not substitute) for zxcvbn. Same score 0–4 API, 3.0 KB gzipped vs zxcvbn's 389 KB.

**npm package name:** `passcorelib`  
**Public API:** `passcore(password: string): PasscoreResult`  
**Return type:** `{ score: 0|1|2|3|4, warning: string, suggestions: string[] }`

Note: zxcvbn returns `result.feedback.warning` — passcore returns `result.warning` (one level flatter). This is intentional. It's a replacement, not a substitute.

## Architecture

```
src/
  index.ts       — public entry, runs all matchers then computeScore
  matchers.ts    — 6 matchers: matchDictionary, matchL33t, matchCommonRoot,
                   matchKeyboard, matchRepeat, matchSequence
  score.ts       — computeScore: priority-ordered chain, then length+charset scoring
  dictionary.ts  — 329 entries (breach passwords + high-frequency roots from breach data, lazily parsed into Sets)
  benchmark.ts   — standalone comparison vs zxcvbn (not in build)
```

## Known design decisions

- **Dictionary is exact whole-string match only.** `mypassword123` won't match `password`. `matchCommonRoot` handles the affix case.
- **matchSequence is whole-string only.** `pass1234` won't be flagged by sequence — the `1234` is caught by keyboard pattern instead.
- **Score priority chain:** dictionary → l33t → commonRoot → keyboard → repeat → sequence. First match wins.
- **Length floor in scoring:** passwords ≥20 chars score at least 3; ≥30 chars score 4, regardless of charset. Aligns with NIST SP 800-63B (length > complexity).

## Bugs found and fixed (June 2026)

### 1. Passphrase scoring (score.ts)
**Problem:** `correct-horse-battery-staple` (28 chars) scored 2 because `charsetScore=2` hit the `cs<=2` branch regardless of length.  
**Fix:** Added length floor after scoring block. `len>=20 → score=max(score,3)`, `len>=30 → score=max(score,4)`.

### 2. Word+affix patterns missed (matchers.ts)
**Problem:** `Password1!`, `baseball123`, `Admin123`, `Welcome1` all scored 2 — extremely common in breach data.  
**Fix:** Added `matchCommonRoot` — strips leading/trailing non-alpha chars, checks if the core word is in the dictionary.

### 3. Dictionary missing critical words (dictionary.ts)
**Problem:** `admin`, `test`, `user`, `login`, `pass` not in dictionary — meant `Admin123` etc. slipped through even after matchCommonRoot.  
**Fix:** Added these 5 words to the top-50 section of the dictionary.

## What's still not caught (known limitations, not bugs)

- Seasonal patterns: `Summer2024`, `January2023` — "summer"/"january" not in dictionary
- Embedded dictionary words: `mypassword123` scores 2 (whole-string matching by design)
- `Passw0rd1` — l33t of `passw0rd1`, which isn't in the dict (passw0rd is)

## Build

```sh
npm run build    # tsup (ESM+CJS) + tsc declarations → dist/
npm test         # vitest run
npm run benchmark  # needs dist/ built first
```

## Test suite

7 describe blocks in `tests/passcore.test.ts`. All matchers have direct unit tests. Run `npm test` to verify everything passes after changes.

## Comparison targets

Benchmark compares against both:
- `zxcvbn` (original, v4.4.2) — still the most downloaded (~1.4M/week), abandoned since 2017
- `@zxcvbn-ts/core` v4 + `language-common` + `language-en` — the modern TypeScript rewrite
