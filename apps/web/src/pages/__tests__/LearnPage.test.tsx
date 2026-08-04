// Tests for the Learn stage page — Phase B Task 8.
//
// Exercises:
//   1. Initial GET /api/curriculum/units/:unitId (not on this
//      page — Learn is a stage-only surface, no unit fetch).
//   2. POST /api/unit-progress/:unitId/learn on Mark complete.
//   3. Server-side 400 unit_progress_invalid_status surface.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import LearnPage from '../LearnPage';
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

function renderAt(unitId: string, client: ApiClient): void {
  render(
    <MemoryRouter initialEntries={[`/units/${unitId}/learn`]}>
      <Routes>
        <Route path="/units/:unitId/learn" element={<LearnPage client={client} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LearnPage', () => {
  it('renders the Mark complete button on mount', async () => {
    const c = new FakeApiClient();
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /learn/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument();
  });

  it('POSTs /api/unit-progress/:unitId/learn on Mark complete', async () => {
    const c = new FakeApiClient();
    c.post.mockResolvedValueOnce({ ok: true });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    await waitFor(() =>
      expect(c.post).toHaveBeenCalledWith(
        '/api/unit-progress/unit_a1_introductions/learn',
        expect.objectContaining({ status: 'complete' }),
      ),
    );
  });

  it('surfaces a server-side 400 unit_progress_invalid_status on save failure', async () => {
    const c = new FakeApiClient();
    const envelope = errorEnvelopeSchema.parse({
      error: {
        code: 'unit_progress_invalid_status',
        message: 'status must be "complete"',
        correlationId: '00000000-0000-4000-8000-000000000050',
      },
    });
    c.post.mockRejectedValueOnce(
      new ApiError(envelope.error.message, 400, envelope.error.code, envelope.error.correlationId, envelope),
    );
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('unit_progress_invalid_status'),
    );
  });
});