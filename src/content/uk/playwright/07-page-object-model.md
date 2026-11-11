---
title: Page Object Model, зроблений правильно
module: Структура тестів
description: Інкапсулюйте сторінки й компоненти в типізовані класи, підключайте їх через фікстури й уникайте класичних пасток POM — перевірок не на своєму місці, «божественних» об'єктів і глибокого наслідування.
level: Intermediate
minutes: 30
---
## Навіщо page objects

Коли десять тестів пишуть `page.getByRole('button', { name: 'Add to cart' })`, зміна напису означає десять правок. **Page object** збирає локатори й типові сценарії однієї сторінки (або компонента) в одному місці:

```ts title="tests/pages/cart-page.ts"
import { expect, type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly items: Locator;
  readonly total: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.items = page.getByRole('listitem');
    this.total = page.getByTestId('cart-total');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
  }

  async goto() {
    await this.page.goto('/cart');
  }

  item(name: string): Locator {
    return this.items.filter({ hasText: name });
  }

  async remove(name: string) {
    await this.item(name).getByRole('button', { name: 'Remove' }).click();
  }
}
```

> [!WARNING] Присвоюйте локатори в конструкторі
> Не пишіть `readonly items = this.page.getByRole('listitem')` як ініціалізатор поля разом із `constructor(private page: Page)`. Поля класу виконуються до того, як конструктор присвоїть `page`, тож `this.page` дорівнює `undefined` — це помилка компіляції, а з Playwright 1.65 ще й помилка під час виконання. Деталі — в [уроці TypeScript про класи](#/typescript/classes#parameter-properties-and-why-theyre-becoming-rare).

Тепер тести читаються як намір користувача:

```ts
test('removing an item updates the total', async ({ cartPage }) => {
  await cartPage.remove('Mug');
  await expect(cartPage.item('Mug')).toHaveCount(0);
  await expect(cartPage.total).toHaveText('$12.00');
});
```

## Відкривайте локатори, а не лише методи

Робіть локатори публічними (`readonly items: Locator`), щоб тести могли перевіряти їх web-first перевірками. Методи — для **багатокрокових сценаріїв** (`login`, `addToCart`), а не для однорядкових обгорток.

```ts variant="bad" title="метод на кожну перевірку — не масштабується й ховає очікування"
async isTotalCorrect(expected: string) {
  return (await this.total.textContent()) === expected;   // одноразове читання, без повторів!
}
```

```ts variant="good" title="тести перевіряють відкриті локатори"
await expect(cartPage.total).toHaveText('$12.00');
```

> [!PITFALL] Повертати boolean з page objects
> Методи на кшталт `isLoggedIn(): Promise<boolean>` читають стан один раз і втрачають автоочікування — та сама помилка, що й `isVisible()` з [уроку про перевірки](#/playwright/auto-waiting-and-assertions). Відкрийте локатор (`userMenu`) і дайте тесту зробити `await expect(userMenu).toBeVisible()`.

## Підключайте page objects через фікстури

Замість `new CartPage(page)` у кожному тесті надавайте page objects як фікстури:

```ts title="tests/fixtures.ts"
import { test as base } from '@playwright/test';
import { CartPage } from './pages/cart-page';
import { LoginPage } from './pages/login-page';

type Pages = { cartPage: CartPage; loginPage: LoginPage };

export const test = base.extend<Pages>({
  cartPage: async ({ page }, use) => {
    const cartPage = new CartPage(page);
    await cartPage.goto();
    await use(cartPage);
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
export { expect } from '@playwright/test';
```

## Компоненти, а не лише сторінки

Повторюваний інтерфейс (шапка, таблиця даних, вибір дати) заслуговує на власний невеликий клас, прив'язаний до кореневого локатора:

```ts
export class DataTable {
  constructor(readonly root: Locator) {}
  row(text: string) { return this.root.getByRole('row').filter({ hasText: text }); }
  async sortBy(column: string) { await this.root.getByRole('columnheader', { name: column }).click(); }
}

// усередині page object:
this.orders = new DataTable(page.getByRole('table', { name: 'Orders' }));
```

> [!WARNING] Уникайте «божественного» об'єкта й глибокого наслідування
> Один `AppPage` з 80 методами або `BasePage → LoggedInPage → AdminPage → AdminUsersPage` стає найважче змінюваним кодом у репозиторії. Тримайте класи невеликими, складайте їх із компонентів, а спільне налаштування передавайте через фікстури, а не базові класи.

## Де мають бути перевірки

Думки розходяться; практичне правило: **результати перевіряють тести**; page objects можуть містити перевірки, що підтверджують успіх *кроку* (наприклад, `login()` чекає на заголовок дашборду), щоб наступні кроки не виконувалися на неправильній сторінці.

```ts
async login(email: string, password: string) {
  await this.email.fill(email);
  await this.password.fill(password);
  await this.submit.click();
  await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
```

=== quiz
??? Що має відкривати page object, щоб тести могли робити перевірки з очікуванням?
- [ ] Методи, що повертають `Promise<boolean>`
- [x] Властивості типу `Locator` (або методи, що повертають локатори)
- [ ] Лише саму `page`
- [ ] Element handles
> Локатори дають тестам змогу використовувати web-first перевірки з повторами. Boolean — це одноразові знімки.

??? Який метод page object хороший?
- [ ] `clickSaveButton()`, що лише викликає `this.save.click()`
- [x] `checkout(card)`, що заповнює платіжні дані, надсилає й чекає на підтвердження
- [ ] `isSaveVisible(): Promise<boolean>`
> Методи мають охоплювати змістовні багатокрокові сценарії. Однорядкові обгортки додають непрямості без користі.

??? Як рекомендовано давати тестам готові до використання page objects?
- [ ] Глобальні змінні, що встановлюються в `beforeAll`
- [x] Власні фікстури, створені через `test.extend`
- [ ] Клас-одинак (singleton)
> Фікстури створюють свіжий page object для кожного тесту — типізовано, ліниво й за потреби з налаштуванням, як-от навігацією.

=== task Збудуйте набір page objects для TodoMVC
У `pw-lab` переробіть свої тести todo на page object + фікстуру.

1. Розширте `TodoPage` так: `items`, `titles` (test id `todo-title`), `counter` (test id `todo-count`), `item(text)`, `toggle(text)`, `filter(name: 'All' | 'Active' | 'Completed')`.
2. Надайте його як фікстуру `todoPage`, що переходить до застосунку.
3. Перепишіть тест із [вправи з локаторами](#/playwright/locators), використовуючи лише page object і `expect`.
--- hint
Якщо типізувати параметр `filter` як об'єднання літеральних рядків, друкарська помилка на кшталт `'Complete'` стане помилкою компіляції — TypeScript і Playwright працюють разом.
--- expected
```ts
test('complete one todo', async ({ todoPage }) => {
  for (const t of ['Buy milk', 'Walk dog', 'Write tests']) await todoPage.add(t);
  await todoPage.toggle('Walk dog');
  await todoPage.filter('Completed');

  await expect(todoPage.items).toHaveCount(1);
  await expect(todoPage.titles).toHaveText(['Walk dog']);
});
```

Тест читається як опис функціональності, не містить жодного локатора й проходить. Якщо написати `todoPage.filter('Complete')`, отримаєте `Argument of type '"Complete"' is not assignable to parameter of type '"All" | "Active" | "Completed"'`.

=== sources
- [Page object models — Playwright](https://playwright.dev/docs/pom)
- [Fixtures — Playwright](https://playwright.dev/docs/test-fixtures)
- [Best practices — Playwright](https://playwright.dev/docs/best-practices)
