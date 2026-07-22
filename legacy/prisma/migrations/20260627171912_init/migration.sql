-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'pt-PT-v1',
    "dialect" TEXT NOT NULL DEFAULT 'pt-PT',
    "entryUnitId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "Level_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prerequisiteUnitIdsJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Unit_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    CONSTRAINT "Lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonBody" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "blocksJson" TEXT NOT NULL,
    CONSTRAINT "LessonBody_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "expectedAnswer" TEXT,
    "difficulty" TEXT NOT NULL,
    "vocabularyRefsJson" TEXT NOT NULL DEFAULT '[]',
    "grammarRefsJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "PracticeExercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VocabularyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "pt" TEXT NOT NULL,
    "gloss" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "audioAssetId" TEXT,
    "imageAssetId" TEXT,
    "examplePt" TEXT,
    "exampleGloss" TEXT,
    CONSTRAINT "VocabularyItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrammarPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "examplesJson" TEXT NOT NULL,
    CONSTRAINT "GrammarPattern_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "learnerRole" TEXT NOT NULL,
    "teacherRole" TEXT NOT NULL,
    "successCriteriaJson" TEXT NOT NULL,
    CONSTRAINT "Scenario_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RemedialAnchor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUnitId" TEXT NOT NULL,
    "toUnitId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    CONSTRAINT "RemedialAnchor_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RemedialAnchor_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boundary" TEXT NOT NULL,
    "fromLevel" TEXT NOT NULL,
    "toLevel" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "passingScore" REAL NOT NULL,
    "itemCountMin" INTEGER NOT NULL,
    "itemCountMax" INTEGER NOT NULL,
    "cooldownHours" INTEGER NOT NULL,
    "maxAttemptsBeforeReferral" INTEGER NOT NULL,
    CONSTRAINT "Milestone_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Learner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlacementLessonAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learnerId" TEXT NOT NULL,
    "attemptedAt" DATETIME NOT NULL,
    "selfAssessedLevel" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "suggestedStartUnitId" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "PlacementLessonAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Level_curriculumId_idx" ON "Level"("curriculumId");

-- CreateIndex
CREATE INDEX "Unit_curriculumId_idx" ON "Unit"("curriculumId");

-- CreateIndex
CREATE INDEX "Unit_levelId_idx" ON "Unit"("levelId");

-- CreateIndex
CREATE INDEX "Lesson_unitId_idx" ON "Lesson"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonBody_lessonId_key" ON "LessonBody"("lessonId");

-- CreateIndex
CREATE INDEX "PracticeExercise_lessonId_idx" ON "PracticeExercise"("lessonId");

-- CreateIndex
CREATE INDEX "VocabularyItem_unitId_idx" ON "VocabularyItem"("unitId");

-- CreateIndex
CREATE INDEX "GrammarPattern_unitId_idx" ON "GrammarPattern"("unitId");

-- CreateIndex
CREATE INDEX "Scenario_unitId_idx" ON "Scenario"("unitId");

-- CreateIndex
CREATE INDEX "RemedialAnchor_fromUnitId_idx" ON "RemedialAnchor"("fromUnitId");

-- CreateIndex
CREATE INDEX "RemedialAnchor_toUnitId_idx" ON "RemedialAnchor"("toUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_boundary_key" ON "Milestone"("boundary");

-- CreateIndex
CREATE INDEX "Milestone_unitId_idx" ON "Milestone"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Learner_externalRef_key" ON "Learner"("externalRef");

-- CreateIndex
CREATE INDEX "PlacementLessonAttempt_learnerId_idx" ON "PlacementLessonAttempt"("learnerId");
