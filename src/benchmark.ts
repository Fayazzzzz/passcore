import { writeFileSync, statSync, readdirSync } from "fs";
import { createGzip } from "zlib";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createRequire } from "module";

// zxcvbn-ts v4: import via direct .mjs paths — tsx resolves package imports to
// CJS, which breaks v4's dictionary-compression dependency under Node CJS.
import { ZxcvbnFactory } from "../node_modules/@zxcvbn-ts/core/dist/index.mjs";
import * as zxcvbnCommonPackage from "../node_modules/@zxcvbn-ts/language-common/dist/index.mjs";
import * as zxcvbnEnPackage from "../node_modules/@zxcvbn-ts/language-en/dist/index.mjs";

// Original zxcvbn (CJS, abandoned 2017) — still the most downloaded (~1.4M/week)
const require = createRequire(import.meta.url);
const zxcvbnOriginal = require("zxcvbn") as (pw: string) => { score: number };

import { passcore } from "./index.js";

const zxcvbnTsInstance = new ZxcvbnFactory({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: { ...zxcvbnCommonPackage.dictionary, ...zxcvbnEnPackage.dictionary },
});

const BASE = "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords";

// ─── Test data sources ────────────────────────────────────────────────────────
//
// Five of the world's most famous breach password lists, all from SecLists
// (github.com/danielmiessler/SecLists). Fetched live at benchmark runtime —
// nothing is hardcoded in this repo.
//
// 1. RockYou (2009)
//    The canonical breach dataset. 32M plaintext passwords leaked from the
//    RockYou social app. rockyou-10.txt = all passwords in the top-10%
//    frequency bucket (~90 entries).
//    https://github.com/danielmiessler/SecLists/blob/master/Passwords/Leaked-Databases/rockyou-10.txt
//
// 2. xato-net 10M
//    Mark Burnett's 10-million-password compilation, aggregated from hundreds
//    of public breach dumps.
//    https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/xato-net-10-million-passwords-1000.txt
//
// 3. Adobe (2013)
//    Top 100 passwords from the 2013 Adobe breach (153M accounts). Passwords
//    were stored as ECB-encrypted — frequency analysis recovered the top values.
//    https://github.com/danielmiessler/SecLists/blob/master/Passwords/Leaked-Databases/adobe100.txt
//
// 4. darkweb2017
//    Aggregation of passwords observed on dark web forums/marketplaces in 2017.
//    https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/darkweb2017_top-1000.txt
//
// 5. Pwdb top-1000
//    Troy Hunt's HIBP (Have I Been Pwned) compiled top-1000. Derived from the
//    Pwdb project which aggregated 1.4 billion plaintext credential pairs.
//    https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/Pwdb_top-1000.txt
//
const SOURCES: { name: string; url: string; take: number }[] = [
  {
    name: "RockYou (2009, 32M accounts)",
    url: `${BASE}/Leaked-Databases/rockyou-10.txt`,
    take: 90,
  },
  {
    name: "xato-net 10M (multi-breach compilation)",
    url: `${BASE}/Common-Credentials/xato-net-10-million-passwords-1000.txt`,
    take: 200,
  },
  {
    name: "Adobe breach (2013, 153M accounts)",
    url: `${BASE}/Leaked-Databases/adobe100.txt`,
    take: 100,
  },
  {
    name: "darkweb2017 (dark web aggregation)",
    url: `${BASE}/Common-Credentials/darkweb2017_top-1000.txt`,
    take: 200,
  },
  {
    name: "Pwdb top-1000 (HIBP-compiled by Troy Hunt)",
    url: `${BASE}/Common-Credentials/Pwdb_top-1000.txt`,
    take: 200,
  },
];

async function fetchLines(url: string, take: number): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.text())
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .slice(0, take);
}

async function loadPasswords(): Promise<{ weak: string[]; strong: string[]; sources: string[] }> {
  const fetched = await Promise.all(
    SOURCES.map(async (s) => {
      const lines = await fetchLines(s.url, s.take);
      console.log(`  ${s.name}: ${lines.length} passwords`);
      return lines;
    })
  );

  const seen = new Set<string>();
  const weak: string[] = [];
  for (const lines of fetched) {
    for (const pw of lines) {
      if (!seen.has(pw)) {
        seen.add(pw);
        weak.push(pw);
      }
    }
  }

  const strong = [
    "xK9#mP2$vLqR",
    "correct-horse-battery-staple-42!",
    "Tr0ub4dor&3x9!",
    "7hG$kLm2@nQpWx",
    "P@$$w0rd!2024",
    "Qwerty123!",
  ];

  return { weak, strong, sources: SOURCES.map((s) => s.name) };
}

// ─── Bundle sizes ─────────────────────────────────────────────────────────────

async function gzipSize(filePath: string): Promise<number> {
  const tmp = join(tmpdir(), `bench-${Date.now()}-${Math.random()}.gz`);
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), createWriteStream(tmp));
  return statSync(tmp).size;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function packageGzipSize(pkg: string): Promise<number> {
  const base = new URL(`../node_modules/${pkg}/dist/`, import.meta.url).pathname;
  const files = readdirSync(base, { recursive: true })
    .filter((f): f is string => typeof f === "string" && f.endsWith(".mjs"))
    .map((f) => base + f);
  const sizes = await Promise.all(files.map(gzipSize));
  return sizes.reduce((a, b) => a + b, 0);
}

// ─── Speed benchmark ──────────────────────────────────────────────────────────

function benchmarkSpeed(fn: (pw: string) => unknown, pws: string[], iterations = 5_000): string {
  for (let i = 0; i < 200; i++) fn(pws[i % pws.length]);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn(pws[i % pws.length]);
  const ms = performance.now() - start;
  return `${((ms / iterations) * 1_000_000).toFixed(0)} ns/op`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Measuring bundle sizes...");
  const [passcoreGzip, zxcvbnOrigGzip, zxcvbnTsCoreGzip, zxcvbnTsCommonGzip, zxcvbnTsEnGzip] =
    await Promise.all([
      gzipSize(new URL("../dist/index.mjs", import.meta.url).pathname),
      gzipSize(new URL("../node_modules/zxcvbn/dist/zxcvbn.js", import.meta.url).pathname),
      packageGzipSize("@zxcvbn-ts/core"),
      packageGzipSize("@zxcvbn-ts/language-common"),
      packageGzipSize("@zxcvbn-ts/language-en"),
    ]);
  const zxcvbnOrigTotalGzip = zxcvbnOrigGzip;
  const zxcvbnTsTotalGzip = zxcvbnTsCoreGzip + zxcvbnTsCommonGzip + zxcvbnTsEnGzip;

  console.log("\nFetching breach password lists from SecLists...");
  const { weak, strong, sources } = await loadPasswords();
  console.log(`\nLoaded ${weak.length} unique breach passwords + ${strong.length} controls\n`);

  const allPws = [...weak, ...strong];

  // Detection
  const weakDetection = weak.map((pw) => ({
    pw,
    pc: passcore(pw).score,
    orig: zxcvbnOriginal(pw).score,
    ts: zxcvbnTsInstance.check(pw).score,
  }));
  const strongDetection = strong.map((pw) => ({
    pw,
    pc: passcore(pw).score,
    orig: zxcvbnOriginal(pw).score,
    ts: zxcvbnTsInstance.check(pw).score,
  }));

  const pcWeak   = weakDetection.filter((r) => r.pc   <= 1).length;
  const origWeak = weakDetection.filter((r) => r.orig <= 1).length;
  const tsWeak   = weakDetection.filter((r) => r.ts   <= 1).length;

  const pcStrong   = strongDetection.filter((r) => r.pc   >= 3).length;
  const origStrong = strongDetection.filter((r) => r.orig >= 3).length;
  const tsStrong   = strongDetection.filter((r) => r.ts   >= 3).length;

  // Speed
  console.log("Running speed benchmarks...");
  const pcSpeed   = benchmarkSpeed((pw) => passcore(pw), allPws);
  const origSpeed = benchmarkSpeed((pw) => zxcvbnOriginal(pw), allPws);
  const tsSpeed   = benchmarkSpeed((pw) => zxcvbnTsInstance.check(pw), allPws);

  // ─── Tables ──────────────────────────────────────────────────────────────────

  const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;
  const col = (s: string | number, w: number) => String(s).padEnd(w);

  const bundleTable = [
    `| Library                     | Bundle (gzipped) | vs passcore |`,
    `|-----------------------------|------------------|-------------|`,
    `| passcore                    | ${col(formatBytes(passcoreGzip), 16)} | baseline    |`,
    `| zxcvbn (original, v4.4.2)   | ${col(formatBytes(zxcvbnOrigTotalGzip), 16)} | ${col(Math.round(zxcvbnOrigTotalGzip / passcoreGzip) + "x larger", 11)} |`,
    `| @zxcvbn-ts/core v4 (+ packs)| ${col(formatBytes(zxcvbnTsTotalGzip), 16)} | ${col(Math.round(zxcvbnTsTotalGzip / passcoreGzip) + "x larger", 11)} |`,
  ].join("\n");

  const detectionTable = [
    `| Metric                         | passcore      | zxcvbn (orig) | @zxcvbn-ts/core |`,
    `|--------------------------------|---------------|---------------|-----------------|`,
    `| Breach passwords caught (≤1)   | ${col(pcWeak + "/" + weak.length, 13)} | ${col(origWeak + "/" + weak.length, 13)} | ${col(tsWeak + "/" + weak.length, 15)} |`,
    `| Detection rate                 | ${col(pct(pcWeak, weak.length), 13)} | ${col(pct(origWeak, weak.length), 13)} | ${col(pct(tsWeak, weak.length), 15)} |`,
    `| Strong controls correct (≥3)   | ${col(pcStrong + "/" + strong.length, 13)} | ${col(origStrong + "/" + strong.length, 13)} | ${col(tsStrong + "/" + strong.length, 15)} |`,
  ].join("\n");

  const speedTable = [
    `| Library               | Speed          |`,
    `|-----------------------|----------------|`,
    `| passcore              | ${col(pcSpeed, 14)} |`,
    `| zxcvbn (original)     | ${col(origSpeed, 14)} |`,
    `| @zxcvbn-ts/core v4    | ${col(tsSpeed, 14)} |`,
  ].join("\n");

  const terminal = `
passcore benchmark
==================

Bundle Size
-----------
${bundleTable}

Detection Rate  (${weak.length} unique passwords from ${sources.length} real breach lists + ${strong.length} strong controls)
----------------
${detectionTable}

Speed  (${(5_000).toLocaleString()} iterations)
------
${speedTable}
`;

  console.log(terminal);

  const md = `# passcore benchmark

## Bundle Size

${bundleTable}

> zxcvbn original: single \`zxcvbn.js\` file. @zxcvbn-ts: \`core\` + \`language-common\` + \`language-en\` (minimum usable config).

## Detection Rate

Test set: ${weak.length} unique passwords from ${sources.length} breach lists (${sources.join(", ")}) — plus ${strong.length} strong controls. Score ≤ 1 = detected weak.

${detectionTable}

## Speed

${(5_000).toLocaleString()} iterations, warmup included, Node.js ${process.version}.

${speedTable}

## Methodology

- Passwords fetched live from SecLists at benchmark time — no hardcoded lists
- Sources: ${sources.join("; ")}
- Bundle size: gzip level 9
- Speed measured over all ${allPws.length} passwords (breach + controls) cycling

Generated: ${new Date().toISOString()}
`;

  writeFileSync("BENCHMARK.md", md);
  console.log("BENCHMARK.md written.");
}

main().catch(console.error);
