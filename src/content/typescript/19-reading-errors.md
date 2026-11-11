---
title: Reading TypeScript errors
module: Real-world TypeScript
description: How to read a TypeScript error from the top down, what the most common error codes really mean, and a calm routine for fixing errors instead of silencing them.
level: Foundations
minutes: 25
---
## Two parts of every error

A TypeScript error has a **code** and a **message**, and the message is often a chain:

```text
src/run.ts(14,5): error TS2345: Argument of type '{ name: () => string; retries: number; browser: { name: "chromium"; headless: boolean; }; }' is not assignable to parameter of type 'TestConfig'.
  Types of property 'name' are incompatible.
    Type '() => string' is not assignable to type 'string'.
```

- **`src/run.ts(14,5)`** — file, line, column.
- **`TS2345`** — the error code. Useful for searching; it tells you the *category* of problem.
- **The first line** — the summary: *what* failed (an argument doesn't fit a parameter).
- **Each indented line** answers *"why?"* about the line above it.

## Read it top-down, act on the bottom

The bottom of the chain is usually the root cause. In the example:

1. The config object doesn't fit `TestConfig` — *why?*
2. Its `name` property has the wrong type — *why?*
3. It's a **function** `() => string`, but a `string` is expected.

So the fix is obvious once you reach the last line: somewhere you wrote `name: getName` instead of `name: getName()`.

> [!TIP] Hover, don't squint
> In VS Code, hover the red squiggle: you get the full chain, nicely formatted. The **Problems** panel lists all errors in the project. And `npx tsc --noEmit --pretty` prints colourised, multi-line errors in the terminal (pretty output is the default in an interactive terminal).

## The errors you'll see most

| Code | Message (shortened) | Usually means |
| --- | --- | --- |
| TS2322 | Type 'X' is not assignable to type 'Y' | an assignment or return value has the wrong type |
| TS2345 | Argument of type 'X' is not assignable to parameter of type 'Y' | same, for a function argument |
| TS2339 | Property 'x' does not exist on type 'Y' | typo, or you need to narrow a union first |
| TS2741 | Property 'x' is missing in type … but required in type 'Y' | an object is missing a required field |
| TS2353 | Object literal may only specify known properties | an extra/misspelled property in a fresh literal |
| TS18048 / TS2532 | 'x' is possibly 'undefined' | handle the `undefined` case (narrow, `?.`, `??`) |
| TS7006 | Parameter 'x' implicitly has an 'any' type | add a parameter type |
| TS2307 | Cannot find module 'x' | wrong path, missing package, or missing extension |
| TS7016 | Could not find a declaration file for module 'x' | untyped package — install `@types/x` or declare it |
| TS2769 | No overload matches this call | read each overload's sub-error to see the closest match |
| TS1484 | 'X' is a type and must be imported using a type-only import | use `import type` (`verbatimModuleSyntax`) |
| TS2835 | Relative import paths need explicit file extensions | add `.js` / `.ts` under `nodenext` |

> [!PITFALL] The error is reported where the types meet, not where the bug is
> TypeScript reports a mismatch at the place where two types are compared — often a function call far from the real mistake. In the example the error points at `run(config)`, but the bug is where `config` was built. When the reported line looks fine, follow the types **backwards** (hover the variables) to where the wrong value came from.

## Literal unions make errors precise

```text
src/run.ts(16,41): error TS2322: Type '"webkit"' is not assignable to type '"chromium" | "firefox"'.
```

When a property is typed as a union of string literals, the error lists exactly what's allowed — one of the best reasons to prefer literal unions over `string`.

## A routine for fixing errors

:::steps
### Fix the first error first
Errors cascade: one wrong type early can produce ten errors later. Fix from the top of the list and re-run.
### Read to the bottom of the chain
The last indented line is the root cause. Ask "why?" at each level until it makes sense.
### Hover both sides
Check the actual type of the value and the expected type. Inference often produced something wider (`string`) or narrower (`never`) than you thought.
### Fix the value or the type — not the checker
Change the code or correct the type. Avoid `as`, `!`, `any` and `@ts-ignore` unless you can explain *why* the compiler is wrong.
:::

> [!WARNING] `@ts-ignore` vs. `@ts-expect-error`
> If you truly must silence an error, prefer `// @ts-expect-error <reason>`: it **fails** when the error goes away, so the suppression can't outlive the problem. `@ts-ignore` stays silently forever and also hides any *new* error on that line.

=== quiz
??? In a multi-line error, where is the root cause usually described?
- [ ] In the first line
- [x] In the last (most indented) line
- [ ] In the error code
- [ ] In the file name and column
> The first line says what failed; each nested line explains why; the bottom is usually the actual mismatch.

??? `TS2339: Property 'error' does not exist on type 'Result'` where `Result` is a union. Most likely fix?
- [ ] Add `as any`
- [x] Narrow the union first (e.g. check the discriminant), then access `error`
- [ ] Mark `error` optional on every member
- [ ] Turn off `strict`
> On a union you can only access properties that exist on every member. Narrow to the member that has `error`.

??? Why prefer `@ts-expect-error` over `@ts-ignore`?
- [ ] It's faster to compile
- [x] It reports an error itself when the suppressed error no longer exists, so stale suppressions get noticed
- [ ] It works on multiple lines
- [ ] It's required by `strict`
> `@ts-expect-error` is self-cleaning: once the underlying issue is fixed, it complains, prompting you to remove it.

??? The error points at `run(config)`, which looks correct. What should you do?
- [ ] Add `as TestConfig` to the call
- [x] Hover `config` and follow its type back to where the wrong value was created
- [ ] Restart the TypeScript server
- [ ] Delete `node_modules`
> Errors appear where types are compared. The real bug is often where the value was built.

=== task Decode an error chain
Paste the starter into `src/decode.ts` and run `npx tsc`. For each error, write down (as a comment) the root-cause line of the chain and the one-line fix — then apply the fixes until `npx tsc` passes.
--- starter ts
```ts
type TestConfig = {
  name: string;
  retries: number;
  browser: { name: 'chromium' | 'firefox'; headless: boolean };
};
function getName() { return 'login'; }
function run(config: TestConfig) { console.log(config.name); }

const config = {
  name: getName,
  retries: 2,
  browser: { name: 'chromium' as const, headless: true },
};
run(config);

run({ name: 'a', retries: 1, browser: { name: 'webkit', headless: true } });

const missing: TestConfig = { name: 'x', retries: 1 };
```
--- expected
`npx tsc` reports three errors:

```text
error TS2345: Argument of type '{ name: () => string; … }' is not assignable to parameter of type 'TestConfig'.
  Types of property 'name' are incompatible.
    Type '() => string' is not assignable to type 'string'.
error TS2322: Type '"webkit"' is not assignable to type '"chromium" | "firefox"'.
error TS2741: Property 'browser' is missing in type '{ name: string; retries: number; }' but required in type 'TestConfig'.
```

Fixes: call the function (`name: getName()`), use an allowed browser (`'firefox'`) — or widen the union if WebKit should be allowed — and add the missing `browser` property. Then `npx tsc` prints nothing.

=== task Make suppressions honest
1. Add `const n: number = 'oops';` with `// @ts-ignore` above it. Run `npx tsc`.
2. Fix the value to `1`. Run again — note nothing tells you the comment is now useless.
3. Replace it with `// @ts-expect-error demo` and run again.
--- expected
With `@ts-ignore`, both runs are silent — the stale comment would stay forever.

With `@ts-expect-error` above a line that has **no** error any more:

```text
error TS2578: Unused '@ts-expect-error' directive.
```

That's the point: the suppression reminds you to delete it once the problem is gone.

=== sources
- [Interpreting Errors — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/main/interpreting-errors)
- [Common Errors — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main/common-errors)
- [Errors in TypeScript — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main)
- [// @ts-expect-error comments — TypeScript 3.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#-ts-expect-error-comments)
- [pretty — TSConfig reference](https://www.typescriptlang.org/tsconfig/#pretty)
