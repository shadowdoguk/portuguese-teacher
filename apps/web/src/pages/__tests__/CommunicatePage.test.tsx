// Tests for the Communicate stage page — Phase B Task 8.
//
// Exercises:
//   1. Initial GET /api/curriculum/units/:unitId renders scenarios.
//   2. No "Mark complete" button (Phase D owns completion).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import CommunicatePage from '../CommunicatePage';
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
    <MemoryRouter initialEntries={[`/units/${unitId}/communicate`]}>
      <Routes>
        <Route path="/units/:unitId/communicate" element={<CommunicatePage client={client} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const UNIT_DETAIL = {
  unitId: 'unit_a1_introductions',
  scenarios: [
    {
      scenarioId: 'scn_cafe',
      title: 'Café',
      learnerObjective: 'Order a coffee in European Portuguese.',
    },
  ],
};

describe('CommunicatePage', () => {
  it('renders scenarios from the initial unit-detail GET', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce(UNIT_DETAIL);
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText('Café')).toBeInTheDocument());
    expect(
      screen.getByText(/Order a coffee in European Portuguese\./),
    ).toBeInTheDocument();
  });

  it('does not render a Mark complete button (Phase D owns completion)', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce(UNIT_DETAIL);
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText('Café')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /mark complete/i })).toBeNull();
  });
});