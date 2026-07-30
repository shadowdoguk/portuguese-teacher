import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, ApiError } from '../api/client';
import { curriculumResponseSchema, type CurriculumResponse } from '@pt/contracts';

export default function HomePage(): JSX.Element {
  const [data, setData] = useState<CurriculumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<CurriculumResponse>('/api/curriculum/levels')
      .then((res) => {
        if (cancelled) return;
        setData(curriculumResponseSchema.parse(res));
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

  if (error) {
    return (
      <main>
        <h1>Home</h1>
        <p role="alert">{error}</p>
        <p>
          <Link to="/login">Sign in</Link>
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main>
        <h1>Home</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Home</h1>
      {data.levels.map((lvl) => (
        <section key={lvl.level}>
          <h2>
            {lvl.level.toUpperCase()} — active CV: <code>{lvl.activeCvId}</code>
          </h2>
          <ul>
            {lvl.units.map((u) => (
              <li key={u.unitId}>
                <strong>{u.title}</strong> — {u.summary} ({u.sentenceCount} sentences, {u.islandCount} islands)
              </li>
            ))}
          </ul>
          <p>
            <Link to="/practice/shadow">Shadow mode</Link>
          </p>
        </section>
      ))}
    </main>
  );
}