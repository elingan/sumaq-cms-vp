import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')

  if (!name || !/^[\w.-]+\.yaml$/.test(name)) {
    throw createError({ statusCode: 400, message: 'Invalid schema name' })
  }

  try {
    const schemaPath = resolve(process.cwd(), `app/assets/cms/${name}`)
    const content = readFileSync(schemaPath, 'utf-8')
    setHeader(event, 'content-type', 'text/plain; charset=utf-8')
    return content
  } catch {
    throw createError({ statusCode: 404, message: 'Schema not found' })
  }
})
