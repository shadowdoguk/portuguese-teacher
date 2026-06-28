import type { ErrorCategory, FeedbackItem, VoiceLoopLLMPayload, VoiceLoopTurn } from "./types";

export class StructuredOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuredOutputError";
  }
}

const VALID_ERROR_CATEGORIES: ReadonlySet<ErrorCategory> = new Set<ErrorCategory>([
  "grammar.tense",
  "grammar.gender",
  "grammar.agreement",
  "phoneme.confusion",
  "lexical.choice",
  "register",
  "fluency.hesitation",
]);

export function parseStructuredOutput(text: string): VoiceLoopLLMPayload {
  const trimmed = text.trim();
  const candidate = extractFirstJsonObject(trimmed);
  if (!candidate) {
    throw new StructuredOutputError("LLM output did not contain a JSON object");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    throw new StructuredOutputError(`LLM output was not valid JSON: ${(error as Error).message}`);
  }
  return validatePayload(parsed);
}

function extractFirstJsonObject(text: string): string | null {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < text.length; i += 1) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(firstBrace, i + 1);
    }
  }
  return null;
}

function validatePayload(value: unknown): VoiceLoopLLMPayload {
  if (!isObject(value)) {
    throw new StructuredOutputError("Payload root must be a JSON object");
  }
  const { nlu, utterance, feedback, difficulty_estimate, comprehension_ok } = value;
  if (!isObject(nlu)) {
    throw new StructuredOutputError("Payload missing `nlu` object");
  }
  const intent = stringField(nlu, "intent", "nlu");
  const slots = objectField(nlu, "slots", "nlu");
  const grammarFeatures = stringArrayField(nlu, "grammar_features", "nlu");
  const errorCategories = arrayField(nlu, "error_categories", "nlu")
    .map((entry) => coerceErrorCategory(entry))
    .filter((entry): entry is ErrorCategory => entry !== null);

  if (typeof utterance !== "string" || utterance.length === 0) {
    throw new StructuredOutputError("Payload missing `utterance` string");
  }
  if (typeof difficulty_estimate !== "number" || !Number.isFinite(difficulty_estimate)) {
    throw new StructuredOutputError("Payload missing numeric `difficulty_estimate`");
  }
  if (typeof comprehension_ok !== "boolean") {
    throw new StructuredOutputError("Payload missing boolean `comprehension_ok`");
  }
  const validatedFeedback = Array.isArray(feedback)
    ? feedback.map(coerceFeedbackItem).filter((item): item is FeedbackItem => item !== null)
    : [];

  return {
    nlu: {
      intent,
      slots: Object.fromEntries(
        Object.entries(slots).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      grammarFeatures,
      errorCategories,
    },
    utterance,
    feedback: validatedFeedback,
    difficulty_estimate,
    comprehension_ok,
  };
}

function coerceErrorCategory(value: unknown): ErrorCategory | null {
  if (typeof value !== "string") return null;
  return VALID_ERROR_CATEGORIES.has(value as ErrorCategory) ? (value as ErrorCategory) : null;
}

function coerceFeedbackItem(value: unknown): FeedbackItem | null {
  if (!isObject(value)) return null;
  const kind = value.kind;
  if (kind !== "corrective" && kind !== "confirmatory" && kind !== "formative") {
    return null;
  }
  const text = value.text;
  if (typeof text !== "string" || text.length === 0) return null;
  const item: FeedbackItem = { kind, text };
  if (
    isObject(value.span) &&
    typeof value.span.start === "number" &&
    typeof value.span.end === "number"
  ) {
    item.span = { start: value.span.start, end: value.span.end };
  }
  if (
    typeof value.errorCategory === "string" &&
    VALID_ERROR_CATEGORIES.has(value.errorCategory as ErrorCategory)
  ) {
    item.errorCategory = value.errorCategory as ErrorCategory;
  }
  return item;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(obj: Record<string, unknown>, key: string, parent: string): string {
  const value = obj[key];
  if (typeof value !== "string") {
    throw new StructuredOutputError(`\`${parent}.${key}\` must be a string`);
  }
  return value;
}

function objectField(
  obj: Record<string, unknown>,
  key: string,
  parent: string,
): Record<string, unknown> {
  const value = obj[key];
  if (!isObject(value)) {
    throw new StructuredOutputError(`\`${parent}.${key}\` must be an object`);
  }
  return value;
}

function stringArrayField(obj: Record<string, unknown>, key: string, parent: string): string[] {
  const value = obj[key];
  if (!Array.isArray(value)) {
    throw new StructuredOutputError(`\`${parent}.${key}\` must be an array`);
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function arrayField(obj: Record<string, unknown>, key: string, parent: string): unknown[] {
  const value = obj[key];
  if (!Array.isArray(value)) {
    throw new StructuredOutputError(`\`${parent}.${key}\` must be an array`);
  }
  return value;
}

export function payloadToTurn(
  payload: VoiceLoopLLMPayload,
  overrides: {
    turnId: string;
    utteranceId: string;
    generatedAt: number;
    mock: boolean;
    pronunciationScore: number;
    fluencyMsPerWord?: number;
  },
): VoiceLoopTurn {
  return {
    turnId: overrides.turnId,
    utteranceId: overrides.utteranceId,
    teacherUtterance: payload.utterance,
    feedback: payload.feedback,
    pronunciationScore: overrides.pronunciationScore,
    nextDifficultyTarget: payload.difficulty_estimate,
    comprehensionOk: payload.comprehension_ok,
    ...(typeof overrides.fluencyMsPerWord === "number"
      ? { fluencyMsPerWord: overrides.fluencyMsPerWord }
      : {}),
    generatedAt: overrides.generatedAt,
    mock: overrides.mock,
  };
}
