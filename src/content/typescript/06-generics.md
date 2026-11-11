---
title: Generics without the fear
module: Type-level power
description: Generics as "type parameters", constraints with extends, keyof, defaults, how inference picks T — and the mistakes that make generics useless.
level: Intermediate
minutes: 35
---
## A generic is a parameter for a type

A function parameter lets the caller choose a *value*. A **type parameter** lets the caller (or inference) choose a *type*:

```ts
function identity<T>(value: T): T {
  return value;
}

const n = identity(42);        // T = number
const s = identity('hi');      // T = string
```

Without generics you'd choose between `any` (loses the type) and writing one function per type. `T` connects the input type to the output type — **that link is the whole point**.

> [!TIP] The litmus test
> A type parameter should appear **at least twice** — usually once in a parameter and once in the return type. If `T` appears only once, you probably don't need a generic: `function log<T>(x: T): void` is just `function log(x: unknown): void`.

## Constraints: `extends`

Sometimes `T` must have certain properties. Constrain it:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest('abc', 'de');        // string
longest([1, 2], [1, 2, 3]);  // number[]
longest(10, 20);             // ✗ number doesn't have 'length'
```

## `keyof` and safe property access

`keyof T` is the union of `T`'s keys. Combine it with a second type parameter to write a perfectly typed getter:

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Ada', age: 36 };
getProp(user, 'age');    // number
getProp(user, 'email');  // ✗ Argument of type '"email"' is not assignable to parameter of type '"name" | "age"'.
```

`T[K]` is an **indexed access type**: "the type of property `K` in `T`".

## Generic types and defaults

Types can be generic too:

```ts
type ApiResponse<TData, TError = string> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

type UserResponse = ApiResponse<{ id: number }>;               // TError = string
type ValidationResponse = ApiResponse<null, { field: string }[]>;
```

## How inference picks `T`

TypeScript infers type arguments from the arguments you pass. Sometimes it picks something wider or narrower than you wanted:

```ts
function makeList<T>(items: T[]) { return items; }

makeList([1, 'a']);           // T = string | number — a union, fine
makeList<number>([1, 'a']);   // ✗ explicit type argument: 'a' is rejected
```

> [!PITFALL] "Type 'X' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype"
> You'll hit this when returning a concrete value where `T` is expected:
> ```ts
> function withDefault<T extends { retries: number }>(opts: Partial<T>): T {
>   return { retries: 3, ...opts };  // ✗
> }
> ```
> The caller chooses `T`. If they pick `{ retries: number; name: string }`, your object has no `name`. You can only return a `T` you were *given* (or build from one). Usually the fix is to not make it generic — return the concrete type — or accept a full `T` as a fallback parameter.

## `const` type parameters and `NoInfer`

Two modern tools:

```ts
// `const T` infers literal types, as if the caller wrote `as const`
function routes<const T extends readonly string[]>(paths: T) { return paths; }
const r = routes(['/home', '/login']);   // readonly ["/home", "/login"]

// `NoInfer<T>` stops a parameter from influencing inference
function pick<T extends string>(options: T[], fallback: NoInfer<T>) { return fallback; }
pick(['red', 'green'], 'blue');   // ✗ "blue" isn't one of the options
```

## Generics you already use

You've been using generics all along: `Array<T>`, `Promise<T>`, `Map<K, V>`, `Record<K, V>`, React's `useState<T>`, and in Playwright, `test.extend<Fixtures>()` — which you'll write in the [fixtures lesson](#/playwright/fixtures).

=== quiz
??? What does `identity<T>(value: T): T` give you that `identity(value: any): any` doesn't?
- [ ] Faster runtime performance
- [x] The return type matches the argument type at each call site
- [ ] Runtime type checking of `value`
- [ ] Nothing; they're equivalent
> Generics link input and output types. `any` throws the type information away.

??? Is this a useful generic?
```ts
function logValue<T>(value: T): void { console.log(value); }
```
- [ ] Yes — it accepts any type safely
- [x] No — `T` appears only once; `value: unknown` does the same job
- [ ] No — generics can't return void
> If a type parameter is used only once, it doesn't relate anything. Prefer `unknown`.

??? What is the return type of `getProp(user, 'age')`?
```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
const user = { name: 'Ada', age: 36 };
```
- [ ] `string | number`
- [x] `number`
- [ ] `T[K]`
- [ ] `unknown`
> `K` is inferred as the literal `'age'`, so `T[K]` resolves to `number`.

??? Why is returning `{ retries: 3 }` as `T` an error when `T extends { retries: number }`?
- [ ] Because `retries` should be optional
- [x] The caller decides `T` and it could require more properties than your object has
- [ ] Generic functions can't return objects
> A constraint is a lower bound. `T` might be a much richer type, so a hand-built object isn't necessarily a `T`.

=== task Build a typed `groupBy`
Create `src/group-by.ts`.

1. Implement `groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Record<K, T[]>`.
2. Use it to group test results by `status`.
3. Hover the result and check that the keys are the literal statuses.
--- starter ts
```ts
type Result = { title: string; status: 'passed' | 'failed' | 'skipped' };

const results: Result[] = [
  { title: 'login', status: 'passed' },
  { title: 'checkout', status: 'failed' },
  { title: 'search', status: 'passed' },
];

// export function groupBy...

const byStatus = groupBy(results, (r) => r.status);
console.log(byStatus.passed.map((r) => r.title));
```
--- hint
Start with `const out = {} as Record<K, T[]>;` then for each item: `(out[key] ??= []).push(item);`. With `noUncheckedIndexedAccess` you may need `Partial<Record<K, T[]>>` as the return type instead — that's more honest, since a status with zero items won't have a key.
--- expected
```ts
export function groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Partial<Record<K, T[]>> {
  const out: Partial<Record<K, T[]>> = {};
  for (const item of items) (out[getKey(item)] ??= []).push(item);
  return out;
}
```

Hovering `byStatus` shows keys `passed | failed | skipped`. Running prints:

```text
[ 'login', 'search' ]
```

(With the `Partial` return type you'll write `byStatus.passed?.map(…)` — TypeScript is right that `skipped` doesn't exist in this data.)

=== task Typed event emitter
Make `on` and `emit` reject wrong event names and wrong payloads.
--- starter ts
```ts
type Events = {
  testStarted: { title: string };
  testFinished: { title: string; ok: boolean };
};

class Emitter<E> {
  private handlers: { [K in keyof E]?: ((payload: E[K]) => void)[] } = {};

  on(/* event, handler */) {}
  emit(/* event, payload */) {}
}

const bus = new Emitter<Events>();
bus.on('testFinished', (p) => console.log(p.title, p.ok));
bus.emit('testFinished', { title: 'login', ok: true });
bus.emit('testFinished', { title: 'login' });     // should error
bus.emit('testCrashed', {});                       // should error
```
--- hint
`on<K extends keyof E>(event: K, handler: (payload: E[K]) => void)` — the same shape works for `emit`.
--- expected
```ts
on<K extends keyof E>(event: K, handler: (payload: E[K]) => void) {
  (this.handlers[event] ??= []).push(handler);
}
emit<K extends keyof E>(event: K, payload: E[K]) {
  this.handlers[event]?.forEach((h) => h(payload));
}
```

`npx tsc` reports exactly two errors: `Property 'ok' is missing…` for the second `emit`, and `Argument of type '"testCrashed"' is not assignable to parameter of type 'keyof Events'` for the third. Inside the `on` handler, `p` is inferred as `{ title: string; ok: boolean }` without any annotation.

=== sources
- [Generics — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Keyof Type Operator — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [Indexed Access Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [const type parameters — TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#const-type-parameters)
- [NoInfer utility type — TypeScript 5.4 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type)
