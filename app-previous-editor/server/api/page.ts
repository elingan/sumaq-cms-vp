import fs from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  if (event.node.req.method === 'PUT') {
    return handlePutRequest(event)
  }

  if (event.node.req.method === 'GET') {
    return handleGetRequest(event)
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  })
})

async function handleGetRequest() {
  try {
    const pageJsonPath = join(process.cwd(), 'app/assets/data/page.json')
    const content = fs.readFileSync(pageJsonPath, 'utf-8')
    const data = JSON.parse(content)

    return {
      success: true,
      data,
    }
  } catch (error: unknown) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error reading page data',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

async function handlePutRequest(event) {
  try {
    const body = await readBody(event)

    // Validar que el body no esté vacío
    if (!body || typeof body !== 'object') {
      throw new Error('Body debe ser un objeto válido')
    }

    const pageJsonPath = join(process.cwd(), 'app/assets/data/page.json')

    // Escribir archivo actualizado
    fs.writeFileSync(pageJsonPath, JSON.stringify(body, null, 2), 'utf-8')

    return {
      success: true,
      message: 'Página actualizada exitosamente',
      data: body,
    }
  } catch (error: unknown) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Error saving page data',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
