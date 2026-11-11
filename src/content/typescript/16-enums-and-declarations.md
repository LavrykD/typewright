---
title: Enums, namespaces & declaration files
module: Real-world TypeScript
description: How enums really compile, why unions are usually better, what namespaces are for today, and how .d.ts files, declare, @types, global augmentation and triple-slash directives describe code TypeScript can't see.
level: Intermediate
minutes: 35
---
## Enums compile to real objects

Unlike almost everything else in TypeScript, an `enum` produces runtime JavaScript.

```ts
enum Status { Idle, Running, Done }      // 0, 1, 2

Status.Running;      // 1
Status[1];           // 'Running' — numeric enums get a reverse mapping
```

Two flavours:

```ts
enum Browser {                           // string enum: readable values, no reverse mapping
  Chromium = 'chromium',
  Firefox = 'firefox',
}
```

> [!PITFALL] Numeric enums accept any `number` variable
> ```ts
> enum Status { Idle, Running, Done }
> function setStatus(s: Status) {}
> setStatus(42);                    // ✗ rejected since TypeScript 5.0 (literal out of range)
> const fromApi: number = 42;
> setStatus(fromApi);               // ✓ compiles — any number is accepted
> ```
> Numeric enums stay assignable from `number` for historical reasons (bit flags), so a value from JSON or an API slips straight through. String enums don't have this hole — but they're nominal: you can't pass the plain string `'chromium'` where `Browser` is expected.

### `const enum`

`const enum` members are **inlined** at each use (`Status.Done` becomes `2`) and no object is emitted. That breaks when another file or tool compiles files one at a time (`isolatedModules`, Babel, esbuild, Node type stripping) — avoid it in application code.

### Prefer a union (plus a const object if you need values)

```ts
// The type
type Browser = 'chromium' | 'firefox' | 'webkit';

// If you also need the values at runtime:
const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
type Browser2 = (typeof BROWSERS)[number];

// Or a named-constants object:
const Browser = { Chromium: 'chromium', Firefox: 'firefox' } as const;
type Browser3 = (typeof Browser)[keyof typeof Browser];   // 'chromium' | 'firefox'
```

Unions are erased (zero runtime cost), work with plain strings from JSON, autocomplete just as well, and are allowed by `erasableSyntaxOnly` and Node's type stripping — enums aren't.

## Namespaces

`namespace` predates ES modules. It groups declarations under one name and compiles to an object:

```ts
namespace Validation {
  export const isEmail = (s: string) => s.includes('@');
}
Validation.isEmail('a@b.c');
```

In modern code, **use modules** (`export` from a file) instead. You'll still meet namespaces in two places: old `.d.ts` files, and *type-only* namespaces that group types (those are erasable and fine). Writing `module Foo {}` for a namespace is deprecated since TypeScript 6 — use `namespace`.

## Declaration files: describing code TypeScript can't see

TypeScript needs types for everything you use. For plain JavaScript (a CDN script, a global injected by your app, an untyped package), you describe it with **ambient declarations** using `declare`. They produce no code — they're a promise that the thing exists at runtime.

```ts title="src/globals.d.ts"
// A global your app sets on window, read in Playwright via page.evaluate
declare global {
  interface Window {
    __APP_STATE__: { user?: { id: string }; ready: boolean };
  }
}
export {};   // makes this file a module so `declare global` is allowed
```

```ts
// In a test — now typed:
const ready = await page.evaluate(() => window.__APP_STATE__.ready);
```

Interfaces **merge**: declaring `interface Window` again adds members to the built-in one. That's called *declaration merging*, and it's how libraries let you extend their types.

### Untyped packages

```ts title="src/vendor.d.ts"
declare module 'legacy-csv' {
  export function parse(text: string): string[][];
}
```

Without such a declaration, importing an untyped package fails with *TS7016: Could not find a declaration file for module 'legacy-csv'.*

### `@types` packages

Most popular untyped libraries have community types on npm under `@types/…` (from the DefinitelyTyped project): `npm i -D @types/node`. Remember from [lesson 1](#/typescript/mental-model) that since TypeScript 6 you list the global ones in `"types"`.

> [!PITFALL] A `.d.ts` file that "doesn't work"
> A declaration file is either a **script** (no top-level `import`/`export`: everything in it is global) or a **module** (has `import`/`export`: nothing leaks out unless you use `declare global`). Adding a single `import` to a global `.d.ts` silently turns it into a module and all its declarations disappear from the global scope. Also make sure the file is matched by `include` in your tsconfig.

## Triple-slash directives

`///` comments at the top of a file are compiler instructions, mostly seen in declaration files:

```ts
/// <reference types="node" />       // pull in a @types package
/// <reference lib="dom" />          // pull in a built-in lib
/// <reference path="./legacy.d.ts" />
```

In application code you rarely need them: `tsconfig.json` (`types`, `lib`, `include`) is the clearer place. TypeScript 6 removed support for `/// <reference no-default-lib="true"/>` and made the `amd-module` directive a no-op.

=== quiz
??? Which of these produces JavaScript at runtime?
- [ ] `type Status = 'idle' | 'done'`
- [x] `enum Status { Idle, Done }`
- [ ] `interface Status { value: string }`
- [ ] `declare const status: string`
> Enums compile to an object (with a reverse mapping for numeric members). Types, interfaces and `declare` are erased.

??? `setStatus(s: Status)` takes a numeric enum with values 0–2. Which call compiles?
```ts
const fromApi: number = 42;
```
- [ ] `setStatus(42)`
- [x] `setStatus(fromApi)`
- [ ] Neither
- [ ] Both
> Since TypeScript 5.0 an out-of-range **literal** is rejected, but any value of type `number` is still accepted — numeric enums are deliberately loose for bit-flag compatibility. String unions don't have this hole.

??? What does `declare global { interface Window { foo: string } }` do?
- [ ] Creates a `window.foo` property at runtime
- [x] Adds `foo` to the existing `Window` type via declaration merging — no runtime code
- [ ] Replaces the built-in `Window` type
- [ ] Nothing unless you also add a triple-slash directive
> Ambient declarations only describe; interfaces with the same name merge.

??? You added `import type { User } from './types'` to the top of `globals.d.ts`, and its global declarations stopped working. Why?
- [ ] Type imports aren't allowed in `.d.ts` files
- [x] A top-level import makes the file a module, so its declarations are no longer global (unless wrapped in `declare global`)
- [ ] The file must be renamed to `.ts`
- [ ] You need `/// <reference path>`
> Script vs module is decided by top-level import/export. Wrap globals in `declare global { … }` in module files.

=== task Replace an enum with a union
1. Paste the starter into `src/env.ts`. Enable `erasableSyntaxOnly` (already on from lesson 1) and run `npx tsc`.
2. Rewrite it with a `const` object + derived union type so it compiles and `node src/env.ts` prints the same thing.
--- starter ts
```ts
enum Env {
  Local = 'local',
  Staging = 'staging',
  Production = 'production',
}

function baseUrl(env: Env): string {
  return env === Env.Production ? 'https://app.example.com' : `https://${env}.example.com`;
}

console.log(baseUrl(Env.Staging));
```
--- expected
The enum fails under `erasableSyntaxOnly`:

```text
error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

A rewrite that compiles and runs directly in Node:

```ts
const Env = { Local: 'local', Staging: 'staging', Production: 'production' } as const;
type Env = (typeof Env)[keyof typeof Env];

function baseUrl(env: Env): string {
  return env === Env.Production ? 'https://app.example.com' : `https://${env}.example.com`;
}

console.log(baseUrl(Env.Staging));   // https://staging.example.com
console.log(baseUrl('local'));       // also allowed — plain strings work
```

=== task Type a global for page.evaluate
In your Playwright lab (`pw-lab`), suppose the app exposes `window.__FEATURE_FLAGS__` as `Record<string, boolean>`.

1. Write a test that reads it with `page.evaluate(() => window.__FEATURE_FLAGS__)`. Run `npx tsc --noEmit` and note the error.
2. Add `tests/globals.d.ts` with a `declare global` block so the error disappears and the result is typed.
--- hint
Remember `export {};` so the file is a module and `declare global` is allowed — and check that your tsconfig's `include` covers the `tests` folder.
--- expected
Before:

```text
error TS2339: Property '__FEATURE_FLAGS__' does not exist on type 'Window & typeof globalThis'.
```

After adding:

```ts
declare global {
  interface Window {
    __FEATURE_FLAGS__: Record<string, boolean>;
  }
}
export {};
```

`npx tsc --noEmit` passes and hovering the `page.evaluate(...)` result shows `Record<string, boolean>`. Nothing changes at runtime — on a page that doesn't set the flags you'd still get `undefined`, which is why the declaration is a promise you must keep.

=== sources
- [Enums — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/enums)
- [Enums — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/enums/)
- [Namespaces — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/project/namespaces)
- [Declaration Files — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/intro/d.ts)
- [Merging and Extension — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/merging-and-extension/)
- [Triple-Slash Directives — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/triple-slash-directives/)
- [Declaration Merging — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [Triple-Slash Directives — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html)
