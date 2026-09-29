'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteCourse } from './course-actions';

export function DeleteCourseButton({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${courseTitle}"? This removes all its modules, lessons, and enrollments. This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage(null);
    const result = await deleteCourse(courseId);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsDeleting(false);
      return;
    }
    router.push('/instructor/courses');
    router.refresh();
  }

  return (
    <div>
      <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
        Delete course
      </Button>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
