---
title: Дженерики без страху
module: Потужність рівня типів
description: Дженерики як «параметри типів», обмеження через extends, keyof, значення за замовчуванням, як виведення обирає T — і помилки, через які дженерики стають марними.
level: Intermediate
minutes: 35
---
## Дженерик — це параметр для типу

Параметр функції дає змогу тому, хто викликає, обрати *значення*. **Параметр типу** дає змогу тому, хто викликає (або механізму виведення), обрати *тип*:

```ts
function identity<T>(value: T): T {
  return value;
}

const n = identity(42);        // T = number
const s = identity('hi');      // T = string
```

Без дженериків довелося б обирати між `any` (тип втрачається) і окремою функцією для кожного типу. `T` пов'язує тип входу з типом виходу — **увесь сенс саме в цьому зв'язку**.

> [!TIP] Лакмусовий тест
> Параметр типу має з'являтися **щонайменше двічі** — зазвичай раз у параметрі й раз у типі повернення. Якщо `T` трапляється лише один раз, дженерик, найімовірніше, не потрібен: `function log<T>(x: T): void` — це просто `function log(x: unknown): void`.

## Обмеження: `extends`

Іноді `T` мусить мати певні властивості. Обмежте його:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest('abc', 'de');        // string
longest([1, 2], [1, 2, 3]);  // number[]
longest(10, 20);             // ✗ number doesn't have 'length'
```

## `keyof` і безпечний доступ до властивостей

`keyof T` — це об'єднання ключів `T`. Поєднайте його з другим параметром типу — і отримаєте ідеально типізований геттер:

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Ada', age: 36 };
getProp(user, 'age');    // number
getProp(user, 'email');  // ✗ Argument of type '"email"' is not assignable to parameter of type '"name" | "age"'.
```

`T[K]` — це **тип індексованого доступу**: «тип властивості `K` у `T`».

## Дженерик-типи та значення за замовчуванням

Типи теж бувають дженериками:

```ts
type ApiResponse<TData, TError = string> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

type UserResponse = ApiResponse<{ id: number }>;               // TError = string
type ValidationResponse = ApiResponse<null, { field: string }[]>;
```

## Як виведення обирає `T`

TypeScript виводить аргументи типів з аргументів, які ви передаєте. Іноді він обирає щось ширше або вужче, ніж ви хотіли:

```ts
function makeList<T>(items: T[]) { return items; }

makeList([1, 'a']);           // T = string | number — об'єднання, нормально
makeList<number>([1, 'a']);   // ✗ явний аргумент типу: 'a' відхилено
```

> [!PITFALL] «Type 'X' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype»
> Ви натрапите на це, повертаючи конкретне значення там, де очікується `T`:
> ```ts
> function withDefault<T extends { retries: number }>(opts: Partial<T>): T {
>   return { retries: 3, ...opts };  // ✗
> }
> ```
> `T` обирає той, хто викликає. Якщо він обере `{ retries: number; name: string }`, у вашого об'єкта не буде `name`. Повернути можна лише той `T`, який вам *передали* (або збудований із нього). Зазвичай рішення — не робити функцію дженериком і повертати конкретний тип, або приймати повний `T` як запасний параметр.

## `const`-параметри типів і `NoInfer`

Два сучасні інструменти:

```ts
// `const T` виводить літеральні типи, наче той, хто викликає, написав `as const`
function routes<const T extends readonly string[]>(paths: T) { return paths; }
const r = routes(['/home', '/login']);   // readonly ["/home", "/login"]

// `NoInfer<T>` не дає параметру впливати на виведення
function pick<T extends string>(options: T[], fallback: NoInfer<T>) { return fallback; }
pick(['red', 'green'], 'blue');   // ✗ "blue" немає серед варіантів
```

## Дженерики, якими ви вже користуєтеся

Ви весь час користувалися дженериками: `Array<T>`, `Promise<T>`, `Map<K, V>`, `Record<K, V>`, `useState<T>` з React, а в Playwright — `test.extend<Fixtures>()`, який ви напишете в [уроці про фікстури](#/playwright/fixtures).

=== quiz
??? Що дає `identity<T>(value: T): T` такого, чого не дає `identity(value: any): any`?
- [ ] Швидшу роботу під час виконання
- [x] Тип повернення збігається з типом аргументу в кожному місці виклику
- [ ] Перевірку типу `value` під час виконання
- [ ] Нічого; вони рівнозначні
> Дженерики пов'язують типи входу й виходу. `any` викидає інформацію про тип.

??? Чи корисний цей дженерик?
```ts
function logValue<T>(value: T): void { console.log(value); }
```
- [ ] Так — він безпечно приймає будь-який тип
- [x] Ні — `T` трапляється лише раз; `value: unknown` робить те саме
- [ ] Ні — дженерики не можуть повертати void
> Якщо параметр типу використано лише один раз, він нічого не пов'язує. Обирайте `unknown`.

??? Який тип повернення в `getProp(user, 'age')`?
```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
const user = { name: 'Ada', age: 36 };
```
- [ ] `string | number`
- [x] `number`
- [ ] `T[K]`
- [ ] `unknown`
> `K` виводиться як літерал `'age'`, тож `T[K]` розв'язується в `number`.

??? Чому повернення `{ retries: 3 }` як `T` є помилкою, коли `T extends { retries: number }`?
- [ ] Бо `retries` має бути необов'язковою
- [x] `T` обирає той, хто викликає, і цей тип може вимагати більше властивостей, ніж має ваш об'єкт
- [ ] Дженерик-функції не можуть повертати об'єкти
> Обмеження — це нижня межа. `T` може бути значно багатшим типом, тож зібраний вручну об'єкт не обов'язково є `T`.

=== task Напишіть типізований `groupBy`
Створіть `src/group-by.ts`.

1. Реалізуйте `groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Record<K, T[]>`.
2. Згрупуйте з її допомогою результати тестів за `status`.
3. Наведіть курсор на результат і переконайтеся, що ключі — літеральні статуси.
--- starter ts
```ts
type Result = { title: string; status: 'passed' | 'failed' | 'skipped' };

const results: Result[] = [
  { title: 'login', status: 'passed' },
  { title: 'checkout', status: 'failed' },
  { title: 'search', status: 'passed' },
];

// export function groupBy...

const byStatus = groupBy(results, (r) => r.status);
console.log(byStatus.passed.map((r) => r.title));
```
--- hint
Почніть з `const out = {} as Record<K, T[]>;`, далі для кожного елемента: `(out[key] ??= []).push(item);`. З `noUncheckedIndexedAccess` замість цього може знадобитися тип повернення `Partial<Record<K, T[]>>` — він чесніший, бо статусу без жодного елемента серед ключів не буде.
--- expected
```ts
export function groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Partial<Record<K, T[]>> {
  const out: Partial<Record<K, T[]>> = {};
  for (const item of items) (out[getKey(item)] ??= []).push(item);
  return out;
}
```

При наведенні на `byStatus` видно ключі `passed | failed | skipped`. Запуск друкує:

```text
[ 'login', 'search' ]
```

(З типом повернення `Partial` ви напишете `byStatus.passed?.map(…)` — і TypeScript має рацію: у цих даних `skipped` немає.)

=== task Типізований emitter подій
Зробіть так, щоб `on` і `emit` відхиляли неправильні назви подій і неправильні дані.
--- starter ts
```ts
type Events = {
  testStarted: { title: string };
  testFinished: { title: string; ok: boolean };
};

class Emitter<E> {
  private handlers: { [K in keyof E]?: ((payload: E[K]) => void)[] } = {};

  on(/* event, handler */) {}
  emit(/* event, payload */) {}
}

const bus = new Emitter<Events>();
bus.on('testFinished', (p) => console.log(p.title, p.ok));
bus.emit('testFinished', { title: 'login', ok: true });
bus.emit('testFinished', { title: 'login' });     // має бути помилка
bus.emit('testCrashed', {});                       // має бути помилка
```
--- hint
`on<K extends keyof E>(event: K, handler: (payload: E[K]) => void)` — така сама форма підходить і для `emit`.
--- expected
```ts
on<K extends keyof E>(event: K, handler: (payload: E[K]) => void) {
  (this.handlers[event] ??= []).push(handler);
}
emit<K extends keyof E>(event: K, payload: E[K]) {
  this.handlers[event]?.forEach((h) => h(payload));
}
```

`npx tsc` показує рівно дві помилки: `Property 'ok' is missing…` для другого `emit` і `Argument of type '"testCrashed"' is not assignable to parameter of type 'keyof Events'` для третього. Усередині обробника `on` тип `p` виводиться як `{ title: string; ok: boolean }` без жодної анотації.

=== sources
- [Generics — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Keyof Type Operator — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [Indexed Access Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [const type parameters — TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#const-type-parameters)
- [NoInfer utility type — TypeScript 5.4 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type)
- [Generics — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/generics/)
- [Generics — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/generics)
