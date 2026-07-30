// @pt/web API client — cookie-credential fetch wrapper.
//
// Per ADR-0002 §2 the web SPA stores nothing in localStorage;
// credentials are HttpOnly + SameSite=Lax cookies set by the API.
// `credentials: 'include'` is the only thing that needs to be on
// the request to send them. The X-Client-Platform header tells the
// server which transport to read (web → cookie; android → bearer);
// per A7 we set it to 'web' on every request.
//
// Error parsing pins the canonical envelope shape: `{ error:
// { code, message, correlationId } }`. Any non-2xx response surfaces
// as `ApiError` so React error boundaries / hooks can branch on the
// discriminated `code` instead of message strings.

import { errorEnvelopeSchema, type ErrorCode, type ErrorEnvelope } from '@pt/contracts';

export interface ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly correlationId: string;
  readonly envelope: ErrorEnvelope;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ErrorCode,
    public readonly correlationId: string,
    public readonly envelope: ErrorEnvelope,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly clientPlatform?: 'web' | 'android';
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly clientPlatform: 'web' | 'android';

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.clientPlatform = options.clientPlatform ?? 'web';
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const url = path.startsWith('/') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`;
    const init: RequestInit = {
      method,
      credentials: 'include',
      headers: {
        'X-Client-Platform': this.clientPlatform,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    };

    const res = await this.fetchImpl(url, init);
    const text = await res.text();
    const parsed = text.length === 0 ? null : JSON.parse(text);
    if (!res.ok) {
      const envelope = errorEnvelopeSchema.parse(parsed);
      throw new ApiError(
        envelope.error.message,
        res.status,
        envelope.error.code,
        envelope.error.correlationId,
        envelope,
      );
    }
    return parsed as T;
  }
}

// Default instance — uses the Vite dev-proxy path (same-origin,
// relative /api). In production the Vite build resolves to the
// origin the SPA was served from.
export const apiClient = new ApiClient({
  baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  clientPlatform: 'web',
});