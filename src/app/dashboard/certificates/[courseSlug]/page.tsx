import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getCourseModuleProgress } from '@/features/progress/course-progress-queries';
import { hasPassedRequiredAssessment } from '@/features/assessments/assessment-queries';
import { getStudentProfile } from '@/features/profile/profile-queries';
import { PrintCertificateButton } from '@/features/dashboard/print-certificate-button';

export default async function CertificatePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) redirect('/dashboard');

  const progress = await getCourseModuleProgress(authenticatedUser.userId, courseRecord.id);
  if (!progress.completedAt) redirect('/dashboard');

  const hasPassed = await hasPassedRequiredAssessment(authenticatedUser.userId, courseRecord.id);
  if (!hasPassed) redirect(`/dashboard/courses/${courseRecord.slug}/assessment`);

  const profile = await getStudentProfile(authenticatedUser.userId);
  const certificateName = profile?.legalName || authenticatedUser.displayName;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex justify-center print:hidden">
        <PrintCertificateButton />
      </div>

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
          <p className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">{certificateName}</p>

          <p className="mt-6 max-w-md text-sm text-slate-600">has successfully completed all requirements of the training program</p>
          <p className="mt-2 text-xl font-bold text-gold-600 sm:text-2xl">{courseRecord.title}</p>

          <p className="mt-8 text-sm text-slate-500">
            {progress.completedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="mt-10 flex w-full max-w-xs items-center justify-center border-t border-slate-300 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              United States Security Academy &middot; Train &middot; Certify &middot; Serve &middot; Lead
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
