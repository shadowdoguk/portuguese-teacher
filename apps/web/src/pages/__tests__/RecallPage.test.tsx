// Tests for the Recall page — Phase B Task 7.
//
// Exercises:
//   1. Initial GET /api/practice/queue?unit_id=…&mode=recall on mount.
//   2. Reveal button toggles the Portuguese sentence visibility.
//   3. POST /api/practice/ratings on a star click.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import RecallPage from '../RecallPage';
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
    <MemoryRouter initialEntries={[`/units/${unitId}/recall`]}>
      <Routes>
        <Route path="/units/:unitId/recall" element={<RecallPage client={client} />} />
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

describe('RecallPage', () => {
  it('renders the English prompt and reveals Portuguese on click', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [SAMPLE_ITEM] });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText('English: Hello.')).toBeInTheDocument());
    expect(screen.queryByText('Olá.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(screen.getByText('Olá.')).toBeInTheDocument();
  });

  it('POSTs /api/practice/ratings with mode=recall on a star click', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [SAMPLE_ITEM] });
    c.post.mockResolvedValueOnce({ ok: true });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText('English: Hello.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('radio', { name: '3 stars' }));

    await waitFor(() =>
      expect(c.post).toHaveBeenCalledWith(
        '/api/practice/ratings',
        expect.objectContaining({
          sentenceId: 'sen_1',
          mode: 'recall',
          rating: 3,
        }),
      ),
    );
  });
});