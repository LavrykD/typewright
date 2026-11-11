---
title: Utility types you'll use every day
module: Type-level power
description: Partial, Required, Readonly, Pick, Omit, Record, Exclude, Extract, NonNullable, ReturnType, Parameters and Awaited — with the real situations where each one earns its place.
level: Intermediate
minutes: 25
---
## Why utility types

Utility types are generic types shipped with TypeScript that transform other types. They let you **derive** types instead of duplicating them — so when the original changes, everything derived from it updates automatically.

## Shaping objects

| Utility | Does | Typical use |
| --- | --- | --- |
| `Partial<T>` | all properties optional | update payloads, option overrides |
| `Required<T>` | all properties required | config after defaults are applied |
| `Readonly<T>` | all properties readonly | frozen config, state snapshots |
| `Pick<T, K>` | keep only keys `K` | a form that edits part of an entity |
| `Omit<T, K>` | drop keys `K` | "create" payloads without `id` |
| `Record<K, V>` | object with keys `K`, values `V` | lookup tables, maps of test data |

```ts
interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: Date;
}

type NewUser = Omit<User, 'id' | 'createdAt'>;          // what the "create" endpoint takes
type UserUpdate = Partial<Pick<User, 'name' | 'role'>>; // what "edit profile" can change
type UsersByRole = Record<User['role'], User[]>;        // { admin: User[]; member: User[] }

interface Options { retries?: number; timeout?: number }

function withDefaults(opts: Partial<Options>): Required<Options> {
  return { retries: 2, timeout: 30_000, ...opts };
}
```

> [!PITFALL] `Omit` doesn't check the keys you omit
> `Pick<User, 'emial'>` is an error, but `Omit<User, 'emial'>` silently compiles (the key just isn't removed) because `Omit`'s key parameter is `K extends keyof any`. A typo leaves the property in place. If that matters, define a strict version: `type StrictOmit<T, K extends keyof T> = Omit<T, K>;`

> [!PITFALL] `Omit` on a union flattens it
> `Omit` isn't distributive. On a discriminated union it keeps only the keys common to all members and destroys the discriminated shape. Use a distributive helper:
> ```ts
> type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
> ```

## Filtering unions

```ts
type Status = 'idle' | 'running' | 'passed' | 'failed' | null;

type Finished = Extract<Status, 'passed' | 'failed'>;  // "passed" | "failed"
type Active = Exclude<Status, 'passed' | 'failed'>;    // "idle" | "running" | null
type Known = NonNullable<Status>;                      // removes null and undefined
```

## Types from functions

You often don't own the type you need — but you have the function. Derive from it:

```ts
async function createOrder(userId: number, items: string[], opts?: { express: boolean }) {
  return { id: 'o_1', total: 42, eta: new Date() };
}

type CreateOrderArgs = Parameters<typeof createOrder>;
// [userId: number, items: string[], opts?: { express: boolean } | undefined]

type Order = Awaited<ReturnType<typeof createOrder>>;
// { id: string; total: number; eta: Date }
```

> [!TIP] Deriving from libraries
> This works for third-party code too. If a library exports a function but not the type of its options, `Parameters<typeof fn>[0]` gives you the options type — handy with Playwright APIs: `type GotoOptions = Parameters<Page['goto']>[1];`

## Other useful built-ins

- `ReturnType<F>`, `Parameters<F>`, `ConstructorParameters<C>`, `InstanceType<C>`
- `Awaited<T>` — recursively unwraps promises
- `NoInfer<T>` — blocks inference from a position (see [Generics](#/typescript/generics))
- `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` — for string literal types

=== quiz
??? You need the payload for "create user": every `User` field except `id` and `createdAt`. Which is best?
- [ ] `Partial<User>`
- [x] `Omit<User, 'id' | 'createdAt'>`
- [ ] `Pick<User, 'id' | 'createdAt'>`
- [ ] `Exclude<User, 'id' | 'createdAt'>`
> `Omit` removes keys from an object type. `Exclude` filters members of a union, not object keys.

??? What's the difference between `Exclude` and `Omit`?
- [ ] They're aliases
- [x] `Exclude` removes members from a union; `Omit` removes properties from an object type
- [ ] `Exclude` works only on strings
> `Exclude<'a' | 'b', 'a'>` is `'b'`. `Omit<{ a: 1; b: 2 }, 'a'>` is `{ b: 2 }`.

??? What is `T`?
```ts
async function load() { return [1, 2, 3]; }
type T = ReturnType<typeof load>;
```
- [ ] `number[]`
- [x] `Promise<number[]>`
- [ ] `Awaited<number[]>`
> An `async` function returns a Promise. Wrap it in `Awaited<…>` to get `number[]`.

??? Does `Omit<User, 'emial'>` (a typo) produce a compile error?
- [ ] Yes, unknown keys are rejected
- [x] No — `Omit` accepts any key, so the typo silently removes nothing
> `Omit<T, K extends keyof any>` doesn't constrain keys to `keyof T`. `Pick` does.

=== task Derive, don't duplicate
In `src/orders.ts`, start from the starter and derive every type from `Order` or from the functions. Write **no** object type by hand except `Order`.
--- starter ts
```ts
export interface Order {
  id: string;
  customerEmail: string;
  items: { sku: string; qty: number }[];
  status: 'draft' | 'paid' | 'shipped' | 'cancelled';
  createdAt: Date;
}

export async function fetchOrders(status?: Order['status']) {
  return [] as Order[];
}

// 1. NewOrder: an Order without id, status and createdAt
// 2. OrderPatch: optional status and items only
// 3. OpenStatus: every status except 'shipped' and 'cancelled'
// 4. FetchOrdersResult: the resolved value of fetchOrders
// 5. FetchStatusArg: the type of fetchOrders' first parameter
```
--- expected
```ts
type NewOrder = Omit<Order, 'id' | 'status' | 'createdAt'>;
type OrderPatch = Partial<Pick<Order, 'status' | 'items'>>;
type OpenStatus = Exclude<Order['status'], 'shipped' | 'cancelled'>;   // "draft" | "paid"
type FetchOrdersResult = Awaited<ReturnType<typeof fetchOrders>>;      // Order[]
type FetchStatusArg = Parameters<typeof fetchOrders>[0];               // Order['status'] | undefined
```

Now add a `'refunded'` status to `Order` — `OpenStatus` picks it up automatically without editing anything else.

=== sources
- [Utility Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Indexed Access Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [Distributive conditional types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)
- [Predefined Conditional Types — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/predefined-conditional-types/)
- [Type Manipulation — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/type-manipulation/)
