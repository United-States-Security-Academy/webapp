import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon, type IconName } from '@/components/ui/icon';
import { GoldStreaks, VeteransFlag } from '@/features/marketing/veterans-artwork';
import { SITE_CONTACT, phoneHref } from '@/features/site/site-contact';

export const metadata: Metadata = {
  title: 'Veterans: Train Tuition-Free',
  description: 'Verified U.S. military veterans can train with United States Security Academy tuition-free. See who is eligible and how to apply.',
};

// Where the home page's veterans announcement (APPLY NOW) leads. There is no online application:
// veterans apply by phone or email and staff verify their service. The wording below is USSA's
// offer to the public, so check changes to it with the organisation. The header reuses the
// announcement's artwork and gold styling (veterans-announcement-section.tsx); keep them matching.
const APPLY_EMAIL_HREF = `mailto:${SITE_CONTACT.email}?subject=${encodeURIComponent('Veterans tuition-free training application')}`;

const ELIGIBILITY: string[] = [
  'You served in the U.S. Armed Forces (Army, Navy, Air Force, Marine Corps, Space Force or Coast Guard).',
  'You can show proof of your military service so we can verify it.',
  'You want to build a career in security, law enforcement, corrections or safety.',
];

const STEPS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'phone',
    title: 'Get in touch',
    description: 'Call or email our team and tell us you’re applying for the veterans program, and which training interests you.',
  },
  {
    icon: 'shieldCheck',
    title: 'Verify your service',
    description: 'We’ll ask for proof of your military service and confirm your eligibility.',
  },
  {
    icon: 'award',
    title: 'Start training',
    description: 'Once you’re verified, we enroll you in your program tuition-free and you can start learning.',
  },
];

export default function VeteransPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_65%_-10%,rgba(70,120,215,0.35),transparent_60%)]" />
        <div className="pointer-events-none absolute -left-16 -top-10 -z-10 h-[150%] w-[85%] opacity-40 [mask-image:linear-gradient(110deg,black_25%,transparent_70%)] md:w-[50%] md:opacity-90 lg:w-[40%]">
          <VeteransFlag className="h-full w-full -rotate-12 scale-125" />
        </div>
        <GoldStreaks className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-50 md:opacity-100" />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20 md:pl-[38%] lg:pl-[32%]">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-navy-950/60 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gold-400 backdrop-blur-sm">
            <Icon name="military" className="h-4 w-4" />
            Veterans Program
          </p>
          <h1 className="mt-4 text-3xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-5xl">
            Veterans: Train{' '}
            <span className="bg-gradient-to-b from-[#f7dc95] via-gold-400 to-gold-600 bg-clip-text text-transparent">Tuition-Free</span>
          </h1>
          <p className="mt-4 text-lg font-semibold sm:text-xl">You served. We’re honored to serve you.</p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            United States Security Academy offers verified U.S. military veterans our training and certification programs
            tuition-free, so you can turn your service experience into a civilian career protecting people and property.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#apply"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[#f7dc95] via-gold-400 to-gold-600 px-8 py-3.5 text-sm font-extrabold uppercase tracking-wide text-navy-950 shadow-[0_0_32px_rgba(198,161,91,0.4)] ring-1 ring-inset ring-white/40 transition hover:brightness-105"
            >
              How to apply <span aria-hidden>&darr;</span>
            </a>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition hover:border-gold-400 hover:text-gold-400"
            >
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-xs font-bold tracking-[0.3em] text-gold-600">WHO CAN APPLY</p>
          <h2 className="mt-2 text-2xl font-extrabold text-navy-900 sm:text-3xl">Eligibility</h2>
          <ul className="mt-6 flex flex-col gap-3">
            {ELIGIBILITY.map((requirement) => (
              <li key={requirement} className="flex items-start gap-3 text-sm text-slate-700 sm:text-base">
                <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                {requirement}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="apply" className="scroll-mt-24 bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <p className="text-xs font-bold tracking-[0.3em] text-gold-600">HOW TO APPLY</p>
          <h2 className="mt-2 text-2xl font-extrabold text-navy-900 sm:text-3xl">Three steps to start training</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <span className="absolute right-5 top-4 text-4xl font-extrabold text-slate-100" aria-hidden>
                  {index + 1}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                  <Icon name={step.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-navy-900">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-6 rounded-xl bg-navy-950 p-6 text-white sm:p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-extrabold">Ready to apply?</h3>
              <p className="mt-1 text-sm text-slate-300">
                Contact our team to start your application. {SITE_CONTACT.officeHours}.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={phoneHref(SITE_CONTACT.mainPhone)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gold-500 px-6 py-3 text-sm font-bold text-navy-950 hover:bg-gold-400"
              >
                <Icon name="phone" className="h-4 w-4" />
                {SITE_CONTACT.mainPhone}
              </a>
              <a
                href={APPLY_EMAIL_HREF}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-6 py-3 text-sm font-bold hover:border-gold-400 hover:text-gold-400"
              >
                <Icon name="mail" className="h-4 w-4" />
                Email us
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
