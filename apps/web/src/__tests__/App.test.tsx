// App smoke test — verifies that the SPA mounts without crashing
// and renders at least one route. The detailed per-page tests
// (login submission, queue fetch, idempotent rating POST) live
// in the per-page test files once Phase B's UI scope expands.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('App', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the HomePage at the root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    // HomePage shows an h1 with the text "Home" while the queue is
    // loading (or an error alert). Either way an h1 is present.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the LoginPage at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the PracticeShadowPage at /practice/shadow', () => {
    render(
      <MemoryRouter initialEntries={['/practice/shadow']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /shadow practice/i })).toBeInTheDocument();
  });
});