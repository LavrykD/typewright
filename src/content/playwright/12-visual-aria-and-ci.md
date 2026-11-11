---
title: Visual tests, aria snapshots & CI
module: Mastery
description: Screenshot comparisons that don't drown you in false failures, aria snapshots for structure, and running the suite on GitHub Actions with sharding and merged reports.
level: Advanced
minutes: 40
---
## Visual comparisons

`toHaveScreenshot()` compares the page (or an element) with a stored baseline image:

```ts
test('pricing page looks right', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page).toHaveScreenshot();                               // whole viewport
  await expect(page.getByRole('table')).toHaveScreenshot('plans.png'); // one element
});
```

The **first run fails on purpose** — there's no baseline yet — and writes the actual screenshot as the new baseline. Commit it; later runs compare against it. After an intentional UI change, update baselines with:

```bash
npx playwright test --update-snapshots
```

> [!PITFALL] Baselines are per OS and browser
> Fonts and anti-aliasing differ between macOS, Windows and Linux, so baseline files are named per platform — e.g. `pricing-page-looks-right-1-chromium-darwin.png`. Baselines made on your Mac won't match Linux CI. Generate and update them **in the same environment as CI** (for example, the official Playwright Docker image), and commit those.

### Making screenshots stable

```ts
await expect(page).toHaveScreenshot({
  mask: [page.getByTestId('timestamp'), page.getByRole('img', { name: 'Avatar' })], // hide dynamic parts
  maxDiffPixelRatio: 0.01,       // tolerate tiny differences
  fullPage: true,
});
```

CSS animations are disabled during screenshots by default, and Playwright waits for two consecutive identical screenshots before comparing. Fix time with [`page.clock`](#/playwright/flakiness) and data with [mocks](#/playwright/network-and-api) for fully deterministic images.

## Aria snapshots: assert structure, not pixels

An aria snapshot is a YAML description of the **accessibility tree** — roles, names and hierarchy. It catches structural regressions (a missing heading, a renamed button) without caring about colours or fonts:

```ts
await expect(page.getByRole('navigation')).toMatchAriaSnapshot(`
  - navigation:
    - link "Home"
    - link "Pricing"
    - link "Docs"
    - button "Sign in"
`);
```

- Matching is **partial** by default: list what matters, omit the rest.
- Names accept regexes: `- heading /Welcome, .+/ [level=1]`.
- Generate a starting point with the "Assert snapshot" tool in codegen/UI mode, or let `--update-snapshots` fill in snapshots for you.

> [!TIP] Which one when?
> Use **aria snapshots** for page structure and content — fast, readable, cross-platform. Use **screenshots** only where the visual itself is the product (charts, design-system components, marketing pages).

## Running on CI

`npm init playwright` can generate a GitHub Actions workflow. Its essential steps:

```yaml title=".github/workflows/playwright.yml"
name: Playwright Tests
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: lts/* }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

> [!NOTE] Action versions
> Use the action versions in the workflow your own `npm init playwright` generates — they're kept current there.

Key points:

- `--with-deps` installs the OS libraries browsers need on Linux. If you only test Chromium, `npx playwright install chromium --with-deps` is faster.
- The report is uploaded even when tests fail (`!cancelled()`), so you can download it and open the traces.
- Also run `npx tsc --noEmit` (and your linter) so type errors fail the build — the runner itself doesn't type-check.

## Sharding: split the suite across machines

```bash
npx playwright test --shard=1/4   # this machine runs the first quarter
```

On GitHub Actions, use a matrix to start four jobs with `--shard=${{ matrix.shardIndex }}/4`, have each one produce a **blob** report (`reporter: process.env.CI ? 'blob' : 'html'`), upload them, and merge them in a final job:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
```

> [!PITFALL] Sharding exposes hidden dependencies
> Shards run different subsets on different machines. Tests that secretly relied on another test's data, or on running in a particular order, start failing only when sharded. That's not a sharding bug — it's the [isolation problem](#/playwright/flakiness) surfacing.

## Useful CI switches

| Flag / option | Why |
| --- | --- |
| `forbidOnly: !!process.env.CI` | a committed `test.only` fails the run instead of silently skipping everything else |
| `retries: 2` on CI | identify flaky tests (look at the "flaky" label in the report) |
| `--only-changed=origin/main` | run only test files affected by changes since a git ref — great for fast PR feedback |
| `--fail-on-flaky-tests` | make flakiness a failure instead of a warning |
| `trace: 'on-first-retry'` | get a trace exactly when you need one |

=== quiz
??? The first run of a new `toHaveScreenshot()` test fails. Why?
- [ ] Screenshots need a separate install step
- [x] There's no baseline yet; Playwright writes the actual screenshot as the baseline
- [ ] The viewport is too small
- [ ] Animations weren't disabled
> Commit the generated baseline; subsequent runs compare against it.

??? Screenshot tests pass on your Mac but fail on Linux CI with small differences everywhere. Best fix?
- [ ] Raise `maxDiffPixelRatio` to 0.5
- [x] Generate baselines in the same environment as CI (e.g. the Playwright Docker image)
- [ ] Disable screenshot tests on CI
- [ ] Use `fullPage: true`
> Font rendering differs per OS. Baselines must come from the environment that compares them.

??? What does `toMatchAriaSnapshot` compare?
- [ ] Pixels of the element
- [ ] The raw HTML
- [x] The accessibility tree — roles, accessible names and hierarchy
- [ ] CSS styles
> It checks structure as assistive technology sees it, which is stable across platforms.

??? Why upload the report with `if: ${{ !cancelled() }}`?
- [ ] To save storage
- [x] So the report (with traces) is available even when tests fail
- [ ] It's required for sharding
> By default, later steps are skipped after a failure — exactly when you need the report most.

??? What does `forbidOnly: !!process.env.CI` protect against?
- [ ] Running tests in parallel on CI
- [x] A committed `test.only` that would silently skip the rest of the suite
- [ ] Tests without assertions
> With `forbidOnly`, any `.only` makes the CI run fail immediately.

=== task Write an aria snapshot test
Against [playwright.dev](https://playwright.dev):

1. Open `npx playwright codegen https://playwright.dev`, pick the "Assert snapshot" tool and click the top navigation bar.
2. Paste the generated assertion into `tests/aria.spec.ts`.
3. Trim it to only the parts you care about (e.g. the "Docs" and "API" links) and run it.
4. Change one link name in the snapshot to something wrong and run again.
--- expected
A trimmed test like:

```ts
test('top navigation structure', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page.getByRole('navigation', { name: 'Main' })).toMatchAriaSnapshot(`
    - link "Docs"
    - link "API"
  `);
});
```

passes, because matching is partial. With a wrong name (e.g. `link "Documentation"`), it fails with a YAML diff showing the expected line and the actual tree around it. (The exact navigation contents may change as the site evolves — that's what snapshot updates are for.)

=== task Put your lab on CI
1. Push `pw-lab` to a GitHub repository (with the generated `.github/workflows/playwright.yml`, or the one from this lesson).
2. Add `npx tsc --noEmit` as a step before the tests.
3. Open the Actions tab and wait for the run. Download the `playwright-report` artifact and open `index.html`.
4. Commit a `test.only` somewhere and push again.
--- expected
The first run is green, with a downloadable `playwright-report` artifact; opening it locally shows the same report you see with `show-report`.

The run with `test.only` fails immediately with a message like:

```text
Error: item focused with '.only' is not allowed due to the 'forbidOnly' option in 'playwright.config.ts'
```

— exactly the safety net you want before merging.

=== sources
- [Visual comparisons — Playwright](https://playwright.dev/docs/test-snapshots)
- [Aria snapshots — Playwright](https://playwright.dev/docs/aria-snapshots)
- [Continuous Integration — Playwright](https://playwright.dev/docs/ci)
- [Setting up CI (GitHub Actions) — Playwright](https://playwright.dev/docs/ci-intro)
- [Sharding — Playwright](https://playwright.dev/docs/test-sharding)
- [Docker — Playwright](https://playwright.dev/docs/docker)
