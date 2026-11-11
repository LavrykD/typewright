---
title: Configuration & projects
module: Structuring tests
description: Read playwright.config.ts line by line — use options, baseURL, retries, workers, reporters, webServer — and use projects to run the same tests across browsers, devices and environments.
level: Intermediate
minutes: 30
---
## The config file

`playwright.config.ts` is plain TypeScript. `defineConfig` gives you autocomplete and type checking for every option:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,                   // run tests within a file in parallel too
  forbidOnly: !!process.env.CI,          // fail CI if someone committed test.only
  retries: process.env.CI ? 2 : 0,       // retry on CI only
  workers: process.env.CI ? 1 : undefined, // undefined = half your CPU cores
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',             // record a trace when a test is retried
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## `use`: options for every test

Everything under `use` configures the browser context each test gets:

| Option | Effect |
| --- | --- |
| `baseURL` | `page.goto('/login')` resolves against it |
| `viewport`, `locale`, `timezoneId`, `colorScheme` | emulation |
| `storageState` | start logged in (see [Authentication](#/playwright/authentication)) |
| `trace`, `screenshot`, `video` | artifacts: `'off'`, `'on'`, `'retain-on-failure'`, `'on-first-retry'` |
| `actionTimeout`, `navigationTimeout` | per-action limits |
| `testIdAttribute` | what `getByTestId` looks for |

You can override `use` for a single file or `describe` block:

```ts
test.use({ locale: 'de-DE', colorScheme: 'dark' });
```

## `baseURL`

```ts
await page.goto('/settings');   // → http://localhost:3000/settings
await expect(page).toHaveURL('/settings');
```

> [!PITFALL] `baseURL` and leading slashes
> URL resolution follows the browser's rules. With `baseURL: 'http://localhost:3000/app/'`, `goto('settings')` → `/app/settings`, but `goto('/settings')` → `/settings` (the leading slash means "from the root"). Keep the trailing slash on `baseURL` and drop the leading slash on paths when your app lives under a sub-path.

## Projects

A **project** is a named group of tests run with a particular configuration. Common uses:

- the same tests in several browsers or devices (`devices['iPhone 15']`)
- different environments (`staging`, `production`) via different `baseURL`s
- a **setup** project that other projects depend on (auth, seeding data)

```ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    dependencies: ['setup'],          // setup runs first; if it fails, these tests are skipped
  },
  {
    name: 'mobile',
    use: { ...devices['Pixel 7'] },
    testMatch: /.*mobile\.spec\.ts/,  // only some tests
    dependencies: ['setup'],
  },
],
```

Run one project with `npx playwright test --project=mobile`.

## `webServer`: start your app for the tests

`webServer` starts your dev server before the tests and stops it after. Playwright waits until `url` responds. `reuseExistingServer: !process.env.CI` lets you keep your own server running locally while CI always starts a fresh one.

> [!PITFALL] Tests time out at `goto` on CI only
> Usually the app isn't running there. Locally you started it by hand; on CI nothing did. Add a `webServer` block (and make sure the `command` builds or starts the app the same way CI expects).

## Parallelism and workers

- Files run in parallel across **workers** (separate processes).
- Tests *within* a file run in order, in one worker — unless `fullyParallel: true` or `test.describe.configure({ mode: 'parallel' })`.
- `workers: 1` on CI is a conservative default from the generated config; raise it (or use [sharding](#/playwright/visual-aria-and-ci)) once your tests are properly isolated.

## Environment variables

```ts
import 'dotenv/config';   // if you use a .env file (npm i -D dotenv)

export default defineConfig({
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' },
});
```

=== quiz
??? With `baseURL: 'http://localhost:3000'`, what does `page.goto('/login')` open?
- [x] `http://localhost:3000/login`
- [ ] `/login` relative to the current page
- [ ] It throws — goto needs a full URL
> Relative URLs are resolved against `baseURL`.

??? What does `dependencies: ['setup']` on a project do?
- [ ] Installs npm packages before running
- [x] Runs the `setup` project first; if it fails, the dependent project's tests don't run
- [ ] Shares fixtures between projects
> Project dependencies are the recommended way to run global setup like logging in or seeding data.

??? `retries: process.env.CI ? 2 : 0` and `trace: 'on-first-retry'` — when is a trace recorded locally?
- [ ] On every run
- [ ] On every failure
- [x] Never, because there are no retries locally
> Traces are recorded on the first retry. With 0 retries there's no retry. Use `--trace on` when you want one locally.

??? Tests pass locally but every test times out on `page.goto` in CI. Most likely cause?
- [ ] Browsers aren't headless on CI
- [x] The app isn't started on CI — add a `webServer` config
- [ ] `fullyParallel` must be false on CI
> Locally you're running the app yourself. `webServer` makes the test run start (and wait for) it.

=== task Configure a lab project with projects and baseURL
In `pw-lab`:

1. Set `use.baseURL` to `https://demo.playwright.dev/todomvc/` (note the trailing slash).
2. Change your todo tests to `page.goto('./')` instead of the full URL.
3. Add a `mobile` project using `devices['Pixel 7']` that only runs files ending in `.mobile.spec.ts`, and write one such test that asserts the input is visible.
4. Run `npx playwright test --list` to see which tests run in which project.
--- expected
`--list` prints every test prefixed with its project, for example:

```text
Listing tests:
  [chromium] › todo.spec.ts:3:1 › adds two todos
  [firefox] › todo.spec.ts:3:1 › adds two todos
  [webkit] › todo.spec.ts:3:1 › adds two todos
  [mobile] › todo.mobile.spec.ts:3:1 › input is visible on mobile
Total: 4 tests in 2 files
```

If the mobile test also appears under chromium/firefox/webkit, add `testIgnore: /.*\.mobile\.spec\.ts/` to those projects.

=== sources
- [Test configuration — Playwright](https://playwright.dev/docs/test-configuration)
- [Test use options — Playwright](https://playwright.dev/docs/test-use-options)
- [Projects — Playwright](https://playwright.dev/docs/test-projects)
- [Web server — Playwright](https://playwright.dev/docs/test-webserver)
- [Parallelism — Playwright](https://playwright.dev/docs/test-parallel)
