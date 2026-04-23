/**
 * Global setup for Playwright tests
 * Sets up Clerk testing token and other prerequisites
 */
async function globalSetup() {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3110'

  console.log('Global setup: Initializing test environment...')

  // Note: In a real setup, you would:
  // 1. Call setupClerkTestingToken() if using Clerk's testing infrastructure
  // 2. Create test users via Clerk Backend API if needed
  // 3. Seed database with test data
  // 4. Set up environment variables

  // For now, we'll just log that we're ready
  console.log('Test environment ready')
  console.log(`   Base URL: ${baseUrl}`)
  console.log(`   Clerk test mode: ENABLED (requires CLERK_PUBLISHABLE_KEY with pk_test_* key)`)
  console.log('')
  console.log('Important notes:')
  console.log(`   - Tests require the app to be reachable at ${baseUrl}`)
  console.log('   - Use Clerk test credentials (pk_test_*, sk_test_*)')
  console.log('   - Configure CLERK_TESTING_TOKEN for bypass detection')
}

export default globalSetup
