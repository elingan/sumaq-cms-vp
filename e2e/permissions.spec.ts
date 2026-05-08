import { test, expect } from '@playwright/test'

test.describe('Permission Validation - Endpoints', () => {
  test.describe('Admin-Only Endpoints', () => {
    test('GET /api/admin/users requires admin role (returns 401 without auth)', async ({
      page,
    }) => {
      const response = await page.request.get('/api/admin/users')
      expect(response.status()).toBe(401)
    })

    test('GET /api/admin/sites requires admin role (returns 401 without auth)', async ({
      page,
    }) => {
      const response = await page.request.get('/api/admin/sites')
      expect(response.status()).toBe(401)
    })

    test('POST /api/admin/users requires admin role (returns 401 without auth)', async ({
      page,
    }) => {
      const response = await page.request.post('/api/admin/users', {
        data: { email: 'test@example.com' },
      })
      expect(response.status()).toBe(401)
    })
  })

  test.describe('Deprecated Endpoints Return 410', () => {
    test('Legacy password endpoints disabled', async ({ page }) => {
      const loginResponse = await page.request.post('/api/auth/login', {
        data: { email: 'test@example.com', password: 'password' },
      })
      expect(loginResponse.status()).toBe(410)

      const logoutResponse = await page.request.post('/api/auth/logout')
      expect(logoutResponse.status()).toBe(410)

      const resetResponse = await page.request.post('/api/auth/reset-password', {
        data: { token: 'test', password: 'new' },
      })
      expect(resetResponse.status()).toBe(410)
    })

    test('Password link endpoint disabled', async ({ page }) => {
      const response = await page.request.post('/api/admin/users/user123/password-link')
      expect(response.status()).toBe(410)
    })
  })
})

test.describe('Authentication Required - All Protected Routes', () => {
  test.describe('Admin Routes', () => {
    test('/admin/users redirects to login', async ({ page }) => {
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      await page.waitForURL('**/auth/login', { timeout: 5000 })
    })

    test('/admin/sites redirects to login', async ({ page }) => {
      await page.goto('/admin/sites', { waitUntil: 'networkidle' })
      await page.waitForURL('**/auth/login', { timeout: 5000 })
    })
  })

  test.describe('User Routes', () => {
    test('/dashboard redirects to login', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'networkidle' })
      await page.waitForURL('**/auth/login', { timeout: 5000 })
    })

    test('/profile redirects to login', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'networkidle' })
      await page.waitForURL('**/auth/login', { timeout: 5000 })
    })

    test('/settings redirects to login', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'networkidle' })
      await page.waitForURL('**/auth/login', { timeout: 5000 })
    })

    test('/billing redirects to login', async ({ page }) => {
      await page.goto('/billing', { waitUntil: 'networkidle' })
      await page.waitForURL('**/auth/login', { timeout: 5000 })
    })
  })
})

test.describe('Public Routes - No Auth Required', () => {
  test('/ should be accessible', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
  })

  test('/terms should be accessible', async ({ page }) => {
    await page.goto('/terms')
    expect(page.url()).toContain('/terms')
  })

  test('/auth/login should be accessible', async ({ page }) => {
    await page.goto('/auth/login')
    expect(page.url()).toContain('/auth/login')
  })

  test('/auth/signup should be accessible', async ({ page }) => {
    await page.goto('/auth/signup')
    expect(page.url()).toContain('/auth/signup')
  })
})

test.describe('API Endpoint Security', () => {
  test('POST /api/sites requires authentication', async ({ page }) => {
    const response = await page.request.post('/api/sites', {
      data: { name: 'Test Site', slug: 'test-site' },
    })
    expect(response.status()).toBe(401)
  })

  test('PATCH /api/sites/[id] requires authentication', async ({ page }) => {
    const response = await page.request.patch('/api/sites/site123', {
      data: { name: 'Updated Site' },
    })
    expect(response.status()).toBe(401)
  })

  test('DELETE /api/sites/[id] requires authentication', async ({ page }) => {
    const response = await page.request.delete('/api/sites/site123')
    expect(response.status()).toBe(401)
  })
})
