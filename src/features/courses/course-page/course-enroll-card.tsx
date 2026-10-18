import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EnrollButton } from '@/features/enrollments/enroll-button';
import { CheckoutButton } from '@/features/payments/checkout-button';
import type { CourseProgress } from '@/features/progress/course-progress-queries';
import { SITE_CONTACT, phoneHref } from '@/features/site/site-contact';

export interface CourseEnrollState {
  isSignedIn: boolean;
  hasFullAccess: boolean;
  isFree: boolean;
  progress: CourseProgress;
  // The next lesson to open, for "Start" / "Continue". Null when there's nothing left to open.
  continueHref: string | null;
  isCourseComplete: boolean;
  // Set once the course is complete: where to go next.
  certificateHref: string | null;
  examHref: string | null;
}

const PRIMARY_LINK = 'inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-bold transition-colors';

// The main call to action for this learner: enroll / buy, or continue, take the exam, get the certificate.
export function CourseEnrollAction({ state, courseSlug, priceLabel }: { state: CourseEnrollState; courseSlug: string; priceLabel: string }) {
  if (!state.isSignedIn) {
    return (
      <div className="flex flex-col gap-2">
        <Link href="/sign-in" className={`${PRIMARY_LINK} bg-gold-500 text-navy-950 hover:bg-gold-400`}>
          Sign in to enroll
        </Link>
        <p className="text-center text-xs text-slate-500">
          New to USSA?{' '}
          <Link href="/sign-up" className="font-semibold text-navy-800 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  if (!state.hasFullAccess) {
    return state.isFree ? <EnrollButton courseSlug={courseSlug} /> : <CheckoutButton courseSlug={courseSlug} priceLabel={priceLabel} />;
  }

  if (state.certificateHref) {
    return (
      <Link href={state.certificateHref} className={`${PRIMARY_LINK} bg-gold-500 text-navy-950 hover:bg-gold-400`}>
        <Icon name="award" className="h-4 w-4" aria-hidden /> View certificate
      </Link>
    );
  }
  if (state.examHref) {
    return (
      <Link href={state.examHref} className={`${PRIMARY_LINK} bg-gold-500 text-navy-950 hover:bg-gold-400`}>
        Take the final exam <span aria-hidden>&rarr;</span>
      </Link>
    );
  }
  if (state.continueHref) {
    return (
      <Link href={state.continueHref} className={`${PRIMARY_LINK} bg-navy-900 text-white hover:bg-navy-800`}>
        {state.progress.completedLessons === 0 ? 'Start the course' : 'Continue where you left off'} <span aria-hidden>&rarr;</span>
      </Link>
    );
  }
  return null;
}

export function CourseEnrollCard({
  state,
  courseSlug,
  priceLabel,
  includes,
}: {
  state: CourseEnrollState;
  courseSlug: string;
  priceLabel: string;
  includes: string[];
}) {
  return (
    <div id="enroll" className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-navy-950/5">
      {state.hasFullAccess ? (
        <>
          <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <Icon name="checkCircle" className="h-5 w-5 text-gold-600" aria-hidden />
            {state.isCourseComplete ? 'Course completed' : "You're enrolled"}
          </p>
          <div className="mt-4">
            <ProgressBar completed={state.progress.completedLessons} total={state.progress.totalLessons} />
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tuition</p>
          <p className="mt-1 text-3xl font-extrabold text-navy-900">{priceLabel}</p>
        </>
      )}

      <div className="mt-5">
        <CourseEnrollAction state={state} courseSlug={courseSlug} priceLabel={priceLabel} />
      </div>

      {!state.hasFullAccess && includes.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="text-sm font-bold text-navy-900">This course includes</p>
          <ul className="mt-3 flex flex-col gap-2">
            {includes.slice(0, 6).map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Questions? Call{' '}
        <a href={phoneHref(SITE_CONTACT.mainPhone)} className="font-semibold text-navy-800 hover:underline">
          {SITE_CONTACT.mainPhone}
        </a>
      </p>
    </div>
  );
}

// Phones: the enroll card sits near the top of the page, so once it scrolls away this bar keeps
// the price and a way back to it in reach. Only for learners who haven't enrolled yet.
export function CourseMobileEnrollBar({ priceLabel }: { priceLabel: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tuition</p>
          <p className="text-lg font-extrabold text-navy-900">{priceLabel}</p>
        </div>
        <a href="#enroll" className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-950 hover:bg-gold-400">
          Enroll now
        </a>
      </div>
    </div>
  );
}
