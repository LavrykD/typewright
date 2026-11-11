---
title: Автоочікування та web-first перевірки
module: Початок роботи
description: Найважливіша ідея стабільних тестів — дії чекають на готовність елемента, перевірки повторюються, доки не пройдуть, — і антипатерни (waitForTimeout, перевірки isVisible), що її ламають.
level: Foundations
minutes: 35
---
## Чому вам (майже) ніколи не треба писати очікування

Сучасні вебзастосунки рендеряться асинхронно: кнопка з'являється після запиту, спінер на 200 мс закриває форму, анімація висуває панель. Playwright справляється з цим у двох місцях:

1. **Дії автоматично чекають**, доки елемент не стане *готовим до дії* (actionable).
2. **Web-first перевірки повторюються**, доки очікувана умова не виконається (або не мине тайм-аут).

Зрозумійте ці дві речі — і більшість проблем із «нестабільними тестами» зникне.

## Перевірки готовності до дії

Перед дією Playwright чекає, доки ціль не пройде відповідні перевірки:

| Дія | Видимий | Стабільний | Отримує події | Увімкнений | Редагований |
| --- | :---: | :---: | :---: | :---: | :---: |
| `click`, `dblclick`, `check`, `uncheck`, `tap` | ✓ | ✓ | ✓ | ✓ | |
| `hover`, `dragTo` | ✓ | ✓ | ✓ | | |
| `fill`, `clear` | ✓ | | | ✓ | ✓ |
| `selectOption` | ✓ | | | ✓ | |
| `press`, `focus`, `setInputFiles`, `dispatchEvent` | | | | | |

- **Видимий** — непорожній обмежувальний прямокутник і немає `visibility: hidden` (зауважте: `opacity: 0` вважається видимим).
- **Стабільний** — та сама позиція протягом двох кадрів анімації (елемент не посеред анімації).
- **Отримує події** — це найвищий елемент у точці кліку; його не закриває оверлей чи спінер.
- **Увімкнений** — не `disabled`, не всередині вимкненого `<fieldset>`, не під `aria-disabled="true"`.
- **Редагований** — увімкнений і не `readonly`.
- Дії типу клік і `fill` також чекають, доки елемент не опиниться поза `inert`-піддеревом.

Якщо перевірки не проходять за тайм-аут, дія падає з журналом того, на що вона чекала, — наприклад, *«element is not enabled»* або *«<div class="overlay"> intercepts pointer events»*.

> [!PITFALL] Хапатися за `{ force: true }`
> Коли клік падає, бо «інший елемент перехоплює події вказівника», `force: true` прибирає помилку, пропускаючи перевірки. Але справжній користувач теж не зміг би клікнути — оверлей реальний. Натомість дочекайтеся, поки оверлей зникне (`await expect(spinner).toBeHidden()`). Використовуйте `force`, лише коли точно розумієте, чому перевірка у вашому випадку хибна.

## Web-first перевірки

`await expect(locator).toBeVisible()` не перевіряє один раз — вона **повторно шукає й перевіряє**, доки умова не виконається або не мине тайм-аут `expect` (за замовчуванням 5 с).

```ts variant="bad" title="перевіряє один раз, без повторів"
expect(await page.getByText('Saved').isVisible()).toBe(true);
```

```ts variant="good" title="повторює, доки не стане правдою"
await expect(page.getByText('Saved')).toBeVisible();
```

Перший варіант робить знімок *прямо зараз*. Якщо сповіщення з'явиться на 100 мс пізніше, тест упаде — іноді. Це нестабільність, яку ви написали власноруч.

Найуживаніші перевірки:

| Перевірка | Чекає, доки |
| --- | --- |
| `toBeVisible()` / `toBeHidden()` | елемент (не)видимий |
| `toHaveText(text \| regex \| array)` | текст збігається (повністю); для підрядка — `toContainText` |
| `toHaveValue(v)` | значення поля збігається |
| `toBeChecked()`, `toBeEnabled()`, `toBeDisabled()`, `toBeFocused()` | стан збігається |
| `toHaveCount(n)` | кількість збігів дорівнює `n` |
| `toHaveAttribute(name, value)`, `toHaveClass(…)`, `toHaveCSS(…)` | атрибут/клас/стиль збігається |
| `expect(page).toHaveURL(url)` / `toHaveTitle(t)` | URL / заголовок сторінки збігається |

> [!PITFALL] Загальні матчери не повторюються
> `expect(value).toBe(…)`, `toEqual`, `toContain` працюють зі звичайними значеннями, які ви *вже* прочитали. Вони виконуються один раз. Повторюються лише матчери над **локатором** або **сторінкою** (а також `expect.poll`/`toPass`). Якщо ви зробите `await locator.textContent()`, а потім `expect(text).toBe('…')`, — ви відмовилися від очікування.

## Заперечення та «м'які» перевірки

```ts
await expect(page.getByRole('alert')).not.toBeVisible();   // чекає, доки зникне
await expect.soft(page.getByTestId('total')).toHaveText('$42');  // фіксує падіння й іде далі
```

## Коли те, на що ви чекаєте, — не локатор

```ts
// Опитувати будь-яке асинхронне значення, доки воно не збіжеться
await expect.poll(async () => {
  const res = await page.request.get('/api/jobs/42');
  return (await res.json()).status;
}, { timeout: 30_000 }).toBe('done');

// Повторювати цілий блок, доки всі перевірки в ньому не пройдуть
await expect(async () => {
  const res = await page.request.get('/api/health');
  expect(res.status()).toBe(200);
}).toPass({ timeout: 20_000 });
```

## Тайм-аути в одній таблиці

| Тайм-аут | За замовчуванням | Як задати |
| --- | --- | --- |
| Тест (увесь тест разом із хуками й фікстурами) | 30 с | `timeout` у конфігурації, `test.setTimeout()`, `test.slow()` |
| Перевірки `expect` | 5 с | `expect: { timeout }` у конфігурації або `{ timeout }` у виклику |
| Дії (click, fill…) | власного ліміту немає (обмежені тайм-аутом тесту) | `use: { actionTimeout }` |
| Навігація (`goto`) | власного ліміту немає | `use: { navigationTimeout }` |

> [!PITFALL] `page.waitForTimeout(3000)`
> Жорсткі паузи роблять тести повільними, коли застосунок швидкий, і нестабільними, коли він повільний, — зазвичай і те, й інше. Документація прямо каже не використовувати це в робочих тестах. Чекайте на **умову**, яка вам справді важлива: елемент, URL, відповідь.

=== quiz
??? Чим `expect(await locator.isVisible()).toBe(true)` гірший за `await expect(locator).toBeVisible()`?
- [ ] Він повільніший
- [x] `isVisible()` перевіряє один раз і одразу; web-first перевірка повторюється, доки елемент не стане видимим або не мине тайм-аут
- [ ] `isVisible()` застарів
- [ ] Вони поводяться однаково
> Web-first перевірки чекають на умову. Одноразова перевірка змагається зі сторінкою.

??? Клік падає з «<div class="spinner"> intercepts pointer events». Яке рішення найкраще?
- [ ] `click({ force: true })`
- [ ] `await page.waitForTimeout(2000)` перед кліком
- [x] Дочекатися, поки спінер зникне, наприклад `await expect(spinner).toBeHidden()`, а потім клікнути
- [ ] Використати `dispatchEvent('click')`
> Оверлей реальний; користувач теж не зміг би клікнути. Чекайте на справжню умову, а не обходьте перевірки.

??? Яка з цих перевірок повторюється?
- [ ] `expect(await locator.count()).toBe(3)`
- [x] `await expect(locator).toHaveCount(3)`
- [ ] `expect(text).toContain('ok')`
> Повторюються лише матчери, що отримують локатор або сторінку (або використовують `expect.poll` / `toPass`).

??? Яку перевірку готовності виконує `fill()`, але не виконує `click()`?
- [ ] Видимий
- [ ] Стабільний
- [x] Редагований
- [ ] Отримує події
> `fill` потребує, щоб елемент був редагованим (увімкненим і не readonly). Перевірки «стабільний» і «отримує події» йому не потрібні.

??? Який тайм-аут web-first перевірки за замовчуванням?
- [ ] 30 секунд
- [x] 5 секунд
- [ ] Без тайм-ауту
- [ ] 1 секунда
> `expect` за замовчуванням чекає 5 с; увесь тест — 30 с.

=== task Відчуйте різницю між «перевірити» і «дочекатися»
Використайте цю крихітну локальну сторінку, яка показує повідомлення після випадкової затримки. Збережіть її як `tests/delayed.html` і напишіть два тести.
--- starter html
```html
<!doctype html>
<button id="go">Save</button>
<p id="msg" hidden>Saved!</p>
<script>
  document.getElementById('go').onclick = () =>
    setTimeout(() => (document.getElementById('msg').hidden = false), 300 + Math.random() * 700);
</script>
```
--- hint
Відкрийте її так: `await page.goto('file://' + path.join(__dirname, 'delayed.html'));` (імпортуйте `path` з `'node:path'`). Тест A напишіть з `expect(await page.getByText('Saved!').isVisible()).toBe(true)`, а тест B — з `await expect(page.getByText('Saved!')).toBeVisible()`. Запустіть їх з `--repeat-each=10`.
--- expected
```bash
npx playwright test delayed --project=chromium --repeat-each=10
```

```text
  10 failed
    … test A …
  10 passed
    … test B …
```

Тест A падає щоразу (повідомлення ще не видно, коли виконується `isVisible()`); тест B проходить щоразу, бо перевірка повторюється. Якби замінити перевірку в A на `await page.waitForTimeout(500)`, він проходив би *іноді* — хрестоматійний нестабільний тест.

=== task Опитуйте значення, якого немає на сторінці
Напишіть тест, що за допомогою `expect.poll` чекає, доки лічильник у `localStorage` не досягне 3.
--- starter html
```html
<!doctype html>
<script>
  let n = 0;
  const t = setInterval(() => { localStorage.setItem('count', String(++n)); if (n === 3) clearInterval(t); }, 400);
</script>
```
--- hint
Відкрийте сторінку через URL `file://`, як і раніше, а потім опитуйте `page.evaluate(() => localStorage.getItem('count'))`. (Деякі браузери обмежують localStorage для `file://`; тоді використайте `npx http-server tests` або опцію `webServer` у Playwright і URL `http://localhost`.)
--- expected
```ts
await expect.poll(() => page.evaluate(() => localStorage.getItem('count'))).toBe('3');
```

Тест проходить приблизно через 1,2 секунди. Якщо перевіряти `toBe('4')`, він впаде після 5-секундного тайм-ауту `expect` з повідомленням, що показує останнє опитане значення — `"3"`.

=== sources
- [Auto-waiting (actionability) — Playwright](https://playwright.dev/docs/actionability)
- [Assertions — Playwright](https://playwright.dev/docs/test-assertions)
- [Best practices: web-first assertions — Playwright](https://playwright.dev/docs/best-practices#use-web-first-assertions)
- [Timeouts — Playwright](https://playwright.dev/docs/test-timeouts)
- [page.waitForTimeout — Playwright API](https://playwright.dev/docs/api/class-page#page-wait-for-timeout)
