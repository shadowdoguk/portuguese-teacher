import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { practiceItemSchema, type PracticeItem } from '@pt/contracts';
import { apiClient, ApiError, type ApiClient } from '../api/client';
import AudioComingSoon from '../components/AudioComingSoon';
import { MicRecorder } from '../components/MicRecorder';
import { StarRating } from '../components/StarRating';

export interface ShadowPageProps {
  readonly client?: ApiClient;
}

export default function ShadowPage({ client = apiClient }: ShadowPageProps = {}): JSX.Element {
  const { unitId } = useParams<{ unitId: string }>();
  const [items, setItems] = useState<PracticeItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    client
      .get<unknown>(
        `/api/practice/queue?unit_id=${encodeURIComponent(unitId)}&mode=shadow`,
      )
      .then((res) => {
        if (cancelled) return;
        const parsed = zParseQueue(res);
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
        mode: 'shadow',
        rating,
      });
      // Optimistically advance: drop the first item.
      setItems((prev) => (prev ? prev.slice(1) : prev));
      setRecordingBlob(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) setRateError(`${err.code}: ${err.message}`);
      else setRateError('Rate failed');
    }
  }

  if (loadError) {
    return (
      <main>
        <h1>Shadow</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }
  if (!items) {
    return (
      <main>
        <h1>Shadow</h1>
        <p>Loading…</p>
      </main>
    );
  }
  const current = items[0];
  if (!current) {
    return (
      <main>
        <h1>Shadow</h1>
        <p>Queue empty.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Shadow — {current.textPt}</h1>
      <AudioComingSoon />
      <p>English: {current.textEn}</p>
      <MicRecorder onStop={(blob) => setRecordingBlob(blob)} />
      <p>
        Recorded blob present: {recordingBlob ? 'yes (local-only)' : 'no'}
      </p>
      <StarRating value={0} onChange={(n) => void submitRating(n)} />
      {rateError && <p role="alert">{rateError}</p>}
    </main>
  );
}

/** Parse a queue response from the practice API. Phase B's
 *  `practiceQueueResponseSchema` is the canonical validator; we
 *  re-validate each item with `practiceItemSchema` so the wire
 *  shape is pinned at the page boundary (Zod is already in the
 *  contracts bundle that the page imports, so this is a no-cost
 *  re-validation). */
function zParseQueue(res: unknown): { items: PracticeItem[] } {
  if (
    typeof res === 'object' &&
    res !== null &&
    'items' in res &&
    Array.isArray((res as { items: unknown }).items)
  ) {
    const items = ((res as { items: unknown[] }).items).map((raw) =>
      practiceItemSchema.parse(raw),
    );
    return { items };
  }
  throw new Error('queue response shape invalid');
}