---
title: Async code & error handling
module: Real-world TypeScript
description: Promises and async/await the way Playwright uses them — floating promises, sequential vs parallel, typed errors with unknown, and Result types.
level: Intermediate
minutes: 30
---
## Every Playwright call is async

Almost everything in Playwright returns a `Promise`: navigation, clicks, fills, assertions. Forgetting a single `await` is the most common source of confusing test failures, so it's worth being precise about what `async`/`await` do.

```ts
async function getTitle(page: Page): Promise<string> {
  await page.goto('/');          // pause here until navigation finishes
  return page.title();           // returning a promise from an async fn is fine — it's flattened
}
```

- An `async` function **always** returns a `Promise`.
- `await` pauses the function until the promise settles, then gives you the value (or throws the error).

## Floating promises

A promise you don't `await` (or `return`, or handle) is "floating". Its work happens *later*, and its errors are lost:

```ts variant="bad"
test('saves settings', async ({ page }) => {
  page.getByRole('button', { name: 'Save' }).click();    // not awaited!
  expect(page.getByText('Saved')).toBeVisible();          // not awaited!
});
```

This test can **pass** without doing anything: the function returns before the click happens, and the assertion's failure is never observed.

```ts variant="good"
test('saves settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
});
```

> [!PITFALL] Missing `await` on `expect`
> Web-first assertions like `toBeVisible()` are async because they retry. Without `await`, the test moves on immediately and the assertion becomes a floating promise. Playwright may warn about it, but the reliable fix is the `@typescript-eslint/no-floating-promises` lint rule, which the Playwright docs explicitly recommend.

## Sequential vs. parallel

```ts
// Sequential: total time = a + b
const user = await api.getUser();
const orders = await api.getOrders();

// Parallel: total time = max(a, b)
const [user2, orders2] = await Promise.all([api.getUser(), api.getOrders()]);
```

| Combinator | Resolves when | Rejects when |
| --- | --- | --- |
| `Promise.all` | all fulfil (array of values) | the first one rejects |
| `Promise.allSettled` | all settle (array of `{status, value \| reason}`) | never |
| `Promise.race` | first one settles | first one rejects |
| `Promise.any` | first one fulfils | all reject (`AggregateError`) |

> [!WARNING] Don't parallelise actions on the same page
> `Promise.all([page.click(a), page.click(b)])` makes two actions race on one page. Run page actions sequentially. Parallelism belongs to independent work — API calls, or Playwright's own workers.

The one important exception is "start waiting, then act" — covered in the [network lesson](#/playwright/network-and-api):

```ts
const responsePromise = page.waitForResponse('**/api/save');  // start listening first (no await)
await page.getByRole('button', { name: 'Save' }).click();      // then trigger it
const response = await responsePromise;                        // then await the result
```

## Errors are `unknown`

Anything can be thrown in JavaScript — strings, numbers, objects. So under `strict`, the variable in `catch` is `unknown`:

```ts
try {
  await page.goto(url);
} catch (error) {
  console.log(error.message);              // ✗ 'error' is of type 'unknown'.

  if (error instanceof Error) {
    console.log(error.message);            // ✓
  }
}
```

A small helper keeps this tidy:

```ts
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

Playwright throws real `Error` subclasses — for example `errors.TimeoutError` — so you can check `error instanceof errors.TimeoutError` after `import { errors } from '@playwright/test'`.

## Custom errors and Result types

For expected failures (validation, "not found"), a typed result is often clearer than throwing:

```ts
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parsePort(raw: string): Result<number> {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 65536
    ? { ok: true, value: n }
    : { ok: false, error: `Invalid port: ${raw}` };
}

const port = parsePort(process.env.PORT ?? '3000');
if (!port.ok) throw new Error(port.error);
port.value;   // number
```

It's a [discriminated union](#/typescript/narrowing) — the caller can't forget to check, because `value` doesn't exist until they do.

=== quiz
??? What happens here?
```ts
test('x', async ({ page }) => {
  page.getByRole('button').click();
});
```
- [ ] The test waits for the click automatically
- [x] The test function returns before the click finishes; any error from it is lost
- [ ] TypeScript refuses to compile it
> Without `await`, the promise floats. TypeScript doesn't error by default — a lint rule (`no-floating-promises`) catches it.

??? `await Promise.all([a(), b(), c()])` — `b()` rejects. What happens?
- [ ] You get results for `a` and `c`, and `undefined` for `b`
- [x] `Promise.all` rejects with `b`'s error (the others keep running, but their results are discarded)
- [ ] It waits for all, then throws an AggregateError
> Use `Promise.allSettled` when you need every outcome regardless of failures.

??? What's the type of `e` in `catch (e)` under `strict`?
- [ ] `Error`
- [ ] `any`
- [x] `unknown`
> `useUnknownInCatchVariables` (part of `strict`) makes it `unknown`, because any value can be thrown.

??? Why start `page.waitForResponse(...)` **before** clicking, without awaiting it?
- [ ] It's faster
- [x] If you click first, the response may arrive before you start listening, and the wait times out
- [ ] Playwright requires it for all requests
> Starting the listener first and awaiting it after the action avoids the race.

=== task Find the floating promises
1. Install the lint rule's toolchain in your lab: `npm install -D eslint typescript-eslint`.
2. Create `eslint.config.js` with the starter config.
3. Paste the second starter snippet into `src/floating.ts` and run `npx eslint src/floating.ts`.
4. Fix every reported line.
--- starter js
```js
// eslint.config.js
import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['**/*.ts'],
  extends: [tseslint.configs.base],
  languageOptions: { parserOptions: { projectService: true } },
  rules: { '@typescript-eslint/no-floating-promises': 'error' },
});

// src/floating.ts
// const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// async function save() { await wait(10); return 'saved'; }
// save();
// wait(100);
// void save();
// await save();
```
--- expected
After un-commenting the code in `src/floating.ts`, ESLint reports two errors — the bare `save();` and `wait(100);` lines:

```text
error  Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator  @typescript-eslint/no-floating-promises
```

`void save();` (explicitly ignored) and `await save();` pass. In a Playwright project you'd fix them by adding `await`.

=== task Write a typed retry helper
Write `retry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T>` that retries a failing async function and rethrows the **last** error.
--- starter ts
```ts
let calls = 0;
async function flaky(): Promise<string> {
  calls++;
  if (calls < 3) throw new Error(`fail #${calls}`);
  return 'ok';
}

// export async function retry<T>(...)

console.log(await retry(flaky, 5, 50), 'after', calls, 'calls');
```
--- expected
```ts
export async function retry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
```

Prints:

```text
ok after 3 calls
```

Note `return await fn()` — without `await`, a rejection would escape the `try` and skip the retry. (Playwright has this built in as `expect(...).toPass()` and `expect.poll()` — you'll meet them in the [assertions lesson](#/playwright/auto-waiting-and-assertions).)

=== sources
- [async function — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [Promise.all, allSettled, race, any — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [useUnknownInCatchVariables — TSConfig reference](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables)
- [no-floating-promises — typescript-eslint](https://typescript-eslint.io/rules/no-floating-promises/)
- [Best practices: lint your tests — Playwright](https://playwright.dev/docs/best-practices#lint-your-tests)
