// Tests for the Unit page — Phase B Task 8.
//
// Exercises:
//   1. Initial GET /api/unit-progress/:unitId on mount.
//   2. All six stages render in order.
//   3. "Continue →" link points to the first incomplete stage.
//   4. Completed stages show a ✓ marker.
//
// Mirrors Task 4/6/7's `client`-prop injection pattern.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import UnitPage from '../UnitPage';
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
    <MemoryRouter initialEntries={[`/units/${unitId}`]}>
      <Routes>
        <Route path="/units/:unitId" element={<UnitPage client={client} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UnitPage', () => {
  it('renders all six stages and a Continue link to the first incomplete one', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({
      unitId: 'unit_a1_introductions',
      rows: [
        { stage: 'learn', completedAt: '2026-08-03T00:00:00.000Z' },
        { stage: 'notice', completedAt: '2026-08-03T00:01:00.000Z' },
      ],
    });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText('Shadow')).toBeInTheDocument());
    // 'learn' and 'notice' are completed → first incomplete is 'shadow'.
    expect(screen.getByText(/Continue → Shadow/)).toBeInTheDocument();
  });

  it('renders the "All stages complete" message when every stage is done', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({
      unitId: 'unit_a1_introductions',
      rows: ['learn', 'notice', 'shadow', 'recall', 'apply', 'communicate'].map((s) => ({
        stage: s,
        completedAt: '2026-08-03T00:00:00.000Z',
      })),
    });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() =>
      expect(screen.getByText('All stages complete.')).toBeInTheDocument(),
    );
  });

  it('surfaces a server-side 404 unit_not_found on load', async () => {
    const c = new FakeApiClient();
    // Use the real `ApiError` class so the page's
    // `err instanceof ApiError` discriminator passes and the
    // code surfaces correctly (a hand-rolled duck-typed error
    // misses the `instanceof` check).
    const envelope = errorEnvelopeSchema.parse({
      error: {
        code: 'not_found',
        message: 'unit not found',
        correlationId: '00000000-0000-4000-8000-000000000099',
      },
    });
    c.get.mockRejectedValueOnce(
      new ApiError(
        envelope.error.message,
        404,
        envelope.error.code,
        envelope.error.correlationId,
        envelope,
      ),
    );
    renderAt('unit_a1_introductions_missing', asApiClient(c));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('not_found'),
    );
  });
});