import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { listAllUsers } from '@/features/admin/user-queries';
import { UserRoleSelect } from '@/features/admin/user-role-select';
import { DeleteUserButton } from '@/features/admin/delete-user-button';
import Link from 'next/link';

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: searchQuery } = await searchParams;
  const authenticatedUser = await getAuthenticatedUserFromSession();
  const userList = await listAllUsers(searchQuery);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-extrabold text-navy-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          {searchQuery ? (
            <>
              Showing results for &ldquo;{searchQuery}&rdquo; &middot;{' '}
              <Link href="/admin/users" className="font-semibold text-navy-800 hover:text-gold-600">
                Clear search
              </Link>
            </>
          ) : (
            'Promote a learner to instructor, or grant admin access.'
          )}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {userList.map((userRow) => (
              <tr key={userRow.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-900">{userRow.displayName}</td>
                <td className="px-4 py-3 text-slate-600">{userRow.email}</td>
                <td className="px-4 py-3 text-slate-500">
                  {userRow.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <UserRoleSelect userId={userRow.id} currentRole={userRow.role} disabled={userRow.id === authenticatedUser?.userId} />
                </td>
                <td className="px-4 py-3">
                  <DeleteUserButton
                    userId={userRow.id}
                    displayName={userRow.displayName}
                    disabled={userRow.id === authenticatedUser?.userId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {userList.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No users match that search.</p>}
      </div>
    </main>
  );
}
