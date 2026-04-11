import { Octokit } from 'octokit'

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw createError({ statusCode: 500, message: 'GitHub token not configured' })
  }
  return new Octokit({ auth: token })
}

/**
 * Parse owner/repo from a full GitHub URL
 * e.g. https://github.com/acme/my-site → { owner: 'acme', repo: 'my-site' }
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\s*$|\/)/)
  if (!match) {
    throw createError({ statusCode: 400, message: 'Invalid GitHub repository URL' })
  }
  return { owner: match[1]!, repo: match[2]! }
}

/**
 * List CMS schema YAML files in the cms/ directory of a repo
 */
export async function listCmsSchemas(
  repoUrl: string,
  branch = 'main',
): Promise<Array<{ name: string; path: string; sha: string }>> {
  const octokit = getOctokit()
  const { owner, repo } = parseGitHubUrl(repoUrl)

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'cms',
      ref: branch,
    })

    if (!Array.isArray(data)) return []

    return data
      .filter((f) => f.type === 'file' && f.name.endsWith('.yaml'))
      .map((f) => ({ name: f.name, path: f.path, sha: f.sha }))
  } catch (e: unknown) {
    if ((e as { status?: number }).status === 404) return []
    throw e
  }
}

/**
 * Get the raw content of a file from a GitHub repo
 */
export async function getRepoFileContent(
  repoUrl: string,
  filePath: string,
  branch = 'main',
): Promise<string | null> {
  const octokit = getOctokit()
  const { owner, repo } = parseGitHubUrl(repoUrl)

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    })

    if (Array.isArray(data) || data.type !== 'file') return null
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch (e: unknown) {
    if ((e as { status?: number }).status === 404) return null
    throw e
  }
}

/**
 * Write or update a file in a GitHub repo via commit
 */
export async function updateRepoFile(
  repoUrl: string,
  branch: string,
  filePath: string,
  content: string,
  commitMessage: string,
): Promise<void> {
  const octokit = getOctokit()
  const { owner, repo } = parseGitHubUrl(repoUrl)

  // Get current file SHA if it exists (required for updates)
  let sha: string | undefined
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    })
    if (!Array.isArray(data) && data.type === 'file') {
      sha = data.sha
    }
  } catch (e: unknown) {
    if ((e as { status?: number }).status !== 404) throw e
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: commitMessage,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  })
}
