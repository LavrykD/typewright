---
title: Iterators, generators, symbols & `using`
module: Real-world TypeScript
description: The iteration protocol behind for…of and spread, generator functions and lazy sequences, async iteration with for await, symbols as hidden keys, and explicit resource management with using / await using.
level: Advanced
minutes: 35
---
## The iteration protocol

`for…of`, spread (`[...x]`), destructuring and `Array.from` all work with any **iterable** — an object with a `[Symbol.iterator]()` method that returns an iterator (`next()` → `{ value, done }`). Arrays, strings, `Map`, `Set` and `NodeList` are all iterable.

```ts
const tags = new Set(['smoke', 'auth', 'smoke']);
for (const tag of tags) console.log(tag);   // smoke, auth
const asArray = [...tags];                   // ['smoke', 'auth']

const users = new Map([['ada', 36], ['linus', 54]]);
for (const [name, age] of users) { /* destructure each [key, value] pair */ }
```

TypeScript types these as `Iterable<T>`, `Iterator<T>` and `IterableIterator<T>`.

## Generators: iterators the easy way

A **generator function** (`function*`) returns an iterator; each `yield` produces the next value, and the function pauses in between:

```ts
function* idGenerator(prefix: string): Generator<string> {
  let n = 0;
  while (true) yield `${prefix}-${++n}`;
}

const ids = idGenerator('user');
ids.next().value;   // 'user-1'
ids.next().value;   // 'user-2'
```

Generators are **lazy**: an infinite loop is fine because values are produced only when asked for. That makes them great for test data:

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

The full type is `Generator<Yield, Return, Next>` — the type of yielded values, of the final `return` value, and of what callers pass into `next(value)`. You'll mostly write `Generator<T>`.

> [!PITFALL] Iterators are single-use
> A generator object can be consumed **once**. After `[...ids]` (or a `for…of` that ran to the end), it's exhausted and yields nothing more. If you need the sequence again, call the generator function again — or store an array.

## Async iteration: `for await`

An **async iterable** produces promises one at a time — streams, paginated APIs, lines of a file. Write one with `async function*` and consume it with `for await`:

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

Each page is fetched only when the loop asks for it, and `break` stops further requests.

## Symbols

A `symbol` is a unique, primitive value — two `Symbol('id')` calls are never equal. As object keys, symbols don't clash with string keys and are skipped by `Object.keys`, `for…in` and `JSON.stringify`:

```ts
const internal = Symbol('internal');
const record = { id: 1, [internal]: 'debug info' };

Object.keys(record);        // ['id']
JSON.stringify(record);     // '{"id":1}'
record[internal];           // 'debug info'
```

**Well-known symbols** like `Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.dispose` and `Symbol.asyncDispose` are how you plug your own objects into language features.

## `using`: automatic cleanup

Explicit resource management (TypeScript 5.2, supported natively by current Node) gives you deterministic cleanup. A `using` declaration calls the value's `[Symbol.dispose]()` when the enclosing block exits — even if it throws:

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
}   // ← disposed here, in reverse order: b, then a
```

```text
create /tmp/a
create /tmp/b
working
delete /tmp/b
delete /tmp/a
```

For async cleanup, implement `[Symbol.asyncDispose]()` (type `AsyncDisposable`) and write `await using`.

> [!TIP] `using` vs. Playwright fixtures
> In Playwright tests, **fixtures** are the primary cleanup mechanism (the code after `await use()`), and they're visible in reports. `using` shines in helper code outside fixtures — temporary files, a short-lived server in a script — where you'd otherwise write `try { … } finally { cleanup() }`.

> [!NOTE] Configuration
> `using` needs `lib` to include `esnext.disposable` (or `esnext`, which `target: "esnext"` gives you) for the `Disposable` types, and a runtime that supports it — current Node does, natively.

=== quiz
??? What makes an object usable in `for…of`?
- [ ] Having a `length` property
- [x] Having a `[Symbol.iterator]()` method that returns an iterator
- [ ] Being an array
- [ ] Extending `Iterable`
> Any object implementing the iteration protocol works — arrays, strings, Maps, Sets, generators and your own classes.

??? What does this log?
```ts
function* two() { yield 1; yield 2; }
const g = two();
console.log([...g], [...g]);
```
- [ ] `[1, 2] [1, 2]`
- [x] `[1, 2] []`
- [ ] `[1, 2] [2]`
- [ ] It throws
> A generator object is a single-use iterator. The second spread finds it already exhausted.

??? In which order are `using a` then `using b` disposed?
- [ ] `a`, then `b`
- [x] `b`, then `a`
- [ ] In parallel
- [ ] Only when the garbage collector runs
> Resources are disposed in reverse declaration order when the block exits, like nested `try/finally`.

??? Which of these includes a symbol-keyed property?
- [ ] `Object.keys(obj)`
- [ ] `JSON.stringify(obj)`
- [x] `obj[mySymbol]`
- [ ] `for (const k in obj)`
> Symbol keys are deliberately hidden from string-key enumeration and JSON; you access them directly.

=== task A lazy test-data generator
In `src/data.ts`:

1. Write `function* users(): Generator<{ id: number; email: string }>` that yields users forever (`user1@example.com`, `user2@…`).
2. Write a generic `take<T>(it: Iterable<T>, n: number)` generator.
3. Log the first three users, then call `users()` again and log the first one.
--- expected
```text
[
  { id: 1, email: 'user1@example.com' },
  { id: 2, email: 'user2@example.com' },
  { id: 3, email: 'user3@example.com' }
]
{ id: 1, email: 'user1@example.com' }
```

The infinite `while (true)` loop never hangs because values are only produced on demand. The second call starts from 1 because each call to `users()` creates a fresh generator.

=== task Clean up with `using`
1. Write a `class TempFile implements Disposable` whose constructor writes a file with `writeFileSync` and whose `[Symbol.dispose]()` deletes it with `rmSync`.
2. In a function, `using` it, check the file exists, then throw an error on purpose.
3. Catch the error outside and check the file no longer exists.
--- hint
`import { writeFileSync, rmSync, existsSync } from 'node:fs';` — and use an explicit field, not a parameter property, so `erasableSyntaxOnly` is happy.
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

The file is removed even though the function threw — no `finally` needed.

=== sources
- [Iterators — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/future-javascript/iterators)
- [Generators — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/generators)
- [for...of — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/for...of)
- [Symbols — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/symbols/)
- [Others: Iterators and Generators, using declarations — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/others/)
- [using Declarations — TypeScript 5.2 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management)
- [Iteration protocols — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
