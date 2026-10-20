import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { GoldStreaks, VeteransFlag } from './veterans-artwork';

// The banner's wording. Change it here; the headline's gold part is `headlineHighlight`.
const ANNOUNCEMENT = {
  label: 'Veterans Program',
  headline: 'Veterans: Train',
  headlineHighlight: 'Tuition-Free',
  tagline: 'You served. We’re honored to serve you.',
  eligibility: 'For verified U.S. military veterans',
  buttonLabel: 'Apply now',
  buttonHref: '/veterans',
  buttonNote: 'Veteran verification required',
};

// Announcement card on the home page, right after "Why Train With USSA?" (whose bottom padding spaces it).
export function VeteransAnnouncementSection() {
  return (
    <section aria-labelledby="veterans-announcement-title" className="bg-navy-950 px-4 pb-16">
      <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white shadow-2xl shadow-black/40 ring-1 ring-gold-500/30">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_65%_-10%,rgba(70,120,215,0.35),transparent_60%)]" />
        <div className="pointer-events-none absolute -left-16 -top-10 -z-10 h-[150%] w-[85%] opacity-50 [mask-image:linear-gradient(110deg,black_25%,transparent_70%)] md:-left-20 md:w-[55%] md:opacity-100 lg:w-[42%]">
          <VeteransFlag className="h-full w-full -rotate-12 scale-125" />
        </div>
        <GoldStreaks className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-50 md:opacity-100" />

        <div className="grid gap-8 px-6 py-10 sm:px-10 sm:py-12 md:pl-[38%] lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12 lg:py-14 lg:pl-[30%] lg:pr-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-navy-950/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 backdrop-blur-sm">
              <Icon name="military" className="h-4 w-4" />
              {ANNOUNCEMENT.label}
            </p>
            <h2
              id="veterans-announcement-title"
              className="mt-4 text-3xl font-extrabold uppercase leading-[1.05] tracking-tight drop-shadow-sm sm:text-4xl xl:text-5xl"
            >
              {ANNOUNCEMENT.headline}{' '}
              <span className="bg-gradient-to-b from-[#f7dc95] via-gold-400 to-gold-600 bg-clip-text text-transparent">
                {ANNOUNCEMENT.headlineHighlight}
              </span>
            </h2>
            <p className="mt-3 text-lg font-semibold sm:text-xl">{ANNOUNCEMENT.tagline}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <Icon name="shieldCheck" className="h-4 w-4 shrink-0 text-gold-400" />
              {ANNOUNCEMENT.eligibility}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-start lg:items-center">
            <Link
              href={ANNOUNCEMENT.buttonHref}
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[#f7dc95] via-gold-400 to-gold-600 px-9 py-4 text-base font-extrabold uppercase tracking-wide text-navy-950 shadow-[0_0_36px_rgba(198,161,91,0.45)] ring-1 ring-inset ring-white/40 transition hover:shadow-[0_0_56px_rgba(198,161,91,0.7)] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400 motion-safe:hover:-translate-y-0.5"
            >
              {ANNOUNCEMENT.buttonLabel}
              <span aria-hidden className="transition-transform motion-safe:group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            <p className="text-center text-xs text-slate-400">{ANNOUNCEMENT.buttonNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
