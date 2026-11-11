---
title: Як насправді працює TypeScript
module: Початок роботи
description: Одна ментальна модель, що пояснює 80% сюрпризів TypeScript — типи існують лише під час компіляції, — і сучасне налаштування з TypeScript 7 та Node.
level: Foundations
minutes: 20
---
## Типи стираються

TypeScript — це JavaScript **плюс перевірка типів**. Перевіряльник читає ваш код, повідомляє про проблеми, а потім типи *видаляються*. Те, що виконується — у Node, у браузері, у воркері Playwright, — це звичайний JavaScript.

```ts title="greet.ts"
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

```js title="що виконується насправді"
function greet(name) {
  return `Hello, ${name}`;
}
```

Цей єдиний факт пояснює дуже багато:

- Типи не можуть змінити поведінку під час виконання. `name: string` нічого не *перетворює* і не *перевіряє*.
- Не можна спитати «чи це `User`?» під час виконання за допомогою типу — `User` більше не існує. Натомість перевіряють *значення* (`typeof`, `in`, `instanceof`). Саме про це [урок про звуження типів](#/typescript/narrowing).
- Дані ззовні (`JSON.parse`, `fetch`, `process.env`) — такі, якими вони є. Анотація типу на них — це *ваша обіцянка*, а не перевірка.
- Усі особливості JavaScript під час виконання нікуди не діваються — див. урок [Основи JavaScript, на які спирається TypeScript](#/typescript/javascript-essentials).

> [!PITFALL] «Але ж я вказав тип `User`!»
> Анотація недовірених даних їх не перевіряє. `const user: User = await res.json()` компілюється, бо `res.json()` повертає `any` — компілятор просто вам вірить. Якщо API надішле `{ name: null }`, код упаде під час виконання без жодної помилки компіляції. Вважайте зовнішні дані `unknown` і перевіряйте їх (вручну чи бібліотекою схем), перш ніж покладатися на їхню форму.

## Перевірка проти генерації коду {#the-checker-vs-the-emitter}

Історично `tsc` виконував дві роботи: **перевіряв** типи і **генерував** JavaScript. Сучасні налаштування часто їх розділяють:

| Робота | Хто виконує її сьогодні |
| --- | --- |
| Перевірка типів | `tsc --noEmit` (у редакторі та на CI) |
| Видалення типів, щоб запустити код | Node (type stripping), Vite/esbuild, вбудоване перетворення Playwright |

Саме тому тести можуть *запускатися*, поки редактор підкреслює код червоним: раннер лише прибирає типи й ніколи їх не перевіряє. Запускайте `npx tsc --noEmit` на CI, щоб помилки типів справді зупиняли збірку, — документація Playwright рекомендує саме це.

> [!NOTE] TypeScript 7 — нативний компілятор
> TypeScript 7.0 (липень 2026) — це порт компілятора на нативний код, зазвичай приблизно в 10 разів швидший на повних збірках. *Мова* та сама; `npm install -D typescript` тепер встановлює нативний `tsc`. TypeScript 6.0 був перехідним релізом: він змінив значення за замовчуванням і позначив застарілими старі опції, щоб підготувати ґрунт.

> [!PITFALL] Інструменти, яким досі потрібен TypeScript 6
> Пакет TypeScript 7 у npm містить команду `tsc`, але **не має JavaScript API** — `import ts from 'typescript'` не дає нічого, що можна викликати. Інструменти, побудовані на цьому API — насамперед **typescript-eslint** (його правила з інформацією про типи), а також ts-morph і старіші налаштування ts-node, — досі потребують TypeScript 6. Якщо встановити їх поруч із TypeScript 7, npm зупиниться з помилкою `npm error ERESOLVE … peer typescript@">=4.8.4 <6.1.0"`. Доки ваші інструменти не підтримують 7, зафіксуйте в проєкті шосту версію: `npm install -D typescript@6`. Мова, якою ви пишете, та сама.

## Запуск TypeScript безпосередньо в Node

Актуальні версії Node (22.18+, 23.6+, а стабільно — з 24.12) запускають файли `.ts` напряму, **прибираючи типи** — без кроку збірки:

```bash
node src/hello.ts
```

Node лише *стирає* синтаксис типів; він ніколи не перевіряє типи й відмовляється від синтаксису, якому потрібен згенерований JavaScript: `enum`, `namespace` з кодом, що виконується, і властивості-параметри конструктора. Опція компілятора `erasableSyntaxOnly` змушує `tsc` позначати їх за вас.

## Сучасне початкове налаштування

:::steps
### Створіть проєкт
```bash
mkdir ts-lab && cd ts-lab
npm init -y
npm pkg set type=module
npm install -D typescript @types/node
```
### Додайте tsconfig.json
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
### Пишіть, перевіряйте, запускайте
```bash
npx tsc            # лише перевірка типів (noEmit)
node src/hello.ts  # запуск
```
:::

> [!PITFALL] `Cannot find name 'process'` після оновлення
> Починаючи з TypeScript 6.0, `types` за замовчуванням дорівнює `[]` — TypeScript більше не підвантажує автоматично всі пакети `@types/*` з `node_modules`. Якщо глобальні імена на кшталт `process`, `__dirname` чи `describe` раптом «не існують», явно перелічіть потрібні пакети: `"types": ["node"]`.

## `strict` — не опція, а необхідність

`strict` вмикає цілу родину перевірок — найважливіша з них `strictNullChecks`, яка робить `null` і `undefined` окремими типами, а не значеннями, що мовчки пасують усюди. Починаючи з TypeScript 6.0, вона **увімкнена за замовчуванням**. Без неї TypeScript не здатен зловити найпоширенішу аварію в JavaScript: `Cannot read properties of undefined`.

```ts title="з strictNullChecks"
function firstChar(s: string | undefined) {
  return s.charAt(0);
  //     ^ 's' is possibly 'undefined'.
}
```

> [!TIP]
> `noUncheckedIndexedAccess` *не входить* до `strict`, але її варто ввімкнути: тоді `arr[i]` і `record[key]` включають `| undefined`, і це чесна правда.

=== quiz
??? Що відбувається з анотаціями типів у вашому коді, коли він виконується?
- [ ] Вони стають перевірками під час виконання й кидають помилку, якщо тип значення неправильний
- [x] Вони стираються — виконується звичайний JavaScript
- [ ] Вони зберігаються як коментарі для налагодження
- [ ] Node перевіряє їх перед виконанням
> Типи існують лише для перевіряльника. Кожен раннер (type stripping у Node, Vite, Playwright) їх прибирає, тому типи не можуть перевіряти дані під час виконання.

??? Ваші тести Playwright працюють, але `npx tsc --noEmit` показує 12 помилок. Як це можливо?
- [ ] Playwright використовує іншу, поблажливішу версію TypeScript
- [ ] `tsc` помиляється; те, що тести проходять, доводить правильність типів
- [x] Тестовий раннер лише прибирає типи й ніколи їх не перевіряє
- [ ] Помилки показуються лише в режимі strict
> Раннери перетворюють TS на JS без перевірки. Помилки типів зупиняють збірку лише тоді, коли щось запускає `tsc`, — тому `tsc --noEmit` додають на CI.

??? Що з цього вбудований type stripping у Node може виконати без додаткових інструментів?
```ts
// A
enum Color { Red, Green }
// B
type Color = 'red' | 'green';
// C
class User { constructor(private name: string) {} }
```
- [ ] A і B
- [x] Лише B
- [ ] B і C
- [ ] Усі три
> Перелічення (enum) і властивості-параметри (`private name` у конструкторі) генерують JavaScript-код, тож їх не можна просто стерти. Об'єднання рядкових літералів — це чиста інформація про типи. Увімкніть `erasableSyntaxOnly`, щоб отримувати помилки компіляції для A і C.

??? Після оновлення до TypeScript 6+ для `process.env` з'являється «Cannot find name 'process'». Як виправити?
- [ ] Повернутися на TypeScript 5
- [ ] Додати `// @ts-ignore` над кожним використанням
- [x] Додати `"types": ["node"]` у compilerOptions (і переконатися, що `@types/node` встановлено)
- [ ] Вимкнути `strict`
> TypeScript 6 змінив значення `types` за замовчуванням на `[]`, тож глобальні пакети типів більше не підключаються автоматично. Ви перелічуєте потрібні самі.

??? `const user: User = await res.json();` — що гарантує анотація?
- [ ] Що тіло відповіді відповідає `User`, інакше буде помилка
- [x] Нічого під час виконання — це неперевірена обіцянка компілятору з вашого боку
- [ ] Що `user` не дорівнює `null`
> `res.json()` повертає `any`, а `any` можна присвоїти чому завгодно. Компілятор вам вірить. Перевіряйте зовнішні дані, перш ніж покладатися на їхню форму.

=== task Створіть лабораторний проєкт TypeScript
Створіть невеликий проєкт, який використовуватимете для всіх завдань з TypeScript у цьому курсі.

1. Виконайте три кроки з розділу **Сучасне початкове налаштування** вище.
2. Створіть `src/hello.ts` з початковим кодом.
3. Запустіть `npx tsc`, потім `node src/hello.ts`.
4. А тепер зламайте: змініть виклик на `greet(42)` і знову запустіть обидві команди.
--- starter ts
```ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('Playwright'));
```
--- hint
Якщо Node виводить попередження про тип модуля, перевірте, що `package.json` містить `"type": "module"` (крок `npm pkg set type=module`).
--- expected
До зміни `npx tsc` **нічого не виводить** (відсутність виводу означає відсутність помилок), а Node друкує:

```text
Hello, Playwright!
```

Після заміни на `greet(42)`:

```text
src/hello.ts:5:19 - error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.
```

…але `node src/hello.ts` **все одно запускається** й друкує `Hello, 42!`. У цьому експерименті весь урок: запуск і перевірка — окремі речі.

=== task Доведіть, що типи не перевіряють дані
1. Вставте початковий код у `src/trust.ts`.
2. Запустіть його командою `node src/trust.ts`.
3. Потім змініть оголошення на `const user: unknown = JSON.parse(raw);` і виправте всі помилки компіляції, перевіривши значення перед використанням.
--- starter ts
```ts
type User = { name: string; email: string };

const raw = '{"name": null}';
const user: User = JSON.parse(raw);

console.log(user.name.toUpperCase());
```
--- hint
Після переходу на `unknown` вам знадобиться щось на кшталт `typeof user === 'object' && user !== null && 'name' in user && typeof user.name === 'string'`, перш ніж можна буде викликати `.toUpperCase()`.
--- expected
Перша версія **компілюється без помилок**, але падає під час виконання:

```text
TypeError: Cannot read properties of null (reading 'toUpperCase')
```

З `unknown` компілятор `tsc` не дозволяє звертатися до `user.name`, доки ви не доведете, що `user` — об'єкт із рядковим `name`. Ваша виправлена версія нічого не друкує (або друкує обране вами запасне повідомлення) замість того, щоб упасти.

=== sources
- [TypeScript for the New Programmer — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html)
- [Announcing TypeScript 6.0 — TypeScript blog](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [Modules: TypeScript — Node.js documentation](https://nodejs.org/api/typescript.html)
- [TSConfig reference: strict](https://www.typescriptlang.org/tsconfig/#strict)
- [Best practices: lint your tests — Playwright](https://playwright.dev/docs/best-practices#lint-your-tests)
- [TypeScript Introduction — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/typescript-introduction/)
- [Why TypeScript — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/getting-started/why-typescript)
- [TypeScript's Type System — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system)
