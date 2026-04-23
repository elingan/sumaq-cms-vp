import { requireUserSession } from '#server/utils/auth'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createError, readMultipartFormData } from 'h3'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] as const
const MAX_FILE_SIZE = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const formData = await readMultipartFormData(event)

  if (!formData?.length) {
    throw createError({ statusCode: 400, message: 'No se recibio ningun archivo.' })
  }

  const file = formData[0]

  if (!file?.filename || !file.data) {
    throw createError({ statusCode: 400, message: 'Archivo invalido.' })
  }

  if (!file.type || !ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw createError({
      statusCode: 400,
      message: 'Solo se permiten imagenes (JPEG, PNG, WebP, GIF).',
    })
  }

  if (file.data.byteLength > MAX_FILE_SIZE) {
    throw createError({ statusCode: 400, message: 'El archivo supera el limite de 5MB.' })
  }

  const extension = file.filename.split('.').pop() ?? 'bin'
  const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`
  const uploadsDir = join(process.cwd(), 'public', 'uploads')
  const filePath = join(uploadsDir, filename)

  await mkdir(uploadsDir, { recursive: true })
  await writeFile(filePath, file.data)

  return {
    success: true,
    url: `/uploads/${filename}`,
    filename,
  }
})
