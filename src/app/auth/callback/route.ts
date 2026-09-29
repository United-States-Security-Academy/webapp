import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/supabase/server-client';

// Google (and any future OAuth provider) redirects here after the user approves access, with a
// `code` query param. Route Handlers — unlike Server Components — can write cookies, so this is
// the one place that can actually exchange that code for a session and persist it.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next') ?? '/post-sign-in';

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL('/sign-in?error=oauth', requestUrl.origin));
}
