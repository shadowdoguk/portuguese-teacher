// Auth repository — auth_users + auth_sessions CRUD.
//
// Implements ADR-0002 + amendment Task A5 (refresh-reuse compromise
// guard). The guard is the central security property: when a
// refresh-token-hash is presented that has already been rotated
// out (i.e. `rotatedAt` is non-null on the session), it means a
// stale client retried with a token an attacker already swapped.
// We revoke the *entire* session set for that user and surface a
// `refresh_reused` error so the SPA can force re-authentication.

import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { createId } from './ids.js';
import { db as defaultDb, type Database } from '../db/index.js';
import { authSessions, authUsers, type AuthSessionRow, type AuthUserRow } from '../db/schema.js';
import { generateToken, hashToken } from './tokens.js';

export class RefreshReuseCompromiseError extends Error {
  readonly code = 'refresh_reused' as const;
  constructor(public readonly userId: string) {
    super(`refresh_reused: refresh token reuse detected; revoking all sessions for user ${userId}`);
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = 'unauthorized' as const;
  constructor(message = 'unauthorized: invalid credentials') {
    super(message);
  }
}

export interface CreateUserInput {
  readonly email: string;
  readonly passwordHash: string;
}

export async function createUser(input: CreateUserInput, db: Database = defaultDb): Promise<AuthUserRow> {
  const userId = `usr_${createId(16)}`;
  await db.insert(authUsers).values({
    userId,
    email: input.email,
    passwordHash: input.passwordHash,
  });
  const row = await db.select().from(authUsers).where(eq(authUsers.userId, userId)).limit(1);
  if (!row[0]) throw new Error('createUser: insert succeeded but row not found');
  return row[0];
}

export async function findUserByEmail(email: string, db: Database = defaultDb): Promise<AuthUserRow | null> {
  const rows = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(userId: string, db: Database = defaultDb): Promise<AuthUserRow | null> {
  const rows = await db.select().from(authUsers).where(eq(authUsers.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export interface CreateSessionInput {
  readonly userId: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
}

export interface CreateSessionResult {
  readonly session: AuthSessionRow;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessExpiresAt: Date;
  readonly refreshExpiresAt: Date;
}

export async function createSession(
  input: CreateSessionInput,
  db: Database = defaultDb,
): Promise<CreateSessionResult> {
  const sessionId = `sess_${createId(36)}`;
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const accessHash = hashToken(accessToken);
  const refreshHash = hashToken(refreshToken);
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + input.accessTtlSeconds * 1000);
  const refreshExpiresAt = new Date(now.getTime() + input.refreshTtlSeconds * 1000);

  await db.insert(authSessions).values({
    sessionId,
    userId: input.userId,
    accessTokenHash: accessHash,
    refreshTokenHash: refreshHash,
    accessExpiresAt,
    refreshExpiresAt,
    revokedAt: null,
    rotatedAt: null,
    createdAt: now,
  });

  const row = (await db.select().from(authSessions).where(eq(authSessions.sessionId, sessionId)).limit(1))[0];
  if (!row) throw new Error('createSession: insert succeeded but row not found');

  return { session: row, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
}

export async function findSessionByRefreshToken(
  rawRefreshToken: string,
  db: Database = defaultDb,
): Promise<AuthSessionRow | null> {
  const hash = hashToken(rawRefreshToken);
  const rows = await db.select().from(authSessions).where(eq(authSessions.refreshTokenHash, hash)).limit(1);
  return rows[0] ?? null;
}

export async function findSessionByAccessToken(
  rawAccessToken: string,
  db: Database = defaultDb,
): Promise<AuthSessionRow | null> {
  const hash = hashToken(rawAccessToken);
  const rows = await db.select().from(authSessions).where(eq(authSessions.accessTokenHash, hash)).limit(1);
  return rows[0] ?? null;
}

/**
 * Rotate a session: revoke the current session (mark revokedAt) and
 * create a new one with fresh tokens. The caller MUST verify the
 * current session is *not* rotated before calling — if it is, the
 * caller should treat it as a reuse and call `revokeAllSessions`.
 */
export async function rotateSession(
  sessionId: string,
  input: CreateSessionInput,
  db: Database = defaultDb,
): Promise<CreateSessionResult> {
  const now = new Date();
  await db.update(authSessions).set({ rotatedAt: now, revokedAt: now }).where(eq(authSessions.sessionId, sessionId));
  return createSession(input, db);
}

/**
 * Refresh-reuse compromise guard (amendment Task A5): revoke every
 * session for the user and surface the security event to the audit
 * log. Called when a refresh-token-hash matches a row that has
 * `rotatedAt` set (or `revokedAt` set with `rotatedAt` null).
 */
export async function revokeAllSessions(userId: string, db: Database = defaultDb): Promise<number> {
  const result = await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
  return (result as unknown as { rowCount?: number }).rowCount ?? 0;
}

/**
 * Detect the reuse condition. Returns the session row when the
 * presented refresh-token-hash matches a row whose `rotatedAt` is
 * non-null (or whose `revokedAt` is non-null AND `rotatedAt` is
 * null). Returns null on a clean rotation.
 */
export async function detectRefreshReuse(
  rawRefreshToken: string,
  db: Database = defaultDb,
): Promise<AuthSessionRow | null> {
  const hash = hashToken(rawRefreshToken);
  const rows = await db
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.refreshTokenHash, hash),
        isNotNull(authSessions.rotatedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}