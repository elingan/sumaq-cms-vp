import { sql, relations } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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

export type PasswordResetPurposeValue =
  (typeof PasswordResetPurpose)[keyof typeof PasswordResetPurpose]

export const UserRoleValues = ['admin', 'partner', 'owner', 'editor'] as const
export const SiteUserRoleValues = ['owner', 'editor', 'partner'] as const
export const SiteStatusValues = ['active', 'archived'] as const
export const PageStatusValues = ['draft', 'published'] as const
export const PasswordResetPurposeValues = ['invite', 'reset'] as const

type JsonRecord = Record<string, unknown>

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
  activityLogs: many(activityLogs),
  auditLogs: many(auditLogs),
}))

export const sitesRelations = relations(sites, ({ many }) => ({
  siteUsers: many(siteUsers),
  pages: many(pages),
  media: many(media),
  activityLogs: many(activityLogs),
}))

export const siteUsersRelations = relations(siteUsers, ({ one }) => ({
  site: one(sites, { fields: [siteUsers.siteId], references: [sites.id] }),
  user: one(users, { fields: [siteUsers.userId], references: [users.id] }),
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
