---
title: Advanced classes — accessors, statics, mixins & decorators
module: Real-world TypeScript
description: Getters and setters, auto-accessors, static members and private constructors, sharing behaviour with mixins, and TypeScript 5's standard decorators — plus where each one is (and isn't) worth it in test code.
level: Advanced
minutes: 35
---
## Getters and setters

Accessors look like properties from the outside but run code:

```ts
class Cart {
  #items: { price: number; qty: number }[] = [];

  get total(): number {
    return this.#items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  set discount(percent: number) {
    if (percent < 0 || percent > 100) throw new RangeError('discount must be 0–100');
    this.#discount = percent;
  }
  #discount = 0;
}

const cart = new Cart();
cart.total;          // computed on every read
cart.discount = 10;  // runs validation
```

A `get` without a `set` is effectively readonly.

> [!TIP] Keep setters boring
> A setter that triggers network calls or heavy work surprises readers — `cart.discount = 10` looks like a cheap assignment. Prefer an explicit method (`applyDiscount(10)`) when there's real work or failure involved.

### Auto-accessors

The `accessor` keyword declares a property backed by a private field with a generated getter/setter pair. On its own it changes little — its main purpose is to give **decorators** something to intercept:

```ts
class Settings {
  accessor theme = 'light';
}
```

## Static members

`static` members belong to the class itself, not to instances:

```ts
class TestIds {
  static #next = 0;
  static next(prefix: string) {
    return `${prefix}-${++TestIds.#next}`;
  }
}
TestIds.next('user');   // 'user-1'
```

A `static { … }` block runs once when the class is defined — useful for one-time setup that needs private access.

> [!WARNING] Static state is shared per worker
> In Playwright each worker process loads your modules once, so static (and module-level) state is shared by every test that worker runs — and **not** shared between workers. Don't use it for anything a test must own; use fixtures instead.

## Private constructors and factories

A `private` constructor forces callers through a static factory — handy when creation is async (constructors can't be `async`):

```ts
class ApiClient {
  private constructor(private readonly token: string) {}

  static async login(request: APIRequestContext, user: string, password: string) {
    const res = await request.post('/api/login', { data: { user, password } });
    const { token } = await res.json();
    return new ApiClient(token);
  }
}

const client = await ApiClient.login(request, 'ada', 's3cret');
new ApiClient('x');   // ✗ Constructor of class 'ApiClient' is private…
```

(This uses a parameter property for brevity — fine in Playwright tests, but see the [classes lesson](#/typescript/classes) for why explicit fields are more portable.)

## Mixins: sharing behaviour without deep inheritance

A class can extend only one base class. A **mixin** is a function that takes a class and returns a subclass with extra behaviour, so you can compose several:

```ts
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
  };
}

function Tagged<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    tags: string[] = [];
    tag(t: string) { this.tags.push(t); return this; }
  };
}

class Report { title = 'nightly'; }
const RichReport = Tagged(Timestamped(Report));

const r = new RichReport();
r.tag('smoke');
r.createdAt; r.title;     // all typed
```

> [!NOTE] Mixins vs. composition
> Mixins work, but they make class hierarchies harder to follow. For page objects, plain **composition** (a page *has* a `Header` and a `Table`) is usually clearer — see [Page Object Model](#/playwright/page-object-model).

## Decorators (TypeScript 5+)

Decorators are functions that wrap or annotate classes and class members. TypeScript 5.0 implements the **standard** (TC39) decorators — no flag needed. The older `experimentalDecorators` flavour (used by Angular and NestJS) has a different signature; don't mix tutorials for the two.

```ts
function logged<This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => R,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>,
) {
  return function (this: This, ...args: Args): R {
    console.log(`→ ${String(context.name)}`, ...args);
    return target.call(this, ...args);
  };
}

class Checkout {
  @logged
  pay(amount: number) { return `paid ${amount}`; }
}

new Checkout().pay(42);   // logs "→ pay 42"
```

The `context` object tells the decorator what it's attached to (`kind`, `name`, `static`, `private`, `addInitializer`, `metadata`).

> [!PITFALL] Decorators need a real compiler
> Decorators generate code, so they're **not** erasable: Node's built-in type stripping fails with a syntax error on `@logged`, and `erasableSyntaxOnly` rejects them. They work when `tsc`, a bundler, or another full transformer compiles your code. Also: standard decorators can't decorate **parameters** (Angular-style `constructor(@Inject() x)` needs `experimentalDecorators`).

> [!TIP] In Playwright, prefer `test.step`
> The typical use for a decorator in test code — "log/report every page-object method" — is better served by wrapping methods in `test.step(...)`: it shows up in reports and traces, needs no extra compilation, and works with Playwright's runner out of the box.

=== quiz
??? What does a `get total()` accessor without a `set` behave like from the outside?
- [ ] A method you must call as `total()`
- [x] A readonly property computed on each read
- [ ] A static property
- [ ] A cached value computed once
> Accessors are read like properties. Without a setter, assignment is rejected.

??? Why use a private constructor plus a static `create()` method?
- [ ] To make the class faster
- [x] To control creation — e.g. async setup or validation — since constructors can't be async
- [ ] To allow multiple inheritance
- [ ] To make every instance share state
> Constructors are synchronous and can't return a different type. A static factory can await, validate, and return the instance.

??? What does a mixin function take and return?
- [ ] An object and a copy of it
- [x] A class (constructor) and a new subclass with extra members
- [ ] An interface and a class implementing it
- [ ] Two classes and their merged prototype
> Mixins are class factories: `(Base) => class extends Base { … }`.

??? Why does `node file.ts` fail on a class using `@logged`?
- [ ] Decorators were removed from TypeScript
- [x] Decorators emit code, so Node's type stripping can't just erase them
- [ ] Node needs `experimentalDecorators`
- [ ] Decorators only work on functions, not classes
> Type stripping only removes types. Decorators need a compiler that rewrites the class.

=== task Validate with a setter
Write a `Viewport` class with private `#width` / `#height` fields, getters for both, and a `size` setter that accepts `{ width, height }` and throws a `RangeError` if either is below 320 or above 3840. Add a read-only `aspect` getter.
--- expected
```ts
class Viewport {
  #width = 1280;
  #height = 720;

  get width() { return this.#width; }
  get height() { return this.#height; }
  get aspect() { return +(this.#width / this.#height).toFixed(2); }

  set size({ width, height }: { width: number; height: number }) {
    for (const v of [width, height]) {
      if (v < 320 || v > 3840) throw new RangeError(`Invalid dimension: ${v}`);
    }
    this.#width = width;
    this.#height = height;
  }
}

const v = new Viewport();
v.size = { width: 1920, height: 1080 };
console.log(v.aspect);              // 1.78
v.size = { width: 100, height: 100 };  // RangeError: Invalid dimension: 100
```

`v.aspect = 2` is a compile error (*Cannot assign to 'aspect' because it is a read-only property*).

=== task Compose two mixins
Using the `Constructor` type from the lesson, write `WithRetries` (adds `retries = 0` and `retry()` that increments it) and `WithLabel` (adds `label = ''`). Apply both to a `class Job { name = 'build'; }` and log every property of a new instance.
--- expected
```ts
const RetryableLabelledJob = WithLabel(WithRetries(Job));
const job = new RetryableLabelledJob();
job.retry();
job.label = 'nightly';
console.log(job.name, job.retries, job.label);
```

```text
build 1 nightly
```

Hovering `job` shows all three members typed; misspelling `job.retrys` is a compile error.

=== sources
- [Class (accessors, statics, decorators) — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/class/)
- [Mixins — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/mixins)
- [Classes are Useful — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/classesareuseful)
- [Limit Property Setters — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/propertysetters)
- [Decorators — TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators)
- [Mixins — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/mixins.html)
