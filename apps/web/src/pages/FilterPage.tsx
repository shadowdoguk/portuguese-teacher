import { useEffect, useState } from 'react';
import { practiceItemSchema, type PracticeItem } from '@pt/contracts';
import { apiClient, ApiError, type ApiClient } from '../api/client';

export interface FilterPageProps {
  readonly client?: ApiClient;
}

export default function FilterPage({ client = apiClient }: FilterPageProps = {}): JSX.Element {
  const [q, setQ] = useState('');
  const [matchAll, setMatchAll] = useState(false);
  const [items, setItems] = useState<PracticeItem[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // The Filter page sends a fresh request whenever the query or
  // match mode changes. Empty `q` is a no-op (we don't fire the
  // request — the backend treats empty expression as "return
  // everything", but we want to avoid the visual clutter until
  // the user types).
  useEffect(() => {
    if (q.length === 0) {
      setItems(null);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const url =
      `/api/curriculum/sentences?filter=${encodeURIComponent(q)}&match=${matchAll ? 'all' : 'or'}`;
    client
      .get<unknown>(url)
      .then((res) => {
        if (cancelled) return;
        if (
          typeof res === 'object' &&
          res !== null &&
          'items' in res &&
          Array.isArray((res as { items: unknown }).items)
        ) {
          setItems((res as { items: unknown[] }).items.map((raw) => practiceItemSchema.parse(raw)));
          setSearchError(null);
        } else {
          setSearchError('Filter response shape invalid');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setSearchError(`${err.code}: ${err.message}`);
        else setSearchError('Network error');
      });
    return () => {
      cancelled = true;
    };
  }, [client, q, matchAll]);

  return (
    <main>
      <h1>Filter</h1>
      <label>
        Terms
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="dar, João"
          aria-label="Terms"
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={matchAll}
          onChange={(e) => setMatchAll(e.target.checked)}
        />
        Match all
      </label>
      {searchError && <p role="alert">{searchError}</p>}
      <ul aria-label="Sentences">
        {(items ?? []).map((s) => (
          <li key={s.sentenceId}>
            {s.textPt} — {s.textEn}
          </li>
        ))}
      </ul>
    </main>
  );
}