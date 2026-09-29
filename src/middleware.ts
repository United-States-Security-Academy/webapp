import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '../env';

// Supabase's session cookie is a short-lived access token + a refresh token. Server Components
// can't write cookies (see src/supabase/server-client.ts), so without this middleware refreshing
// the session on every request, a user who only ever navigates via links (no Server Action or
// Route Handler in between) can have their access token silently expire and get logged out
// unexpectedly. This is Supabase's own documented required pattern for Next.js App Router.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const setAll: NonNullable<CookieMethodsServer['setAll']> = (cookiesToSet) => {
    for (const { name, value } of cookiesToSet) {
      request.cookies.set(name, value);
    }
    response = NextResponse.next({ request });
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set(name, value, options);
    }
  };

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll,
    },
  });

  // Do not add code between createServerClient and this call — anything here that reads the
  // session before it's refreshed can reintroduce the exact bug this middleware exists to avoid.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)'],
};
