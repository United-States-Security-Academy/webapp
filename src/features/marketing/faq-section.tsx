import { Icon } from '@/components/ui/icon';

// Also feeds the homepage's FAQPage structured data, so the markup always matches what's shown.
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Who is United States Security Academy training for?',
    answer:
      'Military personnel, law enforcement officers, corrections professionals, security personnel, and safety professionals looking to build skills and earn recognized certifications.',
  },
  {
    question: 'How do I enroll in a course?',
    answer:
      'Create a free account, browse the course catalog, and enroll directly from a course page. Free courses grant instant access; paid courses unlock as soon as checkout is complete.',
  },
  {
    question: 'Can I access courses on any device?',
    answer:
      'Yes. Every course is web-based, so you can train from a desktop, tablet, or phone, on your own schedule.',
  },
  {
    question: 'Do I get a certificate after finishing a course?',
    answer:
      'Yes. Once you complete every lesson in a course, a certificate is automatically generated and available from your dashboard.',
  },
  {
    question: 'Do you offer classroom or instructor-led training?',
    answer:
      'In addition to web-based training, we offer classroom and instructor-led programs. Contact us to discuss scheduling one for your team or agency.',
  },
  {
    question: 'How do I become an instructor?',
    answer:
      'Reach out through our contact page with your background and areas of expertise, and our team will follow up about publishing courses on the platform.',
  },
];

export function FaqSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center text-2xl font-extrabold tracking-wide text-navy-900">FREQUENTLY ASKED QUESTIONS</h2>

        <div className="mt-10 flex flex-col gap-3">
          {FAQ_ITEMS.map((faqItem) => (
            <details key={faqItem.question} className="group rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-navy-900">
                {faqItem.question}
                <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-navy-800 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{faqItem.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
