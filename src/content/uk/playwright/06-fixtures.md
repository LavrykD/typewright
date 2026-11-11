---
title: Фікстури — суперсила Playwright
module: Структура тестів
description: Що таке фікстури, як писати типізовані власні фікстури через test.extend, налаштування й прибирання навколо use(), область воркера, автоматичні фікстури й опції — і чому вони кращі за beforeEach.
level: Intermediate
minutes: 40
---
## Що таке фікстура

Фікстура — це **те, що потрібно тесту: створюється на вимогу й прибирається після нього**. Ви користувалися ними з першого тесту: `page`, `context`, `browser`, `request`, `browserName`. Тест запитує фікстури через деструктуризацію:

```ts
test('example', async ({ page, request }) => { /* … */ });
```

Playwright бачить, які фікстури ви запросили, створює лише їх і прибирає після тесту.

## Фікстури проти `beforeEach`

```ts variant="bad" title="хуки: неявні, спільні, важко перевикористати в інших файлах"
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

```ts variant="good" title="фікстура: інкапсульована, типізована, перевикористовувана, лінива"
test('adds an item', async ({ todoPage }) => {
  await todoPage.add('my item');
});
```

Фікстури тримають налаштування й прибирання **разом**, перевикористовуються в різних файлах, **створюються лише тоді, коли тест їх використовує**, і повністю типізовані.

## Написання власної фікстури

```ts title="tests/fixtures.ts"
import { test as base } from '@playwright/test';
import { TodoPage } from './pages/todo-page';

type MyFixtures = {
  todoPage: TodoPage;
};

export const test = base.extend<MyFixtures>({
  todoPage: async ({ page }, use) => {
    // ── налаштування ──
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.add('item1');

    await use(todoPage);       // ← тут виконується тест

    // ── прибирання ──
    await todoPage.removeAll();
  },
});

export { expect } from '@playwright/test';
```

```ts title="tests/todo.spec.ts"
import { test, expect } from './fixtures';   // ← імпортуйте ВАШ test, а не з @playwright/test

test('adds an item', async ({ todoPage }) => {
  await todoPage.add('my item');
  await expect(todoPage.items).toHaveCount(2);
});
```

> [!PITFALL] Імпорт `test` не звідти
> Якщо файл тестів імпортує `test` з `@playwright/test`, ваших власних фікстур там немає, і ви отримаєте заплутану помилку, що фікстуру не визначено (або помилку TypeScript, що властивості не існує). Файли тестів, які використовують власні фікстури, мають імпортувати `test` (і зазвичай `expect`) з вашого файлу фікстур.

### Правила

- Код **до** `await use(value)` — налаштування; код **після** — прибирання.
- Фікстура може залежати від інших фікстур (`todoPage` залежить від `page`): залежності налаштовуються першими, а прибираються останніми.
- Неавтоматичні фікстури **ліниві**: ті, що не використовуються, взагалі не створюються.
- Дженерик-аргумент `extend<…>` типізує фікстури; тіла тестів отримують повне автодоповнення.

## Фікстури рівня воркера

Тестові фікстури створюються для кожного тесту. Фікстури **воркера** створюються один раз на процес-воркер і спільні для всіх тестів, які він виконує, — корисно для дорогих речей, як-от створення тестового акаунта чи запуск сервісу.

```ts
type WorkerFixtures = { account: { username: string; password: string } };

export const test = base.extend<{}, WorkerFixtures>({
  account: [async ({ browser }, use, workerInfo) => {
    const username = `user${workerInfo.workerIndex}`;   // унікальний для кожного паралельного воркера
    const password = 'verysecure';
    // … один раз створити акаунт …
    await use({ username, password });
    // … видалити його, коли воркер завершує роботу …
  }, { scope: 'worker' }],
});
```

**Другий** дженерик-параметр `extend` типізує фікстури воркера.

> [!PITFALL] Фікстура воркера не може залежати від тестової фікстури
> `page` має тестову область; фікстура воркера виконується ще до того, як з'являється конкретний тест, тож використати `page` вона не може. Використайте `browser` і створіть сторінку самі (`const page = await browser.newPage()`) або зробіть свою фікстуру тестовою.

## Автоматичні фікстури

`{ auto: true }` запускає фікстуру для кожного тесту, навіть якщо її ніхто не запитував, — зручно для логування, додавання налагоджувальної інформації чи глобальних перевірок:

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

## Фікстури-опції

Опція — це фікстура зі значенням за замовчуванням, яке **конфігурація або `test.use`** можуть перевизначити для окремого проєкту:

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

## Перевизначення вбудованих фікстур

Вбудовані фікстури можна перевизначати. Наприклад, щоб кожна `page` починала з базового URL:

```ts
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },
});
```

> [!TIP] Об'єднання файлів фікстур
> Великі набори тестів часто мають кілька файлів фікстур (сторінки, API-клієнти, дані). Об'єднайте їх через `mergeTests(pagesTest, apiTest)` з `@playwright/test`.

=== quiz
??? Коли у фікстурі виконується код після `await use(value)`?
- [ ] До тесту
- [x] Після завершення тесту — це прибирання
- [ ] Лише якщо тест упав
- [ ] Ніколи; `use` завершує фікстуру
> `use` передає значення тесту й продовжує роботу, коли тест завершено.

??? Тест не деструктурує `todoPage`. Чи створюється фікстура `todoPage`?
- [ ] Так, усі фікстури виконуються для кожного тесту
- [x] Ні — неавтоматичні фікстури ліниві
- [ ] Лише в першому тесті файлу
> Створюються лише фікстури, які запитав тест (або інші його фікстури), — хіба що задано `{ auto: true }`.

??? Ваш файл тестів показує `Property 'todoPage' does not exist`. Фікстуру визначено в `fixtures.ts`. Найімовірніша причина?
- [ ] Фікстури треба зареєструвати в playwright.config.ts
- [x] Файл імпортує `test` з `@playwright/test`, а не з `./fixtures`
- [ ] Назви фікстур не можуть містити великих літер
> Власні фікстури існують на розширеному об'єкті `test`; імпортувати треба саме його.

??? Для чого другий дженерик-параметр у `base.extend<A, B>()`?
- [ ] Для фікстур-опцій
- [x] Для фікстур рівня воркера
- [ ] Для автоматичних фікстур
- [ ] Для типів повернення фікстур
> Перший параметр типізує тестові фікстури, другий — фікстури воркера.

??? Чому фікстура воркера не може використовувати `page`?
- [ ] `page` застаріла
- [x] `page` має тестову область; фікстура воркера живе довше за окремі тести
- [ ] Фікстури воркера не можуть бути асинхронними
> Області вкладені: фікстура, що живе довше, не може залежати від тієї, що живе менше. Використайте `browser.newPage()`.

=== task Перетворіть beforeEach на фікстуру
У `pw-lab`:

1. Створіть `tests/fixtures.ts`, що експортує `test` з фікстурою `todoPage`, яка відкриває TodoMVC і додає «item1» (перевикористайте клас `TodoPage` із [завдання уроку TypeScript про класи](#/typescript/classes) — покладіть його в `tests/pages/todo-page.ts`).
2. Напишіть `tests/todo-fixture.spec.ts` з двома тестами, що використовують `todoPage` і **не мають хуків**.
3. Додайте `console.log('setup')` перед `use` і `console.log('teardown')` після нього; запустіть з `--workers=1 --project=chromium --reporter=list` (репортер list друкує вивід `console.log`).
--- expected
Обидва тести проходять, а вивід показує, що налаштування й прибирання обгортають **кожен** тест:

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

Кожен тест починається рівно з одного пункту («item1»), бо кожен отримує свіжу сторінку й власний екземпляр фікстури.

=== task Валіть тести через помилки в консолі
Додайте автоматичну фікстуру `failOnConsoleErrors` з уроку до свого файлу фікстур. Потім напишіть тест, що виконує `await page.evaluate(() => console.error('boom'))`.
--- expected
Тест падає під час прибирання з різницею на кшталт:

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

Решта ваших тестів не зачеплена (вони не пишуть помилок у консоль) — і жоден із них не мусив запитувати цю фікстуру.

=== sources
- [Fixtures — Playwright](https://playwright.dev/docs/test-fixtures)
- [Built-in fixtures — Playwright](https://playwright.dev/docs/test-fixtures#built-in-fixtures)
- [Worker-scoped fixtures — Playwright](https://playwright.dev/docs/test-fixtures#worker-scoped-fixtures)
- [Fixtures options — Playwright](https://playwright.dev/docs/test-fixtures#fixtures-options)
- [mergeTests — Playwright API](https://playwright.dev/docs/api/class-test#test-merge-tests)
