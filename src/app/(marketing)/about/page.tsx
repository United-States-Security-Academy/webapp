import { PageBanner } from '@/components/layout/page-banner';
import { StatsSection } from '@/features/marketing/stats-section';
import { Icon, type IconName } from '@/components/ui/icon';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Who we are and how USSA trains security, law enforcement, corrections, military and safety professionals.',
};

const CORE_VALUES: { icon: IconName; title: string; description: string }[] = [
  { icon: 'shieldCheck', title: 'Honor', description: 'We hold ourselves and our graduates to the highest standard of conduct.' },
  { icon: 'checkCircle', title: 'Integrity', description: 'Training built on accuracy, transparency, and accountability.' },
  { icon: 'award', title: 'Excellence', description: 'Rigorous, current curricula designed with working professionals.' },
  { icon: 'lawEnforcement', title: 'Protection', description: 'Everything we teach serves the safety of the communities our graduates protect.' },
];

export default function AboutPage() {
  return (
    <>
      <PageBanner
        title="About Us"
        subtitle="United States Security Academy trains the people who protect, serve, and lead our communities and nation."
      />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-sm leading-relaxed text-slate-700">
          <p>
            United States Security Academy provides web-based, classroom, and
            instructor-led training and certification programs for military
            personnel, law enforcement officers, corrections professionals,
            security personnel, and safety professionals. Our mission is
            simple: train, certify, serve, and lead.
          </p>
          <p className="mt-4">
            Every course is built around real operational requirements —
            regulatory compliance, professional development, and readiness for
            critical situations — and delivered in whichever mode fits a
            student&apos;s schedule, whether that&apos;s self-paced online,
            in-person classroom instruction, or hands-on instructor-led
            training.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl font-extrabold tracking-wide text-navy-900">OUR VALUES</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CORE_VALUES.map((value) => (
              <div key={value.title} className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                  <Icon name={value.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-navy-900">{value.title.toUpperCase()}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StatsSection />
    </>
  );
}
