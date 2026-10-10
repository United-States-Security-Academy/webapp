import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getCourseModuleProgress } from '@/features/progress/course-progress-queries';
import { hasPassedRequiredAssessment } from '@/features/assessments/assessment-queries';
import { getStudentProfile } from '@/features/profile/profile-queries';
import { PrintCertificateButton } from '@/features/dashboard/print-certificate-button';
import { CertificateDocument } from '@/features/dashboard/certificate-document';

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

      <CertificateDocument recipientName={certificateName} courseTitle={courseRecord.title} completedAt={progress.completedAt} />
    </main>
  );
}
