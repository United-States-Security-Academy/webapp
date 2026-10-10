import Image from 'next/image';

// The printable certificate itself, kept separate from the page's access checks.
export function CertificateDocument({
  recipientName,
  courseTitle,
  completedAt,
}: {
  recipientName: string;
  courseTitle: string;
  completedAt: Date;
}) {
  return (
    <div className="relative border-[10px] border-double border-navy-900 bg-white px-8 py-14 text-center sm:px-16">
      <div className="absolute inset-3 border border-gold-500/60" />

      <div className="relative flex flex-col items-center">
        <Image src="/ussalogo.png" alt="USSA seal" width={64} height={64} className="h-16 w-16" />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-600">
          United States Security Academy
        </p>

        <h1 className="mt-8 text-3xl font-extrabold uppercase tracking-wide text-navy-900 sm:text-4xl">
          Certificate of Completion
        </h1>

        <p className="mt-8 text-sm uppercase tracking-wide text-slate-500">This certifies that</p>
        <p className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">{recipientName}</p>

        <p className="mt-6 max-w-md text-sm text-slate-600">has successfully completed all requirements of the training program</p>
        <p className="mt-2 text-xl font-bold text-gold-600 sm:text-2xl">{courseTitle}</p>

        <p className="mt-8 text-sm text-slate-500">
          {completedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col items-center">
          {/* Signature sits on the line, the way a pen signature would on a printed certificate. */}
          <Image
            src="/certificate-signature.png"
            alt="Authorized signature"
            width={308}
            height={62}
            className="-mb-1 h-auto w-48 sm:w-56"
          />
          <div className="w-full border-t border-slate-300 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">United States Security Academy</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-600">
              Train &middot; Certify &middot; Serve &middot; Lead
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
