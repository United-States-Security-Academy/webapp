import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getSupabaseServerClient } from '@/supabase/server-client';
import { env } from '@/env';
import type { AuthenticatedUser } from './auth-types';

// Supabase signs session tokens with a rotating key pair, not a static secret — verify against the published JWKS.
const supabaseAuthIssuer = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`;
const supabaseJwks = createRemoteJWKSet(new URL(`${supabaseAuthIssuer}/.well-known/jwks.json`));

function extractBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  return authorizationHeader.slice('Bearer '.length);
}

async function extractCookieAccessToken(): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface SupabaseTokenClaims {
  userId: string;
  email?: string;
  displayName?: string;
}

async function verifySupabaseAccessToken(supabaseAccessToken: string): Promise<SupabaseTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(supabaseAccessToken, supabaseJwks, {
      issuer: supabaseAuthIssuer,
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string') return null;

    const userMetadata = payload.user_metadata as { full_name?: string; name?: string } | undefined;
    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      displayName: userMetadata?.full_name || userMetadata?.name,
    };
  } catch {
    return null;
  }
}

async function getUserRecordById(userId: string) {
  const [userRecord] = await db.select().from(users).where(eq(users.id, userId));
  return userRecord ?? null;
}

async function getUserRecordByEmail(email: string) {
  const [userRecord] = await db.select().from(users).where(eq(users.email, email));
  return userRecord ?? null;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === '23505';
}

// Instructor/admin accounts are always created deliberately (seed script, future admin invite
// flow) — this only ever provisions the 'learner' role, for people who self-registered via
// Supabase Auth directly (e.g. the sign-up form) and have no row in our own `users` table yet.
async function provisionLearnerRecord(claims: SupabaseTokenClaims) {
  const email = claims.email ?? `${claims.userId}@unknown.local`;
  const displayName = claims.displayName || email.split('@')[0] || email;

  try {
    const [createdUser] = await db
      .insert(users)
      .values({ id: claims.userId, email, displayName, role: 'learner' })
      .onConflictDoNothing({ target: users.id })
      .returning();

    // onConflictDoNothing returns nothing on a race (another request provisioned it first) —
    // the row exists either way, so just re-read it.
    return createdUser ?? (await getUserRecordById(claims.userId));
  } catch (error) {
    // The insert above only guards against a conflict on `id`. A conflict on `email` instead
    // means a prior Supabase Auth account for this email was deleted directly (bypassing our
    // own admin "delete user" action, which removes this row too) and the person signed up
    // again, getting a new Auth id. Our row — and everything tied to it (enrollments, progress,
    // certificates) — is really keyed by email as the person's identity, so reconnect to the
    // existing row instead of failing the sign-in.
    if (isUniqueConstraintViolation(error)) {
      const existingUserByEmail = await getUserRecordByEmail(email);
      if (existingUserByEmail) return existingUserByEmail;
    }
    throw error;
  }
}

async function resolveAuthenticatedUser(supabaseAccessToken: string | null): Promise<AuthenticatedUser | null> {
  if (!supabaseAccessToken) return null;

  const claims = await verifySupabaseAccessToken(supabaseAccessToken);
  if (!claims) return null;

  const userRecord = (await getUserRecordById(claims.userId)) ?? (await provisionLearnerRecord(claims));
  if (!userRecord) return null;

  return {
    userId: userRecord.id,
    email: userRecord.email,
    displayName: userRecord.displayName,
    role: userRecord.role,
  };
}

// Single entry point for identity — bearer header (mobile) or session cookie (web/PWA), never both parsed ad hoc elsewhere.
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const supabaseAccessToken = extractBearerToken(request) ?? (await extractCookieAccessToken());
  return resolveAuthenticatedUser(supabaseAccessToken);
}

// Cookie-only variant for Server Actions, which receive no Request object to read a bearer header from.
export async function getAuthenticatedUserFromSession(): Promise<AuthenticatedUser | null> {
  const supabaseAccessToken = await extractCookieAccessToken();
  return resolveAuthenticatedUser(supabaseAccessToken);
}
