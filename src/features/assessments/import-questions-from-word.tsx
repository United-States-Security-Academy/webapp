'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importAssessmentQuestions, previewAssessmentDocx } from './import-assessment-actions';
import { MAX_ASSESSMENT_DOCX_BYTES, TOO_LARGE_MESSAGE } from './validate-imported-questions';
import type { ParsedAssessment } from './parse-assessment-docx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const LETTERS = 'ABCDEFGHIJ';

const FORMAT_EXAMPLE = `1. Which sources establish the main Texas private security licensing framework?
A. The company's employee handbook alone
B. Texas Occupations Code Chapter 1702 and 37 TAC Chapter 35
C. A handgun carry license and local business registration
D. Client post orders and a local trade association handbook
Answer: B`;

// Uploads a Word file of multiple-choice questions, shows what was read, and lets the instructor
// pick each question's correct answer before the questions are added to the assessment.
export function ImportQuestionsFromWord({ assessmentId, existingQuestionCount }: { assessmentId: string; existingQuestionCount: number }) {
  const router = useRouter();
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedAssessment | null>(null);
  // Index of the correct choice for each previewed question; null until picked.
  const [correctChoiceIndexes, setCorrectChoiceIndexes] = useState<(number | null)[]>([]);

  async function handleFileChange(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = changeEvent.target.files?.[0];
    // Lets the same file be picked again after fixing it in Word.
    changeEvent.target.value = '';
    if (!selectedFile) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setPreview(null);
    if (selectedFile.size > MAX_ASSESSMENT_DOCX_BYTES) {
      setErrorMessage(TOO_LARGE_MESSAGE);
      return;
    }

    setIsReading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    const result = await previewAssessmentDocx(assessmentId, formData);
    setIsReading(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    setPreview(result.data);
    setCorrectChoiceIndexes(result.data.questions.map((question) => question.correctChoiceIndex));
  }

  function handlePickAnswer(questionIndex: number, choiceIndex: number) {
    setCorrectChoiceIndexes((current) => current.map((value, index) => (index === questionIndex ? choiceIndex : value)));
  }

  function handleCancel() {
    setPreview(null);
    setErrorMessage(null);
  }

  async function handleImport() {
    if (!preview) return;
    setIsImporting(true);
    setErrorMessage(null);
    const result = await importAssessmentQuestions(
      assessmentId,
      preview.questions.map((question, index) => ({ ...question, correctChoiceIndex: correctChoiceIndexes[index] })),
    );
    setIsImporting(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    setPreview(null);
    const { importedCount } = result.data;
    setSuccessMessage(`Imported ${importedCount} question${importedCount === 1 ? '' : 's'}.`);
    router.refresh();
  }

  const unansweredCount = correctChoiceIndexes.filter((value) => value === null).length;
  const canImport = !!preview && preview.errors.length === 0 && preview.questions.length > 0 && unansweredCount === 0;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Import questions from Word</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Upload a .docx of multiple-choice questions, then choose the correct answer for each one.
            {existingQuestionCount > 0 && ` They are added after the ${existingQuestionCount} existing questions.`}
          </p>
        </div>
        {!preview && (
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
            {isReading && <Spinner className="h-4 w-4" />}
            {isReading ? 'Reading file...' : 'Upload .docx'}
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isReading}
            />
          </label>
        )}
      </div>

      {!preview && (
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-700">How to format the Word file</summary>
          <p className="mt-2">
            Number each question and put its lettered choices on the lines below it. Word&apos;s automatic numbering works too. The
            &quot;Answer:&quot; line is optional; without it, you pick the answer here after uploading.
          </p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-mono text-[11px] text-slate-700">
            {FORMAT_EXAMPLE}
          </pre>
          <p className="mt-2">
            You can also mark the right choice with a * (&quot;*B. ...&quot;), or end the file with an &quot;Answer key&quot; heading
            followed by lines like &quot;1. B&quot;.
          </p>
        </details>
      )}

      {errorMessage && <p className="mt-3 text-xs text-red-600">{errorMessage}</p>}
      {successMessage && <p className="mt-3 text-xs font-semibold text-emerald-700">{successMessage}</p>}

      {preview && (
        <div className="mt-4">
          {preview.errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="font-semibold">Fix these in Word, then upload the file again:</p>
              <ul className="mt-1 list-disc pl-5">
                {preview.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {preview.warnings.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <ul className="list-disc pl-5">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.questions.length > 0 && (
            <ol className="mt-3 flex flex-col gap-3">
              {preview.questions.map((question, questionIndex) => {
                const isUnanswered = correctChoiceIndexes[questionIndex] === null;
                return (
                  <li
                    key={questionIndex}
                    className={`rounded-md border p-3 ${isUnanswered ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}
                  >
                    <p className="text-sm font-medium text-slate-900">
                      <span className="mr-2 text-xs font-bold text-slate-400">Q{existingQuestionCount + questionIndex + 1}</span>
                      {question.questionText}
                    </p>
                    {isUnanswered && <p className="mt-1 text-xs font-semibold text-red-600">Select the correct answer.</p>}
                    <div className="mt-2 flex flex-col gap-1.5">
                      {question.choices.map((choiceText, choiceIndex) => (
                        <label key={choiceIndex} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            name={`import-correct-${questionIndex}`}
                            checked={correctChoiceIndexes[questionIndex] === choiceIndex}
                            onChange={() => handlePickAnswer(questionIndex, choiceIndex)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-gold-500"
                          />
                          <span>
                            <span className="font-semibold">{LETTERS[choiceIndex]}.</span> {choiceText}
                          </span>
                        </label>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleImport} disabled={!canImport} isLoading={isImporting}>
              Import {preview.questions.length} question{preview.questions.length === 1 ? '' : 's'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isImporting}>
              Cancel
            </Button>
            {preview.errors.length === 0 && unansweredCount > 0 && (
              <p className="text-xs text-slate-500">
                Choose the correct answer for {unansweredCount} more question{unansweredCount === 1 ? '' : 's'}.
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
