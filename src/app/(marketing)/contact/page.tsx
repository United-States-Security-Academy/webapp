import { PageBanner } from '@/components/layout/page-banner';
import { Icon, type IconName } from '@/components/ui/icon';

const CONTACT_DETAILS: { icon: IconName; label: string; value: string }[] = [
  { icon: 'phone', label: 'Phone', value: '(832) 260-6092' },
  { icon: 'mail', label: 'Email', value: 'info@ussa-academy.com' },
  { icon: 'mapPin', label: 'Location', value: 'Houston, Texas — training delivered nationwide' },
  { icon: 'clock', label: 'Office Hours', value: 'Monday - Friday, 8:00 AM - 5:00 PM CT' },
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
