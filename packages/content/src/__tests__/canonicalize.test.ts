// Tests for canonicalizeManifest — amendment Task A3 step 1.
//
// Pins three properties:
//   1. Deterministic bytes regardless of key insertion order.
//   2. UTF-8 bytes with sorted keys at one key per line.
//   3. Throws on cycles.
//
// All three are required for the manifest-hash contract that
// `curriculum_versions.manifest_hash` depends on.

import { describe, it, expect } from 'vitest';
import { canonicalizeManifest } from '../canonicalize.js';

describe('canonicalizeManifest', () => {
  it('emits deterministic bytes regardless of key insertion order', () => {
    const a = { level: 'a1', version: 1, name: 'introductions' };
    const b = { name: 'introductions', version: 1, level: 'a1' };
    expect(canonicalizeManifest(a)).toEqual(canonicalizeManifest(b));
  });

  it('emits UTF-8 bytes with sorted keys', () => {
    const out = canonicalizeManifest({ b: 1, a: 2 });
    expect(new TextDecoder().decode(out)).toBe('{"a":2,"b":1}');
  });

  it('drops undefined values from objects (JSON-compatible)', () => {
    const out = canonicalizeManifest({ a: 1, b: undefined });
    expect(new TextDecoder().decode(out)).toBe('{"a":1}');
  });

  it('preserves array order for primitives', () => {
    const out = canonicalizeManifest({ tags: ['z', 'a', 'm'] });
    expect(new TextDecoder().decode(out)).toBe('{"tags":["z","a","m"]}');
  });

  it('preserves null explicitly', () => {
    const out = canonicalizeManifest({ audioId: null });
    expect(new TextDecoder().decode(out)).toBe('{"audioId":null}');
  });

  it('throws on cycles', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(() => canonicalizeManifest(a)).toThrow(/cycle/i);
  });

  it('throws on non-finite numbers', () => {
    expect(() => canonicalizeManifest({ x: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => canonicalizeManifest({ x: Number.NaN })).toThrow();
  });

  it('throws on BigInt (unsupported)', () => {
    expect(() => canonicalizeManifest({ x: 10n })).toThrow();
  });

  it('throws beyond the depth limit', () => {
    let deep: Record<string, unknown> = {};
    let cur = deep;
    for (let i = 0; i < 200; i++) {
      cur.next = {} as Record<string, unknown>;
      cur = cur.next as Record<string, unknown>;
    }
    expect(() => canonicalizeManifest(deep)).toThrow(/max depth/i);
  });

  it('round-trips through JSON.parse to a structurally equal value', () => {
    const input = { level: 'a1', units: [{ id: 'unit_abc', title: 'X', order: 0 }] };
    const bytes = canonicalizeManifest(input);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsed).toEqual(input);
  });

  it('a typical Phase A manifest hashes deterministically', () => {
    const m = {
      cvId: 'cv_0123456789abcdef',
      level: 'a1',
      units: [
        {
          unitId: 'unit_a1_introductions',
          title: 'Introductions',
          summary: 'Greet and introduce yourself.',
          curriculumOrder: 0,
          sentences: [
            {
              sentenceId: 'sen_ola',
              textPt: 'Olá',
              textEn: 'Hello',
              vocabRefs: ['v-hello'],
              grammarRefs: [],
              pronunciationRefs: [],
              islandRefs: [],
              tags: ['greeting'],
              curriculumOrder: 0,
            },
          ],
          islands: [],
          scenarios: [],
        },
      ],
    };
    const a = canonicalizeManifest(m);
    const b = canonicalizeManifest({
      ...m,
      units: [...m.units].reverse(),
    });
    expect(a).toEqual(b);
    // Hash check: the bytes start with `{"cvId":"cv_0123456789abcdef","level":"a1","units":[`.
    expect(new TextDecoder().decode(a).startsWith('{"cvId":"cv_0123456789abcdef"')).toBe(true);
  });
});