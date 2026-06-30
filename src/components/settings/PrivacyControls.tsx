"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useSettings } from "@/lib/settings";
import {
  buildExportPayload,
  exportFilename,
  exportPayloadAsString,
  type ExportPayload,
} from "@/lib/settings";
import {
  DELETION_WINDOW_DAYS,
  cancelDeletionRequest,
  formatDeletionCountdown,
  loadDeletionRequest,
  recordDeletionRequest,
  type DeletionRequest,
} from "@/lib/settings";
import { Card } from "@/components/ui/Card";

export function PrivacyControls() {
  const { user } = useAuth();
  const { settings, update } = useSettings();
  const [deletion, setDeletion] = useState<DeletionRequest | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date(0));

  useEffect(() => {
    if (!user) {
      setDeletion(null);
      setNow(new Date());
      return;
    }
    setDeletion(loadDeletionRequest(user.id));
    setNow(new Date());
  }, [user]);

  const handleExport = useCallback(() => {
    if (!user) return;
    setExportError(null);
    try {
      const payload: ExportPayload = buildExportPayload({
        learner: user,
        settings,
        deletionRequested: deletion,
        now,
      });
      const data = exportPayloadAsString(payload);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFilename(new Date());
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (cause) {
      setExportError(
        cause instanceof Error ? cause.message : "Could not generate export.",
      );
    }
  }, [user, settings, deletion, now]);

  function handleRequestDeletion() {
    if (!user) return;
    const request = recordDeletionRequest(user.id);
    setDeletion(request);
    setConfirming(false);
  }

  function handleCancelDeletion() {
    if (!user) return;
    cancelDeletionRequest(user.id);
    setDeletion(null);
  }

  function handleSc5OptOutToggle(): void {
    update({ sc5OptOut: !settings.sc5OptOut });
  }

  if (!user) {
    return (
      <Card eyebrow="Privacy" title="Sign in to manage privacy">
        <p className="text-sm text-ink-soft">
          Once you have an account you can export everything we hold on you or
          request deletion — within {DELETION_WINDOW_DAYS} days.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card eyebrow="Data export" title="Take your data with you">
        <p className="text-sm text-ink-soft">
          Exports your profile, settings, assessment attempts, and any deletion
          requests as a single JSON file. Schema version is included so future
          versions can migrate.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleExport} className="btn-primary">
            Download JSON export
          </button>
          {exportError ? (
            <p role="alert" className="text-sm text-terracotta-deep">
              {exportError}
            </p>
          ) : null}
        </div>
      </Card>

      <Card eyebrow="Audio sampling" title="SC-5 Sampling Buffer">
        <p className="text-sm text-ink-soft">
          The platform maintains a separate audio path (SC-5 Sampling Buffer)
          that captures roughly 1 % of voice-loop utterances to measure
          production speech-recognition accuracy. The buffer is decoupled from
          your account — no learner identifier is stored — and every sample is
          hard-deleted within 24 hours. See{" "}
          <code className="rounded bg-paper-warm/60 px-1 py-0.5 text-xs">
            docs/agents/sc5-gdpr-review.md
          </code>{" "}
          for the privacy review.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.sc5OptOut}
              onChange={handleSc5OptOutToggle}
              data-testid="sc5-opt-out"
            />
            <span>Opt out of SC-5 sampling</span>
          </label>
          <span
            className="pill"
            data-testid="sc5-status"
            data-state={settings.sc5OptOut ? "opted-out" : "active"}
          >
            {settings.sc5OptOut ? "Opted out" : "Active (1 % sample)"}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-mute">
          Required for jurisdictions (DE under BDSG, FR under CNIL guidance)
          that mandate explicit consent for ephemeral audio capture.
          Toggling suppresses every SC-5 write for your account; the SLI
          dashboard records the suppression.
        </p>
      </Card>

      <Card eyebrow="Account deletion" title="Delete your account and data">
        {deletion ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              Deletion requested on{" "}
              <strong>{new Date(deletion.requestedAt).toLocaleDateString()}</strong>.
              Your account and all associated data will be removed within{" "}
              <strong>{formatDeletionCountdown(deletion.completesBy, now)}</strong>{" "}
              (target {new Date(deletion.completesBy).toLocaleDateString()}).
            </p>
            <p className="text-xs text-ink-mute">
              You can cancel this request any time before it completes.
            </p>
            <button type="button" onClick={handleCancelDeletion} className="btn-ghost">
              Cancel deletion request
            </button>
          </div>
        ) : confirming ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              Are you sure? Deletion removes your profile, settings, attempts,
              and any stored recordings. We will complete the deletion within{" "}
              {DELETION_WINDOW_DAYS} days. You can cancel in the meantime.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleRequestDeletion} className="btn-primary">
                Yes, request deletion
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn-ghost"
              >
                Keep my account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              Request deletion and we will remove your account and all
              associated data within {DELETION_WINDOW_DAYS} days, in line with
              FR-DATA-3.
            </p>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="btn-ghost"
            >
              Request deletion…
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
