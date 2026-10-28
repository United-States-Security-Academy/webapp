import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import type { getCourseContentTree } from '@/features/courses/course-content-queries';

type ModulesWithLessons = Awaited<ReturnType<typeof getCourseContentTree>>;

// The module-by-module lesson list of a PDF/video course. Enrolled learners see every lesson;
// visitors see the module titles plus any free-preview lessons.
export function PdfCourseCurriculum({
  modulesWithLessons,
  completedLessonIds,
  hasFullAccess,
  lessonHrefPrefix,
}: {
  modulesWithLessons: ModulesWithLessons;
  completedLessonIds: Set<string>;
  hasFullAccess: boolean;
  lessonHrefPrefix: string;
}) {
  if (modulesWithLessons.length === 0) return <p className="text-sm text-slate-500">Course content is coming soon.</p>;

  return (
    // One bordered list, each module a header row with its lessons beneath, so a long course
    // stays compact.
    <ol className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {modulesWithLessons.map(({ moduleRecord, moduleLessons }, moduleIndex) => {
        // Until the learner has paid, only free-preview lessons are listed under each module.
        const visibleLessons = hasFullAccess ? moduleLessons : moduleLessons.filter((lessonRecord) => lessonRecord.isPreview);
        return (
        <li key={moduleRecord.id}>
          <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5">
            <h3 className="font-semibold text-navy-900">
              <span className="mr-2 text-xs font-bold uppercase tracking-wide text-slate-400">Module {moduleIndex + 1}</span>
              {moduleRecord.title}
            </h3>
            {hasFullAccess && (
              <span className="shrink-0 text-xs text-slate-500">
                {moduleLessons.length} lesson{moduleLessons.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {visibleLessons.length > 0 && (
            <ul className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
              {visibleLessons.map((lessonRecord) => {
                const isCompleted = completedLessonIds.has(lessonRecord.id);
                const actionLabel = lessonRecord.contentType === 'pdf' ? 'View PDF' : 'Watch video';
                return (
                  <li key={lessonRecord.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 pl-6 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon
                        name={isCompleted ? 'checkCircle' : 'document'}
                        className={`h-4 w-4 shrink-0 ${isCompleted ? 'text-gold-600' : 'text-slate-400'}`}
                        aria-hidden
                      />
                      <span className="text-slate-800">{lessonRecord.title}</span>
                      {lessonRecord.isPreview && !hasFullAccess && <Badge>Free preview</Badge>}
                    </span>
                    <Link
                      href={`${lessonHrefPrefix}/${lessonRecord.slug}`}
                      className="inline-flex items-center gap-1 rounded-md border border-navy-800 px-3 py-1 text-xs font-bold text-navy-800 hover:bg-navy-900 hover:text-white"
                    >
                      {isCompleted ? 'Review' : actionLabel} <span aria-hidden>&rarr;</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
        );
      })}
    </ol>
  );
}
