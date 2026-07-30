// Tests for the client-platform dispatch (amendment Task A7).
//
// Pins:
//   - 'web' (or absent X-Client-Platform) reads ptp_access cookie.
//   - 'android' reads Authorization: Bearer <token>.
//   - 'web' with both cookie + Authorization: the header wins.
//   - 'android' with no Authorization: token is undefined.

import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { resolveCredential } from '../clientPlatform.js';

function fakeRequest(headers: Record<string, string | string[] | undefined>, cookies: Record<string, string> = {}): Request {
  return {
    headers,
    cookies,
  } as unknown as Request;
}

describe('resolveCredential (amendment Task A7)', () => {
  it('web (no X-Client-Platform header) reads ptp_access cookie', () => {
    const req = fakeRequest({}, { ptp_access: 'a'.repeat(64) });
    const out = resolveCredential(req);
    expect(out.platform).toBe('web');
    expect(out.source).toBe('cookie');
    expect(out.token).toBe('a'.repeat(64));
  });

  it('web with both cookie and Authorization: Bearer: the header wins', () => {
    const req = fakeRequest(
      { authorization: 'Bearer ' + 'b'.repeat(64) },
      { ptp_access: 'a'.repeat(64) },
    );
    const out = resolveCredential(req);
    expect(out.platform).toBe('web');
    expect(out.source).toBe('bearer');
    expect(out.token).toBe('b'.repeat(64));
  });

  it('android reads Authorization: Bearer <token>', () => {
    const req = fakeRequest(
      { 'x-client-platform': 'android', authorization: 'Bearer ' + 'c'.repeat(64) },
      // cookies are ignored on android even if set
      { ptp_access: 'a'.repeat(64) },
    );
    const out = resolveCredential(req);
    expect(out.platform).toBe('android');
    expect(out.source).toBe('bearer');
    expect(out.token).toBe('c'.repeat(64));
  });

  it('android without Authorization: token is undefined', () => {
    const req = fakeRequest({ 'x-client-platform': 'android' });
    const out = resolveCredential(req);
    expect(out.platform).toBe('android');
    expect(out.source).toBe('bearer');
    expect(out.token).toBeUndefined();
  });

  it('android with malformed Authorization (no Bearer prefix): token is undefined', () => {
    const req = fakeRequest({ 'x-client-platform': 'android', authorization: 'Token abc' });
    const out = resolveCredential(req);
    expect(out.platform).toBe('android');
    expect(out.token).toBeUndefined();
  });

  it('web with no cookie and no Authorization: token is undefined', () => {
    const req = fakeRequest({});
    const out = resolveCredential(req);
    expect(out.platform).toBe('web');
    expect(out.token).toBeUndefined();
  });

  it('X-Client-Platform passes through unknown values as web (defensive default)', () => {
    // The Phase A plan summary doesn't list 'ios' yet, but the helper
    // is forward-compatible: anything not matching the schema
    // defaults to web rather than throwing.
    const req = fakeRequest(
      { 'x-client-platform': 'ios', authorization: 'Bearer ' + 'd'.repeat(64) },
      { ptp_access: 'a'.repeat(64) },
    );
    const out = resolveCredential(req);
    expect(out.platform).toBe('web');
    expect(out.token).toBe('d'.repeat(64));
  });

  it('Origin header is passed through', () => {
    const req = fakeRequest(
      { origin: 'http://localhost:5173' },
      { ptp_access: 'a'.repeat(64) },
    );
    const out = resolveCredential(req);
    expect(out.origin).toBe('http://localhost:5173');
  });
});