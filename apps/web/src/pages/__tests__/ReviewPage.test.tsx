// Tests for the Review page — Phase B Task 7.
//
// Exercises:
//   1. Initial GET /api/practice/review?mode=shadow&limit=50 on mount.
//   2. POST /api/practice/ratings on a star click + refresh.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach } from 'vitest';
import ReviewPage from '../ReviewPage';
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

const SAMPLE_ITEM = {
  sentenceId: 'sen_1',
  textPt: 'Olá.',
  textEn: 'Hello.',
  audioId: null,
  unitId: 'unit_a1_introductions',
  orderIndex: 0,
  rating: 3,
};

describe('ReviewPage', () => {
  it('renders the Smart Review heading and a visible sentence', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [SAMPLE_ITEM] });
    render(
      <MemoryRouter>
        <ReviewPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Smart Review')).toBeInTheDocument());
    expect(screen.getByText('Olá. — Hello.')).toBeInTheDocument();
    expect(screen.getByText('Current rating: 3')).toBeInTheDocument();
  });

  it('POSTs /api/practice/ratings + refreshes the queue on a star click', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [SAMPLE_ITEM] });
    c.post.mockResolvedValueOnce({ ok: true });
    c.get.mockResolvedValueOnce({ items: [{ ...SAMPLE_ITEM, rating: 4 }] });
    render(
      <MemoryRouter>
        <ReviewPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Smart Review')).toBeInTheDocument());

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
    // The controller refreshes the queue on success.
    await waitFor(() => expect(c.get).toHaveBeenCalledTimes(2));
  });
});