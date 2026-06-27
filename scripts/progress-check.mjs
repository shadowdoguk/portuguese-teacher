#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const progressPath = path.join(repoRoot, "PROGRESS.md");
const staleAfterDays = Number(process.env.PROGRESS_STALE_AFTER_DAYS ?? "14");

function fail(msg) {
  console.error(`progress-check: ${msg}`);
  process.exit(1);
}

if (!existsSync(progressPath)) {
  console.log("progress-check: PROGRESS.md not present on this branch — skipping drift check.");
  process.exit(0);
}

const content = readFileSync(progressPath, "utf8");
const updatedMatch = content.match(/\*\*Last updated:\*\*\s*(\d{4}-\d{2}-\d{2})/);
if (!updatedMatch) {
  fail("PROGRESS.md has no `**Last updated:** YYYY-MM-DD` line.");
}
const lastUpdated = new Date(`${updatedMatch[1]}T00:00:00Z`);
const now = new Date();
const ageDays = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
if (Number.isNaN(ageDays)) {
  fail(`Could not parse Last updated date: ${updatedMatch[1]}`);
}
if (ageDays > staleAfterDays) {
  fail(
    `PROGRESS.md last updated ${updatedMatch[1]} is ${Math.floor(ageDays)} days old ` +
      `(threshold: ${staleAfterDays}). Bump the date or override with PROGRESS_STALE_AFTER_DAYS=N.`,
  );
}

const token = process.env.GH_TOKEN;
if (!token) {
  console.log(
    "progress-check: GH_TOKEN not set — skipping issue-queue drift check. " +
      "Set GH_TOKEN to enable.",
  );
  process.exit(0);
}

const repo = process.env.GITHUB_REPOSITORY ?? "shadowdoguk/portuguese-teacher";
const api = `https://api.github.com/repos/${repo}/issues?state=open&per_page=100`;

const res = await fetch(api, {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  },
});
if (!res.ok) {
  fail(`GitHub API returned ${res.status} ${res.statusText}`);
}
const issues = await res.json();
const open = issues.filter((i) => !i.pull_request);

const knownPatterns = [
  /^\s*-\s+\*\*#(\d+)\*\*\s+/gm,
];

const seen = new Set();
for (const pattern of knownPatterns) {
  let m;
  while ((m = pattern.exec(content)) !== null) {
    seen.add(Number(m[1]));
  }
}

const missing = open.filter((i) => !seen.has(i.number));
if (missing.length > 0) {
  const list = missing.map((i) => `#${i.number} ${i.title}`).join("\n  - ");
  fail(
    `Open issues missing from PROGRESS.md:\n  - ${list}\n` +
      "Add them under the appropriate section or file an update.",
  );
}

console.log(
  `progress-check: PROGRESS.md is ${Math.floor(ageDays)} day(s) old and references all ${open.length} open issue(s).`,
);
