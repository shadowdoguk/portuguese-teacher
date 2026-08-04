// Apply stage page — language islands.
//
// Per CONTEXT.md "Six-Stage Unit Loop" + "Language Island", the
// Apply stage surfaces the unit's islands list (sourced from
// `GET /api/curriculum/units/:unitId`). Phase B ships the stub +
// the AudioComingSoon placeholder + the "Mark complete" button;
// Phase C back-fills audio rows for the island sentences.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, ApiError, type ApiClient } from '../api/client';
import AudioComingSoon from '../components/AudioComingSoon';

export interface ApplyPageProps {
  readonly client?: ApiClient;
}

interface UnitIsland {
  islandId: string;
  title: string;
  // Phase A doesn't yet have a `kind` discriminator on islands;
  // the field is reserved for Phase C's bundle taxonomy.
  kind?: string;
  items?: ReadonlyArray<{ sentenceId: string; textPt: string; textEn: string }>;
}

interface UnitDetailShape {
  unitId: string;
  islands?: ReadonlyArray<UnitIsland>;
}

export default function ApplyPage({ client = apiClient }: ApplyPageProps = {}) {
  const { unitId } = useParams<{ unitId: string }>();
  const [unit, setUnit] = useState<UnitDetailShape | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    client
      .get<unknown>(`/api/curriculum/units/${encodeURIComponent(unitId)}`)
      .then((res) => {
        if (cancelled) return;
        const parsed = parseUnit(res);
        setUnit(parsed);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setLoadError(`${err.code}: ${err.message}`);
        else setLoadError('Network error');
      });
    return () => {
      cancelled = true;
    };
  }, [client, unitId]);

  async function markComplete(): Promise<void> {
    if (!unitId) return;
    setBusy(true);
    setMarkError(null);
    try {
      await client.post(`/api/unit-progress/${encodeURIComponent(unitId)}/apply`, {
        status: 'complete',
      });
      setCompleted(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setMarkError(`${err.code}: ${err.message}`);
      else setMarkError('Mark failed');
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main>
        <h1>Apply</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Apply</h1>
      {unit?.islands?.length ? (
        unit.islands.map((island) => (
          <section key={island.islandId}>
            <h2>{island.title}</h2>
            {island.kind ? <p><em>{island.kind}</em></p> : null}
            <ol>
              {island.items?.map((s) => (
                <li key={s.sentenceId}>
                  <strong>{s.textPt}</strong> — {s.textEn}
                </li>
              ))}
            </ol>
            <AudioComingSoon />
          </section>
        ))
      ) : (
        <p>Loading…</p>
      )}
      <button type="button" onClick={() => void markComplete()} disabled={busy || completed}>
        {completed ? 'Completed ✓' : busy ? 'Saving…' : 'Mark complete'}
      </button>
      {markError && <p role="alert">{markError}</p>}
      <p>
        <Link to={`/units/${unitId}/communicate`}>Next: Communicate →</Link>
      </p>
    </main>
  );
}

function parseUnit(res: unknown): UnitDetailShape {
  if (
    typeof res === 'object' &&
    res !== null &&
    'unitId' in res &&
    typeof (res as { unitId: unknown }).unitId === 'string'
  ) {
    const raw = res as { unitId: string; islands?: unknown };
    const islands = Array.isArray(raw.islands) ? (raw.islands as UnitIsland[]) : [];
    return { unitId: raw.unitId, islands };
  }
  return { unitId: '' };
}