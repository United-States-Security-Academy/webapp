'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { publishCourse, unpublishCourse } from './course-actions';

export function PublishToggleButton({ courseId, isPublished }: { courseId: string; isPublished: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = isPublished ? await unpublishCourse(courseId) : await publishCourse(courseId);
    if (!result.success) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div>
      <Button variant="outline" onClick={handleClick} isLoading={isSubmitting}>
        {isPublished ? 'Unpublish' : 'Publish'}
      </Button>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
