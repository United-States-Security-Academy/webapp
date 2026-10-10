import Link from 'next/link';
import { PageBanner } from '@/components/layout/page-banner';
import { Icon, type IconName } from '@/components/ui/icon';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certifications',
  description: 'Industry-recognized certifications across every training program USSA offers.',
};

const CERTIFICATIONS: { icon: IconName; title: string; description: string }[] = [
  { icon: 'military', title: 'Military Training Certification', description: 'Leadership, tactical skills, and mission readiness for military personnel.' },
  { icon: 'lawEnforcement', title: 'Law Enforcement Certification', description: 'Use of force, investigations, and patrol operations for officers.' },
  { icon: 'corrections', title: 'Corrections Certification', description: 'Inmate supervision, crisis intervention, and operational safety.' },
  { icon: 'security', title: 'Security Officer Certification', description: 'Site operations, access control, and risk management.' },
  { icon: 'safety', title: 'Safety & Emergency Preparedness Certification', description: 'OSHA compliance, first aid/CPR, and emergency response.' },
];

const PROCESS_STEPS = [
  { title: 'Enroll', description: 'Choose a certification track and enroll online or through a registrar.' },
  { title: 'Train', description: 'Complete web-based, classroom, or instructor-led coursework at your pace.' },
  { title: 'Assess', description: 'Pass a knowledge and, where applicable, hands-on skills assessment.' },
  { title: 'Certify', description: 'Receive your USSA certification, recognized across agencies and states.' },
];

export default function CertificationsPage() {
  return (
    <>
      <PageBanner
        title="Certifications"
        subtitle="Industry-recognized certifications across every training vertical USSA offers."
      />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CERTIFICATIONS.map((certification) => (
              <div key={certification.title} className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                  <Icon name={certification.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-navy-900">{certification.title.toUpperCase()}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600">{certification.description}</p>
                <Link href="/courses" className="mt-4 text-xs font-bold text-navy-800 hover:text-gold-600">
                  VIEW COURSES &raquo;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-2xl font-extrabold tracking-wide text-navy-900">HOW CERTIFICATION WORKS</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, stepIndex) => (
              <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-navy-950">
                  {stepIndex + 1}
                </span>
                <h3 className="mt-4 text-sm font-bold text-navy-900">{step.title.toUpperCase()}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
