---
title: Боротьба з нестабільними тестами
module: Майстерність
description: Звідки насправді береться нестабільність — перегони, спільний стан, час, анімації та середовище, — як відтворити її на вимогу і що повтори мають і не мають робити.
level: Advanced
minutes: 40
---
## Що означає «нестабільний»

Нестабільний (flaky) тест то проходить, то падає на тому самому коді. Це майже ніколи не випадковість: щось у тесті залежить від **таймінгу**, **порядку**, **спільних даних** або **середовища**, і це «щось» змінюється між запусками.

> [!NOTE] Повтори — це діагностика, а не лікування
> З `retries: 2` тест, що спершу впав, а потім пройшов, позначається у звіті як **flaky**. Це корисна інформація — вона показує, де шукати. Але це не рішення: нестабільний тест і далі приховує справжні баги й гальмує всю команду.

## Спершу відтворіть на вимогу

Не можна виправити те, чого не можна відтворити. Змусьте нестабільність проявитися:

```bash
npx playwright test checkout.spec.ts --repeat-each=20          # запустити 20 разів
npx playwright test checkout.spec.ts --repeat-each=20 --workers=4  # …паралельно, щоб виявити спільний стан
npx playwright test --fail-on-flaky-tests                       # змусити CI падати на нестабільних результатах
```

Додайте навантаження на процесор, щоб імітувати повільну машину CI: запускайте з більшою кількістю воркерів, ніж ядер, або «придушіть» ноутбук через `--workers=8`.

## Звичні підозрювані

### 1. Перегони: одноразові перевірки й пропущені await

```ts variant="bad"
await page.getByRole('button', { name: 'Save' }).click();
const text = await page.getByRole('status').textContent();   // прочитано один раз, прямо зараз
expect(text).toBe('Saved');
```

```ts variant="good"
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('status')).toHaveText('Saved');  // повторює, доки не стане правдою
```

Повна історія — в уроках [Автоочікування та перевірки](#/playwright/auto-waiting-and-assertions) і [Асинхронний код і помилки](#/typescript/async-and-errors).

### 2. Жорсткі очікування

`waitForTimeout(1000)` — це перегони з фіксованою ставкою. Замініть його на умову, яка вам справді потрібна.

### 3. Спільний стан між тестами

> [!PITFALL] Тести, що залежать від даних один одного
> Тест A створює «Project X», тест B редагує «Project X». Окремо B падає. Паралельно B виконується раніше за A. З повторами A виконується двічі й створює два проєкти. Кожен тест має **сам створювати потрібні дані** (найкраще через [API](#/playwright/network-and-api)) з унікальними назвами й ніколи не покладатися на інший тест чи порядок.

```ts
const name = `Project ${test.info().testId}-${Date.now()}`;   // унікально для тесту й запуску
```

Те саме стосується акаунтів: паралельним тестам, що змінюють одного користувача, потрібен [окремий акаунт на воркер](#/playwright/authentication).

### 4. Час і дати

«Термін — завтра» ламається опівночі; «3 хвилини тому» залежить від того, як швидко виконався тест. Керуйте годинником:

```ts
await page.clock.setFixedTime(new Date('2026-03-01T10:00:00'));   // Date.now() зафіксовано
await page.goto('/tasks');
await expect(page.getByText('Due tomorrow')).toBeVisible();

// або керуйте таймерами вручну:
await page.clock.install({ time: new Date('2026-03-01T10:00:00') });
await page.goto('/session');
await page.clock.fastForward('30:00');                             // перемотати 30 хвилин
await expect(page.getByText('Session expired')).toBeVisible();
```

### 5. Анімації та переходи

Перевірки готовності вже чекають, доки елемент стане **стабільним**, але скриншоти й деякі перевірки можуть «зловити» стан посеред анімації. Для візуальних тестів `toHaveScreenshot` за замовчуванням вимикає CSS-анімації; в інших випадках перевіряйте кінцевий стан, а не проміжний.

### 6. Середовище та сторонні сервіси

Повільний staging, API з лімітами запитів, справжня платіжна пісочниця, банер cookies, що з'являється лише в деяких регіонах. Підміняйте те, що вам не належить, і робіть середовище детермінованим (засіяні дані, фіксовані locale й часовий пояс у `use`).

## Послідовний режим — крайній захід

```ts
test.describe.configure({ mode: 'serial' });
```

Послідовний режим виконує групу по черзі й **пропускає решту, якщо один тест упав**. Іноді він виправданий для справді послідовного сценарію, але зазвичай лише маскує тести, які мали б бути незалежними. Обирайте ізольовані тести, що самі готують свій стан.

## Чекліст розбору нестабільності

:::steps
### Чи справді він нестабільний?
`--repeat-each=20`. Якщо падає щоразу — він просто зламаний.
### Падає сам по собі чи лише з іншими?
Окремо з `--workers=1` проти всього набору паралельно. Лише з іншими → спільний стан.
### Знайдіть крок
Відкрийте трейс невдалої спроби поруч з успішною. Чим вони відрізняються на кроці падіння?
### Класифікуйте й виправте причину
Перегони → web-first перевірка / await. Дані → дані для кожного тесту. Час → `page.clock`. Сторонній сервіс → `page.route`.
### Доведіть
`--repeat-each=50` проходить. Потім приберіть повтори, які ви додали «лише для цього тесту».
:::

=== quiz
??? Тест проходить на повторі, і звіт позначає його як «flaky». Що робити?
- [ ] Нічого — повтори впоралися
- [x] Вважати це багом: відтворити через `--repeat-each` і виправити причину
- [ ] Збільшити кількість повторів до 5
- [ ] Позначити його `test.fixme`
> Повтори виявляють нестабільність, але не прибирають її. Нестабільні тести підривають довіру й приховують справжні регресії.

??? Тест проходить окремо, але падає, коли весь набір запускається паралельно. Найімовірніша категорія?
- [ ] Пропущений `await`
- [x] Спільний стан — дані чи акаунти, які використовує більше одного тесту
- [ ] Неправильна версія браузера
- [ ] Анімації
> Падіння, що залежать від порядку й паралельності, вказують на стан, спільний для кількох тестів.

??? Як перевірити повідомлення «сесія закінчується через 30 хвилин», не чекаючи 30 хвилин?
- [ ] `page.waitForTimeout(1_800_000)`
- [x] `page.clock.install()`, а потім `page.clock.fastForward('30:00')`
- [ ] Встановити тайм-аут тесту 31 хвилина
- [ ] Підмінити `Date` у Node
> Clock API керує часом усередині сторінки, тож таймери й `Date` поводяться так, наче час минув.

??? Що робить `test.describe.configure({ mode: 'serial' })`, коли другий тест падає?
- [ ] Повторює лише другий тест
- [x] Пропускає решту тестів групи
- [ ] Запускає їх натомість паралельно
> Послідовні групи виконуються по черзі й зупиняються на першому падінні — тому вони й приховують проблеми з незалежністю.

=== task Змусьте нестабільний тест падати, а потім виправте його
1. Збережіть стартову сторінку як `tests/flaky.html`. Вона показує сповіщення після випадкової затримки 0–1000 мс, а саме сповіщення зникає через 1,5 с.
2. Напишіть тест, що клікає «Save», чекає `await page.waitForTimeout(500)`, а потім перевіряє `expect(await toast.isVisible()).toBe(true)`.
3. Запустіть його з `--repeat-each=20 --project=chromium` і порахуйте падіння.
4. Виправте його й запустіть ту саму команду знову.
--- starter html
```html
<!doctype html>
<button>Save</button>
<div role="alert" hidden>Saved!</div>
<script>
  const toast = document.querySelector('[role=alert]');
  document.querySelector('button').onclick = () => setTimeout(() => {
    toast.hidden = false;
    setTimeout(() => (toast.hidden = true), 1500);
  }, Math.random() * 1000);
</script>
```
--- expected
Нестабільна версія падає приблизно в половині випадків:

```text
  11 failed
  9 passed
```

(Ваші числа будуть іншими — у цьому й суть.) Виправлена версія:

```ts
await page.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByRole('alert')).toBeHidden();   // бонус: воно ще й зникає
```

проходить **20 з 20** і в середньому працює швидше, бо не «спить».

=== task Заморозьте час
Збережіть стартовий код як `tests/greeting.html`. Напишіть тест, що перевіряє: о 09:00 сторінка показує «Good morning», а о 19:00 — «Good evening».
--- starter html
```html
<!doctype html>
<h1></h1>
<script>
  const h = new Date().getHours();
  document.querySelector('h1').textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
</script>
```
--- expected
```ts
test('morning greeting', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-04T09:00:00'));
  await page.goto('file://' + path.join(__dirname, 'greeting.html'));
  await expect(page.getByRole('heading')).toHaveText('Good morning');
});

test('evening greeting', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-04T19:00:00'));
  await page.goto('file://' + path.join(__dirname, 'greeting.html'));
  await expect(page.getByRole('heading')).toHaveText('Good evening');
});
```

Обидва проходять незалежно від того, коли ви їх запускаєте. Без `setFixedTime` один із них упаде залежно від години.

=== sources
- [Retries & flaky tests — Playwright](https://playwright.dev/docs/test-retries)
- [Clock — Playwright](https://playwright.dev/docs/clock)
- [Parallelism & serial mode — Playwright](https://playwright.dev/docs/test-parallel)
- [Command line: --repeat-each, --fail-on-flaky-tests — Playwright](https://playwright.dev/docs/test-cli)
- [Best practices: test isolation — Playwright](https://playwright.dev/docs/best-practices#make-tests-as-isolated-as-possible)
