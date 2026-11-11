---
title: Локатори, що не ламаються
module: Початок роботи
description: Список пріоритетів локаторів, getByRole у деталях, строгість, ланцюжки й фільтрація — і чому CSS-селектори та nth() роблять тести крихкими.
level: Foundations
minutes: 35
---
## Що таке локатор

**Локатор** — це *опис* того, як знайти елемент, а не сам елемент. Він лінивий: нічого не шукається, доки ви не виконаєте дію чи перевірку, і обчислюється заново щоразу. Тому локатор продовжує працювати після повторного рендерингу сторінки.

```ts
const save = page.getByRole('button', { name: 'Save' });  // поки нічого не відбувається
await save.click();                                       // знайти → дочекатися готовності → клікнути
```

## Список пріоритетів

Документація Playwright радить шукати елементи так, як їх сприймають **користувачі та допоміжні технології**. У порядку переваги:

| Локатор | Шукає за | Приклад |
| --- | --- | --- |
| `getByRole` | ARIA-роллю + доступною назвою | `getByRole('button', { name: 'Sign in' })` |
| `getByText` | видимим текстом | `getByText('Welcome, Ada')` |
| `getByLabel` | підписом (label) поля форми | `getByLabel('Password')` |
| `getByPlaceholder` | текстом placeholder | `getByPlaceholder('name@example.com')` |
| `getByAltText` | alt-текстом зображення | `getByAltText('company logo')` |
| `getByTitle` | атрибутом `title` | `getByTitle('Issues count')` |
| `getByTestId` | `data-testid` | `getByTestId('cart-total')` |
| `locator(css/xpath)` | структурою DOM | крайній випадок |

```ts variant="bad" title="прив'язано до реалізації"
page.locator('#root > div.app > form > div:nth-child(3) > button.btn-primary');
```

```ts variant="good" title="прив'язано до того, що бачить користувач"
page.getByRole('button', { name: 'Create account' });
```

Коли дизайнер перейменує клас або загорне кнопку в ще один div, перший варіант зламається, а другий — ні. А якщо зміниться *напис* на кнопці, тест *має* впасти — користувачі теж це помітять.

## `getByRole` у деталях

Ролі походять із семантики HTML (`<button>` → `button`, `<a href>` → `link`, `<h1>` → `heading`, `<input type="checkbox">` → `checkbox`) або з явних атрибутів `role="…"`.

```ts
page.getByRole('heading', { name: 'Settings', level: 1 });
page.getByRole('checkbox', { name: 'Remember me', checked: true });
page.getByRole('link', { name: /privacy/i });              // regex: без урахування регістру
page.getByRole('button', { name: 'Save', exact: true });   // не "Save draft"
```

> [!NOTE] За замовчуванням назва шукається як підрядок
> `{ name: 'Save' }` знаходить «Save», «Save draft» і «save changes» (підрядок без урахування регістру). Для точного збігу додайте `exact: true` або використайте regex для повного контролю.

## Строгість

Локатори **строгі**: дія над локатором, що знаходить більше одного елемента, кидає помилку замість того, щоб вгадувати.

```text
Error: strict mode violation: getByRole('button', { name: 'Delete' }) resolved to 3 elements
```

Це перевага — так тест не клікне не ту кнопку «Delete». Методи, розраховані на кілька елементів, звільнені від цієї вимоги: `count()`, `all()` і перевірки на кшталт `toHaveCount()` чи `toHaveText([...])` з масивом.

> [!PITFALL] Виправляти порушення строгості через `.first()` / `.nth()`
> Спокусливо дописати `.first()`. Але «перша кнопка Delete» залежить від порядку рендерингу — класичне джерело тестів, які місяцями проходять, а потім клікають не той рядок. Документація називає `first()`, `last()` і `nth()` «не рекомендованими». **Звужуйте область пошуку**: знайдіть рядок, а потім кнопку в ньому.

## Ланцюжки та фільтрація

```ts
// Область: у рядку з "Invoice #42" знайти його кнопку Delete
await page
  .getByRole('row')
  .filter({ hasText: 'Invoice #42' })
  .getByRole('button', { name: 'Delete' })
  .click();

// Фільтр за локатором нащадка
const product = page.getByRole('listitem').filter({
  has: page.getByRole('heading', { name: 'Product 2' }),
});

// Виключення
page.getByRole('listitem').filter({ hasNotText: 'Out of stock' });

// Лише видимі збіги (нове в 1.63, замінює псевдоклас :visible)
await page.getByRole('button', { name: 'Menu' }).visible().click();
```

Комбінуйте умови через `and` / `or`:

```ts
const subscribe = page.getByRole('button').and(page.getByTitle('Subscribe'));

// Або новий лист, *або* діалог, що може з'явитися першим:
await expect(newEmail.or(securityDialog).first()).toBeVisible();
```

## Test id: коли й як

Коли немає зручного «людського» способу знайти елемент (графік, бейдж статусу зі змінним текстом), додайте `data-testid` і використовуйте `getByTestId`. Це явно й стабільно — просто не перевіряє доступність. Назву атрибута можна змінити в конфігурації: `use: { testIdAttribute: 'data-qa' }`.

> [!TIP] Нехай Playwright обере сам
> Запустіть `npx playwright codegen <url>` або скористайтеся вибором локаторів в UI-режимі. Наведіть курсор на елемент — і Playwright запропонує найстійкіший локатор, зазвичай `getByRole`.

=== quiz
??? Який локатор найстійкіший для кнопки «Sign in»?
- [ ] `page.locator('.btn.btn-primary')`
- [ ] `page.locator('form button').nth(1)`
- [x] `page.getByRole('button', { name: 'Sign in' })`
- [ ] `page.locator('//*[@id="login"]/div[2]/button')`
> Роль + доступна назва відображають те, що бачать користувачі, і переживають рефакторинг розмітки.

??? `page.getByRole('button', { name: 'Save' })` — на сторінці є «Save» і «Save draft». Що станеться при `.click()`?
- [ ] Клікне «Save», бо це точний збіг
- [x] Порушення строгості — назва шукається як підрядок, тож збігаються обидві кнопки
- [ ] Клікне першу в DOM
> За замовчуванням назва — підрядок без урахування регістру. Додайте `exact: true`.

??? У таблиці в кожному рядку є кнопка Delete. Як найкраще видалити «Invoice #42»?
- [ ] `getByRole('button', { name: 'Delete' }).nth(41).click()`
- [x] `getByRole('row').filter({ hasText: 'Invoice #42' }).getByRole('button', { name: 'Delete' }).click()`
- [ ] `getByRole('button', { name: 'Delete' }).first().click()`
> Звузьте область за вмістом рядка, а потім знайдіть кнопку в ньому. Позиції змінюються; вміст — ідентифікує.

??? Коли локатор насправді обчислюється на сторінці?
- [ ] Коли його створюють через `getByRole(...)`
- [x] Щоразу, коли з ним виконують дію чи перевірку
- [ ] Один раз, під час завантаження сторінки
> Локатори ліниві й обчислюються заново при кожному використанні, тому переживають повторний рендеринг.

??? Що з цього НЕ кидає порушення строгості, коли локатор знаходить 5 елементів?
- [ ] `await locator.click()`
- [ ] `await locator.fill('x')`
- [x] `await expect(locator).toHaveCount(5)`
- [ ] `await locator.textContent()`
> Операції над кількома елементами (`count`, `all`, `toHaveCount`, `toHaveText` зі списком) розраховані на багато збігів.

=== task Вправа з локаторами на демо TodoMVC
У `pw-lab` напишіть `tests/locators.spec.ts` для [demo.playwright.dev/todomvc](https://demo.playwright.dev/todomvc). **Без CSS-селекторів і без nth()/first()**.

1. Додайте три пункти: «Buy milk», «Walk dog», «Write tests».
2. Позначте «Walk dog» виконаним, поставивши прапорець **усередині цього пункту**.
3. Клацніть на фільтр «Completed».
4. Перевірте, що видно рівно один пункт і це «Walk dog».
--- hint
Кожен пункт має test id `todo-item`. Звузьте область так: `page.getByTestId('todo-item').filter({ hasText: 'Walk dog' }).getByRole('checkbox')`. Фільтр — це посилання: `getByRole('link', { name: 'Completed' })`.
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

Тест проходить. Спробуйте замінити звужений локатор на `page.getByRole('checkbox').check()` — тест впаде з порушенням строгості й переліком знайдених прапорців. Саме такого захисту ви й хочете.

=== task Досліджуйте з інструментом вибору локаторів
1. Запустіть `npx playwright codegen https://playwright.dev`.
2. Наведіть курсор на кнопку «Get started», поле пошуку й іконку GitHub; зверніть увагу на запропоновані локатори.
3. Клацніть «Get started», скопіюйте згенерований код у новий тест і запустіть його.
--- expected
Codegen пропонує локатори на основі ролей, наприклад:

```ts
await page.getByRole('link', { name: 'Get started' }).click();
```

і записаний тест проходить при повторному запуску. Зауважте: коли доступні роль, підпис чи текст, codegen майже ніколи не генерує CSS-селекторів.

=== sources
- [Locators — Playwright](https://playwright.dev/docs/locators)
- [Best practices: use locators — Playwright](https://playwright.dev/docs/best-practices#use-locators)
- [Other locators (CSS, XPath) — Playwright](https://playwright.dev/docs/other-locators)
- [Test generator — Playwright](https://playwright.dev/docs/codegen)
- [ARIA roles — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles)
