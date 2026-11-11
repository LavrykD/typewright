---
title: How TypeScript actually works
module: Getting started
description: The one mental model that explains 80% of TypeScript's surprises — types exist only at compile time — plus a modern setup with TypeScript 7 and Node.
level: Foundations
minutes: 20
---
## Types are erased

TypeScript is JavaScript **plus a type checker**. The checker reads your code, reports problems, and then the types are *removed*. What runs — in Node, in the browser, in a Playwright worker — is plain JavaScript.

```ts title="greet.ts"
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

```js title="what actually runs"
function greet(name) {
  return `Hello, ${name}`;
}
```

That single fact explains a lot:

- Types can't change runtime behaviour. `name: string` doesn't *convert* or *validate* anything.
- You can't ask "is this a `User`?" at runtime with a type — `User` doesn't exist any more. You check *values* (`typeof`, `in`, `instanceof`) instead. That's what the [narrowing lesson](#/typescript/narrowing) is about.
- Data from the outside world (`JSON.parse`, `fetch`, `process.env`) is whatever it is. A type annotation on it is a *promise you're making*, not a check.
- All of JavaScript's runtime quirks are still there — see [JavaScript essentials TypeScript assumes](#/typescript/javascript-essentials).

> [!PITFALL] "But I typed it as `User`!"
> Annotating untrusted data doesn't validate it. `const user: User = await res.json()` compiles because `res.json()` returns `any` — the compiler simply trusts you. If the API sends `{ name: null }`, your code crashes at runtime with no compile error. Treat external data as `unknown` and check it (by hand or with a schema library) before you trust its shape.

## The checker vs. the emitter

`tsc` historically did two jobs: **check** types and **emit** JavaScript. Modern setups often split them:

| Job | Who does it today |
| --- | --- |
| Type checking | `tsc --noEmit` (in your editor and on CI) |
| Removing types to run code | Node (type stripping), Vite/esbuild, Playwright's built-in transform |

This is why your tests can *run* while your editor shows red squiggles: the runner just strips types, it never checks them. Run `npx tsc --noEmit` on CI so type errors actually fail the build — the Playwright docs recommend exactly this.

> [!NOTE] TypeScript 7 is the native compiler
> TypeScript 7.0 (July 2026) is a port of the compiler to native code — typically around 10× faster on full builds. The *language* is the same; `npm install -D typescript` now installs the native `tsc`. TypeScript 6.0 was the bridge release that changed defaults and deprecated old options to prepare for it.

> [!PITFALL] Tools that still need TypeScript 6
> The TypeScript 7 npm package ships the `tsc` command but **no JavaScript API** — `import ts from 'typescript'` gives you nothing to call. Tools built on that API — most notably **typescript-eslint** (its type-aware rules), but also ts-morph and older ts-node setups — still require TypeScript 6. Installing them next to TypeScript 7 fails with `npm error ERESOLVE … peer typescript@">=4.8.4 <6.1.0"`. Until your tools support 7, pin the project to 6: `npm install -D typescript@6`. The language you write is the same.

## Running TypeScript directly in Node

Current Node versions (22.18+, 23.6+, and stable since 24.12) run `.ts` files directly by **stripping types** — no build step:

```bash
node src/hello.ts
```

Node only *erases* syntax; it never type-checks, and it refuses syntax that would need generated JavaScript: `enum`, `namespace` with runtime code, and constructor parameter properties. The `erasableSyntaxOnly` compiler option makes `tsc` flag those for you.

## A modern starter setup

:::steps
### Create a project
```bash
mkdir ts-lab && cd ts-lab
npm init -y
npm pkg set type=module
npm install -D typescript @types/node
```
### Add a tsconfig.json
```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "rewriteRelativeImportExtensions": true,
    "types": ["node"]
  }
}
```
### Write, check, run
```bash
npx tsc            # type-check only (noEmit)
node src/hello.ts  # run it
```
:::

> [!PITFALL] `Cannot find name 'process'` after upgrading
> Since TypeScript 6.0, `types` defaults to `[]` — TypeScript no longer automatically loads every `@types/*` package in `node_modules`. If globals like `process`, `__dirname` or `describe` suddenly "don't exist", add the packages you need explicitly: `"types": ["node"]`.

## `strict` is not optional

`strict` turns on a family of checks — most importantly `strictNullChecks`, which makes `null` and `undefined` their own types instead of silently fitting everywhere. Since TypeScript 6.0 it's **on by default**. Without it, TypeScript can't catch the single most common JavaScript crash: `Cannot read properties of undefined`.

```ts title="with strictNullChecks"
function firstChar(s: string | undefined) {
  return s.charAt(0);
  //     ^ 's' is possibly 'undefined'.
}
```

> [!TIP]
> `noUncheckedIndexedAccess` is *not* part of `strict`, but it's worth enabling: it makes `arr[i]` and `record[key]` include `| undefined`, which is the honest truth.

=== quiz
??? What happens to the type annotations in your code when it runs?
- [ ] They become runtime checks that throw if the value is the wrong type
- [x] They're erased — the code that runs is plain JavaScript
- [ ] They're kept as comments for debugging
- [ ] Node checks them before executing
> Types exist only for the checker. Every runner (Node type stripping, Vite, Playwright) removes them, which is why types can't validate data at runtime.

??? Your Playwright tests run fine, but `npx tsc --noEmit` reports 12 errors. How is that possible?
- [ ] Playwright uses a different TypeScript version that is more lenient
- [ ] `tsc` is wrong; the tests passing proves the types are correct
- [x] The test runner only strips types; it never type-checks
- [ ] Errors are only reported in strict mode
> Runners transform TS to JS without checking. Type errors only fail your build if something runs `tsc` — which is why you add `tsc --noEmit` to CI.

??? Which of these can Node's built-in type stripping run without extra tooling?
```ts
// A
enum Color { Red, Green }
// B
type Color = 'red' | 'green';
// C
class User { constructor(private name: string) {} }
```
- [ ] A and B
- [x] Only B
- [ ] B and C
- [ ] All three
> Enums and parameter properties (`private name` in a constructor) generate JavaScript code, so they can't simply be erased. A union of string literals is pure type information. Turn on `erasableSyntaxOnly` to get compile errors for A and C.

??? After upgrading to TypeScript 6+, `process.env` shows "Cannot find name 'process'". What's the fix?
- [ ] Downgrade to TypeScript 5
- [ ] Add `// @ts-ignore` above each usage
- [x] Add `"types": ["node"]` to compilerOptions (and make sure `@types/node` is installed)
- [ ] Turn off `strict`
> TypeScript 6 changed the `types` default to `[]`, so global type packages are no longer auto-included. You list the ones you need.

??? `const user: User = await res.json();` — what does the annotation guarantee?
- [ ] That the response body matches `User`, or an error is thrown
- [x] Nothing at runtime — it's an unchecked promise from you to the compiler
- [ ] That `user` is not `null`
> `res.json()` returns `any`, which is assignable to anything. The compiler trusts you. Validate external data before relying on its shape.

=== task Set up a TypeScript lab project
Create a small project you'll reuse for every TypeScript task in this course.

1. Follow the three steps in **A modern starter setup** above.
2. Create `src/hello.ts` using the starter code.
3. Run `npx tsc`, then `node src/hello.ts`.
4. Now break it: change the call to `greet(42)` and run both commands again.
--- starter ts
```ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('Playwright'));
```
--- hint
If Node prints a warning about module type, check that `package.json` contains `"type": "module"` (the `npm pkg set type=module` step).
--- expected
Before the change, `npx tsc` prints **nothing** (no output means no errors) and Node prints:

```text
Hello, Playwright!
```

After changing it to `greet(42)`:

```text
src/hello.ts:5:19 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

…but `node src/hello.ts` **still runs** and prints `Hello, 42!`. That's the whole lesson in one experiment: running and checking are separate.

=== task Prove that types don't validate data
1. In `src/trust.ts`, paste the starter code.
2. Run it with `node src/trust.ts`.
3. Then change the declaration to `const user: unknown = JSON.parse(raw);` and fix every compile error by checking the value before using it.
--- starter ts
```ts
type User = { name: string; email: string };

const raw = '{"name": null}';
const user: User = JSON.parse(raw);

console.log(user.name.toUpperCase());
```
--- hint
After switching to `unknown`, you need something like `typeof user === 'object' && user !== null && 'name' in user && typeof user.name === 'string'` before you can call `.toUpperCase()`.
--- expected
The first version **compiles cleanly** but crashes at runtime:

```text
TypeError: Cannot read properties of null (reading 'toUpperCase')
```

With `unknown`, `tsc` refuses `user.name` until you've proven `user` is an object with a string `name`. Your fixed version prints nothing (or a fallback message you chose) instead of crashing.

=== sources
- [TypeScript for the New Programmer — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
- [Announcing TypeScript 6.0 — TypeScript blog](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [Modules: TypeScript — Node.js documentation](https://nodejs.org/api/typescript.html)
- [TSConfig reference: strict](https://www.typescriptlang.org/tsconfig/#strict)
- [Best practices: lint your tests — Playwright](https://playwright.dev/docs/best-practices#lint-your-tests)
- [TypeScript Introduction — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/typescript-introduction/)
- [Why TypeScript — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/getting-started/why-typescript)
- [TypeScript's Type System — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system)
