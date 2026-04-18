import { blob } from 'hub:blob'
import type { InferSelectModel } from 'drizzle-orm'
import type { SiteDataDiffSummary, SiteDataSyncResult } from '#shared/types/cms'
import type { sites } from '#server/db/schema'
import { getRepoFileContent, listRepoFilesByPrefix } from '#server/utils/github'

type SiteRecord = InferSelectModel<typeof sites>

const DATA_FILE_PATTERN = /\.json$/i
const DATA_REPO_PREFIX = 'src/data'

interface BlobListItem {
  pathname?: string
}

interface DataBlobFile {
  fileName: string
  path: string
}

interface SiteDataSourceSnapshot {
  source: SiteDataSyncResult['source']
  files: Record<string, string>
}

function getSiteSlug(site: SiteRecord) {
  return site.slug ?? site.id
}

export function getSiteDataBlobPrefix(site: SiteRecord) {
  return `site/${getSiteSlug(site)}/data/`
}

export function buildPageDataFileName(name: string) {
  return `${name}.json`
}

export function buildCollectionDataFileName(collectionName: string, slug: string) {
  return `${collectionName}/${slug}.json`
}

export function buildDataRepoPath(fileName: string) {
  return `${DATA_REPO_PREFIX}/${fileName}`
}

async function readBlobText(path: string) {
  const file = await blob.get(path)
  return file ? await file.text() : null
}

function isValidDataFileName(fileName: string) {
  return DATA_FILE_PATTERN.test(fileName)
}

async function listBlobDataFiles(prefix: string) {
  const entries: DataBlobFile[] = []
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

  return entries.filter((entry) => isValidDataFileName(entry.fileName))
}

async function writeSiteDataFile(site: SiteRecord, fileName: string, content: string) {
  const prefix = getSiteDataBlobPrefix(site)
  await blob.put(`${prefix}${fileName}`, content, {
    contentType: 'application/json; charset=utf-8',
    addRandomSuffix: false,
  })
}

export async function saveSiteDataFile(site: SiteRecord, fileName: string, content: string) {
  await writeSiteDataFile(site, fileName, content)
  return {
    fileName,
    path: `${getSiteDataBlobPrefix(site)}${fileName}`,
  }
}

export async function getSiteDataFileContent(site: SiteRecord, fileName: string) {
  await ensureSiteDataWorkspace(site)
  return readBlobText(`${getSiteDataBlobPrefix(site)}${fileName}`)
}

export async function listCollectionEntrySlugs(site: SiteRecord, collectionName: string) {
  await ensureSiteDataWorkspace(site)
  const prefix = `${collectionName}/`
  const files = await listSiteBlobDataFiles(site)

  return files
    .filter((file) => file.fileName.startsWith(prefix))
    .map((file) => file.fileName.slice(prefix.length).replace(/\.json$/i, ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

export async function listSiteBlobDataFiles(site: SiteRecord) {
  return listBlobDataFiles(getSiteDataBlobPrefix(site))
}

export async function getSiteDataDraftSnapshot(site: SiteRecord) {
  const files = await listSiteBlobDataFiles(site)
  const pairs = await Promise.all(
    files.map(async (file) => [file.fileName, (await readBlobText(file.path)) ?? ''] as const),
  )

  return Object.fromEntries(pairs)
}

async function copyDataFilesToSite(
  site: SiteRecord,
  files: Array<{ fileName: string; content: string }>,
) {
  for (const file of files) {
    await writeSiteDataFile(site, file.fileName, file.content)
  }
}

async function deleteSiteDataFiles(site: SiteRecord, fileNames?: string[]) {
  const files = await listSiteBlobDataFiles(site)
  const targets = fileNames?.length
    ? files.filter((file) => fileNames.includes(file.fileName))
    : files

  if (!targets.length) {
    return 0
  }

  await blob.del(targets.map((file) => file.path))
  return targets.length
}

async function getGitHubDataMap(site: SiteRecord) {
  if (!site.githubRepoUrl) {
    return {}
  }

  const dataFiles = await listRepoFilesByPrefix(
    site.githubRepoUrl,
    DATA_REPO_PREFIX,
    site.githubBranch,
  )

  if (!dataFiles.length) {
    return {}
  }

  const pairs = await Promise.all(
    dataFiles
      .filter((file) => isValidDataFileName(file.name))
      .map(
        async (file) =>
          [
            file.name,
            (await getRepoFileContent(site.githubRepoUrl!, file.path, site.githubBranch)) ?? '',
          ] as const,
      ),
  )

  return Object.fromEntries(pairs)
}

export async function getSiteDataSourceSnapshot(site: SiteRecord): Promise<SiteDataSourceSnapshot> {
  const githubFiles = await getGitHubDataMap(site)

  if (Object.keys(githubFiles).length) {
    return {
      source: 'github',
      files: githubFiles as Record<string, string>,
    }
  }

  return {
    source: 'empty',
    files: {},
  }
}

export function diffDataMaps(
  sourceFiles: Record<string, string>,
  draftFiles: Record<string, string>,
): SiteDataDiffSummary {
  const added: string[] = []
  const modified: string[] = []
  const deleted: string[] = []
  const fileNames = new Set([...Object.keys(sourceFiles), ...Object.keys(draftFiles)])

  for (const fileName of fileNames) {
    const sourceContent = sourceFiles[fileName]
    const draftContent = draftFiles[fileName]

    if (sourceContent !== undefined && draftContent === undefined) {
      added.push(fileName)
      continue
    }

    if (sourceContent === undefined && draftContent !== undefined) {
      deleted.push(fileName)
      continue
    }

    if (sourceContent !== draftContent) {
      modified.push(fileName)
    }
  }

  return {
    added: added.sort(),
    modified: modified.sort(),
    deleted: deleted.sort(),
  }
}

export async function ensureSiteDataWorkspace(site: SiteRecord) {
  const existingFiles = await listSiteBlobDataFiles(site)

  if (existingFiles.length) {
    return { source: 'workspace' as const, filesCount: existingFiles.length }
  }

  const githubFiles = await getGitHubDataMap(site)
  const fileNames = Object.keys(githubFiles)

  if (fileNames.length) {
    await copyDataFilesToSite(
      site,
      fileNames.map((fileName) => ({
        fileName,
        content: githubFiles[fileName] ?? '',
      })),
    )

    return {
      source: 'github' as const,
      filesCount: fileNames.length,
    }
  }

  return {
    source: 'empty' as const,
    filesCount: 0,
  }
}

export async function getSiteDataDiff(site: SiteRecord) {
  await ensureSiteDataWorkspace(site)

  const [draftFiles, sourceSnapshot] = await Promise.all([
    getSiteDataDraftSnapshot(site),
    getSiteDataSourceSnapshot(site),
  ])

  return diffDataMaps(sourceSnapshot.files, draftFiles)
}

export async function syncSiteDataWorkspace(
  site: SiteRecord,
  force = false,
): Promise<SiteDataSyncResult> {
  const [draftFiles, sourceSnapshot] = await Promise.all([
    getSiteDataDraftSnapshot(site),
    getSiteDataSourceSnapshot(site),
  ])

  const diff = diffDataMaps(sourceSnapshot.files, draftFiles)
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
    await deleteSiteDataFiles(site, diff.deleted)
  }

  await copyDataFilesToSite(
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
