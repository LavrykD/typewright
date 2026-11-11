---
title: Fixtures — Playwright's superpower
module: Structuring tests
description: What fixtures are, how to write typed custom fixtures with test.extend, setup/teardown around use(), worker scope, automatic fixtures and options — and why they beat beforeEach.
level: Intermediate
minutes: 40
---
## What a fixture is

A fixture is **something a test needs, set up on demand and cleaned up afterwards**. You've used them since your first test: `page`, `context`, `browser`, `request`, `browserName`. A test asks for fixtures by destructuring them:

```ts
test('example', async ({ page, request }) => { /* … */ });
```

Playwright sees which fixtures you asked for, creates only those, and tears them down after the test.

## Fixtures vs. `beforeEach`

```ts variant="bad" title="hooks: implicit, shared, hard to reuse across files"
let todoPage: TodoPage;

test.beforeEach(async ({ page }) => {
  todoPage = new TodoPage(page);
  await todoPage.goto();
  await todoPage.add('item1');
});

test.afterEach(async () => {
  await todoPage.removeAll();
});
```

```ts variant="good" title="a fixture: encapsulated, typed, reusable, lazy"
test('adds an item', async ({ todoPage }) => {
  await todoPage.add('my item');
});
```

Fixtures keep setup and teardown **together**, are reusable across files, are **only created when a test uses them**, and are fully typed.

## Writing a custom fixture

```ts title="tests/fixtures.ts"
import { test as base } from '@playwright/test';
import { TodoPage } from './pages/todo-page';

type MyFixtures = {
  todoPage: TodoPage;
};

export const test = base.extend<MyFixtures>({
  todoPage: async ({ page }, use) => {
    // ── setup ──
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.add('item1');

    await use(todoPage);       // ← the test runs here

    // ── teardown ──
    await todoPage.removeAll();
  },
});

export { expect } from '@playwright/test';
```

```ts title="tests/todo.spec.ts"
import { test, expect } from './fixtures';   // ← import YOUR test, not @playwright/test

test('adds an item', async ({ todoPage }) => {
  await todoPage.add('my item');
  await expect(todoPage.items).toHaveCount(2);
});
```

> [!PITFALL] Importing `test` from the wrong place
> If a spec file imports `test` from `@playwright/test`, your custom fixtures don't exist there and you get a confusing error that the fixture isn't defined (or a TypeScript error that the property doesn't exist). Spec files that use custom fixtures must import `test` (and usually `expect`) from your fixtures file.

### The rules

- Code **before** `await use(value)` is setup; code **after** it is teardown.
- A fixture can depend on other fixtures (`todoPage` depends on `page`) — dependencies set up first and tear down last.
- Non-automatic fixtures are **lazy**: unused ones are never created.
- The generic argument to `extend<…>` types your fixtures; test bodies get full autocomplete.

## Worker-scoped fixtures

Test fixtures are created per test. **Worker** fixtures are created once per worker process and shared by all tests that worker runs — useful for expensive things like creating a test account or starting a service.

```ts
type WorkerFixtures = { account: { username: string; password: string } };

export const test = base.extend<{}, WorkerFixtures>({
  account: [async ({ browser }, use, workerInfo) => {
    const username = `user${workerInfo.workerIndex}`;   // unique per parallel worker
    const password = 'verysecure';
    // … create the account once …
    await use({ username, password });
    // … delete it when the worker shuts down …
  }, { scope: 'worker' }],
});
```

The **second** generic parameter of `extend` types worker fixtures.

> [!PITFALL] A worker fixture can't depend on a test fixture
> `page` is test-scoped; a worker fixture runs before any particular test exists, so it can't use `page`. Use `browser` and create a page yourself (`const page = await browser.newPage()`), or make your fixture test-scoped.

## Automatic fixtures

`{ auto: true }` runs a fixture for every test even if nobody asks for it — handy for logging, attaching debug info or global checks:

```ts
export const test = base.extend<{ failOnConsoleErrors: void }>({
  failOnConsoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await use();
    expect(errors, 'console errors during the test').toEqual([]);
  }, { auto: true }],
});
```

## Option fixtures

An option is a fixture with a default value that **config or `test.use`** can override per project:

```ts
export type MyOptions = { defaultItem: string };

export const test = base.extend<MyOptions & { todoPage: TodoPage }>({
  defaultItem: ['Something nice', { option: true }],
  todoPage: async ({ page, defaultItem }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.add(defaultItem);
    await use(todoPage);
  },
});
```

```ts title="playwright.config.ts"
import type { MyOptions } from './tests/fixtures';

export default defineConfig<MyOptions>({
  projects: [
    { name: 'shopping', use: { defaultItem: 'Buy milk' } },
    { name: 'wellbeing', use: { defaultItem: 'Exercise!' } },
  ],
});
```

## Overriding built-ins

You can redefine built-in fixtures. For example, make every `page` start at the base URL:

```ts
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },
});
```

> [!TIP] Merging fixture files
> Large suites often have several fixture files (pages, API clients, data). Combine them with `mergeTests(pagesTest, apiTest)` from `@playwright/test`.

=== quiz
??? In a fixture, when does the code after `await use(value)` run?
- [ ] Before the test
- [x] After the test finishes — it's the teardown
- [ ] Only if the test fails
- [ ] Never; `use` ends the fixture
> `use` hands the value to the test and resumes when the test is done.

??? A test doesn't destructure `todoPage`. Is the `todoPage` fixture created?
- [ ] Yes, all fixtures run for every test
- [x] No — non-automatic fixtures are lazy
- [ ] Only in the first test of a file
> Only fixtures the test (or its other fixtures) ask for are created, unless `{ auto: true }`.

??? Your spec says `Property 'todoPage' does not exist`. The fixture is defined in `fixtures.ts`. Likely cause?
- [ ] Fixtures must be registered in playwright.config.ts
- [x] The spec imports `test` from `@playwright/test` instead of from `./fixtures`
- [ ] Fixture names can't contain capital letters
> Custom fixtures live on the extended `test` object; you must import that one.

??? What's the second generic parameter in `base.extend<A, B>()` for?
- [ ] Option fixtures
- [x] Worker-scoped fixtures
- [ ] Automatic fixtures
- [ ] Return types of fixtures
> The first parameter types test-scoped fixtures, the second worker-scoped ones.

??? Why can't a worker-scoped fixture use `page`?
- [ ] `page` is deprecated
- [x] `page` is test-scoped; a worker fixture outlives individual tests
- [ ] Worker fixtures can't be async
> Scopes nest: a longer-lived fixture can't depend on a shorter-lived one. Use `browser.newPage()` instead.

=== task Turn a beforeEach into a fixture
In `pw-lab`:

1. Create `tests/fixtures.ts` exporting `test` with a `todoPage` fixture that opens TodoMVC and adds "item1" (reuse the `TodoPage` class from the [TypeScript classes task](#/typescript/classes) — put it in `tests/pages/todo-page.ts`).
2. Write `tests/todo-fixture.spec.ts` with two tests that use `todoPage` and **no hooks**.
3. Add a `console.log('setup')` before `use` and `console.log('teardown')` after it; run with `--workers=1 --project=chromium --reporter=list` (the list reporter prints `console.log` output).
--- expected
Both tests pass and the output shows setup/teardown wrapping **each** test:

```text
Running 2 tests using 1 worker
setup
teardown
  ✓  1 [chromium] › tests/todo-fixture.spec.ts:3:1 › starts with one item
setup
teardown
  ✓  2 [chromium] › tests/todo-fixture.spec.ts:7:1 › adds a second item
  2 passed
```

Each test starts with exactly one item ("item1"), because every test gets a fresh page and its own fixture instance.

=== task Fail tests on console errors
Add the automatic `failOnConsoleErrors` fixture from the lesson to your fixtures file. Then write a test that runs `await page.evaluate(() => console.error('boom'))`.
--- expected
The test fails during teardown with a diff like:

```text
Error: console errors during the test

expect(received).toEqual(expected)

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "boom",
+ ]
```

All your other tests are unaffected (they don't log errors) — and none of them had to ask for the fixture.

=== sources
- [Fixtures — Playwright](https://playwright.dev/docs/test-fixtures)
- [Built-in fixtures — Playwright](https://playwright.dev/docs/test-fixtures#built-in-fixtures)
- [Worker-scoped fixtures — Playwright](https://playwright.dev/docs/test-fixtures#worker-scoped-fixtures)
- [Fixtures options — Playwright](https://playwright.dev/docs/test-fixtures#fixtures-options)
- [mergeTests — Playwright API](https://playwright.dev/docs/api/class-test#test-merge-tests)
