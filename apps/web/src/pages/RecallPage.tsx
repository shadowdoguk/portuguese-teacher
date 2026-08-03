import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { practiceItemSchema, type PracticeItem } from '@pt/contracts';
import { apiClient, ApiError, type ApiClient } from '../api/client';
import { StarRating } from '../components/StarRating';

export interface RecallPageProps {
  readonly client?: ApiClient;
}

export default function RecallPage({ client = apiClient }: RecallPageProps = {}): JSX.Element {
  const { unitId } = useParams<{ unitId: string }>();
  const [items, setItems] = useState<PracticeItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    client
      .get<unknown>(
        `/api/practice/queue?unit_id=${encodeURIComponent(unitId)}&mode=recall`,
      )
      .then((res) => {
        if (cancelled) return;
        const parsed = parseQueue(res);
        setItems(parsed.items);
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

  async function submitRating(rating: number): Promise<void> {
    const current = items?.[0];
    if (!current) return;
    setRateError(null);
    try {
      await client.post('/api/practice/ratings', {
        clientMutationId: `cm_${crypto.randomUUID()}`,
        sentenceId: current.sentenceId,
        mode: 'recall',
        rating,
      });
      setItems((prev) => (prev ? prev.slice(1) : prev));
      setRevealed(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) setRateError(`${err.code}: ${err.message}`);
      else setRateError('Rate failed');
    }
  }

  if (loadError) {
    return (
      <main>
        <h1>Recall</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }
  if (!items) {
    return (
      <main>
        <h1>Recall</h1>
        <p>Loading…</p>
      </main>
    );
  }
  const current = items[0];
  if (!current) {
    return (
      <main>
        <h1>Recall</h1>
        <p>Queue empty.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Recall</h1>
      <p>English: {current.textEn}</p>
      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)}>
          Reveal
        </button>
      ) : (
        <p>
          Portuguese: <strong>{current.textPt}</strong>
        </p>
      )}
      <StarRating value={0} onChange={(n) => void submitRating(n)} />
      {rateError && <p role="alert">{rateError}</p>}
    </main>
  );
}

function parseQueue(res: unknown): { items: PracticeItem[] } {
  if (
    typeof res === 'object' &&
    res !== null &&
    'items' in res &&
    Array.isArray((res as { items: unknown }).items)
  ) {
    const items = (res as { items: unknown[] }).items.map((raw) =>
      practiceItemSchema.parse(raw),
    );
    return { items };
  }
  throw new Error('queue response shape invalid');
}