import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe("Affective Filter privacy — no surface in Learner UI", () => {
  const appDir = path.resolve(process.cwd(), "src/app/(app)");
  const files = walk(appDir).filter((f) => /\.(ts|tsx)$/.test(f));

  it("only documents the proxy in privacy copy; never calls the scoring or directive builders", () => {
    const offenders: { file: string; line: number; text: string }[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//")) return;
        if (/\baffectiveFilterScore\s*\(/.test(line) && !file.endsWith("confidence/page.tsx")) {
          offenders.push({ file, line: idx + 1, text: line.trim() });
        }
        if (/\bbuildAffectiveDirective\s*\(/.test(line)) {
          offenders.push({ file, line: idx + 1, text: line.trim() });
        }
        if (/\bpickAnchorVariant\s*\(/.test(line)) {
          offenders.push({ file, line: idx + 1, text: line.trim() });
        }
        if (/\buseScoreSnapshot\s*\(/.test(line)) {
          offenders.push({ file, line: idx + 1, text: line.trim() });
        }
      });
    }
    if (offenders.length > 0) {
      const list = offenders
        .map((o) => `${path.relative(process.cwd(), o.file)}:${o.line}\n    ${o.text}`)
        .join("\n");
      throw new Error(
        `Affective Filter API called from Learner-facing surface:\n${list}\n` +
          "The proxy must stay internal per ADR-0001.",
      );
    }
  });

  it("never renders an affectiveFilterScore value in JSX", () => {
    const offenders: { file: string; line: number; text: string }[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      text.split(/\r?\n/).forEach((line, idx) => {
        if (/\{.*score\s*\?\s*`.*\d+%`/.test(line) || /\{affectiveFilter/i.test(line)) {
          offenders.push({ file, line: idx + 1, text: line.trim() });
        }
      });
    }
    if (offenders.length > 0) {
      const list = offenders
        .map((o) => `${path.relative(process.cwd(), o.file)}:${o.line}\n    ${o.text}`)
        .join("\n");
      throw new Error(`Affective score leaked into JSX:\n${list}`);
    }
  });
});

describe("ConfidenceCheckin opt-in gating", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("does not import confidence check-in UI in dashboard", async () => {
    const dashboardPath = path.resolve(process.cwd(), "src/app/(app)/dashboard/page.tsx");
    const text = readFileSync(dashboardPath, "utf8");
    expect(text).not.toMatch(/ConfidenceCheckin/);
  });

  it("does not import the affective score API in progress", async () => {
    const progressPath = path.resolve(process.cwd(), "src/app/(app)/progress/page.tsx");
    const text = readFileSync(progressPath, "utf8");
    expect(text).not.toMatch(/affectiveFilterScore|buildAffectiveDirective/);
  });
});
