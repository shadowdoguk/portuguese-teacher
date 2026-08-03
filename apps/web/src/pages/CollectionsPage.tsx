import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collectionListResponseSchema,
  collectionSchema,
  createCollectionBodySchema,
  type Collection,
} from '@pt/contracts';
import { apiClient, ApiError, type ApiClient } from '../api/client';

export interface CollectionsPageProps {
  /** Override the API client for testing. */
  readonly client?: ApiClient;
}

export default function CollectionsPage({ client = apiClient }: CollectionsPageProps = {}): JSX.Element {
  const [items, setItems] = useState<Collection[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .get<unknown>('/api/collections')
      .then((res) => {
        if (cancelled) return;
        setItems(collectionListResponseSchema.parse(res).items);
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
  }, [client]);

  async function submitCreate(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const parsed = createCollectionBodySchema.safeParse({ name });
    if (!parsed.success) {
      setCreateError('Name must be 1–80 characters.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = collectionSchema.parse(await client.post<unknown>('/api/collections', parsed.data));
      setItems((prev) => (prev ? [created, ...prev] : [created]));
      setName('');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCreateError(`${err.code}: ${err.message}`);
      } else {
        setCreateError('Create failed');
      }
    } finally {
      setCreating(false);
    }
  }

  if (loadError) {
    return (
      <main>
        <h1>Collections</h1>
        <p role="alert">{loadError}</p>
      </main>
    );
  }

  if (!items) {
    return (
      <main>
        <h1>Collections</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Collections</h1>
      {items.length === 0 ? (
        <p>No collections yet. Create one below.</p>
      ) : (
        <ul aria-label="Collections">
          {items.map((c) => (
            <li key={c.id}>
              <Link to={`/collections/${c.id}`}>{c.name}</Link>
              <span> ({c.sentenceCount} sentence{c.sentenceCount === 1 ? '' : 's'})</span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void submitCreate(e)}>
        <label>
          New collection name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </label>
        <button type="submit" disabled={creating || name.trim().length === 0}>
          {creating ? 'Creating…' : 'Create'}
        </button>
        {createError && <p role="alert">{createError}</p>}
      </form>
    </main>
  );
}