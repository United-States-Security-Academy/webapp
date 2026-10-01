import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course } = await searchParams;

  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-16">
      <Card className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <Icon name="close" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-navy-900">Checkout canceled</h1>
        <p className="mt-2 text-sm text-slate-600">No charge was made. You can try again whenever you&apos;re ready.</p>
        <Link
          href={course ? `/courses/${course}` : '/courses'}
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
        >
          Back to course
        </Link>
      </Card>
    </section>
  );
}
