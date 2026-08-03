import { useEffect, useState } from 'react';
import { reviewQueueResponseSchema, type ReviewQueueResponse } from '@pt/contracts';
import { apiClient, ApiError, type ApiClient } from '../api/client';
import { StarRating } from '../components/StarRating';

export interface ReviewPageProps {
  readonly client?: ApiClient;
}

export default function ReviewPage({ client = apiClient }: ReviewPageProps = {}): JSX.Element {
  const [data, setData] = useState<ReviewQueueResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .get<unknown>('/api/practice/review?mode=shadow&limit=50')
      .then((res) => {
        if (cancelled) return;
        setData(reviewQueueResponseSchema.parse(res));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setLoadError(`${err.code}: ${err.message}`);
        else setLoadError('Network error');
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  async function submitRating(rating: number): Promise<void> {
    const current = data?.items[0];
    if (!current) return;
    setBusy(true);
    setRateError(null);
    try {
      await client.post('/api/practice/ratings', {
        clientMutationId: `cm_${crypto.randomUUID()}`,
        sentenceId: current.sentenceId,
        mode: 'shadow',
        rating,
      });
      // Refresh the queue so the next weakest sentence surfaces.
      const refreshed = reviewQueueResponseSchema.parse(
        await client.get<unknown>('/api/practice/review?mode=shadow&limit=50'),
      );
      setData(refreshed);
    } catch (err: unknown) {
      if (err instanceof ApiError) setRateError(`${err.code}: ${err.message}`);
      else setRateError('Rate failed');
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main>
        <h1>Smart Review</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main>
        <h1>Smart Review</h1>
        <p>Loading…</p>
      </main>
    );
  }

  const visible = data.items[0];
  if (!visible) {
    return (
      <main>
        <h1>Smart Review</h1>
        <p>No review items.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Smart Review</h1>
      <p>
        {visible.textPt} — {visible.textEn}
      </p>
      <p>Current rating: {visible.rating}</p>
      <StarRating value={visible.rating} onChange={(n) => void submitRating(n)} />
      {busy && <p>Saving…</p>}
      {rateError && <p role="alert">{rateError}</p>}
    </main>
  );
}