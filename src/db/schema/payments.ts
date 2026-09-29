import { pgTable, uuid, text, integer, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { courses } from './courses';

export const paymentProviderEnum = pgEnum('payment_provider', ['stripe']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'succeeded', 'failed']);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
    provider: paymentProviderEnum('provider').notNull(),
    providerReference: text('provider_reference').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerProviderEventIdUnique: uniqueIndex('payments_provider_provider_event_id_unique').on(
      table.provider,
      table.providerEventId,
    ),
  }),
);
