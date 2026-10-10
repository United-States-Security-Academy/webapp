import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import {
  listEnrolledCoursesWithProgress,
  listRecommendedCourses,
  selectEarnedCertificates,
  buildRecentActivity,
} from '@/features/dashboard/dashboard-queries';
import { listCompletedLessonsForUser } from '@/features/progress/course-progress-queries';
import { getStudentProfile, isProfileComplete } from '@/features/profile/profile-queries';
import { computeAchievements } from '@/features/dashboard/achievements';
import { EnrolledCourseCard } from '@/features/dashboard/enrolled-course-card';
import { RecommendedCourseCard } from '@/features/dashboard/recommended-course-card';
import { ActivityFeed } from '@/features/dashboard/activity-feed';
import { AchievementBadge } from '@/features/dashboard/achievement-badge';
import { DashboardSearchForm } from '@/features/dashboard/dashboard-search-form';
import { LearningStreakStats, WeeklyLessonsChart, WeeklyStreakCard } from '@/features/dashboard/learning-activity';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

export default async function DashboardPage() {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  // Completed lessons are loaded once and shared by progress, recent activity and the streak charts.
  const completedLessonsPromise = listCompletedLessonsForUser(authenticatedUser.userId);
  const [enrolledCourses, profile, completedLessons, recommendedCourses] = await Promise.all([
    listEnrolledCoursesWithProgress(authenticatedUser.userId, completedLessonsPromise),
    getStudentProfile(authenticatedUser.userId),
    completedLessonsPromise,
    listRecommendedCourses(authenticatedUser.userId),
  ]);
  const hasCompleteProfile = isProfileComplete(profile);
  const certificates = selectEarnedCertificates(enrolledCourses);
  const activity = buildRecentActivity(enrolledCourses, completedLessons);
  const achievements = computeAchievements(enrolledCourses, certificates);
  const completedAtIsoList = completedLessons.map((completedLesson) => completedLesson.completedAt.toISOString());

  // Courses not yet certified come first, so "Continue Learning" leads with what still needs work.
  const certifiedCourseIds = new Set(certificates.map((certificate) => certificate.course.id));
  const coursesInProgress = enrolledCourses.filter((entry) => !certifiedCourseIds.has(entry.course.id));
  const orderedEnrolledCourses = [...coursesInProgress, ...enrolledCourses.filter((entry) => certifiedCourseIds.has(entry.course.id))];

  const displayName = profile?.legalName || authenticatedUser.displayName;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const avatar = (sizeClassName: string) => (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 font-bold text-gold-400 ${sizeClassName}`}
    >
      {profile?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
        <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials || 'U'
      )}
    </span>
  );

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-lg font-extrabold text-navy-900">Dashboard</h1>
          <p className="text-xs text-slate-500">Welcome back, {displayName}</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="flex-1 sm:w-72 sm:flex-none">
            <DashboardSearchForm />
          </div>
          <Link href="/dashboard/profile" aria-label="My profile" className="hidden sm:block">
            {avatar('h-10 w-10 text-sm')}
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          {!hasCompleteProfile && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-amber-800">
                <Icon name="shieldCheck" className="h-4 w-4 shrink-0" />
                Complete your profile — it&apos;s required to issue your course certificates.
              </p>
              <Link
                href="/dashboard/profile"
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
              >
                Complete now &rarr;
              </Link>
            </div>
          )}

          <section id="courses" className="scroll-mt-6">
            <h2 className="text-lg font-bold text-slate-900">Continue Learning</h2>
            {enrolledCourses.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                  <Icon name="bookOpen" className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-navy-900">No courses yet</h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Pick a course below or browse the catalog to start training.</p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {orderedEnrolledCourses.map((enrolledCourse) => (
                  <EnrolledCourseCard key={enrolledCourse.course.id} {...enrolledCourse} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recommended Courses For You</h2>
              <Link href="/dashboard/courses" className="text-xs font-bold uppercase tracking-wide text-navy-800 hover:text-gold-600">
                Browse all &rarr;
              </Link>
            </div>
            {recommendedCourses.length === 0 ? (
              <div className="mt-4">
                <Card>
                  <p className="text-sm text-slate-500">You&apos;re enrolled in every available course. New courses will show up here.</p>
                </Card>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {recommendedCourses.map((recommendedCourse) => (
                  <RecommendedCourseCard key={recommendedCourse.course.id} {...recommendedCourse} />
                ))}
              </div>
            )}
          </section>

          <section id="certificates" className="scroll-mt-6">
            <h2 className="text-lg font-bold text-slate-900">Certificates</h2>
            {certificates.length === 0 ? (
              <div className="mt-4">
                <Card>
                  <p className="text-sm text-slate-500">Complete every lesson in a course to earn its certificate.</p>
                </Card>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {certificates.map((certificate) => (
                  <Card key={certificate.course.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-gold-600">
                          <Icon name="award" className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{certificate.course.title}</p>
                          <p className="text-xs text-slate-500">
                            Earned{' '}
                            {certificate.completedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/certificates/${certificate.course.slug}`}
                        className="inline-flex items-center gap-1 rounded-md border border-navy-800 px-3 py-1.5 text-xs font-bold text-navy-800 hover:bg-navy-900 hover:text-white"
                      >
                        View
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section id="activity" className="scroll-mt-6">
            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
            <div className="mt-4">
              <Card>
                <ActivityFeed events={activity} />
              </Card>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <div className="flex items-center gap-3">
              {avatar('h-14 w-14 text-lg ring-2 ring-gold-500 ring-offset-2')}
              <div className="min-w-0">
                <p className="truncate font-bold text-navy-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{authenticatedUser.email}</p>
                <Link href="/dashboard/profile" className="text-xs font-semibold text-gold-600 hover:text-navy-800">
                  View profile &rarr;
                </Link>
              </div>
            </div>
            <LearningStreakStats completedAtIsoList={completedAtIsoList} certificateCount={certificates.length} />
          </Card>

          <WeeklyStreakCard completedAtIsoList={completedAtIsoList} />

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-400">
                <Icon name="bookOpen" className="h-4 w-4" />
              </span>
              <p className="mt-3 text-lg font-extrabold text-navy-900">
                {coursesInProgress.length} Course{coursesInProgress.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-slate-500">In progress</p>
            </Card>
            <Card>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-600">
                <Icon name="checkCircle" className="h-4 w-4" />
              </span>
              <p className="mt-3 text-lg font-extrabold text-navy-900">
                {certificates.length} Course{certificates.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </Card>
          </div>

          <WeeklyLessonsChart completedAtIsoList={completedAtIsoList} />

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-900">Achievements</h3>
              <span className="text-xs font-bold text-slate-400">
                {achievements.filter((achievement) => achievement.isEarned).length}/{achievements.length}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}
