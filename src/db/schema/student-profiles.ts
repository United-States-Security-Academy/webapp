import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

// The registration authority accepts exactly one of these three as proof of identity —
// modeled as a type + value pair rather than three separate nullable columns.
export const governmentIdTypeEnum = pgEnum('government_id_type', ['ssnLastFour', 'texasDriversLicense', 'texasIdCard']);

// One row per user (userId is both PK and FK) — every field is nullable because the profile is
// filled in progressively after signup, not all at once; completeness is derived by checking
// which fields are present, not tracked with a separate flag.
export const studentProfiles = pgTable('student_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  legalName: text('legal_name'),
  governmentIdType: governmentIdTypeEnum('government_id_type'),
  governmentIdValue: text('government_id_value'),
  phoneNumber: text('phone_number'),
  country: text('country'),
  state: text('state'),
  city: text('city'),
  residentialAddress: text('residential_address'),
  photoUrl: text('photo_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type NewStudentProfile = typeof studentProfiles.$inferInsert;
