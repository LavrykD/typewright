---
title: Objects, interfaces & satisfies
module: Core types
description: Structural typing, interface vs type, optional and readonly properties, excess property checks, index signatures, and why satisfies is the best operator you're not using.
level: Foundations
minutes: 30
---
## Structural typing: shape is what matters

TypeScript compares objects by **shape**, not by name. If it has the right properties, it fits:

```ts
interface Point { x: number; y: number }

function length(p: Point) { return Math.hypot(p.x, p.y); }

const coords = { x: 3, y: 4, label: 'A' };
length(coords);  // ✓ — it has x and y; the extra `label` is fine
```

This is different from Java or C#, where a class must *declare* that it implements an interface. In TypeScript, anything with the right shape is compatible.

## `interface` or `type`?

Both describe object shapes and mostly interchangeable. Practical differences:

| | `interface` | `type` alias |
| --- | --- | --- |
| Object shapes | ✓ | ✓ |
| Unions, tuples, primitives, mapped/conditional types | ✗ | ✓ |
| Extending | `interface B extends A {}` | `type B = A & {…}` |
| Declaration merging (same name twice → combined) | ✓ | ✗ (error) |

The handbook's guidance: use `interface` until you need a feature only `type` has. Many teams simply use `type` everywhere for consistency — either is fine; **be consistent**.

```ts
interface Animal { name: string }
interface Dog extends Animal { breed: string }

type Status = 'active' | 'banned';               // only possible with `type`
type WithTimestamps<T> = T & { createdAt: Date }; // intersection
```

## Optional and readonly

```ts
interface Options {
  readonly baseURL: string;   // can't be reassigned after creation
  timeout?: number;           // may be missing → number | undefined
}

const opts: Options = { baseURL: 'http://localhost:3000' };
opts.baseURL = 'x';  // ✗ Cannot assign to 'baseURL' because it is a read-only property.
```

> [!WARNING] `readonly` is shallow and compile-time only
> `readonly items: string[]` stops you reassigning `items`, but `opts.items.push('x')` still works. Use `readonly string[]` (or `ReadonlyArray<string>`) to block mutation of the array itself. And at runtime, nothing is frozen — use `Object.freeze` if you need that.

## Excess property checks

Structural typing allows extra properties… except when you write an **object literal directly** where a type is expected:

```ts
interface Config { retries: number; timeout?: number }

const c1: Config = { retries: 2, timeuot: 5000 };
//                              ^ Object literal may only specify known properties,
//                                and 'timeuot' does not exist in type 'Config'.
```

That check catches typos. But it only applies to *fresh* literals:

```ts
const raw = { retries: 2, timeuot: 5000 };
const c2: Config = raw;   // ✓ no error — not a fresh literal, so extra props are allowed
```

> [!PITFALL] Typos that slip through
> The excess-property check is the *only* thing that catches a misspelled optional property, and it disappears as soon as the object goes through a variable first. Annotate config objects where you create them (or use `satisfies`) rather than later.

## Index signatures and `Record`

For objects used as dictionaries, describe the key and value types:

```ts
const scores: Record<string, number> = { ada: 3, linus: 5 };
// same as: { [name: string]: number }

const s = scores['grace'];   // number — but it's actually undefined!
```

With `noUncheckedIndexedAccess` enabled, `scores['grace']` becomes `number | undefined` — honest, and it forces you to handle the missing case.

> [!PITFALL] `Object.keys` returns `string[]`, not `(keyof T)[]`
> ```ts
> const user = { name: 'Ada', age: 36 };
> for (const key of Object.keys(user)) {
>   user[key];  // ✗ Element implicitly has an 'any' type because expression of type 'string' can't be used to index…
> }
> ```
> This is deliberate: because of structural typing, an object can have *more* keys at runtime than its type lists. If you know the object is exact, cast once: `(Object.keys(user) as (keyof typeof user)[])`, or iterate with `Object.entries`.

## `satisfies`: check without losing precision

An annotation **replaces** the inferred type with the declared one. `satisfies` **checks** a value against a type but **keeps** the precise inferred type:

```ts
type Route = { path: string; auth: boolean };

const routes = {
  home: { path: '/', auth: false },
  admin: { path: '/admin', auth: true },
} satisfies Record<string, Route>;

routes.admin.path;   // ✓ autocomplete knows `admin` exists
routes.typo;         // ✗ Property 'typo' does not exist
```

With an annotation instead (`const routes: Record<string, Route> = …`) you'd lose the specific keys: `routes.typo` would compile and be `undefined` at runtime.

> [!TIP] Rule of thumb
> Use an annotation when you want the variable to *be* the wider type (e.g. you'll add keys later). Use `satisfies` when you want validation **and** the exact inferred type — perfect for config objects, route maps and test data.

=== quiz
??? Does this compile?
```ts
interface Point { x: number; y: number }
const p = { x: 1, y: 2, z: 3 };
const q: Point = p;
```
- [x] Yes — `p` has `x` and `y`, extra properties are fine when assigning a variable
- [ ] No — `z` is an excess property
- [ ] No — `p` must be declared as `Point`
> Excess property checks only apply to fresh object literals. Assigning an existing variable uses plain structural compatibility.

??? Which can only be expressed with a `type` alias, not an `interface`?
- [ ] An object with optional properties
- [ ] An object that extends another object
- [x] A union like `'GET' | 'POST'`
- [ ] A readonly property
> Interfaces describe object shapes. Unions, tuples, primitives, mapped and conditional types need `type`.

??? What is `routes.admin`'s type here?
```ts
const routes = {
  admin: { path: '/admin' },
} satisfies Record<string, { path: string }>;
```
- [ ] `{ path: string } | undefined`
- [x] `{ path: string }` — and `routes.admin` is known to exist
- [ ] `Record<string, { path: string }>`
> `satisfies` validates the value but keeps the inferred type, so the specific key `admin` is still known. With a `Record` annotation, every string key would be allowed.

??? Why does `Object.keys(obj)` return `string[]` instead of `(keyof typeof obj)[]`?
- [ ] It's a bug that will be fixed
- [x] Objects can have more keys at runtime than their type lists (structural typing)
- [ ] Because keys can be numbers
- [ ] Only in non-strict mode
> A value of type `{ a: number }` might actually be `{ a: 1, b: 2 }`. Claiming the keys are exactly `'a'` would be unsound.

??? `interface Opts { readonly tags: string[] }` — which line compiles?
- [ ] `opts.tags = []`
- [x] `opts.tags.push('smoke')`
- [ ] Neither
> `readonly` is shallow: it protects the property binding, not the array. Use `readonly string[]` to prevent `push`.

=== task Typed test data with satisfies
Create `src/test-users.ts` describing test accounts you'd use in Playwright tests.

1. Define `type TestUser = { email: string; password: string; role: 'admin' | 'member' | 'guest' }`.
2. Create a `users` object with keys `admin`, `member` and `guest` using `satisfies Record<string, TestUser>`.
3. Make a typo on purpose — `role: 'admn'` — and run `npx tsc`.
4. Fix it, then try to access `users.superuser`.
--- expected
With the typo:

```text
error TS2322: Type '"admn"' is not assignable to type '"admin" | "member" | "guest"'.
```

Accessing `users.superuser`:

```text
error TS2339: Property 'superuser' does not exist on type '{ admin: { … }; member: { … }; guest: { … }; }'.
```

And `users.admin.role` hovers as `"admin"` — not the whole union — because `satisfies` kept the precise type.

=== task Catch the typo that slips through
1. Paste the starter into `src/config.ts` and run `npx tsc`. Note that there's **no** error.
2. Change the code so the misspelled `retires` is caught, without changing the `Config` type.
--- starter ts
```ts
interface Config { retries?: number; timeout?: number }

const base = { retires: 3, timeout: 10_000 };
export const config: Config = base;
console.log(config.retries ?? 0);
```
--- expected
Running the original prints `0` — your retries setting was silently ignored.

Moving the annotation onto the literal (`export const config: Config = { retires: 3, timeout: 10_000 };`) or writing `const base = { … } satisfies Config;` produces:

```text
error TS2561: Object literal may only specify known properties, but 'retires' does not exist in type 'Config'. Did you mean to write 'retries'?
```

=== sources
- [Object Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Differences between type aliases and interfaces — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- [Type compatibility (structural typing) — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [The satisfies operator — TypeScript 4.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [noUncheckedIndexedAccess — TSConfig reference](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess)
