import { z } from 'zod'
import type { SiteDataStatusResponse } from '#shared/types/cms'
import {
  getSiteDataDiff,
  getSiteDataDraftSnapshot,
  getSiteDataSourceSnapshot,
} from '#server/utils/data'
import { getAccessibleSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
  })

  const site = await getAccessibleSiteById(event, params.siteId)

  const [diff, draftFiles, sourceSnapshot] = await Promise.all([
    getSiteDataDiff(site),
    getSiteDataDraftSnapshot(site),
    getSiteDataSourceSnapshot(site),
  ])

  const changesCount = diff.added.length + diff.modified.length + diff.deleted.length

  const response: SiteDataStatusResponse = {
    siteId: site.id,
    source: sourceSnapshot.source,
    draft: {
      hasWorkspace: Object.keys(draftFiles).length > 0,
      hasDraftChanges: changesCount > 0,
      changesCount,
      diff,
    },
  }

  return {
    data: response,
  }
})
