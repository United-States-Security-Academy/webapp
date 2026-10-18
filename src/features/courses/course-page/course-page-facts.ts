// Facts the course page shows from the course's real settings, so they can't drift from what the
// app charges and enforces: the price (course settings) and the exam rules (assessment settings).

export interface CourseExamSummary {
  passingScorePercentage: number;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  questionCount: number;
}

type LabelValue = { label: string; value: string };

// Typed-in rows (quick facts, at a glance, exam details) with these labels repeat a setting, so
// they're hidden in favour of the automatic value. Exam rows only when the course has an exam.
const PRICE_LABEL = /^(tuition|price|cost|course fee|tuition & fees)$/i;
const EXAM_LABELS = [/passing score/i, /attempts?$/i, /time limit/i, /^(number of )?questions$/i];

export function isAutomaticFact(label: string, exam: CourseExamSummary | null): boolean {
  const trimmedLabel = label.trim();
  if (PRICE_LABEL.test(trimmedLabel)) return true;
  return exam !== null && EXAM_LABELS.some((pattern) => pattern.test(trimmedLabel));
}

export function withoutAutomaticFacts(items: LabelValue[] | undefined, exam: CourseExamSummary | null): LabelValue[] {
  return (items ?? []).filter((item) => !isAutomaticFact(item.label, exam));
}

export function buildExamFacts(exam: CourseExamSummary): LabelValue[] {
  return [
    { label: 'Passing score', value: `${exam.passingScorePercentage}% or higher` },
    { label: 'Questions', value: `${exam.questionCount} multiple-choice` },
    { label: 'Time limit', value: exam.timeLimitMinutes ? `${exam.timeLimitMinutes} minutes` : 'No time limit' },
    {
      label: 'Attempts',
      value: exam.maxAttempts ? `Up to ${exam.maxAttempts} attempt${exam.maxAttempts === 1 ? '' : 's'}` : 'Unlimited',
    },
  ];
}
