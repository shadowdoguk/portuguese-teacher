#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const progressPath = resolve(repoRoot, "PROGRESS.md");
const staleAfterDays = Number(process.env.PROGRESS_STALE_AFTER_DAYS ?? "14");

function readProgress() {
  return readFileSync(progressPath, "utf-8");
}

function fetchIssues() {
  const json = execFileSync(
    "gh",
    [
      "issue",
      "list",
      "--repo",
      "shadowdoguk/portuguese-teacher",
      "--state",
      "all",
      "--limit",
      "200",
      "--json",
      "number,state,title",
    ],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return JSON.parse(json);
}

function extractIssueMentions(text) {
  const matches = text.matchAll(/#(\d+)\b/g);
  const set = new Set();
  for (const m of matches) {
    const n = Number(m[1]);
    if (Number.isInteger(n)) set.add(n);
  }
  return set;
}

function extractLastUpdated(text) {
  const m = text.match(/\*\*Last updated:\*\*\s+(\d{4}-\d{2}-\d{2})/);
  return m ? new Date(`${m[1]}T00:00:00Z`) : null;
}

function diff(openIssues, mentioned, allKnownNumbers) {
  const openNumbers = openIssues.map((i) => i.number);
  const knownSet = new Set(allKnownNumbers);
  const missingFromProgress = openNumbers.filter((n) => !mentioned.has(n));
  const onlyInProgress = [...mentioned]
    .filter((n) => !openNumbers.includes(n))
    .filter((n) => knownSet.has(n));
  return { missingFromProgress, onlyInProgress };
}

function checkLastUpdated(text) {
  const updated = extractLastUpdated(text);
  if (!updated) {
    return { ok: false, reason: "no `**Last updated:** YYYY-MM-DD` line found in PROGRESS.md" };
  }
  const ageDays = Math.floor((Date.now() - updated.getTime()) / 86_400_000);
  if (ageDays > staleAfterDays) {
    return {
      ok: false,
      reason: `Last updated ${ageDays} days ago (stale threshold: ${staleAfterDays})`,
    };
  }
  return { ok: true, ageDays };
}

function main() {
  let exitCode = 0;
  const progress = readProgress();
  const mentioned = extractIssueMentions(progress);
  const issues = fetchIssues();
  const open = issues.filter((i) => i.state === "OPEN");
  const closed = issues.filter((i) => i.state === "CLOSED");
  const allKnownNumbers = issues.map((i) => i.number);

  const { missingFromProgress, onlyInProgress } = diff(open, mentioned, allKnownNumbers);

  if (missingFromProgress.length > 0) {
    console.error(
      `[progress-check] FAIL: ${missingFromProgress.length} open issue(s) not mentioned in PROGRESS.md: #${missingFromProgress.join(", #")}`,
    );
    for (const n of missingFromProgress) {
      const issue = open.find((i) => i.number === n);
      if (issue) console.error(`  #${n} [${issue.state}] ${issue.title}`);
    }
    exitCode = 1;
  } else {
    console.log(`[progress-check] OK: all ${open.length} open issue(s) are mentioned in PROGRESS.md.`);
  }

  if (onlyInProgress.length > 0) {
    console.warn(
      `[progress-check] WARN: PROGRESS.md references ${onlyInProgress.length} closed/unknown issue(s) in the active sections: #${onlyInProgress.join(", #")}. (Likely benign — PR numbers, recently-completed refs.)`,
    );
  }

  const lastUpdatedCheck = checkLastUpdated(progress);
  if (!lastUpdatedCheck.ok) {
    console.error(`[progress-check] FAIL: PROGRESS.md is stale — ${lastUpdatedCheck.reason}.`);
    exitCode = 1;
  } else {
    console.log(
      `[progress-check] OK: PROGRESS.md last updated ${lastUpdatedCheck.ageDays} day(s) ago.`,
    );
  }

  console.log(
    `[progress-check] summary: ${open.length} open, ${closed.length} closed, ${mentioned.size} unique issues referenced in PROGRESS.md.`,
  );

  process.exit(exitCode);
}

main();
