---
title: Network control & API testing
module: Mastery
description: Mock, modify and block requests with page.route, wait for responses without races, and use the request fixture to test APIs and set up data fast.
level: Advanced
minutes: 40
---
## Why control the network

- **Isolate** your UI from flaky third parties (payment, analytics, maps).
- **Reproduce edge cases** that are hard to trigger for real: a 500 error, an empty list, a slow response.
- **Speed up** setup by creating data via the API instead of clicking through the UI.

## Mocking with `page.route`

`page.route(pattern, handler)` intercepts matching requests from that page. The handler decides what happens:

```ts
// Fulfil with fake data — the request never reaches the server
await page.route('**/api/products', (route) =>
  route.fulfill({ json: [{ id: 1, name: 'Mock mug', price: 9 }] }),
);
await page.goto('/shop');
await expect(page.getByRole('listitem')).toHaveText(['Mock mug']);
```

```ts
// Simulate a server error
await page.route('**/api/products', (route) => route.fulfill({ status: 500, body: 'oops' }));

// Block images or analytics
await page.route(/\.(png|jpg|webp)$/, (route) => route.abort());
await page.route('**/analytics/**', (route) => route.abort());
```

> [!PITFALL] Registering the route after the request was made
> Routes only affect requests made **after** they're registered. If you call `page.route` after `page.goto`, the page's initial API calls have already gone to the real server. Register routes first, then navigate (or use `context.route` in a fixture so it applies to every page).

## Modifying a real response

Fetch the real response, change part of it, and fulfil with the result:

```ts
await page.route('**/api/user', async (route) => {
  const response = await route.fetch();          // performs the real request
  const json = await response.json();
  json.plan = 'enterprise';                      // tweak one field
  await route.fulfill({ response, json });       // keep status & headers, replace the body
});
```

## Waiting for network activity

To assert that an action triggers a request — or to wait for its result — create the wait promise **before** the action (the same pattern as [popups](#/playwright/actions)):

```ts
const responsePromise = page.waitForResponse(
  (res) => res.url().includes('/api/orders') && res.request().method() === 'POST',
);
await page.getByRole('button', { name: 'Place order' }).click();
const response = await responsePromise;
expect(response.status()).toBe(201);
```

> [!PITFALL] `waitForLoadState('networkidle')`
> "Wait until the network is quiet" sounds safe, but apps with polling, websockets or analytics never go quiet, and fast apps go quiet before rendering. The docs discourage `networkidle` for testing. Wait for the UI state (a web-first assertion) or a **specific** response instead.

## API testing with the `request` fixture

The `request` fixture is an HTTP client that uses your config's `baseURL` and `extraHTTPHeaders`:

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

`page.request` is the same client but **shares cookies with the page's context** — handy for calling the API as the logged-in user.

### Mixing API and UI

The fastest reliable tests set up state through the API and verify through the UI (or vice versa):

```ts
test('archived project disappears from the list', async ({ page, request }) => {
  const res = await request.post('/api/projects', { data: { name: 'Temp' } });
  const { id } = await res.json();
  await request.post(`/api/projects/${id}/archive`);

  await page.goto('/projects');
  await expect(page.getByRole('link', { name: 'Temp' })).toHaveCount(0);
});
```

> [!TIP] Type your API responses
> `await res.json()` returns `any` — exactly the trap from the [mental model lesson](#/typescript/mental-model). Write a small typed helper: `async function json<T>(res: APIResponse): Promise<T> { return res.json() as Promise<T>; }`, or validate with a schema library if the shape matters.

## HAR: record once, replay later

```ts
// Record (run once with update: true), then replay from the file on later runs
await page.routeFromHAR('tests/hars/products.har', { url: '**/api/**', update: true });
```

Replaying a HAR makes tests independent of a backend — useful for frontend-only test suites.

=== quiz
??? You mock `**/api/items` but the page still shows real data. Most likely?
- [ ] The glob syntax is wrong
- [x] `page.route` was registered after `page.goto`, so the initial request already went out
- [ ] Mocks only work in Chromium
> Routes apply to requests made after registration. Set them up before navigating.

??? How do you change one field of a real API response?
- [ ] `route.continue({ json })`
- [x] `const response = await route.fetch(); … await route.fulfill({ response, json })`
- [ ] `page.waitForResponse` and then edit the body
> `route.fetch()` performs the real request; `fulfill` with `response` keeps status and headers while replacing the body.

??? Why is `waitForLoadState('networkidle')` discouraged?
- [ ] It was removed in Playwright 1.60
- [x] Apps with polling or websockets may never be idle, and idle doesn't mean the UI rendered
- [ ] It only works with `fetch`, not XHR
> Wait for the specific UI state or response you care about.

??? What's the difference between the `request` fixture and `page.request`?
- [ ] `request` is for GET only
- [x] `page.request` shares cookies/storage with the page's browser context; `request` has its own
- [ ] There's no difference
> Use `page.request` to call APIs as the logged-in browser user.

=== task Mock an empty state and an error state
Use the starter page, which loads a list from an API. Save it as `tests/list.html` and serve the folder with `npx http-server tests -p 8080` (or Playwright's `webServer`).

1. Test 1: mock `**/api/items` to return `[]` and assert "No items yet" is visible.
2. Test 2: mock it to return status 500 and assert the error message.
3. Test 3: mock it with two items and assert both are listed.
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

All three pass even though **there is no `/api/items` endpoint at all** — the server would return 404 without the mocks. Move one `page.route` call below its `goto` and watch that test fail with "Could not load items".

=== task Test a public API with the request fixture
Write `tests/api.spec.ts` against [JSONPlaceholder](https://jsonplaceholder.typicode.com), a free fake REST API.

1. `GET /posts/1` → assert OK and that `userId` is `1`.
2. `POST /posts` with a title and body → assert status `201` and that the response echoes your title with an `id`.
3. Type the response with a `Post` type instead of leaving it `any`.
--- hint
Set `test.use({ baseURL: 'https://jsonplaceholder.typicode.com' })` at the top of the file so the paths stay short.
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

Both pass in well under a second — no browser is launched for tests that only use `request`. (JSONPlaceholder fakes writes: the created post always gets `id: 101` and isn't really saved.)

=== sources
- [Mock APIs — Playwright](https://playwright.dev/docs/mock)
- [Network — Playwright](https://playwright.dev/docs/network)
- [API testing — Playwright](https://playwright.dev/docs/api-testing)
- [page.waitForResponse — Playwright API](https://playwright.dev/docs/api/class-page#page-wait-for-response)
- [page.waitForLoadState — Playwright API](https://playwright.dev/docs/api/class-page#page-wait-for-load-state)
