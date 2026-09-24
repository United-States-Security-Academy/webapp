import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/icon';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META } from '@/features/courses/course-category';
import { WhyTrainSection } from '@/features/marketing/why-train-section';
import { HowItWorksSection } from '@/features/marketing/how-it-works-section';
import { DashboardPreviewSection } from '@/features/marketing/dashboard-preview-section';
import { StatsSection } from '@/features/marketing/stats-section';
import { TestimonialsSection } from '@/features/marketing/testimonials-section';
import { CtaBannerSection } from '@/features/marketing/cta-banner-section';
import { FaqSection } from '@/features/marketing/faq-section';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getDashboardHref } from '@/features/auth/get-dashboard-href';

const TRAINING_MODES: { icon: IconName; title: string; description: string }[] = [
  { icon: 'monitor', title: 'Web-Based Training', description: 'Learn Online Anytime, Anywhere' },
  { icon: 'classroom', title: 'Classroom Training', description: 'Interactive In-Person Learning' },
  { icon: 'instructor', title: 'Instructor-Led Training', description: 'Expert Instructors, Real-World Experience' },
];

const TRAINING_PROGRAMS = COURSE_CATEGORIES.map((category) => ({ category, ...COURSE_CATEGORY_META[category] }));

const COMPLIANCE_HIGHLIGHTS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'target',
    title: 'Professional Development',
    description: 'Enhance skills, knowledge, and competencies to advance your career.',
  },
  {
    icon: 'shieldCheck',
    title: 'Operational Readiness',
    description: 'Training that builds confidence, preparedness, and performance in critical situations.',
  },
  {
    icon: 'document',
    title: 'Regulatory Compliance',
    description: 'Stay up to date with laws, policies, and industry standards to ensure compliance.',
  },
];

export default async function HomePage() {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (authenticatedUser) redirect(getDashboardHref(authenticatedUser.role));

  return (
    <>
      <section className="relative isolate flex min-h-[560px] items-center overflow-hidden bg-navy-950 text-white sm:min-h-[640px] lg:min-h-[760px]">
        <Image src="/heroimge.png" alt="" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/75 to-navy-950/10" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              PROFESSIONAL TRAINING,
              <br />
              OPERATIONAL EXCELLENCE.
            </h1>
            <p className="mt-4 text-lg font-semibold tracking-wide text-gold-400">
              TRAINING &amp; CERTIFICATION FOR THOSE WHO PROTECT, SERVE &amp; LEAD.
            </p>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-300">
              United States Security Academy provides web-based, classroom, and
              instructor-led training and certification programs for military
              personnel, law enforcement officers, corrections professionals,
              security personnel, and safety professionals.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {TRAINING_MODES.map((trainingMode) => (
                <div key={trainingMode.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-500 text-gold-400">
                    <Icon name={trainingMode.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{trainingMode.title}</p>
                    <p className="text-xs text-slate-400">{trainingMode.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-8 py-4 text-sm font-bold tracking-wide text-navy-950 hover:bg-gold-400"
            >
              ENROLL NOW <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <WhyTrainSection />
      <HowItWorksSection />

      <section id="courses" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl font-extrabold tracking-wide text-navy-900">
            TRAINING PROGRAMS &amp; CERTIFICATIONS
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {TRAINING_PROGRAMS.map((trainingProgram) => (
              <div
                key={trainingProgram.category}
                className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={trainingProgram.image}
                    alt={trainingProgram.programTitle}
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/0 to-navy-950/0" />
                  <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-gold-400 ring-2 ring-white">
                    <Icon name={trainingProgram.icon} className="h-5 w-5" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-sm font-bold text-navy-900">{trainingProgram.programTitle.toUpperCase()}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600">{trainingProgram.tagline}</p>
                  <Link
                    href={`/programs/${trainingProgram.urlSlug}`}
                    className="mt-4 text-xs font-bold text-navy-800 hover:text-gold-600"
                  >
                    LEARN MORE &raquo;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DashboardPreviewSection />

      <StatsSection />
      <TestimonialsSection />
      <CtaBannerSection />

      <section className="bg-navy-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_1fr_1fr_1.3fr]">
          {COMPLIANCE_HIGHLIGHTS.map((highlight) => (
            <div key={highlight.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-navy-950">
                <Icon name={highlight.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wide text-gold-400">{highlight.title.toUpperCase()}</p>
                <p className="mt-1 text-xs text-slate-300">{highlight.description}</p>
              </div>
            </div>
          ))}

          <div className="flex items-start gap-3 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-navy-950">
              <Icon name="globe" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-wide text-gold-400">LOCAL &middot; NATIONAL &middot; INTERNATIONAL</p>
              <p className="mt-1 text-xs text-slate-300">
                United States Security Academy delivers training solutions to
                individuals, agencies, organizations, and corporations around
                the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
    </>
  );
}
