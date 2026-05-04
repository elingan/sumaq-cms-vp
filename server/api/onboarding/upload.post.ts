import { getClerkUser } from '#server/utils/auth'
import { readMultipartFormData } from 'h3'
import { blob } from 'hub:blob'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const

const MAX_FILE_SIZE = 10 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const userId = await getClerkUser(event)

  const formData = await readMultipartFormData(event)

  if (!formData?.length) {
    throw createError({ statusCode: 400, message: 'No file received' })
  }

  const file = formData[0]

  if (!file?.filename || !file.data) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }

  if (!file.type || !ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw createError({
      statusCode: 400,
      message: 'Only images (JPEG, PNG, WebP, GIF) and PDF are allowed',
    })
  }

  if (file.data.byteLength > MAX_FILE_SIZE) {
    throw createError({ statusCode: 400, message: 'File exceeds 10MB limit' })
  }

  const extension = file.filename.split('.').pop() ?? 'bin'
  const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`

  const field = event.path.split('/').pop() || 'files'
  const blobPath = `onboarding/${userId}/${field}/${filename}`

  const fileBuffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data)

  await blob.put(blobPath, fileBuffer, {
    contentType: file.type,
    addRandomSuffix: false,
  })

  return {
    success: true,
    url: `/api/onboarding/upload/${field}/${filename}`,
    blobPath,
    filename,
  }
})
