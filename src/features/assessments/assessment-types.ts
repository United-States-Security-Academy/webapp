import type { courseAssessments, assessmentQuestions, assessmentChoices, assessmentAttempts } from '@/db/schema';

export type CourseAssessment = typeof courseAssessments.$inferSelect;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type AssessmentChoice = typeof assessmentChoices.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;

export interface QuestionWithChoices extends AssessmentQuestion {
  choices: AssessmentChoice[];
}

export interface AssessmentWithQuestions extends CourseAssessment {
  questions: QuestionWithChoices[];
}

// The shape shown to a learner taking the assessment — never carries `isCorrect`, so there is
// no way to read the answer key out of the page's server-rendered HTML or a network response.
export interface ChoiceForLearner {
  id: string;
  choiceText: string;
}

export interface QuestionForLearner {
  id: string;
  questionText: string;
  choices: ChoiceForLearner[];
}

export interface AssessmentForLearner {
  id: string;
  title: string;
  passingScorePercentage: number;
  timeLimitMinutes: number | null;
  questions: QuestionForLearner[];
}
