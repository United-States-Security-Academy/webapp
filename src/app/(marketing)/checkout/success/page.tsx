import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course } = await searchParams;

  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-16">
      <Card className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-navy-950">
          <Icon name="checkCircle" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-navy-900">Payment successful</h1>
        <p className="mt-2 text-sm text-slate-600">
          Thanks for enrolling. Your access will be unlocked automatically — this usually takes just a few seconds.
        </p>
        <Link
          href={course ? `/courses/${course}` : '/dashboard'}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
        >
          Go to course
        </Link>
      </Card>
    </section>
  );
}
