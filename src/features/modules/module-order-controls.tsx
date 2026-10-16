'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import type { ActionResult } from '@/api-response/action-result';
import { moveModule } from './module-actions';

const ARROW_BUTTON_CLASS_NAME =
  'flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-navy-800 hover:text-navy-800 disabled:pointer-events-none disabled:opacity-30';

// Up/down to nudge a module one place, or pick any position to jump straight there.
// `moveAction` defaults to moving a PDF module; structured modules pass their own.
export function ModuleOrderControls({
  moduleId,
  moduleTitle,
  position,
  moduleCount,
  moveAction = moveModule,
}: {
  moduleId: string;
  moduleTitle: string;
  // 1-based
  position: number;
  moduleCount: number;
  moveAction?: (moduleId: string, targetPosition: number) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isMoving, setIsMoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleMove(targetPosition: number) {
    if (targetPosition === position) return;
    setIsMoving(true);
    setErrorMessage(null);
    const result = await moveAction(moduleId, targetPosition);
    setIsMoving(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    router.refresh();
  }

  if (moduleCount < 2) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <label className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          Position
          <select
            value={position}
            onChange={(changeEvent) => handleMove(Number(changeEvent.target.value))}
            disabled={isMoving}
            aria-label={`Position of ${moduleTitle}`}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-navy-800 focus:outline-none disabled:opacity-50"
          >
            {Array.from({ length: moduleCount }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => handleMove(position - 1)}
          disabled={isMoving || position === 1}
          aria-label={`Move ${moduleTitle} up`}
          title="Move up"
          className={ARROW_BUTTON_CLASS_NAME}
        >
          <Icon name="chevronDown" className="h-4 w-4 rotate-180" />
        </button>
        <button
          type="button"
          onClick={() => handleMove(position + 1)}
          disabled={isMoving || position === moduleCount}
          aria-label={`Move ${moduleTitle} down`}
          title="Move down"
          className={ARROW_BUTTON_CLASS_NAME}
        >
          <Icon name="chevronDown" className="h-4 w-4" />
        </button>
      </div>
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
