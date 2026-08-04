// Tests for @pt/web API client.
//
// Pins:
//   - GET requests send credentials: 'include' and X-Client-Platform: web.
//   - POST requests serialise JSON body and set Content-Type.
//   - 2xx with empty body resolves to null.
//   - Non-2xx with the canonical envelope throws ApiError carrying
//     status, code, correlationId, and the parsed envelope.
//   - Unknown JSON shape on a non-2xx (missing error.code, etc.)
//     also surfaces as an ApiError because the envelope parser
//     rejects malformed payloads.

import { describe, it, expect } from 'vitest';
import { ApiClient, ApiError } from '../api/client';
import { errorEnvelopeSchema } from '@pt/contracts';

function fakeFetch(responder: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    return responder(url, init);
  }) as typeof fetch;
}

const BASE = 'http://localhost:5173';

describe('ApiClient', () => {
  it('GET sends credentials: include and X-Client-Platform: web', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new ApiClient({
      baseUrl: BASE,
      fetchImpl: fakeFetch((url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    });
    const out = await client.get<{ ok: boolean }>('/api/health');
    expect(out).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.credentials).toBe('include');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers['X-Client-Platform']).toBe('web');
    expect(calls[0]?.init?.method).toBe('GET');
  });

  it('POST serialises JSON body and sets Content-Type', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new ApiClient({
      baseUrl: BASE,
      fetchImpl: fakeFetch((url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    });
    await client.post<{ ok: boolean }>('/api/auth/login', { email: 'a@b.co', password: 'longenough' });
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ email: 'a@b.co', password: 'longenough' }));
    expect(calls[0]?.init?.method).toBe('POST');
  });

  it('2xx with empty body resolves to null', async () => {
    const client = new ApiClient({
      baseUrl: BASE,
      // 204 No Content responses must not have a body per HTTP spec;
      // jsdom's Response constructor rejects non-null bodies for 204.
      fetchImpl: fakeFetch(() => new Response(null, { status: 204 })),
    });
    const out = await client.post<null>('/api/practice/events', {});
    expect(out).toBeNull();
  });

  it('non-2xx with the canonical envelope throws ApiError', async () => {
    const envelope = errorEnvelopeSchema.parse({
      error: { code: 'unauthorized', message: 'Not authenticated', correlationId: '00000000-0000-4000-8000-000000000000' },
    });
    const client = new ApiClient({
      baseUrl: BASE,
      fetchImpl: fakeFetch(() => new Response(JSON.stringify(envelope), { status: 401 })),
    });
    await expect(client.get('/api/auth/session')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'unauthorized',
      correlationId: envelope.error.correlationId,
    });
  });

  it('non-2xx with csrf_origin_denied surfaces as ApiError (A4)', async () => {
    const envelope = errorEnvelopeSchema.parse({
      error: { code: 'csrf_origin_denied', message: 'Foreign Origin', correlationId: '00000000-0000-4000-8000-000000000000' },
    });
    const client = new ApiClient({
      baseUrl: BASE,
      fetchImpl: fakeFetch(() => new Response(JSON.stringify(envelope), { status: 403 })),
    });
    await expect(client.post('/api/auth/login', {})).rejects.toBeInstanceOf(ApiError);
  });

  it('non-2xx with refresh_reused surfaces as ApiError (A5)', async () => {
    const envelope = errorEnvelopeSchema.parse({
      error: { code: 'refresh_reused', message: 'Compromise guard', correlationId: '00000000-0000-4000-8000-000000000000' },
    });
    const client = new ApiClient({
      baseUrl: BASE,
      fetchImpl: fakeFetch(() => new Response(JSON.stringify(envelope), { status: 401 })),
    });
    await expect(client.post('/api/auth/refresh', {})).rejects.toMatchObject({ code: 'refresh_reused' });
  });

  it('non-2xx with malformed body (not the canonical envelope) throws via parser', async () => {
    // The Zod envelopeSchema.parse throws ZodError — the client
    // surfaces this as a thrown Error (not ApiError). The contract
    // is "the API always returns the canonical envelope on non-2xx";
    // a malformed payload is a server bug, surfaced as-is.
    const client = new ApiClient({
      baseUrl: BASE,
      fetchImpl: fakeFetch(() => new Response(JSON.stringify({ not: 'an envelope' }), { status: 500 })),
    });
    await expect(client.get('/api/health')).rejects.toThrow();
  });
});