---
title: Type operators — keyof, typeof, conditional & mapped types
module: Type-level power
description: Build types from other types. typeof and indexed access, conditional types with infer, distribution over unions, mapped types with key remapping, and template literal types.
level: Advanced
minutes: 40
---
## Types from values: `typeof`

In a type position, `typeof` gives you the type of a **value**. Combine it with indexed access to pull pieces out:

```ts
const defaults = { baseURL: 'http://localhost:3000', retries: 2, headless: true };

type Defaults = typeof defaults;                // { baseURL: string; retries: number; headless: boolean }
type Retries = Defaults['retries'];             // number
type DefaultKey = keyof typeof defaults;        // "baseURL" | "retries" | "headless"
```

> [!NOTE] Two different `typeof`s
> `typeof x === 'string'` in an `if` is JavaScript's runtime operator. `type T = typeof x` is TypeScript's type-level operator. Same keyword, different worlds.

## Conditional types

A conditional type picks one of two types based on a check — `A extends B ? X : Y` reads "if A is assignable to B, then X, else Y":

```ts
type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<'hello'>;  // "yes"
type B = IsString<42>;       // "no"
```

### `infer`: pattern-matching on types

Inside the `extends` clause, `infer X` captures a piece of the type:

```ts
type ElementOf<T> = T extends (infer E)[] ? E : never;
type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;

type E = ElementOf<string[]>;                 // string
type V = UnwrapPromise<Promise<number>>;      // number
type F = FirstArg<(id: number, x: string) => void>; // number
```

This is exactly how built-ins like `ReturnType`, `Parameters` and `Awaited` are implemented.

## Distribution over unions

When the checked type is a bare type parameter, conditional types **distribute** over unions — they're applied to each member separately:

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type R = ToArray<string | number>;   // string[] | number[]  (not (string | number)[])
```

That's how `Exclude<T, U>` works: `T extends U ? never : T` drops matching members one by one.

> [!PITFALL] Unexpected distribution (and `never` vanishing)
> Distribution surprises people in two ways:
> 1. `ToArray<string | number>` gives `string[] | number[]`, not `(string | number)[]`.
> 2. `IsString<never>` gives `never` — not `"no"` — because `never` is the empty union, so there's nothing to distribute over.
>
> Wrap both sides in a tuple to turn distribution off: `type ToArray<T> = [T] extends [unknown] ? T[] : never;`

## Mapped types

A mapped type builds an object type by looping over keys:

```ts
type Flags<T> = { [K in keyof T]: boolean };

type FeatureFlags = Flags<{ darkMode: string; beta: number }>;
// { darkMode: boolean; beta: boolean }
```

Modifiers can be added or removed with `+` / `-`:

```ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };   // removes `?` — like Required<T>
```

### Key remapping with `as`

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// Filter keys by mapping them to never:
type OnlyStrings<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };
```

## Template literal types

String types can be composed like template strings:

```ts
type Method = 'GET' | 'POST';
type Version = 'v1' | 'v2';
type Endpoint = `/${Version}/${'users' | 'orders'}`;
// "/v1/users" | "/v1/orders" | "/v2/users" | "/v2/orders"

type TestId = `data-testid=${string}`;
const ok: TestId = 'data-testid=submit';   // ✓
const bad: TestId = 'id=submit';           // ✗
```

Unions inside template literals multiply: 2 × 2 options above = 4 strings.

> [!WARNING] Know when to stop
> Type-level programming is powerful and addictive. If a type needs a comment to explain it, or produces unreadable error messages for your teammates, a simpler (slightly less precise) type is usually the better engineering choice.

=== quiz
??? What is `R`?
```ts
type ToArray<T> = T extends unknown ? T[] : never;
type R = ToArray<'a' | 'b'>;
```
- [ ] `('a' | 'b')[]`
- [x] `'a'[] | 'b'[]`
- [ ] `never`
- [ ] `unknown[]`
> A conditional type on a bare type parameter distributes over the union, applying to each member separately.

??? What does `infer` do?
- [ ] Makes TypeScript guess a type from runtime values
- [x] Captures part of a type inside a conditional type's `extends` clause
- [ ] Turns off inference for a parameter
- [ ] Converts a value to a type
> `T extends Promise<infer V> ? V : T` pattern-matches and names the inner type `V`.

??? What is `K`?
```ts
const env = { dev: 'http://localhost', prod: 'https://app.example' };
type K = keyof typeof env;
```
- [ ] `string`
- [x] `"dev" | "prod"`
- [ ] `{ dev: string; prod: string }`
> `typeof env` gets the object's type; `keyof` gives the union of its keys.

??? How do you make every property of `T` required with a mapped type?
- [ ] `{ [K in keyof T]+?: T[K] }`
- [x] `{ [K in keyof T]-?: T[K] }`
- [ ] `{ [K in keyof T]!: T[K] }`
> `-?` removes the optional modifier. That's how the built-in `Required<T>` is defined.

??? How many members does this union have?
```ts
type Route = `/${'en' | 'de' | 'fr'}/${'home' | 'about'}`;
```
- [ ] 2
- [ ] 5
- [x] 6
> Template literal types form the cross product: 3 × 2 = 6 strings.

=== task Recreate three built-in utility types
Write your own versions in `src/my-utils.ts` — **without** looking at `lib.es5.d.ts` first.

1. `MyReturnType<F>` — the return type of a function type.
2. `MyAwaited<T>` — unwraps nested promises: `MyAwaited<Promise<Promise<number>>>` is `number`.
3. `MyPick<T, K extends keyof T>`.
4. Verify each with the test helper in the starter — every line should compile.
--- starter ts
```ts
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// your types here

type Tests = [
  Expect<Equal<MyReturnType<() => string>, string>>,
  Expect<Equal<MyAwaited<Promise<Promise<number>>>, number>>,
  Expect<Equal<MyPick<{ a: 1; b: 2; c: 3 }, 'a' | 'c'>, { a: 1; c: 3 }>>,
];
```
--- hint
`MyAwaited` needs to call itself: `T extends Promise<infer V> ? MyAwaited<V> : T`.
--- expected
```ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
type MyAwaited<T> = T extends Promise<infer V> ? MyAwaited<V> : T;
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
```

`npx tsc` passes with no errors. If one is wrong, you'll see `Type 'false' does not satisfy the constraint 'true'` on that line — a tiny test framework built from types alone.

=== task Typed environment variables
Generate a type for test env variable names from a config object.
--- starter ts
```ts
const services = { api: 3001, web: 3000, auth: 3002 } as const;

// 1. type ServiceName = …           → "api" | "web" | "auth"
// 2. type EnvVar = …                → "API_URL" | "WEB_URL" | "AUTH_URL"
// 3. type Urls = …                  → { API_URL: string; WEB_URL: string; AUTH_URL: string }

// 4. implement:
// function buildUrls(host: string): Urls
```
--- hint
`Uppercase<K>` is a built-in intrinsic type. For step 3, use a mapped type with `as` key remapping over `ServiceName`.
--- expected
```ts
type ServiceName = keyof typeof services;
type EnvVar = `${Uppercase<ServiceName>}_URL`;
type Urls = { [K in ServiceName as `${Uppercase<K>}_URL`]: string };

function buildUrls(host: string): Urls {
  return {
    API_URL: `${host}:${services.api}`,
    WEB_URL: `${host}:${services.web}`,
    AUTH_URL: `${host}:${services.auth}`,
  };
}
```

Forgetting one key, or misspelling it as `APIURL`, is a compile error.

=== sources
- [Creating Types from Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Conditional Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [Mapped Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [Template Literal Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [Typeof Type Operator — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
- [Mapped Types — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/mapped-types/)
- [Conditional Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/conditional-types/)
- [infer — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/infer-type-inference-in-conditional-types/)
- [Template Union Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/template-union-types/)
- [Moving Types — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/moving-types)
