'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { StructuredQuizQuestion } from '@/db/schema/structured-courses';
import { Icon } from '@/components/ui/icon';

// Practice questions inside a lesson (not the graded final assessment, so the answers can live in
// the browser). A wrong pick is marked and the student tries again; once the right answer is
// picked the explanation appears. `onPassed` fires when every question is answered correctly.

interface QuestionState {
  wrongIndexes: number[];
  isSolved: boolean;
}

function QuizQuestion({
  question,
  number,
  questionCount,
  state,
  onAnswer,
}: {
  question: StructuredQuizQuestion;
  number: number;
  questionCount: number;
  state: QuestionState;
  onAnswer: (optionIndex: number) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const lastWrongIndex = state.wrongIndexes[state.wrongIndexes.length - 1];

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[17px] font-semibold leading-snug text-slate-900">
        {questionCount > 1 && <span className="mr-1 text-slate-500">{number}.</span>}
        {question.prompt}
      </legend>
      {question.options.map((option, optionIndex) => {
        const isCorrect = state.isSolved && optionIndex === question.correctIndex;
        const isWrong = state.wrongIndexes.includes(optionIndex);
        const stateClassName = isCorrect
          ? 'border-green-600 bg-green-50 text-green-900'
          : isWrong
            ? 'border-red-300 bg-red-50 text-red-800'
            : 'border-slate-300 bg-white text-slate-800 hover:border-navy-800 hover:bg-slate-50';
        return (
          <button
            key={optionIndex}
            type="button"
            onClick={() => onAnswer(optionIndex)}
            disabled={state.isSolved || isWrong}
            aria-pressed={isCorrect || isWrong}
            className={`flex min-h-[3rem] w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-[16px] transition-colors disabled:cursor-default ${stateClassName}`}
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isCorrect ? 'border-green-600 bg-green-600 text-white' : isWrong ? 'border-red-300 text-red-600' : 'border-slate-300 text-slate-500'}`}
            >
              {isCorrect ? <Icon name="checkCircle" className="h-4 w-4" /> : isWrong ? '✕' : String.fromCharCode(65 + optionIndex)}
            </span>
            <span>{option}</span>
            {isCorrect && <span className="sr-only">(correct)</span>}
            {isWrong && <span className="sr-only">(incorrect)</span>}
          </button>
        );
      })}

      <div aria-live="polite">
        <AnimatePresence initial={false}>
          {state.isSolved ? (
            <motion.div
              key="solved"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-green-50 px-4 py-3 text-[15px] leading-relaxed text-green-900"
            >
              <p className="font-semibold">Correct.</p>
              {question.explanation && <p className="mt-1">{question.explanation}</p>}
            </motion.div>
          ) : (
            lastWrongIndex !== undefined && (
              <motion.p
                key={`wrong-${lastWrongIndex}`}
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[15px] font-medium text-red-700"
              >
                Not quite. Try again.
              </motion.p>
            )
          )}
        </AnimatePresence>
      </div>
    </fieldset>
  );
}

export function QuizBlock({
  questions,
  onPassed,
  onAnswer,
}: {
  questions: StructuredQuizQuestion[];
  onPassed: () => void;
  // Every option the student picks, right or wrong, for the student page to save.
  onAnswer?: (questionIndex: number, optionIndex: number) => void;
}) {
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(() => questions.map(() => ({ wrongIndexes: [], isSolved: false })));
  const isPassed = questionStates.every((state) => state.isSolved);

  useEffect(() => {
    if (isPassed) onPassed();
  }, [isPassed, onPassed]);

  function handleAnswer(questionIndex: number, optionIndex: number) {
    const state = questionStates[questionIndex];
    if (!state || state.isSolved || state.wrongIndexes.includes(optionIndex)) return;
    onAnswer?.(questionIndex, optionIndex);
    setQuestionStates((previous) =>
      previous.map((state, index) => {
        if (index !== questionIndex || state.isSolved) return state;
        if (optionIndex === questions[questionIndex]?.correctIndex) return { ...state, isSolved: true };
        return { ...state, wrongIndexes: [...state.wrongIndexes, optionIndex] };
      }),
    );
  }

  return (
    <section aria-label="Practice question" className="max-w-[70ch] rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy-800">
        <Icon name="target" className="h-4 w-4" />
        {questions.length === 1 ? 'Check your understanding' : `Check your understanding · ${questions.length} questions`}
      </p>
      <div className="flex flex-col gap-8">
        {questions.map((question, questionIndex) => (
          <QuizQuestion
            key={questionIndex}
            question={question}
            number={questionIndex + 1}
            questionCount={questions.length}
            state={questionStates[questionIndex]!}
            onAnswer={(optionIndex) => handleAnswer(questionIndex, optionIndex)}
          />
        ))}
      </div>
    </section>
  );
}
