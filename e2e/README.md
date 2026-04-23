# E2E Tests for Sumaq CMS

End-to-end tests for the Clerk authentication migration and critical workflows.

## Prerequisites

- Development server running: `vp dev` (port 3010)
- Clerk test environment configured
- Node.js 18+ and Playwright installed

## Setup

1. **Install Playwright (already done):**

   ```bash
   vp add -D @playwright/test
   ```

2. **For Clerk Testing Token (optional, advanced):**
   - Get `CLERK_TESTING_TOKEN` from Clerk dashboard
   - Add to `.env.local` for test environment
   - Tests will use test keys (`pk_test_*`, `sk_test_*`)

## Running Tests

### Start dev server first

```bash
vp dev
```

### Run all tests

```bash
npm run test:e2e
```

### Run specific test file

```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Run tests with interactive UI

```bash
npm run test:e2e:ui
```

### Debug specific test

```bash
npm run test:e2e:debug -- e2e/auth.spec.ts
```

## Test Structure

### `auth.spec.ts`

- Tests Clerk SignIn/SignUp components load
- Tests redirect to login for protected routes
- Tests public pages remain accessible

### `route-protection.spec.ts`

- Tests middleware protecting admin/user routes
- Tests deprecated endpoints return 410 Gone
- Tests admin endpoints require auth (401 without token)

### `admin-users.spec.ts`

- Tests user listing endpoint authentication
- Tests user creation validation
- Tests deprecated password-link endpoint

### `admin-sites.spec.ts`

- Tests site listing authentication
- Tests owner management endpoints
- Tests validation of owner operations

### `permissions.spec.ts`

- Tests admin-only endpoints
- Tests authentication on all protected APIs
- Tests public routes remain accessible

## CI Integration

For GitHub Actions, tests run in headless mode:

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    CI: true
```

## Configuration

See `playwright.config.ts` for:

- Test directory configuration
- Browser configurations (chromium, firefox, webkit)
- Web server startup configuration
- Trace and artifact collection

## Debugging Failed Tests

1. **Check HTML report:**

   ```bash
   npx playwright show-report
   ```

2. **Enable trace for specific test:**

   ```bash
   npx playwright test --trace on e2e/auth.spec.ts
   ```

3. **Run in debug mode:**
   ```bash
   npm run test:e2e:debug
   ```

## Important Notes

- Tests assume dev server running on `http://localhost:3010`
- Tests use `baseURL` from playwright.config.ts
- Clerk components are identified by `[data-clerk-component]` selector
- All admin endpoints return 401 without valid Clerk session
- Deprecated endpoints return 410 Gone (not 404)

## Future Enhancements

- [ ] Authenticated workflow tests (with Clerk test user)
- [ ] Admin CRUD operations with real data
- [ ] Site creation and permission verification
- [ ] Webhook verification tests
- [ ] Performance benchmarks
