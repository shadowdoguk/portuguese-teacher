import { useEffect, useState } from 'react';
import { settingsSchema, type Settings } from '@pt/contracts';
import { apiClient, ApiError, type ApiClient } from '../api/client';

const PAUSE_OPTIONS: ReadonlyArray<number> = [0, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000];
const TEXT_SIZES: ReadonlyArray<Settings['textSize']> = ['small', 'default', 'large', 'extraLarge'];
const SORT_ORDERS: ReadonlyArray<Settings['sortOrder']> = ['curriculum', 'easyToHard', 'hardToEasy'];

export interface SettingsPageProps {
  /** Override the API client for testing. Defaults to the shared
   *  `apiClient` instance. */
  readonly client?: ApiClient;
}

export default function SettingsPage({ client = apiClient }: SettingsPageProps = {}): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initial GET — load the row (defaults materialise server-side on
  // first access; per CONTEXT.md "Settings" the only client-local
  // state is device permission grants, ephemeral UI flags, and on-
  // device recordings).
  useEffect(() => {
    let cancelled = false;
    client
      .get<Settings>('/api/me/settings')
      .then((res) => {
        if (cancelled) return;
        setSettings(settingsSchema.parse(res));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setLoadError(`${err.code}: ${err.message}`);
        } else {
          setLoadError('Network error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  async function submitSave(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveError(null);
    try {
      // PATCH /api/me/settings — uses the same `client` so tests
      // can drive both routes from one mock.
      const next = await client.patch<Settings>('/api/me/settings', settings);
      setSettings(settingsSchema.parse(next));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSaveError(`${err.code}: ${err.message}`);
      } else {
        setSaveError(err instanceof Error ? err.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <main>
        <h1>Settings</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }

  if (!settings) {
    return (
      <main>
        <h1>Settings</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Settings</h1>
      <form onSubmit={(e) => void submitSave(e)}>
        <label>
          Audio speed ({settings.audioSpeed.toFixed(2)}×)
          <input
            type="number"
            step={0.05}
            min={0.5}
            max={2.0}
            value={settings.audioSpeed}
            onChange={(e) =>
              setSettings({
                ...settings,
                audioSpeed: Number.parseFloat(e.target.value),
              })
            }
          />
        </label>
        <label>
          Repetitions
          <input
            type="number"
            min={1}
            max={5}
            value={settings.repetitions}
            onChange={(e) =>
              setSettings({
                ...settings,
                repetitions: Number.parseInt(e.target.value, 10),
              })
            }
          />
        </label>
        <label>
          Pause (ms)
          <select
            value={settings.pauseMs}
            onChange={(e) =>
              setSettings({
                ...settings,
                pauseMs: Number.parseInt(e.target.value, 10),
              })
            }
          >
            {PAUSE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Text size
          <select
            value={settings.textSize}
            onChange={(e) =>
              setSettings({
                ...settings,
                textSize: e.target.value as Settings['textSize'],
              })
            }
          >
            {TEXT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort order
          <select
            value={settings.sortOrder}
            onChange={(e) =>
              setSettings({
                ...settings,
                sortOrder: e.target.value as Settings['sortOrder'],
              })
            }
          >
            {SORT_ORDERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loop
          <input
            type="checkbox"
            checked={settings.loop}
            onChange={(e) => setSettings({ ...settings, loop: e.target.checked })}
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saveError && <p role="alert">{saveError}</p>}
      </form>
    </main>
  );
}