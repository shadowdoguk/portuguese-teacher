import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DELETION_STORAGE_PREFIX,
  DELETION_WINDOW_DAYS,
  applySettingsPatch,
  buildExportPayload,
  cancelDeletionRequest,
  clearSettings,
  clampVoiceSpeed,
  clampWeeklyGoal,
  exportFilename,
  exportPayloadAsString,
  formatDeletionCountdown,
  loadDeletionRequest,
  loadSettings,
  recordDeletionRequest,
  saveSettings,
  settingsStorageKey,
  DEFAULT_SETTINGS,
} from "@/lib/settings";

describe("settings store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns defaults when no settings are stored", () => {
    const settings = loadSettings("user-1");
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when JSON is malformed", () => {
    window.localStorage.setItem(settingsStorageKey("user-1"), "{not json");
    expect(loadSettings("user-1")).toEqual(DEFAULT_SETTINGS);
  });

  it("persists per-user", () => {
    saveSettings("user-1", { ...DEFAULT_SETTINGS, voiceSpeed: 1.15 });
    saveSettings("user-2", { ...DEFAULT_SETTINGS, voiceSpeed: 0.85 });

    expect(loadSettings("user-1").voiceSpeed).toBe(1.15);
    expect(loadSettings("user-2").voiceSpeed).toBe(0.85);
  });

  it("clamps values loaded from storage", () => {
    window.localStorage.setItem(
      settingsStorageKey("user-1"),
      JSON.stringify({ voiceSpeed: 99, weeklyGoalMinutes: -10 }),
    );

    const settings = loadSettings("user-1");
    expect(settings.voiceSpeed).toBeLessThanOrEqual(1.25);
    expect(settings.weeklyGoalMinutes).toBeGreaterThanOrEqual(50);
  });

  it("clears settings for a user", () => {
    saveSettings("user-1", { ...DEFAULT_SETTINGS, voiceRecordingOptIn: true });
    clearSettings("user-1");
    expect(loadSettings("user-1")).toEqual(DEFAULT_SETTINGS);
  });
});

describe("settings clamps", () => {
  it("clamps voice speed to range", () => {
    expect(clampVoiceSpeed(2)).toBe(1.25);
    expect(clampVoiceSpeed(0)).toBe(0.75);
    expect(clampVoiceSpeed(Number.NaN)).toBe(DEFAULT_SETTINGS.voiceSpeed);
  });

  it("clamps weekly goal to range", () => {
    expect(clampWeeklyGoal(9999)).toBe(300);
    expect(clampWeeklyGoal(-100)).toBe(50);
    expect(clampWeeklyGoal(Number.NaN)).toBe(DEFAULT_SETTINGS.weeklyGoalMinutes);
  });

  it("applies patches with clamping", () => {
    const next = applySettingsPatch(DEFAULT_SETTINGS, {
      voiceSpeed: 9,
      weeklyGoalMinutes: 0,
    });
    expect(next.voiceSpeed).toBe(1.25);
    expect(next.weeklyGoalMinutes).toBe(50);
  });
});

describe("export payload", () => {
  it("builds a schema-versioned payload", () => {
    const learner = {
      id: "learner-1",
      name: "Test",
      email: "t@test.app",
      dialect: "pt-PT" as const,
      level: "A0" as const,
      streakDays: 1,
      weeklyMinutes: 0,
      createdAt: "2026-06-01T00:00:00.000Z",
    };
    const payload = buildExportPayload({
      learner,
      settings: DEFAULT_SETTINGS,
      deletionRequested: null,
      now: new Date("2026-06-27T12:00:00.000Z"),
    });
    expect(payload.schema).toBe("portuguese-teacher/export");
    expect(payload.schemaVersion).toBe(1);
    expect(payload.exportedAt).toBe("2026-06-27T12:00:00.000Z");
    expect(payload.learner.id).toBe("learner-1");
    expect(payload.settings).toEqual(DEFAULT_SETTINGS);
    expect(payload.deletionRequested).toBeNull();
  });

  it("includes attempts and referrals when supplied", () => {
    const payload = buildExportPayload({
      learner: {
        id: "l1",
        name: "n",
        email: "e",
        dialect: "pt-PT",
        level: "A0",
        streakDays: 0,
        weeklyMinutes: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      settings: DEFAULT_SETTINGS,
      attempts: [{ id: "a1" }],
      referrals: [{ id: "r1" }],
    });
    expect(payload.attempts).toEqual([{ id: "a1" }]);
    expect(payload.referrals).toEqual([{ id: "r1" }]);
  });

  it("serialises payload as JSON string", () => {
    const payload = buildExportPayload({
      learner: {
        id: "l1",
        name: "n",
        email: "e",
        dialect: "pt-PT",
        level: "A0",
        streakDays: 0,
        weeklyMinutes: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      settings: DEFAULT_SETTINGS,
    });
    const json = exportPayloadAsString(payload);
    expect(JSON.parse(json).schema).toBe("portuguese-teacher/export");
  });

  it("produces a stable filename with timestamp", () => {
    const name = exportFilename(new Date("2026-06-27T10:30:00.000Z"));
    expect(name).toMatch(/^portuguese-teacher-export-2026-06-27T10-30-00-000Z\.json$/);
  });
});

describe("deletion request", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("records and loads a request with a 30-day window", () => {
    const now = new Date("2026-06-27T00:00:00.000Z");
    const request = recordDeletionRequest("user-1", now);
    expect(request.requestedAt).toBe(now.toISOString());
    const expected = new Date(now.getTime() + DELETION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    expect(request.completesBy).toBe(expected.toISOString());
    expect(loadDeletionRequest("user-1")).toEqual(request);
  });

  it("cancels a request", () => {
    recordDeletionRequest("user-1");
    cancelDeletionRequest("user-1");
    expect(loadDeletionRequest("user-1")).toBeNull();
  });

  it("ignores malformed payloads", () => {
    window.localStorage.setItem(
      `${DELETION_STORAGE_PREFIX}user-1`,
      JSON.stringify({ requestedAt: 123 }),
    );
    expect(loadDeletionRequest("user-1")).toBeNull();
  });

  it("formats the countdown with correct pluralisation", () => {
    expect(
      formatDeletionCountdown(
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    ).toMatch(/^\d+ days?$/);
    expect(
      formatDeletionCountdown(new Date(Date.now() - 1000).toISOString()),
    ).toBe("scheduled");
  });
});
