// Seeds the Prisma database from the canonical in-memory A0_CURRICULUM
// fixture (src/lib/curriculum/seed-a0.ts).
//
// Idempotent: every row is upserted on its natural ID so re-running the
// script is safe and produces the same state.
//
// Usage:
//   pnpm seed          # seeds everything that A0_CURRICULUM declares
//   pnpm seed:a0       # explicit alias (Level A0)
//
// References:
//   - src/lib/curriculum/seed-a0.ts (source of truth)
//   - prisma/schema.prisma (target)
//   - docs/adr/0003-v1-scope-amendment.md (v1 is pt-PT only)

import { PrismaClient } from "@prisma/client";
import { A0_CURRICULUM } from "../src/lib/curriculum/seed-a0";

const prisma = new PrismaClient();

const CURRICULUM_ID = "pt-PT-v1";

async function main(): Promise<void> {
  const curriculum = A0_CURRICULUM;
  if (curriculum.dialect !== "pt-PT") {
    throw new Error(
      `Refusing to seed non-pt-PT curriculum (v1 is pt-PT only): ${curriculum.dialect}`,
    );
  }

  await prisma.curriculum.upsert({
    where: { id: CURRICULUM_ID },
    update: { dialect: curriculum.dialect, entryUnitId: curriculum.entryUnitId },
    create: {
      id: CURRICULUM_ID,
      dialect: curriculum.dialect,
      entryUnitId: curriculum.entryUnitId,
    },
  });

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

  // Units
  for (const unit of curriculum.units) {
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
          goal: s.goal,
          setting: s.setting,
          learnerRole: s.roles.learner,
          teacherRole: s.roles.teacher,
          successCriteriaJson: JSON.stringify(s.successCriteria),
        },
        create: {
          id: s.id,
          unitId: unit.id,
          goal: s.goal,
          setting: s.setting,
          learnerRole: s.roles.learner,
          teacherRole: s.roles.teacher,
          successCriteriaJson: JSON.stringify(s.successCriteria),
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
          note: a.note,
        },
      });
    }
  }

  // Milestones
  await prisma.milestone.deleteMany({});
  for (const m of curriculum.milestones) {
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
    `Seeded curriculum ${curriculum.dialect} (${CURRICULUM_ID}): ` +
      `${unitsCount} units, ${lessonsCount} lessons, ${exercisesCount} exercises, ` +
      `${vocabCount} vocabulary items, ${scenariosCount} scenarios, ` +
      `${anchorsCount} remedial anchors, ${milestonesCount} milestones.`,
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