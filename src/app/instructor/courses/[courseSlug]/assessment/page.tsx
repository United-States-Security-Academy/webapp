import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug } from '@/features/courses/course-queries';
import { getAssessmentWithQuestions } from '@/features/assessments/assessment-queries';
import { CreateAssessmentForm } from '@/features/assessments/create-assessment-form';
import { AssessmentSettingsForm } from '@/features/assessments/assessment-settings-form';
import { AddQuestionForm } from '@/features/assessments/add-question-form';
import { QuestionEditor } from '@/features/assessments/question-editor';
import { DeleteAssessmentButton } from '@/features/assessments/delete-assessment-button';
import { ImportQuestionsFromWord } from '@/features/assessments/import-questions-from-word';

export default async function InstructorCourseAssessmentPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();
  if (authenticatedUser.role !== 'admin' && course.ownerId !== authenticatedUser.userId) notFound();

  const assessment = await getAssessmentWithQuestions(course.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/instructor/courses/${course.slug}`} className="text-xs font-semibold text-slate-500 hover:text-navy-800">
        &larr; Back to {course.title}
      </Link>

      <div className="mt-2">
        {!assessment ? (
          <CreateAssessmentForm courseId={course.id} />
        ) : (
          <>
            <AssessmentSettingsForm courseId={course.id} assessment={assessment} />

            <section className="mt-6">
              <h2 className="text-lg font-semibold text-slate-900">Questions</h2>
              <p className="text-sm text-slate-500">
                Students unlock this assessment once they complete every lesson in the course.
              </p>
              <div className="mt-4 flex flex-col gap-4">
                {assessment.questions.map((question, index) => (
                  <QuestionEditor key={question.id} question={question} questionNumber={index + 1} />
                ))}
              </div>
              <div className="mt-4">
                <AddQuestionForm assessmentId={assessment.id} />
              </div>
              <div className="mt-4">
                <ImportQuestionsFromWord assessmentId={assessment.id} existingQuestionCount={assessment.questions.length} />
              </div>
            </section>

            <section className="mt-8 border-t border-slate-200 pt-4">
              <DeleteAssessmentButton assessmentId={assessment.id} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
