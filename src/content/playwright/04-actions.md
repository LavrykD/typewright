---
title: Actions, forms, dialogs, popups & frames
module: Getting started
description: Filling forms, selecting options, keyboard and uploads — plus the event-based situations that confuse everyone: dialogs, new tabs, downloads and iframes.
level: Foundations
minutes: 30
---
## Forms

```ts
await page.getByLabel('Email').fill('ada@example.com');          // replaces the value
await page.getByLabel('Bio').pressSequentially('Hi', { delay: 50 }); // types key by key
await page.getByLabel('Remember me').check();                    // idempotent: no-op if already checked
await page.getByLabel('Country').selectOption('Ukraine');        // by value or label
await page.getByLabel('Toppings').selectOption(['ham', 'olives']);
await page.getByLabel('Avatar').setInputFiles('fixtures/avatar.png');
await page.getByRole('button', { name: 'Submit' }).click();
```

> [!TIP] `fill` vs `pressSequentially`
> `fill` sets the value in one go and fires `input` events — use it almost always. Use `pressSequentially` only when the page reacts to individual keystrokes (autocomplete, input masks).

## Keyboard and mouse

```ts
await page.getByRole('textbox').press('Enter');
await page.keyboard.press('ControlOrMeta+A');   // Cmd on macOS, Ctrl elsewhere
await page.getByText('Item 1').hover();
await page.getByText('Card').dragTo(page.getByText('Done column'));
await page.getByRole('row').filter({ hasText: 'Ada' }).click({ button: 'right' });
```

## The "start waiting, then act" pattern

Some things happen **as a result** of an action: a new tab opens, a download starts, a dialog appears. If you start waiting *after* the action, you may miss the event. The pattern is always: create the promise, act, then await:

```ts
// New tab / popup
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'Open docs' }).click();
const popup = await popupPromise;
await expect(popup).toHaveTitle(/Docs/);

// Download
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export CSV' }).click();
const download = await downloadPromise;
await download.saveAs('test-results/' + download.suggestedFilename());
```

> [!PITFALL] `await page.waitForEvent('popup')` before the click
> Awaiting first deadlocks: the test waits for a popup that can't open until the click, which never runs. Awaiting after the click races: the popup may already have opened. Store the promise **without** `await`, then act, then `await` it.

## Dialogs (`alert`, `confirm`, `prompt`)

By default Playwright **auto-dismisses** dialogs. To accept one, register a handler *before* the action that triggers it:

```ts
page.once('dialog', (dialog) => dialog.accept());
await page.getByRole('button', { name: 'Delete account' }).click();
```

```ts
page.once('dialog', async (dialog) => {
  expect(dialog.message()).toBe('Are you sure?');
  await dialog.accept();
});
```

> [!WARNING] A handler that never resolves the dialog hangs the action
> If you listen for `dialog` you must call `accept()` or `dismiss()`. Otherwise the page stays blocked and the click that opened the dialog never completes.

## Iframes

Elements inside an iframe aren't reachable from `page` directly. Enter the frame first:

```ts
const payment = page.frameLocator('iframe[title="Payment"]');
await payment.getByLabel('Card number').fill('4242 4242 4242 4242');

// or from an existing locator to the <iframe> element:
const frame = page.getByTitle('Payment').contentFrame();
await frame.getByRole('button', { name: 'Pay' }).click();
```

## Reading values (when you must)

Prefer assertions. But when you need a value to compute something:

```ts
const total = await page.getByTestId('cart-total').textContent();        // string | null
const value = await page.getByLabel('Quantity').inputValue();
const rows = await page.getByRole('row').all();                          // Locator[] — snapshot of current rows
for (const row of rows) console.log(await row.textContent());
```

> [!PITFALL] `locator.all()` doesn't wait
> `all()` returns whatever matches *right now* — an empty array if the list hasn't rendered yet. First assert something about the list (`await expect(rows).toHaveCount(5)` or `.first()).toBeVisible()`), then call `all()`.

=== quiz
??? Which is the correct way to handle a link that opens a new tab?
- [ ] `await page.waitForEvent('popup'); await link.click();`
- [x] `const p = page.waitForEvent('popup'); await link.click(); const popup = await p;`
- [ ] `await link.click(); const popup = await page.waitForEvent('popup');`
> Start listening first (without await), trigger the action, then await the promise. The other two either deadlock or race.

??? A `confirm()` dialog appears and you registered no handler. What happens?
- [ ] The test hangs forever
- [x] Playwright dismisses it automatically
- [ ] Playwright accepts it automatically
- [ ] The test fails immediately
> Dialogs are auto-dismissed by default. Register `page.once('dialog', d => d.accept())` before the action to accept.

??? You need to type into a search box that fetches suggestions on every keystroke. Which method?
- [ ] `fill()`
- [x] `pressSequentially()`
- [ ] `selectOption()`
> `fill` sets the whole value at once; `pressSequentially` sends individual key events, which per-keystroke handlers need.

??? What does `await page.getByRole('listitem').all()` return if the list hasn't rendered yet?
- [ ] It waits until at least one item appears
- [x] An empty array
- [ ] It throws a timeout error
> `all()` doesn't auto-wait. Assert on the list first, then snapshot it.

=== task Fill and submit a form
Save the starter as `tests/signup.html`. Write `tests/signup.spec.ts` that completes the whole form and checks the result.

1. Fill name and email with `getByLabel`.
2. Select "Playwright" as the track and tick the terms checkbox.
3. Submit, then assert the confirmation heading with a web-first assertion.
4. Run it with `--ui` and look at each step's before/after snapshot.
--- starter html
```html
<!doctype html>
<form>
  <label>Full name <input name="name" required></label>
  <label>Email <input name="email" type="email" required></label>
  <label>Track
    <select name="track"><option>TypeScript</option><option>Playwright</option></select>
  </label>
  <label><input type="checkbox" name="terms" required> I accept the terms</label>
  <button>Create account</button>
</form>
<script>
  document.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    setTimeout(() => {
      document.body.innerHTML = `<h1>Welcome, ${d.get('name')}!</h1><p>Track: ${d.get('track')}</p>`;
    }, 400);
  };
</script>
```
--- hint
Labels wrap their inputs here, so `getByLabel('Email')` works. For the checkbox: `getByLabel('I accept the terms').check()`.
--- expected
```ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('sign up', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'signup.html'));
  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Track').selectOption('Playwright');
  await page.getByLabel('I accept the terms').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome, Ada Lovelace!' })).toBeVisible();
  await expect(page.getByText('Track: Playwright')).toBeVisible();
});
```

It passes even though the page waits 400 ms before rendering the result: the assertion retries. In UI mode each `fill`, `selectOption`, `check` and `click` is a step you can click to see the page at that moment. Try removing the `.check()` line: the browser's built-in validation blocks submission and the heading assertion fails after 5 s.

=== task Handle a confirm dialog
Save the starter as `tests/confirm.html` and write a test that clicks Delete, accepts the dialog, and asserts the status text. Then write a second test that **dismisses** it.
--- starter html
```html
<!doctype html>
<button>Delete</button>
<p role="status">Idle</p>
<script>
  document.querySelector('button').onclick = () => {
    document.querySelector('p').textContent = confirm('Really delete?') ? 'Deleted' : 'Cancelled';
  };
</script>
```
--- expected
```ts
test('accept', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'confirm.html'));
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status')).toHaveText('Deleted');
});

test('dismiss (default behaviour)', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'confirm.html'));
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status')).toHaveText('Cancelled');
});
```

Both pass. The second needs **no handler at all** — Playwright's auto-dismiss makes `confirm()` return `false`.

=== sources
- [Actions — Playwright](https://playwright.dev/docs/input)
- [Dialogs — Playwright](https://playwright.dev/docs/dialogs)
- [Pages (new pages & popups) — Playwright](https://playwright.dev/docs/pages)
- [Downloads — Playwright](https://playwright.dev/docs/downloads)
- [Frames — Playwright](https://playwright.dev/docs/frames)
- [locator.all() — Playwright API](https://playwright.dev/docs/api/class-locator#locator-all)
