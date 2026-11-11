---
title: Дії, форми, діалоги, спливні вікна та фрейми
module: Початок роботи
description: Заповнення форм, вибір опцій, клавіатура й завантаження файлів — а також ситуації на основі подій, що плутають усіх: діалоги, нові вкладки, завантаження та iframe.
level: Foundations
minutes: 30
---
## Форми

```ts
await page.getByLabel('Email').fill('ada@example.com');          // замінює значення
await page.getByLabel('Bio').pressSequentially('Hi', { delay: 50 }); // друкує посимвольно
await page.getByLabel('Remember me').check();                    // ідемпотентно: нічого не робить, якщо вже позначено
await page.getByLabel('Country').selectOption('Ukraine');        // за значенням або підписом
await page.getByLabel('Toppings').selectOption(['ham', 'olives']);
await page.getByLabel('Avatar').setInputFiles('fixtures/avatar.png');
await page.getByRole('button', { name: 'Submit' }).click();
```

> [!TIP] `fill` проти `pressSequentially`
> `fill` встановлює значення одним махом і генерує події `input` — використовуйте його майже завжди. `pressSequentially` потрібен лише тоді, коли сторінка реагує на окремі натискання клавіш (автодоповнення, маски вводу).

## Клавіатура й миша

```ts
await page.getByRole('textbox').press('Enter');
await page.keyboard.press('ControlOrMeta+A');   // Cmd на macOS, Ctrl на інших системах
await page.getByText('Item 1').hover();
await page.getByText('Card').dragTo(page.getByText('Done column'));
await page.getByRole('row').filter({ hasText: 'Ada' }).click({ button: 'right' });
```

## Патерн «спершу почни чекати, потім дій»

Деякі речі відбуваються **внаслідок** дії: відкривається нова вкладка, починається завантаження, з'являється діалог. Якщо почати чекати *після* дії, подію можна пропустити. Патерн завжди однаковий: створіть проміс, виконайте дію, потім дочекайтеся (`await`):

```ts
// Нова вкладка / спливне вікно
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'Open docs' }).click();
const popup = await popupPromise;
await expect(popup).toHaveTitle(/Docs/);

// Завантаження файлу
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export CSV' }).click();
const download = await downloadPromise;
await download.saveAs('test-results/' + download.suggestedFilename());
```

> [!PITFALL] `await page.waitForEvent('popup')` перед кліком
> Якщо дочекатися першим, буде взаємоблокування: тест чекає на вікно, яке не може відкритися до кліку, а клік так і не виконується. Якщо чекати після кліку — перегони: вікно могло вже відкритися. Збережіть проміс **без** `await`, виконайте дію, а потім зробіть `await`.

## Діалоги (`alert`, `confirm`, `prompt`)

За замовчуванням Playwright **автоматично закриває (dismiss)** діалоги. Щоб прийняти діалог, зареєструйте обробник *до* дії, яка його викликає:

```ts
page.once('dialog', (dialog) => dialog.accept());
await page.getByRole('button', { name: 'Delete account' }).click();
```

```ts
page.once('dialog', async (dialog) => {
  expect(dialog.message()).toBe('Are you sure?');
  await dialog.accept();
});
```

> [!WARNING] Обробник, що не закриває діалог, вішає дію
> Якщо ви слухаєте `dialog`, ви мусите викликати `accept()` або `dismiss()`. Інакше сторінка залишиться заблокованою, а клік, що відкрив діалог, так і не завершиться.

## Iframe

Елементи всередині iframe недоступні безпосередньо зі `page`. Спершу увійдіть у фрейм:

```ts
const payment = page.frameLocator('iframe[title="Payment"]');
await payment.getByLabel('Card number').fill('4242 4242 4242 4242');

// або з наявного локатора елемента <iframe>:
const frame = page.getByTitle('Payment').contentFrame();
await frame.getByRole('button', { name: 'Pay' }).click();
```

## Читання значень (коли без цього ніяк)

Віддавайте перевагу перевіркам. Але коли значення потрібне для обчислень:

```ts
const total = await page.getByTestId('cart-total').textContent();        // string | null
const value = await page.getByLabel('Quantity').inputValue();
const rows = await page.getByRole('row').all();                          // Locator[] — знімок поточних рядків
for (const row of rows) console.log(await row.textContent());
```

> [!PITFALL] `locator.all()` не чекає
> `all()` повертає те, що збігається *прямо зараз*, — порожній масив, якщо список ще не відрендерився. Спершу перевірте щось про список (`await expect(rows).toHaveCount(5)` або `.first()).toBeVisible()`), а потім викликайте `all()`.

=== quiz
??? Як правильно обробити посилання, що відкриває нову вкладку?
- [ ] `await page.waitForEvent('popup'); await link.click();`
- [x] `const p = page.waitForEvent('popup'); await link.click(); const popup = await p;`
- [ ] `await link.click(); const popup = await page.waitForEvent('popup');`
> Спершу почніть слухати (без await), викличте дію, потім дочекайтеся проміса. Два інші варіанти або блокуються, або змагаються.

??? З'являється діалог `confirm()`, а обробника ви не зареєстрували. Що станеться?
- [ ] Тест зависне назавжди
- [x] Playwright автоматично його закриє (dismiss)
- [ ] Playwright автоматично його прийме
- [ ] Тест одразу впаде
> Діалоги за замовчуванням закриваються. Щоб прийняти, зареєструйте `page.once('dialog', d => d.accept())` до дії.

??? Треба ввести текст у поле пошуку, яке підвантажує підказки на кожне натискання клавіші. Який метод?
- [ ] `fill()`
- [x] `pressSequentially()`
- [ ] `selectOption()`
> `fill` встановлює все значення одразу; `pressSequentially` надсилає окремі події клавіш, яких потребують такі обробники.

??? Що поверне `await page.getByRole('listitem').all()`, якщо список ще не відрендерився?
- [ ] Чекатиме, доки з'явиться хоча б один пункт
- [x] Порожній масив
- [ ] Кине помилку тайм-ауту
> `all()` не чекає автоматично. Спершу перевірте список, потім робіть знімок.

=== task Заповніть і надішліть форму
Збережіть стартовий код як `tests/signup.html`. Напишіть `tests/signup.spec.ts`, що заповнює всю форму й перевіряє результат.

1. Заповніть ім'я та email через `getByLabel`.
2. Оберіть трек «Playwright» і поставте прапорець згоди з умовами.
3. Надішліть форму, потім перевірте заголовок підтвердження web-first перевіркою.
4. Запустіть з `--ui` і подивіться знімки до/після для кожного кроку.
--- starter html
```html
<!doctype html>
<form>
  <label>Full name <input name="name" required></label>
  <label>Email <input name="email" type="email" required></label>
  <label>Track
    <select name="track"><option>TypeScript</option><option>Playwright</option></select>
  </label>
  <label><input type="checkbox" name="terms" required> I accept the terms</label>
  <button>Create account</button>
</form>
<script>
  document.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    setTimeout(() => {
      document.body.innerHTML = `<h1>Welcome, ${d.get('name')}!</h1><p>Track: ${d.get('track')}</p>`;
    }, 400);
  };
</script>
```
--- hint
Тут підписи обгортають поля, тож `getByLabel('Email')` працює. Для прапорця: `getByLabel('I accept the terms').check()`.
--- expected
```ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('sign up', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'signup.html'));
  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Track').selectOption('Playwright');
  await page.getByLabel('I accept the terms').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome, Ada Lovelace!' })).toBeVisible();
  await expect(page.getByText('Track: Playwright')).toBeVisible();
});
```

Тест проходить, хоча сторінка чекає 400 мс перед показом результату: перевірка повторюється. В UI-режимі кожен `fill`, `selectOption`, `check` і `click` — окремий крок, на який можна клацнути, щоб побачити сторінку в той момент. Спробуйте прибрати рядок `.check()`: вбудована валідація браузера блокує надсилання, і перевірка заголовка падає через 5 с.

=== task Обробіть діалог підтвердження
Збережіть стартовий код як `tests/confirm.html` і напишіть тест, що натискає Delete, приймає діалог і перевіряє текст статусу. Потім напишіть другий тест, який діалог **закриває**.
--- starter html
```html
<!doctype html>
<button>Delete</button>
<p role="status">Idle</p>
<script>
  document.querySelector('button').onclick = () => {
    document.querySelector('p').textContent = confirm('Really delete?') ? 'Deleted' : 'Cancelled';
  };
</script>
```
--- expected
```ts
test('accept', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'confirm.html'));
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status')).toHaveText('Deleted');
});

test('dismiss (default behaviour)', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'confirm.html'));
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status')).toHaveText('Cancelled');
});
```

Обидва проходять. Другому **взагалі не потрібен обробник** — через автоматичне закриття в Playwright `confirm()` повертає `false`.

=== sources
- [Actions — Playwright](https://playwright.dev/docs/input)
- [Dialogs — Playwright](https://playwright.dev/docs/dialogs)
- [Pages (new pages & popups) — Playwright](https://playwright.dev/docs/pages)
- [Downloads — Playwright](https://playwright.dev/docs/downloads)
- [Frames — Playwright](https://playwright.dev/docs/frames)
- [locator.all() — Playwright API](https://playwright.dev/docs/api/class-locator#locator-all)
