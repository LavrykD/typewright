---
title: JavaScript essentials TypeScript assumes
module: Getting started
description: The JavaScript behaviour TypeScript doesn't change — equality, truthiness, null vs undefined, references, closures, numbers and modern syntax like destructuring, spread and for…of.
level: Foundations
minutes: 30
---
## TypeScript is JavaScript with a checker

Every TypeScript program runs as JavaScript, so JavaScript's quirks are still there. TypeScript catches some of them; others you simply have to know. This lesson is the short list of runtime behaviour that matters most when you write tests and typed code.

## Equality: use `===`

`==` converts types before comparing; `===` doesn't (plain JavaScript shown — TypeScript rejects most of these lines as comparisons of unrelated types):

```js
5 == '5';     // true  — '5' is converted to a number
5 === '5';    // false
0 == '';      // true  — '' converts to 0
0 === '';     // false
```

Use `===` and `!==` by default. TypeScript already refuses many nonsense comparisons — `if (count === 'zero')` on a `number` is *TS2367: This comparison appears to be unintentional* — but only `===` gives you predictable rules for the values it can't see, like data from JSON.

> [!TIP] The one exception: `== null`
> `value == null` is true for exactly `null` **and** `undefined`, and nothing else (not `0`, `''` or `false`). It's a common, deliberate idiom for "missing". `value ?? fallback` is the modern way to use it.

### Objects compare by reference

```ts
console.log({ a: 1 } === { a: 1 });   // false — two different objects
const x = { a: 1 };
const y = x;
x === y;                 // true — the same object
```

To compare contents, compare a meaningful field (`a.id === b.id`) or use a deep-equality helper. In Playwright, `expect(obj).toEqual({...})` does a deep comparison for you.

> [!PITFALL] `includes` and `indexOf` with objects
> `[{ id: 1 }].includes({ id: 1 })` is `false`, for the same reason. Search by a field instead: `list.some((u) => u.id === 1)`.

## Truthy and falsy

Exactly these values are falsy: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Everything else is truthy — including `'0'`, `'false'`, `[]` and `{}`.

```ts
if ([]) { /* runs! an empty array is truthy */ }
if (items.length) { /* the length check you meant */ }
```

`!!value` turns any value into a boolean explicitly.

## `null` vs `undefined`

Both mean "no value", but JavaScript produces them in different places:

| | `undefined` | `null` |
| --- | --- | --- |
| Produced by | missing properties, missing arguments, functions without `return` | only when someone writes it |
| `typeof` | `'undefined'` | `'object'` (historic bug) |
| In `JSON.stringify` | property is **dropped** | property is **kept** as `null` |

```ts
JSON.stringify({ a: undefined, b: null });   // '{"b":null}'
```

A practical convention: model "may be absent" with optional properties (`nickname?: string`) and use `null` only where an API explicitly sends it (for example, "clear this field" in a JSON payload).

## References and copying

Objects and arrays are passed **by reference**. Assigning or passing them doesn't copy:

```ts
const defaults = { retries: 2, headers: { 'x-test': '1' } };
const mine = defaults;
mine.retries = 5;
defaults.retries;          // 5 — same object

const copy = { ...defaults };            // shallow copy
copy.headers['x-test'] = '2';
defaults.headers['x-test'];              // '2' — nested objects are still shared

const deep = structuredClone(defaults);  // deep copy
```

> [!PITFALL] Shared test data that gets mutated
> Exporting one `const testUser = {...}` and changing it inside a test changes it for every other test in the same worker. Create fresh data per test (a factory function `makeUser()`), or freeze shared constants with `Object.freeze` / `as const`.

## Closures

A function remembers the variables in scope where it was created:

```ts
function counter() {
  let count = 0;
  return () => ++count;   // closes over `count`
}
const next = counter();
next(); next();           // 2
```

Closures are how fixtures, callbacks and event handlers keep state. They're also why `let` inside loops matters:

```ts
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 0 1 2 — a new `i` each iteration
for (var j = 0; j < 3; j++) setTimeout(() => console.log(j));  // 3 3 3 — one shared `j`
```

Use `const` by default, `let` when you reassign, and never `var`.

## Numbers

JavaScript has one `number` type: 64-bit floating point.

```ts
0.1 + 0.2;                          // 0.30000000000000004
Number.MAX_SAFE_INTEGER;            // 9007199254740991
Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2;   // true — precision lost
Number.isNaN(Math.sqrt(-1));        // true
2n ** 64n;                          // 18446744073709551616n — BigInt for big integers
```

- Never compare money or computed decimals with `===`; round, or store cents as integers.
- `NaN` isn't equal to anything, including itself. TypeScript reports `x === NaN` as *This condition will always return 'false'* — use `Number.isNaN(x)`.
- IDs from APIs that can exceed 2⁵³ should stay strings.

## Modern syntax you'll read everywhere

```ts
// Destructuring (with defaults and renames)
const { baseURL = 'http://localhost:3000', retries: maxRetries } = config;
const [first, ...rest] = ['chromium', 'firefox', 'webkit'];

// Spread: copy and merge (later keys win)
const merged = { ...defaults, ...overrides };
const all = [...listA, ...listB];

// Rest parameters
function log(level: string, ...parts: unknown[]) { console.log(level, ...parts); }

// Template strings
const url = `${baseURL}/users/${id}`;

// for...of iterates VALUES; for...in iterates KEYS (as strings)
for (const browser of ['chromium', 'webkit']) { /* 'chromium', 'webkit' */ }
for (const index in ['chromium', 'webkit']) { /* '0', '1' — strings! */ }

// Optional chaining and nullish coalescing
const city = user.address?.city ?? 'unknown';
```

> [!PITFALL] `for...in` over arrays
> `for...in` gives you the keys as **strings** (`'0'`, `'1'`) and also walks inherited enumerable properties. For arrays, use `for...of`, `.forEach`, or `.entries()` when you need the index: `for (const [i, b] of browsers.entries())`.

=== quiz
??? What does `JSON.stringify({ a: undefined, b: null })` produce?
- [ ] `'{"a":undefined,"b":null}'`
- [ ] `'{"a":null,"b":null}'`
- [x] `'{"b":null}'`
- [ ] `'{}'`
> Properties whose value is `undefined` are dropped from JSON; `null` is kept. That's why `null` is the conventional way to say "clear this field" in a JSON API.

??? Which value is **truthy**?
- [ ] `0`
- [ ] `''`
- [x] `[]`
- [ ] `NaN`
> Empty arrays and empty objects are truthy. Check `arr.length` when you mean "non-empty".

??? What does this log?
```ts
const a = { tags: ['x'] };
const b = { ...a };
b.tags.push('y');
console.log(a.tags.length);
```
- [ ] `1`
- [x] `2`
- [ ] It throws
> Spread makes a shallow copy: `b.tags` is the same array as `a.tags`. Use `structuredClone` for a deep copy.

??? Which check is true for both `null` and `undefined` but false for `0` and `''`?
- [ ] `!value`
- [x] `value == null`
- [ ] `value === null`
- [ ] `typeof value === 'undefined'`
> Loose equality with `null` matches exactly `null` and `undefined`. `!value` would also catch `0` and `''`.

=== task Spot the reference bug
1. Save the starter as `src/shared-data.ts` and run it with `node src/shared-data.ts`.
2. Explain the output, then fix it twice: once with a factory function, once with `structuredClone`.
--- starter ts
```ts
const baseUser = { name: 'Ada', roles: ['viewer'] };

function makeAdmin() {
  const user = { ...baseUser };
  user.roles.push('admin');
  return user;
}

makeAdmin();
makeAdmin();
console.log(baseUser.roles);
```
--- expected
The original prints:

```text
[ 'viewer', 'admin', 'admin' ]
```

The spread copied `baseUser`, but `roles` is still the same array, so every call mutated the shared data. Both fixes print `[ 'viewer' ]`:

```ts
const makeBaseUser = () => ({ name: 'Ada', roles: ['viewer'] });   // factory: fresh data every time
// or
const user = structuredClone(baseUser);                             // deep copy
```

=== task Numbers that lie
Predict, then run, each line in `src/numbers.ts`. Then write `sameAmount(a: number, b: number): boolean` that compares two prices safely.
--- starter ts
```ts
console.log(0.1 + 0.2 === 0.3);
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log([10, 1, 2].sort());
console.log(Number.isNaN(Number('abc')));
```
--- hint
`Array.prototype.sort()` without a comparator sorts **as strings**. For prices, compare with a tolerance (`Math.abs(a - b) < 0.005`) or convert to integer cents first.
--- expected
```text
false
true
[ 1, 10, 2 ]
true
```

One solution:

```ts
export function sameAmount(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}
sameAmount(0.1 + 0.2, 0.3);   // true
```

And `[10, 1, 2].sort((x, y) => x - y)` gives `[1, 2, 10]`.

=== sources
- [JavaScript Recap — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/recap)
- [Equality — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/equality)
- [Null vs. Undefined — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/null-undefined)
- [Number — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/number)
- [Destructuring — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/destructuring)
- [Spread Operator — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/spread-operator)
- [Falsy — MDN](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)
- [structuredClone() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
