---
title: Functions that type well
module: Core types
description: Function types, optional and default parameters, overloads, the surprising rules of void, and typing async functions.
level: Intermediate
minutes: 25
---
## Parameters in, return type out

Parameters always need types (there's nothing to infer them from). Return types are inferred, but annotating them on exported functions turns an accidental change into a compile error at the definition, not at some distant caller.

```ts
export function retryDelay(attempt: number, baseMs = 200): number {
  return baseMs * 2 ** attempt;
}
```

- `baseMs = 200` is a **default parameter**: optional for callers, always a `number` inside.
- `baseMs?: number` would be optional too, but `number | undefined` inside — you'd handle the `undefined` yourself.

## Function types

```ts
type Predicate<T> = (item: T) => boolean;

const isEven: Predicate<number> = (n) => n % 2 === 0;   // n inferred as number

function filterAll<T>(items: T[], ...preds: Predicate<T>[]): T[] {
  return items.filter((item) => preds.every((p) => p(item)));
}
```

The `...preds` **rest parameter** collects any number of arguments into an array.

## `void` is not `undefined`

A return type of `void` on a *function type* means "the return value will be ignored" — not "must return nothing":

```ts
const results: number[] = [];
[1, 2, 3].forEach((n) => results.push(n));   // ✓ push returns a number; forEach ignores it
```

That's why callbacks typed `() => void` happily accept functions that return something.

> [!PITFALL] `async` callbacks where `void` is expected
> Because `() => void` accepts any function, it also accepts an `async` function returning a Promise — which is then **not awaited**:
> ```ts
> ['a', 'b'].forEach(async (id) => {
>   await deleteUser(id);   // forEach doesn't wait; errors become unhandled rejections
> });
> ```
> Use `for…of` with `await`, or `await Promise.all(ids.map(deleteUser))`. In Playwright this exact bug causes steps to run out of order. The `@typescript-eslint/no-misused-promises` and `no-floating-promises` lint rules catch it.

## Overloads

Overloads let one function have several *call signatures*. Callers see the overload signatures; the implementation signature is hidden:

```ts
function parse(input: string): number;
function parse(input: string[]): number[];
function parse(input: string | string[]): number | number[] {
  return Array.isArray(input) ? input.map(Number) : Number(input);
}

const one = parse('42');          // number
const many = parse(['1', '2']);   // number[]
```

> [!TIP] Prefer unions or generics first
> Overloads are verbose and the implementation isn't checked against each overload very strictly. If the return type doesn't depend on the input type, a union parameter is simpler. If it does, a generic is often cleaner.

## Typing async functions

An `async` function always returns a `Promise`. Annotate the **resolved** value inside `Promise<…>`:

```ts
type User = { id: number; name: string };

async function getUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as User;   // an honest assertion: we haven't validated
}
```

`Awaited<T>` unwraps a promise type: `Awaited<ReturnType<typeof getUser>>` is `User`.

## Destructured parameters

Annotate the whole object, not each name:

```ts variant="bad"
function login({ email: string, password: string }) {}   // renames! creates variables `string`
```

```ts variant="good"
function login({ email, password }: { email: string; password: string }) {}
```

> [!PITFALL] Types inside a destructuring pattern are renames
> In JavaScript, `{ email: string }` in a pattern means "take `email` and call it `string`". With `strict`, TypeScript reports the parameters as implicitly `any` — but the message is confusing the first time you see it. Types always go **after** the whole pattern.

=== quiz
??? What's the type of `timeout` inside the function?
```ts
function wait(timeout = 1000) { /* … */ }
```
- [ ] `number | undefined`
- [x] `number`
- [ ] `any`
> A default value means callers may omit it, but inside the function it's always a number.

??? Why does this compile even though `push` returns a number?
```ts
const out: number[] = [];
[1, 2].forEach((n) => out.push(n));
```
- [ ] `forEach` is typed as `any`
- [x] A `void`-returning function type accepts functions that return values; the result is ignored
- [ ] Arrow functions always return void
> `void` in a function type means "the caller ignores the return value", so it's safe to pass a function that returns something.

??? What's wrong with this Playwright-style loop?
```ts
names.forEach(async (name) => {
  await page.getByLabel('Name').fill(name);
});
```
- [ ] Nothing — `forEach` awaits async callbacks
- [x] `forEach` doesn't await the promises, so the fills overlap and errors go unhandled
- [ ] `fill` can't be used in a loop
> Use `for (const name of names) { await … }` to run them in order.

??? Which annotation is correct for a destructured parameter?
- [ ] `function f({ id: number }) {}`
- [x] `function f({ id }: { id: number }) {}`
- [ ] `function f({ id }: number) {}`
> Inside a destructuring pattern, `id: number` renames `id` to a variable called `number`. The type goes after the pattern.

=== task Fix an async loop bug
Paste the starter into `src/cleanup.ts` and run it with `node src/cleanup.ts`.

1. Note the order of the log lines.
2. Rewrite `cleanup` so deletions happen **one after another** and "done" logs last.
3. Then write `cleanupParallel` that deletes all of them **at the same time** but still logs "done" last.
--- starter ts
```ts
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function deleteUser(id: string): Promise<void> {
  await wait(Math.random() * 100);
  console.log('deleted', id);
}

async function cleanup(ids: string[]) {
  ids.forEach(async (id) => {
    await deleteUser(id);
  });
  console.log('done');
}

await cleanup(['u1', 'u2', 'u3']);
```
--- expected
The original prints `done` **first**, then the deletions in random order:

```text
done
deleted u2
deleted u1
deleted u3
```

Sequential version (`for (const id of ids) await deleteUser(id);`) always prints:

```text
deleted u1
deleted u2
deleted u3
done
```

Parallel version (`await Promise.all(ids.map(deleteUser));`) prints the three deletions in random order, then `done` last.

=== task Overloads vs. generics
Write a function `first` that returns the first element of an array, or `undefined` for an empty one.

1. Implement it with a generic: `function first<T>(items: T[]): T | undefined`.
2. Hover the result of `first([1, 2])`, `first(['a'])` and `first([])`.
3. Bonus: write `toArray(x)` with overloads so `toArray('a')` returns `string[]` and `toArray(['a'])` also returns `string[]`.
--- expected
```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}
first([1, 2]);   // number | undefined
first(['a']);    // string | undefined
first([]);       // undefined  (T is inferred as never)
```

A working overload set:

```ts
function toArray(x: string): string[];
function toArray(x: string[]): string[];
function toArray(x: string | string[]): string[] {
  return Array.isArray(x) ? x : [x];
}
```

=== sources
- [More on Functions — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [Return type void — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html#return-type-void)
- [Function overloads — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [no-floating-promises — typescript-eslint](https://typescript-eslint.io/rules/no-floating-promises/)
- [no-misused-promises — typescript-eslint](https://typescript-eslint.io/rules/no-misused-promises/)
- [Overloads — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/overloads/)
- [Functions — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/functions)
- [Callable — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/callable)
