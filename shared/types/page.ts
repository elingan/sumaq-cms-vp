export type PageStatus = 'draft' | 'published'

export interface Page {
  id: string
  siteId: string
  type: string
  name: string
  title: string | null
  contentJson: Record<string, unknown> | null
  schemaYaml: string | null
  status: PageStatus
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
