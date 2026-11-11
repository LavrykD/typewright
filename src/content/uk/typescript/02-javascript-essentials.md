---
title: Основи JavaScript, на які спирається TypeScript
module: Початок роботи
description: Поведінка JavaScript, яку TypeScript не змінює, — рівність, істинність, null проти undefined, посилання, замикання, числа й сучасний синтаксис на кшталт деструктуризації, spread і for…of.
level: Foundations
minutes: 30
---
## TypeScript — це JavaScript із перевіряльником

Кожна програма на TypeScript виконується як JavaScript, тож усі особливості JavaScript нікуди не зникають. Частину з них TypeScript ловить; інші треба просто знати. Цей урок — короткий перелік поведінки під час виконання, що найбільше важить, коли ви пишете тести й типізований код.

## Рівність: використовуйте `===`

`==` перетворює типи перед порівнянням; `===` — ні (тут показано звичайний JavaScript — TypeScript відхиляє більшість цих рядків як порівняння непов'язаних типів):

```js
5 == '5';     // true  — '5' перетворюється на число
5 === '5';    // false
0 == '';      // true  — '' перетворюється на 0
0 === '';     // false
```

За замовчуванням використовуйте `===` і `!==`. TypeScript уже відхиляє багато безглуздих порівнянь — `if (count === 'zero')` для `number` дає *TS2367: This comparison appears to be unintentional*, — але лише `===` дає передбачувані правила для значень, яких компілятор не бачить, як-от даних із JSON.

> [!TIP] Єдиний виняток: `== null`
> `value == null` істинне рівно для `null` **і** `undefined` — і більше ні для чого (ні для `0`, ні для `''`, ні для `false`). Це поширена, свідома ідіома для «відсутнього значення». Сучасний спосіб скористатися нею — `value ?? fallback`.

### Об'єкти порівнюються за посиланням

```ts
console.log({ a: 1 } === { a: 1 });   // false — два різні об'єкти
const x = { a: 1 };
const y = x;
x === y;                 // true — той самий об'єкт
```

Щоб порівняти вміст, порівнюйте змістовне поле (`a.id === b.id`) або використайте помічник глибокого порівняння. У Playwright `expect(obj).toEqual({...})` робить глибоке порівняння за вас.

> [!PITFALL] `includes` та `indexOf` з об'єктами
> `[{ id: 1 }].includes({ id: 1 })` дорівнює `false` з тієї самої причини. Шукайте за полем: `list.some((u) => u.id === 1)`.

## Істинні та хибні значення

Хибні (falsy) рівно ці значення: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Усе інше — істинне (truthy), зокрема `'0'`, `'false'`, `[]` і `{}`.

```ts
if ([]) { /* виконається! порожній масив істинний */ }
if (items.length) { /* ось перевірка довжини, яку ви мали на увазі */ }
```

`!!value` явно перетворює будь-яке значення на boolean.

## `null` проти `undefined`

Обидва означають «немає значення», але JavaScript створює їх у різних місцях:

| | `undefined` | `null` |
| --- | --- | --- |
| Звідки береться | відсутні властивості, відсутні аргументи, функції без `return` | лише коли хтось його пише |
| `typeof` | `'undefined'` | `'object'` (історичний баг) |
| У `JSON.stringify` | властивість **відкидається** | властивість **зберігається** як `null` |

```ts
JSON.stringify({ a: undefined, b: null });   // '{"b":null}'
```

Практична домовленість: моделюйте «може бути відсутнім» через необов'язкові властивості (`nickname?: string`), а `null` використовуйте лише там, де його явно надсилає API (наприклад, «очистити це поле» у JSON-запиті).

## Посилання та копіювання

Об'єкти й масиви передаються **за посиланням**. Присвоєння чи передавання їх не копіює:

```ts
const defaults = { retries: 2, headers: { 'x-test': '1' } };
const mine = defaults;
mine.retries = 5;
defaults.retries;          // 5 — той самий об'єкт

const copy = { ...defaults };            // поверхнева копія
copy.headers['x-test'] = '2';
defaults.headers['x-test'];              // '2' — вкладені об'єкти й далі спільні

const deep = structuredClone(defaults);  // глибока копія
```

> [!PITFALL] Спільні тестові дані, які змінюються
> Якщо експортувати один `const testUser = {...}` і змінити його всередині тесту, він зміниться для всіх інших тестів того самого воркера. Створюйте свіжі дані для кожного тесту (функція-фабрика `makeUser()`) або «заморожуйте» спільні константи через `Object.freeze` / `as const`.

## Замикання

Функція пам'ятає змінні з області видимості, де її створено:

```ts
function counter() {
  let count = 0;
  return () => ++count;   // замикається на `count`
}
const next = counter();
next(); next();           // 2
```

Саме через замикання фікстури, колбеки й обробники подій зберігають стан. І саме тому важливий `let` у циклах:

```ts
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 0 1 2 — новий `i` на кожній ітерації
for (var j = 0; j < 3; j++) setTimeout(() => console.log(j));  // 3 3 3 — один спільний `j`
```

За замовчуванням використовуйте `const`, `let` — коли перепризначаєте, і ніколи `var`.

## Числа

У JavaScript один тип `number`: 64-бітне число з рухомою комою.

```ts
0.1 + 0.2;                          // 0.30000000000000004
Number.MAX_SAFE_INTEGER;            // 9007199254740991
Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2;   // true — точність втрачено
Number.isNaN(Math.sqrt(-1));        // true
2n ** 64n;                          // 18446744073709551616n — BigInt для великих цілих
```

- Ніколи не порівнюйте гроші чи обчислені десяткові через `===`; округлюйте або зберігайте копійки цілими числами.
- `NaN` не дорівнює нічому, навіть собі. TypeScript повідомляє про `x === NaN` як *This condition will always return 'false'* — використовуйте `Number.isNaN(x)`.
- Ідентифікатори з API, що можуть перевищити 2⁵³, залишайте рядками.

## Сучасний синтаксис, який ви бачитимете всюди

```ts
// Деструктуризація (зі значеннями за замовчуванням і перейменуванням)
const { baseURL = 'http://localhost:3000', retries: maxRetries } = config;
const [first, ...rest] = ['chromium', 'firefox', 'webkit'];

// Spread: копіювання й злиття (пізніші ключі перемагають)
const merged = { ...defaults, ...overrides };
const all = [...listA, ...listB];

// Rest-параметри
function log(level: string, ...parts: unknown[]) { console.log(level, ...parts); }

// Шаблонні рядки
const url = `${baseURL}/users/${id}`;

// for...of перебирає ЗНАЧЕННЯ; for...in перебирає КЛЮЧІ (рядками)
for (const browser of ['chromium', 'webkit']) { /* 'chromium', 'webkit' */ }
for (const index in ['chromium', 'webkit']) { /* '0', '1' — рядки! */ }

// Optional chaining і nullish coalescing
const city = user.address?.city ?? 'unknown';
```

> [!PITFALL] `for...in` по масивах
> `for...in` дає ключі **рядками** (`'0'`, `'1'`) і ще й обходить успадковані перелічувані властивості. Для масивів використовуйте `for...of`, `.forEach` або `.entries()`, коли потрібен індекс: `for (const [i, b] of browsers.entries())`.

=== quiz
??? Що поверне `JSON.stringify({ a: undefined, b: null })`?
- [ ] `'{"a":undefined,"b":null}'`
- [ ] `'{"a":null,"b":null}'`
- [x] `'{"b":null}'`
- [ ] `'{}'`
> Властивості зі значенням `undefined` викидаються з JSON; `null` зберігається. Тому `null` — загальноприйнятий спосіб сказати «очистити це поле» в JSON API.

??? Яке значення **істинне**?
- [ ] `0`
- [ ] `''`
- [x] `[]`
- [ ] `NaN`
> Порожні масиви й порожні об'єкти істинні. Коли маєте на увазі «непорожній», перевіряйте `arr.length`.

??? Що виведе цей код?
```ts
const a = { tags: ['x'] };
const b = { ...a };
b.tags.push('y');
console.log(a.tags.length);
```
- [ ] `1`
- [x] `2`
- [ ] Кине помилку
> Spread робить поверхневу копію: `b.tags` — той самий масив, що й `a.tags`. Для глибокої копії використовуйте `structuredClone`.

??? Яка перевірка істинна і для `null`, і для `undefined`, але хибна для `0` і `''`?
- [ ] `!value`
- [x] `value == null`
- [ ] `value === null`
- [ ] `typeof value === 'undefined'`
> Нестроге порівняння з `null` збігається рівно з `null` та `undefined`. `!value` спрацювало б і на `0` та `''`.

=== task Знайдіть баг із посиланнями
1. Збережіть стартовий код як `src/shared-data.ts` і запустіть `node src/shared-data.ts`.
2. Поясніть вивід, а потім виправте двічі: один раз функцією-фабрикою, другий — через `structuredClone`.
--- starter ts
```ts
const baseUser = { name: 'Ada', roles: ['viewer'] };

function makeAdmin() {
  const user = { ...baseUser };
  user.roles.push('admin');
  return user;
}

makeAdmin();
makeAdmin();
console.log(baseUser.roles);
```
--- expected
Оригінал друкує:

```text
[ 'viewer', 'admin', 'admin' ]
```

Spread скопіював `baseUser`, але `roles` — той самий масив, тож кожен виклик змінював спільні дані. Обидва виправлення друкують `[ 'viewer' ]`:

```ts
const makeBaseUser = () => ({ name: 'Ada', roles: ['viewer'] });   // фабрика: щоразу свіжі дані
// або
const user = structuredClone(baseUser);                             // глибока копія
```

=== task Числа, що брешуть
Спершу передбачте, а потім запустіть кожен рядок у `src/numbers.ts`. Потім напишіть `sameAmount(a: number, b: number): boolean`, яка безпечно порівнює дві ціни.
--- starter ts
```ts
console.log(0.1 + 0.2 === 0.3);
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2);
console.log([10, 1, 2].sort());
console.log(Number.isNaN(Number('abc')));
```
--- hint
`Array.prototype.sort()` без функції порівняння сортує **як рядки**. Ціни порівнюйте з допуском (`Math.abs(a - b) < 0.005`) або спершу переведіть у цілі копійки.
--- expected
```text
false
true
[ 1, 10, 2 ]
true
```

Одне з рішень:

```ts
export function sameAmount(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}
sameAmount(0.1 + 0.2, 0.3);   // true
```

А `[10, 1, 2].sort((x, y) => x - y)` дає `[1, 2, 10]`.

=== sources
- [JavaScript Recap — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/recap)
- [Equality — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/equality)
- [Null vs. Undefined — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/null-undefined)
- [Number — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/number)
- [Destructuring — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/destructuring)
- [Spread Operator — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/future-javascript/spread-operator)
- [Falsy — MDN](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)
- [structuredClone() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
