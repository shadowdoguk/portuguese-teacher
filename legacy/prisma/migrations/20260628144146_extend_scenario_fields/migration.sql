/*
  Warnings:

  - Added the required column `category` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expectedTurns` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grammarRefsJson` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passingScore` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preTask` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remedialAnchorRefsJson` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetLevel` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vocabularyRefsJson` to the `Scenario` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetLevel" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "learnerRole" TEXT NOT NULL,
    "teacherRole" TEXT NOT NULL,
    "preTask" TEXT NOT NULL,
    "expectedTurns" INTEGER NOT NULL,
    "vocabularyRefsJson" TEXT NOT NULL,
    "grammarRefsJson" TEXT NOT NULL,
    "remedialAnchorRefsJson" TEXT NOT NULL,
    "successCriteriaJson" TEXT NOT NULL,
    "passingScore" REAL NOT NULL,
    CONSTRAINT "Scenario_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Scenario" ("goal", "id", "learnerRole", "setting", "successCriteriaJson", "teacherRole", "unitId") SELECT "goal", "id", "learnerRole", "setting", "successCriteriaJson", "teacherRole", "unitId" FROM "Scenario";
DROP TABLE "Scenario";
ALTER TABLE "new_Scenario" RENAME TO "Scenario";
CREATE INDEX "Scenario_unitId_idx" ON "Scenario"("unitId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
