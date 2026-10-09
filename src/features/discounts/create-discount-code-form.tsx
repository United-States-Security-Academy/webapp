'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createDiscountCode } from './discount-actions';

const LABEL_CLASS_NAME = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600';
const ALL_COURSES_VALUE = '';

export function CreateDiscountCodeForm({ courseOptions }: { courseOptions: { id: string; title: string }[] }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [percentOffInput, setPercentOffInput] = useState('');
  const [courseId, setCourseId] = useState(ALL_COURSES_VALUE);
  const [allowedEmailsText, setAllowedEmailsText] = useState('');
  const [maxRedemptionsInput, setMaxRedemptionsInput] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await createDiscountCode({
      code,
      percentOff: Number(percentOffInput),
      courseId: courseId || null,
      allowedEmailsText,
      maxRedemptions: maxRedemptionsInput ? Number(maxRedemptionsInput) : null,
      expiresOn: expiresOn || null,
    });
    setIsSubmitting(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    setCode('');
    setPercentOffInput('');
    setCourseId(ALL_COURSES_VALUE);
    setAllowedEmailsText('');
    setMaxRedemptionsInput('');
    setExpiresOn('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <div>
        <label className={LABEL_CLASS_NAME}>Code</label>
        <Input
          placeholder="e.g. SPRING25"
          value={code}
          onChange={(changeEvent) => setCode(changeEvent.target.value.toUpperCase())}
          required
        />
      </div>
      <div>
        <label className={LABEL_CLASS_NAME}>Percentage off</label>
        <Input
          type="number"
          min="1"
          max="100"
          step="1"
          placeholder="e.g. 25"
          value={percentOffInput}
          onChange={(changeEvent) => setPercentOffInput(changeEvent.target.value)}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL_CLASS_NAME}>Course</label>
        <select
          value={courseId}
          onChange={(changeEvent) => setCourseId(changeEvent.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value={ALL_COURSES_VALUE}>All courses</option>
          {courseOptions.map((courseOption) => (
            <option key={courseOption.id} value={courseOption.id}>
              {courseOption.title}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={LABEL_CLASS_NAME}>Only for these users (optional)</label>
        <textarea
          rows={3}
          placeholder="jane@example.com, john@example.com"
          value={allowedEmailsText}
          onChange={(changeEvent) => setAllowedEmailsText(changeEvent.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">
          Emails separated by commas or new lines. Leave blank to let anyone with the code use it.
        </p>
      </div>
      <div>
        <label className={LABEL_CLASS_NAME}>Usage limit (optional)</label>
        <Input
          type="number"
          min="1"
          step="1"
          placeholder="Unlimited"
          value={maxRedemptionsInput}
          onChange={(changeEvent) => setMaxRedemptionsInput(changeEvent.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">Total uses across all users. Each user can use a code once.</p>
      </div>
      <div>
        <label className={LABEL_CLASS_NAME}>Expires after (optional)</label>
        <Input type="date" value={expiresOn} onChange={(changeEvent) => setExpiresOn(changeEvent.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" isLoading={isSubmitting}>
          Create discount code
        </Button>
        {errorMessage && <p className="mt-2 text-xs text-red-600">{errorMessage}</p>}
      </div>
    </form>
  );
}
