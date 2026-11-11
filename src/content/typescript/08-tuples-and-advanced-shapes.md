---
title: Tuples, intersections & recursive types
module: Core types
description: Named, optional and variadic tuples, intersections (and when they collapse to never), recursive types like JSON and trees, and the boxed-type traps String, Object and {}.
level: Intermediate
minutes: 30
---
## Tuples: arrays with a fixed shape

A tuple fixes the **length** and the **type at each position**:

```ts
type Point = [number, number];
const p: Point = [10, 20];
const [x, y] = p;           // both number
```

### Named and optional elements

Labels document what each position means (they don't change behaviour), and `?` makes trailing elements optional:

```ts
type Range = [start: number, end?: number];
const all: Range = [0];
const page: Range = [0, 50];

type Hook = (...args: [name: string, timeoutMs?: number]) => void;   // labels show up in hovers
```

### Readonly tuples

```ts
function area(size: readonly [width: number, height: number]) {
  return size[0] * size[1];
}
area([2, 3]);
const fixed = [1, 2] as const;      // readonly [1, 2]
```

### Variadic tuples

Spreads in tuple types can be generic and appear anywhere, which lets you type "first element + the rest":

```ts
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
type AB = Concat<[1, 2], ['a']>;              // [1, 2, "a"]

function tail<T extends unknown[]>(arr: readonly [unknown, ...T]): T {
  return arr.slice(1) as T;
}
const rest = tail([1, 'a', true] as const);   // ["a", true] (readonly elements)
```

> [!PITFALL] Arrays don't become tuples by themselves
> `const pair = ['age', 42]` is inferred as `(string | number)[]` — any length, any order. You only get a tuple with an annotation (`: [string, number]`), `as const`, or a function return type. If you return `[value, error]` from a helper, annotate the return type, or every caller gets the loose array type.

## Intersections: "both at once"

`A & B` means a value must satisfy **both** types. For object types that means "all the properties of each":

```ts
type WithId = { id: string };
type WithTimestamps = { createdAt: Date; updatedAt: Date };
type Entity = WithId & WithTimestamps;      // id, createdAt, updatedAt
```

Use intersections to compose small types (and with generics: `T & { id: string }`). Prefer `interface … extends` when you're building a named hierarchy — extension reports conflicts clearly, while intersections silently produce `never`:

> [!PITFALL] Conflicting intersections become `never`
> ```ts
> type A = { status: string };
> type B = { status: number };
> type AB = A & B;            // status: string & number → never
> ```
> No value can be both a string and a number, so `status` becomes `never` and every assignment to it fails with a confusing message. With `interface B extends A`, the conflict would be reported right at the declaration: *Interface 'B' incorrectly extends interface 'A'.*

## Recursive types

A type can refer to itself — perfect for trees and JSON:

```ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [key: string]: Json };

const payload: Json = { user: { tags: ['a', 'b'], age: 3 }, ok: true };

interface MenuItem {
  label: string;
  children?: MenuItem[];
}
```

Conditional types can recurse too:

```ts
type Flatten<T> = T extends readonly (infer U)[] ? Flatten<U> : T;
type F = Flatten<number[][][]>;   // number
```

> [!TIP] Typing API responses as `Json`
> A `Json` type is a great middle ground for test helpers: unlike `any`, it won't let you call methods that JSON can't contain (no `Date`, no functions), and unlike `unknown`, you can still read nested values after narrowing.

## Boxed types: `String`, `Number`, `Object` and `{}`

JavaScript has wrapper **objects** for primitives (`new String('x')`). Their capitalised types are almost never what you want:

| Write this | Not this | Why |
| --- | --- | --- |
| `string`, `number`, `boolean` | `String`, `Number`, `Boolean` | wrappers are objects; `const s: string = new String('x')` is an error |
| `object` | `Object` | `object` means "any non-primitive" |
| `unknown` or `Record<string, unknown>` | `{}` | `{}` means "anything except `null`/`undefined`" — including `42` |

```ts
const a: {} = 42;          // ✓ — surprising but allowed
const b: object = 42;      // ✗ Type 'number' is not assignable to type 'object'.
```

=== quiz
??? What is the inferred type of `const pair = ['age', 42];`?
- [ ] `[string, number]`
- [x] `(string | number)[]`
- [ ] `readonly ['age', 42]`
- [ ] `any[]`
> Array literals infer to arrays, not tuples. Use an annotation or `as const` to get a tuple.

??? What is the type of `status` in `{ status: string } & { status: number }`?
- [ ] `string | number`
- [ ] `string`
- [x] `never`
- [ ] It's a compile error at the declaration
> An intersection requires both, and nothing is both a string and a number. `interface … extends` would have reported the conflict instead.

??? Which annotation rejects the number `42`?
- [ ] `{}`
- [x] `object`
- [ ] `Object`
- [ ] `unknown`
> `object` means non-primitive. `{}` and `Object` accept primitives (except `null`/`undefined`), and `unknown` accepts everything.

??? What does `[start: number, end?: number]` allow?
- [ ] Only two-element arrays
- [x] One or two numbers; the labels are for documentation
- [ ] Any number of numbers
- [ ] An object with `start` and `end`
> Tuple labels don't change the shape; `?` makes the trailing element optional.

=== task Type a "result tuple" helper
In `src/safe.ts` write `safe<T>(fn: () => Promise<T>)` that never throws and returns `[error, value]` as a **tuple**: `[null, value]` on success, `[error, null]` on failure.

1. First write it without a return type and hover the result of `await safe(...)`.
2. Then give it a return type — a union of two labelled tuples — so that checking `err === null` narrows `value`.
--- hint
Define `type Result<T> = [error: null, value: T] | [error: Error, value: null];`. Use `Error`, not `unknown`, for the error slot: narrowing works on a union only when the checked position tells the members apart, and `unknown` could itself be `null`. Convert whatever was thrown: `error instanceof Error ? error : new Error(String(error))`.
--- expected
Without an annotation, returning `[null, value]` and `[e, null]` infers an **array** — for a caught `unknown` error, simply `unknown[]` — so you lose both the positions and the types.

With the annotation:

```ts
type Result<T> = [error: null, value: T] | [error: Error, value: null];

export async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return [null, await fn()];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

const [err, value] = await safe(async () => 42);
if (err === null) {
  value;          // number
} else {
  err.message;    // Error
}
```

`npx tsc` passes. (If you type the error slot as `unknown`, `err === null` no longer narrows `value` — it stays `number | null`.)

=== task Model a JSON-safe test fixture
1. Declare the `Json` type from the lesson.
2. Type a `fixture` constant with it containing a nested user with tags.
3. Try to put `createdAt: new Date()` and `onClick: () => {}` inside — read the errors.
--- expected
`npx tsc` rejects the object with a long chain. Read it to the bottom (see [Reading TypeScript errors](#/typescript/reading-errors)):

```text
error TS2322: Type '{ user: { tags: string[]; createdAt: Date; … }; }' is not assignable to type 'Json'.
  Types of property 'user' are incompatible.
    …
      Types of property 'createdAt' are incompatible.
        Type 'Date' is not assignable to type 'Json | undefined'.
          …
            Index signature for type 'string' is missing in type 'Date'.
```

Remove `createdAt` and the function is reported the same way. That's exactly what you want: these values wouldn't survive `JSON.stringify` (the date would become a string, the function would disappear), so the type stops you from relying on them.

=== sources
- [Tuple Type (Anonymous) — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/tuple-type-anonymous/)
- [Named Tuple Type (Labeled) — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/named-tuple-type-labeled/)
- [Intersection Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/intersection-types/)
- [Others: Variadic tuples, Recursive types, Boxed types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/others/)
- [Tuple Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types)
- [Variadic tuple types — TypeScript 4.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types)
