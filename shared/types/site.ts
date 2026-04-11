export type SiteStatus = 'active' | 'archived'
export type SiteUserRole = 'owner' | 'editor' | 'partner'

export interface Site {
  id: string
  slug: string
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
  status: SiteStatus
  createdAt: Date
  updatedAt: Date
}
