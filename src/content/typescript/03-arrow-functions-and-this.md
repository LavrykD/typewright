---
title: Arrow functions & `this`
module: Getting started
description: How JavaScript decides what `this` is, why arrow functions capture it, when arrows are the wrong choice, arrow class properties and inheritance, and the object-literal return trap.
level: Foundations
minutes: 30
---
## `this` is decided by the call, not the definition

For a regular `function`, `this` is set by **how it's called**:

| Call | `this` is |
| --- | --- |
| `obj.method()` | `obj` |
| `method()` (plain call, strict mode) | `undefined` |
| `method.call(x)` / `.apply(x)` / `.bind(x)()` | `x` |
| `new Thing()` | the new object |

So the same function can see different `this` values:

```ts
const counter = {
  count: 0,
  inc() { this.count++; },
};

counter.inc();            // ✓ this === counter
const inc = counter.inc;
inc();                    // ✗ TypeError: Cannot read properties of undefined (reading 'count')
```

Modules and classes always run in strict mode, so a "lost" `this` is `undefined` and you get a crash instead of silently touching a global.

## Arrow functions capture `this`

An arrow function has **no `this` of its own** — it uses the `this` of the place where it was written (lexical `this`). It also has no own `arguments`.

```ts
class Timer {
  seconds = 0;

  startBroken() {
    setInterval(function () {
      this.seconds++;          // ✗ `this` is not the Timer here
    }, 1000);
  }

  start() {
    setInterval(() => {
      this.seconds++;          // ✓ arrow uses start()'s `this`
    }, 1000);
  }
}
```

With `noImplicitThis` (part of `strict`), TypeScript reports the broken version: *'this' implicitly has type 'any' because it does not have a type annotation.*

Arrows are also simply shorter:

```ts
const double = (n: number) => n * 2;
const ids = users.map((u) => u.id);
```

## Arrow functions as class properties

When a method will be **passed around** — as an event handler or callback — define it as an arrow-function property so it's bound to the instance:

```ts
class Cart {
  items: string[] = [];
  add = (item: string) => { this.items.push(item); };   // always bound
}

const cart = new Cart();
['mug', 'pen'].forEach(cart.add);   // ✓ works — `this` is the cart
```

If you only ever call it as `cart.add(...)`, a normal method is fine — and better (see below).

> [!WARNING] Trade-offs of arrow properties
> An arrow property is created **per instance** (a normal method lives once on the prototype), it can't be called with `super.add()` from a subclass, and test spies on `Cart.prototype.add` won't see it. Use arrow properties only for functions you hand to someone else.

## When **not** to use an arrow

Some libraries call your callback with a meaningful `this` — for example a DOM `addEventListener` handler (`this` is the element), or Mocha's `function () { this.timeout(5000) }`. If the docs say "`this` is …" inside your callback, use `function`, because an arrow would ignore it.

Need both the library's `this` and the outer one? Save the outer one first:

```ts
const self = this;
element.addEventListener('click', function () {
  self.log(this);   // `this` = element, `self` = the outer object
});
```

## Arrows and inheritance

Because arrow properties aren't on the prototype, a subclass can't reach the parent's version through `super`.

> [!PITFALL] The old "save the parent's arrow" trick no longer type-checks
> Older material suggests copying the parent's arrow into a field before overriding it:
> ```ts
> class Child extends Adder {
>   private superAdd = this.add;          // ✗ TS2729
>   add = (b: number) => this.superAdd(b) * 10;
> }
> ```
> With modern class-field semantics (`useDefineForClassFields`, the default for current targets), TypeScript reports *TS2729: Property 'add' is used before its initialization*. If something must be overridable, make it a **prototype method** and bind it where you pass it:
> ```ts
> class Adder {
>   a: number;
>   constructor(a: number) { this.a = a; }
>   add(b: number) { return this.a + b; }
> }
> class Child extends Adder {
>   override add(b: number) { return super.add(b) * 10; }
> }
> const child = new Child(1);
> [2].map((b) => child.add(b));   // [30] — bind at the call site with an arrow
> ```

## Returning an object literal

```ts
const make = () => { bar: 123 };     // ✗ returns undefined!
const make2 = () => ({ bar: 123 });  // ✓ returns { bar: 123 }
```

In the first line, `{` starts a **function body** and `bar:` is parsed as a *label*, so the function returns nothing. TypeScript happily infers `() => void` — no error. Wrap object literals in parentheses, and annotate the return type of small helpers: with `(): { bar: number } => { bar: 123 }` you get *TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.*

## Typing `this` explicitly

A function can declare the type of `this` as a fake first parameter — erased at runtime:

```ts
function onClick(this: HTMLButtonElement, e: MouseEvent) {
  this.disabled = true;
}
button.addEventListener('click', onClick);   // ✓ checked
onClick(new MouseEvent('click'));            // ✗ The 'this' context of type 'void' is not assignable…
```

## In Playwright

Your test code is almost all arrow functions: `test('…', async ({ page }) => { … })`. Playwright passes everything through the **fixtures argument**, not `this`, so arrows are exactly right. (This is one reason Playwright doesn't use Mocha's `this.timeout()` style — use `test.setTimeout()` instead.)

=== quiz
??? What happens?
```ts
const obj = { n: 1, get() { return this.n; } };
const g = obj.get;
g();
```
- [ ] Returns `1`
- [ ] Returns `undefined`
- [x] Throws, because `this` is `undefined` in a plain call (modules are strict)
- [ ] Returns the global `n`
> `this` comes from the call site. `g()` has no object in front of it, so in strict code `this` is `undefined` and `this.n` throws.

??? Why does an arrow function inside a method see the method's `this`?
- [ ] Arrows bind `this` to the global object
- [x] Arrows have no own `this`; they use the surrounding (lexical) `this`
- [ ] TypeScript inserts `.bind(this)` automatically
- [ ] Arrows always receive the object they were defined in as an argument
> Lexical `this` is the defining feature of arrow functions. The compiler doesn't add anything for modern targets.

??? What does `const f = () => { ok: true }; f()` return?
- [ ] `{ ok: true }`
- [x] `undefined`
- [ ] `true`
- [ ] A syntax error
> The braces are a function body and `ok:` is a label. Use `() => ({ ok: true })`.

??? When is a regular `function` the better choice for a callback?
- [ ] Always — arrows are slower
- [x] When the library deliberately sets `this` for the callback (e.g. DOM handlers, Mocha)
- [ ] When the callback is async
- [ ] When TypeScript can't infer the parameter types
> An arrow would ignore the `this` the library provides. If the docs talk about `this` in your callback, use `function`.

=== task Fix the lost `this`
1. Save the starter as `src/timer.ts` and run `npx tsc`, then `node src/timer.ts`.
2. Fix `tick` so passing it to `setTimeout` works — without changing the `setTimeout` line.
3. Then revert, and fix it the other way: keep `tick` a normal method and change only the `setTimeout` line.
--- starter ts
```ts
class Stopwatch {
  elapsed = 0;
  tick() {
    this.elapsed += 1;
    console.log('elapsed', this.elapsed);
  }
  start() {
    setTimeout(this.tick, 10);
  }
}
new Stopwatch().start();
```
--- expected
`npx tsc` **passes** — TypeScript can't tell that `this.tick` will lose `this` when passed as a value. At runtime it doesn't even crash:

```text
elapsed NaN
```

Node calls timer callbacks with `this` set to its internal `Timeout` object (browsers use `window`), so `this.elapsed` is `undefined` and `undefined + 1` is `NaN`. A lost `this` that *doesn't* throw is the worst kind of bug — silent wrong data.

Fix 1 — arrow property: `tick = () => { this.elapsed += 1; console.log('elapsed', this.elapsed); };`

Fix 2 — bind at the call site: `setTimeout(() => this.tick(), 10);` (or `setTimeout(this.tick.bind(this), 10)`).

Both print:

```text
elapsed 1
```

=== task The object-literal trap
1. Write `const enable = () => { active: true };` and log `enable()`. Run `npx tsc`, then `node` it.
2. Add a return type: `const enable = (): { active: boolean } => { active: true };` and run `npx tsc` again.
3. Fix it.
4. Bonus: try `const toUser = (name: string) => { name, active: true };` and read the error.
--- expected
Step 1 compiles without a single error and prints `undefined` — the braces are a function body and `active:` is a label.

Step 2 turns the silent bug into a compile error:

```text
error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
```

Fixed: `const enable = (): { active: boolean } => ({ active: true });`

The bonus version doesn't even parse — `name, active: true` isn't a valid statement inside a block:

```text
error TS1005: ';' expected.
```

Lesson: annotate return types of small helpers, and wrap returned object literals in `( )`.

=== sources
- [Arrow Functions — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/future-javascript/arrow-functions)
- [this — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/this)
- [Class: this — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/class/)
- [Arrow function expressions — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [this — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [Declaring this in a function — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html#declaring-this-in-a-function)
