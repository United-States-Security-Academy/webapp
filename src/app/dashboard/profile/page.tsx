import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getStudentProfile, isProfileComplete } from '@/features/profile/profile-queries';
import { ProfileForm } from '@/features/profile/profile-form';
import { ProfilePhotoUploader } from '@/features/profile/profile-photo-uploader';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

export default async function ProfilePage() {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  if (!authenticatedUser) redirect('/sign-in');

  const profile = await getStudentProfile(authenticatedUser.userId);
  const isComplete = isProfileComplete(profile);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-wide text-navy-900">MY PROFILE</h1>
      <p className="mt-1 text-sm text-slate-500">
        This information is used to prepare your certification paperwork — please keep it accurate and up to date.
      </p>

      {!isComplete && (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3">
          <Icon name="shieldCheck" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Your profile is incomplete. Finish every field below so we can issue your certificate correctly.
          </p>
        </div>
      )}

      <div className="mt-6">
        <Card>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Profile photo</h2>
          <ProfilePhotoUploader photoUrl={profile?.photoUrl ?? null} displayName={authenticatedUser.displayName} />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <ProfileForm profile={profile} hasSavedProfile={isComplete} />
        </Card>
      </div>
    </main>
  );
}
