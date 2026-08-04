// Learn stage page — vocabulary cards.
//
// Per CONTEXT.md "Six-Stage Unit Loop", the Learn stage surfaces
// the unit's vocabulary (sourced from `cv_sentence_versions` via
// the active CV). Phase B ships the stub + the "Mark complete"
// button; Phase C fills in the curated vocabulary deck.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient, ApiError, type ApiClient } from '../api/client';

export interface LearnPageProps {
  readonly client?: ApiClient;
}

export default function LearnPage({ client = apiClient }: LearnPageProps = {}) {
  const { unitId } = useParams<{ unitId: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  async function markComplete(): Promise<void> {
    if (!unitId) return;
    setBusy(true);
    setError(null);
    try {
      await client.post(`/api/unit-progress/${encodeURIComponent(unitId)}/learn`, {
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
      <h1>Learn</h1>
      <p>
        Vocabulary cards render here, sourced from <code>cv_sentence_versions</code>
        via the active CV.
      </p>
      <button type="button" onClick={() => void markComplete()} disabled={busy || completed}>
        {completed ? 'Completed ✓' : busy ? 'Saving…' : 'Mark complete'}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>
        <Link to={`/units/${unitId}/notice`}>Next: Notice →</Link>
      </p>
    </main>
  );
}