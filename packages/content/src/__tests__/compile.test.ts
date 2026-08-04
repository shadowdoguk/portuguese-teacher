// Tests for compileManifest — amendment Task A3 step 3.
//
// Pins:
//   1. compileManifest returns a CompileResult whose cv matches the
//      manifest shape (cvId, level, units, sentences, scenarios).
//   2. cv_sentence_versions projection is populated per (cv, sentence).
//   3. Two compiles of structurally-equal manifests produce equal
//      manifestHash values (idempotency: re-running compile with the
//      same logical manifest yields the same hash, so applyPublish's
//      noop branch fires).
//   4. compileManifest is order-stable across re-ordered unit /
//      sentence arrays *only* up to the canonicalize contract — it
//      passes whatever order through, and canonicalize handles
//      determinism. We verify that compile does not silently drop
//      units/sentences.

import { describe, it, expect } from 'vitest';
import { compileManifest, type CompileResult } from '../compile.js';
import { parseManifest, type ManifestSource } from '../manifest.js';

const fixture: ManifestSource = {
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
        {
          sentenceId: 'sen_bom_dia',
          textPt: 'Bom dia',
          textEn: 'Good morning',
          vocabRefs: ['v-bom-dia'],
          grammarRefs: [],
          pronunciationRefs: [],
          islandRefs: [],
          tags: ['greeting'],
          curriculumOrder: 1,
        },
      ],
      islands: [],
      scenarios: [],
    },
  ],
};

describe('compileManifest', () => {
  it('returns a CompileResult with cv matching the manifest shape', () => {
    const out: CompileResult = compileManifest(fixture);
    expect(out.cv.id).toBe('cv_0123456789abcdef');
    expect(out.cv.active).toBe(1);
    expect(out.cv.publishedAt).toBeNull();
    expect(out.cv.manifestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(out.cv.units).toHaveLength(1);
    expect(out.cv.units[0]?.unitId).toBe('unit_a1_introductions');
    expect(out.cv.units[0]?.sentences).toHaveLength(2);
  });

  it('populates cv_sentence_versions projection per (cv, sentence)', () => {
    const out = compileManifest(fixture);
    expect(out.cvSentenceVersions).toHaveLength(2);
    expect(out.cvSentenceVersions[0]).toEqual({
      cvId: 'cv_0123456789abcdef',
      sentenceId: 'sen_ola',
      textPt: 'Olá',
      textEn: 'Hello',
      audioId: null,
      textReviewedAt: null,
      audioReviewedAt: null,
    });
    // Every row carries the same cvId.
    for (const row of out.cvSentenceVersions) {
      expect(row.cvId).toBe('cv_0123456789abcdef');
    }
  });

  it('scenarios are forwarded to cv.scenarios, with empty defaults', () => {
    const out = compileManifest(fixture);
    expect(out.cv.scenarios).toEqual([]);
  });

  it('idempotency: same logical manifest produces same manifestHash', () => {
    // Note: the fixture is the same JS object, so canonicalizeManifest
    // yields the same bytes trivially. To exercise the determinism
    // contract we make a copy with shuffled key insertion order at
    // the source level — TypeScript object literals already do this
    // implicitly when the same source is parsed twice, but here we
    // re-construct from JSON to be explicit.
    const a = compileManifest(parseManifest(fixture));
    const roundTripped = parseManifest(JSON.parse(JSON.stringify(fixture)));
    const b = compileManifest(roundTripped);
    expect(a.cv.manifestHash).toBe(b.cv.manifestHash);
  });

  it('idempotency: same source object compiled twice yields same hash', () => {
    const a = compileManifest(fixture);
    const b = compileManifest(fixture);
    expect(a.cv.manifestHash).toBe(b.cv.manifestHash);
  });

  it('different sentence texts produce different hashes (collision-resistance sanity check)', () => {
    const a = compileManifest(fixture);
    const tampered: ManifestSource = {
      ...fixture,
      units: [
        {
          ...fixture.units[0]!,
          sentences: [
            {
              ...fixture.units[0]!.sentences[0]!,
              textPt: 'Olá, tudo bem?', // differ by one comma
            },
            ...fixture.units[0]!.sentences.slice(1),
          ],
        },
      ],
    };
    const b = compileManifest(tampered);
    expect(a.cv.manifestHash).not.toBe(b.cv.manifestHash);
  });

  it('does not silently drop units / sentences / scenarios', () => {
    const out = compileManifest(fixture);
    expect(out.cv.units).toHaveLength(fixture.units.length);
    for (let i = 0; i < fixture.units.length; i++) {
      const u = fixture.units[i]!;
      const cu = out.cv.units[i]!;
      expect(cu.sentences).toHaveLength(u.sentences.length);
    }
    // cv_sentence_versions count equals total sentence count.
    const totalSentences = fixture.units.reduce((acc, u) => acc + u.sentences.length, 0);
    expect(out.cvSentenceVersions).toHaveLength(totalSentences);
  });

  it('islands land on the compiled unit with curriculumOrder derived from array index', () => {
    const withIslands: ManifestSource = {
      ...fixture,
      units: [
        {
          ...fixture.units[0]!,
          islands: [
            {
              islandId: 'isl_a1_intro_dial_a',
              title: 'Café in Lisbon',
              sentenceIds: ['sen_ola', 'sen_bom_dia'],
            },
          ],
        },
      ],
    };
    const out = compileManifest(withIslands);
    expect(out.cv.units[0]?.islands).toHaveLength(1);
    expect(out.cv.units[0]?.islands[0]?.curriculumOrder).toBe(0);
    expect(out.cv.units[0]?.islands[0]?.sentenceIds).toEqual(['sen_ola', 'sen_bom_dia']);
  });
});