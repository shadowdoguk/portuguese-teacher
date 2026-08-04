// Unit page — six-stage loop navigator.
//
// Per CONTEXT.md "Six-Stage Unit Loop" + SPEC §12.4, the Unit
// page surfaces the six stages of the practice loop and points
// the learner at the first incomplete stage via
// `nextStageRecommendation` from `@pt/domain`. Completion state is
// fetched from `GET /api/unit-progress/:unitId` (Phase B Task 8).
//
// Stage labels + paths live in a constant map so the rendered
// <ol> and the "Continue →" link share the same source of truth.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { nextStageRecommendation, STAGE_ORDER, type Stage } from '@pt/domain';
import { apiClient, ApiError, type ApiClient } from '../api/client';

export interface UnitPageProps {
  readonly client?: ApiClient;
}

const STAGE_LABEL: Readonly<Record<Stage, string>> = Object.freeze({
  learn: 'Learn',
  notice: 'Notice',
  shadow: 'Shadow',
  recall: 'Recall',
  apply: 'Apply',
  communicate: 'Communicate',
});

const STAGE_PATH: Readonly<Record<Stage, string>> = Object.freeze({
  learn: 'learn',
  notice: 'notice',
  shadow: 'shadow',
  recall: 'recall',
  apply: 'apply',
  communicate: 'communicate',
});

export default function UnitPage({ client = apiClient }: UnitPageProps = {}) {
  const { unitId } = useParams<{ unitId: string }>();
  const [completedStages, setCompletedStages] = useState<ReadonlyArray<Stage>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    client
      .get<unknown>(`/api/unit-progress/${encodeURIComponent(unitId)}`)
      .then((res) => {
        if (cancelled) return;
        const rows = parseRows(res);
        const stages: Stage[] = [];
        for (const r of rows) {
          if (isStage(r.stage)) stages.push(r.stage);
        }
        setCompletedStages(stages);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setLoadError(`${err.code}: ${err.message}`);
        else setLoadError('Network error');
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client, unitId]);

  const firstIncomplete = nextStageRecommendation({ completedStages });

  if (loadError) {
    return (
      <main>
        <h1>Unit {unitId}</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }

  if (!loaded) {
    return (
      <main>
        <h1>Unit {unitId}</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Unit {unitId}</h1>
      <ol>
        {STAGE_ORDER.map((s) => (
          <li key={s}>
            <Link to={`/units/${unitId}/${STAGE_PATH[s]}`}>{STAGE_LABEL[s]}</Link>
            {completedStages.includes(s) ? ' ✓' : ''}
          </li>
        ))}
      </ol>
      {firstIncomplete ? (
        <p>
          <Link to={`/units/${unitId}/${STAGE_PATH[firstIncomplete]}`}>
            Continue → {STAGE_LABEL[firstIncomplete]}
          </Link>
        </p>
      ) : (
        <p>All stages complete.</p>
      )}
    </main>
  );
}

function parseRows(res: unknown): ReadonlyArray<{ stage: string }> {
  if (
    typeof res === 'object' &&
    res !== null &&
    'rows' in res &&
    Array.isArray((res as { rows: unknown }).rows)
  ) {
    return (res as { rows: Array<{ stage: unknown }> }).rows
      .filter((r): r is { stage: string } => typeof r?.stage === 'string');
  }
  return [];
}

function isStage(value: string): value is Stage {
  return (STAGE_ORDER as ReadonlyArray<string>).includes(value);
}