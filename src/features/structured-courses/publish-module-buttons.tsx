'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { publishStructuredModule, unpublishStructuredModule } from './structured-module-actions';

// Publish the previewed draft (or re-publish a newer one), and unpublish.
export function PublishModuleButtons({
  moduleId,
  draftRevisionId,
  publishedRevisionId,
}: {
  moduleId: string;
  draftRevisionId: string | null;
  publishedRevisionId: string | null;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<'publish' | 'unpublish' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPublished = publishedRevisionId !== null;
  const isDraftPublished = isPublished && draftRevisionId === publishedRevisionId;

  async function handlePublish() {
    if (!draftRevisionId) return;
    const confirmed = window.confirm(
      isPublished
        ? 'Publish this version? It replaces the version that is published now.'
        : 'Publish this module? It becomes part of the structured version of the course.',
    );
    if (!confirmed) return;
    setPendingAction('publish');
    setErrorMessage(null);
    const result = await publishStructuredModule(moduleId, draftRevisionId);
    setPendingAction(null);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    router.refresh();
  }

  async function handleUnpublish() {
    if (!window.confirm('Unpublish this module? Its draft is kept, and you can publish it again later.')) return;
    setPendingAction('unpublish');
    setErrorMessage(null);
    const result = await unpublishStructuredModule(moduleId);
    setPendingAction(null);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {draftRevisionId && !isDraftPublished && (
          <Button variant="gold" onClick={handlePublish} isLoading={pendingAction === 'publish'} disabled={pendingAction !== null}>
            {isPublished ? 'Publish this version' : 'Publish module'}
          </Button>
        )}
        {isPublished && (
          <Button variant="outline" onClick={handleUnpublish} isLoading={pendingAction === 'unpublish'} disabled={pendingAction !== null}>
            Unpublish
          </Button>
        )}
      </div>
      {errorMessage && <p className="max-w-md text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
