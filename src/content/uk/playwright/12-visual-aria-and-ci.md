---
title: Візуальні тести, aria-знімки та CI
module: Майстерність
description: Порівняння скриншотів, що не топлять вас у хибних падіннях, aria-знімки для перевірки структури та запуск набору тестів у GitHub Actions із шардингом і об'єднаними звітами.
level: Advanced
minutes: 40
---
## Візуальні порівняння

`toHaveScreenshot()` порівнює сторінку (або елемент) зі збереженим еталонним зображенням:

```ts
test('pricing page looks right', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page).toHaveScreenshot();                               // уся видима область
  await expect(page.getByRole('table')).toHaveScreenshot('plans.png'); // один елемент
});
```

**Перший запуск падає навмисно** — еталона ще немає — і записує фактичний скриншот як новий еталон. Закомітьте його; наступні запуски порівнюватимуть з ним. Після навмисної зміни інтерфейсу оновіть еталони командою:

```bash
npx playwright test --update-snapshots
```

> [!PITFALL] Еталони окремі для кожної ОС і браузера
> Шрифти й згладжування відрізняються в macOS, Windows і Linux, тож файли еталонів мають назви з платформою — наприклад, `pricing-page-looks-right-1-chromium-darwin.png`. Еталони з вашого Mac не збігатимуться з Linux на CI. Створюйте й оновлюйте їх **у тому самому середовищі, що й CI** (наприклад, в офіційному Docker-образі Playwright) і комітьте саме їх.

### Як зробити скриншоти стабільними

```ts
await expect(page).toHaveScreenshot({
  mask: [page.getByTestId('timestamp'), page.getByRole('img', { name: 'Avatar' })], // сховати динамічні частини
  maxDiffPixelRatio: 0.01,       // допускати крихітні відмінності
  fullPage: true,
});
```

Під час скриншотів CSS-анімації за замовчуванням вимкнено, а Playwright чекає на два однакові скриншоти поспіль, перш ніж порівнювати. Зафіксуйте час через [`page.clock`](#/playwright/flakiness), а дані — через [підміни](#/playwright/network-and-api), щоб отримати повністю детерміновані зображення.

## Aria-знімки: перевіряйте структуру, а не пікселі

Aria-знімок — це YAML-опис **дерева доступності**: ролі, назви й ієрархія. Він ловить структурні регресії (зниклий заголовок, перейменована кнопка) і не зважає на кольори чи шрифти:

```ts
await expect(page.getByRole('navigation')).toMatchAriaSnapshot(`
  - navigation:
    - link "Home"
    - link "Pricing"
    - link "Docs"
    - button "Sign in"
`);
```

- Збіг за замовчуванням **частковий**: перелічіть важливе, решту пропустіть.
- Назви приймають регулярні вирази: `- heading /Welcome, .+/ [level=1]`.
- Згенеруйте відправну точку інструментом «Assert snapshot» у codegen чи UI-режимі або дозвольте `--update-snapshots` заповнити знімки за вас.

> [!TIP] Що коли?
> **Aria-знімки** — для структури й вмісту сторінки: швидкі, читабельні, однакові на всіх платформах. **Скриншоти** — лише там, де продуктом є саме візуал (графіки, компоненти дизайн-системи, маркетингові сторінки).

## Запуск на CI

`npm init playwright` може згенерувати workflow для GitHub Actions. Його ключові кроки:

```yaml title=".github/workflows/playwright.yml"
name: Playwright Tests
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: lts/* }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

> [!NOTE] Версії actions
> Використовуйте версії actions з workflow, який згенерував ваш власний `npm init playwright`, — там вони актуальні.

Головне:

- `--with-deps` встановлює системні бібліотеки, потрібні браузерам на Linux. Якщо тестуєте лише Chromium, `npx playwright install chromium --with-deps` швидше.
- Звіт завантажується навіть тоді, коли тести падають (`!cancelled()`), тож його можна завантажити й відкрити трейси.
- Також запускайте `npx tsc --noEmit` (і лінтер), щоб помилки типів зупиняли збірку, — сам раннер типи не перевіряє.

## Шардинг: розподіліть набір тестів між машинами

```bash
npx playwright test --shard=1/4   # ця машина виконує першу чверть
```

У GitHub Actions використайте матрицю, щоб запустити чотири завдання з `--shard=${{ matrix.shardIndex }}/4`; нехай кожне створює **blob**-звіт (`reporter: process.env.CI ? 'blob' : 'html'`), завантажує його, а фінальне завдання об'єднує звіти:

```bash
npx playwright merge-reports --reporter html ./all-blob-reports
```

> [!PITFALL] Шардинг виявляє приховані залежності
> Шарди виконують різні підмножини на різних машинах. Тести, що потай покладалися на дані іншого тесту чи на певний порядок, починають падати лише при шардингу. Це не баг шардингу — це проявляється [проблема ізоляції](#/playwright/flakiness).

## Корисні перемикачі для CI

| Прапорець / опція | Навіщо |
| --- | --- |
| `forbidOnly: !!process.env.CI` | закомічений `test.only` валить запуск, а не мовчки пропускає все інше |
| `retries: 2` на CI | виявляти нестабільні тести (дивіться на позначку «flaky» у звіті) |
| `--only-changed=origin/main` | запускати лише файли тестів, зачеплені змінами від певного git-посилання, — чудово для швидкого зворотного зв'язку в PR |
| `--fail-on-flaky-tests` | зробити нестабільність падінням, а не попередженням |
| `trace: 'on-first-retry'` | отримувати трейс саме тоді, коли він потрібен |

=== quiz
??? Перший запуск нового тесту з `toHaveScreenshot()` падає. Чому?
- [ ] Скриншоти потребують окремого кроку встановлення
- [x] Еталона ще немає; Playwright записує фактичний скриншот як еталон
- [ ] Замала видима область
- [ ] Анімації не вимкнено
> Закомітьте згенерований еталон; наступні запуски порівнюватимуть з ним.

??? Скриншот-тести проходять на вашому Mac, але падають на Linux CI з дрібними відмінностями всюди. Найкраще рішення?
- [ ] Підняти `maxDiffPixelRatio` до 0.5
- [x] Створювати еталони в тому самому середовищі, що й CI (наприклад, у Docker-образі Playwright)
- [ ] Вимкнути скриншот-тести на CI
- [ ] Використати `fullPage: true`
> Рендеринг шрифтів відрізняється в різних ОС. Еталони мають походити із середовища, яке їх порівнює.

??? Що порівнює `toMatchAriaSnapshot`?
- [ ] Пікселі елемента
- [ ] Сирий HTML
- [x] Дерево доступності — ролі, доступні назви та ієрархію
- [ ] CSS-стилі
> Він перевіряє структуру так, як її бачать допоміжні технології, і це стабільно на різних платформах.

??? Навіщо завантажувати звіт з `if: ${{ !cancelled() }}`?
- [ ] Щоб заощадити місце
- [x] Щоб звіт (з трейсами) був доступний навіть тоді, коли тести падають
- [ ] Це потрібно для шардингу
> За замовчуванням після падіння наступні кроки пропускаються — саме тоді, коли звіт потрібен найбільше.

??? Від чого захищає `forbidOnly: !!process.env.CI`?
- [ ] Від паралельного запуску тестів на CI
- [x] Від закоміченого `test.only`, який мовчки пропустив би решту набору
- [ ] Від тестів без перевірок
> З `forbidOnly` будь-який `.only` змушує запуск на CI одразу впасти.

=== task Напишіть тест з aria-знімком
Для [playwright.dev](https://playwright.dev):

1. Відкрийте `npx playwright codegen https://playwright.dev`, оберіть інструмент «Assert snapshot» і клацніть на верхню навігаційну панель.
2. Вставте згенеровану перевірку в `tests/aria.spec.ts`.
3. Обріжте її до потрібних частин (наприклад, посилань «Docs» і «API») і запустіть.
4. Змініть назву одного посилання в знімку на неправильну й запустіть знову.
--- expected
Обрізаний тест на кшталт:

```ts
test('top navigation structure', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page.getByRole('navigation', { name: 'Main' })).toMatchAriaSnapshot(`
    - link "Docs"
    - link "API"
  `);
});
```

проходить, бо збіг частковий. З неправильною назвою (наприклад, `link "Documentation"`) він падає з YAML-різницею, що показує очікуваний рядок і фактичне дерево навколо. (Точний вміст навігації може змінюватися разом із сайтом — саме для цього й існує оновлення знімків.)

=== task Запустіть свою лабораторію на CI
1. Запуште `pw-lab` у репозиторій GitHub (зі згенерованим `.github/workflows/playwright.yml` або тим, що з цього уроку).
2. Додайте крок `npx tsc --noEmit` перед тестами.
3. Відкрийте вкладку Actions і дочекайтеся запуску. Завантажте артефакт `playwright-report` і відкрийте `index.html`.
4. Закомітьте десь `test.only` і запуште знову.
--- expected
Перший запуск зелений, з артефактом `playwright-report` для завантаження; відкритий локально, він показує той самий звіт, що й `show-report`.

Запуск із `test.only` одразу падає з повідомленням на кшталт:

```text
Error: item focused with '.only' is not allowed due to the 'forbidOnly' option in 'playwright.config.ts'
```

— саме та страховка, яка вам потрібна перед злиттям.

=== sources
- [Visual comparisons — Playwright](https://playwright.dev/docs/test-snapshots)
- [Aria snapshots — Playwright](https://playwright.dev/docs/aria-snapshots)
- [Continuous Integration — Playwright](https://playwright.dev/docs/ci)
- [Setting up CI (GitHub Actions) — Playwright](https://playwright.dev/docs/ci-intro)
- [Sharding — Playwright](https://playwright.dev/docs/test-sharding)
- [Docker — Playwright](https://playwright.dev/docs/docker)
