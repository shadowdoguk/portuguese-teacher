# A1 Curriculum Production Week Design

**Date:** 2026-07-17
**Status:** Approved
**Primary references:** `CONTEXT.md`, ADR-0001, ADR-0003, ADR-0005, `docs/requirements/portuguese-teacher-requirements.md` FR-LP-1

## Goal

Ship five production-ready A1 Units in five sequential, reviewable issues:

1. Complete `a1-1-viagens`.
2. Complete `a1-2-alimentacao`.
3. Add `a1-2-mercearia`.
4. Add `a1-2-saude`.
5. Add `a1-3-roupa`.

The first two issues replace shipped stubs. The final three issues author Unit IDs that the Scenario Library already references. At the end of the week, A1 contains five production-ready Units, which meets FR-LP-1's range of 4 to 8 Units per Level.

## Non-goals

This week will not:

- Author `a1-4-familia` or `a1-5-rotinas`.
- Add the A1 to A2 Milestone before the final A1 sequence is known.
- Expand A2 or B1 Lesson Material.
- Backfill references for every Scenario in the Scenario Library.
- Change curriculum runtime behavior, Prisma models, the SRS Service, or the Voice Loop.
- Introduce a new content schema or authoring framework.

## Planning source-of-truth cleanup

Before the first content issue starts, the planning change will:

- Remove the stray `<<<<<<< HEAD` marker at `CONTEXT.md:57` while preserving the Observability Sink glossary entry.
- Move authenticated LHCI from ADR-0005's deferred table into the shipped launch surface with PR #149 as evidence.
- Check the authenticated Learner fixture and cookie readiness item in ADR-0005 §2.
- Remove the stale authenticated-LHCI entry from the active Blockers section in `PROGRESS.md`.

These edits reconcile the repository documents with `HANDOFF.md` and the green Lighthouse workflow. They do not change product behavior.

## Delivery model

Create five GitHub issues with explicit blocking edges. Work them in order. Each issue uses a branch named `feat/issue-<N>-<slug>` and produces one independently reviewable Unit.

| Day | Issue | Depends on | Outcome |
| --- | --- | --- | --- |
| 1 | Complete the A1 Viagens Unit | None | Replace the `a1-1-viagens` stub with production Lesson Material and establish the reusable A1 content tests. |
| 2 | Complete the A1 Alimentação Unit | Day 1 | Replace the `a1-2-alimentacao` stub and preserve the linear A1 prerequisite path. |
| 3 | Add the A1 Mercearia Unit | Day 2 | Add order 3, rehome clearly grocery-focused Scenarios, and wire local references. |
| 4 | Add the A1 Saúde Unit | Day 3 | Add order 4, rehome the A1 medical Scenarios, and wire local references. |
| 5 | Add the A1 Roupa Unit | Day 4 | Add order 5, rehome the A1 clothing Scenarios, and wire local references. |

The blocker chain keeps Unit order, prerequisites, Scenario assignments, and daily reviews aligned. Each merged issue leaves the Curriculum valid.

## Unit module boundary

Store each Unit in a focused module:

```text
src/lib/curriculum/
├── seed-a1.ts
└── a1/
    ├── viagens.ts
    ├── alimentacao.ts
    ├── mercearia.ts
    ├── saude.ts
    └── roupa.ts
```

`seed-a1.ts` remains the public composer. It imports the Unit constants, orders them, and exports `A1_CURRICULUM`. Existing consumers keep the same import and data shape.

Each module owns one Unit's:

- Lessons
- Vocabulary Items
- Grammar Patterns
- Scenario lookup through `scenariosForUnit(unitId)`
- Remedial Anchors

This split changes file layout, not the `Unit` interface.

## Production-ready Unit contract

Each Unit must contain:

- Exactly 3 complete Lessons for this weekly slice, within FR-LP-1's allowed range of 3 to 8.
- A Lesson introduction, Lesson body blocks, and varied Practice Exercises.
- At least 2 Practice Exercises per Lesson.
- At least 3 Practice Exercise kinds across the Unit.
- 8 to 12 Vocabulary Items with pt-PT forms and English glosses.
- 1 or 2 Grammar Patterns with pt-PT examples and English glosses.
- Existing or rehomed Scenarios from the Scenario Library.
- 1 or 2 Remedial Anchors that point to an earlier Unit.

Lesson Material must stay within CEFR A1. Portuguese text must use pt-PT vocabulary, spelling, and usage.

### Identifier convention

Keep the existing Unit IDs because the Scenario Library already uses them. Assign canonical order through the `order` field:

| Unit ID | Order | Prerequisite |
| --- | ---: | --- |
| `a1-1-viagens` | 1 | `a0-4-rotina-e-horas` |
| `a1-2-alimentacao` | 2 | `a1-1-viagens` |
| `a1-2-mercearia` | 3 | `a1-2-alimentacao` |
| `a1-2-saude` | 4 | `a1-2-mercearia` |
| `a1-3-roupa` | 5 | `a1-2-saude` |

Use the full Unit ID as the prefix for new child IDs. `A1_CURRICULUM` remains a Level slice; tests compose it with `A0_CURRICULUM` before running full Curriculum invariants. The `a0-4-rotina-e-horas` prerequisite makes A1 reachable from the canonical entry Unit and makes A0-targeting Remedial Anchors valid.

For example:

```text
a1-2-mercearia-l1-produtos
a1-2-mercearia-v-queijo
a1-2-mercearia-g-quantidade-de
```

This avoids collisions caused by the repeated `a1-2` prefix.

## Content outline

### Day 1: Viagens

- Lessons: airport check-in, hotel check-in, directions and transport.
- Vocabulary: flight, passport, boarding pass, gate, luggage, window, aisle, reservation, breakfast, and direction phrases.
- Grammar: `ter de` plus infinitive; polite requests with `queria`.
- Remedial Anchors: `a0-4-rotina-e-horas` for times and numbers; `a0-3-cafe-pedidos` for polite requests.
- Keep existing Scenario wiring. Later issues rehome medical, grocery, and clothing Scenarios when their target Units exist.

### Day 2: Alimentação

- Lessons: restaurant interaction, reading an `ementa`, paying and asking for the bill.
- Vocabulary: `ementa`, `prato do dia`, `entrada`, `sobremesa`, `conta`, `gorjeta`, `multibanco`, `dinheiro`, `reserva`, and `mesa`.
- Grammar: polite requests; present tense of `pedir`, `querer`, and `pagar`.
- Remedial Anchors: `a0-3-cafe-pedidos` for ordering; `a0-4-rotina-e-horas` for prices and quantities.

### Day 3: Mercearia

- Lessons: grocery products, weights and quantities, payment.
- Vocabulary: `queijo`, `enchido`, `presunto`, `azeite`, `meio quilo`, `duzentos gramas`, `embrulhar`, `balança`, and `preço`.
- Grammar: `queria` plus quantity plus `de` plus noun.
- Remedial Anchor: `a1-2-alimentacao` for polite requests.
- Rehome grocery-focused Scenarios currently assigned to Alimentação where the goal and language match Mercearia.

### Day 4: Saúde

- Lessons: booking an appointment, describing symptoms, using a pharmacy.
- Vocabulary: `consulta`, `médico`, `dor de cabeça`, `febre`, `tosse`, `cansaço`, `remédio`, `receita`, `posologia`, and `comprimido`.
- Grammar: `ter dor de`; `estar com`; duration with `há`.
- Remedial Anchors: `a1-2-alimentacao` for polite openings; `a0-4-rotina-e-horas` for duration and appointment times.
- Rehome the A1 medical Scenarios currently assigned to Viagens.

### Day 5: Roupa

- Lessons: clothing items, colors and sizes, trying on and buying.
- Vocabulary: `camisola`, `calças`, `saia`, `vestido`, `tamanho`, `cor`, `experimentar`, `balcão`, and `caixa`.
- Grammar: demonstratives; asking whether an item exists in a color or size.
- Remedial Anchors: `a1-2-mercearia` for transactional questions; `a1-2-alimentacao` for polite requests.
- Rehome the A1 clothing Scenarios currently assigned to Alimentação.

## Scenario rules

Each issue may change a Scenario's `unitId` when its goal and language match the new Unit better than the old compressed assignment.

For every non-empty `vocabularyRefs` or `grammarRefs` array on a Scenario assigned to a seeded Unit:

- The referenced ID must exist in that Unit.
- The reference must support language used in the Scenario.
- Rehomed Scenarios must not retain references to the previous Unit.

Empty legacy reference arrays remain valid. This week adds local references to Scenarios that an issue introduces or rehomes. A later Scenario Library pass can backfill the untouched legacy arrays.

## Data flow

The change uses the existing path:

```text
Unit module
  -> A1_CURRICULUM in seed-a1.ts
  -> prisma/seed.ts
  -> Unit, Lesson, VocabularyItem, GrammarPattern, Scenario, and RemedialAnchor rows
  -> existing Curriculum and Lesson runtime readers
```

No API contract changes. Invalid static content fails during tests and seed verification.

## Test design

Day 1 adds a reusable A1 production-content contract test. Each later issue adds its Unit to the same table-driven suite.

The tests verify:

- Unit IDs, order, and prerequisite chain.
- 3 Lessons per target Unit.
- Lesson body and Practice Exercise minimums.
- 8 to 12 Vocabulary Items and 1 or 2 Grammar Patterns.
- Child references resolve to their declaring Unit.
- Non-empty Scenario vocabulary and grammar references resolve to the assigned Unit.
- Remedial Anchors remain acyclic and point backward.
- The combined Curriculum passes existing DAG, reachability, and order invariants.
- Portuguese Lesson Material contains no known pt-BR-only markers.
- Prisma round-trip counts and relationships include each completed Unit.

Each issue follows red, green, refactor:

1. Add the failing Unit contract and Scenario assignment assertions.
2. Add or complete the Unit content.
3. Normalize touched Scenario assignments and references.
4. Run targeted curriculum and Prisma tests.
5. Run all repository gates.

## Required gates

Before an issue is complete:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm perf:budget
pnpm test:a11y
pnpm asr:regress
pnpm sc5:load-test
pnpm test:e2e:chromium
```

## Tracker and progress discipline

Create each GitHub issue with Why, What, Acceptance, and blocking edges. Tickets produced from this approved plan are agent-ready and do not pass through the incoming-issue triage flow. Update `PROGRESS.md` when issues are created, started, completed, or blocked.

The week succeeds when:

- All five issues exist with explicit dependencies.
- Each completed issue passes its acceptance criteria and all required gates.
- The first issue starts after ticket creation.
- Five production-ready A1 Units exist if the timebox completes.
- Work that does not fit remains in dependency order for the next session rather than expanding a daily issue.
