// Communicate stage page — AI role-play stub.
//
// Per CONTEXT.md "Six-Stage Unit Loop" + SPEC §13, the
// Communicate stage surfaces the unit's conversation scenarios.
// Phase D wires the AI role-play (MiniMax or OpenAI per the
// rebuild spec's §4 row); Phase B ships the read-only stub +
// scenario list.
//
// The page does NOT include a "Mark complete" button — Phase D
// owns the completion semantics (a scenario finishes when the
// learner completes the conversation session). Phase B reports
// the stage's `completedAt` via the unit-progress API once the
// session end hook lands in Task 8's unit-progress surface.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, ApiError, type ApiClient } from '../api/client';

export interface CommunicatePageProps {
  readonly client?: ApiClient;
}

interface Scenario {
  scenarioId: string;
  title: string;
  // The unit detail response embeds the learner objective as
  // `learnerObjective`; we surface it as the "objective" field
  // the Task 8 spec uses.
  learnerObjective?: string;
}

interface UnitDetailShape {
  unitId: string;
  scenarios?: ReadonlyArray<Scenario>;
}

export default function CommunicatePage({ client = apiClient }: CommunicatePageProps = {}) {
  const { unitId } = useParams<{ unitId: string }>();
  const [unit, setUnit] = useState<UnitDetailShape | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    client
      .get<unknown>(`/api/curriculum/units/${encodeURIComponent(unitId)}`)
      .then((res) => {
        if (cancelled) return;
        setUnit(parseUnit(res));
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

  if (loadError) {
    return (
      <main>
        <h1>Communicate</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }

  const scenarios = unit?.scenarios ?? [];

  return (
    <main>
      <h1>Communicate</h1>
      <p>
        Phase D will add the AI role-play for each scenario below. The stub
        does not call any external provider.
      </p>
      {scenarios.length === 0 ? (
        <p>Loading…</p>
      ) : (
        <ul aria-label="Scenarios">
          {scenarios.map((s) => (
            <li key={s.scenarioId}>
              <strong>{s.title}</strong>
              {s.learnerObjective ? <> — {s.learnerObjective}</> : null}
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link to={`/units/${unitId}`}>Back to Unit</Link>
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
    const raw = res as { unitId: string; scenarios?: unknown };
    const scenarios = Array.isArray(raw.scenarios) ? (raw.scenarios as Scenario[]) : [];
    return { unitId: raw.unitId, scenarios };
  }
  return { unitId: '' };
}