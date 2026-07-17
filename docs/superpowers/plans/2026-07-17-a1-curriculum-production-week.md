# A1 Curriculum Production Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace two A1 stubs and add three A1 Units so the Curriculum ends the week with five production-ready, sequential A1 Units.

**Architecture:** Keep `seed-a1.ts` as the public A1 Curriculum composer and place each Unit in one focused module under `src/lib/curriculum/a1/`. Tests compose A0 and A1 into a full Curriculum so the A0 to A1 prerequisite and cross-Level Remedial Anchors pass the existing graph invariants.

**Tech Stack:** TypeScript 5.6, Vitest 2.1, Prisma 5.22 with SQLite, Next.js 14.2, pnpm 10.

## Global Constraints

- v1 Lesson Material uses pt-PT only.
- Every Unit stays within CEFR A1.
- Every Unit has exactly 3 Lessons, at least 2 Practice Exercises per Lesson, and at least 3 Practice Exercise kinds. Set Lesson orders to `1`, `2`, `3`, kinds to `vocabulary`, `grammar`, `scenario`, and `estimatedMinutes` to `12`, `12`, `15` in that order. Set each first Lesson's exercise difficulties to `easy`, `core`; the second Lesson's to `easy`, `core`; and the third Lesson's to `core`, `stretch`.
- Every Unit has 8 to 12 Vocabulary Items, 1 or 2 Grammar Patterns, at least 1 Scenario, and 1 or 2 backward Remedial Anchors. Set each anchor's `fromUnitId` to its declaring Unit and `createdAt` to `2026-07-17T00:00:00.000Z`.
- New child IDs use the full Unit ID as their prefix.
- Do not add the A1 to A2 Milestone this week.
- Do not add dependencies, Prisma migrations, API changes, new code comments, secrets, or `.env` files. Task 3 may correct the existing stale block comment in `scenarios-extended.ts`.
- Keep Scenario reference arrays empty unless the issue introduces or rehomes that Scenario. Every non-empty reference must resolve within the assigned Unit.
- Do not run a commit command unless the user explicitly requests a commit.
- Each Unit issue runs all nine repository gates before completion.

---

## File responsibility map

| File | Responsibility |
| --- | --- |
| `src/lib/curriculum/seed-a1.ts` | Imports Unit constants and exports `A1_CURRICULUM` in canonical order. |
| `src/lib/curriculum/a1/viagens.ts` | Owns the Viagens Unit. |
| `src/lib/curriculum/a1/alimentacao.ts` | Owns the Alimentação Unit. |
| `src/lib/curriculum/a1/mercearia.ts` | Owns the Mercearia Unit. |
| `src/lib/curriculum/a1/saude.ts` | Owns the Saúde Unit. |
| `src/lib/curriculum/a1/roupa.ts` | Owns the Roupa Unit. |
| `src/lib/curriculum/scenarios-extended.ts` | Declares which A1, A2, and B1 Unit IDs receive library Scenarios. |
| `src/lib/scenarios/library.ts` | Owns Scenario assignment and Scenario vocabulary and grammar references. |
| `src/test/a1-curriculum-content.test.ts` | Enforces the production-ready Unit contract and full A0 plus A1 graph invariants. |
| `src/test/scenarios-extended.test.ts` | Pins Scenario grouping and seeded Unit coverage. |
| `src/test/prisma-roundtrip.test.ts` | Round-trips A0 plus A1 Units and relations through Prisma. |
| `CONTEXT.md` | Domain glossary. Remove the committed conflict marker without changing the glossary entry. |
| `docs/adr/0005-v1-release-scope-and-readiness.md` | Record authenticated LHCI as shipped. |
| `PROGRESS.md` | Track the five issues and remove the stale LHCI blocker. |

## Shared test contract introduced by Issue 1

Create `src/test/a1-curriculum-content.test.ts` with this structure. Later issues add their Unit ID to `COMPLETED_A1_UNIT_IDS` and add one row to `EXPECTED_PATH`.

```ts
import { describe, expect, it } from "vitest";
import { assertCurriculumInvariants } from "@/lib/curriculum/graph";
import { A0_CURRICULUM } from "@/lib/curriculum/seed-a0";
import { A1_CURRICULUM } from "@/lib/curriculum/seed-a1";
import type { Curriculum, Unit } from "@/lib/curriculum/types";
import { detectDialectDefects } from "@/lib/voice-loop/difficulty-estimator";

const COMPLETED_A1_UNIT_IDS = ["a1-1-viagens"] as const;

const EXPECTED_PATH = [
  { id: "a1-1-viagens", order: 1, prerequisiteUnitIds: ["a0-4-rotina-e-horas"] },
] as const;

function portugueseText(unit: Unit): string {
  const values: string[] = [unit.title, unit.description];
  for (const lesson of unit.lessons) {
    values.push(lesson.title, lesson.body.introduction);
    for (const block of lesson.body.blocks) {
      if (block.kind === "paragraph" || block.kind === "rule") values.push(block.text);
      if (block.kind === "example") values.push(block.pt);
      if (block.kind === "audio") values.push(block.text, block.caption ?? "");
      if (block.kind === "image") values.push(block.alt);
    }
    for (const exercise of lesson.exercises) {
      values.push(exercise.prompt, exercise.expectedAnswer ?? "");
    }
  }
  for (const item of unit.vocabulary) values.push(item.pt, item.examplePt ?? "");
  for (const pattern of unit.grammar) {
    values.push(pattern.name, pattern.description);
    for (const example of pattern.examples) values.push(example.pt);
  }
  return values.join("\n");
}

function expectProductionReadyUnit(unit: Unit): void {
  expect(unit.level).toBe("A1");
  expect(unit.lessons).toHaveLength(3);
  expect(unit.vocabulary.length).toBeGreaterThanOrEqual(8);
  expect(unit.vocabulary.length).toBeLessThanOrEqual(12);
  expect(unit.grammar.length).toBeGreaterThanOrEqual(1);
  expect(unit.grammar.length).toBeLessThanOrEqual(2);
  expect(unit.scenarios.length).toBeGreaterThanOrEqual(1);
  expect(unit.remedialAnchors.length).toBeGreaterThanOrEqual(1);
  expect(unit.remedialAnchors.length).toBeLessThanOrEqual(2);

  const lessonIds = new Set(unit.lessons.map((lesson) => lesson.id));
  const vocabularyIds = new Set(unit.vocabulary.map((item) => item.id));
  const grammarIds = new Set(unit.grammar.map((pattern) => pattern.id));
  const exerciseKinds = new Set<string>();

  for (const lesson of unit.lessons) {
    expect(lesson.unitId).toBe(unit.id);
    expect(lesson.body.introduction).toBeTruthy();
    expect(lesson.body.blocks.length).toBeGreaterThanOrEqual(2);
    expect(lesson.exercises.length).toBeGreaterThanOrEqual(2);
    for (const exercise of lesson.exercises) {
      expect(lessonIds.has(exercise.lessonId)).toBe(true);
      exerciseKinds.add(exercise.kind);
      for (const ref of exercise.vocabularyRefs) expect(vocabularyIds.has(ref)).toBe(true);
      for (const ref of exercise.grammarRefs) expect(grammarIds.has(ref)).toBe(true);
    }
  }

  expect(exerciseKinds.size).toBeGreaterThanOrEqual(3);
  for (const item of unit.vocabulary) expect(item.unitId).toBe(unit.id);
  for (const pattern of unit.grammar) expect(pattern.unitId).toBe(unit.id);
  for (const scenario of unit.scenarios) {
    expect(scenario.unitId).toBe(unit.id);
    for (const ref of scenario.vocabularyRefs) expect(vocabularyIds.has(ref)).toBe(true);
    for (const ref of scenario.grammarRefs) expect(grammarIds.has(ref)).toBe(true);
  }
  for (const anchor of unit.remedialAnchors) expect(anchor.fromUnitId).toBe(unit.id);
  expect(detectDialectDefects(portugueseText(unit))).toEqual([]);
}

function combinedCurriculum(): Curriculum {
  return {
    dialect: "pt-PT",
    entryUnitId: A0_CURRICULUM.entryUnitId,
    units: [...A0_CURRICULUM.units, ...A1_CURRICULUM.units],
    milestones: [...A0_CURRICULUM.milestones, ...A1_CURRICULUM.milestones],
  };
}

describe("A1 production curriculum", () => {
  it("keeps the completed A1 path ordered and connected to A0", () => {
    const completedUnits = A1_CURRICULUM.units.filter((unit) =>
      (COMPLETED_A1_UNIT_IDS as readonly string[]).includes(unit.id),
    );
    expect(
      completedUnits.map(({ id, order, prerequisiteUnitIds }) => ({
        id,
        order,
        prerequisiteUnitIds,
      })),
    ).toEqual(EXPECTED_PATH);
  });

  it.each(COMPLETED_A1_UNIT_IDS)("ships production-ready content for %s", (unitId) => {
    const unit = A1_CURRICULUM.units.find((candidate) => candidate.id === unitId);
    expect(unit).toBeDefined();
    expectProductionReadyUnit(unit!);
  });

  it("passes full A0 and A1 Curriculum invariants", () => {
    expect(() => assertCurriculumInvariants(combinedCurriculum())).not.toThrow();
  });
});
```

The test intentionally inspects non-empty Scenario references. It does not force a backfill of untouched legacy Scenarios. In each task's Vocabulary table, the backticked token is the ID suffix. Build the actual ID by concatenating the Unit ID, `-v-`, and that suffix. Exercise tables use the same suffix shorthand for local vocabulary and grammar references; store the full IDs in TypeScript.

Every Unit module imports `scenariosForUnit` from `../scenarios-extended` and `Unit` from `../types`, then exports the exact Unit constant named in that task's **Interfaces** section.

---

### Task 0: Reconcile planning source documents

**Files:**
- Modify: `CONTEXT.md:57`
- Modify: `docs/adr/0005-v1-release-scope-and-readiness.md:22-66,90-96`
- Modify: `PROGRESS.md:5,145-160,348-353`
- Modify: `docs/superpowers/specs/2026-07-17-a1-curriculum-production-week-design.md:3-4`

**Interfaces:**
- Consumes: PR #149 evidence already recorded in `HANDOFF.md:17,39`.
- Produces: Clean source documents for the five issue bodies and `pnpm progress:check`.

- [ ] **Step 1: Remove the conflict marker**

Delete only the literal `<<<<<<< HEAD` line from `CONTEXT.md`. Preserve the Observability Sink row that follows it.

- [ ] **Step 2: Reconcile ADR-0005**

Add authenticated app-route LHCI to the shipped table with evidence `PR #149; lighthouserc.auth.json; scripts/lhci-sign-in.js`. Remove it from the deferred table. Change the authenticated Learner fixture checklist item to `[x]`.

- [ ] **Step 3: Reconcile PROGRESS.md**

Remove authenticated LHCI from the active Blockers list, add the five planned A1 issues after GitHub assigns their numbers, and bump `Last updated` to `2026-07-17`.

- [ ] **Step 4: Mark the design approved**

Change the design status from `Draft for written review` to `Approved`.

- [ ] **Step 5: Verify document integrity**

Run:

```bash
pnpm progress:check
git diff --check
```

Expected: progress check reports zero missing open issues; `git diff --check` prints nothing.

- [ ] **Step 6: Commit only if explicitly requested**

```bash
git add CONTEXT.md PROGRESS.md docs/adr/0005-v1-release-scope-and-readiness.md docs/superpowers/specs/2026-07-17-a1-curriculum-production-week-design.md docs/superpowers/plans/2026-07-17-a1-curriculum-production-week.md
git commit -m "docs(plan): line up A1 curriculum production week"
```

---

### Task 1: Complete the A1 Viagens Unit

**Issue title:** Complete the A1 Viagens Unit

**Why:** `a1-1-viagens` is the first A1 Unit but ships one Lesson, no Vocabulary Items, no Grammar Patterns, and no Remedial Anchors.

**Blocking edge:** None.

**Files:**
- Create: `src/lib/curriculum/a1/viagens.ts`
- Create: `src/test/a1-curriculum-content.test.ts`
- Modify: `src/lib/curriculum/seed-a1.ts:1-99`
- Modify: `src/test/prisma-roundtrip.test.ts:1-313`
- Modify: `PROGRESS.md`

**Interfaces:**
- Consumes: `Unit` from `src/lib/curriculum/types.ts`; `scenariosForUnit(unitId: string): ReadonlyArray<Scenario>`.
- Produces: `export const A1_1_VIAGENS: Unit`; shared A1 production-content tests; A0 to A1 prerequisite edge.

**Acceptance:**
- Viagens has 3 Lessons, 12 Vocabulary Items, 2 Grammar Patterns, 6 Practice Exercises, existing Scenarios, and 2 Remedial Anchors.
- `A1_CURRICULUM.units` contains only Viagens and the existing Alimentação stub at this point.
- The full A0 plus A1 graph passes `assertCurriculumInvariants`.
- Prisma round-trip includes A1 Units, Grammar Patterns, Scenarios, and Remedial Anchors.

- [ ] **Step 1: Write the failing shared contract test**

Create `src/test/a1-curriculum-content.test.ts` from the complete shared test contract above. The contract filters the path assertion through `COMPLETED_A1_UNIT_IDS`, so the unfinished Alimentação stub remains outside the production-content assertion until Task 2.

- [ ] **Step 2: Run the red test**

```bash
pnpm test -- src/test/a1-curriculum-content.test.ts
```

Expected: FAIL because Viagens has 1 Lesson, 0 Vocabulary Items, 0 Grammar Patterns, 0 anchors, and no A0 prerequisite.

- [ ] **Step 3: Create the Viagens module**

Create `src/lib/curriculum/a1/viagens.ts` and export `A1_1_VIAGENS`. Use `createdAt: "2026-07-17T00:00:00.000Z"` on both anchors.

| Kind | Exact IDs and content |
| --- | --- |
| Unit | ID `a1-1-viagens`; order `1`; title `Viajar em Portugal`; description `Fazer o check-in, confirmar uma reserva e pedir direções em viagens por Portugal.`; prerequisite `a0-4-rotina-e-horas`. |
| Lessons | `a1-1-viagens-l1-aeroporto` titled `No aeroporto`; `a1-1-viagens-l2-hotel` titled `No hotel`; `a1-1-viagens-l3-direcoes` titled `Direções e transportes`. |
| Vocabulary | `voo`: `voo` / flight; `passaporte`: `passaporte` / passport; `cartao-embarque`: `cartão de embarque` / boarding pass; `portao-embarque`: `portão de embarque` / boarding gate; `bagagem`: `bagagem` / luggage; `janela`: `lugar à janela` / window seat; `corredor`: `lugar junto ao corredor` / aisle seat; `reserva`: `reserva` / reservation; `pequeno-almoco`: `pequeno-almoço` / breakfast; `estacao`: `estação` / station; `comboio`: `comboio` / train; `esquerda`: `à esquerda` / to the left. |
| Grammar | `a1-1-viagens-g-ter-de`: name `ter de + infinitivo`, description `Indica uma obrigação ou necessidade durante a viagem.`, examples `Tenho de fazer o check-in.` / `I have to check in.` and `Temos de apanhar o comboio.` / `We have to catch the train.`; `a1-1-viagens-g-queria`: name `Pedidos com queria`, description `Torna um pedido mais cortês em serviços de viagem.`, examples `Queria um lugar à janela.` / `I would like a window seat.` and `Queria confirmar a minha reserva.` / `I would like to confirm my reservation.` |
| Anchors | To `a0-4-rotina-e-horas`, reason `vocabulary-decay`, gap `vocab`, weight `0.7`, note `Rever horas e números antes de trabalhar horários de viagem.`; to `a0-3-cafe-pedidos`, reason `grammar-gap`, gap `grammar`, weight `0.5`, note `Rever pedidos com queria antes do check-in e da reserva.` |

Use these exact exercises:

| Exercise ID | Kind | Prompt | Expected answer | References |
| --- | --- | --- | --- | --- |
| `a1-1-viagens-l1-e1` | `listen-and-repeat` | `Repete: Onde é o portão de embarque?` | none | `portao-embarque` |
| `a1-1-viagens-l1-e2` | `fill-in` | `Completa: Aqui tem o seu ___ de embarque.` | `cartão` | `cartao-embarque`; `ter-de` |
| `a1-1-viagens-l2-e1` | `role-play` | `Faz o check-in no hotel e confirma a reserva.` | none | `reserva`; `queria` |
| `a1-1-viagens-l2-e2` | `fill-in` | `Completa: O ___ está incluído na reserva.` | `pequeno-almoço` | `pequeno-almoco`, `reserva` |
| `a1-1-viagens-l3-e1` | `listen-and-repeat` | `Repete: A estação fica à esquerda.` | none | `estacao`, `esquerda` |
| `a1-1-viagens-l3-e2` | `free-response` | `Diz como vais para o aeroporto de comboio.` | none | `comboio`, `estacao`; `ter-de` |

Use these Lesson body blocks:

| Lesson | Rule text | Example pt / gloss |
| --- | --- | --- |
| Aeroporto | `No aeroporto, apresenta o passaporte e o cartão de embarque antes de procurar o portão.` | `Tenho de apresentar o passaporte no check-in.` / `I have to show my passport at check-in.` |
| Hotel | `Usa “queria” para confirmar uma reserva ou pedir um quarto com cortesia.` | `Queria confirmar a minha reserva e o pequeno-almoço.` / `I would like to confirm my reservation and breakfast.` |
| Direções | `Usa “fica” para localizar um lugar e “de” com um transporte para indicar o meio da viagem.` | `A estação fica à esquerda e vou de comboio.` / `The station is on the left and I am going by train.` |

- [ ] **Step 4: Make `seed-a1.ts` a composer**

Replace the inline Viagens object with:

```ts
import type { Curriculum } from "./types";
import { A1_1_VIAGENS } from "./a1/viagens";

export const A1_CURRICULUM: Curriculum = {
  dialect: "pt-PT",
  units: [A1_1_VIAGENS, A1_2_ALIMENTACAO],
  entryUnitId: "a1-1-viagens",
  milestones: [],
};
```

Keep the Alimentação stub inline until Task 2, but change its `prerequisiteUnitIds` to `["a1-1-viagens"]` so the combined graph stays reachable. Export no Unit internals from `seed-a1.ts`.

- [ ] **Step 5: Extend the Prisma round-trip fixture**

Import `A1_CURRICULUM`. Replace the single A0 fixture with:

```ts
const TEST_CURRICULUM = {
  dialect: "pt-PT" as const,
  entryUnitId: A0_CURRICULUM.entryUnitId,
  units: [...A0_CURRICULUM.units, ...A1_CURRICULUM.units],
  milestones: [...A0_CURRICULUM.milestones, ...A1_CURRICULUM.milestones],
};
```

Seed `TEST_CURRICULUM`, add a Grammar Pattern create loop using `examplesJson: JSON.stringify(g.examples)`, include grammar in the count assertion, and call `assertCurriculumInvariants(rebuilt)` after rebuilding. Update the test title to `persists the same counts as the combined A0 and A1 Curriculum`.

- [ ] **Step 6: Run targeted tests**

```bash
pnpm test -- src/test/a1-curriculum-content.test.ts src/test/prisma-roundtrip.test.ts src/test/scenarios-extended.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run all nine gates**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm perf:budget && pnpm test:a11y && pnpm asr:regress && pnpm sc5:load-test && pnpm test:e2e:chromium
```

Expected: every command exits 0.

- [ ] **Step 8: Update PROGRESS.md and commit only if explicitly requested**

Record the issue transition and verification evidence, then:

```bash
git add PROGRESS.md src/lib/curriculum/seed-a1.ts src/lib/curriculum/a1/viagens.ts src/test/a1-curriculum-content.test.ts src/test/prisma-roundtrip.test.ts
git commit -m "feat(curriculum): complete A1 Viagens Unit"
```

---

### Task 2: Complete the A1 Alimentação Unit

**Issue title:** Complete the A1 Alimentação Unit

**Why:** `a1-2-alimentacao` ships one Lesson, no exercises, no Vocabulary Items, no Grammar Patterns, and no Remedial Anchors.

**Blocking edge:** Blocked by Complete the A1 Viagens Unit.

**Files:**
- Create: `src/lib/curriculum/a1/alimentacao.ts`
- Modify: `src/lib/curriculum/seed-a1.ts`
- Modify: `src/test/a1-curriculum-content.test.ts`
- Modify: `src/lib/scenarios/library.ts` for `s-cafe-6-reservar-mesa-jantar`
- Modify: `PROGRESS.md`

**Interfaces:**
- Consumes: `A1_1_VIAGENS`; shared production contract.
- Produces: `export const A1_2_ALIMENTACAO: Unit`; canonical A1 order 2.

**Acceptance:** 3 Lessons, 10 Vocabulary Items, 2 Grammar Patterns, 6 exercises, 5 or more Scenarios after restaurant normalization, and 2 backward anchors.

- [ ] **Step 1: Extend the failing contract**

Add `a1-2-alimentacao` to `COMPLETED_A1_UNIT_IDS` and this `EXPECTED_PATH` row:

```ts
{ id: "a1-2-alimentacao", order: 2, prerequisiteUnitIds: ["a1-1-viagens"] },
```

Run:

```bash
pnpm test -- src/test/a1-curriculum-content.test.ts
```

Expected: FAIL on the Alimentação content minimums and prerequisite.

- [ ] **Step 2: Create the Alimentação module**

| Kind | Exact IDs and content |
| --- | --- |
| Unit | ID `a1-2-alimentacao`; order `2`; title `Comer fora`; description `Reservar uma mesa, escolher da ementa e pagar uma refeição em Portugal.`; prerequisite `a1-1-viagens`. |
| Lessons | `a1-2-alimentacao-l1-restaurante` titled `No restaurante`; `a1-2-alimentacao-l2-ementa` titled `Escolher da ementa`; `a1-2-alimentacao-l3-conta` titled `Pedir e pagar a conta`. |
| Vocabulary | `ementa`: `ementa` / menu; `prato-dia`: `prato do dia` / dish of the day; `entrada`: `entrada` / starter; `sobremesa`: `sobremesa` / dessert; `conta`: `conta` / bill; `gorjeta`: `gorjeta` / tip; `multibanco`: `multibanco` / debit card payment; `dinheiro`: `dinheiro` / cash; `reserva`: `reserva` / reservation; `mesa`: `mesa` / table. |
| Grammar | `a1-2-alimentacao-g-queria-pedir`: name `Pedir com queria`, description `Formula pedidos e reservas com cortesia.`, examples `Queria pedir o prato do dia.` / `I would like to order the dish of the day.` and `Queria uma mesa para duas pessoas.` / `I would like a table for two.`; `a1-2-alimentacao-g-presente-transacoes`: name `Presente nas transações`, description `Usa o presente de pedir e pagar numa refeição.`, examples `Peço a conta.` / `I ask for the bill.` and `Pago com multibanco.` / `I pay by card.` |
| Anchors | To `a0-3-cafe-pedidos`, reason `vocabulary-decay`, gap `vocab`, weight `0.8`, note `Rever pedidos básicos antes de escolher uma refeição completa.`; to `a0-4-rotina-e-horas`, reason `vocabulary-decay`, gap `vocab`, weight `0.5`, note `Rever números antes de trabalhar preços e a conta.` |

Exercises:

| ID | Kind | Prompt | Expected answer | References |
| --- | --- | --- | --- | --- |
| `a1-2-alimentacao-l1-e1` | `role-play` | `Reserva uma mesa para duas pessoas.` | none | `reserva`, `mesa`; `queria-pedir` |
| `a1-2-alimentacao-l1-e2` | `fill-in` | `Completa: Queria uma ___ para duas pessoas.` | `mesa` | `mesa`; `queria-pedir` |
| `a1-2-alimentacao-l2-e1` | `flashcard` | `Como se diz menu em português de Portugal?` | `ementa` | `ementa` |
| `a1-2-alimentacao-l2-e2` | `free-response` | `Escolhe uma entrada, um prato e uma sobremesa.` | none | `entrada`, `prato-dia`, `sobremesa` |
| `a1-2-alimentacao-l3-e1` | `listen-and-repeat` | `Repete: Pode trazer a conta, por favor?` | none | `conta` |
| `a1-2-alimentacao-l3-e2` | `fill-in` | `Completa: Pago com ___.` | `multibanco` | `multibanco`; `presente-transacoes` |

Use these body pairs: Restaurante rule `Usa “queria” para reservar e pedir com cortesia.` with example `Queria uma mesa para duas pessoas.` / `I would like a table for two.`; Ementa rule `Uma refeição pode incluir entrada, prato principal e sobremesa.` with example `O prato do dia vem com uma entrada.` / `The dish of the day comes with a starter.`; Conta rule `Pede a conta e indica se pagas com multibanco ou dinheiro.` with example `Peço a conta e pago com multibanco.` / `I ask for the bill and pay by card.`

Set `prerequisiteUnitIds: ["a1-1-viagens"]`, use `scenariosForUnit("a1-2-alimentacao")`, and use the shared anchor date.

- [ ] **Step 3: Normalize and reference restaurant Scenarios**

Change `s-cafe-4-pedir-recomendacao` from `a1-2-mercearia` to `a1-2-alimentacao`. Set:

```ts
vocabularyRefs: [
  "a1-2-alimentacao-v-ementa",
  "a1-2-alimentacao-v-prato-dia",
],
grammarRefs: ["a1-2-alimentacao-g-queria-pedir"],
```

For `s-cafe-6-reservar-mesa-jantar`, set:

```ts
vocabularyRefs: [
  "a1-2-alimentacao-v-reserva",
  "a1-2-alimentacao-v-mesa",
],
grammarRefs: ["a1-2-alimentacao-g-queria-pedir"],
```

- [ ] **Step 4: Import the Unit in `seed-a1.ts`**

Import `A1_2_ALIMENTACAO` and remove the inline stub. Keep Units ordered `[A1_1_VIAGENS, A1_2_ALIMENTACAO]`.

- [ ] **Step 5: Run targeted tests and all gates**

```bash
pnpm test -- src/test/a1-curriculum-content.test.ts src/test/prisma-roundtrip.test.ts src/test/scenarios-extended.test.ts src/test/scenarios-library-property.test.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm perf:budget && pnpm test:a11y && pnpm asr:regress && pnpm sc5:load-test && pnpm test:e2e:chromium
```

Expected: all commands pass.

- [ ] **Step 6: Update PROGRESS.md and commit only if explicitly requested**

```bash
git add PROGRESS.md src/lib/curriculum/seed-a1.ts src/lib/curriculum/a1/alimentacao.ts src/lib/scenarios/library.ts src/test/a1-curriculum-content.test.ts
git commit -m "feat(curriculum): complete A1 Alimentação Unit"
```

---

### Task 3: Add the A1 Mercearia Unit

**Issue title:** Add the A1 Mercearia Unit

**Why:** The Scenario Library references `a1-2-mercearia`, but Prisma cannot seed that Unit or its Scenarios because the A1 Curriculum does not declare it.

**Blocking edge:** Blocked by Complete the A1 Alimentação Unit.

**Files:**
- Create: `src/lib/curriculum/a1/mercearia.ts`
- Modify: `src/lib/curriculum/seed-a1.ts`
- Modify: `src/lib/curriculum/scenarios-extended.ts:4-36`
- Modify: `src/lib/scenarios/library.ts` Scenario IDs listed below
- Modify: `src/test/a1-curriculum-content.test.ts`
- Modify: `PROGRESS.md`

**Interfaces:**
- Produces: `export const A1_2_MERCEARIA: Unit`; A1 order 3; seeded Scenario ID entry.

**Acceptance:** 3 Lessons, 9 Vocabulary Items, 1 Grammar Pattern, 6 exercises, 2 grocery Scenarios, and 1 backward anchor.

- [ ] **Step 1: Make tests fail**

Add the Unit ID and this path row:

```ts
{ id: "a1-2-mercearia", order: 3, prerequisiteUnitIds: ["a1-2-alimentacao"] },
```

Add `"a1-2-mercearia"` after Alimentação in `SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS`. Run the A1 and Scenario tests. Expected: FAIL because the Unit is absent from `A1_CURRICULUM`.

- [ ] **Step 2: Create the Mercearia module**

| Kind | Exact IDs and content |
| --- | --- |
| Unit | ID `a1-2-mercearia`; order `3`; title `Na mercearia`; description `Pedir produtos, indicar quantidades e pagar numa mercearia tradicional.`; prerequisite `a1-2-alimentacao`. |
| Lessons | `a1-2-mercearia-l1-produtos` titled `Produtos da mercearia`; `a1-2-mercearia-l2-quantidades` titled `Pesos e quantidades`; `a1-2-mercearia-l3-pagamento` titled `Preço e pagamento`. |
| Vocabulary | `queijo`: `queijo` / cheese; `enchido`: `enchido` / cured sausage; `presunto`: `presunto` / cured ham; `azeite`: `azeite` / olive oil; `meio-quilo`: `meio quilo` / half a kilogram; `duzentos-gramas`: `duzentos gramas` / two hundred grams; `embrulhar`: `embrulhar` / to wrap; `balanca`: `balança` / scale; `preco`: `preço` / price. |
| Grammar | `a1-2-mercearia-g-quantidade-de`: name `Quantidade + de + produto`, description `Liga um peso ou quantidade ao produto pedido.`, examples `Queria meio quilo de queijo.` / `I would like half a kilogram of cheese.` and `Queria duzentos gramas de presunto.` / `I would like two hundred grams of cured ham.` |
| Anchor | To `a1-2-alimentacao`, reason `vocabulary-decay`, gap `vocab`, weight `0.7`, note `Rever pedidos corteses antes de pedir produtos por quantidade.` |

Exercises:

| ID | Kind | Prompt | Expected answer | References |
| --- | --- | --- | --- | --- |
| `a1-2-mercearia-l1-e1` | `flashcard` | `Identifica o produto: queijo.` | `queijo` | `queijo` |
| `a1-2-mercearia-l1-e2` | `role-play` | `Pede uma recomendação de azeite.` | none | `azeite`; `quantidade-de` |
| `a1-2-mercearia-l2-e1` | `listen-and-repeat` | `Repete: Queria meio quilo de queijo.` | none | `meio-quilo`, `queijo`; `quantidade-de` |
| `a1-2-mercearia-l2-e2` | `fill-in` | `Completa: Queria duzentos ___ de presunto.` | `gramas` | `duzentos-gramas`, `presunto`; `quantidade-de` |
| `a1-2-mercearia-l3-e1` | `free-response` | `Pergunta o preço e pede para embrulhar.` | none | `preco`, `embrulhar` |
| `a1-2-mercearia-l3-e2` | `scenario-turn` | `Compra queijo ao peso e confirma a balança.` | none | `queijo`, `balanca`, `meio-quilo` |

Use these body pairs: Produtos rule `Numa mercearia, pede o produto pelo nome antes de indicar a quantidade.` with example `Queria queijo e azeite, por favor.` / `I would like cheese and olive oil, please.`; Quantidades rule `Liga a quantidade ao produto com “de”.` with example `Queria duzentos gramas de presunto.` / `I would like two hundred grams of cured ham.`; Pagamento rule `Confirma o preço e pede para embrulhar antes de pagar.` with example `Qual é o preço? Pode embrulhar, por favor?` / `What is the price? Can you wrap it, please?`

- [ ] **Step 3: Rehome and reference grocery Scenarios**

Change `s-shopping-6-mercearia-peso` from `a1-2-alimentacao` to `a1-2-mercearia`. Use these references:

```ts
vocabularyRefs: [
  "a1-2-mercearia-v-meio-quilo",
  "a1-2-mercearia-v-duzentos-gramas",
  "a1-2-mercearia-v-preco",
],
grammarRefs: ["a1-2-mercearia-g-quantidade-de"],
```

Set the same grammar reference and applicable local vocabulary references on `s-shopping-3-mercearia-peso`. In that Scenario's first success criterion, change `duzentas gramas` to the grammatically correct weight expression `duzentos gramas`.

- [ ] **Step 4: Compose and verify**

Import `A1_2_MERCEARIA` into `seed-a1.ts` after Alimentação. Update stale `scenarios-extended.ts` prose so it describes the current seeded IDs without fixed historical counts.

Run:

```bash
pnpm test -- src/test/a1-curriculum-content.test.ts src/test/scenarios-extended.test.ts src/test/scenarios-library-property.test.ts src/test/prisma-roundtrip.test.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm perf:budget && pnpm test:a11y && pnpm asr:regress && pnpm sc5:load-test && pnpm test:e2e:chromium
```

Expected: all commands pass.

- [ ] **Step 5: Update PROGRESS.md and commit only if explicitly requested**

```bash
git add PROGRESS.md src/lib/curriculum/seed-a1.ts src/lib/curriculum/a1/mercearia.ts src/lib/curriculum/scenarios-extended.ts src/lib/scenarios/library.ts src/test/a1-curriculum-content.test.ts
git commit -m "feat(curriculum): add A1 Mercearia Unit"
```

---

### Task 4: Add the A1 Saúde Unit

**Issue title:** Add the A1 Saúde Unit

**Why:** Six A1 medical Scenarios exist, but three sit under Viagens and three cannot seed because `a1-2-saude` does not exist.

**Blocking edge:** Blocked by Add the A1 Mercearia Unit.

**Files:**
- Create: `src/lib/curriculum/a1/saude.ts`
- Modify: `src/lib/curriculum/seed-a1.ts`
- Modify: `src/lib/curriculum/scenarios-extended.ts`
- Modify: `src/lib/scenarios/library.ts`
- Modify: `src/test/a1-curriculum-content.test.ts`
- Modify: `PROGRESS.md`

**Interfaces:**
- Produces: `export const A1_2_SAUDE: Unit`; A1 order 4; six locally referenced medical Scenarios.

**Acceptance:** 3 Lessons, 10 Vocabulary Items, 2 Grammar Patterns, 6 exercises, 6 medical Scenarios, and 2 anchors.

- [ ] **Step 1: Make tests fail**

Add `a1-2-saude` to the completed list, add path row:

```ts
{ id: "a1-2-saude", order: 4, prerequisiteUnitIds: ["a1-2-mercearia"] },
```

Add the Unit ID to the seeded Scenario ID list. Run targeted tests. Expected: FAIL because the Unit is absent.

- [ ] **Step 2: Create the Saúde module**

| Kind | Exact IDs and content |
| --- | --- |
| Unit | ID `a1-2-saude`; order `4`; title `Cuidar da saúde`; description `Marcar uma consulta, descrever sintomas e pedir orientação numa farmácia.`; prerequisite `a1-2-mercearia`. |
| Lessons | `a1-2-saude-l1-consulta` titled `Marcar uma consulta`; `a1-2-saude-l2-sintomas` titled `Descrever sintomas`; `a1-2-saude-l3-farmacia` titled `Na farmácia`. |
| Vocabulary | `consulta`: `consulta` / appointment; `medico`: `médico` / doctor; `dor-cabeca`: `dor de cabeça` / headache; `febre`: `febre` / fever; `tosse`: `tosse` / cough; `cansaco`: `cansaço` / tiredness; `remedio`: `remédio` / medicine; `receita`: `receita` / prescription; `posologia`: `posologia` / dosage instructions; `comprimido`: `comprimido` / tablet. |
| Grammar | `a1-2-saude-g-ter-dor`: name `Ter dor de`, description `Localiza uma dor com a estrutura ter dor de.`, examples `Tenho dor de cabeça.` / `I have a headache.` and `Tem dor de garganta?` / `Do you have a sore throat?`; `a1-2-saude-g-estar-com`: name `Estar com sintomas`, description `Descreve um estado de saúde atual e a sua duração.`, examples `Estou com febre.` / `I have a fever.` and `Estou com tosse há dois dias.` / `I have had a cough for two days.` |
| Anchors | To `a1-2-alimentacao`, reason `grammar-gap`, gap `grammar`, weight `0.5`, note `Rever aberturas corteses antes de marcar uma consulta.`; to `a0-4-rotina-e-horas`, reason `vocabulary-decay`, gap `vocab`, weight `0.6`, note `Rever horas e duração antes de descrever sintomas.` |

Exercises:

| ID | Kind | Prompt | Expected answer | References |
| --- | --- | --- | --- | --- |
| `a1-2-saude-l1-e1` | `role-play` | `Marca uma consulta para amanhã.` | none | `consulta`, `medico` |
| `a1-2-saude-l1-e2` | `fill-in` | `Completa: Queria marcar uma ___.` | `consulta` | `consulta` |
| `a1-2-saude-l2-e1` | `listen-and-repeat` | `Repete: Tenho dor de cabeça.` | none | `dor-cabeca`; `ter-dor` |
| `a1-2-saude-l2-e2` | `free-response` | `Diz há quanto tempo tens febre e tosse.` | none | `febre`, `tosse`; `estar-com` |
| `a1-2-saude-l3-e1` | `flashcard` | `O que mostra como tomar o remédio?` | `A posologia.` | `remedio`, `posologia` |
| `a1-2-saude-l3-e2` | `scenario-turn` | `Pede um remédio e pergunta se precisa de receita.` | none | `remedio`, `receita`, `comprimido` |

Use these body pairs: Consulta rule `Ao marcar uma consulta, indica o dia e pede confirmação da hora.` with example `Queria marcar uma consulta para amanhã.` / `I would like to book an appointment for tomorrow.`; Sintomas rule `Usa “ter dor de” e “estar com” para descrever sintomas.` with example `Tenho dor de cabeça e estou com febre.` / `I have a headache and a fever.`; Farmácia rule `Na farmácia, pergunta pela receita e pela posologia do remédio.` with example `Como devo tomar estes comprimidos?` / `How should I take these tablets?`

- [ ] **Step 3: Rehome and reference medical Scenarios**

Change these `unitId` values from `a1-1-viagens` to `a1-2-saude`:

```text
s-doctor-4-marcar-consulta-geral
s-doctor-5-descrever-sintomas-simples
s-doctor-6-comprar-medicamento-farmacia
```

For both appointment Scenarios, reference `consulta` and `medico`. For both symptom Scenarios, reference `dor-cabeca`, `febre`, `tosse`, `ter-dor`, and `estar-com`. For both pharmacy Scenarios, reference `remedio`, `receita`, `posologia`, and `comprimido`.

- [ ] **Step 4: Compose and verify**

Import Saúde after Mercearia. Run:

```bash
pnpm test -- src/test/a1-curriculum-content.test.ts src/test/scenarios-extended.test.ts src/test/scenarios-library-property.test.ts src/test/prisma-roundtrip.test.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm perf:budget && pnpm test:a11y && pnpm asr:regress && pnpm sc5:load-test && pnpm test:e2e:chromium
```

Expected: all commands pass.

- [ ] **Step 5: Update PROGRESS.md and commit only if explicitly requested**

```bash
git add PROGRESS.md src/lib/curriculum/seed-a1.ts src/lib/curriculum/a1/saude.ts src/lib/curriculum/scenarios-extended.ts src/lib/scenarios/library.ts src/test/a1-curriculum-content.test.ts
git commit -m "feat(curriculum): add A1 Saúde Unit"
```

---

### Task 5: Add the A1 Roupa Unit

**Issue title:** Add the A1 Roupa Unit

**Why:** Two clothing Scenarios exist, but one sits under Alimentação and one cannot seed because `a1-3-roupa` does not exist.

**Blocking edge:** Blocked by Add the A1 Saúde Unit.

**Files:**
- Create: `src/lib/curriculum/a1/roupa.ts`
- Modify: `src/lib/curriculum/seed-a1.ts`
- Modify: `src/lib/curriculum/scenarios-extended.ts`
- Modify: `src/lib/scenarios/library.ts`
- Modify: `src/test/a1-curriculum-content.test.ts`
- Modify: `PROGRESS.md`

**Interfaces:**
- Produces: `export const A1_3_ROUPA: Unit`; A1 order 5; two locally referenced clothing Scenarios.

**Acceptance:** 3 Lessons, 9 Vocabulary Items, 2 Grammar Patterns, 6 exercises, 2 clothing Scenarios, and 2 anchors. A1 ends with 5 production-ready Units.

- [ ] **Step 1: Make tests fail**

Add `a1-3-roupa` to the completed list, add path row:

```ts
{ id: "a1-3-roupa", order: 5, prerequisiteUnitIds: ["a1-2-saude"] },
```

Add the Unit ID to the seeded Scenario ID list. Run targeted tests. Expected: FAIL because the Unit is absent.

- [ ] **Step 2: Create the Roupa module**

| Kind | Exact IDs and content |
| --- | --- |
| Unit | ID `a1-3-roupa`; order `5`; title `Comprar roupa`; description `Identificar peças, pedir cores e tamanhos e experimentar roupa numa loja.`; prerequisite `a1-2-saude`. |
| Lessons | `a1-3-roupa-l1-pecas` titled `Peças de roupa`; `a1-3-roupa-l2-cores-tamanhos` titled `Cores e tamanhos`; `a1-3-roupa-l3-experimentar` titled `Experimentar e comprar`. |
| Vocabulary | `camisola`: `camisola` / jumper; `calcas`: `calças` / trousers; `saia`: `saia` / skirt; `vestido`: `vestido` / dress; `tamanho`: `tamanho` / size; `cor`: `cor` / colour; `experimentar`: `experimentar` / to try on; `balcao`: `balcão` / counter; `caixa`: `caixa` / checkout. |
| Grammar | `a1-3-roupa-g-demonstrativos`: name `Demonstrativos`, description `Faz a concordância de este, esta, estes e estas com a peça.`, examples `Esta camisola é azul.` / `This jumper is blue.` and `Estas calças são pretas.` / `These trousers are black.`; `a1-3-roupa-g-tamanho-cor`: name `Pedir tamanho e cor`, description `Pergunta se uma peça existe noutro tamanho ou noutra cor.`, examples `Tem isto em tamanho médio?` / `Do you have this in medium?` and `Tem esta camisola noutra cor?` / `Do you have this jumper in another colour?` |
| Anchors | To `a1-2-mercearia`, reason `scenario-struggle`, gap `fluency`, weight `0.7`, note `Rever perguntas transacionais antes de pedir tamanho e cor.`; to `a1-2-alimentacao`, reason `grammar-gap`, gap `grammar`, weight `0.5`, note `Rever pedidos com queria antes de falar com o vendedor.` |

Exercises:

| ID | Kind | Prompt | Expected answer | References |
| --- | --- | --- | --- | --- |
| `a1-3-roupa-l1-e1` | `flashcard` | `Identifica a peça: camisola.` | `camisola` | `camisola` |
| `a1-3-roupa-l1-e2` | `fill-in` | `Completa: Estas ___ são pretas.` | `calças` | `calcas`; `demonstrativos` |
| `a1-3-roupa-l2-e1` | `listen-and-repeat` | `Repete: Tem isto em tamanho médio?` | none | `tamanho`; `tamanho-cor` |
| `a1-3-roupa-l2-e2` | `free-response` | `Pede uma camisola noutra cor.` | none | `camisola`, `cor`; `tamanho-cor` |
| `a1-3-roupa-l3-e1` | `role-play` | `Pede para experimentar um vestido.` | none | `experimentar`, `vestido` |
| `a1-3-roupa-l3-e2` | `scenario-turn` | `Confirma o tamanho e pergunta onde fica a caixa.` | none | `tamanho`, `caixa` |

Use these body pairs: Peças rule `Os demonstrativos concordam em género e número com a peça de roupa.` with example `Esta camisola é azul e estas calças são pretas.` / `This jumper is blue and these trousers are black.`; Cores e tamanhos rule `Pergunta “Tem isto em...?” para procurar outra cor ou outro tamanho.` with example `Tem esta camisola em tamanho médio?` / `Do you have this jumper in medium?`; Experimentar rule `Usa “posso” para pedir autorização antes de experimentar uma peça.` with example `Posso experimentar este vestido?` / `Can I try on this dress?`

- [ ] **Step 3: Rehome and reference clothing Scenarios**

Change `s-shopping-5-comprar-roupa-tamanho` from `a1-2-alimentacao` to `a1-3-roupa`. For both it and `s-shopping-1-comprar-roupa`, reference `camisola`, `calcas`, `tamanho`, `cor`, `experimentar`, `demonstrativos`, and `tamanho-cor` where the Scenario language uses them.

- [ ] **Step 4: Compose and verify**

Import Roupa after Saúde. Update `SEEDED_A1_A2_B1_SCENARIO_UNIT_IDS` and confirm its order matches the seed composers.

Run:

```bash
pnpm test -- src/test/a1-curriculum-content.test.ts src/test/scenarios-extended.test.ts src/test/scenarios-library-property.test.ts src/test/prisma-roundtrip.test.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm perf:budget && pnpm test:a11y && pnpm asr:regress && pnpm sc5:load-test && pnpm test:e2e:chromium
```

Expected: all commands pass.

- [ ] **Step 5: Update PROGRESS.md and commit only if explicitly requested**

```bash
git add PROGRESS.md src/lib/curriculum/seed-a1.ts src/lib/curriculum/a1/roupa.ts src/lib/curriculum/scenarios-extended.ts src/lib/scenarios/library.ts src/test/a1-curriculum-content.test.ts
git commit -m "feat(curriculum): add A1 Roupa Unit"
```

---

## GitHub ticket publication order

Publish exactly five implementation tickets from Tasks 1 through 5. Put the blocker edge in each issue body and add the next issue only after recording the previous issue number. These tickets come from an approved plan and are agent-ready; do not run the incoming-request triage interview.

Each issue body uses four sections. Copy the task's **Why** paragraph into `## Why`. Copy its file list, interfaces, content table, exercise table, and Scenario changes into `## What`. Copy its **Acceptance** text and nine-gate command into `## Acceptance`. Write `None` for Viagens and `Blocked by #N` with the previous ticket's assigned number for each later `## Blocking edges` section.

## Plan self-review

- Spec coverage: source cleanup, five Unit sequence, module boundary, content contract, Scenario normalization, data flow, TDD, Prisma, full gates, tracker discipline, and Milestone deferral all map to tasks.
- Reserved-marker scan: no unresolved drafting markers or deferred implementation instructions remain.
- Type consistency: Unit exports, Unit IDs, child prefixes, Scenario IDs, prerequisite IDs, Vocabulary Item refs, Grammar Pattern refs, and anchor fields match `src/lib/curriculum/types.ts`.
- Dependency consistency: Viagens connects A0 to A1; each later Unit depends on the previous A1 Unit; every anchor target precedes its source.
- Scope consistency: five GitHub implementation tickets only; planning-source cleanup remains Task 0 on the planning branch.
