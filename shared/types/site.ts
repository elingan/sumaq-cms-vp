import type { SiteStatusValue, SiteUserRoleValue } from './roles'

export type { SiteStatusValue as SiteStatus, SiteUserRoleValue as SiteUserRole }

export interface Site {
  id: string
  slug: string | null
  name: string
  description: string | null
  language: string
  domain: string | null
  siteUrl: string | null
  screenshotUrl: string | null
  githubRepoUrl: string | null
  githubBranch: string
  vercelProjectId: string | null
  vercelUrl: string | null
  template: string
  status: SiteStatusValue
  createdAt: Date
  updatedAt: Date
}
