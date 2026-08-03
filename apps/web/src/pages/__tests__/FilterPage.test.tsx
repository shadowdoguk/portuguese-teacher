// Tests for the Filter page — Phase B Task 7.
//
// Exercises:
//   1. Empty query — no API call, no items rendered.
//   2. Typed query — GET /api/curriculum/sentences?filter=…&match=or.
//   3. "Match all" toggle — second request uses match=all.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach } from 'vitest';
import FilterPage from '../FilterPage';
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
  textPt: 'Como vai?',
  textEn: 'How are you?',
  audioId: null,
  unitId: 'unit_a1_introductions',
  orderIndex: 0,
};

describe('FilterPage', () => {
  it('does not call the API on an empty query', () => {
    const c = new FakeApiClient();
    render(
      <MemoryRouter>
        <FilterPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    expect(c.get).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: /filter/i })).toBeInTheDocument();
  });

  it('GETs /api/curriculum/sentences with the typed query', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValueOnce({ items: [SAMPLE_ITEM] });
    render(
      <MemoryRouter>
        <FilterPage client={asApiClient(c)} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Terms'), { target: { value: 'como' } });

    await waitFor(() =>
      expect(c.get).toHaveBeenCalledWith(
        '/api/curriculum/sentences?filter=como&match=or',
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('Como vai? — How are you?')).toBeInTheDocument(),
    );
  });

  it('switches to match=all when the checkbox is toggled', async () => {
    const c = new FakeApiClient();
    c.get.mockResolvedValue({ items: [SAMPLE_ITEM] });
    render(
      <MemoryRouter>
        <FilterPage client={asApiClient(c)} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Terms'), { target: { value: 'como' } });
    await waitFor(() =>
      expect(c.get).toHaveBeenLastCalledWith(
        '/api/curriculum/sentences?filter=como&match=or',
      ),
    );

    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() =>
      expect(c.get).toHaveBeenLastCalledWith(
        '/api/curriculum/sentences?filter=como&match=all',
      ),
    );
  });
});