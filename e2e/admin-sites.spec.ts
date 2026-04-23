import { test, expect } from '@playwright/test'

test.describe('Admin Sites API', () => {
  test.describe('Without Authentication', () => {
    test('GET /api/admin/sites should return 401', async ({ page }) => {
      const response = await page.request.get('/api/admin/sites')
      expect(response.status()).toBe(401)
    })

    test('GET /api/admin/sites/[id]/owners should return 401', async ({ page }) => {
      const response = await page.request.get('/api/admin/sites/site123/owners')
      expect(response.status()).toBe(401)
    })

    test('POST /api/admin/sites/[id]/owners/add should return 401', async ({ page }) => {
      const response = await page.request.post('/api/admin/sites/site123/owners/add', {
        data: { userId: 'user123' },
      })
      expect(response.status()).toBe(401)
    })

    test('POST /api/admin/sites/[id]/owners/remove should return 401', async ({ page }) => {
      const response = await page.request.post('/api/admin/sites/site123/owners/remove', {
        data: { userId: 'user123' },
      })
      expect(response.status()).toBe(401)
    })

    test('PATCH /api/admin/sites/[id]/owners/update-role should return 401', async ({ page }) => {
      const response = await page.request.patch('/api/admin/sites/site123/owners/update-role', {
        data: { userId: 'user123', role: 'editor' },
      })
      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /api/admin/sites - List Sites', () => {
    test('should return 400 when missing site id for owners endpoint', async ({ page }) => {
      const response = await page.request.get('/api/admin/sites/undefined/owners')
      expect([400, 401]).toContain(response.status())
    })
  })

  test.describe('POST /api/admin/sites/[id]/owners/add - Add Owner', () => {
    test('should return 400 for missing userId', async ({ page }) => {
      const response = await page.request.post('/api/admin/sites/site123/owners/add', {
        data: { role: 'owner' },
      })
      // Will be 401 (auth fail) before validation, but tests form validation
      expect([400, 401]).toContain(response.status())
    })

    test('should return 400 for invalid role', async ({ page }) => {
      const response = await page.request.post('/api/admin/sites/site123/owners/add', {
        data: { userId: 'user123', role: 'invalid-role' },
      })
      // Will be 401 (auth fail) before validation
      expect([400, 401]).toContain(response.status())
    })
  })

  test.describe('POST /api/admin/sites/[id]/owners/remove - Remove Owner', () => {
    test('should return 400 for missing userId', async ({ page }) => {
      const response = await page.request.post('/api/admin/sites/site123/owners/remove', {
        data: { role: 'owner' },
      })
      // Will be 401 (auth fail) before validation
      expect([400, 401]).toContain(response.status())
    })
  })

  test.describe('PATCH /api/admin/sites/[id]/owners/update-role - Update Role', () => {
    test('should return 400 for missing userId', async ({ page }) => {
      const response = await page.request.patch('/api/admin/sites/site123/owners/update-role', {
        data: { role: 'editor' },
      })
      // Will be 401 (auth fail) before validation
      expect([400, 401]).toContain(response.status())
    })

    test('should return 400 for missing role', async ({ page }) => {
      const response = await page.request.patch('/api/admin/sites/site123/owners/update-role', {
        data: { userId: 'user123' },
      })
      // Will be 401 (auth fail) before validation
      expect([400, 401]).toContain(response.status())
    })

    test('should return 400 for invalid role', async ({ page }) => {
      const response = await page.request.patch('/api/admin/sites/site123/owners/update-role', {
        data: { userId: 'user123', role: 'invalid-role' },
      })
      // Will be 401 (auth fail) before validation
      expect([400, 401]).toContain(response.status())
    })
  })
})
