import Image from 'next/image';
import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Image src="/ussalogo.png" alt="USSA seal" width={64} height={64} className="h-16 w-16" />
      <p className="mt-6 text-sm font-bold uppercase tracking-widest text-gold-600">404</p>
      <h1 className="mt-2 text-2xl font-extrabold text-navy-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Check the address, or head back to somewhere familiar.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Go to homepage
        </Link>
        <Link href="/courses" className="rounded-md border border-navy-900 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-900 hover:text-white">
          Browse courses
        </Link>
      </div>
    </main>
  );
}
