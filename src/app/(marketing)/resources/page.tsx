import { PageBanner } from '@/components/layout/page-banner';
import { Icon, type IconName } from '@/components/ui/icon';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources',
  description: 'Student handbook, certification verification, compliance updates and answers to common questions.',
};

const RESOURCE_LINKS: { icon: IconName; title: string; description: string }[] = [
  { icon: 'bookOpen', title: 'Student Handbook', description: 'Policies, conduct standards, and program requirements for enrolled students.' },
  { icon: 'checkCircle', title: 'Certification Verification', description: 'Agencies can verify a graduate’s USSA certification status.' },
  { icon: 'document', title: 'Compliance Updates', description: 'Notices when curricula change to reflect new laws or standards.' },
];

const FAQS = [
  {
    question: 'How long does certification take?',
    answer: 'It depends on the track and training mode. Web-based courses are self-paced; instructor-led and classroom courses run on a fixed schedule, typically a few days to a few weeks.',
  },
  {
    question: 'Are USSA certifications recognized nationwide?',
    answer: 'Yes. Our curricula are built to current regulatory and industry standards and are recognized by agencies locally, nationally, and internationally.',
  },
  {
    question: 'Can my agency enroll a group of officers or staff?',
    answer: 'Yes — contact us and a registrar will set up group enrollment for your agency or organization.',
  },
  {
    question: 'What happens if I fail a certification assessment?',
    answer: 'You can retake the assessment after a short review period. Your instructor will point you to the specific material to revisit first.',
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PageBanner
        title="Resources"
        subtitle="Handbooks, compliance updates, and answers to common questions about training and certification."
      />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-3">
            {RESOURCE_LINKS.map((resource) => (
              <div key={resource.title} className="flex flex-col rounded-lg border border-slate-200 p-6 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                  <Icon name={resource.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-navy-900">{resource.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{resource.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-2xl font-extrabold tracking-wide text-navy-900">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="mt-8 flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-navy-900">
                  {faq.question}
                  <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-gold-600 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
