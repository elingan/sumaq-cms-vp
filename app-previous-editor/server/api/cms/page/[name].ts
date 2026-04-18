import fs from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

export default defineEventHandler(async (event) => {
  const type = 'page' // getRouterParam(event, 'type')
  const name = getRouterParam(event, 'name')
  const method = event.node.req.method

  // Validate type
  if (!type || !name || !['page', 'blog'].includes(type)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid type or name. Type must be "page" or "blog"',
    })
  }

  // Construct paths
  const schemaPath = join(process.cwd(), `public/cms/${type}.${name}.yaml`)

  // page.* types use {name}.json
  let dataPath: string
  if (type === 'page') {
    dataPath = join(process.cwd(), `public/data/${name}.json`)
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Use /api/cms/blog endpoints for blog entries',
    })
  }

  if (method === 'GET') {
    try {
      // Check if schema exists
      if (!fs.existsSync(schemaPath)) {
        throw createError({
          statusCode: 404,
          statusMessage: `Schema not found: ${type}.${name}`,
        })
      }

      // Read and parse schema
      const schemaRaw = fs.readFileSync(schemaPath, 'utf-8')
      const schema = yaml.load(schemaRaw)

      // Read data if exists, otherwise return empty object
      let data = {}
      if (fs.existsSync(dataPath)) {
        const dataRaw = fs.readFileSync(dataPath, 'utf-8')
        data = JSON.parse(dataRaw)
      }

      return { schema, data }
    } catch (error) {
      if (error.statusCode) throw error
      throw createError({
        statusCode: 500,
        statusMessage: `Error loading content: ${error.message}`,
      })
    }
  }

  if (method === 'PUT') {
    try {
      const body = await readBody(event)

      // Ensure directory exists (for data folder)
      const dataDir = join(process.cwd(), 'public/data')
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // Write data file
      fs.writeFileSync(dataPath, JSON.stringify(body, null, 2), 'utf-8')

      return { success: true, data: body }
    } catch (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Error saving content: ${error.message}`,
      })
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed',
  })
})
