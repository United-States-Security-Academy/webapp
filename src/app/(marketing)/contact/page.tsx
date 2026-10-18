import { PageBanner } from '@/components/layout/page-banner';
import { Icon, type IconName } from '@/components/ui/icon';
import type { Metadata } from 'next';
import { SITE_CONTACT } from '@/features/site/site-contact';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact USSA about enrollment, group training for your agency, or general questions.',
};

const CONTACT_DETAILS: { icon: IconName; label: string; value: string }[] = [
  { icon: 'phone', label: 'Phone', value: SITE_CONTACT.mainPhone },
  { icon: 'mail', label: 'Email', value: SITE_CONTACT.email },
  { icon: 'mapPin', label: 'Location', value: 'Houston, Texas — training delivered nationwide' },
  { icon: 'clock', label: 'Office Hours', value: SITE_CONTACT.officeHours },
];

export default function ContactPage() {
  return (
    <>
      <PageBanner
        title="Contact Us"
        subtitle="Reach out about enrollment, group training for your agency, or general questions."
      />

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-4xl gap-6 px-4 sm:grid-cols-2">
          {CONTACT_DETAILS.map((detail) => (
            <div key={detail.label} className="flex items-start gap-4 rounded-lg border border-slate-200 p-6 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                <Icon name={detail.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{detail.label}</p>
                <p className="mt-1 text-sm font-semibold text-navy-900">{detail.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
