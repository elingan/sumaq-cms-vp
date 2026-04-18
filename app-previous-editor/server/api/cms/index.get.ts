import fs from 'fs'
import { join } from 'path'

export default defineEventHandler(() => {
  const cmsPath = join(process.cwd(), 'public/cms')

  try {
    const files = fs.readdirSync(cmsPath)
    const yamlFiles = files.filter((file) => file.endsWith('.yaml'))

    const contentTypes = yamlFiles
      .map((file) => {
        const match = file.match(/^(page|blog)\.(.+)\.yaml$/)
        if (!match) return null

        return {
          type: match[1],
          name: match[2],
        }
      })
      .filter(Boolean)

    return contentTypes
  } catch (error) {
    console.error('Error reading CMS directory:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error reading CMS directory',
    })
  }
})
