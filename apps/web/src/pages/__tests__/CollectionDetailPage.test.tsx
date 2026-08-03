// Tests for the CollectionDetail page — Phase B Task 6.
//
// Exercises:
//   1. Initial GET /api/collections/:id on mount.
//   2. DELETE /api/collections/:id/items/:sentenceId on Remove.
//   3. Server-side 404 surfaces the collection_not_found code.
//
// Mirrors Task 4's `client`-prop injection pattern.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import CollectionDetailPage from '../CollectionDetailPage';
import { ApiClient, ApiError } from '../../api/client';
import { errorEnvelopeSchema } from '@pt/contracts';

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

function renderAt(id: string, client: ApiClient): void {
  render(
    <MemoryRouter initialEntries={[`/collections/${id}`]}>
      <Routes>
        <Route path="/collections/:id" element={<CollectionDetailPage client={client} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CollectionDetailPage', () => {
  it('renders sentences from the initial GET', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({
      collection: {
        id: 'col_1',
        name: 'L',
        sentenceCount: 1,
        createdAt: '2026-07-23T00:00:00Z',
        items: [
          { orderIndex: 0, sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.' },
        ],
      },
    });
    renderAt('col_1', asApiClient(c));
    await waitFor(() => expect(screen.getByText('Olá.')).toBeInTheDocument());
  });

  it('DELETEs /api/collections/:id/items/:sentenceId on Remove', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({
      collection: {
        id: 'col_1',
        name: 'L',
        sentenceCount: 1,
        createdAt: '2026-07-23T00:00:00Z',
        items: [
          { orderIndex: 0, sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.' },
        ],
      },
    });
    c.delete.mockResolvedValueOnce(undefined);
    renderAt('col_1', asApiClient(c));
    await waitFor(() => expect(screen.getByText('Olá.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^Remove/ }));

    await waitFor(() =>
      expect(c.delete).toHaveBeenCalledWith('/api/collections/col_1/items/sen_1'),
    );
  });

  it('surfaces a server-side 404 collection_not_found on load', async () => {
    const c = new FakeApiClient();
    const envelope = errorEnvelopeSchema.parse({
      error: {
        code: 'collection_not_found',
        message: 'no such collection',
        correlationId: '00000000-0000-4000-8000-000000000020',
      },
    });
    c.get.mockRejectedValueOnce(
      new ApiError(envelope.error.message, 404, envelope.error.code, envelope.error.correlationId, envelope),
    );
    renderAt('col_missing', asApiClient(c));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('collection_not_found'),
    );
  });
});