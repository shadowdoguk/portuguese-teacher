// Notice stage page — grammar + pronunciation prose.
//
// Per CONTEXT.md "Six-Stage Unit Loop", the Notice stage surfaces
// the unit's grammar and pronunciation content (sourced from
// `cv_sentence_versions` via the active CV). Phase B ships the
// stub + the "Mark complete" button; Phase C fills in the curated
// prose.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, ApiError, type ApiClient } from '../api/client';

export interface NoticePageProps {
  readonly client?: ApiClient;
}

export default function NoticePage({ client = apiClient }: NoticePageProps = {}) {
  const { unitId } = useParams<{ unitId: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  async function markComplete(): Promise<void> {
    if (!unitId) return;
    setBusy(true);
    setError(null);
    try {
      await client.post(`/api/unit-progress/${encodeURIComponent(unitId)}/notice`, {
        status: 'complete',
      });
      setCompleted(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(`${err.code}: ${err.message}`);
      else setError('Mark failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Notice</h1>
      <p>
        Grammar and pronunciation prose render here, sourced from{' '}
        <code>cv_sentence_versions</code> via the active CV.
      </p>
      <button type="button" onClick={() => void markComplete()} disabled={busy || completed}>
        {completed ? 'Completed ✓' : busy ? 'Saving…' : 'Mark complete'}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link to={`/units/${unitId}/shadow`}>Next: Shadow →</Link>
      </p>
    </main>
  );
}