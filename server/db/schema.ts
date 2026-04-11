import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  serial,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'partner', 'owner', 'editor'])
export const siteUserRoleEnum = pgEnum('site_user_role', ['owner', 'editor', 'partner'])
export const siteStatusEnum = pgEnum('site_status', ['active', 'archived'])
export const pageStatusEnum = pgEnum('page_status', ['draft', 'published'])

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  name: text('name'),
  role: userRoleEnum('role').notNull().default('editor'),
  githubData: jsonb('github_data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
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
  status: siteStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const siteUsers = pgTable(
  'site_users',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: siteUserRoleEnum('role').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.siteId, table.userId] })],
)

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('page'),
    name: text('name').notNull(),
    title: text('title'),
    contentJson: jsonb('content_json'),
    schemaYaml: text('schema_yaml'),
    status: pageStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_pages_site_id').on(table.siteId),
    index('idx_pages_status').on(table.status),
  ],
)

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  sizeBytes: integer('size_bytes'),
  mimeType: text('mime_type'),
  dimensions: jsonb('dimensions'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    details: jsonb('details'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_activity_logs_site_id').on(table.siteId),
    index('idx_activity_logs_user_id').on(table.userId),
  ],
)

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  changes: jsonb('changes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  siteUsers: many(siteUsers),
  activityLogs: many(activityLogs),
  auditLogs: many(auditLogs),
  passwordResets: many(passwordResets),
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

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, { fields: [passwordResets.userId], references: [users.id] }),
}))
