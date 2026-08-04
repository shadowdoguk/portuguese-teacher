// Tests for the Shadow page — Phase B Task 7.
//
// Exercises:
//   1. Initial GET /api/practice/queue?unit_id=…&mode=shadow on mount.
//   2. AudioComingSoon placeholder renders.
//   3. POST /api/practice/ratings on a star click.
//
// Mirrors Task 4/6's `client`-prop injection pattern to avoid the
// jsdom 25 + vitest 4 `globalThis.fetch` reset problem.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import ShadowPage from '../ShadowPage';
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
    <MemoryRouter initialEntries={[`/units/${unitId}/shadow`]}>
      <Routes>
        <Route path="/units/:unitId/shadow" element={<ShadowPage client={client} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const SAMPLE_ITEM = {
  sentenceId: 'sen_1',
  textPt: 'Olá.',
  textEn: 'Hello.',
  audioId: null,
  unitId: 'unit_a1_introductions',
  orderIndex: 0,
};

describe('ShadowPage', () => {
  it('renders the first sentence from the initial GET', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [SAMPLE_ITEM] });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText(/Olá\./)).toBeInTheDocument());
    expect(screen.getByText(/Audio playback coming soon/)).toBeInTheDocument();
  });

  it('POSTs /api/practice/ratings on a star click', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [SAMPLE_ITEM] });
    c.post.mockResolvedValueOnce({ ok: true });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText(/Olá\./)).toBeInTheDocument());

    // Click the 4-star radio (the StarRating exposes role="radio").
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));

    await waitFor(() =>
      expect(c.post).toHaveBeenCalledWith(
        '/api/practice/ratings',
        expect.objectContaining({
          sentenceId: 'sen_1',
          mode: 'shadow',
          rating: 4,
        }),
      ),
    );
  });
});