// Tests for the Notice stage page — Phase B Task 8.
//
// Exercises:
//   1. Mark complete button on mount.
//   2. POST /api/unit-progress/:unitId/notice on click.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import NoticePage from '../NoticePage';
import { ApiClient } from '../../api/client';

class FakeApiClient {
  readonly get = vi.fn();
  readonly post = vi.fn();
  readonly patch = vi.fn();
  readonly delete = vi.fn();
}

function asApiClient(c: FakeApiClient): ApiClient {
  return c as unknown as ApiClient;
}

afterEach(() => {
  cleanup();
});

function renderAt(unitId: string, client: ApiClient): void {
  render(
    <MemoryRouter initialEntries={[`/units/${unitId}/notice`]}>
      <Routes>
        <Route path="/units/:unitId/notice" element={<NoticePage client={client} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NoticePage', () => {
  it('POSTs /api/unit-progress/:unitId/notice on Mark complete', async () => {
    const c = new FakeApiClient();
    c.post.mockResolvedValueOnce({ ok: true });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /notice/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));
    await waitFor(() =>
      expect(c.post).toHaveBeenCalledWith(
        '/api/unit-progress/unit_a1_introductions/notice',
        expect.objectContaining({ status: 'complete' }),
      ),
    );
  });
});