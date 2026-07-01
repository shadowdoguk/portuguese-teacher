/**
 * SrsService — the single seam through which every server-side SRS write
 * flows. Route handlers parse input + delegate; the service composes the
 * pure scheduler, the Prisma repository, and the typed `kind` carrier.
 *
 * Why one service:
 *  - removes the route handler's reach into `enrollItem` + scheduler +
 *    repository (route handlers now stay at ~30 lines each);
 *  - carries `kind` through a typed `EnrollItemInput`, killing the old
 *    `inferKindFromId(itemId)` "grammar-" prefix leak at its root;
 *  - moves the SrsItemSource tag write out of ScenarioRepository so partial
 *    scenario runs can record tags without going through a completion.
 */
import type { PrismaClient } from "@prisma/client";
import {
  applyRecall,
  dueQueue,
  enrollItem,
  isRecallGrade,
  type RecallGrade,
  type SrsItemKind,
  type SrsItemRef,
  type SrsItemSource,
  type SrsRecallEvent,
  type SrsReviewRecord,
  type SrsState,
} from "./index";
import { createSrsRepository, type SrsRepository } from "./repository";

export type EnrollItemInput = {
  kind: SrsItemKind;
  itemId: string;
  pt: string;
  gloss: string;
  unitId: string;
};

export type RecordRecallInput = {
  learnerId: string;
  itemId: string;
  kind: SrsItemKind;
  grade: RecallGrade;
  now?: number;
  enroll?: EnrollItemInput;
  refs?: ReadonlyArray<SrsItemRef>;
};

export type RecordRecallResult = {
  record: SrsReviewRecord;
  event: SrsRecallEvent;
  queue: ReadonlyArray<{ itemId: string; dueAt: number }>;
  enrolled: boolean;
};

export type SrsStateBundle = {
  state: SrsState;
  sources: ReadonlyArray<SrsItemSource>;
};

export type SrsService = {
  loadState(learnerId: string): Promise<SrsStateBundle>;
  recordRecall(input: RecordRecallInput): Promise<RecordRecallResult>;
  recordScenarioSources(
    learnerId: string,
    scenarioId: string,
    itemIds: ReadonlyArray<string>,
  ): Promise<number>;
  loadRecentEvents(learnerId: string, limit: number): Promise<ReadonlyArray<SrsRecallEvent>>;
};

export function createSrsService(prisma: PrismaClient): SrsService {
  const repo: SrsRepository = createSrsRepository(prisma);
  return {
    async loadState(learnerId) {
      const [state, sources] = await Promise.all([
        repo.loadState(learnerId),
        repo.loadScenarioSources(learnerId),
      ]);
      return { state, sources };
    },

    async recordRecall(input) {
      const now = typeof input.now === "number" ? input.now : Date.now();
      const bundle = await this.loadState(input.learnerId);
      let currentState = bundle.state;
      let enrolled = false;

      if (!currentState.items[input.itemId]) {
        if (!input.enroll) {
          throw new SrsServiceError(`Unknown SRS item: ${input.itemId}`, "UNKNOWN_ITEM");
        }
        if (input.enroll.itemId !== input.itemId) {
          throw new SrsServiceError("enroll.itemId must match itemId", "ENROLL_ID_MISMATCH");
        }
        currentState = enrollItem(
          currentState,
          {
            kind: input.enroll.kind,
            itemId: input.enroll.itemId,
            pt: input.enroll.pt,
            gloss: input.enroll.gloss,
            unitId: input.enroll.unitId,
          },
          now,
        );
        enrolled = true;
      }

      const schedulerResult = applyRecall(
        currentState,
        input.learnerId,
        input.itemId,
        input.grade,
        now,
      );

      const record = schedulerResult.record;
      const event = schedulerResult.event;

      await Promise.all([
        repo.writeRecord({
          learnerId: input.learnerId,
          itemId: input.itemId,
          kind: input.kind,
          record,
        }),
        repo.appendEvent({
          learnerId: input.learnerId,
          itemId: input.itemId,
          grade: input.grade,
          event,
        }),
      ]);

      const refs = input.refs ?? [];
      const queue =
        refs.length > 0
          ? dueQueue(schedulerResult.state, {
              refs,
              now,
              limit: 20,
            }).map((entry) => ({
              itemId: entry.ref.itemId,
              dueAt: entry.record.dueAt,
            }))
          : [];

      return { record, event, queue, enrolled };
    },

    async recordScenarioSources(learnerId, scenarioId, itemIds) {
      if (!scenarioId || scenarioId.length === 0) {
        throw new SrsServiceError("scenarioId is required", "MISSING_SCENARIO_ID");
      }
      const sources = itemIds
        .filter((itemId): itemId is string => typeof itemId === "string" && itemId.length > 0)
        .map((itemId) => ({ itemId, sourceScenarioId: scenarioId }));
      if (sources.length === 0) return 0;
      return repo.recordScenarioSources(learnerId, sources);
    },

    loadRecentEvents(learnerId, limit) {
      return repo.loadRecentEvents(learnerId, limit);
    },
  };
}

export class SrsServiceError extends Error {
  readonly code: SrsServiceErrorCode;
  constructor(message: string, code: SrsServiceErrorCode) {
    super(message);
    this.name = "SrsServiceError";
    this.code = code;
  }
}

export type SrsServiceErrorCode =
  | "INVALID_GRADE"
  | "INVALID_KIND"
  | "MISSING_FIELDS"
  | "UNKNOWN_ITEM"
  | "ENROLL_ID_MISMATCH"
  | "MISSING_SCENARIO_ID";

export function parseRecordRecallRequest(
  body: unknown,
):
  | { ok: true; value: RecordRecallInput }
  | { ok: false; error: string; code: SrsServiceErrorCode } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Missing JSON body", code: "MISSING_FIELDS" };
  }
  const raw = body as Record<string, unknown>;
  const learnerId = typeof raw.learnerId === "string" ? raw.learnerId.trim() : "";
  const itemId = typeof raw.itemId === "string" ? raw.itemId.trim() : "";
  const gradeRaw = typeof raw.grade === "string" ? raw.grade.trim() : "";
  const kindRaw = typeof raw.kind === "string" ? raw.kind.trim() : "";
  if (!learnerId || !itemId || !gradeRaw || !kindRaw) {
    return {
      ok: false,
      error: "Missing learnerId / itemId / kind / grade",
      code: "MISSING_FIELDS",
    };
  }
  if (kindRaw !== "vocabulary" && kindRaw !== "grammar") {
    return { ok: false, error: "Invalid kind", code: "INVALID_KIND" };
  }
  if (!isRecallGrade(gradeRaw)) {
    return { ok: false, error: "Invalid grade", code: "INVALID_GRADE" };
  }
  const enroll: EnrollItemInput | undefined =
    typeof raw.pt === "string" && typeof raw.gloss === "string" && typeof raw.unitId === "string"
      ? {
          kind: kindRaw,
          itemId,
          pt: raw.pt,
          gloss: raw.gloss,
          unitId: raw.unitId,
        }
      : undefined;

  const refs = Array.isArray(raw.refs) ? (raw.refs as ReadonlyArray<SrsItemRef>) : undefined;
  const now = typeof raw.timestamp === "number" ? raw.timestamp : undefined;

  return {
    ok: true,
    value: {
      learnerId,
      itemId,
      kind: kindRaw,
      grade: gradeRaw,
      enroll,
      ...(refs ? { refs } : {}),
      ...(typeof now === "number" ? { now } : {}),
    },
  };
}
