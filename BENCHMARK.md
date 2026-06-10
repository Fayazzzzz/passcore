# passcore benchmark

## Bundle Size

| Library                     | Bundle (gzipped) | vs passcore |
|-----------------------------|------------------|-------------|
| passcore                    | 3.0 KB           | baseline    |
| zxcvbn (original, v4.4.2)   | 389.0 KB         | 130x larger |
| @zxcvbn-ts/core v4 (+ packs)| 855.4 KB         | 286x larger |

> zxcvbn original: single `zxcvbn.js` file. @zxcvbn-ts: `core` + `language-common` + `language-en` (minimum usable config).

## Detection Rate

Test set: 370 unique passwords from 5 breach lists (RockYou (2009, 32M accounts), xato-net 10M (multi-breach compilation), Adobe breach (2013, 153M accounts), darkweb2017 (dark web aggregation), Pwdb top-1000 (HIBP-compiled by Troy Hunt)) — plus 6 strong controls. Score ≤ 1 = detected weak.

| Metric                         | passcore      | zxcvbn (orig) | @zxcvbn-ts/core |
|--------------------------------|---------------|---------------|-----------------|
| Breach passwords caught (≤1)   | 364/370       | 364/370       | 364/370         |
| Detection rate                 | 98.4%         | 98.4%         | 98.4%           |
| Strong controls correct (≥3)   | 5/6           | 4/6           | 4/6             |

## Speed

5,000 iterations, warmup included, Node.js v25.6.1.

| Library               | Speed          |
|-----------------------|----------------|
| passcore              | 2622 ns/op     |
| zxcvbn (original)     | 77578 ns/op    |
| @zxcvbn-ts/core v4    | 839991 ns/op   |

## Methodology

- Passwords fetched live from SecLists at benchmark time — no hardcoded lists
- Sources: RockYou (2009, 32M accounts); xato-net 10M (multi-breach compilation); Adobe breach (2013, 153M accounts); darkweb2017 (dark web aggregation); Pwdb top-1000 (HIBP-compiled by Troy Hunt)
- Bundle size: gzip level 9
- Speed measured over all 376 passwords (breach + controls) cycling

Generated: 2026-06-10T23:08:59.122Z
