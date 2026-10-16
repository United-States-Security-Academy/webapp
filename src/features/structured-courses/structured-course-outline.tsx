import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { buildStructuredLessonHref, type StructuredOutlineModule } from './structured-course-progress';

// The course content list for a structured course: published modules and their lessons in order,
// ticked when complete. Lessons only link through for students with access (enrolled, owner, admin).
export function StructuredCourseOutline({
  outline,
  courseSlug,
  basePath,
  hasFullAccess,
}: {
  outline: StructuredOutlineModule[];
  courseSlug: string;
  basePath: string;
  hasFullAccess: boolean;
}) {
  if (outline.length === 0) return <p className="text-sm text-slate-500">Course content is coming soon.</p>;

  return (
    <div className="flex flex-col gap-4">
      {outline.map((outlineModule, moduleIndex) => {
        const completedCount = outlineModule.lessons.filter((lesson) => lesson.completedAt).length;
        return (
          <Card key={outlineModule.moduleId}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">
                <span className="mr-1 text-slate-400">{moduleIndex + 1}.</span>
                {outlineModule.title}
              </h3>
              {hasFullAccess && (
                <span className="shrink-0 text-xs text-slate-500">
                  {completedCount}/{outlineModule.lessons.length}
                </span>
              )}
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {outlineModule.lessons.map((lesson) => {
                const isCompleted = hasFullAccess && lesson.completedAt !== null;
                return (
                  <li
                    key={lesson.lessonKey}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon
                        name={isCompleted ? 'checkCircle' : 'bookOpen'}
                        className={`h-4 w-4 shrink-0 ${isCompleted ? 'text-gold-600' : 'text-slate-400'}`}
                      />
                      <span className={hasFullAccess ? '' : 'text-slate-400'}>{lesson.title}</span>
                      {isCompleted && <span className="sr-only">(completed)</span>}
                      {!hasFullAccess && <Badge>locked</Badge>}
                    </span>
                    {hasFullAccess && (
                      <Link
                        href={buildStructuredLessonHref(basePath, courseSlug, lesson)}
                        className="inline-flex items-center gap-1 rounded-md border border-navy-800 px-3 py-1 text-xs font-bold text-navy-800 hover:bg-navy-900 hover:text-white"
                      >
                        {isCompleted ? 'Review' : 'Start'} <span aria-hidden>&rarr;</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
