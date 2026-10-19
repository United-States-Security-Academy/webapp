import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getUserDetail, type EnrolledCourseStatus } from '@/features/admin/user-detail-queries';
import { UserRoleSelect } from '@/features/admin/user-role-select';
import { DeleteUserButton } from '@/features/admin/delete-user-button';
import { RevealableGovernmentId } from '@/features/admin/revealable-government-id';
import { getMissingProfileFields, type RequiredProfileField } from '@/features/profile/profile-queries';
import { GOVERNMENT_ID_LABEL, maskGovernmentId } from '@/features/profile/government-id';
import { Icon, type IconName } from '@/components/ui/icon';
import { ResetExamAttemptsButton } from '@/features/admin/reset-exam-attempts-button';

const CARD_CLASS_NAME = 'rounded-xl border border-slate-200 bg-white shadow-sm';

const PROFILE_FIELD_LABEL: Record<RequiredProfileField, string> = {
  legalName: 'Legal name',
  governmentIdType: 'ID type',
  governmentIdValue: 'ID number',
  phoneNumber: 'Phone number',
  country: 'Country',
  state: 'State',
  city: 'City',
  residentialAddress: 'Residential address',
};

const COURSE_STATUS: Record<EnrolledCourseStatus, { label: string; className: string }> = {
  not_started: { label: 'Not started', className: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In progress', className: 'bg-navy-900/10 text-navy-900' },
  exam_pending: { label: 'Exam pending', className: 'bg-amber-50 text-amber-700' },
  certified: { label: 'Certified', className: 'bg-gold-500/15 text-gold-600' },
};

const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatDateTime = (date: Date) =>
  date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const formatMoney = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountMinor / 100);

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className={CARD_CLASS_NAME}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-navy-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-navy-900">{children ?? <span className="font-normal text-slate-400">Not provided</span>}</dd>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className={`${CARD_CLASS_NAME} flex items-center gap-3 p-4`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-extrabold text-navy-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound();

  const [authenticatedUser, detail] = await Promise.all([getAuthenticatedUserFromSession(), getUserDetail(userId)]);
  if (!detail) notFound();

  const { user, profile, enrolledCourses, completedLessons, examAttempts, payments, totalPaidByCurrency, discountRedemptions, ownedCourses } =
    detail;
  const isSelf = authenticatedUser?.userId === user.id;
  const missingProfileFields = getMissingProfileFields(profile);
  const certifiedCount = enrolledCourses.filter((entry) => entry.status === 'certified').length;
  const totalPaid =
    totalPaidByCurrency.size === 0
      ? '$0.00'
      : [...totalPaidByCurrency.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(' + ');
  const initials = (profile?.legalName || user.displayName)
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Link href="/admin/users" className="text-xs font-semibold text-slate-500 hover:text-navy-800">
        &larr; All users
      </Link>

      <section className={`${CARD_CLASS_NAME} flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 text-lg font-bold text-gold-400">
            {profile?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
              <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials || 'U'
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-extrabold text-navy-900">{user.displayName}</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">{user.role}</span>
              {isSelf && <span className="rounded-full bg-gold-500/15 px-2.5 py-0.5 text-xs font-semibold text-gold-600">You</span>}
            </div>
            <a href={`mailto:${user.email}`} className="block truncate text-sm text-navy-800 hover:underline">
              {user.email}
            </a>
            <p className="mt-1 text-xs text-slate-400">
              Joined {formatDate(user.createdAt)} &middot; <span className="font-mono">{user.id}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            Role
            <UserRoleSelect userId={user.id} currentRole={user.role} disabled={isSelf} />
          </label>
          <DeleteUserButton
            userId={user.id}
            displayName={user.displayName}
            disabled={isSelf}
            label="Delete user"
            redirectToAfterDelete="/admin/users"
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Courses enrolled" value={String(enrolledCourses.length)} icon="bookOpen" />
        <StatTile label="Lessons completed" value={String(completedLessons.length)} icon="checkCircle" />
        <StatTile label="Certificates earned" value={String(certifiedCount)} icon="award" />
        <StatTile label="Total paid" value={totalPaid} icon="chart" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Courses" subtitle="Progress and status in every course this user is enrolled in">
            {enrolledCourses.length === 0 ? (
              <EmptyNote>Not enrolled in any course.</EmptyNote>
            ) : (
              <div className="-mx-5 -my-5 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Course</th>
                      <th className="px-4 py-3">Enrolled</th>
                      <th className="px-4 py-3">Progress</th>
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledCourses.map(({ course, enrolledAt, progress, status, examAttemptCount, bestExamScore, examMaxAttempts, examAttemptsTowardLimit }) => {
                      const percentage = progress.totalLessons === 0 ? 0 : Math.round((progress.completedLessons / progress.totalLessons) * 100);
                      return (
                        <tr key={course.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-5 py-3">
                            <Link href={`/instructor/courses/${course.slug}`} className="font-semibold text-navy-900 hover:underline">
                              {course.title}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(enrolledAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-gold-500" style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="whitespace-nowrap text-xs text-slate-500">
                                {progress.completedLessons}/{progress.totalLessons}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            {examAttemptCount === 0 ? '—' : `Best ${bestExamScore}% · ${examAttemptCount} attempt${examAttemptCount === 1 ? '' : 's'}`}
                            {examMaxAttempts !== null && status !== 'certified' && (
                              <div className="mt-0.5 flex items-center gap-2 text-xs">
                                <span className={examAttemptsTowardLimit >= examMaxAttempts ? 'font-semibold text-red-600' : 'text-slate-400'}>
                                  {Math.min(examAttemptsTowardLimit, examMaxAttempts)} of {examMaxAttempts} used
                                </span>
                                {examAttemptsTowardLimit >= examMaxAttempts && (
                                  <ResetExamAttemptsButton
                                    userId={user.id}
                                    courseId={course.id}
                                    displayName={user.displayName}
                                    maxAttempts={examMaxAttempts}
                                  />
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${COURSE_STATUS[status].className}`}>
                              {COURSE_STATUS[status].label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Exam attempts">
            {examAttempts.length === 0 ? (
              <EmptyNote>No exam attempts yet.</EmptyNote>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {examAttempts.map(({ attempt, courseTitle }) => (
                  <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy-900">{courseTitle}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(attempt.submittedAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600">
                        {attempt.correctCount}/{attempt.totalQuestions} &middot; <span className="font-semibold">{attempt.scorePercentage}%</span>
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          attempt.passed ? 'bg-gold-500/15 text-gold-600' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {attempt.passed ? 'Passed' : 'Not passed'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Payments">
            {payments.length === 0 ? (
              <EmptyNote>No payments.</EmptyNote>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {payments.map(({ payment, courseTitle }) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy-900">{courseTitle}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(payment.createdAt)} &middot; <span className="font-mono">{payment.providerReference}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-navy-900">{formatMoney(payment.amountMinor, payment.currency)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">{payment.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recent activity" subtitle="Latest lessons completed">
            {completedLessons.length === 0 ? (
              <EmptyNote>No lessons completed yet.</EmptyNote>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {completedLessons.slice(0, 15).map((lesson) => (
                  <li key={`${lesson.lessonId}-${lesson.completedAt.toISOString()}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium text-navy-900">{lesson.lessonTitle}</span>
                      <span className="text-slate-500"> &middot; {lesson.courseTitle}</span>
                    </span>
                    <span className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(lesson.completedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard
            title="Student profile"
            subtitle={profile ? `Last updated ${formatDateTime(profile.updatedAt)}` : 'This user has not started their profile.'}
          >
            {missingProfileFields.length === 0 ? (
              <p className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                <Icon name="checkCircle" className="h-4 w-4" /> Complete — certificates can be issued
              </p>
            ) : (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span className="font-semibold">Incomplete.</span> Missing: {missingProfileFields.map((field) => PROFILE_FIELD_LABEL[field]).join(', ')}
              </p>
            )}
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Legal name">{profile?.legalName}</DetailRow>
              <DetailRow label="ID type">{profile?.governmentIdType ? GOVERNMENT_ID_LABEL[profile.governmentIdType] : null}</DetailRow>
              <DetailRow label="ID number">
                {profile?.governmentIdValue ? (
                  <RevealableGovernmentId userId={user.id} maskedValue={maskGovernmentId(profile.governmentIdValue)} />
                ) : null}
              </DetailRow>
              <DetailRow label="Phone">
                {profile?.phoneNumber ? (
                  <a href={`tel:${profile.phoneNumber}`} className="hover:underline">
                    {profile.phoneNumber}
                  </a>
                ) : null}
              </DetailRow>
              <DetailRow label="Address">{profile?.residentialAddress}</DetailRow>
              <DetailRow label="City">{profile?.city}</DetailRow>
              <DetailRow label="State">{profile?.state}</DetailRow>
              <DetailRow label="Country">{profile?.country}</DetailRow>
            </dl>
          </SectionCard>

          <SectionCard title="Discount codes used">
            {discountRedemptions.length === 0 ? (
              <EmptyNote>None.</EmptyNote>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100">
                {discountRedemptions.map((redemption) => (
                  <li key={`${redemption.code}-${redemption.redeemedAt.toISOString()}`} className="py-2 text-sm">
                    <p>
                      <span className="font-mono font-semibold text-navy-900">{redemption.code}</span>
                      <span className="text-slate-500"> &middot; {redemption.percentOff}% off</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {redemption.courseTitle} &middot; {formatDate(redemption.redeemedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {ownedCourses.length > 0 && (
            <SectionCard title="Courses they teach">
              <ul className="flex flex-col divide-y divide-slate-100">
                {ownedCourses.map((course) => (
                  <li key={course.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link href={`/instructor/courses/${course.slug}`} className="min-w-0 truncate font-medium text-navy-900 hover:underline">
                      {course.title}
                    </Link>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600">{course.status}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>
    </main>
  );
}
