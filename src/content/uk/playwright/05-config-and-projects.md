---
title: Конфігурація та проєкти
module: Структура тестів
description: Розберіть playwright.config.ts рядок за рядком — опції use, baseURL, повтори, воркери, репортери, webServer — і використовуйте проєкти, щоб запускати ті самі тести в різних браузерах, на пристроях і в середовищах.
level: Intermediate
minutes: 30
---
## Файл конфігурації

`playwright.config.ts` — це звичайний TypeScript. `defineConfig` дає автодоповнення й перевірку типів для кожної опції:

```ts title="playwright.config.ts"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,                   // паралельно навіть тести всередині одного файлу
  forbidOnly: !!process.env.CI,          // CI падає, якщо хтось закомітив test.only
  retries: process.env.CI ? 2 : 0,       // повтори лише на CI
  workers: process.env.CI ? 1 : undefined, // undefined = половина ядер процесора
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',             // записувати трейс, коли тест повторюється
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## `use`: опції для кожного тесту

Усе під `use` налаштовує контекст браузера, який отримує кожен тест:

| Опція | Ефект |
| --- | --- |
| `baseURL` | `page.goto('/login')` розв'язується відносно неї |
| `viewport`, `locale`, `timezoneId`, `colorScheme` | емуляція |
| `storageState` | почати вже автентифікованим (див. [Автентифікація](#/playwright/authentication)) |
| `trace`, `screenshot`, `video` | артефакти: `'off'`, `'on'`, `'retain-on-failure'`, `'on-first-retry'` |
| `actionTimeout`, `navigationTimeout` | ліміти для окремих дій |
| `testIdAttribute` | що шукає `getByTestId` |

`use` можна перевизначити для окремого файлу чи блоку `describe`:

```ts
test.use({ locale: 'de-DE', colorScheme: 'dark' });
```

## `baseURL`

```ts
await page.goto('/settings');   // → http://localhost:3000/settings
await expect(page).toHaveURL('/settings');
```

> [!PITFALL] `baseURL` і початкові скісні риски
> Розв'язання URL відбувається за правилами браузера. З `baseURL: 'http://localhost:3000/app/'` виклик `goto('settings')` веде на `/app/settings`, а `goto('/settings')` — на `/settings` (початкова скісна риска означає «від кореня»). Коли застосунок живе в підкаталозі, залишайте скісну риску в кінці `baseURL` і прибирайте її на початку шляхів.

## Проєкти

**Проєкт** — це іменована група тестів, що запускається з певною конфігурацією. Типові застосування:

- ті самі тести в кількох браузерах чи на пристроях (`devices['iPhone 15']`)
- різні середовища (`staging`, `production`) через різні `baseURL`
- **setup**-проєкт, від якого залежать інші проєкти (автентифікація, засівання даних)

```ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    dependencies: ['setup'],          // setup виконується першим; якщо він падає, ці тести пропускаються
  },
  {
    name: 'mobile',
    use: { ...devices['Pixel 7'] },
    testMatch: /.*mobile\.spec\.ts/,  // лише деякі тести
    dependencies: ['setup'],
  },
],
```

Один проєкт запускається командою `npx playwright test --project=mobile`.

## `webServer`: запускайте застосунок для тестів

`webServer` запускає ваш dev-сервер перед тестами й зупиняє після них. Playwright чекає, доки `url` не почне відповідати. `reuseExistingServer: !process.env.CI` дає змогу локально тримати свій сервер запущеним, тоді як CI завжди стартує новий.

> [!PITFALL] Тести падають за тайм-аутом на `goto` лише на CI
> Зазвичай там просто не запущено застосунок. Локально ви запустили його вручну, а на CI — ніхто. Додайте блок `webServer` (і переконайтеся, що `command` збирає чи запускає застосунок так, як цього очікує CI).

## Паралельність і воркери

- Файли виконуються паралельно в різних **воркерах** (окремих процесах).
- Тести *всередині* файлу виконуються по черзі в одному воркері — якщо не ввімкнено `fullyParallel: true` або `test.describe.configure({ mode: 'parallel' })`.
- `workers: 1` на CI — обережне значення зі згенерованої конфігурації; збільшуйте його (або використовуйте [шардинг](#/playwright/visual-aria-and-ci)), щойно ваші тести будуть як слід ізольовані.

## Змінні середовища

```ts
import 'dotenv/config';   // якщо ви використовуєте файл .env (npm i -D dotenv)

export default defineConfig({
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' },
});
```

=== quiz
??? З `baseURL: 'http://localhost:3000'` що відкриє `page.goto('/login')`?
- [x] `http://localhost:3000/login`
- [ ] `/login` відносно поточної сторінки
- [ ] Кине помилку — goto потребує повного URL
> Відносні URL розв'язуються відносно `baseURL`.

??? Що робить `dependencies: ['setup']` у проєкті?
- [ ] Встановлює npm-пакети перед запуском
- [x] Спершу виконує проєкт `setup`; якщо він падає, тести залежного проєкту не запускаються
- [ ] Ділить фікстури між проєктами
> Залежності проєктів — рекомендований спосіб виконувати глобальне налаштування, як-от вхід у систему чи засівання даних.

??? `retries: process.env.CI ? 2 : 0` і `trace: 'on-first-retry'` — коли трейс записується локально?
- [ ] При кожному запуску
- [ ] При кожному падінні
- [x] Ніколи, бо локально повторів немає
> Трейси записуються при першому повторі. З 0 повторів повтору не буде. Коли трейс потрібен локально, використовуйте `--trace on`.

??? Локально тести проходять, а на CI кожен падає за тайм-аутом на `page.goto`. Найімовірніша причина?
- [ ] На CI браузери не headless
- [x] На CI застосунок не запущено — додайте конфігурацію `webServer`
- [ ] На CI `fullyParallel` має бути false
> Локально застосунок запускаєте ви. `webServer` змушує запуск тестів стартувати його (і дочекатися).

=== task Налаштуйте лабораторний проєкт із проєктами та baseURL
У `pw-lab`:

1. Встановіть `use.baseURL` на `https://demo.playwright.dev/todomvc/` (зверніть увагу на скісну риску в кінці).
2. Замініть у тестах todo повний URL на `page.goto('./')`.
3. Додайте проєкт `mobile` з `devices['Pixel 7']`, що запускає лише файли, які закінчуються на `.mobile.spec.ts`, і напишіть один такий тест, який перевіряє, що поле вводу видиме.
4. Запустіть `npx playwright test --list`, щоб побачити, які тести в якому проєкті запускаються.
--- expected
`--list` друкує кожен тест із назвою проєкту на початку, наприклад:

```text
Listing tests:
  [chromium] › todo.spec.ts:3:1 › adds two todos
  [firefox] › todo.spec.ts:3:1 › adds two todos
  [webkit] › todo.spec.ts:3:1 › adds two todos
  [mobile] › todo.mobile.spec.ts:3:1 › input is visible on mobile
Total: 4 tests in 2 files
```

Якщо мобільний тест з'являється також під chromium/firefox/webkit, додайте до цих проєктів `testIgnore: /.*\.mobile\.spec\.ts/`.

=== sources
- [Test configuration — Playwright](https://playwright.dev/docs/test-configuration)
- [Test use options — Playwright](https://playwright.dev/docs/test-use-options)
- [Projects — Playwright](https://playwright.dev/docs/test-projects)
- [Web server — Playwright](https://playwright.dev/docs/test-webserver)
- [Parallelism — Playwright](https://playwright.dev/docs/test-parallel)
