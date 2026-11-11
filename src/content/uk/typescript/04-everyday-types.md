---
title: Повсякденні типи та виведення типів
module: Базові типи
description: Коли анотувати, а коли дозволити TypeScript вивести тип; об'єднання й літеральні типи, any проти unknown, масиви, кортежі та `as const`.
level: Foundations
minutes: 25
---
## Нехай виведення типів працює за вас

TypeScript виводить типи зі значень. Анотувати все підряд — це шум; анотувати *межі* — цінно.

```ts variant="bad" title="зайві анотації"
const count: number = 3;
const names: string[] = ['Ada', 'Linus'];
const doubled: number[] = names.map((n: string): number => n.length * 2);
```

```ts variant="good" title="анотуйте межі"
const count = 3;                       // number
const names = ['Ada', 'Linus'];        // string[]
const doubled = names.map((n) => n.length * 2); // number[]

// Анотуйте параметри функцій і публічні типи повернення:
export function total(prices: number[]): number {
  return prices.reduce((sum, p) => sum + p, 0);
}
```

Добре правило: **анотуйте параметри, типи повернення експортованих функцій і порожні початкові значення**. Усе інше нехай виводиться. Наведіть курсор у редакторі, щоб побачити, що вирішив TypeScript.

## `const` проти `let`: літеральні типи та розширення

```ts
let status = 'loading';   // тип: string       (може змінитися, тож розширюється)
const mode = 'dark';      // тип: "dark"       (не може змінитися — літеральний тип)
```

**Літеральний тип** — це тип рівно з одним значенням. Поєднайте кілька в об'єднання — і отримаєте точні типи з автодоповненням:

```ts
type Theme = 'light' | 'dark' | 'system';

function setTheme(theme: Theme) { /* ... */ }

setTheme('dark');   // ✓
setTheme('blue');   // ✗ Argument of type '"blue"' is not assignable to parameter of type 'Theme'.
```

> [!PITFALL] Розширення літералів усередині об'єктів
> Властивості об'єктів змінні, тож їхні літерали розширюються:
> ```ts
> const config = { theme: 'dark' };   // { theme: string }
> setTheme(config.theme);             // ✗ string is not assignable to Theme
> ```
> Виправте анотацією (`const config: { theme: Theme } = …`), за допомогою `as const` або `satisfies` (див. урок [Об'єкти та інтерфейси](#/typescript/objects-and-interfaces)).

## `as const`

`as const` каже: «це значення глибоко незмінне (readonly), і кожен літерал залишається літералом»:

```ts
const browsers = ['chromium', 'firefox', 'webkit'] as const;
// readonly ["chromium", "firefox", "webkit"]

type Browser = (typeof browsers)[number];
// "chromium" | "firefox" | "webkit"
```

Другий рядок — дуже поширений патерн: **визначте значення один раз і виведіть із них тип**, щоб вони ніколи не розійшлися.

## Масиви та кортежі

```ts
const ids: number[] = [1, 2, 3];          // будь-якої довжини, усі числа
const pair: [string, number] = ['age', 42]; // рівно два елементи, у такому порядку
const point = [10, 20] as const;           // readonly [10, 20]
```

Кортежі чудово підходять для значень, що повертаються, як-от `[value, error]`, але коли позицій більше двох-трьох, називайте їх через об'єкти.

## `any`, `unknown` і `never`

| Тип | Значення | Коли використовувати |
| --- | --- | --- |
| `any` | **Вимикає** перевірку. Що завгодно на вході, що завгодно на виході. | Майже ніколи. Він непомітно поширюється. |
| `unknown` | «Може бути будь-чим — доведіть, перш ніж використовувати». | Недовірені дані: `JSON.parse`, `catch (e)`, відповіді API. |
| `never` | Значення, яке не може існувати. | Перевірки вичерпності, неможливі гілки. |

```ts
function parse(raw: string): unknown {
  return JSON.parse(raw);
}

const data = parse('{"n": 1}');
data.n;                 // ✗ 'data' is of type 'unknown'.

if (typeof data === 'object' && data !== null && 'n' in data) {
  data.n;               // ✓ тип звужено
}
```

> [!PITFALL] `any` заразний
> `JSON.parse`, `res.json()` і чимало старших бібліотек повертають `any`. Усе, що ви отримуєте з `any`, теж стає `any`, тож одне нетипізоване значення може непомітно вимкнути перевірку в цілій функції. Присвоюйте такі значення `unknown` (або перевіреному типу) якомога раніше.

## Необов'язкові значення: `undefined` проти `null`

З `strictNullChecks` (частина `strict`) `string` означає *лише* рядки. Якщо чогось може не бути, скажіть про це:

```ts
type User = {
  name: string;
  nickname?: string;          // може бути відсутнім → string | undefined
  manager: User | null;       // завжди присутнє, але може бути null
};

user.nickname?.toUpperCase();        // optional chaining: undefined, якщо відсутнє
const display = user.nickname ?? user.name; // nullish coalescing: запасне значення лише для null/undefined
```

> [!TIP] `??` проти `||`
> `count || 10` замінює також `0` і `''`, бо вони хибні (falsy). `count ?? 10` замінює лише `null` та `undefined`. Для значень за замовчуванням обирайте `??`.

=== quiz
??? Який тип у `status`?
```ts
let status = 'idle';
```
- [ ] `'idle'`
- [x] `string`
- [ ] `any`
- [ ] `unknown`
> Змінні `let` можна перепризначати, тож TypeScript розширює літерал `'idle'` до `string`. З `const` тип залишився б `'idle'`.

??? Що дає `type Browser = (typeof browsers)[number]`?
```ts
const browsers = ['chromium', 'firefox', 'webkit'] as const;
```
- [ ] `string`
- [ ] `string[]`
- [x] `"chromium" | "firefox" | "webkit"`
- [ ] `readonly string[]`
> `typeof browsers` — це тип незмінного кортежу; індексація його типом `number` дає об'єднання всіх типів елементів. Без `as const` вийшов би просто `string`.

??? Ви отримуєте дані з `JSON.parse`. Який тип їм дати до перевірки?
- [ ] `any`, бо тип ще невідомий
- [x] `unknown`
- [ ] `object`
- [ ] `never`
> `unknown` змушує перевірити перед використанням; `any` мовчки вимикає перевірку для всього, що з нього випливає.

??? `const retries = options.retries || 3;` — `options.retries` дорівнює `0`. Чому дорівнює `retries`?
- [ ] `0`
- [x] `3`
- [ ] `undefined`
> `0` — хибне значення, тож `||` бере запасне `3`. Використовуйте `options.retries ?? 3`, щоб зберегти навмисний `0`.

??? Де найкраще додати явну анотацію типу?
- [ ] `const total: number = a + b;`
- [ ] У кожному стрілковому колбеку, переданому в `.map()`
- [x] На параметрах експортованої функції
- [ ] На кожному оголошенні `const`
> Параметри не можна вивести (нема значення, з якого виводити), а експортовані сигнатури — це контракти. Локальні значення та колбеки виводяться добре.

=== task Виведіть тип з єдиного джерела істини
У проєкті `ts-lab` створіть `src/browsers.ts`.

1. Оголосіть масив підтримуваних браузерів **один раз** за допомогою `as const`.
2. Виведіть із нього тип `Browser` — не пишіть об'єднання вручну.
3. Напишіть `isBrowser(value: string): value is Browser`, використовуючи масив.
4. Викличте її з `'webkit'` і `'safari'` та виведіть результати.
--- starter ts
```ts
// 1. оголосіть список
// 2. type Browser = ...

export function isBrowser(value: string): value is Browser {
  // 3. використайте список тут
}

console.log(isBrowser('webkit'), isBrowser('safari'));
```
--- hint
`browsers.includes(value)` скаржиться, бо `value` має тип `string`, а не `Browser`. Для перевірки розширте тип масиву: `(browsers as readonly string[]).includes(value)`.
--- expected
```ts
const browsers = ['chromium', 'firefox', 'webkit'] as const;
type Browser = (typeof browsers)[number];

export function isBrowser(value: string): value is Browser {
  return (browsers as readonly string[]).includes(value);
}
```

`npx tsc` проходить без помилок, а запуск файлу друкує:

```text
true false
```

Додавання `'edge'` до масиву автоматично додає його й до типу `Browser` — у цьому весь сенс.

=== task Виправте баг із розширенням типу
Вставте початковий код у `src/theme.ts` і запустіть `npx tsc`. Виправте помилку **трьома різними способами** (по одному за раз): явною анотацією, `as const` і `satisfies`.
--- starter ts
```ts
type Theme = 'light' | 'dark';
function applyTheme(t: Theme) { console.log('theme:', t); }

const settings = { theme: 'dark', fontSize: 14 };
applyTheme(settings.theme);
```
--- expected
Початковий варіант падає з помилкою:

```text
error TS2345: Argument of type 'string' is not assignable to parameter of type 'Theme'.
```

Усі три виправлення компілюються:

```ts
const a: { theme: Theme; fontSize: number } = { theme: 'dark', fontSize: 14 };
const b = { theme: 'dark', fontSize: 14 } as const;
const c = { theme: 'dark', fontSize: 14 } satisfies { theme: Theme; fontSize: number };
```

Наведіть курсор на кожен і порівняйте:

- `a.theme` має тип `Theme` — анотація *замінює* виведений тип.
- `b` — це `{ readonly theme: "dark"; readonly fontSize: 14 }`: усе літеральне й незмінне.
- `c` — це `{ theme: "dark"; fontSize: number }`: `satisfies` перевіряє відповідність формі, але зберігає точний виведений тип, а контекстний тип `Theme` не дає `"dark"` розширитися.

=== sources
- [Everyday Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Type Inference — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [Literal types & `as const` — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
- [The `unknown` type — TypeScript 3.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#new-unknown-top-type)
- [Nullish coalescing — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [Type Annotations — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/type-annotations/)
- [Literal Inference — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/literal-inference/)
- [Unknown type — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/unknown-type/)
- [Literal Types — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/literal-types)
- [Type Inference — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/type-inference)
