import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  eventDate: date('event_date'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const buses = pgTable(
  'buses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    busNumber: text('bus_number').notNull(),
    busName: text('bus_name').notNull(),
    groupLeaderName: text('group_leader_name').notNull(),
    groupLeaderContact: text('group_leader_contact').notNull(),
    capacity: integer('capacity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique().on(t.eventId, t.busNumber),
    index('buses_event_id_idx').on(t.eventId),
  ]
)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const passengers = pgTable(
  'passengers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    refId: text('ref_id').notNull(),
    name: text('name').notNull(),
    gender: text('gender'),
    age: integer('age'),
    assignedBusId: uuid('assigned_bus_id').references(() => buses.id, {
      onDelete: 'set null',
    }),
    seatedBusId: uuid('seated_bus_id').references(() => buses.id, {
      onDelete: 'set null',
    }),
    seatedAt: timestamp('seated_at', { withTimezone: true }),
    seatedBy: uuid('seated_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique().on(t.eventId, t.refId),
    index('passengers_seated_bus_id_idx').on(t.seatedBusId),
    index('passengers_assigned_bus_id_idx').on(t.assignedBusId),
    index('passengers_event_id_idx').on(t.eventId),
  ]
)

export const userBuses = pgTable(
  'user_buses',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    busId: uuid('bus_id')
      .notNull()
      .references(() => buses.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('user_buses_user_id_idx').on(t.userId),
    index('user_buses_bus_id_idx').on(t.busId),
  ]
)

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id'),
    busId: uuid('bus_id'),
    passengerId: uuid('passenger_id'),
    action: text('action'),
    performedBy: uuid('performed_by').references(() => users.id),
    performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow(),
    note: text('note'),
  },
  (t) => [index('audit_log_bus_id_performed_at_idx').on(t.busId, t.performedAt)]
)

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  buses: many(buses),
  passengers: many(passengers),
}))

export const busesRelations = relations(buses, ({ one, many }) => ({
  event: one(events, { fields: [buses.eventId], references: [events.id] }),
  assignedPassengers: many(passengers, { relationName: 'assignedBus' }),
  seatedPassengers: many(passengers, { relationName: 'seatedBus' }),
  userBuses: many(userBuses),
}))

export const passengersRelations = relations(passengers, ({ one }) => ({
  event: one(events, { fields: [passengers.eventId], references: [events.id] }),
  assignedBus: one(buses, {
    fields: [passengers.assignedBusId],
    references: [buses.id],
    relationName: 'assignedBus',
  }),
  seatedBus: one(buses, {
    fields: [passengers.seatedBusId],
    references: [buses.id],
    relationName: 'seatedBus',
  }),
  seatedByUser: one(users, { fields: [passengers.seatedBy], references: [users.id] }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  userBuses: many(userBuses),
}))

export const userBusesRelations = relations(userBuses, ({ one }) => ({
  user: one(users, { fields: [userBuses.userId], references: [users.id] }),
  bus: one(buses, { fields: [userBuses.busId], references: [buses.id] }),
}))

export type Event = typeof events.$inferSelect
export type Bus = typeof buses.$inferSelect
export type Passenger = typeof passengers.$inferSelect
export type User = typeof users.$inferSelect
export type UserBus = typeof userBuses.$inferSelect
export type AuditLog = typeof auditLog.$inferSelect
