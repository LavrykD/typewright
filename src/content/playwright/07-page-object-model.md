---
title: Page Object Model, done right
module: Structuring tests
description: Encapsulate pages and components in typed classes, wire them in through fixtures, and avoid the classic POM traps — assertions in the wrong place, god objects and deep inheritance.
level: Intermediate
minutes: 30
---
## Why page objects

When ten tests all write `page.getByRole('button', { name: 'Add to cart' })`, a label change means ten edits. A **page object** puts locators and common flows for one page (or component) in one place:

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

Tests now read like the user's intent:

```ts
test('removing an item updates the total', async ({ cartPage }) => {
  await cartPage.remove('Mug');
  await expect(cartPage.item('Mug')).toHaveCount(0);
  await expect(cartPage.total).toHaveText('$12.00');
});
```

## Expose locators, not just methods

Make locators public (`readonly items: Locator`) so tests can assert on them with web-first assertions. Methods are for **multi-step flows** (`login`, `addToCart`), not one-line wrappers.

```ts variant="bad" title="a method per assertion — doesn't scale, hides the waiting"
async isTotalCorrect(expected: string) {
  return (await this.total.textContent()) === expected;   // one-shot read, no retry!
}
```

```ts variant="good" title="tests assert on exposed locators"
await expect(cartPage.total).toHaveText('$12.00');
```

> [!PITFALL] Returning booleans from page objects
> Methods like `isLoggedIn(): Promise<boolean>` read state once and lose auto-waiting — the same mistake as `isVisible()` from the [assertions lesson](#/playwright/auto-waiting-and-assertions). Expose a locator (`userMenu`) and let the test `await expect(userMenu).toBeVisible()`.

## Wire page objects in through fixtures

Instead of `new CartPage(page)` in every test, provide page objects as fixtures:

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

## Components, not just pages

Repeated UI (header, data table, date picker) deserves its own small class, scoped to a root locator:

```ts
export class DataTable {
  constructor(readonly root: Locator) {}
  row(text: string) { return this.root.getByRole('row').filter({ hasText: text }); }
  async sortBy(column: string) { await this.root.getByRole('columnheader', { name: column }).click(); }
}

// inside a page object:
this.orders = new DataTable(page.getByRole('table', { name: 'Orders' }));
```

> [!WARNING] Avoid the god object and deep inheritance
> A single `AppPage` with 80 methods, or `BasePage → LoggedInPage → AdminPage → AdminUsersPage`, becomes the hardest code in the repo to change. Keep classes small, compose components, and share setup with fixtures instead of base classes.

## Where assertions go

Opinions differ; a practical rule: **tests own the assertions about outcomes**; page objects may contain assertions that confirm a *step* worked (e.g. `login()` waiting for the dashboard heading) so later steps don't run against the wrong page.

```ts
async login(email: string, password: string) {
  await this.email.fill(email);
  await this.password.fill(password);
  await this.submit.click();
  await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
```

=== quiz
??? What should a page object expose so tests can make waiting assertions?
- [ ] Methods returning `Promise<boolean>`
- [x] `Locator` properties (or methods returning locators)
- [ ] The raw `page` only
- [ ] Element handles
> Locators let tests use web-first assertions that retry. Booleans are one-shot snapshots.

??? Which is a good page-object method?
- [ ] `clickSaveButton()` that only calls `this.save.click()`
- [x] `checkout(card)` that fills payment details, submits and waits for the confirmation
- [ ] `isSaveVisible(): Promise<boolean>`
> Methods should capture meaningful multi-step flows. One-line wrappers add indirection without value.

??? What's the recommended way to give tests ready-to-use page objects?
- [ ] Global variables set in `beforeAll`
- [x] Custom fixtures created with `test.extend`
- [ ] A singleton class
> Fixtures create a fresh page object per test, typed and lazily, with optional setup like navigation.

=== task Build a TodoMVC page object suite
In `pw-lab`, refactor your todo tests to a page object + fixture.

1. Extend your `TodoPage` with: `items`, `titles` (test id `todo-title`), `counter` (test id `todo-count`), `item(text)`, `toggle(text)`, `filter(name: 'All' | 'Active' | 'Completed')`.
2. Provide it as a `todoPage` fixture that navigates to the app.
3. Rewrite the [locator kata](#/playwright/locators) test using only the page object and `expect`.
--- hint
Typing `filter`'s parameter as a union of literal strings means a typo like `'Complete'` is a compile error — TypeScript and Playwright working together.
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

The test reads like a description of the feature, contains no locators, and passes. Writing `todoPage.filter('Complete')` gives `Argument of type '"Complete"' is not assignable to parameter of type '"All" | "Active" | "Completed"'`.

=== sources
- [Page object models — Playwright](https://playwright.dev/docs/pom)
- [Fixtures — Playwright](https://playwright.dev/docs/test-fixtures)
- [Best practices — Playwright](https://playwright.dev/docs/best-practices)
