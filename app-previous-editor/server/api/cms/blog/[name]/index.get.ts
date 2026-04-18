import fs from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Blog name is required',
    })
  }

  const dataDir = join(process.cwd(), 'public/data', name)

  try {
    // Check if directory exists
    if (!fs.existsSync(dataDir)) {
      return []
    }

    // Read all .json files except _index.json
    const files = fs.readdirSync(dataDir)
    const entries = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const filePath = join(dataDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(content)

        return {
          slug: file.replace('.json', ''),
          ...data,
        }
      })
      .sort((a, b) => {
        // Sort by date descending
        const dateA = new Date(a.meta?.date || 0).getTime()
        const dateB = new Date(b.meta?.date || 0).getTime()
        return dateB - dateA
      })

    return entries
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error listing blog entries: ${error.message}`,
    })
  }
})
