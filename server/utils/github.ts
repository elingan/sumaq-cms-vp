import { createSign, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Octokit } from 'octokit'
import { users } from '#server/db/schema'

interface GitHubAppConnection {
  installationId: number
  accountLogin?: string
  accountType?: string
  installedAt: string
}

interface GitHubRepository {
  name: string
  fullName: string
  url: string
  defaultBranch: string
}

export interface RepoFileChange {
  path: string
  content?: string
  delete?: boolean
}

interface GlobalConnection {
  adminUserId: string
  connection: GitHubAppConnection
}

interface AdminGitHubData {
  githubApp?: GitHubAppConnection
  [key: string]: unknown
}

function parseGitHubData(input: unknown): AdminGitHubData {
  if (!input) return {}
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input) as unknown
      return typeof parsed === 'object' && parsed !== null ? (parsed as AdminGitHubData) : {}
    } catch {
      return {}
    }
  }
  return typeof input === 'object' && input !== null ? (input as AdminGitHubData) : {}
}

function getGitHubTokenOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw createError({ statusCode: 500, message: 'GitHub is not configured' })
  }
  return new Octokit({ auth: token })
}

function getGitHubAppConfig() {
  const appId = process.env.GITHUB_APP_ID
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!appId || !privateKey) {
    throw createError({
      statusCode: 500,
      message: 'GitHub App is not configured (GITHUB_APP_ID / GITHUB_PRIVATE_KEY)',
    })
  }

  return { appId, privateKey }
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64url')
}

function createGitHubAppJwt(): string {
  const { appId, privateKey } = getGitHubAppConfig()
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64UrlEncode(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    }),
  )

  const tokenBase = `${header}.${payload}`
  const signature = createSign('RSA-SHA256').update(tokenBase).sign(privateKey, 'base64url')

  return `${tokenBase}.${signature}`
}

function getGitHubAppOctokit() {
  return new Octokit({ auth: createGitHubAppJwt() })
}

async function getInstallationToken(installationId: number): Promise<string> {
  const octokit = getGitHubAppOctokit()
  const { data } = await octokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    {
      installation_id: installationId,
    },
  )
  return data.token
}

async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const token = await getInstallationToken(installationId)
  return new Octokit({ auth: token })
}

async function getGlobalConnectionOrTokenOctokit(): Promise<Octokit> {
  const globalConnection = await getGlobalGitHubConnection()
  if (globalConnection) {
    return getInstallationOctokit(globalConnection.connection.installationId)
  }
  return getGitHubTokenOctokit()
}

function parseInstallationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return null
}

export function createGitHubConnectState() {
  return randomUUID()
}

export function getGitHubInstallUrl(state: string): string {
  const appSlug = process.env.GITHUB_APP_SLUG
  if (!appSlug) {
    throw createError({
      statusCode: 500,
      message: 'GitHub App slug is not configured (GITHUB_APP_SLUG)',
    })
  }

  const installUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`)
  installUrl.searchParams.set('state', state)
  return installUrl.toString()
}

export async function getGitHubInstallationDetails(installationId: number) {
  const octokit = getGitHubAppOctokit()
  const { data } = await octokit.request('GET /app/installations/{installation_id}', {
    installation_id: installationId,
  })

  const account = data.account
  const accountLogin = account && 'login' in account ? account.login : undefined
  const accountType = account && 'type' in account ? account.type : undefined

  return {
    accountLogin,
    accountType,
  }
}

export async function getGlobalGitHubConnection(): Promise<GlobalConnection | null> {
  const db = useDrizzle()

  const admins = await db
    .select({ id: users.id, githubData: users.githubData })
    .from(users)
    .where(eq(users.role, 'admin'))

  for (const admin of admins) {
    const githubData = parseGitHubData(admin.githubData)
    const installationId = parseInstallationId(githubData.githubApp?.installationId)
    if (!installationId) continue

    return {
      adminUserId: admin.id,
      connection: {
        installationId,
        accountLogin: githubData.githubApp?.accountLogin,
        accountType: githubData.githubApp?.accountType,
        installedAt: githubData.githubApp?.installedAt ?? new Date().toISOString(),
      },
    }
  }

  return null
}

export async function saveGlobalGitHubConnection(
  adminUserId: string,
  connection: Omit<GitHubAppConnection, 'installedAt'> & { installedAt?: string },
) {
  const db = useDrizzle()

  const [admin] = await db
    .select({ githubData: users.githubData })
    .from(users)
    .where(eq(users.id, adminUserId))
    .limit(1)

  if (!admin) {
    throw createError({ statusCode: 404, message: 'Admin user not found' })
  }

  const githubData = parseGitHubData(admin.githubData)
  githubData.githubApp = {
    installationId: connection.installationId,
    accountLogin: connection.accountLogin,
    accountType: connection.accountType,
    installedAt: connection.installedAt ?? new Date().toISOString(),
  }

  await db.update(users).set({ githubData, updatedAt: new Date() }).where(eq(users.id, adminUserId))
}

export async function clearGlobalGitHubConnection() {
  const globalConnection = await getGlobalGitHubConnection()
  if (!globalConnection) return

  const db = useDrizzle()
  const [admin] = await db
    .select({ githubData: users.githubData })
    .from(users)
    .where(eq(users.id, globalConnection.adminUserId))
    .limit(1)

  if (!admin) return

  const githubData = parseGitHubData(admin.githubData)
  if (!githubData.githubApp) return

  delete githubData.githubApp

  await db
    .update(users)
    .set({ githubData, updatedAt: new Date() })
    .where(eq(users.id, globalConnection.adminUserId))
}

export async function listInstallationRepositories(prefix = 'www-'): Promise<GitHubRepository[]> {
  const globalConnection = await getGlobalGitHubConnection()
  if (!globalConnection) {
    throw createError({ statusCode: 409, message: 'GitHub App is not connected' })
  }

  const octokit = await getInstallationOctokit(globalConnection.connection.installationId)

  const repositories: GitHubRepository[] = []
  let page = 1

  while (true) {
    const { data } = await octokit.request('GET /installation/repositories', {
      per_page: 100,
      page,
    })

    for (const repo of data.repositories) {
      if (!repo.name.startsWith(prefix)) continue
      repositories.push({
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
      })
    }

    if (data.repositories.length < 100) break
    page += 1
  }

  return repositories.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export async function listRepositoryBranches(fullName: string): Promise<string[]> {
  const globalConnection = await getGlobalGitHubConnection()
  if (!globalConnection) {
    throw createError({ statusCode: 409, message: 'GitHub App is not connected' })
  }

  const [owner, repo] = fullName.split('/')
  if (!owner || !repo) {
    throw createError({ statusCode: 400, message: 'Invalid repository full name' })
  }

  const octokit = await getInstallationOctokit(globalConnection.connection.installationId)
  const branches: string[] = []
  let page = 1

  while (true) {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/branches', {
      owner,
      repo,
      per_page: 100,
      page,
    })

    for (const branch of data) {
      branches.push(branch.name)
    }

    if (data.length < 100) break
    page += 1
  }

  return branches.sort((a, b) => a.localeCompare(b))
}

export async function validateRepositoryAccess(repoUrl: string) {
  const globalConnection = await getGlobalGitHubConnection()
  if (!globalConnection) {
    throw createError({ statusCode: 409, message: 'GitHub App is not connected' })
  }

  const { owner, repo } = parseGitHubUrl(repoUrl)
  const octokit = await getInstallationOctokit(globalConnection.connection.installationId)

  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}', { owner, repo })
    return {
      fullName: data.full_name,
      defaultBranch: data.default_branch,
      url: data.html_url,
    }
  } catch (error: unknown) {
    const status = (error as { status?: number }).status
    if (status === 404) {
      throw createError({
        statusCode: 400,
        message: 'Repository is not available in the connected GitHub App installation',
      })
    }
    throw error
  }
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
  const octokit = await getGlobalConnectionOrTokenOctokit()
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

export async function listRepoFilesByPrefix(
  repoUrl: string,
  prefix: string,
  branch = 'main',
): Promise<Array<{ name: string; path: string; sha: string }>> {
  const octokit = await getGlobalConnectionOrTokenOctokit()
  const { owner, repo } = parseGitHubUrl(repoUrl)

  const normalizedPrefix = prefix.replace(/^\/+/, '').replace(/\/+$/, '')

  const refResponse = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
    owner,
    repo,
    ref: `heads/${branch}`,
  })

  const commitResponse = await octokit.request(
    'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
    {
      owner,
      repo,
      commit_sha: refResponse.data.object.sha,
    },
  )

  const treeResponse = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
    owner,
    repo,
    tree_sha: commitResponse.data.tree.sha,
    recursive: '1',
  })

  return (treeResponse.data.tree ?? [])
    .filter((item) => item.type === 'blob' && item.path?.startsWith(`${normalizedPrefix}/`))
    .map((item) => ({
      name: item.path!.slice(normalizedPrefix.length + 1),
      path: item.path!,
      sha: item.sha ?? '',
    }))
}

/**
 * Get the raw content of a file from a GitHub repo
 */
export async function getRepoFileContent(
  repoUrl: string,
  filePath: string,
  branch = 'main',
): Promise<string | null> {
  const octokit = await getGlobalConnectionOrTokenOctokit()
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
  const octokit = await getGlobalConnectionOrTokenOctokit()
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

export async function syncRepoFiles(
  repoUrl: string,
  branch: string,
  changes: RepoFileChange[],
  commitMessage: string,
): Promise<{ commitSha: string }> {
  if (!changes.length) {
    throw createError({ statusCode: 400, message: 'No file changes to sync' })
  }

  const octokit = await getGlobalConnectionOrTokenOctokit()
  const { owner, repo } = parseGitHubUrl(repoUrl)

  const refResponse = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
    owner,
    repo,
    ref: `heads/${branch}`,
  })

  const headSha = refResponse.data.object.sha
  const commitResponse = await octokit.request(
    'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
    {
      owner,
      repo,
      commit_sha: headSha,
    },
  )

  const treeItems: Array<{
    path: string
    mode: '100644'
    type: 'blob'
    content?: string
    sha?: null
  }> = changes.map((change) => {
    if (change.delete) {
      return {
        path: change.path,
        mode: '100644',
        type: 'blob',
        sha: null,
      }
    }

    return {
      path: change.path,
      mode: '100644',
      type: 'blob',
      content: change.content ?? '',
    }
  })

  const treeResponse = await octokit.request('POST /repos/{owner}/{repo}/git/trees', {
    owner,
    repo,
    base_tree: commitResponse.data.tree.sha,
    tree: treeItems,
  })

  const newCommitResponse = await octokit.request('POST /repos/{owner}/{repo}/git/commits', {
    owner,
    repo,
    message: commitMessage,
    tree: treeResponse.data.sha,
    parents: [headSha],
  })

  await octokit.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommitResponse.data.sha,
    force: false,
  })

  return { commitSha: newCommitResponse.data.sha }
}
