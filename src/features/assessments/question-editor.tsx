'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addChoice, deleteChoice, deleteQuestion, setCorrectChoice, updateChoiceText, updateQuestionText } from './assessment-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { AssessmentChoice, QuestionWithChoices } from './assessment-types';

function ChoiceRow({ questionId, choice }: { questionId: string; choice: AssessmentChoice }) {
  const router = useRouter();
  const [choiceText, setChoiceText] = useState(choice.choiceText);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleBlur() {
    const trimmedText = choiceText.trim();
    if (!trimmedText || trimmedText === choice.choiceText) {
      setChoiceText(choice.choiceText);
      return;
    }
    setIsSaving(true);
    const result = await updateChoiceText(choice.id, trimmedText);
    if (!result.success) {
      setChoiceText(choice.choiceText);
      setErrorMessage(result.error);
    } else {
      setErrorMessage(null);
      router.refresh();
    }
    setIsSaving(false);
  }

  async function handleMarkCorrect() {
    const result = await setCorrectChoice(questionId, choice.id);
    if (result.success) router.refresh();
    else setErrorMessage(result.error);
  }

  async function handleDelete() {
    const result = await deleteChoice(choice.id);
    if (result.success) router.refresh();
    else setErrorMessage(result.error);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="radio"
          name={`correct-choice-${questionId}`}
          checked={choice.isCorrect}
          onChange={handleMarkCorrect}
          aria-label="Mark as the correct answer"
          className="h-4 w-4 shrink-0 accent-gold-500"
        />
        <Input
          value={choiceText}
          onChange={(changeEvent) => setChoiceText(changeEvent.target.value)}
          onBlur={handleBlur}
          disabled={isSaving}
          className={choice.isCorrect ? 'border-gold-500' : ''}
        />
        <button type="button" onClick={handleDelete} aria-label="Delete choice" className="shrink-0 text-slate-400 hover:text-red-600">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      {errorMessage && <p className="mt-1 pl-6 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}

function AddChoiceForm({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [choiceText, setChoiceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!choiceText.trim()) return;
    setIsSubmitting(true);
    const result = await addChoice(questionId, choiceText.trim());
    if (!result.success) {
      setErrorMessage(result.error);
    } else {
      setErrorMessage(null);
      setChoiceText('');
      router.refresh();
    }
    setIsSubmitting(false);
  }

  return (
    <div className="pl-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input placeholder="Add a choice..." value={choiceText} onChange={(changeEvent) => setChoiceText(changeEvent.target.value)} />
        <Button type="submit" variant="outline" isLoading={isSubmitting}>
          Add
        </Button>
      </form>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}

export function QuestionEditor({ question, questionNumber }: { question: QuestionWithChoices; questionNumber: number }) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState(question.questionText);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleBlur() {
    const trimmedText = questionText.trim();
    if (!trimmedText || trimmedText === question.questionText) {
      setQuestionText(question.questionText);
      return;
    }
    setIsSaving(true);
    const result = await updateQuestionText(question.id, trimmedText);
    if (!result.success) {
      setQuestionText(question.questionText);
      setErrorMessage(result.error);
    } else {
      setErrorMessage(null);
      router.refresh();
    }
    setIsSaving(false);
  }

  async function handleDeleteQuestion() {
    const confirmed = window.confirm('Delete this question and its choices? This cannot be undone.');
    if (!confirmed) return;
    const result = await deleteQuestion(question.id);
    if (result.success) router.refresh();
    else setErrorMessage(result.error);
  }

  const hasCorrectChoice = question.choices.some((choice) => choice.isCorrect);

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="mt-2 shrink-0 text-xs font-bold text-slate-400">Q{questionNumber}</span>
        <div className="min-w-0 flex-1">
          <Input
            value={questionText}
            onChange={(changeEvent) => setQuestionText(changeEvent.target.value)}
            onBlur={handleBlur}
            disabled={isSaving}
            className="font-medium"
          />
          {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
          {!hasCorrectChoice && question.choices.length > 0 && (
            <p className="mt-1 text-xs font-semibold text-red-600">Select a correct answer below.</p>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {question.choices.map((choice) => (
              <ChoiceRow key={choice.id} questionId={question.id} choice={choice} />
            ))}
            {question.choices.length === 0 && <p className="pl-6 text-xs text-slate-400">No choices yet — add at least two.</p>}
          </div>
          <div className="mt-2">
            <AddChoiceForm questionId={question.id} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleDeleteQuestion}
          aria-label="Delete question"
          className="shrink-0 text-slate-400 hover:text-red-600"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
