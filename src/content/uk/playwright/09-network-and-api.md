---
title: Керування мережею та тестування API
module: Майстерність
description: Підміняйте, змінюйте й блокуйте запити через page.route, чекайте на відповіді без перегонів і використовуйте фікстуру request, щоб тестувати API та швидко готувати дані.
level: Advanced
minutes: 40
---
## Навіщо керувати мережею

- **Ізолювати** інтерфейс від нестабільних сторонніх сервісів (платежі, аналітика, карти).
- **Відтворювати граничні випадки**, які важко викликати по-справжньому: помилку 500, порожній список, повільну відповідь.
- **Пришвидшувати** підготовку, створюючи дані через API, а не клацаючи інтерфейсом.

## Підміна через `page.route`

`page.route(pattern, handler)` перехоплює відповідні запити цієї сторінки. Обробник вирішує, що відбувається:

```ts
// Відповісти фейковими даними — запит так і не дійде до сервера
await page.route('**/api/products', (route) =>
  route.fulfill({ json: [{ id: 1, name: 'Mock mug', price: 9 }] }),
);
await page.goto('/shop');
await expect(page.getByRole('listitem')).toHaveText(['Mock mug']);
```

```ts
// Імітувати помилку сервера
await page.route('**/api/products', (route) => route.fulfill({ status: 500, body: 'oops' }));

// Блокувати зображення чи аналітику
await page.route(/\.(png|jpg|webp)$/, (route) => route.abort());
await page.route('**/analytics/**', (route) => route.abort());
```

> [!PITFALL] Реєстрація маршруту після того, як запит уже відбувся
> Маршрути впливають лише на запити, зроблені **після** їхньої реєстрації. Якщо викликати `page.route` після `page.goto`, початкові запити сторінки до API вже пішли на справжній сервер. Спершу реєструйте маршрути, потім переходьте на сторінку (або використовуйте `context.route` у фікстурі, щоб правило діяло для кожної сторінки).

## Зміна справжньої відповіді

Отримайте справжню відповідь, змініть її частину й відповідайте результатом:

```ts
await page.route('**/api/user', async (route) => {
  const response = await route.fetch();          // виконує справжній запит
  const json = await response.json();
  json.plan = 'enterprise';                      // змінюємо одне поле
  await route.fulfill({ response, json });       // статус і заголовки ті самі, тіло — нове
});
```

## Очікування мережевої активності

Щоб перевірити, що дія викликає запит, — або дочекатися його результату, — створіть проміс очікування **до** дії (той самий патерн, що й для [спливних вікон](#/playwright/actions)):

```ts
const responsePromise = page.waitForResponse(
  (res) => res.url().includes('/api/orders') && res.request().method() === 'POST',
);
await page.getByRole('button', { name: 'Place order' }).click();
const response = await responsePromise;
expect(response.status()).toBe(201);
```

> [!PITFALL] `waitForLoadState('networkidle')`
> «Чекати, доки мережа затихне» звучить безпечно, але застосунки з опитуванням, вебсокетами чи аналітикою ніколи не затихають, а швидкі застосунки затихають ще до рендерингу. Документація не радить `networkidle` для тестування. Чекайте на стан інтерфейсу (web-first перевірку) або на **конкретну** відповідь.

## Тестування API з фікстурою `request`

Фікстура `request` — це HTTP-клієнт, що використовує `baseURL` і `extraHTTPHeaders` з вашої конфігурації:

```ts
test('creates an issue', async ({ request }) => {
  const created = await request.post('/api/issues', {
    data: { title: 'Bug: button misaligned', labels: ['ui'] },
  });
  await expect(created).toBeOK();               // 2xx

  const issue = await created.json();
  const fetched = await request.get(`/api/issues/${issue.id}`);
  expect(await fetched.json()).toMatchObject({ title: 'Bug: button misaligned' });
});
```

`page.request` — той самий клієнт, але він **ділить cookies з контекстом сторінки**: зручно, щоб звертатися до API як автентифікований користувач.

### Поєднання API та інтерфейсу

Найшвидші надійні тести готують стан через API, а перевіряють через інтерфейс (або навпаки):

```ts
test('archived project disappears from the list', async ({ page, request }) => {
  const res = await request.post('/api/projects', { data: { name: 'Temp' } });
  const { id } = await res.json();
  await request.post(`/api/projects/${id}/archive`);

  await page.goto('/projects');
  await expect(page.getByRole('link', { name: 'Temp' })).toHaveCount(0);
});
```

> [!TIP] Типізуйте відповіді API
> `await res.json()` повертає `any` — саме та пастка з [уроку про ментальну модель](#/typescript/mental-model). Напишіть невеликий типізований помічник: `async function json<T>(res: APIResponse): Promise<T> { return res.json() as Promise<T>; }` — або перевіряйте бібліотекою схем, якщо форма важлива.

## HAR: записати раз, відтворювати потім

```ts
// Записати (один запуск з update: true), а в наступних запусках відтворювати з файлу
await page.routeFromHAR('tests/hars/products.har', { url: '**/api/**', update: true });
```

Відтворення HAR робить тести незалежними від бекенду — корисно для наборів тестів лише фронтенду.

=== quiz
??? Ви підміняєте `**/api/items`, але сторінка все одно показує справжні дані. Найімовірніше?
- [ ] Неправильний синтаксис glob
- [x] `page.route` зареєстровано після `page.goto`, тож початковий запит уже пішов
- [ ] Підміни працюють лише в Chromium
> Маршрути діють для запитів після реєстрації. Налаштовуйте їх до навігації.

??? Як змінити одне поле справжньої відповіді API?
- [ ] `route.continue({ json })`
- [x] `const response = await route.fetch(); … await route.fulfill({ response, json })`
- [ ] `page.waitForResponse`, а потім відредагувати тіло
> `route.fetch()` виконує справжній запит; `fulfill` з `response` зберігає статус і заголовки, замінюючи тіло.

??? Чому `waitForLoadState('networkidle')` не рекомендують?
- [ ] Його видалили в Playwright 1.60
- [x] Застосунки з опитуванням чи вебсокетами можуть ніколи не затихнути, а «тиша» не означає, що інтерфейс відрендерився
- [ ] Він працює лише з `fetch`, а не з XHR
> Чекайте на конкретний стан інтерфейсу чи конкретну відповідь, які вам потрібні.

??? Чим фікстура `request` відрізняється від `page.request`?
- [ ] `request` лише для GET
- [x] `page.request` ділить cookies і сховище з контекстом браузера сторінки; `request` має власні
- [ ] Нічим
> Використовуйте `page.request`, щоб звертатися до API як автентифікований у браузері користувач.

=== task Підмініть порожній стан і стан помилки
Використайте стартову сторінку, що завантажує список з API. Збережіть її як `tests/list.html` і роздавайте теку командою `npx http-server tests -p 8080` (або через `webServer` у Playwright).

1. Тест 1: підмініть `**/api/items` відповіддю `[]` і перевірте, що видно «No items yet».
2. Тест 2: підмініть відповіддю зі статусом 500 і перевірте повідомлення про помилку.
3. Тест 3: підмініть двома елементами й перевірте, що обидва показані.
--- starter html
```html
<!doctype html>
<h1>Items</h1>
<ul id="list"></ul>
<p id="state" role="status">Loading…</p>
<script>
  fetch('/api/items')
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((items) => {
      document.getElementById('list').innerHTML = items.map((i) => `<li>${i.name}</li>`).join('');
      document.getElementById('state').textContent = items.length ? '' : 'No items yet';
    })
    .catch(() => (document.getElementById('state').textContent = 'Could not load items'));
</script>
```
--- expected
```ts
test('empty state', async ({ page }) => {
  await page.route('**/api/items', (route) => route.fulfill({ json: [] }));
  await page.goto('http://localhost:8080/list.html');
  await expect(page.getByRole('status')).toHaveText('No items yet');
});

test('error state', async ({ page }) => {
  await page.route('**/api/items', (route) => route.fulfill({ status: 500 }));
  await page.goto('http://localhost:8080/list.html');
  await expect(page.getByRole('status')).toHaveText('Could not load items');
});

test('two items', async ({ page }) => {
  await page.route('**/api/items', (route) =>
    route.fulfill({ json: [{ name: 'Mug' }, { name: 'Pen' }] }));
  await page.goto('http://localhost:8080/list.html');
  await expect(page.getByRole('listitem')).toHaveText(['Mug', 'Pen']);
});
```

Усі три проходять, хоча **ендпоінта `/api/items` взагалі не існує** — без підмін сервер повернув би 404. Перенесіть один із викликів `page.route` нижче за його `goto` — і цей тест упаде з «Could not load items».

=== task Протестуйте публічний API фікстурою request
Напишіть `tests/api.spec.ts` для [JSONPlaceholder](https://jsonplaceholder.typicode.com) — безкоштовного фейкового REST API.

1. `GET /posts/1` → перевірте успішність і те, що `userId` дорівнює `1`.
2. `POST /posts` із заголовком і текстом → перевірте статус `201` і те, що відповідь повертає ваш заголовок разом з `id`.
3. Типізуйте відповідь типом `Post`, а не залишайте її `any`.
--- hint
Встановіть `test.use({ baseURL: 'https://jsonplaceholder.typicode.com' })` на початку файлу, щоб шляхи були короткими.
--- expected
```ts
type Post = { id: number; userId: number; title: string; body: string };

test.use({ baseURL: 'https://jsonplaceholder.typicode.com' });

test('read a post', async ({ request }) => {
  const res = await request.get('/posts/1');
  await expect(res).toBeOK();
  const post = (await res.json()) as Post;
  expect(post.userId).toBe(1);
});

test('create a post', async ({ request }) => {
  const res = await request.post('/posts', { data: { title: 'Hello', body: 'World', userId: 1 } });
  expect(res.status()).toBe(201);
  expect(await res.json()).toMatchObject({ title: 'Hello', id: expect.any(Number) });
});
```

Обидва проходять значно швидше за секунду — для тестів, що використовують лише `request`, браузер не запускається. (JSONPlaceholder лише імітує запис: створений пост завжди отримує `id: 101` і насправді не зберігається.)

=== sources
- [Mock APIs — Playwright](https://playwright.dev/docs/mock)
- [Network — Playwright](https://playwright.dev/docs/network)
- [API testing — Playwright](https://playwright.dev/docs/api-testing)
- [page.waitForResponse — Playwright API](https://playwright.dev/docs/api/class-page#page-wait-for-response)
- [page.waitForLoadState — Playwright API](https://playwright.dev/docs/api/class-page#page-wait-for-load-state)
