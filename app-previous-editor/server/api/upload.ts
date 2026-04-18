import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No se recibió ningún archivo',
      })
    }

    const file = formData[0]

    if (!file.filename || !file.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Archivo inválido',
      })
    }

    // Validar tipo de archivo (solo imágenes)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!file.type || !allowedTypes.includes(file.type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Solo se permiten imágenes (JPEG, PNG, WebP, GIF)',
      })
    }

    // Crear nombre único para el archivo
    const timestamp = Date.now()
    const extension = file.filename.split('.').pop()
    const filename = `${timestamp}.${extension}`

    // Guardar en public/uploads
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    const filepath = join(uploadsDir, filename)

    // Crear directorio si no existe
    await mkdir(uploadsDir, { recursive: true })

    // Guardar archivo
    await writeFile(filepath, file.data)

    // Retornar URL relativa
    return {
      success: true,
      url: `/uploads/${filename}`,
      filename,
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('Error uploading file:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al subir el archivo',
    })
  }
})
