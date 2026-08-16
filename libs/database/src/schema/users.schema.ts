import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Enum for users table
export const roleEnum = pgEnum('role', ['ORGANIZER', 'USER', 'ADMIN']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('USER'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferInsert;

export type NewUser = typeof users.$inferInsert;
