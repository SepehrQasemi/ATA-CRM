import fs from "node:fs";
import path from "node:path";

const coverageSummaryPath = path.resolve(process.cwd(), "coverage", "coverage-summary.json");

if (!fs.existsSync(coverageSummaryPath)) {
  console.error("Coverage summary not found. Run coverage first.");
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, "utf8"));

const globalThresholds = {
  lines: 80,
  functions: 80,
  branches: 70,
};

const criticalFiles = [
  "lib/auth.ts",
  "app/api/tasks/route.ts",
  "app/api/leads/[id]/route.ts",
];

let hasError = false;

function checkMetric(label, actual, expected) {
  if (actual < expected) {
    console.error(`[coverage] ${label} is ${actual.toFixed(2)}%, expected >= ${expected}%`);
    hasError = true;
  }
}

checkMetric("global lines", summary.total.lines.pct, globalThresholds.lines);
checkMetric("global functions", summary.total.functions.pct, globalThresholds.functions);
checkMetric("global branches", summary.total.branches.pct, globalThresholds.branches);

for (const file of criticalFiles) {
  const key = Object.keys(summary).find((item) => item.replace(/\\/g, "/").endsWith(file));
  if (!key) {
    continue;
  }
  checkMetric(`critical lines ${file}`, summary[key].lines.pct, 90);
}

if (hasError) {
  process.exit(1);
}

console.log("[coverage] thresholds passed.");
