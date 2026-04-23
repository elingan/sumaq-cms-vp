import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should render login page on /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('a[href="/terms"]')).toBeVisible()
    expect(page.url()).toContain('/login')
  })

  test('should render signup page on /signup', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('a[href="/terms"]')).toBeVisible()
    expect(page.url()).toContain('/signup')
  })

  test('should redirect to login when accessing protected /admin/users without auth', async ({
    page,
  }) => {
    await page.goto('/admin/users')
    // Should be redirected to login
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should redirect to login when accessing protected /admin/sites without auth', async ({
    page,
  }) => {
    await page.goto('/admin/sites')
    // Should be redirected to login
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should redirect to login when accessing protected /dashboard without auth', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    // Should be redirected to login
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('should allow access to public homepage without auth', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Logout Flow', () => {
  test('should show error accessing logout endpoint directly', async ({ page }) => {
    const response = await page.request.post('/api/auth/logout')
    expect(response.status()).toBe(410) // Gone
  })
})
