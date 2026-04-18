export type CmsEntryType = 'page' | 'collection'
export type CmsSource = 'github' | 'blob'

export interface SiteCmsEntry {
  type: CmsEntryType
  name: string
  label: string
  fileName: string
  filePath: string
  to: string
}

export interface SiteCmsSiteSummary {
  id: string
  slug: string | null
  name: string
  githubRepoUrl: string | null
  githubBranch: string
}

export interface SiteCmsDiffSummary {
  added: string[]
  modified: string[]
  deleted: string[]
}

export type SiteDataDiffSummary = SiteCmsDiffSummary

export interface SiteDataDraftSummary {
  hasWorkspace: boolean
  hasDraftChanges: boolean
  changesCount: number
  diff: SiteDataDiffSummary
}

export interface SiteDataSyncResult {
  synced: boolean
  requiresConfirmation: boolean
  source: 'github' | 'empty'
  diff: SiteDataDiffSummary
}

export interface SiteDataStatusResponse {
  siteId: string
  source: 'github' | 'empty'
  draft: SiteDataDraftSummary
}

export interface SiteCmsDraftSummary {
  hasWorkspace: boolean
  hasDraftChanges: boolean
  changesCount: number
  diff: SiteCmsDiffSummary
}

export interface SiteCmsNavigation {
  site: SiteCmsSiteSummary
  source: CmsSource
  usingExampleCms: boolean
  draft: SiteCmsDraftSummary
  pages: SiteCmsEntry[]
  collections: SiteCmsEntry[]
}
