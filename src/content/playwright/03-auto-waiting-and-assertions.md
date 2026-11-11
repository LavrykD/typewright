---
title: Auto-waiting & web-first assertions
module: Getting started
description: The single most important idea for stable tests — actions wait for actionability, assertions retry until they pass — and the anti-patterns (waitForTimeout, isVisible checks) that break it.
level: Foundations
minutes: 35
---
## Why you (almost) never write waits

Modern web apps render asynchronously: a button appears after a fetch, a spinner covers the form for 200 ms, an animation slides a panel in. Playwright handles this in two places:

1. **Actions auto-wait** until the element is *actionable*.
2. **Web-first assertions retry** until the expected condition is met (or a timeout).

Understand these two and most "flaky test" problems disappear.

## Actionability checks

Before an action, Playwright waits until the target passes the relevant checks:

| Action | Visible | Stable | Receives events | Enabled | Editable |
| --- | :---: | :---: | :---: | :---: | :---: |
| `click`, `dblclick`, `check`, `uncheck`, `tap` | ✓ | ✓ | ✓ | ✓ | |
| `hover`, `dragTo` | ✓ | ✓ | ✓ | | |
| `fill`, `clear` | ✓ | | | ✓ | ✓ |
| `selectOption` | ✓ | | | ✓ | |
| `press`, `focus`, `setInputFiles`, `dispatchEvent` | | | | | |

- **Visible** — non-empty bounding box and not `visibility: hidden` (note: `opacity: 0` counts as visible).
- **Stable** — same position for two animation frames (not mid-animation).
- **Receives events** — it's the topmost element at the click point; no overlay or spinner covers it.
- **Enabled** — not `disabled`, not inside a disabled `<fieldset>`, not under `aria-disabled="true"`.
- **Editable** — enabled and not `readonly`.
- Click-like actions and `fill` also wait until the element isn't inside an `inert` subtree.

If the checks don't pass within the timeout, the action fails with a log of what it was waiting for — e.g. *"element is not enabled"* or *"<div class="overlay"> intercepts pointer events"*.

> [!PITFALL] Reaching for `{ force: true }`
> When a click fails because "another element intercepts pointer events", `force: true` makes the error go away by skipping checks. But a real user couldn't click either — the overlay is real. Wait for the overlay to disappear (`await expect(spinner).toBeHidden()`) instead. Use `force` only when you understand exactly why the check is wrong for your case.

## Web-first assertions

`await expect(locator).toBeVisible()` doesn't check once — it **re-queries and re-checks** until the condition holds or the `expect` timeout (5 s by default) expires.

```ts variant="bad" title="checks once, no retry"
expect(await page.getByText('Saved').isVisible()).toBe(true);
```

```ts variant="good" title="retries until it's true"
await expect(page.getByText('Saved')).toBeVisible();
```

The first version takes a snapshot *right now*. If the toast appears 100 ms later, the test fails — sometimes. That's flakiness you wrote yourself.

The assertions you'll use most:

| Assertion | Waits until |
| --- | --- |
| `toBeVisible()` / `toBeHidden()` | element is (not) visible |
| `toHaveText(text \| regex \| array)` | text matches (full); `toContainText` for substring |
| `toHaveValue(v)` | input value matches |
| `toBeChecked()`, `toBeEnabled()`, `toBeDisabled()`, `toBeFocused()` | state matches |
| `toHaveCount(n)` | number of matches is `n` |
| `toHaveAttribute(name, value)`, `toHaveClass(…)`, `toHaveCSS(…)` | attribute/class/style matches |
| `expect(page).toHaveURL(url)` / `toHaveTitle(t)` | page URL / title matches |

> [!PITFALL] Generic matchers don't retry
> `expect(value).toBe(…)`, `toEqual`, `toContain` work on plain values you've *already* read. They run once. Only matchers on a **locator** or **page** (and `expect.poll`/`toPass`) retry. If you `await locator.textContent()` and then `expect(text).toBe('…')`, you've opted out of waiting.

## Negation and soft assertions

```ts
await expect(page.getByRole('alert')).not.toBeVisible();   // waits until it's gone
await expect.soft(page.getByTestId('total')).toHaveText('$42');  // records failure, keeps going
```

## When the thing you're waiting for isn't a locator

```ts
// Poll any async value until it matches
await expect.poll(async () => {
  const res = await page.request.get('/api/jobs/42');
  return (await res.json()).status;
}, { timeout: 30_000 }).toBe('done');

// Retry a whole block until all assertions inside pass
await expect(async () => {
  const res = await page.request.get('/api/health');
  expect(res.status()).toBe(200);
}).toPass({ timeout: 20_000 });
```

## Timeouts, in one table

| Timeout | Default | Set with |
| --- | --- | --- |
| Test (whole test incl. hooks & fixtures) | 30 s | `timeout` in config, `test.setTimeout()`, `test.slow()` |
| `expect` assertions | 5 s | `expect: { timeout }` in config, or per call `{ timeout }` |
| Actions (click, fill…) | no limit of their own (bounded by the test timeout) | `use: { actionTimeout }` |
| Navigation (`goto`) | no limit of their own | `use: { navigationTimeout }` |

> [!PITFALL] `page.waitForTimeout(3000)`
> Hard sleeps make tests slow when the app is fast and flaky when it's slow — usually both. The docs say plainly not to use it in production tests. Wait for the **condition** you actually care about: an element, a URL, a response.

=== quiz
??? Why is `expect(await locator.isVisible()).toBe(true)` worse than `await expect(locator).toBeVisible()`?
- [ ] It's slower
- [x] `isVisible()` checks once immediately; the web-first assertion retries until visible or timeout
- [ ] `isVisible()` is deprecated
- [ ] They behave the same
> Web-first assertions wait for the condition. A one-off check races the page.

??? A click fails with "<div class="spinner"> intercepts pointer events". What's the best fix?
- [ ] `click({ force: true })`
- [ ] `await page.waitForTimeout(2000)` before clicking
- [x] Wait for the spinner to go away, e.g. `await expect(spinner).toBeHidden()`, then click
- [ ] Use `dispatchEvent('click')`
> The overlay is real; a user couldn't click either. Wait for the real condition instead of bypassing checks.

??? Which of these assertions retries?
- [ ] `expect(await locator.count()).toBe(3)`
- [x] `await expect(locator).toHaveCount(3)`
- [ ] `expect(text).toContain('ok')`
> Only matchers that receive a locator or page (or use `expect.poll` / `toPass`) retry.

??? Which actionability check does `fill()` perform that `click()` does not?
- [ ] Visible
- [ ] Stable
- [x] Editable
- [ ] Receives events
> `fill` needs the element to be editable (enabled and not readonly). It doesn't need the stable / receives-events checks.

??? What's the default timeout for a web-first assertion?
- [ ] 30 seconds
- [x] 5 seconds
- [ ] No timeout
- [ ] 1 second
> `expect` defaults to 5 s; the whole test defaults to 30 s.

=== task Feel the difference between checking and asserting
Use this tiny local page that shows a message after a random delay. Save it as `tests/delayed.html`, then write two tests.
--- starter html
```html
<!doctype html>
<button id="go">Save</button>
<p id="msg" hidden>Saved!</p>
<script>
  document.getElementById('go').onclick = () =>
    setTimeout(() => (document.getElementById('msg').hidden = false), 300 + Math.random() * 700);
</script>
```
--- hint
Load it with `await page.goto('file://' + path.join(__dirname, 'delayed.html'));` (import `path` from `'node:path'`). Write test A with `expect(await page.getByText('Saved!').isVisible()).toBe(true)` and test B with `await expect(page.getByText('Saved!')).toBeVisible()`. Run them with `--repeat-each=10`.
--- expected
```bash
npx playwright test delayed --project=chromium --repeat-each=10
```

```text
  10 failed
    … test A …
  10 passed
    … test B …
```

Test A fails every time (the message isn't visible yet when `isVisible()` runs); test B passes every time because the assertion retries. Replacing A's check with `await page.waitForTimeout(500)` would make it pass *sometimes* — the textbook flaky test.

=== task Poll a value that isn't on the page
Write a test that uses `expect.poll` to wait until a counter in `localStorage` reaches 3.
--- starter html
```html
<!doctype html>
<script>
  let n = 0;
  const t = setInterval(() => { localStorage.setItem('count', String(++n)); if (n === 3) clearInterval(t); }, 400);
</script>
```
--- hint
Serve or open the page from a `file://` URL as before, then poll `page.evaluate(() => localStorage.getItem('count'))`. (Some browsers restrict localStorage on `file://`; if so, use `npx http-server tests` or Playwright's `webServer` option and an `http://localhost` URL.)
--- expected
```ts
await expect.poll(() => page.evaluate(() => localStorage.getItem('count'))).toBe('3');
```

The test passes after about 1.2 seconds. If you assert `toBe('4')` it fails after the 5-second `expect` timeout with a message showing the last polled value, `"3"`.

=== sources
- [Auto-waiting (actionability) — Playwright](https://playwright.dev/docs/actionability)
- [Assertions — Playwright](https://playwright.dev/docs/test-assertions)
- [Best practices: web-first assertions — Playwright](https://playwright.dev/docs/best-practices#use-web-first-assertions)
- [Timeouts — Playwright](https://playwright.dev/docs/test-timeouts)
- [page.waitForTimeout — Playwright API](https://playwright.dev/docs/api/class-page#page-wait-for-timeout)
