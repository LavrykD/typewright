---
title: Killing flaky tests
module: Mastery
description: Where flakiness really comes from — races, shared state, time, animations and environment — how to reproduce it on demand, and what retries should and shouldn't do.
level: Advanced
minutes: 40
---
## What "flaky" means

A flaky test passes and fails on the same code. It's almost never random: something in the test depends on **timing**, **order**, **shared data** or the **environment**, and that something varies between runs.

> [!NOTE] Retries are a diagnostic, not a fix
> With `retries: 2`, a test that fails and then passes is marked **flaky** in the report. That's useful information — it tells you where to look. It is not a solution: a flaky test still hides real bugs and slows everyone down.

## Reproduce it on demand first

You can't fix what you can't reproduce. Make the flake happen:

```bash
npx playwright test checkout.spec.ts --repeat-each=20          # run it 20 times
npx playwright test checkout.spec.ts --repeat-each=20 --workers=4  # …in parallel, to surface shared state
npx playwright test --fail-on-flaky-tests                       # make CI fail on flaky results
```

Add CPU pressure to mimic a slow CI machine: run with more workers than cores, or throttle with `--workers=8` on a laptop.

## The usual suspects

### 1. Races: one-shot checks and missing awaits

```ts variant="bad"
await page.getByRole('button', { name: 'Save' }).click();
const text = await page.getByRole('status').textContent();   // read once, right now
expect(text).toBe('Saved');
```

```ts variant="good"
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('status')).toHaveText('Saved');  // retries until true
```

The full story is in [Auto-waiting & assertions](#/playwright/auto-waiting-and-assertions) and [Async & errors](#/typescript/async-and-errors).

### 2. Hard waits

`waitForTimeout(1000)` is a race with a fixed bet. Replace it with the condition you actually need.

### 3. Shared state between tests

> [!PITFALL] Tests that depend on each other's data
> Test A creates "Project X", test B edits "Project X". Alone, B fails. In parallel, B runs before A. With retries, A runs twice and creates two. Every test must **create the data it needs** (ideally via the [API](#/playwright/network-and-api)) with unique names, and never rely on another test or on order.

```ts
const name = `Project ${test.info().testId}-${Date.now()}`;   // unique per test & run
```

The same applies to accounts: parallel tests mutating one user need [one account per worker](#/playwright/authentication).

### 4. Time and dates

"Due tomorrow" breaks at midnight; "3 minutes ago" depends on how fast the test ran. Control the clock:

```ts
await page.clock.setFixedTime(new Date('2026-03-01T10:00:00'));   // Date.now() is fixed
await page.goto('/tasks');
await expect(page.getByText('Due tomorrow')).toBeVisible();

// or drive timers manually:
await page.clock.install({ time: new Date('2026-03-01T10:00:00') });
await page.goto('/session');
await page.clock.fastForward('30:00');                             // skip 30 minutes
await expect(page.getByText('Session expired')).toBeVisible();
```

### 5. Animations and transitions

Actionability already waits for elements to be **stable**, but screenshots and some assertions can catch mid-animation states. For visual tests, `toHaveScreenshot` disables CSS animations by default; elsewhere assert on the final state rather than a transient one.

### 6. Environment and third parties

Slow staging, rate-limited APIs, a real payment sandbox, a cookie banner that appears for some regions. Mock what you don't own, and make the environment deterministic (seeded data, fixed locale and timezone in `use`).

## Serial mode — a last resort

```ts
test.describe.configure({ mode: 'serial' });
```

Serial mode runs a group in order and **skips the rest if one fails**. It's sometimes justified for a genuinely sequential scenario, but it usually papers over tests that should be independent. Prefer isolated tests that set up their own state.

## A flakiness triage checklist

:::steps
### Is it really flaky?
`--repeat-each=20`. If it fails every time, it's just broken.
### Does it fail alone, or only with others?
Alone with `--workers=1` vs. full suite in parallel. Only-with-others → shared state.
### Find the step
Open the trace of a failed attempt next to a passing one. What differs at the failing step?
### Classify and fix the cause
Race → web-first assertion / await. Data → per-test data. Time → `page.clock`. Third party → `page.route`.
### Prove it
`--repeat-each=50` passes. Then remove any retries you added "just for this test".
:::

=== quiz
??? A test passes on retry and the report marks it "flaky". What should you do?
- [ ] Nothing — retries handled it
- [x] Treat it as a bug: reproduce with `--repeat-each` and fix the cause
- [ ] Increase retries to 5
- [ ] Mark it `test.fixme`
> Retries reveal flakiness; they don't remove it. Flaky tests erode trust and hide real regressions.

??? A test passes alone but fails when the whole suite runs in parallel. The most likely category?
- [ ] Missing `await`
- [x] Shared state — data or accounts used by more than one test
- [ ] Wrong browser version
- [ ] Animations
> Order- and concurrency-dependent failures point at state shared between tests.

??? How do you test a "session expires after 30 minutes" message without waiting 30 minutes?
- [ ] `page.waitForTimeout(1_800_000)`
- [x] `page.clock.install()` then `page.clock.fastForward('30:00')`
- [ ] Set the test timeout to 31 minutes
- [ ] Mock `Date` in Node
> The Clock API controls time inside the page, so timers and `Date` behave as if time passed.

??? What does `test.describe.configure({ mode: 'serial' })` do when the second test fails?
- [ ] Retries only the second test
- [x] Skips the remaining tests in the group
- [ ] Runs them in parallel instead
> Serial groups run in order and stop at the first failure — which is why they hide independence problems.

=== task Make a flaky test fail on purpose, then fix it
1. Save the starter page as `tests/flaky.html`. It shows a toast after a random 0–1000 ms delay, and the toast disappears after 1.5 s.
2. Write a test that clicks "Save", waits `await page.waitForTimeout(500)`, then checks `expect(await toast.isVisible()).toBe(true)`.
3. Run it with `--repeat-each=20 --project=chromium` and count failures.
4. Fix it and run the same command again.
--- starter html
```html
<!doctype html>
<button>Save</button>
<div role="alert" hidden>Saved!</div>
<script>
  const toast = document.querySelector('[role=alert]');
  document.querySelector('button').onclick = () => setTimeout(() => {
    toast.hidden = false;
    setTimeout(() => (toast.hidden = true), 1500);
  }, Math.random() * 1000);
</script>
```
--- expected
The flaky version fails roughly half the time:

```text
  11 failed
  9 passed
```

(Your numbers will differ — that's the point.) The fixed version:

```ts
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByRole('alert')).toBeHidden();   // bonus: it also goes away
```

passes **20 out of 20**, and runs faster on average because it doesn't sleep.

=== task Freeze time
Save the starter as `tests/greeting.html`. Write a test that verifies it shows "Good morning" at 09:00 and "Good evening" at 19:00.
--- starter html
```html
<!doctype html>
<h1></h1>
<script>
  const h = new Date().getHours();
  document.querySelector('h1').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
</script>
```
--- expected
```ts
test('morning greeting', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-04T09:00:00'));
  await page.goto('file://' + path.join(__dirname, 'greeting.html'));
  await expect(page.getByRole('heading')).toHaveText('Good morning');
});

test('evening greeting', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-04T19:00:00'));
  await page.goto('file://' + path.join(__dirname, 'greeting.html'));
  await expect(page.getByRole('heading')).toHaveText('Good evening');
});
```

Both pass no matter what time you run them. Without `setFixedTime`, one of them fails depending on the hour.

=== sources
- [Retries & flaky tests — Playwright](https://playwright.dev/docs/test-retries)
- [Clock — Playwright](https://playwright.dev/docs/clock)
- [Parallelism & serial mode — Playwright](https://playwright.dev/docs/test-parallel)
- [Command line: --repeat-each, --fail-on-flaky-tests — Playwright](https://playwright.dev/docs/test-cli)
- [Best practices: test isolation — Playwright](https://playwright.dev/docs/best-practices#make-tests-as-isolated-as-possible)
