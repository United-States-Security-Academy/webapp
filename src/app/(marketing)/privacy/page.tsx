import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/layout/legal-document';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How the United States Security Academy collects, uses and protects your personal information.',
};

const SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      'The United States Security Academy ("USSA", "we", "us") provides online training and certification at www.ussa-academy.com. This policy explains what personal information we collect, why we collect it, and how we protect it.',
    ],
  },
  {
    heading: 'Information we collect',
    bullets: [
      'Account details: your name, email address and password (passwords are handled by our authentication provider and are never visible to us).',
      'Student profile details required to issue certificates: your full legal name, the type and number of the government identification you provide (such as the last four digits of your Social Security number, or a Texas driver license or ID card number), phone number, residential address, city, state, country and a profile photo.',
      'Learning records: the courses you enroll in, the lessons you complete, your assessment attempts and answers, and the certificates you earn.',
      'Payment records: the course purchased, the amount, the currency and the payment status. Card details are entered directly with our payment processor, Stripe, and are never sent to or stored by us.',
      'Messages you send us, for example through our contact details.',
    ],
  },
  {
    heading: 'How we use your information',
    bullets: [
      'To create and secure your account and let you sign in.',
      'To deliver courses, track your progress and grade assessments.',
      'To issue and verify certificates, which may require reporting completion details to licensing or regulatory bodies where the law requires it.',
      'To process payments and discounts and keep financial records.',
      'To respond to your questions and send you messages about your account or courses.',
    ],
  },
  {
    heading: 'What we never do',
    paragraphs: ['We do not sell your personal information, and we do not use advertising or analytics trackers on this site.'],
  },
  {
    heading: 'Cookies',
    paragraphs: [
      'We use only the cookies needed to keep you signed in and to keep your session secure. We do not use advertising or cross-site tracking cookies.',
    ],
  },
  {
    heading: 'Who we share it with',
    paragraphs: [
      'We share information only with the service providers that run the platform on our behalf, and only as needed for them to provide their service:',
    ],
    bullets: [
      'Supabase — database, sign-in and file storage.',
      'Vercel — website hosting.',
      'Cloudflare — video streaming for course lessons.',
      'Stripe — payment processing.',
      'Sentry — error monitoring, so we can find and fix problems with the site. Error reports contain technical details about the problem, not your profile, payment or identification details.',
    ],
  },
  {
    heading: 'How we protect it',
    paragraphs: [
      'Information is sent over encrypted connections (HTTPS) and stored with our providers. Access to student records is limited to authorized USSA staff and instructors who need it to deliver training. No system is perfectly secure, but we take reasonable steps to protect your information.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'We keep your account and training records for as long as your account is active and afterwards for as long as needed to verify certificates and meet legal, regulatory and accounting obligations.',
    ],
  },
  {
    heading: 'Your choices',
    paragraphs: [
      'You can view and update your profile at any time from your dashboard. To request a copy of your information, a correction, or deletion of your account, email info@ussa-academy.com. Some records may need to be kept where the law requires it, for example certificate and payment records.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: ['Our courses are intended for adults. We do not knowingly collect information from children under 13.'],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: ['If we make significant changes, we will update the date above and, where appropriate, let you know by email or on the site.'],
  },
  {
    heading: 'Contact us',
    paragraphs: ['Questions about this policy: info@ussa-academy.com or (832) 260-6092.'],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      subtitle="How we collect, use and protect your personal information."
      lastUpdated="October 10, 2026"
      sections={SECTIONS}
    />
  );
}
