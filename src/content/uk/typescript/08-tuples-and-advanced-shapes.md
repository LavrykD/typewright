---
title: Кортежі, перетини та рекурсивні типи
module: Базові типи
description: Іменовані, необов'язкові й варіативні кортежі, перетини (і коли вони схлопуються в never), рекурсивні типи на кшталт JSON і дерев, а також пастки з типами-обгортками String, Object і {}.
level: Intermediate
minutes: 30
---
## Кортежі: масиви з фіксованою формою

Кортеж фіксує **довжину** і **тип на кожній позиції**:

```ts
type Point = [number, number];
const p: Point = [10, 20];
const [x, y] = p;           // обидва number
```

### Іменовані та необов'язкові елементи

Мітки документують, що означає кожна позиція (поведінку вони не змінюють), а `?` робить завершальні елементи необов'язковими:

```ts
type Range = [start: number, end?: number];
const all: Range = [0];
const page: Range = [0, 50];

type Hook = (...args: [name: string, timeoutMs?: number]) => void;   // мітки видно в підказках
```

### Незмінні (readonly) кортежі

```ts
function area(size: readonly [width: number, height: number]) {
  return size[0] * size[1];
}
area([2, 3]);
const fixed = [1, 2] as const;      // readonly [1, 2]
```

### Варіативні кортежі

Spread у типах кортежів може бути дженериком і стояти будь-де, тож можна типізувати «перший елемент + решта»:

```ts
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
type AB = Concat<[1, 2], ['a']>;              // [1, 2, "a"]

function tail<T extends unknown[]>(arr: readonly [unknown, ...T]): T {
  return arr.slice(1) as T;
}
const rest = tail([1, 'a', true] as const);   // ["a", true] (readonly-елементи)
```

> [!PITFALL] Масиви самі по собі не стають кортежами
> `const pair = ['age', 42]` виводиться як `(string | number)[]` — будь-якої довжини й у будь-якому порядку. Кортеж ви отримаєте лише з анотацією (`: [string, number]`), через `as const` або типом повернення функції. Якщо помічник повертає `[value, error]`, анотуйте тип повернення — інакше кожен, хто викликає, отримає «розмитий» тип масиву.

## Перетини: «і те, і інше одночасно»

`A & B` означає, що значення має задовольняти **обидва** типи. Для об'єктних типів це «усі властивості кожного»:

```ts
type WithId = { id: string };
type WithTimestamps = { createdAt: Date; updatedAt: Date };
type Entity = WithId & WithTimestamps;      // id, createdAt, updatedAt
```

Використовуйте перетини, щоб складати невеликі типи (і з дженериками: `T & { id: string }`). Для іменованої ієрархії обирайте `interface … extends` — розширення чітко повідомляє про конфлікти, а перетини мовчки дають `never`:

> [!PITFALL] Конфліктні перетини стають `never`
> ```ts
> type A = { status: string };
> type B = { status: number };
> type AB = A & B;            // status: string & number → never
> ```
> Жодне значення не може бути водночас рядком і числом, тож `status` стає `never`, і кожне присвоєння падає із заплутаним повідомленням. З `interface B extends A` конфлікт було б повідомлено одразу в оголошенні: *Interface 'B' incorrectly extends interface 'A'.*

## Рекурсивні типи

Тип може посилатися сам на себе — ідеально для дерев і JSON:

```ts
type Json =
  | string | number | boolean | null
  | Json[]
  | { [key: string]: Json };

const payload: Json = { user: { tags: ['a', 'b'], age: 3 }, ok: true };

interface MenuItem {
  label: string;
  children?: MenuItem[];
}
```

Умовні типи теж можуть бути рекурсивними:

```ts
type Flatten<T> = T extends readonly (infer U)[] ? Flatten<U> : T;
type F = Flatten<number[][][]>;   // number
```

> [!TIP] Типізуйте відповіді API як `Json`
> Тип `Json` — чудова золота середина для тестових помічників: на відміну від `any`, він не дасть викликати методи, яких не може містити JSON (жодних `Date`, жодних функцій), а на відміну від `unknown`, вкладені значення можна читати після звуження.

## Типи-обгортки: `String`, `Number`, `Object` і `{}`

У JavaScript є **об'єкти**-обгортки для примітивів (`new String('x')`). Їхні типи з великої літери майже ніколи не є тим, що вам потрібно:

| Пишіть так | А не так | Чому |
| --- | --- | --- |
| `string`, `number`, `boolean` | `String`, `Number`, `Boolean` | обгортки — це об'єкти; `const s: string = new String('x')` — помилка |
| `object` | `Object` | `object` означає «будь-що не примітивне» |
| `unknown` або `Record<string, unknown>` | `{}` | `{}` означає «будь-що, крім `null`/`undefined`» — зокрема `42` |

```ts
const a: {} = 42;          // ✓ — несподівано, але дозволено
const b: object = 42;      // ✗ Type 'number' is not assignable to type 'object'.
```

=== quiz
??? Який виведений тип у `const pair = ['age', 42];`?
- [ ] `[string, number]`
- [x] `(string | number)[]`
- [ ] `readonly ['age', 42]`
- [ ] `any[]`
> Літерали масивів виводяться як масиви, а не кортежі. Щоб отримати кортеж, використайте анотацію або `as const`.

??? Який тип має `status` у `{ status: string } & { status: number }`?
- [ ] `string | number`
- [ ] `string`
- [x] `never`
- [ ] Це помилка компіляції в оголошенні
> Перетин вимагає обох, а ніщо не буває водночас рядком і числом. `interface … extends` натомість повідомив би про конфлікт.

??? Яка анотація відхиляє число `42`?
- [ ] `{}`
- [x] `object`
- [ ] `Object`
- [ ] `unknown`
> `object` означає «не примітив». `{}` і `Object` приймають примітиви (крім `null`/`undefined`), а `unknown` приймає все.

??? Що дозволяє `[start: number, end?: number]`?
- [ ] Лише масиви з двох елементів
- [x] Одне або два числа; мітки — для документації
- [ ] Будь-яку кількість чисел
- [ ] Об'єкт зі `start` і `end`
> Мітки кортежу не змінюють форму; `?` робить завершальний елемент необов'язковим.

=== task Типізуйте помічник із кортежем-результатом
У `src/safe.ts` напишіть `safe<T>(fn: () => Promise<T>)`, яка ніколи не кидає помилку й повертає `[error, value]` як **кортеж**: `[null, value]` при успіху, `[error, null]` при невдачі.

1. Спершу напишіть її без типу повернення й наведіть курсор на результат `await safe(...)`.
2. Потім задайте тип повернення — об'єднання двох іменованих кортежів, — щоб перевірка `err === null` звужувала `value`.
--- hint
Визначте `type Result<T> = [error: null, value: T] | [error: Error, value: null];`. Для позиції помилки використовуйте `Error`, а не `unknown`: звуження об'єднання працює лише тоді, коли перевірювана позиція розрізняє його члени, а `unknown` сам може бути `null`. Перетворіть кинуте значення: `error instanceof Error ? error : new Error(String(error))`.
--- expected
Без анотації повернення `[null, value]` і `[e, null]` виводиться як **масив** — для перехопленої помилки типу `unknown` просто `unknown[]`, — тож ви втрачаєте і позиції, і типи.

З анотацією:

```ts
type Result<T> = [error: null, value: T] | [error: Error, value: null];

export async function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return [null, await fn()];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}

const [err, value] = await safe(async () => 42);
if (err === null) {
  value;          // number
} else {
  err.message;    // Error
}
```

`npx tsc` проходить. (Якщо типізувати позицію помилки як `unknown`, `err === null` більше не звужує `value` — він залишається `number | null`.)

=== task Змоделюйте тестову фікстуру, безпечну для JSON
1. Оголосіть тип `Json` з уроку.
2. Типізуйте ним константу `fixture` із вкладеним користувачем і тегами.
3. Спробуйте додати всередину `createdAt: new Date()` і `onClick: () => {}` — прочитайте помилки.
--- expected
`npx tsc` відхиляє об'єкт із довгим ланцюжком. Дочитайте його до кінця (див. [Читання помилок TypeScript](#/typescript/reading-errors)):

```text
error TS2322: Type '{ user: { tags: string[]; createdAt: Date; … }; }' is not assignable to type 'Json'.
  Types of property 'user' are incompatible.
    …
      Types of property 'createdAt' are incompatible.
        Type 'Date' is not assignable to type 'Json | undefined'.
          …
            Index signature for type 'string' is missing in type 'Date'.
```

Приберіть `createdAt` — і так само буде повідомлено про функцію. Саме цього ви й хочете: ці значення не пережили б `JSON.stringify` (дата стала б рядком, функція зникла б), тож тип не дає вам на них покладатися.

=== sources
- [Tuple Type (Anonymous) — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/tuple-type-anonymous/)
- [Named Tuple Type (Labeled) — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/named-tuple-type-labeled/)
- [Intersection Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/intersection-types/)
- [Others: Variadic tuples, Recursive types, Boxed types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/others/)
- [Tuple Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types)
- [Variadic tuple types — TypeScript 4.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types)
