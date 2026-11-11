---
title: Асинхронний код і обробка помилок
module: TypeScript на практиці
description: Проміси та async/await так, як їх використовує Playwright, — «плаваючі» проміси, послідовне й паралельне виконання, типізовані помилки з unknown і типи Result.
level: Intermediate
minutes: 30
---
## Кожен виклик Playwright асинхронний

Майже все в Playwright повертає `Promise`: навігація, кліки, заповнення полів, перевірки. Один пропущений `await` — найчастіша причина заплутаних падінь тестів, тож варто точно розуміти, що роблять `async`/`await`.

```ts
async function getTitle(page: Page): Promise<string> {
  await page.goto('/');          // пауза, доки навігація не завершиться
  return page.title();           // повертати проміс з async-функції нормально — він «сплющується»
}
```

- `async`-функція **завжди** повертає `Promise`.
- `await` призупиняє функцію, доки проміс не завершиться, а потім дає вам значення (або кидає помилку).

## «Плаваючі» проміси

Проміс, який ви не очікуєте (`await`), не повертаєте й не обробляєте, «плаває». Його робота відбувається *пізніше*, а помилки губляться:

```ts variant="bad"
test('saves settings', async ({ page }) => {
  page.getByRole('button', { name: 'Save' }).click();    // без await!
  expect(page.getByText('Saved')).toBeVisible();          // без await!
});
```

Такий тест може **пройти**, нічого не зробивши: функція повертається раніше, ніж відбудеться клік, а падіння перевірки ніхто не побачить.

```ts variant="good"
test('saves settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
});
```

> [!PITFALL] Пропущений `await` перед `expect`
> Web-first перевірки на кшталт `toBeVisible()` асинхронні, бо повторюються. Без `await` тест одразу йде далі, а перевірка стає «плаваючим» промісом. Playwright може попередити про це, але надійне рішення — правило лінтера `@typescript-eslint/no-floating-promises`, яке документація Playwright прямо рекомендує.

## Послідовно чи паралельно

```ts
// Послідовно: загальний час = a + b
const user = await api.getUser();
const orders = await api.getOrders();

// Паралельно: загальний час = max(a, b)
const [user2, orders2] = await Promise.all([api.getUser(), api.getOrders()]);
```

| Комбінатор | Вирішується, коли | Відхиляється, коли |
| --- | --- | --- |
| `Promise.all` | усі виконані (масив значень) | перший відхилився |
| `Promise.allSettled` | усі завершені (масив `{status, value \| reason}`) | ніколи |
| `Promise.race` | перший завершився | перший відхилився |
| `Promise.any` | перший виконався | усі відхилені (`AggregateError`) |

> [!WARNING] Не паралельте дії на одній сторінці
> `Promise.all([page.click(a), page.click(b)])` змушує дві дії змагатися на одній сторінці. Виконуйте дії на сторінці послідовно. Паралельність — для незалежної роботи: викликів API або воркерів самого Playwright.

Важливий виняток — «спершу почни чекати, потім дій»; про нього в [уроці про мережу](#/playwright/network-and-api):

```ts
const responsePromise = page.waitForResponse('**/api/save');  // спершу починаємо слухати (без await)
await page.getByRole('button', { name: 'Save' }).click();      // потім викликаємо дію
const response = await responsePromise;                        // потім чекаємо результат
```

## Помилки мають тип `unknown`

У JavaScript кинути можна що завгодно — рядки, числа, об'єкти. Тому в режимі `strict` змінна в `catch` має тип `unknown`:

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

Невеликий помічник робить це охайним:

```ts
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
```

Playwright кидає справжні підкласи `Error` — наприклад, `errors.TimeoutError`, — тож після `import { errors } from '@playwright/test'` можна перевіряти `error instanceof errors.TimeoutError`.

## Власні помилки та типи Result

Для очікуваних невдач (валідація, «не знайдено») типізований результат часто зрозуміліший, ніж кидання помилки:

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

Це [дискриміноване об'єднання](#/typescript/narrowing): той, хто викликає, не може забути перевірку, бо `value` не існує, доки її не зроблено.

=== quiz
??? Що тут відбувається?
```ts
test('x', async ({ page }) => {
  page.getByRole('button').click();
});
```
- [ ] Тест автоматично чекає на клік
- [x] Функція тесту повертається раніше, ніж клік завершиться; будь-яка його помилка губиться
- [ ] TypeScript відмовляється це компілювати
> Без `await` проміс «плаває». За замовчуванням TypeScript не видає помилки — її ловить правило лінтера (`no-floating-promises`).

??? `await Promise.all([a(), b(), c()])` — `b()` відхиляється. Що станеться?
- [ ] Ви отримаєте результати `a` і `c` та `undefined` для `b`
- [x] `Promise.all` відхиляється з помилкою `b` (інші продовжують виконуватися, але їхні результати відкидаються)
- [ ] Він чекає на всі, а потім кидає AggregateError
> Коли потрібні всі результати попри невдачі, використовуйте `Promise.allSettled`.

??? Який тип має `e` у `catch (e)` в режимі `strict`?
- [ ] `Error`
- [ ] `any`
- [x] `unknown`
> `useUnknownInCatchVariables` (частина `strict`) робить його `unknown`, бо кинути можна будь-яке значення.

??? Навіщо запускати `page.waitForResponse(...)` **до** кліку і без `await`?
- [ ] Так швидше
- [x] Якщо спершу клікнути, відповідь може прийти раніше, ніж ви почнете слухати, і очікування завершиться тайм-аутом
- [ ] Playwright вимагає цього для всіх запитів
> Якщо спершу запустити слухача, а дочекатися його після дії, перегонів не буде.

=== task Знайдіть «плаваючі» проміси
1. Встановіть у лабораторний проєкт інструменти для правила лінтера: `npm install -D typescript@6 eslint typescript-eslint`. (typescript-eslint поки не підтримує TypeScript 7 — див. [вузьке місце в уроці 1](#/typescript/mental-model#the-checker-vs-the-emitter). Без `typescript@6` npm зупиниться з помилкою залежностей `ERESOLVE`.)
2. Створіть `eslint.config.js` зі стартовою конфігурацією.
3. Вставте другий фрагмент стартового коду в `src/floating.ts` і запустіть `npx eslint src/floating.ts`.
4. Виправте кожен рядок, про який повідомлено.
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
Після розкоментування коду в `src/floating.ts` ESLint показує дві помилки — для рядків із голими `save();` і `wait(100);`:

```text
error  Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator  @typescript-eslint/no-floating-promises
```

`void save();` (явно проігноровано) і `await save();` проходять. У проєкті Playwright ви виправили б їх, додавши `await`.

=== task Напишіть типізований помічник повторів
Напишіть `retry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T>`, який повторює асинхронну функцію, що падає, і кидає **останню** помилку.
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

Друкує:

```text
ok after 3 calls
```

Зверніть увагу на `return await fn()` — без `await` відхилення вислизнуло б з `try`, і повтору не було б. (У Playwright це вбудовано як `expect(...).toPass()` і `expect.poll()` — ви познайомитеся з ними в [уроці про перевірки](#/playwright/auto-waiting-and-assertions).)

=== sources
- [async function — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [Promise.all, allSettled, race, any — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [useUnknownInCatchVariables — TSConfig reference](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables)
- [no-floating-promises — typescript-eslint](https://typescript-eslint.io/rules/no-floating-promises/)
- [Best practices: lint your tests — Playwright](https://playwright.dev/docs/best-practices#lint-your-tests)
- [Promise — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/future-javascript/promise)
- [Async Await — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/async-await)
- [Exception Handling — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/exceptions)
- [Others: Errors and Exception Handling — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/others/)
