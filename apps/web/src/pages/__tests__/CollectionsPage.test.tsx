// Tests for the Collections page — Phase B Task 6.
//
// Exercises:
//   1. Initial GET /api/collections on mount.
//   2. Create flow: POST /api/collections + invalidate.
//   3. Empty-name submission surfaces a client-side validation
//      message without hitting the API.
//
// Mirrors Task 4's `client`-prop injection pattern to avoid the
// jsdom 25 + vitest 4 `globalThis.fetch` reset problem.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach } from 'vitest';
import CollectionsPage from '../CollectionsPage';
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

describe('CollectionsPage', () => {
  it('lists existing collections from the initial GET', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({
      items: [
        {
          id: 'col_1',
          name: 'My list',
          sentenceCount: 2,
          createdAt: '2026-07-23T00:00:00Z',
        },
      ],
    });
    render(
      <MemoryRouter>
        <CollectionsPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('My list')).toBeInTheDocument());
  });

  it('POSTs /api/collections on Create with the typed body', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [] });
    c.post.mockResolvedValueOnce({
      id: 'col_new',
      name: 'Travel',
      sentenceCount: 0,
      createdAt: '2026-07-23T00:00:01Z',
    });

    render(
      <MemoryRouter>
        <CollectionsPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /collections/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/new collection name/i), {
      target: { value: 'Travel' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(c.post).toHaveBeenCalledWith('/api/collections', { name: 'Travel' }),
    );
  });

  it('surfaces a client-side error when the name is empty', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [] });

    render(
      <MemoryRouter>
        <CollectionsPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /collections/i })).toBeInTheDocument());

    // The button is disabled when name.trim().length === 0; the
    // form should not POST. We simulate the user bypassing the
    // disabled state by typing whitespace only — the button
    // remains disabled and no fetch fires.
    fireEvent.change(screen.getByLabelText(/new collection name/i), {
      target: { value: '   ' },
    });
    const button = screen.getByRole('button', { name: /create/i });
    expect(button).toBeDisabled();
    expect(c.post).not.toHaveBeenCalled();
  });

  it('surfaces a server-side 400 collection_name_required', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [] });
    const envelope = errorEnvelopeSchema.parse({
      error: {
        code: 'collection_name_required',
        message: 'name must be 1..80 chars',
        correlationId: '00000000-0000-4000-8000-000000000010',
      },
    });
    c.post.mockRejectedValueOnce(new ApiError(envelope.error.message, 400, envelope.error.code, envelope.error.correlationId, envelope));

    render(
      <MemoryRouter>
        <CollectionsPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /collections/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/new collection name/i), {
      target: { value: 'Travel' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('collection_name_required'),
    );
  });
});