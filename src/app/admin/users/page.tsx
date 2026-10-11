import Link from 'next/link';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { countUsersByRole, listAllUsers } from '@/features/admin/user-queries';
import { UserRoleSelect } from '@/features/admin/user-role-select';
import { DeleteUserButton } from '@/features/admin/delete-user-button';
import type { UserRole } from '@/db/schema';

const ROLE_FILTERS: { label: string; role: UserRole | null }[] = [
  { label: 'All', role: null },
  { label: 'Learners', role: 'learner' },
  { label: 'Instructors', role: 'instructor' },
  { label: 'Admins', role: 'admin' },
];

function isUserRole(value: string | undefined): value is UserRole {
  return value === 'learner' || value === 'instructor' || value === 'admin';
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { q: searchQuery, role: roleParam } = await searchParams;
  const roleFilter = isUserRole(roleParam) ? roleParam : undefined;
  const [authenticatedUser, userList, roleCounts] = await Promise.all([
    getAuthenticatedUserFromSession(),
    listAllUsers(searchQuery, roleFilter),
    countUsersByRole(),
  ]);

  const buildHref = (role: UserRole | null, query: string | undefined) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (role) params.set('role', role);
    const queryString = params.toString();
    return queryString ? `/admin/users?${queryString}` : '/admin/users';
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          {searchQuery ? (
            <>
              Showing results for &ldquo;{searchQuery}&rdquo; &middot;{' '}
              <Link href={buildHref(roleFilter ?? null, undefined)} className="font-semibold text-navy-800 hover:text-gold-600">
                Clear search
              </Link>
            </>
          ) : (
            'View each person’s profile, courses, exam results and payments, or change their role.'
          )}
        </p>
      </div>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Filter by role">
        {ROLE_FILTERS.map(({ label, role }) => {
          const isActive = (roleFilter ?? null) === role;
          return (
            <Link
              key={label}
              href={buildHref(role, searchQuery)}
              aria-current={isActive ? 'page' : undefined}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                isActive ? 'bg-navy-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-navy-800'
              }`}
            >
              {label} <span className={isActive ? 'text-gold-400' : 'text-slate-400'}>{roleCounts[role ?? 'all']}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3 text-right">Courses</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {userList.map((userRow) => {
              const initials = (userRow.legalName || userRow.displayName)
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const isSelf = userRow.id === authenticatedUser?.userId;
              return (
                <tr key={userRow.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${userRow.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 text-xs font-bold text-gold-400">
                        {userRow.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
                          <img src={userRow.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials || 'U'
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{userRow.displayName}</span>
                        <span className="block truncate text-xs text-slate-500">{userRow.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        userRow.hasCompleteProfile ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {userRow.hasCompleteProfile ? 'Complete' : 'Incomplete'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-900">{userRow.enrollmentCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {userRow.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <UserRoleSelect userId={userRow.id} currentRole={userRow.role} disabled={isSelf} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/users/${userRow.id}`}
                        className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                      >
                        View
                      </Link>
                      <DeleteUserButton userId={userRow.id} displayName={userRow.displayName} disabled={isSelf} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {userList.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No users match.</p>}
      </div>
    </main>
  );
}
