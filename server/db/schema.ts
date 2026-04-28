import { sql, relations } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const UserRole = {
  Admin: 'admin',
  Partner: 'partner',
  Owner: 'owner',
  Editor: 'editor',
} as const

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole]

export const SiteUserRole = {
  Owner: 'owner',
  Editor: 'editor',
  Partner: 'partner',
} as const

export type SiteUserRoleValue = (typeof SiteUserRole)[keyof typeof SiteUserRole]

export const SiteStatus = {
  Active: 'active',
  Archived: 'archived',
} as const

export type SiteStatusValue = (typeof SiteStatus)[keyof typeof SiteStatus]

export const PageStatus = {
  Draft: 'draft',
  Published: 'published',
} as const

export type PageStatusValue = (typeof PageStatus)[keyof typeof PageStatus]

export const PasswordResetPurpose = {
  Invite: 'invite',
  Reset: 'reset',
} as const

export const BookingExceptionStatus = {
  Released: 'released',
} as const

export const BookingMemberRole = {
  Admin: 'admin',
  Member: 'member',
} as const

export type BookingMemberRoleValue = (typeof BookingMemberRole)[keyof typeof BookingMemberRole]

export const BookingMemberStatus = {
  Pending: 'pending',
  Active: 'active',
  Revoked: 'revoked',
} as const

export type BookingMemberStatusValue =
  (typeof BookingMemberStatus)[keyof typeof BookingMemberStatus]

export type PasswordResetPurposeValue =
  (typeof PasswordResetPurpose)[keyof typeof PasswordResetPurpose]

export type BookingExceptionStatusValue =
  (typeof BookingExceptionStatus)[keyof typeof BookingExceptionStatus]

export const UserRoleValues = ['admin', 'partner', 'owner', 'editor'] as const
export const SiteUserRoleValues = ['owner', 'editor', 'partner'] as const
export const SiteStatusValues = ['active', 'archived'] as const
export const PageStatusValues = ['draft', 'published'] as const
export const PasswordResetPurposeValues = ['invite', 'reset'] as const
export const BookingExceptionStatusValues = ['released'] as const
export const BookingMemberRoleValues = ['admin', 'member'] as const
export const BookingMemberStatusValues = ['pending', 'active', 'revoked'] as const

type JsonRecord = Record<string, unknown>

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password'),
  name: text('name'),
  role: text('role', { enum: UserRoleValues }).notNull().default(UserRole.Editor),
  githubData: text('github_data', { mode: 'json' }).$type<JsonRecord | null>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const sites = sqliteTable('sites', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').unique(),
  name: text('name').notNull(),
  description: text('description'),
  language: text('language').notNull().default('en'),
  domain: text('domain'),
  siteUrl: text('site_url'),
  screenshotUrl: text('screenshot_url'),
  githubRepoUrl: text('github_repo_url'),
  githubBranch: text('github_branch').notNull().default('main'),
  vercelProjectId: text('vercel_project_id'),
  vercelUrl: text('vercel_url'),
  template: text('template').notNull().default('blank'),
  status: text('status', { enum: SiteStatusValues }).notNull().default(SiteStatus.Active),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const locations = sqliteTable(
  'locations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull().unique(),
    address: text('address'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('idx_locations_name').on(table.name)],
)

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locationId: text('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('idx_rooms_location_id').on(table.locationId),
    index('idx_rooms_location_name').on(table.locationId, table.name),
  ],
)

export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
    endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
    isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
    dayOfWeek: integer('day_of_week'),
    title: text('title'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('idx_bookings_room_time').on(table.roomId, table.startTime, table.endTime),
    index('idx_bookings_user_created_at').on(table.userId, table.createdAt),
    index('idx_bookings_recurring_day').on(table.isRecurring, table.dayOfWeek),
  ],
)

export const bookingExceptions = sqliteTable(
  'booking_exceptions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    exceptionDate: text('exception_date').notNull(),
    status: text('status', { enum: BookingExceptionStatusValues })
      .notNull()
      .default(BookingExceptionStatus.Released),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('idx_booking_exceptions_booking_date').on(table.bookingId, table.exceptionDate),
    index('idx_booking_exceptions_status').on(table.status),
    uniqueIndex('uniq_booking_exception_booking_date').on(table.bookingId, table.exceptionDate),
  ],
)

export const siteUsers = sqliteTable(
  'site_users',
  {
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: SiteUserRoleValues }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [primaryKey({ columns: [table.siteId, table.userId] })],
)

export const userMembers = sqliteTable(
  'user_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    memberId: text('member_id').references(() => users.id, { onDelete: 'set null' }),
    invitedEmail: text('invited_email').notNull(),
    invitationId: text('invitation_id').unique(),
    role: text('role', { enum: BookingMemberRoleValues })
      .notNull()
      .default(BookingMemberRole.Member),
    status: text('status', { enum: BookingMemberStatusValues })
      .notNull()
      .default(BookingMemberStatus.Pending),
    invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
    acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('idx_user_members_user_id').on(table.userId),
    index('idx_user_members_member_id').on(table.memberId),
    index('idx_user_members_status').on(table.status),
    uniqueIndex('uniq_user_members_invited_email').on(table.invitedEmail),
  ],
)

export const pages = sqliteTable(
  'pages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('page'),
    name: text('name').notNull(),
    title: text('title'),
    contentJson: text('content_json', { mode: 'json' }).$type<JsonRecord | null>(),
    schemaYaml: text('schema_yaml'),
    status: text('status', { enum: PageStatusValues }).notNull().default(PageStatus.Draft),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('idx_pages_site_id').on(table.siteId),
    index('idx_pages_status').on(table.status),
  ],
)

export const media = sqliteTable('media', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  sizeBytes: integer('size_bytes'),
  mimeType: text('mime_type'),
  dimensions: text('dimensions', { mode: 'json' }).$type<JsonRecord | null>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const activityLogs = sqliteTable(
  'activity_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    details: text('details', { mode: 'json' }).$type<JsonRecord | null>(),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('idx_activity_logs_site_id').on(table.siteId),
    index('idx_activity_logs_user_id').on(table.userId),
  ],
)

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  changes: text('changes', { mode: 'json' }).$type<JsonRecord | null>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  siteUsers: many(siteUsers),
  bookingMembers: many(userMembers, { relationName: 'booking_member_user' }),
  bookingMemberships: many(userMembers, { relationName: 'booking_member_profile' }),
  bookingInvitationsSent: many(userMembers, { relationName: 'booking_member_inviter' }),
  activityLogs: many(activityLogs),
  auditLogs: many(auditLogs),
}))

export const sitesRelations = relations(sites, ({ many }) => ({
  siteUsers: many(siteUsers),
  pages: many(pages),
  media: many(media),
  activityLogs: many(activityLogs),
}))

export const locationsRelations = relations(locations, ({ many }) => ({
  rooms: many(rooms),
}))

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  location: one(locations, { fields: [rooms.locationId], references: [locations.id] }),
  bookings: many(bookings),
}))

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  room: one(rooms, { fields: [bookings.roomId], references: [rooms.id] }),
  exceptions: many(bookingExceptions),
}))

export const bookingExceptionsRelations = relations(bookingExceptions, ({ one }) => ({
  booking: one(bookings, { fields: [bookingExceptions.bookingId], references: [bookings.id] }),
}))

export const siteUsersRelations = relations(siteUsers, ({ one }) => ({
  site: one(sites, { fields: [siteUsers.siteId], references: [sites.id] }),
  user: one(users, { fields: [siteUsers.userId], references: [users.id] }),
}))

export const userMembersRelations = relations(userMembers, ({ one }) => ({
  user: one(users, {
    fields: [userMembers.userId],
    references: [users.id],
    relationName: 'booking_member_user',
  }),
  member: one(users, {
    fields: [userMembers.memberId],
    references: [users.id],
    relationName: 'booking_member_profile',
  }),
  inviter: one(users, {
    fields: [userMembers.invitedBy],
    references: [users.id],
    relationName: 'booking_member_inviter',
  }),
}))

export const pagesRelations = relations(pages, ({ one }) => ({
  site: one(sites, { fields: [pages.siteId], references: [sites.id] }),
}))

export const mediaRelations = relations(media, ({ one }) => ({
  site: one(sites, { fields: [media.siteId], references: [sites.id] }),
}))

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
  site: one(sites, { fields: [activityLogs.siteId], references: [sites.id] }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}))
