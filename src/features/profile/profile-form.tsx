'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { upsertStudentProfile } from './profile-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StudentProfile } from '@/db/schema/student-profiles';

type GovernmentIdType = NonNullable<StudentProfile['governmentIdType']>;
type Gender = NonNullable<StudentProfile['gender']>;

const GOVERNMENT_ID_LABEL: Record<string, string> = {
  ssnLastFour: 'Last 4 digits of SSN',
  texasDriversLicense: 'Texas Driver License number',
  texasIdCard: 'Texas Identification Card number',
};

const GENDER_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  preferNotToSay: 'Prefer not to say',
};

function formatDateOfBirth(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) return null;
  return new Date(`${dateOfBirth}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function ProfileSummaryField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export function ProfileForm({ profile, hasSavedProfile }: { profile: StudentProfile | null; hasSavedProfile: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!hasSavedProfile);
  const [legalName, setLegalName] = useState(profile?.legalName ?? '');
  const [governmentIdType, setGovernmentIdType] = useState(profile?.governmentIdType ?? 'ssnLastFour');
  const [governmentIdValue, setGovernmentIdValue] = useState(profile?.governmentIdValue ?? '');
  const [gender, setGender] = useState(profile?.gender ?? 'preferNotToSay');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? '');
  const [country, setCountry] = useState(profile?.country ?? 'United States');
  const [state, setState] = useState(profile?.state ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [residentialAddress, setResidentialAddress] = useState(profile?.residentialAddress ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await upsertStudentProfile({
        legalName,
        governmentIdType: governmentIdType as StudentProfile['governmentIdType'],
        governmentIdValue,
        gender: gender as StudentProfile['gender'],
        dateOfBirth,
        phoneNumber,
        country,
        state,
        city,
        residentialAddress,
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Your information</h2>
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit profile
          </Button>
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <ProfileSummaryField label="Full legal name" value={profile?.legalName} />
          <ProfileSummaryField
            label={GOVERNMENT_ID_LABEL[profile?.governmentIdType ?? 'ssnLastFour'] ?? 'Government ID'}
            value={profile?.governmentIdValue}
          />
          <ProfileSummaryField label="Gender" value={profile?.gender ? GENDER_LABEL[profile.gender] : null} />
          <ProfileSummaryField label="Date of birth" value={formatDateOfBirth(profile?.dateOfBirth)} />
          <ProfileSummaryField label="Phone number" value={profile?.phoneNumber} />
          <ProfileSummaryField label="Country" value={profile?.country} />
          <ProfileSummaryField label="State" value={profile?.state} />
          <ProfileSummaryField label="City" value={profile?.city} />
          <ProfileSummaryField label="Residential address" value={profile?.residentialAddress} />
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
          Full legal name (as on your government ID)
        </label>
        <Input value={legalName} onChange={(changeEvent) => setLegalName(changeEvent.target.value)} required />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">ID type</label>
          <select
            value={governmentIdType ?? 'ssnLastFour'}
            onChange={(changeEvent) => setGovernmentIdType(changeEvent.target.value as GovernmentIdType)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            required
          >
            <option value="ssnLastFour">SSN (last 4 digits)</option>
            <option value="texasDriversLicense">Texas Driver License</option>
            <option value="texasIdCard">Texas Identification Card</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
            {GOVERNMENT_ID_LABEL[governmentIdType ?? 'ssnLastFour']}
          </label>
          <Input
            value={governmentIdValue}
            onChange={(changeEvent) => setGovernmentIdValue(changeEvent.target.value)}
            maxLength={governmentIdType === 'ssnLastFour' ? 4 : undefined}
            required
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-slate-400">
        Used only to verify your identity on your certification. Never shown publicly.
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Gender</label>
          <select
            value={gender ?? 'preferNotToSay'}
            onChange={(changeEvent) => setGender(changeEvent.target.value as Gender)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="preferNotToSay">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Date of birth</label>
          <Input type="date" value={dateOfBirth ?? ''} onChange={(changeEvent) => setDateOfBirth(changeEvent.target.value)} required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Phone number</label>
        <Input
          type="tel"
          placeholder="(555) 555-5555"
          value={phoneNumber ?? ''}
          onChange={(changeEvent) => setPhoneNumber(changeEvent.target.value)}
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Country</label>
          <Input value={country ?? ''} onChange={(changeEvent) => setCountry(changeEvent.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">State</label>
          <Input value={state ?? ''} onChange={(changeEvent) => setState(changeEvent.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">City</label>
          <Input value={city ?? ''} onChange={(changeEvent) => setCity(changeEvent.target.value)} required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Residential address</label>
        <Input
          placeholder="Street address"
          value={residentialAddress ?? ''}
          onChange={(changeEvent) => setResidentialAddress(changeEvent.target.value)}
          required
        />
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="gold" isLoading={isSubmitting}>
          {hasSavedProfile ? 'Update profile' : 'Save profile'}
        </Button>
        {hasSavedProfile && (
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
