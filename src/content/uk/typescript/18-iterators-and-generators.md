---
title: Ітератори, генератори, символи та `using`
module: TypeScript на практиці
description: Протокол ітерації, на якому працюють for…of і spread, функції-генератори та ліниві послідовності, асинхронна ітерація з for await, символи як приховані ключі та явне керування ресурсами через using / await using.
level: Advanced
minutes: 35
---
## Протокол ітерації

`for…of`, spread (`[...x]`), деструктуризація й `Array.from` працюють із будь-яким **ітерованим** об'єктом — тим, що має метод `[Symbol.iterator]()`, який повертає ітератор (`next()` → `{ value, done }`). Масиви, рядки, `Map`, `Set` і `NodeList` — усі ітеровані.

```ts
const tags = new Set(['smoke', 'auth', 'smoke']);
for (const tag of tags) console.log(tag);   // smoke, auth
const asArray = [...tags];                   // ['smoke', 'auth']

const users = new Map([['ada', 36], ['linus', 54]]);
for (const [name, age] of users) { /* деструктуризуємо кожну пару [ключ, значення] */ }
```

TypeScript типізує їх як `Iterable<T>`, `Iterator<T>` та `IterableIterator<T>`.

## Генератори: ітератори без зусиль

**Функція-генератор** (`function*`) повертає ітератор; кожен `yield` видає наступне значення, а між ними функція стоїть на паузі:

```ts
function* idGenerator(prefix: string): Generator<string> {
  let n = 0;
  while (true) yield `${prefix}-${++n}`;
}

const ids = idGenerator('user');
ids.next().value;   // 'user-1'
ids.next().value;   // 'user-2'
```

Генератори **ліниві**: нескінченний цикл не страшний, бо значення створюються лише на запит. Тому вони чудово підходять для тестових даних:

```ts
function* take<T>(items: Iterable<T>, count: number): Generator<T> {
  if (count <= 0) return;
  for (const item of items) {
    yield item;
    if (--count === 0) return;
  }
}

const emails = [...take(idGenerator('qa'), 3)].map((id) => `${id}@example.com`);
// ['qa-1@example.com', 'qa-2@example.com', 'qa-3@example.com']
```

Повний тип — `Generator<Yield, Return, Next>`: тип значень, що видаються, тип фінального `return` і тип того, що передають у `next(value)`. Здебільшого ви писатимете `Generator<T>`.

> [!PITFALL] Ітератори одноразові
> Об'єкт генератора можна пройти **один раз**. Після `[...ids]` (або `for…of`, що дійшов до кінця) він вичерпаний і більше нічого не видає. Якщо послідовність потрібна знову, викличте функцію-генератор ще раз — або збережіть масив.

## Асинхронна ітерація: `for await`

**Асинхронно ітерований** об'єкт видає проміси по одному — потоки, API з пагінацією, рядки файлу. Пишіть його через `async function*`, а споживайте через `for await`:

```ts
async function* pages(request: APIRequestContext, url: string) {
  let next: string | null = url;
  while (next) {
    const res = await request.get(next);
    const body = (await res.json()) as { items: unknown[]; next: string | null };
    yield body.items;
    next = body.next;
  }
}

for await (const items of pages(request, '/api/orders?page=1')) {
  console.log('got', items.length);
}
```

Кожна сторінка завантажується лише тоді, коли цикл її просить, а `break` зупиняє подальші запити.

## Символи

`symbol` — унікальне примітивне значення: два виклики `Symbol('id')` ніколи не рівні. Як ключі об'єкта символи не конфліктують із рядковими ключами й пропускаються `Object.keys`, `for…in` і `JSON.stringify`:

```ts
const internal = Symbol('internal');
const record = { id: 1, [internal]: 'debug info' };

Object.keys(record);        // ['id']
JSON.stringify(record);     // '{"id":1}'
record[internal];           // 'debug info'
```

**Загальновідомі символи** на кшталт `Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.dispose` і `Symbol.asyncDispose` — це спосіб підключити власні об'єкти до можливостей мови.

## `using`: автоматичне прибирання

Явне керування ресурсами (TypeScript 5.2, нативно підтримується актуальним Node) дає детерміноване прибирання. Оголошення `using` викликає `[Symbol.dispose]()` значення, коли виконання виходить із блоку, — навіть якщо було кинуто помилку:

```ts
class TempDir implements Disposable {
  readonly path: string;
  constructor(path: string) {
    this.path = path;
    console.log('create', path);
  }
  [Symbol.dispose]() {
    console.log('delete', this.path);
  }
}

function work() {
  using a = new TempDir('/tmp/a');
  using b = new TempDir('/tmp/b');
  console.log('working');
}   // ← тут звільняються у зворотному порядку: спершу b, потім a
```

```text
create /tmp/a
create /tmp/b
working
delete /tmp/b
delete /tmp/a
```

Для асинхронного прибирання реалізуйте `[Symbol.asyncDispose]()` (тип `AsyncDisposable`) і пишіть `await using`.

> [!TIP] `using` проти фікстур Playwright
> У тестах Playwright головний механізм прибирання — **фікстури** (код після `await use()`), і їх видно у звітах. `using` сяє в допоміжному коді поза фікстурами — тимчасові файли, короткоживучий сервер у скрипті, — там, де інакше довелося б писати `try { … } finally { cleanup() }`.

> [!NOTE] Налаштування
> `using` потребує, щоб `lib` містив `esnext.disposable` (або `esnext`, який дає `target: "esnext"`) для типів `Disposable`, і середовища виконання з підтримкою — актуальний Node підтримує це нативно.

=== quiz
??? Що робить об'єкт придатним для `for…of`?
- [ ] Наявність властивості `length`
- [x] Наявність методу `[Symbol.iterator]()`, що повертає ітератор
- [ ] Те, що це масив
- [ ] Наслідування від `Iterable`
> Підходить будь-який об'єкт, що реалізує протокол ітерації, — масиви, рядки, Map, Set, генератори й ваші власні класи.

??? Що виведе цей код?
```ts
function* two() { yield 1; yield 2; }
const g = two();
console.log([...g], [...g]);
```
- [ ] `[1, 2] [1, 2]`
- [x] `[1, 2] []`
- [ ] `[1, 2] [2]`
- [ ] Кине помилку
> Об'єкт генератора — одноразовий ітератор. Другий spread застає його вже вичерпаним.

??? У якому порядку звільняються `using a`, а потім `using b`?
- [ ] `a`, потім `b`
- [x] `b`, потім `a`
- [ ] Паралельно
- [ ] Лише коли спрацює збирач сміття
> Ресурси звільняються у зворотному до оголошення порядку при виході з блоку — як вкладені `try/finally`.

??? Що з цього дістає властивість із символьним ключем?
- [ ] `Object.keys(obj)`
- [ ] `JSON.stringify(obj)`
- [x] `obj[mySymbol]`
- [ ] `for (const k in obj)`
> Символьні ключі навмисно приховані від перелічення рядкових ключів і від JSON; звертайтеся до них напряму.

=== task Лінивий генератор тестових даних
У `src/data.ts`:

1. Напишіть `function* users(): Generator<{ id: number; email: string }>`, що нескінченно видає користувачів (`user1@example.com`, `user2@…`).
2. Напишіть дженерик-генератор `take<T>(it: Iterable<T>, n: number)`.
3. Виведіть перших трьох користувачів, потім знову викличте `users()` і виведіть першого.
--- expected
```text
[
  { id: 1, email: 'user1@example.com' },
  { id: 2, email: 'user2@example.com' },
  { id: 3, email: 'user3@example.com' }
]
{ id: 1, email: 'user1@example.com' }
```

Нескінченний цикл `while (true)` не зависає, бо значення створюються лише на запит. Другий виклик починає з 1, бо кожен виклик `users()` створює новий генератор.

=== task Прибирайте через `using`
1. Напишіть `class TempFile implements Disposable`, конструктор якого записує файл через `writeFileSync`, а `[Symbol.dispose]()` видаляє його через `rmSync`.
2. У функції оголосіть його через `using`, перевірте, що файл існує, а потім навмисно киньте помилку.
3. Перехопіть помилку ззовні й перевірте, що файлу вже немає.
--- hint
`import { writeFileSync, rmSync, existsSync } from 'node:fs';` — і використайте явне поле, а не властивість-параметр, щоб задовольнити `erasableSyntaxOnly`.
--- expected
```ts
import { existsSync, rmSync, writeFileSync } from 'node:fs';

class TempFile implements Disposable {
  readonly path: string;
  constructor(path: string) {
    this.path = path;
    writeFileSync(path, 'temp');
  }
  [Symbol.dispose]() {
    rmSync(this.path, { force: true });
  }
}

function risky() {
  using f = new TempFile('tmp.txt');
  console.log('exists inside:', existsSync(f.path));
  throw new Error('boom');
}

try { risky(); } catch (e) { console.log('caught', (e as Error).message); }
console.log('exists after:', existsSync('tmp.txt'));
```

```text
exists inside: true
caught boom
exists after: false
```

Файл видалено, хоча функція кинула помилку, — і жодного `finally`.

=== sources
- [Iterators — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/future-javascript/iterators)
- [Generators — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/generators)
- [for...of — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/for...of)
- [Symbols — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/symbols/)
- [Others: Iterators and Generators, using declarations — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/others/)
- [using Declarations — TypeScript 5.2 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management)
- [Iteration protocols — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
