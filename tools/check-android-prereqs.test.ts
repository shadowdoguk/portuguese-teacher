// Tests for tools/check-android-prereqs.ts.
//
// Per Phase A plan Task 1: the helper "lands now so the test exists."
// Phase C will exercise the real probes; this file pins the *shape* of the
// report (probe ids, statuses, host metadata) so the function is testable
// before any prereqs are installed in CI.

import { describe, it, expect } from 'vitest';
import { checkAndroidPrereqs } from './check-android-prereqs.js';

describe('checkAndroidPrereqs', () => {
  it('returns a probe set covering every Android build prereq', () => {
    const ids = checkAndroidPrereqs().map((c) => c.id).sort();
    expect(ids).toEqual([
      'adb',
      'android-sdk',
      'gradle',
      'java',
      'node',
      'pnpm',
    ]);
  });

  it('every probe has a non-empty label and a stable id', () => {
    for (const c of checkAndroidPrereqs()) {
      expect(c.id).toBeTypeOf('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.label).toBeTypeOf('string');
      expect(c.label.length).toBeGreaterThan(0);
      expect(['present', 'missing', 'wrong-version']).toContain(c.status);
    }
  });

  it('reports status for the live host', () => {
    // We do not assert presence — CI may run on any host. We only assert
    // that the function returns a well-formed report for whatever is here.
    const report = checkAndroidPrereqs();
    expect(report.length).toBeGreaterThan(0);
    for (const c of report) {
      if (c.status !== 'present') {
        expect(typeof c.hint === 'string' && c.hint.length > 0).toBe(true);
      }
    }
  });
});
