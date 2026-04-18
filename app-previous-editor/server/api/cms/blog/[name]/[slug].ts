import fs from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  const slug = getRouterParam(event, 'slug')
  const method = event.node.req.method

  // Validate parameters
  if (!name || !slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Blog name and slug are required',
    })
  }

  // Construct paths
  const schemaPath = join(process.cwd(), `public/cms/blog.${name}.yaml`)
  const dataDir = join(process.cwd(), `public/data/${name}`)
  const dataPath = join(dataDir, `${slug}.json`)

  if (method === 'GET') {
    try {
      // Check if schema exists
      if (!fs.existsSync(schemaPath)) {
        throw createError({
          statusCode: 404,
          statusMessage: `Schema not found: blog.${name}.yaml`,
        })
      }

      // Read and parse schema
      const schemaRaw = fs.readFileSync(schemaPath, 'utf-8')
      const schema = yaml.load(schemaRaw)

      // Read data if exists, otherwise return empty object
      let data = {}
      if (slug !== 'new' && fs.existsSync(dataPath)) {
        const dataRaw = fs.readFileSync(dataPath, 'utf-8')
        data = JSON.parse(dataRaw)
      }

      return { schema, data }
    } catch (error) {
      if (error.statusCode) throw error
      throw createError({
        statusCode: 500,
        statusMessage: `Error loading blog entry: ${error.message}`,
      })
    }
  }

  if (method === 'POST' || method === 'PUT') {
    try {
      const body = await readBody(event)

      // Extract slug from body for validation
      const entrySlug = body.meta?.slug || slug

      if (!entrySlug || entrySlug === 'new') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Valid slug is required',
        })
      }

      const finalDataPath = join(dataDir, `${entrySlug}.json`)

      // Check if slug already exists (for POST/new entries)
      if (method === 'POST' && fs.existsSync(finalDataPath)) {
        throw createError({
          statusCode: 409,
          statusMessage: `Entry with slug "${entrySlug}" already exists`,
        })
      }

      // Ensure directory exists (for data folder)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }

      // Write data file
      fs.writeFileSync(finalDataPath, JSON.stringify(body, null, 2), 'utf-8')

      return { success: true, data: body, slug: entrySlug }
    } catch (error) {
      if (error.statusCode) throw error
      throw createError({
        statusCode: 500,
        statusMessage: `Error saving blog entry: ${error.message}`,
      })
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed',
  })
})
