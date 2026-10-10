'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/supabase/browser-client';
import { clearLessonPdfCache } from '@/features/pdf/lesson-pdf-bytes';

export function SignOutButton({
  className = 'text-sm font-semibold text-slate-600 hover:text-navy-900',
  children = 'Sign out',
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    await clearLessonPdfCache();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} className={className}>
      {children}
    </button>
  );
}
