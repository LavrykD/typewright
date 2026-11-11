---
title: Автентифікація та storageState
module: Структура тестів
description: Увійдіть один раз у setup-проєкті, збережіть сесію через storageState, використовуйте її всюди — і знайте, коли потрібен окремий акаунт для кожного воркера.
level: Intermediate
minutes: 30
---
## Проблема

Кожен тест отримує [свіжий контекст браузера](#/playwright/setup-and-first-test), тож кожен тест починає без входу в систему. Входити через інтерфейс у кожному тесті повільно, і це додає точку падіння в кожен тест. Рішення: **увійти один раз, зберегти стан браузера й починати з нього кожен тест.**

## Як працює storageState

`storageState` — це JSON-файл із cookies та localStorage (і, за бажанням, IndexedDB), знятими з контексту. Завантажте його в новий контекст — і застосунок побачить наявну сесію.

```ts
await page.context().storageState({ path: 'playwright/.auth/user.json' });   // зберегти
test.use({ storageState: 'playwright/.auth/user.json' });                     // завантажити
```

## Рекомендоване налаштування: setup-проєкт

:::steps
### Додайте теку автентифікації до ігнорованих
```bash
mkdir -p playwright/.auth
echo $'\nplaywright/.auth' >> .gitignore
```
Файл містить справжні сесійні cookies — **ніколи його не комітьте**.
### Напишіть setup-тест
```ts title="tests/auth.setup.ts"
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Дочекайтеся, поки сесію справді встановлено (cookies можуть з'являтися під час редиректів)
  await page.waitForURL('/dashboard');
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
```
### Підключіть у конфігурації
```ts title="playwright.config.ts"
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```
### Пишіть тести так, наче вже увійшли
```ts
test('shows my orders', async ({ page }) => {
  await page.goto('/orders');          // уже автентифіковано
  await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible();
});
```
:::

> [!PITFALL] Збереження стану до завершення входу
> Якщо натиснути «Sign in» і одразу викликати `storageState()`, часто зберігається *порожня* сесія: cookie автентифікації приходить трохи пізніше, іноді після кількох редиректів. Завжди чекайте на ознаку успішного входу — `waitForURL` на цільову сторінку та/або елемент, видимий лише після входу, — перш ніж зберігати.

> [!TIP] Windows і PowerShell
> Команди вище розраховані на bash (macOS, Linux, Git Bash). У PowerShell: `New-Item -ItemType Directory -Force -Path playwright\.auth` і `Add-Content -Path .gitignore -Value "playwright/.auth"`.

## Як вимкнути для частини тестів

Тести самої сторінки входу мають починати без входу:

```ts
test.use({ storageState: { cookies: [], origins: [] } });

test('shows an error for a wrong password', async ({ page }) => { /* … */ });
```

## Кілька ролей

Збережіть окремий файл для кожної ролі й обирайте його для файлу чи блоку describe:

```ts
// auth.setup.ts: два setup-тести → admin.json і member.json
test.describe('admin area', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });
  test('can ban a user', async ({ page }) => { /* … */ });
});
```

## Коли одного спільного акаунта замало

> [!PITFALL] Паралельні тести б'ються за один акаунт
> Якщо тести **змінюють стан на сервері** для користувача, що увійшов, — налаштування, вміст кошика, профіль, — паралельні тести з одним спільним акаунтом заважатимуть один одному: тест A спорожнює кошик, поки тест B оформлює замовлення. Використовуйте **окремий акаунт для кожного воркера** через фікстуру рівня воркера (`workerInfo.parallelIndex` обирає акаунт), щоб паралельні тести ніколи не ділили користувача.

```ts
export const test = base.extend<{}, { workerStorageState: string }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
  workerStorageState: [async ({ browser }, use) => {
    const id = test.info().parallelIndex;
    const file = path.resolve(test.info().project.outputDir, `.auth/${id}.json`);
    if (!fs.existsSync(file)) {
      const page = await browser.newPage({ storageState: undefined });
      // … увійти як `user${id}` і дочекатися сесії …
      await page.context().storageState({ path: file });
      await page.close();
    }
    await use(file);
  }, { scope: 'worker' }],
});
```

## Швидше: автентифікація через API

Якщо у вашого застосунку є ендпоінт входу, setup може повністю обійтися без інтерфейсу:

```ts
setup('authenticate via API', async ({ request }) => {
  await request.post('/api/login', { data: { email: 'ada@example.com', password: 's3cret' } });
  await request.storageState({ path: authFile });
});
```

=== quiz
??? Що містить файл storageState?
- [ ] Пароль користувача
- [x] Cookies і localStorage (за бажанням і IndexedDB) контексту браузера
- [ ] Знімок екрана сторінки після входу
- [ ] Увесь каталог профілю браузера
> Це дані сесії, за якими застосунок розпізнає автентифікованого користувача. Поводьтеся з ними як із секретом.

??? Ваш setup зберігає storageState одразу після кліку «Sign in», а тести все одно починають без входу. Чому?
- [ ] storageState працює лише в Chromium
- [x] Cookies автентифікації ще не встановлено; перед збереженням дочекайтеся URL або елемента після входу
- [ ] Шлях до файлу має бути абсолютним
> Сценарії входу часто встановлюють cookies під час редиректів. Чекайте на доказ того, що вхід виконано.

??? Як змусити один файл тестів починати без входу, коли проєкт використовує збережений стан?
- [ ] Видалити теку `.auth` у `beforeAll`
- [x] `test.use({ storageState: { cookies: [], origins: [] } })`
- [ ] Викликати `page.context().clearCookies()` наприкінці setup
> Перевизначення `storageState` порожнім станом для цього файлу — задокументований підхід.

??? Коли варто мати окремий акаунт для кожного воркера замість спільного входу?
- [ ] Завжди
- [x] Коли тести змінюють серверний стан автентифікованого користувача й виконуються паралельно
- [ ] Коли використовується більше одного браузера
- [ ] Ніколи; storageState усе вирішує
> Спільні акаунти підходять для тестів, що лише читають. Тестам, що змінюють дані, потрібна ізоляція й на сервері.

=== task Налаштуйте одноразовий вхід
Вам потрібен застосунок із входом. Два варіанти: застосунок, який ви розробляєте (найкраще), або [the-internet.herokuapp.com/login](https://the-internet.herokuapp.com/login) — публічний сайт для практики (ім'я користувача `tomsmith`, пароль `SuperSecretPassword!` — обидва показані на самій сторінці).

1. Створіть `tests/auth.setup.ts`, що входить у систему й зберігає `playwright/.auth/user.json`. Перед збереженням дочекайтеся сторінки захищеної зони.
2. Додайте проєкт `setup`, а до проєкту браузера — `storageState` і `dependencies`.
3. Напишіть `tests/secure.spec.ts`, що відкриває одразу `/secure` і перевіряє, що посилання «Logout» видиме.
4. Запустіть `npx playwright test --project=chromium`.
--- hint
Для сайту для практики встановіть `baseURL: 'https://the-internet.herokuapp.com'`, а після кліку Login: `await page.waitForURL('/secure')`.
--- expected
Запуск показує, що спершу виконується setup-тест, а потім ваш тест:

```text
Running 2 tests using 1 worker
  ✓  1 [setup] › tests/auth.setup.ts:6:1 › authenticate
  ✓  2 [chromium] › tests/secure.spec.ts:3:1 › secure area is accessible
  2 passed
```

Файл `playwright/.auth/user.json` існує й містить масив `cookies` із сесійною cookie сайту. Тепер видаліть рядок `dependencies` і файл `user.json` та запустіть знову. Тест захищеної зони падає миттєво, ще до відкриття браузера:

```text
Error: Error reading storage state from playwright/.auth/user.json:
ENOENT: no such file or directory, open 'playwright/.auth/user.json'
```

Ось чому рядок `dependencies` важливий: він гарантує, що setup-проєкт створив файл раніше, ніж він знадобиться будь-якому тесту.

=== sources
- [Authentication — Playwright](https://playwright.dev/docs/auth)
- [Projects: dependencies — Playwright](https://playwright.dev/docs/test-projects#dependencies)
- [browserContext.storageState — Playwright API](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
- [API testing — Playwright](https://playwright.dev/docs/api-testing)
