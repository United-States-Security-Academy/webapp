import Link from 'next/link';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getAdminOverview, listTopCourses, type MonthOverMonth } from '@/features/admin/admin-overview-queries';
import { EnrollmentTrendChart } from '@/features/admin/enrollment-trend-chart';
import { COURSE_CATEGORY_META } from '@/features/courses/course-category';
import { formatCoursePrice } from '@/features/courses/format-course-price';
import { Icon, type IconName } from '@/components/ui/icon';

const CARD_SHELL_CLASS_NAME = 'rounded-xl border border-slate-200 bg-white shadow-sm';
const CARD_CLASS_NAME = `${CARD_SHELL_CLASS_NAME} p-5`;

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100);
}

function ChangePill({ thisMonth, lastMonth }: MonthOverMonth) {
  if (lastMonth === 0) {
    return <span className="text-xs text-slate-400">{thisMonth > 0 ? 'No data last month' : 'Same as last month'}</span>;
  }
  const changePercent = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const isUp = changePercent >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
      <span aria-hidden="true">{isUp ? '▲' : '▼'}</span>
      {isUp ? '+' : ''}
      {changePercent}% <span className="font-normal text-slate-400">vs last month</span>
    </span>
  );
}

function KpiCard({ label, value, icon, footer }: { label: string; value: string; icon: IconName; footer: React.ReactNode }) {
  return (
    <div className={CARD_CLASS_NAME}>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-2xl font-extrabold text-navy-900">{value}</p>
          {footer}
        </div>
      </div>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  const [overview, topCourses] = await Promise.all([getAdminOverview(), listTopCourses()]);
  const categoryTotal = overview.enrollmentsByCategory.reduce((sum, row) => sum + row.count, 0);
  const firstName = authenticatedUser?.displayName.split(' ')[0] ?? 'Admin';

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">
          Welcome back, <span className="text-gold-600">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">Track enrollments, revenue and courses across the whole academy.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue this month"
          value={formatMoney(overview.revenue.thisMonth, overview.revenue.currency)}
          icon="chart"
          footer={<ChangePill {...overview.revenue} />}
        />
        <KpiCard
          label="Enrollments this month"
          value={overview.enrollments.thisMonth.toLocaleString('en-US')}
          icon="bookOpen"
          footer={<ChangePill {...overview.enrollments} />}
        />
        <KpiCard
          label="New users this month"
          value={overview.newUsers.thisMonth.toLocaleString('en-US')}
          icon="users"
          footer={<ChangePill {...overview.newUsers} />}
        />
        <KpiCard
          label="Published courses"
          value={`${overview.publishedCourses}`}
          icon="checkCircle"
          footer={
            <span className="text-xs text-slate-400">
              of {overview.totalCourses} total · {overview.totalUsers.toLocaleString('en-US')} users
            </span>
          }
        />
      </div>
      {overview.revenue.hasOtherCurrencies && (
        <p className="-mt-3 text-xs text-slate-400">Revenue shows {overview.revenue.currency} payments only; other currencies are not included.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={CARD_CLASS_NAME}>
          <EnrollmentTrendChart dailyEnrollments={overview.dailyEnrollments} />
        </section>

        <section className={CARD_CLASS_NAME}>
          <h2 className="text-base font-bold text-navy-900">Enrollments by Program</h2>
          <p className="mt-0.5 text-xs text-slate-500">All time · {categoryTotal.toLocaleString('en-US')} enrollments</p>
          {overview.enrollmentsByCategory.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No enrollments yet.</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-4">
              {overview.enrollmentsByCategory.map(({ category, count }) => {
                const categoryMeta = COURSE_CATEGORY_META[category];
                const sharePercent = Math.round((count / categoryTotal) * 100);
                return (
                  <li key={category}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-semibold text-slate-700">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-900 text-gold-400">
                          <Icon name={categoryMeta.icon} className="h-3.5 w-3.5" />
                        </span>
                        {categoryMeta.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-navy-900">{count.toLocaleString('en-US')}</span> · {sharePercent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${sharePercent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className={CARD_SHELL_CLASS_NAME}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-base font-bold text-navy-900">Top Courses</h2>
            <p className="mt-0.5 text-xs text-slate-500">Ranked by enrollments</p>
          </div>
          <Link
            href="/instructor/courses/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-bold text-white hover:bg-navy-800"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            New course
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Course</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3 text-right">Enrolled</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Lessons</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topCourses.map(({ course, instructorName, enrollmentCount, lessonCount, revenueMinor }) => (
                <tr key={course.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-navy-900 text-gold-400">
                        {course.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
                          <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon name={COURSE_CATEGORY_META[course.category].icon} className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold text-navy-900">{course.title}</p>
                        <p className="text-xs text-slate-400">{COURSE_CATEGORY_META[course.category].label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{instructorName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-900">{enrollmentCount.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCoursePrice(course.priceAmountMinor, course.currency)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{lessonCount}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatMoney(revenueMinor, course.currency)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        course.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {course.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/courses/${course.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${course.title}`}
                        title="View course page"
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-900 text-gold-400 hover:bg-navy-800"
                      >
                        <Icon name="eye" className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/instructor/courses/${course.slug}`}
                        aria-label={`Manage ${course.title}`}
                        title="Manage course"
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-gold-500 text-navy-950 hover:bg-gold-400"
                      >
                        <Icon name="document" className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {topCourses.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No courses yet.</p>}
        </div>
      </section>
    </main>
  );
}
