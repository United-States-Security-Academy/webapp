import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/layout/legal-document';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that apply when you use the United States Security Academy website and courses.',
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Agreement',
    paragraphs: [
      'By creating an account, enrolling in a course or otherwise using www.ussa-academy.com, you agree to these terms. If you do not agree, please do not use the site.',
    ],
  },
  {
    heading: 'Your account',
    bullets: [
      'You must provide accurate information, including your legal name and identification details, because certificates are issued in your name.',
      'Keep your password private. You are responsible for activity on your account.',
      'Accounts are personal. Do not share your account or let someone else complete coursework or assessments for you.',
    ],
  },
  {
    heading: 'Courses and certificates',
    bullets: [
      'Course access is for your own personal training. Course videos, documents and assessments may not be copied, recorded, shared or resold.',
      'A certificate is issued only after you complete the required lessons and pass any required assessment.',
      'Some assessments are timed. The timer starts when you press Start and keeps running if you leave or refresh the page. When time runs out, your answers are submitted automatically and any unanswered questions are marked incorrect.',
      'Certificates confirm completion of USSA training. Whether a certificate satisfies a licensing or employment requirement is decided by the relevant regulator or employer.',
      'We may update course content to keep it accurate and current.',
    ],
  },
  {
    heading: 'Payments and discounts',
    bullets: [
      'Prices are shown on each course page and charged in the listed currency through our payment processor, Stripe.',
      'Discount codes apply only to the courses, users and dates they were issued for, may be used once per user, and have no cash value.',
      'Course access begins once payment is confirmed.',
      'For questions about a charge or a refund request, contact info@ussa-academy.com.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Cheat on assessments, share assessment questions or answers, or misrepresent your identity.',
      'Attempt to access other users’ accounts or data, or interfere with the site’s security or operation.',
      'Use the site for anything unlawful.',
    ],
  },
  {
    heading: 'Suspension',
    paragraphs: [
      'We may suspend or close accounts that break these terms, including revoking certificates obtained through cheating or false information.',
    ],
  },
  {
    heading: 'Disclaimer and limitation of liability',
    paragraphs: [
      'Training content is provided for educational purposes and does not replace official guidance from your employer, agency or regulator. To the extent allowed by law, the site and courses are provided "as is", and USSA is not liable for indirect or consequential losses arising from their use.',
    ],
  },
  {
    heading: 'Changes',
    paragraphs: ['We may update these terms. The date above shows the latest version. Continuing to use the site after changes means you accept them.'],
  },
  {
    heading: 'Governing law',
    paragraphs: ['These terms are governed by the laws of the State of Texas, United States.'],
  },
  {
    heading: 'Contact us',
    paragraphs: ['Questions about these terms: info@ussa-academy.com or (832) 260-6092.'],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      subtitle="The terms that apply when you use our website and courses."
      lastUpdated="October 12, 2026"
      sections={SECTIONS}
    />
  );
}
