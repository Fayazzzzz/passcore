# passcore

Lightweight password strength estimator. Drop-in replacement for [zxcvbn](https://github.com/dropbox/zxcvbn) — same API shape, 130x smaller than the original.

| | zxcvbn (original) | @zxcvbn-ts/core v4 | passcore |
|---|---|---|---|
| Bundle size (gzipped) | 389 KB | 855 KB | **3.0 KB** |
| Speed | 77,578 ns/op | 839,991 ns/op | **2,622 ns/op** |
| Detection rate (370 real breach passwords) | 98.4% | 98.4% | **98.4%** |
| Last published | Abandoned (2017) | Active | Active |
| Language | JavaScript | TypeScript | TypeScript |
| API | `{ score, feedback }` | `{ score, feedback }` | `{ score, warning, suggestions }` |

## Install

```sh
npm install passcore
```

## Usage

```ts
import { passcore } from 'passcore';

const result = passcore('hunter2');
// { score: 1, warning: 'This is a commonly used password.', suggestions: [...] }

const strong = passcore('xK9#mP2$vLqR!Tz7');
// { score: 4, warning: '', suggestions: [] }
```

## API

```ts
passcore(password: string): {
  score: 0 | 1 | 2 | 3 | 4;   // 0 = terrible, 4 = strong
  warning: string;              // why this password is weak (empty if not weak)
  suggestions: string[];        // actionable advice
}
```

Score meanings match zxcvbn exactly:

| Score | Label | Meaning |
|---|---|---|
| 0 | Terrible | Top-50 breach password or empty |
| 1 | Weak | Common password, keyboard pattern, repeat, sequence, or l33t substitution |
| 2 | Fair | Not obviously weak, but short or low character variety |
| 3 | Good | Reasonable length and variety |
| 4 | Strong | Long with high character variety |

## Detection layers

All five run on every password:

1. **Dictionary** — 329 entries sourced from the Pwned Passwords database (HaveIBeenPwned), including high-frequency roots found in breach data
2. **Keyboard patterns** — `qwerty`, `asdf`, `1234`, numpad walks
3. **Repeats** — `aaaa`, `ababab`, high-frequency single characters
4. **Sequences** — `abcdef`, `123456`, reverse sequences
5. **L33t speak** — `p@ssw0rd → password`, `m0nk3y → monkey`, then dictionary lookup

## Why passcore exists

zxcvbn-ts is the right modern choice when you need broad dictionary coverage — 40k+ words, i18n, custom matchers. If that's your requirement, use it.

passcore exists for the 90% case: a sign-up form that needs to block `password123` and `Password1!`, tell the user why, and not add 855 KB to your bundle doing it. The passwords that actually appear in credential stuffing attacks are not obscure literary references — they're the top breach passwords, keyboard walks, and dictionary words with a number tacked on. passcore catches those at a fraction of the cost.

| | zxcvbn-ts (core+common+en) | passcore |
|---|---|---|
| Bundle (gzipped) | 855 KB | **3.0 KB** |
| TypeScript | Yes | Yes, native |
| ESM / tree-shakeable | Yes | Yes |
| Last updated | Actively maintained | Actively maintained |
| API shape | `score` + `feedback.warning` | `score` + `warning` (one level flatter) |
| Dictionary size | 40k+ words | 329 entries |

---

## Where passcore is the right call

### SaaS and consumer sign-up forms

This is the 90% case. Your registration form needs to show a strength meter and block `password123`. It does not need to parse 389 KB of word lists to do that. Every millisecond of JS parse time on that page is time before the user can start typing. passcore is 130x smaller than the original zxcvbn and matches both competitors on detection rate — 98.4% across 370 real breach passwords from 5 major breach lists.

### React / Vue / Angular SPAs

zxcvbn cannot be tree-shaken — import it and you import all of it. passcore is 3.0 KB gzipped, fully tree-shakeable, and won't show up in your bundle analysis as a red bar. It won't push you over Core Web Vitals thresholds. It won't slow down your initial load on mobile.

### Next.js / Remix / SSR apps

zxcvbn is not built for ESM. Getting it to work with modern bundlers requires workarounds. passcore ships a proper dual ESM/CJS build and works with `next/dynamic`, RSC boundaries, and edge runtimes without configuration.

### Mobile-first or emerging-market products

On a mid-range Android device on a 3G connection, 389 KB of JavaScript is a real user-facing delay. passcore doesn't register on that scale.

### Internal tools and admin dashboards

You still want to enforce password strength. You don't want your internal tooling to have a heavier password checker than most consumer apps. passcore gives you the same UX — score, warning, suggestions — at a fraction of the footprint.

### TypeScript projects

zxcvbn has community-maintained types that lag behind and don't always match reality. passcore ships its own types and they're always correct because the types and the code are the same file.

### Teams that care about supply chain hygiene

An actively maintained library with a small, auditable codebase is easier to reason about than 7-year-old CoffeeScript you can't read. passcore's entire source fits in a single code review.

---

## Where a larger dictionary matters

passcore's 329-entry dictionary — sourced directly from the Pwned Passwords database — covers the passwords that appear in millions of breach records — the passwords responsible for the overwhelming majority of real credential attacks. What it won't catch is a user setting their password to an obscure literary reference, a foreign-language word, or a surname that happens to be in a dictionary but not in breach data.

If your product has these specific requirements, you may need a larger dictionary:

- **Password managers** — users expect their tool to flag even marginal weaknesses; false negatives carry product risk
- **Security-tooling or pen-testing platforms** — your users are security professionals who may specifically test with uncommon words
- **Regulated industries where a missed weak password carries compliance liability** — healthcare, finance, government portals where auditors may require demonstrable exhaustive checking

For everything else — which is most products — the passwords that actually get accounts compromised are the top-1000 breach passwords, keyboard walks, and `Password1!`. passcore catches those. It's the right default.

See [BENCHMARK.md](BENCHMARK.md) for detection rate data across dictionary sizes.

## Benchmark

370 unique passwords pulled live from five of the world's most famous breach lists, deduplicated, plus 6 strong-password controls. Three-way comparison: passcore vs the original zxcvbn (most downloaded, ~1.4M/week) vs @zxcvbn-ts/core v4 (the modern TypeScript rewrite).

**Sources:**
- [RockYou (2009, 32M accounts)](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Leaked-Databases/rockyou-10.txt)
- [xato-net 10M multi-breach compilation](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/xato-net-10-million-passwords-1000.txt)
- [Adobe breach (2013, 153M accounts)](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Leaked-Databases/adobe100.txt)
- [darkweb2017 dark web aggregation](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/darkweb2017_top-1000.txt)
- [Pwdb top-1000 (HIBP-compiled by Troy Hunt)](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/Pwdb_top-1000.txt)

Full results in [BENCHMARK.md](BENCHMARK.md). Run it yourself:

```sh
npm run benchmark
```

## License

MIT
