import { requireUserSession } from '#server/utils/auth'
import { z } from 'zod'
import { createAuditLog } from '#server/utils/audit'
import { buildDataRepoPath, getSiteDataDiff, getSiteDataDraftSnapshot } from '#server/utils/data'
import { syncRepoFiles, type RepoFileChange } from '#server/utils/github'
import { getEditableSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
})

const PublishSchema = z.object({
  commitMessage: z.string().min(1).default('chore(data): publish content changes from Sumaq'),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
  })

  const body = (await readBody(event).catch(() => undefined)) ?? {}
  const data = PublishSchema.parse(body)
  const session = await requireUserSession(event)
  const site = await getEditableSiteById(event, params.siteId)

  if (!site.githubRepoUrl) {
    throw createError({
      statusCode: 409,
      message: 'Site has no GitHub repository configured',
    })
  }

  const [diff, draftSnapshot] = await Promise.all([
    getSiteDataDiff(site),
    getSiteDataDraftSnapshot(site),
  ])

  const changes: RepoFileChange[] = [
    ...diff.added.map((fileName) => ({
      path: buildDataRepoPath(fileName),
      content: draftSnapshot[fileName] ?? '',
    })),
    ...diff.modified.map((fileName) => ({
      path: buildDataRepoPath(fileName),
      content: draftSnapshot[fileName] ?? '',
    })),
    ...diff.deleted.map((fileName) => ({
      path: buildDataRepoPath(fileName),
      delete: true,
    })),
  ]

  if (!changes.length) {
    return {
      data: {
        published: false,
        diff,
      },
    }
  }

  const result = await syncRepoFiles(
    site.githubRepoUrl,
    site.githubBranch,
    changes,
    data.commitMessage,
  )

  await createAuditLog(
    session.user.id,
    'publish_data_drafts',
    {
      siteId: site.id,
      targetType: 'site',
      targetId: site.id,
      commitSha: result.commitSha,
      diff,
    },
    event,
  )

  return {
    data: {
      published: true,
      commitSha: result.commitSha,
      diff,
    },
  }
})
