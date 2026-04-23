import { test, expect } from '@playwright/test'

test.describe('Route Protection and Middleware', () => {
  test('should redirect to /login when accessing /admin/users without auth', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should redirect to /login when accessing /admin/sites without auth', async ({ page }) => {
    await page.goto('/admin/sites', { waitUntil: 'networkidle' })
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should redirect to /login when accessing /dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should redirect to /login when accessing /settings without auth', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should redirect to /login when accessing /profile without auth', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'networkidle' })
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should allow access to public pages without auth', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
  })

  test('should allow access to /terms without auth', async ({ page }) => {
    await page.goto('/terms')
    expect(page.url()).toContain('/terms')
  })
})

test.describe('Deprecated Endpoints - Should Return 410 Gone', () => {
  test('POST /api/auth/login should return 410', async ({ page }) => {
    const response = await page.request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'password' },
    })
    expect(response.status()).toBe(410)
    const body = await response.json()
    expect(body.message).toContain('Login via email/password is now handled by Clerk')
  })

  test('POST /api/auth/logout should return 410', async ({ page }) => {
    const response = await page.request.post('/api/auth/logout')
    expect(response.status()).toBe(410)
    const body = await response.json()
    expect(body.message).toContain('Logout is now handled by Clerk')
  })

  test('GET /api/auth/reset-password should return 410', async ({ page }) => {
    const response = await page.request.get('/api/auth/reset-password?token=test')
    expect(response.status()).toBe(410)
  })

  test('POST /api/auth/reset-password should return 410', async ({ page }) => {
    const response = await page.request.post('/api/auth/reset-password', {
      data: { token: 'test', password: 'newpassword' },
    })
    expect(response.status()).toBe(410)
  })
})

test.describe('Admin Endpoints - Should Require Auth', () => {
  test('GET /api/admin/users should return 401 without auth', async ({ page }) => {
    const response = await page.request.get('/api/admin/users')
    expect(response.status()).toBe(401)
  })

  test('POST /api/admin/users should return 401 without auth', async ({ page }) => {
    const response = await page.request.post('/api/admin/users', {
      data: { email: 'new@example.com' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/sites should return 401 without auth', async ({ page }) => {
    const response = await page.request.get('/api/admin/sites')
    expect(response.status()).toBe(401)
  })

  test('POST /api/admin/sites/[id]/owners/add should return 401 without auth', async ({ page }) => {
    const response = await page.request.post('/api/admin/sites/test-id/owners/add', {
      data: { userId: 'user123', role: 'owner' },
    })
    expect(response.status()).toBe(401)
  })
})
