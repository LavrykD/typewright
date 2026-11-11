---
title: Type compatibility — assertions, variance & branded types
module: Type-level power
description: When TypeScript lets one type stand in for another — type assertions and their dangers, covariance and contravariance, the method-bivariance hole, and branded types for IDs that must not mix.
level: Advanced
minutes: 40
---
## Assignability is the whole game

Almost every type error is the same question: *is type S assignable to type T?* TypeScript answers it **structurally** (by shape) and, for convenience, it isn't perfectly **sound** — a few unsafe things are allowed on purpose. Knowing where those holes are is what this lesson is about.

## Type assertions: `as`

An assertion tells the compiler "trust me, it's this type". It does **nothing** at runtime — it's not a cast or conversion.

```ts
const el = document.getElementById('price') as HTMLInputElement;
el.value;               // OK for the compiler — crashes if it's actually a <span> or null
```

TypeScript only allows an assertion when one type could be the other (one is assignable to the other):

```ts
const n = 'x' as number;
// ✗ TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other.
```

The escape hatch is a **double assertion** through `unknown` — it compiles, and it's almost always a smell:

```ts
const n = 'x' as unknown as number;   // compiles; lies at runtime
```

> [!PITFALL] `{} as Foo` hides missing properties
> ```ts
> const user = {} as User;          // ✓ compiles — user.name is undefined at runtime
> const user2: User = {};           // ✗ Property 'name' is missing…
> ```
> An annotation checks the object; an assertion switches the check off. Prefer annotations or `satisfies`, and keep `as` for facts the compiler genuinely can't know (e.g. the DOM element type of a known id).

### Non-null assertion `!`

`value!` removes `null | undefined` from the type. Same deal: no runtime check.

```ts
const token = process.env.TOKEN!;   // string — undefined at runtime if unset
```

In tests, prefer an explicit check that fails loudly: `if (!token) throw new Error('TOKEN is not set');`.

## Variance: which direction does assignability flow?

Given `Cat` assignable to `Animal`:

| Variance | Meaning | Where it shows up |
| --- | --- | --- |
| **Covariant** | `Box<Cat>` → `Box<Animal>` ✓ | return types, readonly data |
| **Contravariant** | `Box<Animal>` → `Box<Cat>` ✓ | function **parameters** |
| **Invariant** | must match exactly | mutable data (in a sound system) |
| **Bivariant** | either direction | method parameters (a deliberate hole) |

Contravariance of parameters makes sense: a handler that accepts *any* animal can safely be used where a cat handler is expected — but not the other way round.

```ts
type Handlers = {
  onCat: (c: Cat) => void;
  onAnimal: (a: Animal) => void;
};

h.onCat = h.onAnimal;   // ✓ handles every animal, so certainly cats
h.onAnimal = h.onCat;   // ✗ Types of parameters 'c' and 'a' are incompatible. Property 'meow' is missing…
```

That error comes from `strictFunctionTypes` (part of `strict`).

> [!PITFALL] Method syntax is still bivariant
> `strictFunctionTypes` only applies to **function-type properties** (`onCat: (c: Cat) => void`). Parameters declared with **method syntax** (`handle(a: Animal): void`) stay bivariant, so this compiles and can crash:
> ```ts
> interface AnimalHandler { handle(a: Animal): void }
> const h: AnimalHandler = { handle(c: Cat) { c.meow(); } };   // ✓ compiles!
> h.handle({ name: 'Rex' });                                    // 💥 c.meow is not a function
> ```
> For callbacks you define yourself, prefer property syntax: `handle: (a: Animal) => void`.

> [!WARNING] Arrays are covariant — and that's unsound
> `const animals: Animal[] = cats;` is allowed, and then `animals.push(dog)` puts a dog into the `cats` array. TypeScript accepts this for convenience. Use `readonly Animal[]` for parameters you don't intend to mutate — readonly arrays are safely covariant.

### Variance annotations

For generic types you can state the intended variance with `out` (covariant) and `in` (contravariant). TypeScript then checks your declaration against it:

```ts
interface Producer<out T> { get(): T }
interface Consumer<in T> { accept(value: T): void }
```

You'll rarely need them; they matter mostly in large libraries.

## Nominal typing with brands

Structural typing means two `string` IDs are interchangeable — usually a bug waiting to happen:

```ts
function cancelOrder(orderId: string) { /* … */ }
cancelOrder(user.id);    // ✓ compiles — wrong ID!
```

A **brand** adds a type-only property so that structurally identical types stop matching:

```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

const toOrderId = (raw: string) => raw as OrderId;   // the single, deliberate assertion

function cancelOrder(id: OrderId) { /* … */ }
cancelOrder(toOrderId('o_1'));   // ✓
cancelOrder(userId);             // ✗ Type '"UserId"' is not assignable to type '"OrderId"'.
cancelOrder('o_1');              // ✗ Type 'string' is not assignable to type '{ readonly __brand: "OrderId"; }'.
```

At runtime a `UserId` is still a plain string — the brand costs nothing. Put the one `as` inside a constructor function (ideally one that validates the format) and use the branded type everywhere else.

=== quiz
??? What does `const el = x as HTMLInputElement` do at runtime?
- [ ] Converts `x` into an input element
- [ ] Throws if `x` isn't an input
- [x] Nothing — it only changes what the compiler believes
- [ ] Calls `instanceof` behind the scenes
> Assertions are erased. If you need a runtime guarantee, check with `instanceof` or a type guard.

??? Why is `h.onAnimal = h.onCat` an error under `strict`?
- [ ] Cats aren't animals
- [x] Function parameters are checked contravariantly: a cat-only handler can't accept every animal
- [ ] Function types are invariant
- [ ] Because of `noImplicitAny`
> `strictFunctionTypes` makes function-type parameters contravariant. The reverse assignment (`onCat = onAnimal`) is fine.

??? Which declaration keeps the unsafe bivariant parameter check even with `strict`?
- [ ] `handle: (a: Animal) => void`
- [x] `handle(a: Animal): void`
- [ ] `readonly handle: (a: Animal) => void`
> Method syntax is exempt from `strictFunctionTypes`. Use property syntax for callback types you control.

??? What's the runtime cost of a branded type like `string & { __brand: 'UserId' }`?
- [ ] An extra property on every string
- [ ] A wrapper object
- [x] None — the brand exists only in the type system
- [ ] A Symbol lookup
> Brands are erased. The only runtime code is whatever validation you put in the constructor function.

=== task Stop mixing up IDs
In `src/ids.ts`:

1. Create branded `UserId` and `ProjectId` types and constructor functions `userId(raw)` / `projectId(raw)` that throw unless the string starts with `u_` / `p_`.
2. Write `addMember(project: ProjectId, user: UserId)`.
3. Call it correctly once, then with the arguments swapped, then with raw strings. Run `npx tsc`.
--- expected
```ts
type UserId = string & { readonly __brand: 'UserId' };
type ProjectId = string & { readonly __brand: 'ProjectId' };

export function userId(raw: string): UserId {
  if (!raw.startsWith('u_')) throw new Error(`Not a user id: ${raw}`);
  return raw as UserId;
}
export function projectId(raw: string): ProjectId {
  if (!raw.startsWith('p_')) throw new Error(`Not a project id: ${raw}`);
  return raw as ProjectId;
}
```

The swapped call and the raw-string call are both compile errors (`Type '"UserId"' is not assignable to type '"ProjectId"'` and `Type 'string' is not assignable to type '{ readonly __brand: "ProjectId"; }'`); only the correct call compiles. At runtime the IDs are ordinary strings.

=== task Find the bivariance hole
1. Paste the starter into `src/variance.ts` and run `npx tsc` — note it compiles.
2. Run it with `node src/variance.ts` and read the crash.
3. Change **only** the `Listener` interface so the bad assignment becomes a compile error.
--- starter ts
```ts
type Animal = { name: string };
type Cat = Animal & { meow(): void };

interface Listener {
  notify(a: Animal): void;
}

const catListener: Listener = {
  notify(c: Cat) { c.meow(); },
};

catListener.notify({ name: 'Rex' });
```
--- expected
The original compiles but crashes:

```text
TypeError: c.meow is not a function
```

Switching to property syntax — `notify: (a: Animal) => void;` — makes `npx tsc` report the problem at the assignment:

```text
error TS2322: Type '(c: Cat) => void' is not assignable to type '(a: Animal) => void'.
```

=== sources
- [Type Assertion — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/type-assertion)
- [Type Compatibility — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/type-compatibility)
- [Nominal Typing — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/nominaltyping)
- [Others: Covariance and Contravariance — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/others/)
- [Erased Structural Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/erased-structural-types/)
- [strictFunctionTypes — TSConfig reference](https://www.typescriptlang.org/tsconfig/#strictFunctionTypes)
- [Type Compatibility — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
