import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/client';
import {
  practiceQueueResponseSchema,
  type PracticeItem,
  type PracticeQueueResponse,
  type PracticeRating,
} from '@pt/contracts';

/**
 * The single Shadow-mode practice page the Phase A plan summary
 * asks for. Fetches the queue, lets the user rate each sentence,
 * and POSTs the rating with a UUID `client_mutation_id` for
 * idempotency. Phase B adds filter expressions and a second mode
 * (Active Recall).
 */
export default function PracticeShadowPage(): JSX.Element {
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PracticeRating | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<PracticeQueueResponse>('/api/practice/queue?mode=shadow')
      .then((res) => {
        if (cancelled) return;
        const parsed = practiceQueueResponseSchema.parse(res);
        setItems(parsed.items);
        setIndex(0);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(`${err.code}: ${err.message}`);
        } else {
          setError('Network error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onRate = useCallback(
    async (rating: 1 | 2 | 3 | 4 | 5) => {
      const current = items[index];
      if (!current || busy) return;
      setBusy(true);
      setError(null);
      try {
        const out = await apiClient.post<PracticeRating>('/api/practice/ratings', {
          clientMutationId: crypto.randomUUID(),
          sentenceId: current.sentenceId,
          mode: 'shadow',
          rating,
        });
        setLastResult(out);
        setIndex((i) => i + 1);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`${err.code}: ${err.message}`);
        } else {
          setError('Network error');
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, index, items],
  );

  if (error) {
    return (
      <main>
        <h1>Shadow practice</h1>
        <p role="alert">{error}</p>
      </main>
    );
  }
  const current = items[index];
  if (!current) {
    return (
      <main>
        <h1>Shadow practice</h1>
        <p>Queue is empty.</p>
      </main>
    );
  }
  return (
    <main>
      <h1>Shadow practice</h1>
      <p>
        Item {index + 1} of {items.length}
      </p>
      <p>
        <strong>PT:</strong> {current.textPt}
      </p>
      <p>
        <strong>EN:</strong> {current.textEn}
      </p>
      <fieldset>
        <legend>Self-rating (1 = barely recognised, 5 = confident)</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" disabled={busy} onClick={() => onRate(n as 1 | 2 | 3 | 4 | 5)}>
            {n}
          </button>
        ))}
      </fieldset>
      {lastResult ? (
        <p>
          Last rating: <code>{lastResult.rating}</code> at{' '}
          <code>{lastResult.lastPractisedAt}</code>
        </p>
      ) : null}
    </main>
  );
}