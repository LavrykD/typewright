---
title: Modules & tsconfig without tears
module: Real-world TypeScript
description: ESM vs CommonJS, module and moduleResolution, import type and verbatimModuleSyntax, file extensions, and the tsconfig options that actually matter.
level: Intermediate
minutes: 30
---
## Two module systems

JavaScript has two module systems, and most "can't find module" pain comes from mixing them:

| | ES modules (ESM) | CommonJS (CJS) |
| --- | --- | --- |
| Syntax | `import` / `export` | `require()` / `module.exports` |
| In Node, chosen by | `"type": "module"` in package.json, or `.mjs` / `.mts` | default, or `.cjs` / `.cts` |
| Top-level `await` | ✓ | ✗ |
| `__dirname` | ✗ (use `import.meta.dirname`) | ✓ |

You can write `import` syntax in a `.ts` file and still end up as CommonJS — TypeScript decides based on `module` and your package.json.

## `module` and `moduleResolution`: pick a lane

You don't need to memorise every combination. There are two good presets:

```json title="Code that runs in Node (scripts, servers, tools)"
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
```

```json title="Code that goes through a bundler (Vite, webpack, etc.)"
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

`nodenext` models exactly what Node does — including **requiring file extensions** on relative imports in ESM. `bundler` models what bundlers allow (extensionless imports, `exports` maps).

> [!PITFALL] "Relative import paths need explicit file extensions"
> Under `nodenext` with ESM, `import { x } from './utils'` fails: *Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.* Node itself requires the extension. Write `./utils.js` (yes, `.js` — the file it will be at runtime), or, when running `.ts` directly, write `./utils.ts` with `rewriteRelativeImportExtensions` or `allowImportingTsExtensions`.

> [!WARNING] Deprecated in TypeScript 6
> `moduleResolution: "node"` (a.k.a. `node10`) is deprecated, `classic` is removed, and `baseUrl` no longer acts as a lookup root. Old tutorials use all three. Use `nodenext` or `bundler`, and use `paths` (or package.json `imports` such as `#/utils`) for aliases.

## `import type` and `verbatimModuleSyntax`

When you import something only as a type, say so:

```ts
import type { Page, Locator } from '@playwright/test';  // erased completely
import { test, expect, type TestInfo } from '@playwright/test';
```

With `verbatimModuleSyntax: true`, TypeScript **requires** `type` on type-only imports. The rule becomes simple: an import without `type` stays in the output; one with `type` disappears. This matters because type-stripping runtimes (Node, esbuild) can't look at other files to guess whether an import is a type.

## The tsconfig options worth knowing

| Option | What it does | Recommendation |
| --- | --- | --- |
| `strict` | Enables the strict family (null checks, implicit any, …). Default `true` since 6.0 | Always on |
| `noUncheckedIndexedAccess` | `arr[i]` is `T \| undefined` | Turn on for new code |
| `exactOptionalPropertyTypes` | `x?: string` doesn't accept an explicit `undefined` | Optional; strict but noisy |
| `noEmit` | Type-check only, no output | When a bundler/runner handles JS |
| `skipLibCheck` | Don't check `.d.ts` files in node_modules | On — saves time, avoids others' errors |
| `types` | Which global `@types` packages to load. Default `[]` since 6.0 | List what you use: `["node"]` |
| `target` / `lib` | Which JS syntax to output / which built-in APIs exist | `esnext` or a recent `es20xx` |
| `isolatedModules` | Each file must be compilable alone | Implied by `verbatimModuleSyntax` use cases |
| `erasableSyntaxOnly` | Ban enums, namespaces, parameter properties | On if running TS directly in Node |

> [!TIP] See the effective config
> `npx tsc --showConfig` prints the final, merged configuration — including everything inherited through `extends`. It's the fastest way to answer "why is this option on?".

## Path aliases

```json
{
  "compilerOptions": {
    "paths": { "@pages/*": ["./tests/pages/*"] }
  }
}
```

> [!PITFALL] `paths` only affects type checking
> `paths` tells the *type checker* how to resolve imports; it doesn't rewrite them. Whatever runs your code must understand the alias too. Playwright's test runner and Vite read `paths` for you, but plain Node does not — there, use package.json `"imports"` (`#pages/*`) which Node supports natively.

=== quiz
??? Under `module: "nodenext"` in an ESM package, which import works?
- [ ] `import { sum } from './math'`
- [x] `import { sum } from './math.js'`
- [ ] `import { sum } from 'math'`
> Node's ESM loader requires full relative paths with extensions, and `nodenext` enforces the same rule. You write the extension of the file that will exist at runtime.

??? What does `verbatimModuleSyntax` change?
- [ ] It converts all imports to require()
- [x] Imports are kept or dropped exactly as written — type-only imports must use `import type`
- [ ] It disables type checking of imports
> The rule becomes predictable: no `type` keyword → the import stays in the JavaScript output.

??? Which `moduleResolution` should a Vite app use?
- [ ] `node`
- [ ] `classic`
- [x] `bundler`
- [ ] `nodenext`
> `bundler` matches what bundlers allow. `node`/`node10` is deprecated, and `classic` is removed in TypeScript 6.

??? You added `"paths": { "@utils/*": ["./src/utils/*"] }` and `node src/main.ts` fails to find `@utils/date`. Why?
- [ ] The `paths` syntax is wrong
- [x] `paths` only guides the type checker; Node doesn't read tsconfig
- [ ] You need `baseUrl` as well
> Node resolves modules itself. Use package.json `imports` for runtime-supported aliases.

=== task Diagnose a module setup
In your `ts-lab` project:

1. Create `src/math.ts` exporting `sum(a: number, b: number)`.
2. In `src/main.ts`, `import { sum } from './math';` and log `sum(2, 3)`.
3. Run `npx tsc` and read the error.
4. Fix the import for your setup (you have `rewriteRelativeImportExtensions` enabled from lesson 1) and run with `node src/main.ts`.
5. Run `npx tsc --showConfig` and find `strict` and `types` in the output.
--- expected
Step 3 reports:

```text
error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './math.js'?
```

With `import { sum } from './math.ts';` both `npx tsc` and `node src/main.ts` succeed, printing `5`.

`--showConfig` prints the merged JSON with `"strict": true` and `"types": ["node"]`.

=== task Type-only imports
1. Turn on `verbatimModuleSyntax` (it's already in the lesson 1 config).
2. Create `src/types.ts` exporting `export type User = { id: number }`.
3. In another file, write `import { User } from './types.ts';` and run `npx tsc`.
4. Fix it.
--- expected
```text
error TS1484: 'User' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

Fixed with `import type { User } from './types.ts';`. If you ran the broken version with Node, it would fail at runtime with a `SyntaxError` saying the module doesn't provide an export named `User` — because types don't exist at runtime.

=== sources
- [Modules — Theory — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- [Choosing compiler options — TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [verbatimModuleSyntax — TSConfig reference](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax)
- [Announcing TypeScript 6.0 — TypeScript blog](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [Modules: TypeScript — Node.js documentation](https://nodejs.org/api/typescript.html)
- [Modules — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/project/modules)
- [File Module Details — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/project/modules/external-modules)
- [Avoid Export Default — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/defaultisbad)
- [Barrel — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/barrel)
