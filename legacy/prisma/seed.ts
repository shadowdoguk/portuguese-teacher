// Seeds the Prisma database from the canonical in-memory curriculum
// fixtures (src/lib/curriculum/seed-a{0,1,2,b1}.ts).
//
// Idempotent: every row is upserted on its natural ID so re-running the
// script is safe and produces the same state.
//
// Usage:
//   pnpm seed          # seeds everything that the four level curricula declare
//   pnpm seed:a0       # explicit alias (Level A0)
//
// References:
//   - src/lib/curriculum/seed-a0.ts (A0 source of truth)
//   - src/lib/curriculum/seed-a1.ts (A1 source of truth)
//   - src/lib/curriculum/seed-a2.ts (A2 source of truth)
//   - src/lib/curriculum/seed-b1.ts (B1 source of truth)
//   - prisma/schema.prisma (target)
//   - docs/adr/0003-v1-scope-amendment.md (v1 is pt-PT only)

import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { A0_CURRICULUM } from "../src/lib/curriculum/seed-a0";
import { A1_CURRICULUM } from "../src/lib/curriculum/seed-a1";
import { A2_CURRICULUM } from "../src/lib/curriculum/seed-a2";
import { B1_CURRICULUM } from "../src/lib/curriculum/seed-b1";
import type { Curriculum } from "../src/lib/curriculum/types";

const prisma = new PrismaClient();

const CURRICULUM_ID = "pt-PT-v1";

const ALL_CURRICULA: ReadonlyArray<Curriculum> = [
  A0_CURRICULUM,
  A1_CURRICULUM,
  A2_CURRICULUM,
  B1_CURRICULUM,
];

function ensureMigrationsApplied(): void {
  // `migrate status` exits non-zero when there are pending migrations.
  // We surface that as a hard failure (issue #23 acceptance).
  try {
    execSync("pnpm exec prisma migrate status", { stdio: "pipe" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(
      "prisma migrate status failed. Apply pending migrations with `pnpm prisma:migrate` before seeding.\n" +
        msg,
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const start = Date.now();
  ensureMigrationsApplied();

  for (const curriculum of ALL_CURRICULA) {
    if (curriculum.dialect !== "pt-PT") {
      throw new Error(
        `Refusing to seed non-pt-PT curriculum (v1 is pt-PT only): ${curriculum.dialect}`,
      );
    }
  }

  // The A0 curriculum owns the dialect + entryUnitId of the singleton
  // curriculum row; subsequent curricula contribute Units only.
  const primary = A0_CURRICULUM;
  await prisma.curriculum.upsert({
    where: { id: CURRICULUM_ID },
    update: { dialect: primary.dialect, entryUnitId: primary.entryUnitId },
    create: {
      id: CURRICULUM_ID,
      dialect: primary.dialect,
      entryUnitId: primary.entryUnitId,
    },
  });

  // Merge all four curricula — every Unit lands in the DB.
  const allUnits = ALL_CURRICULA.flatMap((c) => c.units);

  // Levels — declared as A0/A1/A2/B1 in CONTEXT.md. We seed the four rows;
  // A1/A2/B1 will gain Units as #24 / later issues land.
  const levelOrders: Array<{ id: string; order: number; label: string }> = [
    { id: "A0", order: 0, label: "Absolute beginner" },
    { id: "A1", order: 1, label: "Beginner" },
    { id: "A2", order: 2, label: "Elementary" },
    { id: "B1", order: 3, label: "Intermediate" },
  ];
  for (const level of levelOrders) {
    await prisma.level.upsert({
      where: { id: level.id },
      update: { order: level.order, label: level.label, curriculumId: CURRICULUM_ID },
      create: { ...level, curriculumId: CURRICULUM_ID },
    });
  }

  // Units (merged across all four levels — A0/A1/A2/B1)
  for (const unit of allUnits) {
    await prisma.unit.upsert({
      where: { id: unit.id },
      update: {
        curriculumId: CURRICULUM_ID,
        levelId: unit.level,
        order: unit.order,
        title: unit.title,
        description: unit.description,
        prerequisiteUnitIdsJson: JSON.stringify(unit.prerequisiteUnitIds),
      },
      create: {
        id: unit.id,
        curriculumId: CURRICULUM_ID,
        levelId: unit.level,
        order: unit.order,
        title: unit.title,
        description: unit.description,
        prerequisiteUnitIdsJson: JSON.stringify(unit.prerequisiteUnitIds),
      },
    });

    // Lessons
    for (const lesson of unit.lessons) {
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: {
          unitId: unit.id,
          order: lesson.order,
          kind: lesson.kind,
          title: lesson.title,
          estimatedMinutes: lesson.estimatedMinutes,
        },
        create: {
          id: lesson.id,
          unitId: unit.id,
          order: lesson.order,
          kind: lesson.kind,
          title: lesson.title,
          estimatedMinutes: lesson.estimatedMinutes,
        },
      });

      await prisma.lessonBody.upsert({
        where: { lessonId: lesson.id },
        update: {
          introduction: lesson.body.introduction,
          blocksJson: JSON.stringify(lesson.body.blocks),
        },
        create: {
          lessonId: lesson.id,
          introduction: lesson.body.introduction,
          blocksJson: JSON.stringify(lesson.body.blocks),
        },
      });

      // Practice Exercises — wipe and re-insert to keep the natural IDs
      // authoritative (they're keyed on a stable id like "a0-1-l1-e1").
      await prisma.practiceExercise.deleteMany({ where: { lessonId: lesson.id } });
      for (const ex of lesson.exercises) {
        await prisma.practiceExercise.create({
          data: {
            id: ex.id,
            lessonId: lesson.id,
            kind: ex.kind,
            prompt: ex.prompt,
            expectedAnswer: ex.expectedAnswer ?? null,
            difficulty: ex.difficulty,
            vocabularyRefsJson: JSON.stringify(ex.vocabularyRefs),
            grammarRefsJson: JSON.stringify(ex.grammarRefs),
          },
        });
      }
    }

    // Vocabulary
    for (const v of unit.vocabulary) {
      await prisma.vocabularyItem.upsert({
        where: { id: v.id },
        update: {
          unitId: unit.id,
          pt: v.pt,
          gloss: v.gloss,
          partOfSpeech: v.partOfSpeech ?? null,
          audioAssetId: v.audioAssetId ?? null,
          imageAssetId: v.imageAssetId ?? null,
          examplePt: v.examplePt ?? null,
          exampleGloss: v.exampleGloss ?? null,
        },
        create: {
          id: v.id,
          unitId: unit.id,
          pt: v.pt,
          gloss: v.gloss,
          partOfSpeech: v.partOfSpeech ?? null,
          audioAssetId: v.audioAssetId ?? null,
          imageAssetId: v.imageAssetId ?? null,
          examplePt: v.examplePt ?? null,
          exampleGloss: v.exampleGloss ?? null,
        },
      });
    }

    // Grammar patterns
    for (const g of unit.grammar) {
      await prisma.grammarPattern.upsert({
        where: { id: g.id },
        update: {
          unitId: unit.id,
          name: g.name,
          description: g.description,
          examplesJson: JSON.stringify(g.examples),
        },
        create: {
          id: g.id,
          unitId: unit.id,
          name: g.name,
          description: g.description,
          examplesJson: JSON.stringify(g.examples),
        },
      });
    }

    // Scenarios
    for (const s of unit.scenarios) {
      await prisma.scenario.upsert({
        where: { id: s.id },
        update: {
          unitId: unit.id,
          category: s.category,
          targetLevel: s.targetLevel,
          goal: s.goal,
          setting: s.setting,
          learnerRole: s.roles.learner,
          teacherRole: s.roles.teacher,
          preTask: s.preTask,
          expectedTurns: s.expectedTurns,
          vocabularyRefsJson: JSON.stringify(s.vocabularyRefs),
          grammarRefsJson: JSON.stringify(s.grammarRefs),
          remedialAnchorRefsJson: JSON.stringify(s.remedialAnchorRefs),
          successCriteriaJson: JSON.stringify(s.successCriteria),
          passingScore: s.passingScore,
        },
        create: {
          id: s.id,
          unitId: unit.id,
          category: s.category,
          targetLevel: s.targetLevel,
          goal: s.goal,
          setting: s.setting,
          learnerRole: s.roles.learner,
          teacherRole: s.roles.teacher,
          preTask: s.preTask,
          expectedTurns: s.expectedTurns,
          vocabularyRefsJson: JSON.stringify(s.vocabularyRefs),
          grammarRefsJson: JSON.stringify(s.grammarRefs),
          remedialAnchorRefsJson: JSON.stringify(s.remedialAnchorRefs),
          successCriteriaJson: JSON.stringify(s.successCriteria),
          passingScore: s.passingScore,
        },
      });
    }

    // Remedial anchors
    await prisma.remedialAnchor.deleteMany({
      where: { OR: [{ fromUnitId: unit.id }, { toUnitId: unit.id }] },
    });
    for (const a of unit.remedialAnchors) {
      await prisma.remedialAnchor.create({
        data: {
          fromUnitId: a.fromUnitId,
          toUnitId: a.toUnitId,
          reason: a.reason,
          gapArea: a.gapArea,
          weight: a.weight,
          note: a.note,
          createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
        },
      });
    }
  }

  // Milestones — A0 owns the milestone set (the A0 → A1 boundary);
  // A1/A2/B1 milestones can land in a follow-up issue.
  await prisma.milestone.deleteMany({});
  for (const m of primary.milestones) {
    await prisma.milestone.create({
      data: {
        boundary: m.boundary,
        fromLevel: m.fromLevel,
        toLevel: m.toLevel,
        unitId: m.unitId,
        passingScore: m.passingScore,
        itemCountMin: m.itemCount.min,
        itemCountMax: m.itemCount.max,
        cooldownHours: m.cooldownHours,
        maxAttemptsBeforeReferral: m.maxAttemptsBeforeReferral,
      },
    });
  }

  const unitsCount = await prisma.unit.count();
  const lessonsCount = await prisma.lesson.count();
  const exercisesCount = await prisma.practiceExercise.count();
  const vocabCount = await prisma.vocabularyItem.count();
  const scenariosCount = await prisma.scenario.count();
  const anchorsCount = await prisma.remedialAnchor.count();
  const milestonesCount = await prisma.milestone.count();

  // eslint-disable-next-line no-console
  console.log(
    `Seeded curriculum ${primary.dialect} (${CURRICULUM_ID}): ` +
      `${unitsCount} units, ${lessonsCount} lessons, ${exercisesCount} exercises, ` +
      `${vocabCount} vocabulary items, ${scenariosCount} scenarios, ` +
      `${anchorsCount} remedial anchors, ${milestonesCount} milestones. ` +
      `(${Date.now() - start}ms)`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });