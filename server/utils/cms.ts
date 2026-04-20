import { blob } from 'hub:blob'
import type { InferSelectModel } from 'drizzle-orm'
import type { SiteCmsDiffSummary, SiteCmsEntry, SiteCmsNavigation } from '#shared/types/cms'
import type { sites } from '#server/db/schema'
import { getRepoFileContent, listCmsSchemas } from '#server/utils/github'

type SiteRecord = InferSelectModel<typeof sites>

const LEGACY_BLOB_CMS_PREFIX = 'sites/template/cms/'
const CMS_FILE_PATTERN = /^(page|collection)\.(.+)\.yaml$/i

interface BlobListItem {
  pathname?: string
}

interface CmsBlobFile {
  fileName: string
  path: string
}

interface SiteCmsSourceSnapshot {
  source: 'github' | 'template' | 'empty'
  files: Record<string, string>
}

export interface SiteCmsContentResult {
  content: string
  fileName: string
  filePath: string
}

function getSiteSlug(site: SiteRecord) {
  return site.slug ?? site.id
}

export function getSiteCmsBlobPrefix(site: SiteRecord) {
  return `sites/${getSiteSlug(site)}/cms/`
}

export function buildCmsFileName(type: 'page' | 'collection', name: string) {
  return `${type}.${name}.yaml`
}

export function buildCmsRepoPath(type: 'page' | 'collection', name: string) {
  return `cms/${buildCmsFileName(type, name)}`
}

async function readBlobText(path: string) {
  const file = await blob.get(path)
  return file ? await file.text() : null
}

async function listBlobCmsFiles(prefix: string) {
  const entries: CmsBlobFile[] = []
  let cursor: string | undefined

  do {
    const result = await blob.list({
      prefix,
      cursor,
      limit: 100,
    })

    for (const item of (result.blobs as BlobListItem[]) ?? []) {
      const path = item.pathname
      if (!path) {
        continue
      }

      entries.push({
        path,
        fileName: path.slice(prefix.length),
      })
    }

    cursor = result.hasMore ? result.cursor : undefined
  } while (cursor)

  return entries.filter((entry) => CMS_FILE_PATTERN.test(entry.fileName))
}

function capitalizeWord(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function formatCmsLabel(name: string) {
  return name
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => capitalizeWord(segment))
    .join(' ')
}

function buildCmsEntry(site: SiteRecord, fileName: string, filePath: string): SiteCmsEntry | null {
  const match = fileName.match(CMS_FILE_PATTERN)

  if (!match) {
    return null
  }

  const type = match[1]!.toLowerCase() as SiteCmsEntry['type']
  const name = match[2]!
  const slug = site.slug ?? site.id
  const section = type === 'page' ? 'page' : 'collection'

  return {
    type,
    name,
    label: formatCmsLabel(name),
    fileName,
    filePath,
    to: `/site/${slug}/${section}/${name}`,
  }
}

export async function listSiteBlobCmsFiles(site: SiteRecord) {
  return listBlobCmsFiles(getSiteCmsBlobPrefix(site))
}

async function listSiteBlobCmsEntries(site: SiteRecord) {
  const files = await listSiteBlobCmsFiles(site)
  return files
    .map((file) => buildCmsEntry(site, file.fileName, file.path))
    .filter((entry): entry is SiteCmsEntry => entry !== null)
}

async function listTemplateCmsFiles() {
  return listBlobCmsFiles(LEGACY_BLOB_CMS_PREFIX)
}

async function getTemplateCmsSnapshot() {
  const files = await listTemplateCmsFiles()
  const pairs = await Promise.all(
    files.map(async (file) => [file.fileName, (await readBlobText(file.path)) ?? ''] as const),
  )

  return Object.fromEntries(pairs)
}

async function writeSiteCmsFile(site: SiteRecord, fileName: string, content: string) {
  const prefix = getSiteCmsBlobPrefix(site)
  return blob.put(`${prefix}${fileName}`, content, {
    contentType: 'text/plain; charset=utf-8',
    addRandomSuffix: false,
  })
}

export async function saveSiteCmsFile(
  site: SiteRecord,
  type: 'page' | 'collection',
  name: string,
  content: string,
) {
  const fileName = buildCmsFileName(type, name)
  const path = `${getSiteCmsBlobPrefix(site)}${fileName}`
  await writeSiteCmsFile(site, fileName, content)
  return { fileName, path }
}

export async function deleteSiteCmsFiles(site: SiteRecord, fileNames?: string[]) {
  const files = await listSiteBlobCmsFiles(site)
  const targets = fileNames?.length
    ? files.filter((file) => fileNames.includes(file.fileName))
    : files

  if (!targets.length) {
    return 0
  }

  await blob.del(targets.map((file) => file.path))
  return targets.length
}

async function copyCmsFilesToSite(
  site: SiteRecord,
  files: Array<{ fileName: string; content: string }>,
) {
  for (const file of files) {
    await writeSiteCmsFile(site, file.fileName, file.content)
  }
}

export async function ensureSiteCmsWorkspace(site: SiteRecord) {
  const existingFiles = await listSiteBlobCmsFiles(site)
  if (existingFiles.length) {
    return { source: 'workspace' as const, filesCount: existingFiles.length }
  }

  if (site.githubRepoUrl) {
    const githubSchemas = await listCmsSchemas(site.githubRepoUrl, site.githubBranch)

    if (githubSchemas.length) {
      const files = await Promise.all(
        githubSchemas.map(async (schema) => ({
          fileName: schema.name,
          content:
            (await getRepoFileContent(site.githubRepoUrl!, schema.path, site.githubBranch)) ?? '',
        })),
      )

      await copyCmsFilesToSite(site, files)

      return { source: 'github' as const, filesCount: githubSchemas.length }
    }
  }

  const templateFiles = await listTemplateCmsFiles()
  if (templateFiles.length) {
    const files = await Promise.all(
      templateFiles.map(async (file) => ({
        fileName: file.fileName,
        content: (await readBlobText(file.path)) ?? '',
      })),
    )

    await copyCmsFilesToSite(site, files)

    return { source: 'template' as const, filesCount: templateFiles.length }
  }

  return { source: 'empty' as const, filesCount: 0 }
}

export async function getSiteCmsDraftSnapshot(site: SiteRecord) {
  const files = await listSiteBlobCmsFiles(site)
  const pairs = await Promise.all(
    files.map(async (file) => [file.fileName, (await readBlobText(file.path)) ?? ''] as const),
  )

  return Object.fromEntries(pairs)
}

async function getGitHubCmsMap(site: SiteRecord) {
  if (!site.githubRepoUrl) {
    return {}
  }

  const schemas = await listCmsSchemas(site.githubRepoUrl, site.githubBranch)
  const pairs = await Promise.all(
    schemas.map(
      async (schema) =>
        [
          schema.name,
          (await getRepoFileContent(site.githubRepoUrl!, schema.path, site.githubBranch)) ?? '',
        ] as const,
    ),
  )

  return Object.fromEntries(pairs)
}

export async function getSiteCmsSourceSnapshot(site: SiteRecord): Promise<SiteCmsSourceSnapshot> {
  const githubFiles = await getGitHubCmsMap(site)
  if (Object.keys(githubFiles).length) {
    return {
      source: 'github' as const,
      files: githubFiles as Record<string, string>,
    }
  }

  const templateFiles = await getTemplateCmsSnapshot()
  if (Object.keys(templateFiles).length) {
    return {
      source: 'template' as const,
      files: templateFiles as Record<string, string>,
    }
  }

  return {
    source: 'empty' as const,
    files: {},
  }
}

export function diffCmsMaps(
  draftFiles: Record<string, string>,
  publishedFiles: Record<string, string>,
): SiteCmsDiffSummary {
  const added: string[] = []
  const modified: string[] = []
  const deleted: string[] = []
  const fileNames = new Set([...Object.keys(draftFiles), ...Object.keys(publishedFiles)])

  for (const fileName of fileNames) {
    const draftContent = draftFiles[fileName]
    const publishedContent = publishedFiles[fileName]

    if (draftContent !== undefined && publishedContent === undefined) {
      added.push(fileName)
      continue
    }

    if (draftContent === undefined && publishedContent !== undefined) {
      deleted.push(fileName)
      continue
    }

    if (draftContent !== publishedContent) {
      modified.push(fileName)
    }
  }

  return {
    added: added.sort(),
    modified: modified.sort(),
    deleted: deleted.sort(),
  }
}

export async function getSiteCmsDiff(site: SiteRecord) {
  await ensureSiteCmsWorkspace(site)
  const [draftFiles, publishedFiles] = await Promise.all([
    getSiteCmsDraftSnapshot(site),
    getGitHubCmsMap(site),
  ])
  return diffCmsMaps(draftFiles, publishedFiles)
}

export async function syncSiteCmsWorkspace(site: SiteRecord, force = false) {
  const [draftFiles, sourceSnapshot] = await Promise.all([
    getSiteCmsDraftSnapshot(site),
    getSiteCmsSourceSnapshot(site),
  ])

  const diff = diffCmsMaps(sourceSnapshot.files, draftFiles)
  const changesCount = diff.added.length + diff.modified.length + diff.deleted.length

  if (!changesCount) {
    return {
      synced: false,
      requiresConfirmation: false,
      source: sourceSnapshot.source,
      diff,
    }
  }

  if (!force && Object.keys(draftFiles).length) {
    return {
      synced: false,
      requiresConfirmation: true,
      source: sourceSnapshot.source,
      diff,
    }
  }

  if (diff.deleted.length) {
    await deleteSiteCmsFiles(site, diff.deleted)
  }

  await copyCmsFilesToSite(
    site,
    [...diff.added, ...diff.modified].map((fileName) => ({
      fileName,
      content: sourceSnapshot.files[fileName] ?? '',
    })),
  )

  return {
    synced: true,
    requiresConfirmation: false,
    source: sourceSnapshot.source,
    diff,
  }
}

export async function getSiteCmsDraftContent(
  site: SiteRecord,
  type: 'page' | 'collection',
  name: string,
): Promise<SiteCmsContentResult> {
  await ensureSiteCmsWorkspace(site)

  const fileName = buildCmsFileName(type, name)
  const filePath = `${getSiteCmsBlobPrefix(site)}${fileName}`
  const content = await readBlobText(filePath)

  if (content === null) {
    throw createError({ statusCode: 404, message: 'Schema not found' })
  }

  return { content, fileName, filePath }
}

export async function getSiteCmsNavigation(site: SiteRecord): Promise<SiteCmsNavigation> {
  const workspace = await ensureSiteCmsWorkspace(site)
  const [entries, diff, githubSchemas] = await Promise.all([
    listSiteBlobCmsEntries(site),
    getSiteCmsDiff(site),
    site.githubRepoUrl
      ? listCmsSchemas(site.githubRepoUrl, site.githubBranch)
      : Promise.resolve([]),
  ])

  const source: SiteCmsNavigation['source'] = githubSchemas.length ? 'github' : 'blob'
  const usingExampleCms =
    workspace.source === 'template' || (!githubSchemas.length && !!entries.length)
  const changesCount = diff.added.length + diff.modified.length + diff.deleted.length

  return {
    site: {
      id: site.id,
      slug: site.slug,
      name: site.name,
      githubRepoUrl: site.githubRepoUrl,
      githubBranch: site.githubBranch,
    },
    source,
    usingExampleCms,
    draft: {
      hasWorkspace: entries.length > 0,
      hasDraftChanges: changesCount > 0,
      changesCount,
      diff,
    },
    pages: entries.filter((entry) => entry.type === 'page'),
    collections: entries.filter((entry) => entry.type === 'collection'),
  }
}
