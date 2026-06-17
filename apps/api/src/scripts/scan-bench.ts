/**
 * Banc d'essai du pipeline de scan (workstream E).
 *
 * Rejoue le VRAI ScanService.recognize() sur un jeu de cartes étiqueté et
 * mesure précision / rappel / calibration de la confiance — sans réimplémenter
 * le matching (donc toujours en phase avec le code de prod).
 *
 * Prérequis : service vision up (port 8000) + DB accessible (.env), comme en dev.
 *
 * Usage :
 *   npm run bench:scan                 # dossier test-cards par défaut
 *   npm run bench:scan -- --dir=test-cards --labels=test-cards/labels.json
 *   npm run bench:scan -- --only=PXL_20260616_200242260.jpg   # une seule carte
 */

// scan logs hors-banc : on ne pollue pas scan-logs/ avec 80 entrées
process.env.SCAN_LOG = "false";

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { ScanRecognizeResponse } from "@repo/scan-contract";
import { ScanModule } from "../scan/scan.module";
import { ScanService } from "../scan/scan.service";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || "5432", 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [join(__dirname, "..", "**", "*.entity.{ts,js}")],
      synchronize: false,
      ssl: false,
    }),
    ScanModule,
  ],
})
class BenchModule {}

interface Label {
  name?: string;
  localId?: string;
  total?: string;
  category?: string;
  orientation?: number;
  files?: string[];
  notes?: string;
}
type Labels = Record<string, Label>;

interface BenchCase {
  key: string;
  files: string[];
  label?: Label;
}

const norm = (v?: string): string =>
  (v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

const sameNumber = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return norm(a) === norm(b);
};

const isImage = (f: string) => /\.(jpe?g|png)$/i.test(f);

const tsFromName = (file: string): number | null => {
  const m = basename(file).match(/_(\d{8})_(\d{2})(\d{2})(\d{2})(\d{3})/);
  if (!m) return null;
  const [, , hh, mm, ss, ms] = m;
  return ((Number(hh) * 60 + Number(mm)) * 60 + Number(ss)) * 1000 + Number(ms);
};

const GAP_MS = 4000;

const groupBursts = (dir: string, files: string[]): BenchCase[] => {
  const stamped = files
    .map((f) => ({ f, t: tsFromName(f) }))
    .sort((a, b) => (a.t ?? 0) - (b.t ?? 0));

  const cases: BenchCase[] = [];
  let current: string[] = [];
  let lastT: number | null = null;

  for (const { f, t } of stamped) {
    if (
      current.length &&
      (t === null || lastT === null || t - lastT > GAP_MS)
    ) {
      cases.push({ key: basename(current[0]), files: [...current] });
      current = [];
    }
    current.push(join(dir, f));
    lastT = t;
  }
  if (current.length)
    cases.push({ key: basename(current[0]), files: [...current] });
  return cases;
};

const buildCases = (dir: string, labels: Labels): BenchCase[] => {
  const cases: BenchCase[] = [];

  const topFiles = readdirSync(dir).filter(
    (f) => isImage(f) && existsSync(join(dir, f)),
  );
  for (const f of topFiles) {
    cases.push({ key: f, files: [join(dir, f)] });
  }

  const rafaleDir = join(dir, "rafale");
  if (existsSync(rafaleDir)) {
    const rf = readdirSync(rafaleDir).filter(isImage);
    cases.push(...groupBursts(rafaleDir, rf));
  }

  for (const c of cases) {
    const label = labels[c.key];
    if (label) {
      c.label = label;
      if (label.files?.length) {
        c.files = label.files.map((f) => resolve(dir, f));
      }
    }
  }
  return cases.sort((a, b) => a.key.localeCompare(b.key));
};

type Outcome =
  | "correct" // bonne carte en tête
  | "wrong" // candidats trouvés mais tête fausse
  | "recoverable" // bonne carte présente dans les candidats mais pas en tête
  | "no-candidate" // aucun candidat
  | "unlabeled"; // pas de ground truth

interface CaseResult {
  key: string;
  category: string;
  outcome: Outcome;
  expected: { name?: string; number?: string };
  got: { name?: string; localId?: string } | null;
  confidence: number;
  level: string;
  nbCandidates: number;
  rankOfCorrect: number;
  carteLue?: string;
  numberRead?: string;
  ms: number;
  engine: string;
}

const matchesLabel = (
  cand: { name?: string; localId?: string },
  label: Label,
): boolean => {
  const nameOk = label.name
    ? norm(cand.name) === norm(label.name) ||
      norm(cand.name).includes(norm(label.name)) ||
      norm(label.name).includes(norm(cand.name))
    : true;
  const numberOk = label.localId
    ? sameNumber(cand.localId, label.localId)
    : true;
  return label.localId ? numberOk && nameOk : nameOk;
};

const evaluate = (
  c: BenchCase,
  res: ScanRecognizeResponse,
  ms: number,
): CaseResult => {
  const best = res.bestCard;
  const candidates = res.candidates ?? [];
  const numberRead = res.parsed?.setNumber
    ? `${res.parsed.setNumber}/${res.parsed.setTotal ?? "?"}`
    : "";

  const common = {
    key: c.key,
    category: c.label?.category ?? "?",
    expected: { name: c.label?.name, number: c.label?.localId },
    got: best ? { name: best.name, localId: best.localId } : null,
    confidence: res.confidence,
    level: res.confidenceLevel,
    nbCandidates: candidates.length,
    carteLue: res.parsed?.cardName,
    numberRead,
    ms,
    engine: res.engine,
  };

  if (!c.label) {
    return { ...common, outcome: "unlabeled", rankOfCorrect: -1 };
  }

  const rank = candidates.findIndex((cand) => matchesLabel(cand, c.label!));

  let outcome: Outcome;
  if (rank === 0) outcome = "correct";
  else if (rank > 0) outcome = "recoverable";
  else if (candidates.length === 0) outcome = "no-candidate";
  else outcome = "wrong";

  return { ...common, outcome, rankOfCorrect: rank };
};

const pct = (n: number, d: number) =>
  d ? `${((100 * n) / d).toFixed(1)}%` : "—";

const printReport = (results: CaseResult[]) => {
  const labeled = results.filter((r) => r.outcome !== "unlabeled");
  const n = labeled.length;
  const by = (o: Outcome) => labeled.filter((r) => r.outcome === o).length;

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  BANC D'ESSAI SCAN — RÉSULTATS");
  console.log("══════════════════════════════════════════════════════");
  console.log(`Cas étiquetés      : ${n} (sur ${results.length} scannés)`);
  console.log(
    `✅ Corrects (top-1): ${by("correct")}  (${pct(by("correct"), n)})`,
  );
  console.log(
    `🟡 Récupérables    : ${by("recoverable")}  (bonne carte présente mais pas en tête)`,
  );
  console.log(`❌ Mauvais (top-1) : ${by("wrong")}`);
  console.log(`⬛ Aucun candidat  : ${by("no-candidate")}`);
  const top1 = by("correct");
  const recall = by("correct") + by("recoverable");
  console.log(
    `\nAccuracy top-1     : ${pct(top1, n)}    Rappel (carte présente) : ${pct(recall, n)}`,
  );

  console.log("\n── Calibration de la confiance ──");
  for (const lvl of ["high", "medium", "low"]) {
    const g = labeled.filter((r) => r.level === lvl);
    const ok = g.filter((r) => r.outcome === "correct").length;
    console.log(
      `  ${lvl.padEnd(7)} : ${String(g.length).padStart(3)} cas | ${pct(ok, g.length).padStart(6)} corrects` +
        (g.length
          ? ` | conf. moy ${(g.reduce((s, r) => s + r.confidence, 0) / g.length).toFixed(2)}`
          : ""),
    );
  }
  const confWrong = labeled.filter(
    (r) => r.level === "high" && r.outcome !== "correct",
  );
  if (confWrong.length) {
    console.log(`  ⚠️  ${confWrong.length} "high" FAUX (confident-wrong) :`);
    for (const r of confWrong)
      console.log(
        `       ${r.key} → a sorti "${r.got?.name}" (attendu "${r.expected.name}")`,
      );
  }

  console.log("\n── Par catégorie ──");
  const cats = [...new Set(labeled.map((r) => r.category))].sort();
  for (const cat of cats) {
    const g = labeled.filter((r) => r.category === cat);
    const ok = g.filter((r) => r.outcome === "correct").length;
    console.log(
      `  ${cat.padEnd(10)} : ${pct(ok, g.length).padStart(6)} (${ok}/${g.length})`,
    );
  }

  const numberRead = labeled.filter((r) => r.numberRead).length;
  console.log(
    `\n── Diagnostic OCR ──\n  Numéro lu          : ${numberRead}/${n}  (${pct(numberRead, n)})  ← levier clé`,
  );

  const fails = labeled.filter(
    (r) => r.outcome === "wrong" || r.outcome === "no-candidate",
  );
  if (fails.length) {
    console.log("\n── Échecs (détail) ──");
    for (const r of fails) {
      console.log(
        `  [${r.outcome}] ${r.key} (${r.category})\n` +
          `      attendu: "${r.expected.name}" ${r.expected.number ?? ""}\n` +
          `      lu     : nom="${r.carteLue ?? ""}" num="${r.numberRead ?? ""}" → "${r.got?.name ?? "∅"}" (conf ${r.confidence}, ${r.level})`,
      );
    }
  }

  console.log("\n══════════════════════════════════════════════════════\n");
};

const parseArgs = () => {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const [k, v] = a.replace(/^--/, "").split("=");
        return [k, v ?? "true"];
      }),
  );
  return args as Record<string, string>;
};

async function main() {
  const args = parseArgs();
  const dir = resolve(args.dir ?? "test-cards");
  const labelsPath = resolve(args.labels ?? join(dir, "labels.json"));
  const outPath = resolve(args.out ?? join(dir, "bench-results.json"));

  const labels: Labels = existsSync(labelsPath)
    ? JSON.parse(readFileSync(labelsPath, "utf8"))
    : {};
  if (!existsSync(labelsPath))
    console.log(`⚠️  Pas de labels (${labelsPath}) : tout sera "unlabeled".`);

  let cases = buildCases(dir, labels);
  if (args.only) cases = cases.filter((c) => c.key === args.only);
  if (args.labeledOnly) cases = cases.filter((c) => c.label);

  console.log(`Boot NestJS (DB + vision)…`);
  const app = await NestFactory.createApplicationContext(BenchModule, {
    logger: ["error", "warn"],
  });
  const scan = app.get(ScanService);

  console.log(`Scan de ${cases.length} cas…\n`);
  const results: CaseResult[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const buffers = c.files.map((f) => readFileSync(f));
    const t0 = Date.now();
    try {
      const res = await scan.recognize(buffers);
      const r = evaluate(c, res, Date.now() - t0);
      results.push(r);
      const tag =
        r.outcome === "correct"
          ? "✅"
          : r.outcome === "recoverable"
            ? "🟡"
            : r.outcome === "unlabeled"
              ? "··"
              : "❌";
      console.log(
        `${tag} [${String(i + 1).padStart(3)}/${cases.length}] ${c.key.padEnd(34)} ${r.level.padEnd(6)} ${String(r.confidence).padStart(5)} → ${r.got?.name ?? "∅"}`,
      );
    } catch (e) {
      console.log(
        `💥 [${i + 1}/${cases.length}] ${c.key} : ${(e as Error).message}`,
      );
    }
  }

  printReport(results);
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Détail JSON → ${outPath}`);

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
