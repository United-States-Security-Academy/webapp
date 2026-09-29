'use client';

import { useState } from 'react';
import { updateUserRole } from './user-actions';
import type { UserRole } from '@/db/schema/users';

const ROLE_OPTIONS: UserRole[] = ['learner', 'instructor', 'admin'];

export function UserRoleSelect({ userId, currentRole, disabled }: { userId: string; currentRole: UserRole; disabled?: boolean }) {
  const [role, setRole] = useState(currentRole);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleChange(newRole: UserRole) {
    const previousRole = role;
    setRole(newRole);
    setIsSaving(true);
    setErrorMessage(null);
    const result = await updateUserRole(userId, newRole);
    if (!result.success) {
      setRole(previousRole);
      setErrorMessage(result.error);
    }
    setIsSaving(false);
  }

  if (disabled) {
    return <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{currentRole} (you)</span>;
  }

  return (
    <div>
      <select
        value={role}
        disabled={isSaving}
        onChange={(changeEvent) => handleChange(changeEvent.target.value as UserRole)}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 focus:border-navy-800 focus:outline-none disabled:opacity-50"
      >
        {ROLE_OPTIONS.map((roleOption) => (
          <option key={roleOption} value={roleOption}>
            {roleOption}
          </option>
        ))}
      </select>
      {errorMessage && <p className="mt-1 text-xs text-red-600">{errorMessage}</p>}
    </div>
  );
}
