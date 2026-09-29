'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitAssessmentAttempt, type SubmittedAnswer } from './submit-assessment-action';
import { Button } from '@/components/ui/button';
import type { AssessmentForLearner } from './assessment-types';

export function AssessmentAttemptForm({
  courseId,
  courseSlug,
  assessment,
}: {
  courseId: string;
  courseSlug: string;
  assessment: AssessmentForLearner;
}) {
  const router = useRouter();
  const [selectedChoiceByQuestionId, setSelectedChoiceByQuestionId] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAnsweredEveryQuestion = assessment.questions.every((question) => !!selectedChoiceByQuestionId[question.id]);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const answers: SubmittedAnswer[] = assessment.questions.map((question) => ({
      questionId: question.id,
      selectedChoiceId: selectedChoiceByQuestionId[question.id]!,
    }));
    const result = await submitAssessmentAttempt(courseId, answers);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }
    router.push(`/dashboard/courses/${courseSlug}/assessment/results/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {assessment.questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900">
            {index + 1}. {question.questionText}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {question.choices.map((choice) => (
              <label key={choice.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={choice.id}
                  checked={selectedChoiceByQuestionId[question.id] === choice.id}
                  onChange={() => setSelectedChoiceByQuestionId((current) => ({ ...current, [question.id]: choice.id }))}
                  className="h-4 w-4 accent-navy-800"
                />
                {choice.choiceText}
              </label>
            ))}
          </div>
        </div>
      ))}

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <Button type="submit" isLoading={isSubmitting} disabled={!hasAnsweredEveryQuestion} className="w-fit">
        Submit assessment
      </Button>
    </form>
  );
}
