// Tests for the Apply stage page — Phase B Task 8.
//
// Exercises:
//   1. Initial GET /api/curriculum/units/:unitId renders islands.
//   2. POST /api/unit-progress/:unitId/apply on Mark complete.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach } from 'vitest';
import ApplyPage from '../ApplyPage';
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
    <MemoryRouter initialEntries={[`/units/${unitId}/apply`]}>
      <Routes>
        <Route path="/units/:unitId/apply" element={<ApplyPage client={client} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const UNIT_DETAIL = {
  unitId: 'unit_a1_introductions',
  islands: [
    {
      islandId: 'isl_1',
      title: 'Café',
      kind: 'dialogue',
      items: [
        { sentenceId: 'sen_1', textPt: 'Olá.', textEn: 'Hello.' },
      ],
    },
  ],
};

describe('ApplyPage', () => {
  it('renders islands from the initial unit-detail GET', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce(UNIT_DETAIL);
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText('Café')).toBeInTheDocument());
    // Assert on the list item text via a function matcher. The
    // page renders `<strong>Olá.</strong> — Hello.` as separate
    // text nodes (the `<strong>` boundary breaks naive string
    // matching).
    expect(
      screen.getByText((_, element) => {
        if (!element) return false;
        return element.tagName.toLowerCase() === 'li' &&
          /Olá\..*Hello\./.test(element.textContent ?? '');
      }),
    ).toBeInTheDocument();
  });

  it('POSTs /api/unit-progress/:unitId/apply on Mark complete', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce(UNIT_DETAIL);
    c.post.mockResolvedValueOnce({ ok: true });
    renderAt('unit_a1_introductions', asApiClient(c));
    await waitFor(() => expect(screen.getByText('Café')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    await waitFor(() =>
      expect(c.post).toHaveBeenCalledWith(
        '/api/unit-progress/unit_a1_introductions/apply',
        expect.objectContaining({ status: 'complete' }),
      ),
    );
  });
});