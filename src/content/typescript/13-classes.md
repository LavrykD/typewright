---
title: Classes for test code
module: Real-world TypeScript
description: The class features you need for page objects and helpers — fields, access modifiers, readonly, private #fields, implements, abstract classes — and the parameter-property trap.
level: Intermediate
minutes: 25
---
## Why classes matter here

Most TypeScript code can be plain functions and objects. But the **Page Object Model** in Playwright is usually written with classes, so it's worth knowing them well. A minimal class:

```ts
import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel('Email');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string) {
    await this.email.fill(email);
    await this.submit.click();
  }
}
```

## Fields and `strictPropertyInitialization`

Under `strict`, every declared field must be definitely assigned in the constructor:

```ts
class Report {
  title: string;           // ✗ Property 'title' has no initializer and is not definitely assigned in the constructor.
  entries: string[] = [];  // ✓ initialised inline
}
```

Assign it in the constructor, give it an initializer, or — only if something else really sets it — use the definite-assignment assertion `title!: string`.

## Access modifiers vs. `#private`

| | `private x` | `#x` |
| --- | --- | --- |
| Enforced by | TypeScript only (compile time) | JavaScript runtime |
| Accessible via `obj['x']` / at runtime | yes | no |
| Shows up in `JSON.stringify` / `console.log` | yes | no |

`public` (default), `protected` (class and subclasses) and `private` are **TypeScript-only** and erased. `#name` is real JavaScript privacy. Either is fine for test code; just know which one you're getting.

## Parameter properties — and why they're becoming rare

TypeScript has a shorthand that declares and assigns a field from a constructor parameter:

```ts
class LoginPage {
  constructor(private readonly page: Page) {}   // declares and assigns this.page
}
```

> [!PITFALL] Parameter properties aren't "erasable"
> The shorthand makes TypeScript *generate* the `this.page = page` assignment, so it isn't pure type syntax. Node's built-in type stripping rejects it (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`), and the `erasableSyntaxOnly` option flags it. Playwright's own test runner transforms it fine, so it works in tests today — but writing explicit fields keeps your code portable to any runtime.

> [!PITFALL] Field initializers that use a parameter property
> This page-object style is everywhere in older tutorials:
> ```ts
> class LoginPage {
>   readonly email = this.page.getByLabel('Email');   // ✗
>   constructor(private readonly page: Page) {}
> }
> ```
> With modern targets, TypeScript uses standard JavaScript class fields (`useDefineForClassFields`), which run **before** the constructor body assigns `this.page`. The compiler reports *TS2729: Property 'page' is used before its initialization*, and since Playwright 1.65 its test runner follows the same rule, so at runtime `this.page` is `undefined`. Declare the fields and assign them inside the constructor instead — exactly the explicit style shown at the top of this lesson.

## `implements` and `abstract`

`implements` checks that a class matches an interface — it doesn't change the class or add anything:

```ts
interface Navigable {
  goto(): Promise<void>;
}

class SettingsPage implements Navigable {
  constructor(readonly page: Page) {}
  async goto() { await this.page.goto('/settings'); }
}
```

An **abstract class** can share real code and force subclasses to fill in the rest:

```ts
abstract class BasePage {
  constructor(protected readonly page: Page) {}
  abstract readonly path: string;

  async open() {
    await this.page.goto(this.path);
  }
}

class CartPage extends BasePage {
  readonly path = '/cart';
}
```

> [!WARNING] Inheritance chains get brittle
> Deep `BasePage → AuthedPage → AdminPage → …` hierarchies are a common page-object smell. Prefer small classes **composed** of components (a `Header`, a `Table`), and share setup through [Playwright fixtures](#/playwright/fixtures) instead of base classes.

## `this` in callbacks

Class methods lose `this` when passed as callbacks:

```ts
class Counter {
  count = 0;
  inc() { this.count++; }
}
const c = new Counter();
[1, 2].forEach(c.inc);          // ✗ at runtime: Cannot read properties of undefined (reading 'count')
[1, 2].forEach(() => c.inc());  // ✓
```

Define the method as an arrow-function field (`inc = () => { this.count++; }`) if it's meant to be passed around. The full story — including when arrows are the wrong choice — is in [Arrow functions & `this`](#/typescript/arrow-functions-and-this). For accessors, statics, mixins and decorators, continue with [Advanced classes](#/typescript/advanced-classes).

=== quiz
??? What does `private` on a class field do at runtime?
- [ ] Hides the field from other code
- [x] Nothing — it's erased; only the compiler enforces it
- [ ] Converts it into a `#private` field
> TypeScript access modifiers are compile-time only. `#field` is the runtime-private JavaScript feature.

??? Why does Node's built-in TypeScript support reject `constructor(private page: Page) {}`?
- [ ] Node doesn't support classes
- [ ] `private` isn't valid TypeScript
- [x] Parameter properties require generating code (`this.page = page`), so they can't simply be erased
> Node only strips types. Features that emit JavaScript — parameter properties, enums, runtime namespaces — aren't supported.

??? What does `class A implements B` do?
- [ ] Copies B's methods into A
- [x] Checks that A's shape satisfies B; it adds nothing at runtime
- [ ] Makes A extend B's prototype
> `implements` is a compile-time check only.

??? Under `strict`, which field declaration is an error?
- [ ] `items: string[] = [];`
- [x] `title: string;` with no assignment in the constructor
- [ ] `readonly id = crypto.randomUUID();`
> `strictPropertyInitialization` requires every field to be definitely assigned.

=== task Write a page object as a typed class
In a scratch file (no browser needed — this is a typing exercise), write `TodoPage` for the [TodoMVC demo](https://demo.playwright.dev/todomvc).

1. Install types only: `npm install -D @playwright/test`.
2. Fields: `page`, `newTodo` (placeholder `What needs to be done?`), `items` (test id `todo-item`).
3. Methods: `goto()`, `add(text: string)` (fill + press Enter), `count(): Promise<number>`.
4. Use explicit fields, not parameter properties. Run `npx tsc`.
--- expected
```ts
import type { Locator, Page } from '@playwright/test';

export class TodoPage {
  readonly page: Page;
  readonly newTodo: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTodo = page.getByPlaceholder('What needs to be done?');
    this.items = page.getByTestId('todo-item');
  }

  async goto() {
    await this.page.goto('https://demo.playwright.dev/todomvc');
  }

  async add(text: string) {
    await this.newTodo.fill(text);
    await this.newTodo.press('Enter');
  }

  async count(): Promise<number> {
    return this.items.count();
  }
}
```

`npx tsc` passes with `erasableSyntaxOnly` enabled. You'll use this class for real in the [Page Object Model lesson](#/playwright/page-object-model).

=== sources
- [Classes — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [Private class features — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties)
- [erasableSyntaxOnly — TSConfig reference](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly)
- [Page object models — Playwright](https://playwright.dev/docs/pom)
- [Class — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/class/)
- [Classes — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/future-javascript/classes)
- [Classes are Useful — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/classesareuseful)
