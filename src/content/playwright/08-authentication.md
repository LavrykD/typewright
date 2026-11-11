---
title: Authentication & storageState
module: Structuring tests
description: Log in once in a setup project, save the session with storageState, reuse it everywhere — and know when you need one account per worker instead.
level: Intermediate
minutes: 30
---
## The problem

Every test gets a [fresh browser context](#/playwright/setup-and-first-test), so every test starts logged out. Logging in through the UI in every test is slow and adds a failure point to every test. The fix: **log in once, save the browser state, start each test from it.**

## How storageState works

`storageState` is a JSON file of cookies and localStorage (and optionally IndexedDB) captured from a context. Load it into a new context and the app sees an existing session.

```ts
await page.context().storageState({ path: 'playwright/.auth/user.json' });   // save
test.use({ storageState: 'playwright/.auth/user.json' });                     // load
```

## The recommended setup: a setup project

:::steps
### Ignore the auth folder
```bash
mkdir -p playwright/.auth
echo $'\nplaywright/.auth' >> .gitignore
```
The file contains real session cookies — **never commit it**.
### Write the setup test
```ts title="tests/auth.setup.ts"
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait until the session is really established (cookies may be set during redirects)
  await page.waitForURL('/dashboard');
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
```
### Wire it up in the config
```ts title="playwright.config.ts"
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```
### Write tests as if already logged in
```ts
test('shows my orders', async ({ page }) => {
  await page.goto('/orders');          // already authenticated
  await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible();
});
```
:::

> [!PITFALL] Saving state before login has finished
> Clicking "Sign in" and immediately calling `storageState()` often saves an *empty* session: the auth cookie arrives a moment later, sometimes after several redirects. Always wait for a post-login signal — `waitForURL` to the landing page and/or a logged-in-only element — before saving.

## Opting out for some tests

Tests for the login page itself must start logged out:

```ts
test.use({ storageState: { cookies: [], origins: [] } });

test('shows an error for a wrong password', async ({ page }) => { /* … */ });
```

## Multiple roles

Save one file per role and choose per file or describe block:

```ts
// auth.setup.ts: two setup tests → admin.json and member.json
test.describe('admin area', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });
  test('can ban a user', async ({ page }) => { /* … */ });
});
```

## When one shared account isn't enough

> [!PITFALL] Parallel tests fighting over one account
> If tests **change server-side state** for the logged-in user — settings, cart contents, profile — parallel tests sharing a single account will interfere: test A empties the cart while test B is checking out. Use **one account per worker** with a worker-scoped fixture (`workerInfo.parallelIndex` picks the account) so parallel tests never share a user.

```ts
export const test = base.extend<{}, { workerStorageState: string }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
  workerStorageState: [async ({ browser }, use) => {
    const id = test.info().parallelIndex;
    const file = path.resolve(test.info().project.outputDir, `.auth/${id}.json`);
    if (!fs.existsSync(file)) {
      const page = await browser.newPage({ storageState: undefined });
      // … log in as `user${id}` and wait for the session …
      await page.context().storageState({ path: file });
      await page.close();
    }
    await use(file);
  }, { scope: 'worker' }],
});
```

## Faster: authenticate through the API

If your app has a login endpoint, the setup can skip the UI entirely:

```ts
setup('authenticate via API', async ({ request }) => {
  await request.post('/api/login', { data: { email: 'ada@example.com', password: 's3cret' } });
  await request.storageState({ path: authFile });
});
```

=== quiz
??? What does a storageState file contain?
- [ ] The user's password
- [x] Cookies and localStorage (and optionally IndexedDB) of a browser context
- [ ] A screenshot of the logged-in page
- [ ] The full browser profile directory
> It's the session data the app uses to recognise a logged-in user. Treat it as a secret.

??? Your setup saves storageState right after clicking "Sign in", and tests still start logged out. Why?
- [ ] storageState only works in Chromium
- [x] The auth cookies weren't set yet; wait for a post-login URL or element before saving
- [ ] The file path must be absolute
> Login flows often set cookies during redirects. Wait for proof that you're logged in.

??? How do you make one test file start logged out when the project uses a saved state?
- [ ] Delete the `.auth` folder in `beforeAll`
- [x] `test.use({ storageState: { cookies: [], origins: [] } })`
- [ ] Call `page.context().clearCookies()` at the end of setup
> Overriding `storageState` with an empty state for that file is the documented approach.

??? When should you use one account per worker instead of a shared login?
- [ ] Always
- [x] When tests modify server-side state of the logged-in user and run in parallel
- [ ] When using more than one browser
- [ ] Never; storageState handles it
> Shared accounts are fine for read-only tests. Mutating tests need isolation at the server level too.

=== task Set up a login once
You need an app with a login. Two options: use an app you're building (best), or use [the-internet.herokuapp.com/login](https://the-internet.herokuapp.com/login) — a public practice site (username `tomsmith`, password `SuperSecretPassword!`, both shown on the page itself).

1. Create `tests/auth.setup.ts` that logs in and saves `playwright/.auth/user.json`. Wait for the secure-area page before saving.
2. Add the `setup` project and `storageState` + `dependencies` to your browser project.
3. Write `tests/secure.spec.ts` that goes straight to `/secure` and asserts the "Logout" link is visible.
4. Run `npx playwright test --project=chromium`.
--- hint
For the practice site, set `baseURL: 'https://the-internet.herokuapp.com'`, and after clicking Login: `await page.waitForURL('/secure')`.
--- expected
The run shows the setup test executing first, then your test:

```text
Running 2 tests using 1 worker
  ✓  1 [setup] › tests/auth.setup.ts:6:1 › authenticate
  ✓  2 [chromium] › tests/secure.spec.ts:3:1 › secure area is accessible
  2 passed
```

`playwright/.auth/user.json` exists and contains a `cookies` array with a session cookie for the site. Now delete the `dependencies` line and the `user.json` file and run again. The secure test fails instantly, before the browser even opens:

```text
Error: Error reading storage state from playwright/.auth/user.json:
ENOENT: no such file or directory, open 'playwright/.auth/user.json'
```

That's why the `dependencies` line matters: it guarantees the setup project has produced the file before any test needs it.

=== sources
- [Authentication — Playwright](https://playwright.dev/docs/auth)
- [Projects: dependencies — Playwright](https://playwright.dev/docs/test-projects#dependencies)
- [browserContext.storageState — Playwright API](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
- [API testing — Playwright](https://playwright.dev/docs/api-testing)
