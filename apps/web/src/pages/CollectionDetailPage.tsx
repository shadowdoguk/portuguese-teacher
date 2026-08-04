import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  collectionDetailResponseSchema,
  type CollectionDetail,
} from '@pt/contracts';
import { apiClient, ApiError, type ApiClient } from '../api/client';

export interface CollectionDetailPageProps {
  /** Override the API client for testing. */
  readonly client?: ApiClient;
}

export default function CollectionDetailPage({ client = apiClient }: CollectionDetailPageProps = {}) {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CollectionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busySentenceId, setBusySentenceId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    client
      .get<unknown>(`/api/collections/${id}`)
      .then((res) => {
        if (cancelled) return;
        setDetail(collectionDetailResponseSchema.parse(res).collection);
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
  }, [client, id]);

  async function handleRemove(sentenceId: string): Promise<void> {
    if (!id) return;
    setBusySentenceId(sentenceId);
    setActionError(null);
    try {
      await client.delete(`/api/collections/${id}/items/${sentenceId}`);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((i) => i.sentenceId !== sentenceId),
              sentenceCount: Math.max(0, prev.sentenceCount - 1),
            }
          : prev,
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setActionError(`${err.code}: ${err.message}`);
      } else {
        setActionError('Remove failed');
      }
    } finally {
      setBusySentenceId(null);
    }
  }

  if (loadError) {
    return (
      <main>
        <h1>Collection</h1>
        <p role="alert">{loadError}</p>
        <p>
          <Link to="/collections">Back to collections</Link>
        </p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main>
        <h1>Collection</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{detail.name}</h1>
      <p>
        <Link to="/collections">Back to collections</Link>
      </p>
      {detail.items.length === 0 ? (
        <p>This collection is empty.</p>
      ) : (
        <ul>
          {detail.items.map((i) => (
            <li key={i.sentenceId}>
              <strong>{i.textPt}</strong> — {i.textEn}
              <button
                type="button"
                aria-label={`Remove ${i.textPt}`}
                disabled={busySentenceId === i.sentenceId}
                onClick={() => void handleRemove(i.sentenceId)}
              >
                {busySentenceId === i.sentenceId ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {actionError && <p role="alert">{actionError}</p>}
    </main>
  );
}