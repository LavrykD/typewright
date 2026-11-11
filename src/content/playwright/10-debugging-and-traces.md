---
title: Debugging & the trace viewer
module: Mastery
description: A repeatable process for "why did this fail?" — reading the error, UI mode, the Inspector, traces from CI, test.step for readable reports, and page.pause().
level: Intermediate
minutes: 30
---
## Start with the error message

Playwright errors are unusually informative. When an action gives up, it prints a **call log** of what it waited for:

```text
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Pay now' })
    - locator resolved to <button id="pay" disabled>Pay now</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
```

Read it bottom-up: the button exists, but it's **disabled**. The question is no longer "why is Playwright broken?" but "why is the button disabled?" — maybe a required field wasn't filled.

> [!PITFALL] "Test timeout of 30000ms exceeded" — and nothing else
> Actions have no timeout of their own by default, so a stuck click waits until the **whole test** times out. In that case the terminal only says `Test timeout of 30000ms exceeded.` — no call log. The clues are still there: the HTML report and the `error-context.md` file next to the failure contain a snapshot of the page (you'll see `button "Pay now" [disabled]`), and the trace has the full call log. To get the call log straight in the terminal, give actions their own limit: `use: { actionTimeout: 5_000 }` in the config, or `click({ timeout: 5_000 })` while debugging.

## Your debugging tools

| Tool | Use it when | How |
| --- | --- | --- |
| UI mode | developing or fixing tests locally | `npx playwright test --ui` |
| Inspector | stepping through line by line | `npx playwright test --debug` (or `file.spec.ts:42 --debug`) |
| `page.pause()` | stopping at an exact point to poke around | add `await page.pause()` and run headed / `--debug` |
| Trace viewer | a test failed on CI, or you want the full timeline | `npx playwright show-trace trace.zip` or trace.playwright.dev |
| VS Code extension | breakpoints, run/debug from the gutter | Playwright Test for VS Code |
| HTML report | overview of a run, links to traces and attachments | `npx playwright show-report` |

## Traces: a recording of everything

A trace contains every action with DOM snapshots before/after, console logs, network requests, source code and the call log. It's the closest thing to watching a CI failure happen.

```ts title="playwright.config.ts"
use: {
  trace: 'on-first-retry',   // the generated default: recorded when a test is retried
},
```

```bash
npx playwright test --trace on          # force traces locally
npx playwright show-report              # click a test → "Trace"
```

> [!TIP] Prefer traces to videos on CI
> The docs recommend traces over videos and screenshots for CI debugging: a trace lets you inspect the DOM, network and console at every step, while a video only shows pixels. Upload `playwright-report/` (or `test-results/`) as a CI artifact and open the trace locally or at trace.playwright.dev.

## Make reports readable with `test.step`

Long tests turn into a wall of actions. Group them:

```ts
test('checkout', async ({ page }) => {
  await test.step('add items to cart', async () => {
    await page.goto('/shop');
    await page.getByRole('button', { name: 'Add Mug' }).click();
  });

  await test.step('pay with saved card', async () => {
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Pay now' }).click();
  });
});
```

Steps appear as collapsible groups in UI mode, the HTML report and traces. Inside page objects, wrapping each method in `test.step` (with `{ box: true }` to point errors at the caller) makes failures read like "step *pay with saved card* failed".

## A debugging checklist

:::steps
### Read the call log
What was Playwright waiting for, and what did it find? (*not visible*, *not enabled*, *intercepts pointer events*, *resolved to 3 elements*…)
### Reproduce with one worker
`npx playwright test failing.spec.ts --project=chromium --workers=1`. If it only fails in parallel, suspect shared state — see [Flaky tests](#/playwright/flakiness).
### Open the trace
Look at the DOM snapshot at the failing step. Is the element there? Is something covering it? Check the network tab for a failed request.
### Pause and explore
Add `await page.pause()` before the failing line, run headed, and try locators in the Inspector's "Pick locator" / console.
### Fix the cause, not the symptom
Don't add `waitForTimeout`, `force: true` or `.first()` until you know *why* — they usually hide a real problem.
:::

> [!PITFALL] "It works when I watch it"
> A test that passes with `--headed` or `--debug` but fails headless is almost always a **timing** problem: watching (or stepping) slows execution, giving the app time to settle. Look for a missing `await`, a one-shot check instead of a web-first assertion, or an action that runs before the page is ready.

=== quiz
??? A click times out and the call log says "element is not enabled". What's the most useful next question?
- [ ] Is Playwright's click broken?
- [x] Why is the button disabled — what precondition hasn't been met?
- [ ] Should I add `force: true`?
> The call log tells you what Playwright observed. Fix the app state that keeps the button disabled.

??? A test failed on CI. What's the best artifact to understand why?
- [ ] A video recording
- [x] A trace (DOM snapshots, network, console and call log for every step)
- [ ] The terminal output only
> The docs recommend traces for CI debugging — they let you inspect the actual DOM at each step.

??? What does `test.step()` give you?
- [ ] Automatic retries of that block
- [x] Named, collapsible groups in reports and traces
- [ ] Parallel execution of the steps
> Steps are for readability and reporting. They don't change execution.

??? A test passes with `--debug` but fails in a normal run. Most likely cause?
- [ ] A Playwright bug in headless mode
- [x] A timing issue — stepping slows execution and hides a race
- [ ] The Inspector fixes locators automatically
> Slower execution masks missing awaits and one-shot checks. Find the race.

=== task Debug a broken test with a trace
1. Save the starter page as `tests/pay.html` and the starter test below it as `tests/pay.spec.ts`.
2. Run it — it fails. Read the call log.
3. Run with `--trace on`, open the report, open the trace and inspect the DOM at the failing step.
4. Fix the **test** (not the page) so it passes.
--- starter html
```html
<!doctype html>
<label>Card number <input id="card"></label>
<label><input type="checkbox" id="terms"> I agree to the terms</label>
<button id="pay" disabled>Pay now</button>
<p role="status"></p>
<script>
  const sync = () => (pay.disabled = !(card.value.length >= 16 && terms.checked));
  card.oninput = sync; terms.onchange = sync;
  pay.onclick = () => (document.querySelector('[role=status]').textContent = 'Paid!');
</script>
<!--
tests/pay.spec.ts:
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('pay', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'pay.html'));
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('status')).toHaveText('Paid!');
});
-->
```
--- hint
If the terminal only shows the test timeout, add `use: { actionTimeout: 5_000 }` to your config (or `{ timeout: 5_000 }` on the click) and run again to get the call log. In the trace, look at the checkbox in the DOM snapshot.
--- expected
Without an action timeout, the test fails after 30 s with only:

```text
Test timeout of 30000ms exceeded.

Error Context: test-results/pay-pay-chromium/error-context.md
```

That `error-context.md` file contains a page snapshot showing the cause:

```yaml
- checkbox "I agree to the terms"
- button "Pay now" [disabled]
```

With `actionTimeout: 5_000`, the click fails sooner and prints the call log:

```text
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Pay now' })
    - locator resolved to <button id="pay" disabled>Pay now</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
```

The trace also shows the terms checkbox unchecked. The fix is the missing step:

```ts
await page.getByLabel('I agree to the terms').check();
```

With it, the test passes. Note what **didn't** work: `click({ force: true })` makes the click "succeed" on a disabled button, but nothing happens and the `Paid!` assertion fails instead — the symptom moved, the bug didn't.

=== sources
- [Debugging tests — Playwright](https://playwright.dev/docs/debug)
- [Trace viewer — Playwright](https://playwright.dev/docs/trace-viewer)
- [UI Mode — Playwright](https://playwright.dev/docs/test-ui-mode)
- [test.step — Playwright API](https://playwright.dev/docs/api/class-test#test-step)
- [Best practices: debugging — Playwright](https://playwright.dev/docs/best-practices#debugging-tests-locally)
