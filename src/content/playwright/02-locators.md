---
title: Locators that don't break
module: Getting started
description: The locator priority list, getByRole in depth, strictness, chaining and filtering, and why CSS selectors and nth() make tests fragile.
level: Foundations
minutes: 35
---
## What a locator is

A **locator** is a *description* of how to find an element — not the element itself. It's lazy: nothing is searched until you act or assert, and it's re-evaluated every time. That's why a locator still works after the page re-renders.

```ts
const save = page.getByRole('button', { name: 'Save' });  // nothing happens yet
await save.click();                                       // find → wait until actionable → click
```

## The priority list

The Playwright docs recommend locating elements the way **users and assistive technology** perceive them. In order of preference:

| Locator | Finds by | Example |
| --- | --- | --- |
| `getByRole` | ARIA role + accessible name | `getByRole('button', { name: 'Sign in' })` |
| `getByText` | visible text | `getByText('Welcome, Ada')` |
| `getByLabel` | the label of a form control | `getByLabel('Password')` |
| `getByPlaceholder` | placeholder text | `getByPlaceholder('name@example.com')` |
| `getByAltText` | image alt text | `getByAltText('company logo')` |
| `getByTitle` | `title` attribute | `getByTitle('Issues count')` |
| `getByTestId` | `data-testid` | `getByTestId('cart-total')` |
| `locator(css/xpath)` | DOM structure | last resort |

```ts variant="bad" title="tied to implementation"
page.locator('#root > div.app > form > div:nth-child(3) > button.btn-primary');
```

```ts variant="good" title="tied to what the user sees"
page.getByRole('button', { name: 'Create account' });
```

When a designer renames a class or wraps the button in another div, the first breaks; the second doesn't. And if the button's *label* changes, the test *should* fail — users would notice too.

## `getByRole` in depth

Roles come from HTML semantics (`<button>` → `button`, `<a href>` → `link`, `<h1>` → `heading`, `<input type="checkbox">` → `checkbox`) or explicit `role="…"` attributes.

```ts
page.getByRole('heading', { name: 'Settings', level: 1 });
page.getByRole('checkbox', { name: 'Remember me', checked: true });
page.getByRole('link', { name: /privacy/i });              // regex: case-insensitive
page.getByRole('button', { name: 'Save', exact: true });   // not "Save draft"
```

> [!NOTE] Name matching is substring by default
> `{ name: 'Save' }` matches "Save", "Save draft" and "save changes" (case-insensitive substring). Use `exact: true` for an exact match, or a regex for full control.

## Strictness

Locators are **strict**: an action on a locator that matches more than one element throws instead of guessing.

```text
Error: strict mode violation: getByRole('button', { name: 'Delete' }) resolved to 3 elements
```

That's a feature — it stops a test from clicking the wrong "Delete". Methods meant for multiple elements are exempt: `count()`, `all()`, and assertions like `toHaveCount()` or array `toHaveText([...])`.

> [!PITFALL] Fixing strict-mode violations with `.first()` / `.nth()`
> It's tempting to append `.first()`. But "the first Delete button" depends on render order — the classic source of tests that pass for months and then click the wrong row. The docs call `first()`, `last()` and `nth()` "not recommended". **Narrow the scope instead**: find the row, then the button inside it.

## Chaining and filtering

```ts
// Scope: inside the row containing "Invoice #42", find its Delete button
await page
  .getByRole('row')
  .filter({ hasText: 'Invoice #42' })
  .getByRole('button', { name: 'Delete' })
  .click();

// Filter by a descendant locator
const product = page.getByRole('listitem').filter({
  has: page.getByRole('heading', { name: 'Product 2' }),
});

// Exclude
page.getByRole('listitem').filter({ hasNotText: 'Out of stock' });

// Only visible matches (new in 1.63, replaces the :visible pseudo-class)
await page.getByRole('button', { name: 'Menu' }).visible().click();
```

Combine conditions with `and` / `or`:

```ts
const subscribe = page.getByRole('button').and(page.getByTitle('Subscribe'));

// Either the new email *or* the dialog that may appear first:
await expect(newEmail.or(securityDialog).first()).toBeVisible();
```

## Test IDs: when and how

When there's no good user-facing handle (a chart, a status badge with changing text), add a `data-testid` and use `getByTestId`. It's explicit and stable — it just doesn't verify accessibility. You can rename the attribute in config: `use: { testIdAttribute: 'data-qa' }`.

> [!TIP] Let Playwright pick
> Run `npx playwright codegen <url>` or use the locator picker in UI mode. Hover an element and Playwright suggests the most resilient locator — usually a `getByRole`.

=== quiz
??? Which locator is the most resilient for a "Sign in" button?
- [ ] `page.locator('.btn.btn-primary')`
- [ ] `page.locator('form button').nth(1)`
- [x] `page.getByRole('button', { name: 'Sign in' })`
- [ ] `page.locator('//*[@id="login"]/div[2]/button')`
> Role + accessible name reflects what users see and survives markup refactors.

??? `page.getByRole('button', { name: 'Save' })` — the page has "Save" and "Save draft". What happens on `.click()`?
- [ ] It clicks "Save" because it's an exact match
- [x] Strict mode violation — the name match is a substring, so both buttons match
- [ ] It clicks the first one in the DOM
> Name matching is case-insensitive substring by default. Add `exact: true`.

??? A table has a Delete button in every row. What's the best way to delete "Invoice #42"?
- [ ] `getByRole('button', { name: 'Delete' }).nth(41).click()`
- [x] `getByRole('row').filter({ hasText: 'Invoice #42' }).getByRole('button', { name: 'Delete' }).click()`
- [ ] `getByRole('button', { name: 'Delete' }).first().click()`
> Scope by the row's content, then find the button inside it. Positions change; content identifies.

??? When is a locator actually evaluated against the page?
- [ ] When it's created with `getByRole(...)`
- [x] Each time you perform an action or assertion with it
- [ ] Once, when the page loads
> Locators are lazy and re-resolved on every use, so they survive re-renders.

??? Which of these does NOT throw a strict-mode violation when the locator matches 5 elements?
- [ ] `await locator.click()`
- [ ] `await locator.fill('x')`
- [x] `await expect(locator).toHaveCount(5)`
- [ ] `await locator.textContent()`
> Multi-element operations (`count`, `all`, `toHaveCount`, list `toHaveText`) are designed for many matches.

=== task Locator kata on the TodoMVC demo
In `pw-lab`, write `tests/locators.spec.ts` against [demo.playwright.dev/todomvc](https://demo.playwright.dev/todomvc). Use **no CSS selectors and no nth()/first()**.

1. Add three todos: "Buy milk", "Walk dog", "Write tests".
2. Complete "Walk dog" by checking the checkbox **inside its item**.
3. Click the "Completed" filter link.
4. Assert that exactly one item is visible and it's "Walk dog".
--- hint
Each item has the test id `todo-item`. Scope with `page.getByTestId('todo-item').filter({ hasText: 'Walk dog' }).getByRole('checkbox')`. The filter is a link: `getByRole('link', { name: 'Completed' })`.
--- expected
```ts
test('complete one todo', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  const input = page.getByPlaceholder('What needs to be done?');
  for (const t of ['Buy milk', 'Walk dog', 'Write tests']) {
    await input.fill(t);
    await input.press('Enter');
  }

  await page.getByTestId('todo-item').filter({ hasText: 'Walk dog' }).getByRole('checkbox').check();
  await page.getByRole('link', { name: 'Completed' }).click();

  await expect(page.getByTestId('todo-item')).toHaveCount(1);
  await expect(page.getByTestId('todo-title')).toHaveText(['Walk dog']);
});
```

The test passes. Try replacing the scoped locator with `page.getByRole('checkbox').check()` — it fails with a strict-mode violation listing the matching checkboxes, which is exactly the protection you want.

=== task Explore with the locator picker
1. Run `npx playwright codegen https://playwright.dev`.
2. Hover the "Get started" button, the search box and the GitHub icon; note the suggested locators.
3. Click "Get started", then copy the generated code into a new test and run it.
--- expected
Codegen suggests role-based locators such as:

```ts
await page.getByRole('link', { name: 'Get started' }).click();
```

and the recorded test passes when replayed. Notice that codegen almost never produces CSS selectors when a role, label or text is available.

=== sources
- [Locators — Playwright](https://playwright.dev/docs/locators)
- [Best practices: use locators — Playwright](https://playwright.dev/docs/best-practices#use-locators)
- [Other locators (CSS, XPath) — Playwright](https://playwright.dev/docs/other-locators)
- [Test generator — Playwright](https://playwright.dev/docs/codegen)
- [ARIA roles — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles)
