import { z } from 'zod'
import { createAuditLog } from '#server/utils/audit'
import { saveSiteCmsFile } from '#server/utils/cms'
import { getEditableSiteById } from '#server/utils/sites'

const ParamsSchema = z.object({
  siteId: z.string().min(1),
  type: z.enum(['page', 'collection']),
  name: z
    .string()
    .min(1)
    .regex(/^[\w.-]+$/, 'Invalid schema name'),
})

const SaveSchema = z.object({
  content: z.string(),
})

export default defineEventHandler(async (event) => {
  const params = ParamsSchema.parse({
    siteId: getRouterParam(event, 'id'),
    type: getRouterParam(event, 'type'),
    name: getRouterParam(event, 'name'),
  })

  const body = await readBody(event)
  const data = SaveSchema.parse(body)
  const session = await requireUserSession(event)
  const site = await getEditableSiteById(event, params.siteId)
  const savedFile = await saveSiteCmsFile(site, params.type, params.name, data.content)

  await createAuditLog(
    session.user.id,
    'save_schema_draft',
    {
      siteId: site.id,
      targetType: 'site',
      targetId: site.id,
      filePath: savedFile.path,
    },
    event,
  )

  return {
    data: {
      filePath: savedFile.path,
      fileName: savedFile.fileName,
      saved: true,
    },
  }
})
