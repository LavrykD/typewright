---
title: Налаштування та перший тест
module: Початок роботи
description: Встановіть Playwright Test, розберіться, що згенерувалося, запускайте тести в терміналі та в UI-режимі й прочитайте анатомію тесту — зокрема чому кожен тест отримує свіжий контекст браузера.
level: Foundations
minutes: 25
---
## Що таке Playwright

Playwright — фреймворк для end-to-end тестування вебзастосунків. **Playwright Test** — його тестовий раннер: він керує справжніми Chromium, Firefox і WebKit, автоматично чекає на сторінку, запускає тести паралельно й записує трейси, які можна переглядати покроково. Тести пишуть на TypeScript одразу «з коробки» — без додаткового налаштування.

## Встановлення

:::steps
### Створіть каркас проєкту
```bash
mkdir pw-lab && cd pw-lab
npm init playwright@latest
```
Оберіть **TypeScript**, залиште `tests` як теку, за бажанням додайте workflow для GitHub Actions і дозвольте встановити браузери.
### Подивіться, що вийшло
```text
pw-lab/
├─ playwright.config.ts     # проєкти, тайм-аути, репортери, baseURL…
├─ tests/
│  └─ example.spec.ts       # приклад тесту для playwright.dev
├─ package.json
└─ .github/workflows/playwright.yml   # якщо ви обрали CI
```
### Запустіть тести
```bash
npx playwright test               # без вікна браузера, усі браузери, паралельно
npx playwright show-report        # відкрити HTML-звіт
```
:::

## Команди на кожен день

| Команда | Що робить |
| --- | --- |
| `npx playwright test` | Запустити все |
| `npx playwright test login.spec.ts` | Запустити один файл (підходить будь-яка частина шляху) |
| `npx playwright test -g "add item"` | Запустити тести, назва яких збігається |
| `npx playwright test --project=chromium` | Запустити лише один проєкт/браузер |
| `npx playwright test --headed` | Бачити вікно браузера |
| `npx playwright test --ui` | **UI-режим**: стеження за змінами, «машина часу», вибір локаторів |
| `npx playwright test --debug` | Покроково з Inspector |
| `npx playwright codegen <url>` | Записати дії в код |

> [!TIP] Поки вчитеся — живіть в UI-режимі
> `npx playwright test --ui` показує кожен крок зі знімком DOM до й після, дає змогу перезапускати тести при збереженні файлу (режим стеження) і має інструмент вибору локаторів. Це найшвидший цикл зворотного зв'язку з можливих.

## Анатомія тесту

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

- `test` і `expect` імпортуються з `@playwright/test`.
- `{ page }` — це **фікстура**: Playwright створює її для тесту й прибирає після нього. Власні фікстури ви напишете в [уроці про фікстури](#/playwright/fixtures).
- Кожна дія та кожна перевірка — з `await` (див. [асинхронний код і помилки](#/typescript/async-and-errors)).
- `test.describe` групує тести; `beforeEach` виконується перед кожним тестом групи.

## Ізоляція: свіжий контекст браузера для кожного тесту

Кожен тест отримує власний **контекст браузера** — наче абсолютно новий профіль в режимі інкогніто: жодних cookies, localStorage чи кешу, спільних з іншими тестами. Тому тести можна безпечно запускати паралельно й у будь-якому порядку.

> [!PITFALL] Очікувати, що стан переходить між тестами
> Вхід у систему в тесті A **не** авторизує вас у тесті B. Кожен тест починає з нуля. Це не вада, а перевага: тести, що залежать один від одного, — головне джерело нестабільності. Спільне налаштування передавайте через `beforeEach`, фікстури або збережений [стан автентифікації](#/playwright/authentication) — і ніколи через порядок тестів.

## Організація тестів

```ts
test('smoke: home loads', { tag: '@smoke' }, async ({ page }) => { /* … */ });

test.skip('not ready yet', async () => {});
test.fixme('known bug #123', async () => {});
test('slow checkout', async ({ page }) => {
  test.slow();   // потроює тайм-аут для цього тесту
});
```

Тести з тегом запускайте командою `npx playwright test --grep @smoke`.

=== quiz
??? Тест A входить у систему. Тест B у тому самому файлі очікує, що користувач уже увійшов. Що станеться?
- [ ] B буде авторизований, бо тести в одному файлі мають спільний браузер
- [x] B почне без входу — кожен тест отримує свіжий ізольований контекст браузера
- [ ] Залежить від того, чи тести запускаються паралельно
> Ізоляція діє на рівні тесту. Спільний вхід робіть через setup-проєкт і `storageState`, а не через порядок тестів.

??? Що таке `{ page }` в `async ({ page }) => { … }`?
- [ ] Глобальна змінна
- [x] Вбудована фікстура, яку Playwright створює для цього тесту й прибирає після нього
- [ ] Перший аргумент будь-якого колбека JavaScript
> Фікстури передаються за назвою через деструктуризацію. `page`, `context`, `browser` і `request` вбудовані.

??? Яка команда дає «машину часу», режим стеження й вибір локаторів?
- [ ] `npx playwright test --headed`
- [x] `npx playwright test --ui`
- [ ] `npx playwright show-report`
- [ ] `npx playwright install`
> UI-режим — це інтерактивний раннер. `--headed` лише показує вікно браузера.

??? Як запустити лише тести з тегом `@smoke`?
- [ ] `npx playwright test @smoke`
- [x] `npx playwright test --grep @smoke`
- [ ] `npx playwright test --tag=smoke`
> Під час фільтрації теги вважаються частиною назви тесту; `--grep` відбирає за ними.

=== task Встановіть Playwright і запустіть приклади
1. Створіть `pw-lab` командою `npm init playwright@latest` (TypeScript, тека `tests`).
2. Запустіть `npx playwright test`.
3. Відкрийте звіт командою `npx playwright show-report` і клацніть на один із тестів.
4. Запустіть `npx playwright test --ui`, оберіть тест і пройдіться його діями на шкалі часу.
--- expected
Термінал показує, що приклади тестів проходять у кожному налаштованому браузері, і завершується підсумком на кшталт:

```text
Running 6 tests using 4 workers
  6 passed (8.2s)

To open last HTML report run:
  npx playwright show-report
```

(Точна кількість залежить від того, скільки прикладів тестів і браузерів згенерувалося, — зазвичай 2 тести × 3 браузери.) Звіт показує кожен тест для кожного браузера із зеленими позначками; усередині тесту видно його кроки. В UI-режимі наведення на крок на шкалі часу показує сторінку такою, якою вона була в той момент.

=== task Напишіть свій перший справжній тест
Додайте до `pw-lab` файл `tests/todo.spec.ts`, який на [demo.playwright.dev/todomvc](https://demo.playwright.dev/todomvc):

1. Додає два пункти: «Buy milk» і «Write tests».
2. Перевіряє, що обидві назви є в списку в правильному порядку.
3. Перевіряє, що лічильник показує «2 items left».
4. Запустіть лише цей файл у Chromium: `npx playwright test todo --project=chromium`.
--- hint
Лічильник має test id `todo-count`. `toHaveText` приймає масив, щоб порівняти список елементів по порядку.
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

Змініть `'2 items left'` на `'3 items left'` і перезапустіть: тест падає приблизно через 5 секунд (стандартний тайм-аут `expect`) з різницею `Expected: "3 items left"` / `Received: "2 items left"`.

=== sources
- [Installation — Playwright](https://playwright.dev/docs/intro)
- [Writing tests — Playwright](https://playwright.dev/docs/writing-tests)
- [Running and debugging tests — Playwright](https://playwright.dev/docs/running-tests)
- [UI Mode — Playwright](https://playwright.dev/docs/test-ui-mode)
- [Isolation — Browser contexts — Playwright](https://playwright.dev/docs/browser-contexts)
- [Annotations and tags — Playwright](https://playwright.dev/docs/test-annotations)
