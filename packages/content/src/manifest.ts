// Source manifest — the input shape for the compile pipeline.
//
// A manifest is a typed declaration of every curriculum version's
// contents: levels, units, sentences, islands, scenarios. The
// compiler turns it into rows for the `@pt/api` Drizzle schema and
// applies them transactionally via `applyPublish`.
//
// The manifest uses the canonical `@pt/contracts` schemas wherever
// possible; ids are typed as regex-validated strings. Unit /
// sentence / scenario orders come from `curriculumOrder`.

import { z } from 'zod';
import { cvIdSchema, levelSchema, scenarioIdSchema, sentenceIdSchema, unitIdSchema } from '@pt/contracts';

export const manifestSourceSchema = z.object({
  cvId: cvIdSchema,
  level: levelSchema,
  units: z.array(
    z.object({
      unitId: unitIdSchema,
      title: z.string().min(1),
      summary: z.string().default(''),
      curriculumOrder: z.number().int().nonnegative(),
      sentences: z.array(
        z.object({
          sentenceId: sentenceIdSchema,
          textPt: z.string().min(1),
          textEn: z.string().min(1),
          vocabRefs: z.array(z.string()).default([]),
          grammarRefs: z.array(z.string()).default([]),
          pronunciationRefs: z.array(z.string()).default([]),
          islandRefs: z.array(z.string()).default([]),
          tags: z.array(z.string()).default([]),
          curriculumOrder: z.number().int().nonnegative(),
        }),
      ),
      islands: z.array(
        z.object({
          islandId: z.string().regex(/^isl_[a-z0-9][a-z0-9_]*$/),
          title: z.string().min(1),
          sentenceIds: z.array(sentenceIdSchema),
        }),
      ),
      scenarios: z.array(
        z.object({
          scenarioId: scenarioIdSchema,
          title: z.string().min(1),
          setting: z.string().min(1),
          roles: z.array(z.string().min(1)).min(1),
          learnerObjective: z.string().min(1),
          expectedVocabularyRefs: z.array(z.string()).default([]),
          expectedGrammarRefs: z.array(z.string()).default([]),
          openingMessage: z.string().min(1),
          completionConditions: z.array(z.string().min(1)).min(1),
          correctionPolicy: z.string().default(''),
          feedbackRubric: z.array(z.string().min(1)).default([]),
        }),
      ),
    }),
  ),
});

export type ManifestSource = z.infer<typeof manifestSourceSchema>;

export function parseManifest(input: unknown): ManifestSource {
  return manifestSourceSchema.parse(input);
}