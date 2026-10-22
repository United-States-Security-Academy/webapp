'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { grantCourseAccess } from './user-actions';

export interface GrantableCourse {
  id: string;
  title: string;
  isFree: boolean;
}

// Lets an admin enroll a user in any published course they aren't already in, with no checkout.
export function GrantCourseAccessForm({
  userId,
  displayName,
  courses,
}: {
  userId: string;
  displayName: string;
  courses: GrantableCourse[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (courses.length === 0) {
    return <p className="text-xs text-slate-500">{displayName} already has access to every published course.</p>;
  }

  async function handleGrant(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const course = courses.find((option) => option.id === courseId);
    if (!course) return;
    const confirmed = window.confirm(`Give ${displayName} access to "${course.title}"? They won't be asked to pay.`);
    if (!confirmed) return;

    setIsGranting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = await grantCourseAccess(userId, course.id);
    setIsGranting(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    setCourseId('');
    setSuccessMessage(`${displayName} now has access to "${course.title}".`);
    router.refresh();
  }

  return (
    <form onSubmit={handleGrant} className="flex flex-col gap-2">
      <label htmlFor="grant-course-access" className="text-xs font-semibold text-slate-500">
        Give access to a course (no payment needed)
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="grant-course-access"
          value={courseId}
          disabled={isGranting}
          onChange={(changeEvent) => setCourseId(changeEvent.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-navy-800 focus:outline-none disabled:opacity-50"
        >
          <option value="">Choose a course…</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
              {course.isFree ? ' (free)' : ''}
            </option>
          ))}
        </select>
        <Button type="submit" variant="gold" isLoading={isGranting} disabled={!courseId}>
          Give access
        </Button>
      </div>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
      {successMessage && <p className="text-xs text-green-700">{successMessage}</p>}
    </form>
  );
}
