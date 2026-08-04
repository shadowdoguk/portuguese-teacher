import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../api/client';
import { loginResponseSchema, type LoginResponse } from '@pt/contracts';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('learner@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: LoginResponse = await apiClient.post('/api/auth/login', { email, password });
      // Validate the wire shape before navigation so a server-side
      // contract drift surfaces as an error rather than a blank
      // page after the redirect.
      loginResponseSchema.parse(body);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`${err.code}: ${err.message}`);
      } else {
        setError('Network error');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}