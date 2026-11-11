---
title: Everyday types & inference
module: Core types
description: When to annotate and when to let TypeScript infer, unions and literal types, any vs unknown, arrays, tuples and `as const`.
level: Foundations
minutes: 25
---
## Let inference do the work

TypeScript infers types from values. Annotating everything is noise; annotating *boundaries* is valuable.

```ts variant="bad" title="over-annotated"
const count: number = 3;
const names: string[] = ['Ada', 'Linus'];
const doubled: number[] = names.map((n: string): number => n.length * 2);
```

```ts variant="good" title="annotate the boundaries"
const count = 3;                       // number
const names = ['Ada', 'Linus'];        // string[]
const doubled = names.map((n) => n.length * 2); // number[]

// Annotate function parameters and public return types:
export function total(prices: number[]): number {
  return prices.reduce((sum, p) => sum + p, 0);
}
```

A good rule: **annotate parameters, exported function return types, and empty starting values**. Let everything else be inferred. Hover in your editor to see what TypeScript decided.

## `const` vs `let`: literal types and widening

```ts
let status = 'loading';   // type: string       (it can change, so it widens)
const mode = 'dark';      // type: "dark"       (it can't change — a literal type)
```

A **literal type** is a type with exactly one value. Combine them with a union and you get precise, autocomplete-friendly types:

```ts
type Theme = 'light' | 'dark' | 'system';

function setTheme(theme: Theme) { /* ... */ }

setTheme('dark');   // ✓
setTheme('blue');   // ✗ Argument of type '"blue"' is not assignable to parameter of type 'Theme'.
```

> [!PITFALL] Literal widening inside objects
> Object properties are mutable, so their literals widen:
> ```ts
> const config = { theme: 'dark' };   // { theme: string }
> setTheme(config.theme);             // ✗ string is not assignable to Theme
> ```
> Fix it by annotating (`const config: { theme: Theme } = …`), using `as const`, or using `satisfies` (covered in [Objects & interfaces](#/typescript/objects-and-interfaces)).

## `as const`

`as const` says "this value is deeply readonly and every literal stays literal":

```ts
const browsers = ['chromium', 'firefox', 'webkit'] as const;
// readonly ["chromium", "firefox", "webkit"]

type Browser = (typeof browsers)[number];
// "chromium" | "firefox" | "webkit"
```

That second line is a very common pattern: **define the values once, derive the type from them**, so they can never drift apart.

## Arrays and tuples

```ts
const ids: number[] = [1, 2, 3];          // any length, all numbers
const pair: [string, number] = ['age', 42]; // exactly two, in this order
const point = [10, 20] as const;           // readonly [10, 20]
```

Tuples are great for return values like `[value, error]`, but name things with objects once there are more than two or three positions.

## `any`, `unknown` and `never`

| Type | Meaning | Use it when |
| --- | --- | --- |
| `any` | Turns checking **off**. Anything goes in, anything comes out. | Almost never. It spreads silently. |
| `unknown` | "Could be anything — prove it before use." | Untrusted data: `JSON.parse`, `catch (e)`, API responses. |
| `never` | A value that can't exist. | Exhaustiveness checks, impossible branches. |

```ts
function parse(raw: string): unknown {
  return JSON.parse(raw);
}

const data = parse('{"n": 1}');
data.n;                 // ✗ 'data' is of type 'unknown'.

if (typeof data === 'object' && data !== null && 'n' in data) {
  data.n;               // ✓ narrowed
}
```

> [!PITFALL] `any` is contagious
> `JSON.parse`, `res.json()` and many older libraries return `any`. Everything you derive from an `any` is also `any`, so one untyped value can silently switch off checking across a whole function. Assign such values to `unknown` (or a validated type) as early as possible.

## Optional values: `undefined` vs `null`

With `strictNullChecks` (part of `strict`), `string` means *only* strings. If something can be missing, say so:

```ts
type User = {
  name: string;
  nickname?: string;          // may be missing → string | undefined
  manager: User | null;       // always present, but may be null
};

user.nickname?.toUpperCase();        // optional chaining: undefined if missing
const display = user.nickname ?? user.name; // nullish coalescing: fallback only for null/undefined
```

> [!TIP] `??` vs `||`
> `count || 10` replaces `0` and `''` too, because they're falsy. `count ?? 10` only replaces `null` and `undefined`. Prefer `??` for defaults.

=== quiz
??? What is the type of `status`?
```ts
let status = 'idle';
```
- [ ] `'idle'`
- [x] `string`
- [ ] `any`
- [ ] `unknown`
> `let` variables can be reassigned, so TypeScript widens the literal `'idle'` to `string`. With `const` it would stay `'idle'`.

??? What does `type Browser = (typeof browsers)[number]` produce?
```ts
const browsers = ['chromium', 'firefox', 'webkit'] as const;
```
- [ ] `string`
- [ ] `string[]`
- [x] `"chromium" | "firefox" | "webkit"`
- [ ] `readonly string[]`
> `typeof browsers` is the readonly tuple type; indexing it with `number` gives the union of all element types. Without `as const` you'd just get `string`.

??? You receive data from `JSON.parse`. Which type should you give it before validating?
- [ ] `any`, because you don't know the type yet
- [x] `unknown`
- [ ] `object`
- [ ] `never`
> `unknown` forces you to check before use; `any` silently disables checking for everything derived from it.

??? `const retries = options.retries || 3;` — `options.retries` is `0`. What is `retries`?
- [ ] `0`
- [x] `3`
- [ ] `undefined`
> `0` is falsy, so `||` falls back to `3`. Use `options.retries ?? 3` to keep a deliberate `0`.

??? Which of these is the best place to add an explicit type annotation?
- [ ] `const total: number = a + b;`
- [ ] Inside every arrow callback passed to `.map()`
- [x] On the parameters of an exported function
- [ ] On every `const` declaration
> Parameters can't be inferred (there's no value to infer from), and exported signatures are contracts. Local values and callbacks are inferred well.

=== task Derive a type from a single source of truth
In your `ts-lab` project create `src/browsers.ts`.

1. Declare the array of supported browsers **once** using `as const`.
2. Derive a `Browser` type from it — don't write the union by hand.
3. Write `isBrowser(value: string): value is Browser` using the array.
4. Call it with `'webkit'` and `'safari'` and log the results.
--- starter ts
```ts
// 1. declare the list
// 2. type Browser = ...

export function isBrowser(value: string): value is Browser {
  // 3. use the list here
}

console.log(isBrowser('webkit'), isBrowser('safari'));
```
--- hint
`browsers.includes(value)` complains because `value` is `string`, not `Browser`. Widen the array for the check: `(browsers as readonly string[]).includes(value)`.
--- expected
```ts
const browsers = ['chromium', 'firefox', 'webkit'] as const;
type Browser = (typeof browsers)[number];

export function isBrowser(value: string): value is Browser {
  return (browsers as readonly string[]).includes(value);
}
```

`npx tsc` passes, and running the file prints:

```text
true false
```

Adding `'edge'` to the array automatically adds it to the `Browser` type — that's the point.

=== task Fix the widening bug
Paste the starter into `src/theme.ts` and run `npx tsc`. Fix the error **three different ways** (one at a time): an explicit annotation, `as const`, and `satisfies`.
--- starter ts
```ts
type Theme = 'light' | 'dark';
function applyTheme(t: Theme) { console.log('theme:', t); }

const settings = { theme: 'dark', fontSize: 14 };
applyTheme(settings.theme);
```
--- expected
The original fails with:

```text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'Theme'.
```

All three fixes compile:

```ts
const a: { theme: Theme; fontSize: number } = { theme: 'dark', fontSize: 14 };
const b = { theme: 'dark', fontSize: 14 } as const;
const c = { theme: 'dark', fontSize: 14 } satisfies { theme: Theme; fontSize: number };
```

Hover each one and compare:

- `a.theme` is `Theme` — the annotation *replaces* the inferred type.
- `b` is `{ readonly theme: "dark"; readonly fontSize: 14 }` — everything literal and readonly.
- `c` is `{ theme: "dark"; fontSize: number }` — `satisfies` checks against the shape but keeps the precise inferred type, and the contextual `Theme` stops `"dark"` from widening.

=== sources
- [Everyday Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Type Inference — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [Literal types & `as const` — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [The `unknown` type — TypeScript 3.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#new-unknown-top-type)
- [Nullish coalescing — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
