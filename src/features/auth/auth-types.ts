import type { UserRole } from '@/db/schema/users';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  // An admin who signed in with their password but hasn't entered their authenticator code yet.
  // Their role is reported as 'learner' until they do, so no admin check anywhere passes early.
  isAwaitingAdminTwoFactor?: boolean;
}
