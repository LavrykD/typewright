---
title: Narrowing & discriminated unions
module: Core types
description: How TypeScript follows your if-statements to refine types, the discriminated-union pattern that models real data, and exhaustiveness checks with never.
level: Foundations
minutes: 30
---
## What narrowing is

A union like `string | number` says "one of these". Before you can use string-only methods, you must *prove* which one you have. TypeScript reads your runtime checks and **narrows** the type inside each branch — this is called control-flow analysis.

```ts
function format(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase();   // value: string
  }
  return value.toFixed(2);        // value: number
}
```

Remember the [mental model](#/typescript/mental-model): types are erased, so narrowing always works through **real JavaScript checks** on values.

## The narrowing toolkit

| Check | Narrows | Example |
| --- | --- | --- |
| `typeof x === '…'` | primitives (`string`, `number`, `boolean`, `undefined`, `function`, `object`…) | `typeof id === 'number'` |
| truthiness | removes `null`, `undefined` (and `''`, `0`!) | `if (user) …` |
| `===` / `!==` | literal values, `null` | `if (status === 'done') …` |
| `'key' in x` | object unions by property presence | `if ('error' in res) …` |
| `x instanceof C` | class instances | `if (e instanceof TimeoutError) …` |
| `Array.isArray(x)` | arrays | `if (Array.isArray(input)) …` |

> [!PITFALL] `typeof null === 'object'`
> A JavaScript classic: checking `typeof x === 'object'` does **not** exclude `null`. TypeScript knows this and leaves `null` in the type, which is why you'll see `typeof x === 'object' && x !== null` everywhere.

## Discriminated unions — the pattern to model real data

Give every member of a union a shared literal property (the **discriminant**). Checking it narrows the whole object:

```ts
type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string; retryable: boolean }
  | { status: 'loading' };

function render(result: ApiResult<string[]>) {
  switch (result.status) {
    case 'success':
      return result.data.join(', ');           // data exists here
    case 'error':
      return result.retryable ? 'Retry…' : result.message;
    case 'loading':
      return 'Loading…';
  }
}
```

Compare with the "bag of optionals" style, where nothing stops impossible states:

```ts variant="bad"
type ApiResult = {
  loading: boolean;
  data?: string[];
  error?: string;   // can data AND error both be set? the type allows it
};
```

```ts variant="good"
type ApiResult =
  | { status: 'success'; data: string[] }
  | { status: 'error'; error: string }
  | { status: 'loading' };   // impossible states are now unrepresentable
```

## Exhaustiveness with `never`

When you handle every case, the leftover type is `never`. Assign it to a `never` variable and TypeScript will error the day someone adds a new member and forgets to handle it:

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function icon(result: ApiResult<unknown>) {
  switch (result.status) {
    case 'success': return '✓';
    case 'error':   return '✗';
    case 'loading': return '…';
    default:        return assertNever(result);
  }
}
```

Add `| { status: 'cancelled' }` to `ApiResult` and `assertNever(result)` turns red: *Argument of type '{ status: "cancelled" }' is not assignable to parameter of type 'never'.*

## Custom type guards and assertion functions

When the check is too complex to inline, wrap it in a function that returns a **type predicate**:

```ts
type User = { id: number; email: string };

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'number' &&
    'email' in value && typeof value.email === 'string'
  );
}

const data: unknown = await res.json();
if (isUser(data)) {
  data.email;   // User
}
```

An **assertion function** narrows by throwing instead of returning a boolean:

```ts
function assertIsDefined<T>(value: T, msg?: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) throw new Error(msg ?? 'Expected a value');
}

const el = document.querySelector('#app');
assertIsDefined(el);
el.innerHTML = '…';  // Element, not Element | null
```

> [!WARNING] A predicate is a promise you make
> TypeScript trusts `value is User` completely — it doesn't check that your function's body actually proves it. A buggy guard is as dangerous as `as User`. Test your guards.

> [!TIP] Inferred type predicates
> Since TypeScript 5.5, simple filters narrow automatically: `ids.filter((id) => id !== undefined)` turns `(number | undefined)[]` into `number[]` without writing `id is number` yourself.

## When narrowing gets "lost"

Narrowing applies to a specific reference at a specific point in the code. It can be reset:

```ts
function handle(user: { name?: string }) {
  if (user.name) {
    setTimeout(() => {
      user.name.length;   // ✗ possibly undefined — the callback runs later; user.name may have changed
    });
  }
}
```

> [!PITFALL] Narrowing doesn't survive callbacks on mutable properties
> Inside a callback, TypeScript can't know the property wasn't reassigned in between. Copy it to a `const` first: `const name = user.name; if (name) setTimeout(() => name.length);`

=== quiz
??? Which check narrows `x: string | null` to `string` **and** does not accidentally exclude the empty string?
- [ ] `if (x)`
- [x] `if (x !== null)`
- [ ] `if (typeof x === 'object')`
- [ ] `if (!!x)`
> Truthiness checks also exclude `''`, which is a valid string. Comparing against `null` removes exactly the case you mean.

??? After `if (typeof value === 'object')`, what can `value: string | Date | null` be?
- [ ] `Date`
- [x] `Date | null`
- [ ] `object`
- [ ] `string | Date`
> `typeof null` is `'object'` in JavaScript, so TypeScript keeps `null` in the narrowed type.

??? What makes a union "discriminated"?
- [ ] Every member is a class
- [x] Every member has a shared property with a distinct literal type
- [ ] It's declared with `interface` instead of `type`
- [ ] It contains `never`
> A common literal-typed property (like `status: 'success' | 'error'`) lets a single `===` or `switch` narrow the whole object.

??? Why does `assertNever(result)` in the `default` branch help?
- [ ] It makes the switch run faster
- [x] If a new union member is added and not handled, `result` is no longer `never`, so it's a compile error
- [ ] It catches runtime errors from the API
- [ ] It removes the need for a `return` type
> When all cases are handled, the remaining type is `never`. An unhandled new case leaves a real type there, which can't be passed to a `never` parameter.

??? What does TypeScript verify about the body of `function isUser(v: unknown): v is User`?
- [ ] That every property of `User` is checked
- [ ] That it returns `true` only for valid users
- [x] Only that it returns a boolean — the predicate itself is trusted
> Type predicates are unchecked claims. A wrong guard silently produces wrong types, so keep guards small and tested.

=== task Model a test run with a discriminated union
Create `src/test-run.ts`. Model the state of a Playwright test as a discriminated union and write a function that describes it.

1. Define `TestRun` with four states: `queued`, `running` (has `startedAt: number`), `passed` (has `durationMs: number`), `failed` (has `error: string` and `retry: number`).
2. Write `describe(run: TestRun): string` using a `switch` on the discriminant.
3. Add an exhaustive `default` with `assertNever`.
4. Finally, add a fifth state `skipped` with a `reason: string` — **before** handling it, run `npx tsc`.
--- hint
The discriminant can be called `state` or `status`. In the `failed` case, something like ``return `failed after ${run.retry} retries: ${run.error}`;``.
--- expected
A shape like:

```ts
type TestRun =
  | { state: 'queued' }
  | { state: 'running'; startedAt: number }
  | { state: 'passed'; durationMs: number }
  | { state: 'failed'; error: string; retry: number };
```

After adding `skipped` but before handling it, `npx tsc` reports an error on the `assertNever(run)` line similar to:

```text
error TS2345: Argument of type '{ state: "skipped"; reason: string; }' is not assignable to parameter of type 'never'.
```

Adding a `case 'skipped':` makes it compile again.

=== task Write and break a type guard
1. Write `isProduct(value: unknown): value is Product` for `type Product = { sku: string; price: number; tags: string[] }`.
2. Test it with: a valid product, `null`, `{ sku: 'A1', price: '9.99', tags: [] }`, and `{ sku: 'A1', price: 9.99 }`.
3. Then deliberately remove the `price` check from your guard and observe that TypeScript still compiles.
--- hint
Check `tags` with `Array.isArray(value.tags) && value.tags.every((t) => typeof t === 'string')`.
--- expected
Logging the four results prints:

```text
true false false false
```

Removing the `price` check still compiles without a single error — and now the third input (price as a string) returns `true`. That's why predicates need tests: the compiler trusts them blindly.

=== sources
- [Narrowing — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Discriminated unions — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Exhaustiveness checking — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- [Assertion functions — TypeScript 3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- [Inferred type predicates — TypeScript 5.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates)
- [Narrowing — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/narrowing/)
- [Control Flow Analysis — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/control-flow-analysis/)
- [Discriminated Unions — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/discriminated-unions/)
- [Type Guard — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/typeguard)
- [Never Type — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/never)
