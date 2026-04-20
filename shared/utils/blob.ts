import { blob } from 'hub:blob'

export interface BlobListItem {
  pathname?: string
}

export interface BlobFileInfo {
  fileName: string
  path: string
}

export interface BlobListOptions {
  prefix: string
  pattern?: RegExp
  limit?: number
}

export interface BlobListResult {
  files: BlobFileInfo[]
  hasMore: boolean
  cursor?: string
}

export async function listBlobFiles(
  prefix: string,
  options: BlobListOptions,
): Promise<BlobListResult> {
  const { pattern, limit = 100 } = options

  const entries: BlobFileInfo[] = []
  let cursor: string | undefined
  let hasMore = false

  do {
    const result = await blob.list({
      prefix,
      cursor,
      limit,
    })

    const items = (result.blobs as BlobListItem[]) ?? []

    for (const item of items) {
      const path = item.pathname
      if (!path) continue

      const fileName = path.slice(prefix.length)

      if (pattern && !pattern.test(fileName)) {
        continue
      }

      entries.push({
        path,
        fileName,
      })
    }

    hasMore = result.hasMore
    cursor = result.hasMore ? result.cursor : undefined

    if (limit && entries.length >= limit) {
      break
    }
  } while (cursor)

  return {
    files: entries,
    hasMore,
    cursor,
  }
}

export async function readBlobText(path: string): Promise<string | null> {
  const file = await blob.get(path)
  return file ? await file.text() : null
}

export async function writeBlobText(
  path: string,
  content: string,
  contentType = 'text/plain; charset=utf-8',
): Promise<void> {
  await blob.put(path, content, {
    contentType,
    addRandomSuffix: false,
  })
}

export async function deleteBlobFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await blob.del(paths)
}

export async function getBlobFileSnapshot(
  prefix: string,
  pattern: RegExp,
): Promise<Record<string, string>> {
  const { files } = await listBlobFiles(prefix, { prefix, pattern })
  const pairs = await Promise.all(
    files.map(
      async (file: BlobFileInfo) => [file.fileName, (await readBlobText(file.path)) ?? ''] as const,
    ),
  )
  return Object.fromEntries(pairs)
}
