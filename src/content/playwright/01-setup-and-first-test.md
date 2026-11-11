---
title: Setup & your first test
module: Getting started
description: Install Playwright Test, understand what was generated, run tests in the terminal and in UI mode, and read the anatomy of a test — including why every test gets a fresh browser context.
level: Foundations
minutes: 25
---
## What Playwright is

Playwright is a framework for end-to-end testing of web apps. **Playwright Test** is its test runner: it drives real Chromium, Firefox and WebKit, waits for the page automatically, runs tests in parallel, and records traces you can step through. Tests are written in TypeScript out of the box — no extra config.

## Install

:::steps
### Scaffold a project
```bash
mkdir pw-lab && cd pw-lab
npm init playwright@latest
```
Choose **TypeScript**, keep `tests` as the folder, add a GitHub Actions workflow if you like, and let it install browsers.
### Look at what you got
```text
pw-lab/
├─ playwright.config.ts     # projects, timeouts, reporters, baseURL…
├─ tests/
│  └─ example.spec.ts       # a sample test against playwright.dev
├─ package.json
└─ .github/workflows/playwright.yml   # if you chose CI
```
### Run the tests
```bash
npx playwright test               # headless, all browsers, in parallel
npx playwright show-report        # open the HTML report
```
:::

## The commands you'll use daily

| Command | What it does |
| --- | --- |
| `npx playwright test` | Run everything |
| `npx playwright test login.spec.ts` | Run one file (any substring of the path matches) |
| `npx playwright test -g "add item"` | Run tests whose title matches |
| `npx playwright test --project=chromium` | Run only one project/browser |
| `npx playwright test --headed` | Watch the browser |
| `npx playwright test --ui` | **UI mode**: watch, time-travel, pick locators |
| `npx playwright test --debug` | Step through with the Inspector |
| `npx playwright codegen <url>` | Record actions into code |

> [!TIP] Live in UI mode while learning
> `npx playwright test --ui` shows every step with a DOM snapshot before and after, lets you re-run on file save (watch mode), and has a locator picker. It's the fastest feedback loop there is.

## Anatomy of a test

```ts title="tests/todo.spec.ts"
import { test, expect } from '@playwright/test';

test.describe('todo list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
  });

  test('adds an item', async ({ page }) => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Buy milk');
    await input.press('Enter');

    await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk']);
  });
});
```

- `test` and `expect` come from `@playwright/test`.
- `{ page }` is a **fixture** — Playwright creates it for the test and cleans it up after. You'll write your own in the [fixtures lesson](#/playwright/fixtures).
- Every action and assertion is `await`ed (see [async & errors](#/typescript/async-and-errors)).
- `test.describe` groups tests; `beforeEach` runs before each test in the group.

## Isolation: a fresh browser context per test

Each test gets its own **browser context** — like a brand-new incognito profile: no cookies, no localStorage, no cache shared with other tests. That's why tests can run in parallel safely and in any order.

> [!PITFALL] Expecting state to carry over between tests
> Logging in during test A does **not** log you in for test B. Every test starts from zero. This is a feature: tests that depend on each other are the #1 source of flakiness. Share setup with `beforeEach`, fixtures, or saved [authentication state](#/playwright/authentication) — never by test order.

## Organising tests

```ts
test('smoke: home loads', { tag: '@smoke' }, async ({ page }) => { /* … */ });

test.skip('not ready yet', async () => {});
test.fixme('known bug #123', async () => {});
test('slow checkout', async ({ page }) => {
  test.slow();   // triples the timeout for this test
});
```

Run tagged tests with `npx playwright test --grep @smoke`.

=== quiz
??? Test A logs in. Test B, in the same file, expects to be logged in. What happens?
- [ ] B is logged in because tests in a file share a browser
- [x] B starts logged out — every test gets a fresh, isolated browser context
- [ ] It depends on whether the tests run in parallel
> Isolation is per test. Share login with a setup project and `storageState`, not by test order.

??? What is `{ page }` in `async ({ page }) => { … }`?
- [ ] A global variable
- [x] A built-in fixture that Playwright creates for this test and tears down afterwards
- [ ] The first argument of every JavaScript callback
> Fixtures are injected by name through destructuring. `page`, `context`, `browser` and `request` are built in.

??? Which command gives you time-travel debugging, watch mode and a locator picker?
- [ ] `npx playwright test --headed`
- [x] `npx playwright test --ui`
- [ ] `npx playwright show-report`
- [ ] `npx playwright install`
> UI mode is the interactive runner. `--headed` only shows the browser.

??? How do you run only tests tagged `@smoke`?
- [ ] `npx playwright test @smoke`
- [x] `npx playwright test --grep @smoke`
- [ ] `npx playwright test --tag=smoke`
> Tags are part of the test's title for matching purposes; `--grep` filters by them.

=== task Install Playwright and run the examples
1. Create `pw-lab` with `npm init playwright@latest` (TypeScript, `tests` folder).
2. Run `npx playwright test`.
3. Open the report with `npx playwright show-report` and click into one test.
4. Run `npx playwright test --ui`, pick a test and click through its actions in the timeline.
--- expected
The terminal shows the example tests passing in every configured browser, ending with a summary like:

```text
Running 6 tests using 4 workers
  6 passed (8.2s)

To open last HTML report run:
  npx playwright show-report
```

(The exact count depends on how many example tests and browsers were generated — typically 2 tests × 3 browsers.) The report lists each test per browser with green ticks; inside a test you see its steps. In UI mode, hovering a step in the timeline shows the page as it was at that moment.

=== task Write your first real test
Add `tests/todo.spec.ts` to `pw-lab` that, on [demo.playwright.dev/todomvc](https://demo.playwright.dev/todomvc):

1. Adds two items: "Buy milk" and "Write tests".
2. Asserts both titles are listed, in order.
3. Asserts the counter shows "2 items left".
4. Run only this file in Chromium: `npx playwright test todo --project=chromium`.
--- hint
The counter has the test id `todo-count`. `toHaveText` accepts an array to compare a list of elements in order.
--- expected
```ts
import { test, expect } from '@playwright/test';

test('adds two todos', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  const input = page.getByPlaceholder('What needs to be done?');

  for (const title of ['Buy milk', 'Write tests']) {
    await input.fill(title);
    await input.press('Enter');
  }

  await expect(page.getByTestId('todo-title')).toHaveText(['Buy milk', 'Write tests']);
  await expect(page.getByTestId('todo-count')).toHaveText('2 items left');
});
```

```text
Running 1 test using 1 worker
  1 passed (1.4s)
```

Change `'2 items left'` to `'3 items left'` and re-run: the test fails after about 5 seconds (the default `expect` timeout) with a diff showing `Expected: "3 items left"` / `Received: "2 items left"`.

=== sources
- [Installation — Playwright](https://playwright.dev/docs/intro)
- [Writing tests — Playwright](https://playwright.dev/docs/writing-tests)
- [Running and debugging tests — Playwright](https://playwright.dev/docs/running-tests)
- [UI Mode — Playwright](https://playwright.dev/docs/test-ui-mode)
- [Isolation — Browser contexts — Playwright](https://playwright.dev/docs/browser-contexts)
- [Annotations and tags — Playwright](https://playwright.dev/docs/test-annotations)
