import { users } from './users.schema';
import { events } from './events.schema';
import { pgEnum } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { uuid } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import { varchar } from 'drizzle-orm/pg-core';
import { timestamp } from 'drizzle-orm/pg-core';

export const ticketStatusEnum = pgEnum('ticket_status', [
  'AVAILABLE',
  'RESERVED',
  'CHECKED_IN',
  'CANCELLED',
  'CONFIRMED',
]);

export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id')
    .references(() => events.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: integer('total_price').notNull(),
  status: ticketStatusEnum('status').default('AVAILABLE').notNull(),
  ticketCode: varchar('ticket_code', { length: 20 }).notNull(),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  checkedInAt: timestamp('checked_in_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;

export type NewTicket = typeof tickets.$inferInsert;
