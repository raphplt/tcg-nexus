/**
 * Monorepo Global Test Coverage Runner & Aggregator
 *
 * Runs the test suite of every workspace that has one, then prints a unified
 * summary table with a weighted monorepo total.
 *
 * Every number in the report comes from the run that just happened: Istanbul
 * summaries for Jest and Vitest, LCOV for the Node test runner, and a JSON
 * summary for the Python service. A workspace whose suite fails, or whose
 * runner produced no report, is shown as FAIL with no figures — never with a
 * remembered value.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const LINES_WARN_THRESHOLD = 80;

/**
 * One coverage metric. `pct` is null when the runner does not measure it
 * (branch coverage under Python's `trace`, statements under `node --test`).
 * `covered` / `total` are absolute counts, needed to weight the global total.
 */
interface Metric {
  pct: number | null;
  covered: number | null;
  total: number | null;
}

interface Metrics {
  lines: Metric;
  statements: Metric;
  branches: Metric;
  functions: Metric;
}

interface TestCounts {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

interface Collected {
  metrics: Metrics;
  tests: TestCounts | null;
}

interface ServiceResult {
  name: string;
  type: string;
  commandOk: boolean;
  collected: Collected | null;
  status: "PASS" | "WARN" | "FAIL";
}

interface CommandRun {
  ok: boolean;
  output: string;
}

interface WorkspaceSpec {
  name: string;
  type: string;
  /** Working directory of the command, relative to the monorepo root. */
  dir: string;
  /** Folder holding the workspace coverage reports, relative to the root. */
  reportDir: string;
  command: string;
  /** Capture stdout when the report can only be read from the console. */
  capture?: boolean;
  collect: (run: CommandRun, reportDir: string) => Collected | null;
}

const NO_METRIC: Metric = { pct: null, covered: null, total: null };

const stripAnsi = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, "");

function metric(pct: unknown, covered?: unknown, total?: unknown): Metric {
  return {
    pct: typeof pct === "number" ? pct : null,
    covered: typeof covered === "number" ? covered : null,
    total: typeof total === "number" ? total : null,
  };
}

function runCommand(spec: WorkspaceSpec, cwd: string): CommandRun {
  const rule = "=".repeat(80);
  console.log(`\n\x1b[36m${rule}\x1b[0m`);
  console.log(
    `\x1b[1m\x1b[34m▶ RUNNING COVERAGE: ${spec.name}\x1b[0m \x1b[90m(${spec.command})\x1b[0m`,
  );
  console.log(`\x1b[36m${rule}\x1b[0m\n`);

  const result = spawnSync(spec.command, {
    cwd,
    shell: true,
    encoding: "utf-8",
    stdio: spec.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  const output = spec.capture
    ? `${result.stdout ?? ""}${result.stderr ?? ""}`
    : "";
  if (output) process.stdout.write(output);

  const ok = result.status === 0;
  if (!ok)
    console.error(`\n\x1b[31m✖ Test suite failed for ${spec.name}\x1b[0m`);

  return { ok, output };
}

/** Reads an Istanbul `coverage-summary.json`, as written by Jest and Vitest. */
function readIstanbulSummary(file: string): Metrics | null {
  if (!fs.existsSync(file)) return null;

  const total = JSON.parse(fs.readFileSync(file, "utf-8")).total;
  if (!total) return null;

  const read = (key: keyof Metrics): Metric =>
    total[key]
      ? metric(total[key].pct, total[key].covered, total[key].total)
      : NO_METRIC;

  return {
    lines: read("lines"),
    statements: read("statements"),
    branches: read("branches"),
    functions: read("functions"),
  };
}

/**
 * Reads test counts from a runner result file. Jest and Vitest share the same
 * JSON shape; the Python runner writes a plain `tests` block.
 */
function readTestCounts(file: string): TestCounts | null {
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));

  if (typeof data.numTotalTests === "number") {
    return {
      passed: data.numPassedTests ?? 0,
      failed: data.numFailedTests ?? 0,
      skipped: data.numPendingTests ?? 0,
      total: data.numTotalTests,
    };
  }

  if (data.tests && typeof data.tests.total === "number") {
    return {
      passed: data.tests.passed ?? 0,
      failed: data.tests.failed ?? 0,
      skipped: data.tests.skipped ?? 0,
      total: data.tests.total,
    };
  }

  return null;
}

/**
 * Sums an LCOV report into coverage metrics. `node --test` emits one record per
 * file with found/hit counters, so summing them yields exact totals instead of
 * an average of per-file percentages.
 */
function parseLcov(file: string): Metrics | null {
  if (!fs.existsSync(file)) return null;

  const totals: Record<string, number> = {};
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const match = line.match(/^(LF|LH|FNF|FNH|BRF|BRH):(\d+)/);
    if (match) totals[match[1]] = (totals[match[1]] ?? 0) + Number(match[2]);
  }
  if (totals.LF === undefined) return null;

  const ratio = (hit = 0, found = 0): Metric =>
    metric(
      found > 0 ? Number(((100 * hit) / found).toFixed(2)) : 0,
      hit,
      found,
    );

  return {
    lines: ratio(totals.LH, totals.LF),
    // The V8 coverage behind `node --test` has no statement notion of its own.
    statements: NO_METRIC,
    branches: ratio(totals.BRH, totals.BRF),
    functions: ratio(totals.FNH, totals.FNF),
  };
}

/** Reads the `pass` / `fail` / `skipped` tallies printed by `node --test`. */
function parseNodeTestCounts(output: string): TestCounts | null {
  const text = stripAnsi(output);
  const tally = (label: string) => {
    const match = text.match(new RegExp(`^\\D*\\b${label} (\\d+)\\s*$`, "m"));
    return match ? Number(match[1]) : null;
  };

  const passed = tally("pass");
  const failed = tally("fail");
  if (passed === null || failed === null) return null;

  return {
    passed,
    failed,
    skipped: tally("skipped") ?? 0,
    total: passed + failed,
  };
}

/** Collector for the workspaces driven by `node --test` (spec + LCOV output). */
function collectNodeTest(run: CommandRun, reportDir: string): Collected | null {
  const metrics = parseLcov(path.join(reportDir, "lcov.info"));
  if (!metrics) return null;
  return { metrics, tests: parseNodeTestCounts(run.output) };
}

const WORKSPACES: WorkspaceSpec[] = [
  {
    name: "apps/api",
    type: "NestJS Backend",
    dir: "apps/api",
    reportDir: "apps/api/coverage",
    command:
      "npm run test:cov -- --no-watchman --json --outputFile=coverage/jest-results.json",
    collect: (_run, reportDir) => {
      const metrics = readIstanbulSummary(
        path.join(reportDir, "coverage-summary.json"),
      );
      if (!metrics) return null;
      return {
        metrics,
        tests: readTestCounts(path.join(reportDir, "jest-results.json")),
      };
    },
  },
  {
    name: "apps/web",
    type: "Next.js Frontend",
    dir: "apps/web",
    reportDir: "apps/web/coverage",
    command:
      "npm run test:cov -- --reporter=default --reporter=json --outputFile=coverage/vitest-results.json",
    collect: (_run, reportDir) => {
      const metrics = readIstanbulSummary(
        path.join(reportDir, "coverage-summary.json"),
      );
      if (!metrics) return null;
      return {
        metrics,
        tests: readTestCounts(path.join(reportDir, "vitest-results.json")),
      };
    },
  },
  {
    name: "apps/fetch",
    type: "Data Ingestion",
    dir: "apps/fetch",
    reportDir: "apps/fetch/coverage",
    command: "npm run test:cov",
    capture: true,
    collect: collectNodeTest,
  },
  {
    name: "apps/mobile",
    type: "Mobile App Logic",
    dir: "apps/mobile",
    reportDir: "apps/mobile/coverage",
    command: "npm run test:cov",
    capture: true,
    collect: collectNodeTest,
  },
  {
    name: "packages/effect-parser",
    type: "Rule Engine AST",
    dir: "packages/effect-parser",
    reportDir: "packages/effect-parser/coverage",
    command: "npm run test:cov",
    capture: true,
    collect: collectNodeTest,
  },
  {
    name: "packages/pokemon-dataset",
    type: "Catalog Storage",
    dir: "packages/pokemon-dataset",
    reportDir: "packages/pokemon-dataset/coverage",
    command: "npm run test:cov",
    capture: true,
    collect: collectNodeTest,
  },
  {
    name: "apps/vision",
    type: "OCR & Vision API",
    // The Python suite discovers its tests from its own folder but is run from
    // the root so that `app.*` imports resolve.
    dir: ".",
    reportDir: "apps/vision/coverage",
    command: "python3 apps/vision/test_cov.py",
    collect: (_run, reportDir) => {
      const file = path.join(reportDir, "coverage-summary.json");
      const metrics = readIstanbulSummary(file);
      if (!metrics) return null;
      return { metrics, tests: readTestCounts(file) };
    },
  },
];

function statusOf(
  run: CommandRun,
  collected: Collected | null,
): ServiceResult["status"] {
  if (!run.ok || !collected) return "FAIL";
  if (collected.tests && collected.tests.failed > 0) return "FAIL";

  const lines = collected.metrics.lines.pct;
  return lines !== null && lines >= LINES_WARN_THRESHOLD ? "PASS" : "WARN";
}

const results: ServiceResult[] = [];

for (const spec of WORKSPACES) {
  const reportDir = path.join(ROOT_DIR, spec.reportDir);
  fs.mkdirSync(reportDir, { recursive: true });

  const run = runCommand(spec, path.join(ROOT_DIR, spec.dir));
  const collected = run.ok ? spec.collect(run, reportDir) : null;

  if (run.ok && !collected) {
    console.error(
      `\x1b[31m✖ No coverage report produced by ${spec.name}\x1b[0m`,
    );
  }

  results.push({
    name: spec.name,
    type: spec.type,
    commandOk: run.ok,
    collected,
    status: statusOf(run, collected),
  });
}

const COLUMNS = { name: 26, type: 18, pct: 9, tests: 11, status: 8 };

const pctCell = (value: Metric) =>
  (value.pct === null ? "n/a" : `${value.pct.toFixed(2)}%`).padStart(
    COLUMNS.pct,
  );

const widths = [
  COLUMNS.name,
  COLUMNS.type,
  COLUMNS.pct,
  COLUMNS.pct,
  COLUMNS.pct,
  COLUMNS.pct,
  COLUMNS.tests,
  COLUMNS.status,
];
const separator = widths
  .map((width) => "-".repeat(width + 2))
  .join("+")
  .slice(1);
const rule = "=".repeat(separator.length);

console.log(`\n\x1b[1m\x1b[35m${rule}\x1b[0m`);
console.log(
  `\x1b[1m\x1b[32m🌟 TCG NEXUS — GLOBAL MONOREPO COVERAGE SUMMARY 🌟\x1b[0m`,
);
console.log(`\x1b[1m\x1b[35m${rule}\x1b[0m`);
console.log(
  `\x1b[1m${"Workspace / Service".padEnd(COLUMNS.name)} | ${"Category".padEnd(COLUMNS.type)} | ` +
    `${"Lines %".padStart(COLUMNS.pct)} | ${"Stmts %".padStart(COLUMNS.pct)} | ` +
    `${"Branch %".padStart(COLUMNS.pct)} | ${"Funcs %".padStart(COLUMNS.pct)} | ` +
    `${"Tests".padStart(COLUMNS.tests)} | ${"Status".padEnd(COLUMNS.status)}\x1b[0m`,
);
console.log(separator);

const weighted: Record<
  keyof Metrics,
  { covered: number; total: number; workspaces: number }
> = {
  lines: { covered: 0, total: 0, workspaces: 0 },
  statements: { covered: 0, total: 0, workspaces: 0 },
  branches: { covered: 0, total: 0, workspaces: 0 },
  functions: { covered: 0, total: 0, workspaces: 0 },
};

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;
let testsTotal = 0;

for (const service of results) {
  const metrics = service.collected?.metrics;
  const tests = service.collected?.tests ?? null;

  if (metrics) {
    for (const key of Object.keys(weighted) as (keyof Metrics)[]) {
      const value = metrics[key];
      if (value.covered !== null && value.total !== null && value.total > 0) {
        weighted[key].covered += value.covered;
        weighted[key].total += value.total;
        weighted[key].workspaces += 1;
      }
    }
  }

  if (tests) {
    testsPassed += tests.passed;
    testsFailed += tests.failed;
    testsSkipped += tests.skipped;
    testsTotal += tests.total;
  }

  const lines = metrics?.lines.pct ?? null;
  const lineColor =
    lines === null
      ? "\x1b[31m"
      : lines >= 80
        ? "\x1b[32m"
        : lines >= 60
          ? "\x1b[33m"
          : "\x1b[31m";
  const statusLabel =
    service.status === "PASS"
      ? "✔ PASS"
      : service.status === "WARN"
        ? "⚠ WARN"
        : "✖ FAIL";
  const statusColor =
    service.status === "PASS"
      ? "\x1b[32m"
      : service.status === "WARN"
        ? "\x1b[33m"
        : "\x1b[31m";

  console.log(
    `${service.name.padEnd(COLUMNS.name)} | ${service.type.padEnd(COLUMNS.type)} | ` +
      `${lineColor}${pctCell(metrics?.lines ?? NO_METRIC)}\x1b[0m | ` +
      `${pctCell(metrics?.statements ?? NO_METRIC)} | ${pctCell(metrics?.branches ?? NO_METRIC)} | ` +
      `${pctCell(metrics?.functions ?? NO_METRIC)} | ` +
      `${(tests ? `${tests.passed}/${tests.total}` : "n/a").padStart(COLUMNS.tests)} | ` +
      `${statusColor}${statusLabel.padEnd(COLUMNS.status)}\x1b[0m`,
  );
}

const totalCell = (key: keyof Metrics) => {
  const bucket = weighted[key];
  return bucket.total > 0
    ? metric((100 * bucket.covered) / bucket.total)
    : NO_METRIC;
};

const failures = results.filter((service) => service.status === "FAIL");

console.log(separator);
console.log(
  `\x1b[1m${"TOTAL (weighted)".padEnd(COLUMNS.name)} | ${"All Workspaces".padEnd(COLUMNS.type)} | ` +
    `${pctCell(totalCell("lines"))} | ${pctCell(totalCell("statements"))} | ` +
    `${pctCell(totalCell("branches"))} | ${pctCell(totalCell("functions"))} | ` +
    `${`${testsPassed}/${testsTotal}`.padStart(COLUMNS.tests)} | ` +
    `${failures.length === 0 ? "\x1b[32m✔ PASS" : "\x1b[31m✖ FAIL"}\x1b[0m`,
);
console.log(`\x1b[1m\x1b[35m${rule}\x1b[0m`);

console.log(
  `\x1b[90mTotals weighted by covered/total counters: ${weighted.lines.covered}/${weighted.lines.total} lines ` +
    `over ${weighted.lines.workspaces}/${results.length} workspaces. Statements are only reported by Jest and ` +
    `Vitest (${weighted.statements.workspaces} workspaces), branches by every runner except Python's trace ` +
    `(${weighted.branches.workspaces}).\x1b[0m`,
);
if (testsSkipped > 0) {
  console.log(`\x1b[33m${testsSkipped} test(s) skipped.\x1b[0m`);
}
for (const service of failures) {
  const reason = service.commandOk
    ? "no coverage report produced"
    : "test suite failed";
  console.log(`\x1b[31m✖ ${service.name}: ${reason}\x1b[0m`);
}
console.log();

process.exitCode = failures.length > 0 ? 1 : 0;
