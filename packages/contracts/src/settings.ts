// Settings schemas — shared by @pt/api and @pt/web.
//
// Per CONTEXT.md "Settings", every settings column is server-side
// per-Learner and the only client-local state is device permission
// grants, ephemeral UI flags, and on-device recordings. The
// `partialSettingsSchema` is the body of `PATCH /api/me/settings`
// — every column is independently optional so the client can patch
// one column at a time.

import { z } from 'zod';

/** `0.5..2.0` audio playback speed. Phase A range; Phase C may keep it. */
export const audioSpeedSchema = z.number().min(0.5).max(2.0);

/** `1..5` repetitions per item in the Shadow queue. */
export const repetitionsSchema = z.number().int().min(1).max(5);

/** Discrete pause durations (ms) between repetitions. */
export const pauseMsSchema = z.union([
  z.literal(0),
  z.literal(500),
  z.literal(1000),
  z.literal(1500),
  z.literal(2000),
  z.literal(2500),
  z.literal(3000),
  z.literal(4000),
  z.literal(5000),
  z.literal(7000),
]);

export const textSizeSchema = z.enum(['small', 'default', 'large', 'extraLarge']);

export const sortOrderSchema = z.enum(['curriculum', 'easyToHard', 'hardToEasy']);

/** Full settings shape — what the API returns on `GET /api/me/settings`. */
export const settingsSchema = z.object({
  audioSpeed: audioSpeedSchema,
  repetitions: repetitionsSchema,
  pauseMs: pauseMsSchema,
  textSize: textSizeSchema,
  sortOrder: sortOrderSchema,
  loop: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

/** Partial settings — the body of `PATCH /api/me/settings`. */
export const partialSettingsSchema = settingsSchema.partial();

export type PartialSettings = z.infer<typeof partialSettingsSchema>;
