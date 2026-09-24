import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { listEnrolledCoursesWithProgress, selectEarnedCertificates, getRecentActivity } from '@/features/dashboard/dashboard-queries';
import { getStudentProfile, isProfileComplete } from '@/features/profile/profile-queries';
import { computeAchievements } from '@/features/dashboard/achievements';
import { EnrolledCourseCard } from '@/features/dashboard/enrolled-course-card';
import { ActivityFeed } from '@/features/dashboard/activity-feed';
import { AchievementBadge } from '@/features/dashboard/achievement-badge';
import { DashboardSearchForm } from '@/features/dashboard/dashboard-search-form';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { StatCard } from '@/components/ui/stat-card';

export default async function DashboardPage() {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const enrolledCourses = await listEnrolledCoursesWithProgress(authenticatedUser.userId);
  const profile = await getStudentProfile(authenticatedUser.userId);
  const hasCompleteProfile = isProfileComplete(profile);
  const certificates = selectEarnedCertificates(enrolledCourses);
  const activity = await getRecentActivity(authenticatedUser.userId, enrolledCourses);
  const achievements = computeAchievements(enrolledCourses, certificates);
  const totalLessonsCompleted = enrolledCourses.reduce((sum, entry) => sum + entry.progress.completedLessons, 0);

  const displayName = profile?.legalName || authenticatedUser.displayName;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 text-sm font-bold text-gold-400">
            {profile?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
              <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials || 'U'
            )}
          </span>
          <div>
            <p className="text-xs text-slate-500">Welcome back</p>
            <p className="text-lg font-extrabold text-navy-900">{displayName}</p>
          </div>
        </div>
        <DashboardSearchForm />
      </div>

      {!hasCompleteProfile && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3">
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

      <section id="courses" className="mt-8 scroll-mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Active Courses</h2>
          <Link href="/dashboard/courses" className="text-xs font-bold uppercase tracking-wide text-navy-800 hover:text-gold-600">
            Browse more &rarr;
          </Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-gold-400">
              <Icon name="bookOpen" className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-navy-900">No courses yet</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Browse the catalog and enroll in a course to start training.</p>
            <Link
              href="/dashboard/courses"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-gold-400"
            >
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((enrolledCourse) => (
              <EnrolledCourseCard key={enrolledCourse.course.id} {...enrolledCourse} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled courses" value={enrolledCourses.length} icon="bookOpen" />
        <StatCard label="Certificates earned" value={certificates.length} icon="award" />
        <StatCard label="Lessons completed" value={totalLessonsCompleted} icon="checkCircle" />
      </div>

      <section className="mt-8">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Achievements</h2>
            <span className="text-xs font-bold text-slate-400">
              {achievements.filter((achievement) => achievement.isEarned).length}/{achievements.length}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {achievements.map((achievement) => (
              <AchievementBadge key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </Card>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section id="certificates" className="scroll-mt-6">
          <h2 className="text-lg font-bold text-slate-900">Certificates</h2>
          {certificates.length === 0 ? (
            <div className="mt-4">
              <Card>
                <p className="text-sm text-slate-500">Complete every lesson in a course to earn its certificate.</p>
              </Card>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {certificates.map((certificate) => (
                <Card key={certificate.course.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-gold-600">
                        <Icon name="award" className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{certificate.course.title}</p>
                        <p className="text-xs text-slate-500">
                          Earned {certificate.completedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
    </main>
  );
}
