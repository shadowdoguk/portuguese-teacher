// Tests for the Settings page — Phase B Task 4.
//
// Exercises:
//   1. Initial GET /api/me/settings on mount.
//   2. PATCH /api/me/settings on Save.
//   3. Server-side 400 surfaces the validation_failed message.
//
// The page accepts an optional `client` prop (an `ApiClient`
// instance). We inject a `FakeApiClient` that wires to a per-test
// vi.fn. This avoids fighting jsdom 25 + vitest's
// `globalThis.fetch` reset between tests, which defeated every
// earlier stubbing pattern (`vi.stubGlobal`, `vi.hoisted` +
// `defineProperty`, undici polyfill).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach } from 'vitest';
import SettingsPage from '../SettingsPage';
import { ApiClient, ApiError } from '../../api/client';
import { errorEnvelopeSchema } from '@pt/contracts';

const DEFAULTS = {
  audioSpeed: 1.0,
  repetitions: 2,
  pauseMs: 1000,
  textSize: 'default',
  sortOrder: 'curriculum',
  loop: false,
} as const;

// A valid v4 UUID — `errorEnvelopeSchema` validates correlationId
// against the canonical UUID pattern.
const CORR_STUB = '00000000-0000-4000-8000-000000000001';

/** Test-only ApiClient that drives `get` / `patch` from a vi.fn
 *  and returns a `Response`-shaped object on each call. */
class FakeApiClient {
  readonly get = vi.fn();
  readonly patch = vi.fn();
  // Mark as ApiClient via structural typing (no instanceof check).
}

function makeClient(): FakeApiClient {
  const c = new FakeApiClient();
  // ApiError path: stub patch to reject with an ApiError carrying
  // the canonical envelope. Each test overrides .get / .patch.
  c.patch.mockImplementation(async () => {
    throw new ApiError(
      'audioSpeed out of range',
      400,
      'validation_failed',
      CORR_STUB,
      errorEnvelopeSchema.parse({
        error: { code: 'validation_failed', message: 'audioSpeed out of range', correlationId: CORR_STUB },
      }),
    );
  });
  return c;
}

// Cast through unknown to satisfy the structural ApiClient type.
function asApiClient(c: FakeApiClient): ApiClient {
  return c as unknown as ApiClient;
}

afterEach(() => {
  cleanup();
});

describe('SettingsPage', () => {
  it('renders the audio speed input with the loaded value', async () => {
    const c = makeClient();
    c.get.mockResolvedValueOnce(DEFAULTS);
    render(
      <MemoryRouter>
        <SettingsPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());
  });

  it('issues PATCH /api/me/settings on Save with the current form state', async () => {
    const c = makeClient();
    c.get.mockResolvedValueOnce(DEFAULTS);
    c.patch.mockResolvedValueOnce({ ...DEFAULTS, audioSpeed: 0.75, loop: true });

    render(
      <MemoryRouter>
        <SettingsPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    const audioSpeedInput = screen.getByDisplayValue('1');
    fireEvent.change(audioSpeedInput, { target: { value: '0.75' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(c.patch).toHaveBeenCalledWith(
        '/api/me/settings',
        expect.objectContaining({ audioSpeed: 0.75, loop: true }),
      ),
    );
  });

  it('surfaces a server-side 400 message on save failure', async () => {
    const c = makeClient();
    c.get.mockResolvedValueOnce(DEFAULTS);
    // The default `makeClient` patch throws an ApiError.

    render(
      <MemoryRouter>
        <SettingsPage client={asApiClient(c)} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('validation_failed: audioSpeed out of range'),
    );
  });
});