// Client-platform dispatch (amendment Task A7).
//
// Resolves which credential transport to use on a per-request basis,
// keyed by the X-Client-Platform header set by the SPA / Android
// client. The router helpers wrap this so route handlers don't
// reach into req.headers directly.
//
// Phase A only ships the `web` path; `android` lands in Phase C
// once the Capacitor 8 + @aparajita/capacitor-secure-storage
// integration is in. The selector itself accepts both today so
// the Phase C Android bearer transport is a wire-shape change,
// not an API surface change.

import type { Request } from 'express';
import { clientPlatformSchema, type ClientPlatform } from '@pt/contracts';

export type CredentialSource = 'cookie' | 'bearer';

export interface ResolvedCredential {
  readonly platform: ClientPlatform;
  readonly source: CredentialSource;
  /** Raw access token when source === 'bearer'; cookie value otherwise. */
  readonly token: string | undefined;
  readonly origin: string | undefined;
}

/**
 * Select the credential transport for an authenticated request.
 *
 *   - `web` (or no header) → read ptp_access cookie.
 *   - `android` → read Authorization: Bearer <token>.
 *
 * The browser *always* sends Origin on POST/PUT/PATCH/DELETE; on
 * GET the header may be absent. We pass the value through
 * unchanged so the Origin allow-list middleware can decide.
 */
export function resolveCredential(req: Request): ResolvedCredential {
  const raw = req.headers['x-client-platform'];
  const platform: ClientPlatform = clientPlatformSchema.safeParse(raw).success
    ? (raw as ClientPlatform)
    : 'web';

  if (platform === 'android') {
    const authz = req.headers.authorization;
    const token = typeof authz === 'string' && authz.startsWith('Bearer ')
      ? authz.slice('Bearer '.length).trim()
      : undefined;
    return { platform, source: 'bearer', token, origin: headerString(req.headers.origin) };
  }

  // Web path: cookie first; Authorization header wins when both are present.
  const cookieToken = typeof req.cookies === 'object' ? req.cookies['ptp_access'] : undefined;
  const authz = req.headers.authorization;
  const bearerToken = typeof authz === 'string' && authz.startsWith('Bearer ')
    ? authz.slice('Bearer '.length).trim()
    : undefined;
  const token = bearerToken ?? cookieToken;
  return { platform, source: token === cookieToken && token !== undefined ? 'cookie' : 'bearer', token, origin: headerString(req.headers.origin) };
}

function headerString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}