---
title: Налагодження та переглядач трейсів
module: Майстерність
description: Повторюваний процес для питання «чому впало?» — читання помилки, UI-режим, Inspector, трейси з CI, test.step для читабельних звітів і page.pause().
level: Intermediate
minutes: 30
---
## Почніть з повідомлення про помилку

Помилки Playwright незвично інформативні. Коли дія здається, вона друкує **журнал викликів** (call log) — на що вона чекала:

```text
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Pay now' })
    - locator resolved to <button id="pay" disabled>Pay now</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
```

Читайте знизу вгору: кнопка існує, але вона **вимкнена**. Питання вже не «чому Playwright зламався?», а «чому кнопка вимкнена?» — можливо, не заповнено обов'язкове поле.

> [!PITFALL] «Test timeout of 30000ms exceeded» — і більше нічого
> За замовчуванням у дій немає власного тайм-ауту, тож завислий клік чекає, доки не мине тайм-аут **усього тесту**. У такому разі термінал пише лише `Test timeout of 30000ms exceeded.` — без журналу викликів. Підказки нікуди не зникли: HTML-звіт і файл `error-context.md` поруч із падінням містять знімок сторінки (ви побачите `button "Pay now" [disabled]`), а трейс має повний журнал викликів. Щоб отримувати журнал одразу в терміналі, дайте діям власний ліміт: `use: { actionTimeout: 5_000 }` у конфігурації або `click({ timeout: 5_000 })` на час налагодження.

## Інструменти налагодження

| Інструмент | Коли використовувати | Як |
| --- | --- | --- |
| UI-режим | розробка чи виправлення тестів локально | `npx playwright test --ui` |
| Inspector | покрокове виконання рядок за рядком | `npx playwright test --debug` (або `file.spec.ts:42 --debug`) |
| `page.pause()` | зупинитися в точному місці й роззирнутися | додайте `await page.pause()` і запустіть headed / з `--debug` |
| Переглядач трейсів | тест упав на CI або потрібна повна шкала часу | `npx playwright show-trace trace.zip` або trace.playwright.dev |
| Розширення VS Code | точки зупинки, запуск і налагодження з поля редактора | Playwright Test for VS Code |
| HTML-звіт | огляд запуску, посилання на трейси й вкладення | `npx playwright show-report` |

## Трейси: запис усього

Трейс містить кожну дію зі знімками DOM до й після, журнали консолі, мережеві запити, вихідний код і журнал викликів. Це найближче до того, щоб побачити, як відбувається падіння на CI.

```ts title="playwright.config.ts"
use: {
  trace: 'on-first-retry',   // значення зі згенерованої конфігурації: запис, коли тест повторюється
},
```

```bash
npx playwright test --trace on          # примусово записувати трейси локально
npx playwright show-report              # клацніть на тест → «Trace»
```

> [!TIP] На CI обирайте трейси, а не відео
> Документація радить для налагодження на CI трейси замість відео та скриншотів: трейс дає змогу оглянути DOM, мережу й консоль на кожному кроці, а відео показує лише пікселі. Завантажуйте `playwright-report/` (або `test-results/`) як артефакт CI і відкривайте трейс локально або на trace.playwright.dev.

## Робіть звіти читабельними з `test.step`

Довгі тести перетворюються на стіну дій. Групуйте їх:

```ts
test('checkout', async ({ page }) => {
  await test.step('add items to cart', async () => {
    await page.goto('/shop');
    await page.getByRole('button', { name: 'Add Mug' }).click();
  });

  await test.step('pay with saved card', async () => {
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Pay now' }).click();
  });
});
```

Кроки показуються як згортувані групи в UI-режимі, HTML-звіті й трейсах. Якщо загорнути кожен метод page object у `test.step` (з `{ box: true }`, щоб помилки вказували на місце виклику), падіння читатимуться як «крок *pay with saved card* упав».

## Чекліст налагодження

:::steps
### Прочитайте журнал викликів
На що чекав Playwright і що він знайшов? (*not visible*, *not enabled*, *intercepts pointer events*, *resolved to 3 elements*…)
### Відтворіть з одним воркером
`npx playwright test failing.spec.ts --project=chromium --workers=1`. Якщо падає лише паралельно, підозрюйте спільний стан — див. [Нестабільні тести](#/playwright/flakiness).
### Відкрийте трейс
Подивіться на знімок DOM на кроці падіння. Чи є там елемент? Чи щось його закриває? Перевірте вкладку мережі на невдалі запити.
### Зупиніться й дослідіть
Додайте `await page.pause()` перед рядком, що падає, запустіть headed і випробовуйте локатори в Inspector через «Pick locator» / консоль.
### Виправляйте причину, а не симптом
Не додавайте `waitForTimeout`, `force: true` чи `.first()`, доки не зрозумієте *чому* — зазвичай вони приховують справжню проблему.
:::

> [!PITFALL] «Коли я дивлюся — працює»
> Тест, що проходить з `--headed` чи `--debug`, але падає в headless-режимі, майже завжди має проблему з **таймінгом**: спостереження (чи покрокове виконання) сповільнює роботу й дає застосунку час «устаканитися». Шукайте пропущений `await`, одноразову перевірку замість web-first перевірки або дію, що виконується раніше, ніж сторінка готова.

=== quiz
??? Клік падає за тайм-аутом, а журнал викликів каже «element is not enabled». Яке наступне питання найкорисніше?
- [ ] Чи зламався клік у Playwright?
- [x] Чому кнопка вимкнена — яку передумову не виконано?
- [ ] Чи додати `force: true`?
> Журнал викликів розповідає, що побачив Playwright. Виправте стан застосунку, через який кнопка вимкнена.

??? Тест упав на CI. Який артефакт найкраще допоможе зрозуміти чому?
- [ ] Відеозапис
- [x] Трейс (знімки DOM, мережа, консоль і журнал викликів для кожного кроку)
- [ ] Лише вивід терміналу
> Документація радить трейси для налагодження на CI — з ними можна оглянути справжній DOM на кожному кроці.

??? Що дає `test.step()`?
- [ ] Автоматичні повтори цього блоку
- [x] Іменовані згортувані групи у звітах і трейсах
- [ ] Паралельне виконання кроків
> Кроки потрібні для читабельності та звітності. Вони не змінюють виконання.

??? Тест проходить з `--debug`, але падає при звичайному запуску. Найімовірніша причина?
- [ ] Баг Playwright у headless-режимі
- [x] Проблема з таймінгом — покрокове виконання сповільнює роботу й приховує перегони
- [ ] Inspector автоматично виправляє локатори
> Повільніше виконання маскує пропущені await і одноразові перевірки. Знайдіть перегони.

=== task Налагодьте зламаний тест за трейсом
1. Збережіть стартову сторінку як `tests/pay.html`, а стартовий тест під нею — як `tests/pay.spec.ts`.
2. Запустіть його — він падає. Прочитайте помилку.
3. Запустіть з `--trace on`, відкрийте звіт, відкрийте трейс і огляньте DOM на кроці падіння.
4. Виправте **тест** (не сторінку), щоб він проходив.
--- starter html
```html
<!doctype html>
<label>Card number <input id="card"></label>
<label><input type="checkbox" id="terms"> I agree to the terms</label>
<button id="pay" disabled>Pay now</button>
<p role="status"></p>
<script>
  const sync = () => (pay.disabled = !(card.value.length >= 16 && terms.checked));
  card.oninput = sync; terms.onchange = sync;
  pay.onclick = () => (document.querySelector('[role=status]').textContent = 'Paid!');
</script>
<!--
tests/pay.spec.ts:
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('pay', async ({ page }) => {
  await page.goto('file://' + path.join(__dirname, 'pay.html'));
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('status')).toHaveText('Paid!');
});
-->
```
--- hint
Якщо термінал показує лише тайм-аут тесту, додайте `use: { actionTimeout: 5_000 }` у конфігурацію (або `{ timeout: 5_000 }` до кліку) і запустіть знову, щоб отримати журнал викликів. У трейсі подивіться на прапорець у знімку DOM.
--- expected
Без тайм-ауту дії тест падає через 30 с лише з таким повідомленням:

```text
Test timeout of 30000ms exceeded.

Error Context: test-results/pay-pay-chromium/error-context.md
```

Цей файл `error-context.md` містить знімок сторінки, що показує причину:

```yaml
- checkbox "I agree to the terms"
- button "Pay now" [disabled]
```

З `actionTimeout: 5_000` клік падає швидше й друкує журнал викликів:

```text
TimeoutError: locator.click: Timeout 5000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Pay now' })
    - locator resolved to <button id="pay" disabled>Pay now</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
```

Трейс теж показує, що прапорець умов не поставлено. Виправлення — пропущений крок:

```ts
await page.getByLabel('I agree to the terms').check();
```

З ним тест проходить. Зверніть увагу, що **не** спрацювало: `click({ force: true })` змушує клік на вимкненій кнопці «вдатися», але нічого не відбувається, і натомість падає перевірка `Paid!` — симптом перемістився, а баг залишився.

=== sources
- [Debugging tests — Playwright](https://playwright.dev/docs/debug)
- [Trace viewer — Playwright](https://playwright.dev/docs/trace-viewer)
- [UI Mode — Playwright](https://playwright.dev/docs/test-ui-mode)
- [test.step — Playwright API](https://playwright.dev/docs/api/class-test#test-step)
- [Best practices: debugging — Playwright](https://playwright.dev/docs/best-practices#debugging-tests-locally)
