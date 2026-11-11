---
title: Об'єкти, інтерфейси та satisfies
module: Базові типи
description: Структурна типізація, interface проти type, необов'язкові й readonly-властивості, перевірка зайвих властивостей, індексні сигнатури — і чому satisfies найкращий оператор, яким ви ще не користуєтеся.
level: Foundations
minutes: 30
---
## Структурна типізація: важить форма

TypeScript порівнює об'єкти за **формою**, а не за назвою. Якщо в об'єкта є потрібні властивості — він підходить:

```ts
interface Point { x: number; y: number }

function length(p: Point) { return Math.hypot(p.x, p.y); }

const coords = { x: 3, y: 4, label: 'A' };
length(coords);  // ✓ — є x та y; зайва `label` не заважає
```

Це відрізняється від Java чи C#, де клас має *оголосити*, що реалізує інтерфейс. У TypeScript усе, що має правильну форму, сумісне.

## `interface` чи `type`?

Обидва описують форму об'єктів і здебільшого взаємозамінні. Практичні відмінності:

| | `interface` | псевдонім `type` |
| --- | --- | --- |
| Форма об'єктів | ✓ | ✓ |
| Об'єднання, кортежі, примітиви, mapped/conditional types | ✗ | ✓ |
| Розширення | `interface B extends A {}` | `type B = A & {…}` |
| Злиття оголошень (одна назва двічі → об'єднуються) | ✓ | ✗ (помилка) |

Порада з довідника: використовуйте `interface`, доки не знадобиться можливість, яка є лише в `type`. Багато команд просто пишуть `type` всюди заради одноманітності — обидва варіанти нормальні; головне — **будьте послідовними**.

```ts
interface Animal { name: string }
interface Dog extends Animal { breed: string }

type Status = 'active' | 'banned';               // можливо лише з `type`
type WithTimestamps<T> = T & { createdAt: Date }; // перетин (intersection)
```

## Необов'язкові та readonly-властивості

```ts
interface Options {
  readonly baseURL: string;   // не можна перепризначити після створення
  timeout?: number;           // може бути відсутньою → number | undefined
}

const opts: Options = { baseURL: 'http://localhost:3000' };
opts.baseURL = 'x';  // ✗ Cannot assign to 'baseURL' because it is a read-only property.
```

> [!WARNING] `readonly` — поверхневий і діє лише під час компіляції
> `readonly items: string[]` не дає перепризначити `items`, але `opts.items.push('x')` усе одно спрацює. Щоб заборонити змінювати сам масив, пишіть `readonly string[]` (або `ReadonlyArray<string>`). А під час виконання нічого не «заморожено» — для цього потрібен `Object.freeze`.

## Перевірка зайвих властивостей

Структурна типізація дозволяє зайві властивості… окрім випадку, коли ви пишете **об'єктний літерал безпосередньо** там, де очікується тип:

```ts
interface Config { retries: number; timeout?: number }

const c1: Config = { retries: 2, timeuot: 5000 };
//                              ^ Object literal may only specify known properties,
//                                and 'timeuot' does not exist in type 'Config'.
```

Ця перевірка ловить друкарські помилки. Але діє вона лише для *свіжих* літералів:

```ts
const raw = { retries: 2, timeuot: 5000 };
const c2: Config = raw;   // ✓ помилки немає — це не свіжий літерал, тож зайві властивості дозволені
```

> [!PITFALL] Друкарські помилки, що прослизають
> Перевірка зайвих властивостей — *єдине*, що ловить помилку в назві необов'язкової властивості, і вона зникає, щойно об'єкт спершу проходить через змінну. Анотуйте об'єкти конфігурації там, де їх створюєте (або використовуйте `satisfies`), а не пізніше.

## Індексні сигнатури та `Record`

Для об'єктів, що слугують словниками, опишіть типи ключа й значення:

```ts
const scores: Record<string, number> = { ada: 3, linus: 5 };
// те саме, що: { [name: string]: number }

const s = scores['grace'];   // number — а насправді undefined!
```

З увімкненою `noUncheckedIndexedAccess` вираз `scores['grace']` має тип `number | undefined` — чесно, і змушує обробити випадок відсутнього ключа.

> [!PITFALL] `Object.keys` повертає `string[]`, а не `(keyof T)[]`
> ```ts
> const user = { name: 'Ada', age: 36 };
> for (const key of Object.keys(user)) {
>   user[key];  // ✗ Element implicitly has an 'any' type because expression of type 'string' can't be used to index…
> }
> ```
> Це зроблено навмисно: через структурну типізацію в об'єкта під час виконання може бути *більше* ключів, ніж зазначено в типі. Якщо ви знаєте, що об'єкт точний, приведіть тип один раз: `(Object.keys(user) as (keyof typeof user)[])` — або перебирайте через `Object.entries`.

## `satisfies`: перевірка без втрати точності

Анотація **замінює** виведений тип оголошеним. `satisfies` **перевіряє** значення на відповідність типу, але **зберігає** точний виведений тип:

```ts
type Route = { path: string; auth: boolean };

const routes = {
  home: { path: '/', auth: false },
  admin: { path: '/admin', auth: true },
} satisfies Record<string, Route>;

routes.admin.path;   // ✓ автодоповнення знає, що `admin` існує
routes.typo;         // ✗ Property 'typo' does not exist
```

З анотацією (`const routes: Record<string, Route> = …`) ви втратили б конкретні ключі: `routes.typo` скомпілювався б і дорівнював би `undefined` під час виконання.

> [!TIP] Просте правило
> Анотацію ставте, коли хочете, щоб змінна *була* ширшим типом (наприклад, ви згодом додаватимете ключі). `satisfies` — коли потрібні і перевірка, **і** точний виведений тип: ідеально для конфігурацій, мап маршрутів і тестових даних.

=== quiz
??? Чи скомпілюється цей код?
```ts
interface Point { x: number; y: number }
const p = { x: 1, y: 2, z: 3 };
const q: Point = p;
```
- [x] Так — `p` має `x` і `y`, а зайві властивості дозволені при присвоєнні змінної
- [ ] Ні — `z` є зайвою властивістю
- [ ] Ні — `p` має бути оголошена як `Point`
> Перевірка зайвих властивостей діє лише для свіжих об'єктних літералів. Присвоєння наявної змінної використовує звичайну структурну сумісність.

??? Що можна виразити лише псевдонімом `type`, а не `interface`?
- [ ] Об'єкт з необов'язковими властивостями
- [ ] Об'єкт, що розширює інший об'єкт
- [x] Об'єднання на кшталт `'GET' | 'POST'`
- [ ] Readonly-властивість
> Інтерфейси описують форму об'єктів. Для об'єднань, кортежів, примітивів, mapped і conditional types потрібен `type`.

??? Який тип у `routes.admin`?
```ts
const routes = {
  admin: { path: '/admin' },
} satisfies Record<string, { path: string }>;
```
- [ ] `{ path: string } | undefined`
- [x] `{ path: string }` — і відомо, що `routes.admin` існує
- [ ] `Record<string, { path: string }>`
> `satisfies` перевіряє значення, але зберігає виведений тип, тож конкретний ключ `admin` залишається відомим. З анотацією `Record` дозволений був би будь-який рядковий ключ.

??? Чому `Object.keys(obj)` повертає `string[]`, а не `(keyof typeof obj)[]`?
- [ ] Це баг, який виправлять
- [x] Під час виконання в об'єктів може бути більше ключів, ніж у їхньому типі (структурна типізація)
- [ ] Бо ключі можуть бути числами
- [ ] Лише в нестрогому режимі
> Значення типу `{ a: number }` насправді може бути `{ a: 1, b: 2 }`. Стверджувати, що ключі — рівно `'a'`, було б некоректно.

??? `interface Opts { readonly tags: string[] }` — який рядок скомпілюється?
- [ ] `opts.tags = []`
- [x] `opts.tags.push('smoke')`
- [ ] Жоден
> `readonly` поверхневий: він захищає саму властивість, а не масив. Щоб заборонити `push`, пишіть `readonly string[]`.

=== task Типізовані тестові дані з satisfies
Створіть `src/test-users.ts` з описом тестових акаунтів, які ви використовували б у тестах Playwright.

1. Визначте `type TestUser = { email: string; password: string; role: 'admin' | 'member' | 'guest' }`.
2. Створіть об'єкт `users` з ключами `admin`, `member` і `guest`, використавши `satisfies Record<string, TestUser>`.
3. Навмисно зробіть друкарську помилку — `role: 'admn'` — і запустіть `npx tsc`.
4. Виправте її, потім спробуйте звернутися до `users.superuser`.
--- expected
З друкарською помилкою:

```text
error TS2322: Type '"admn"' is not assignable to type '"admin" | "member" | "guest"'.
```

Звернення до `users.superuser`:

```text
error TS2339: Property 'superuser' does not exist on type '{ admin: { … }; member: { … }; guest: { … }; }'.
```

А `users.admin.role` при наведенні показує `"admin"` — а не все об'єднання, — бо `satisfies` зберіг точний тип.

=== task Зловіть друкарську помилку, що прослизає
1. Вставте початковий код у `src/config.ts` і запустіть `npx tsc`. Зверніть увагу: помилки **немає**.
2. Змініть код так, щоб помилку в назві `retires` було зловлено, не змінюючи тип `Config`.
--- starter ts
```ts
interface Config { retries?: number; timeout?: number }

const base = { retires: 3, timeout: 10_000 };
export const config: Config = base;
console.log(config.retries ?? 0);
```
--- expected
Запуск оригіналу друкує `0` — ваше налаштування повторів мовчки проігноровано.

Якщо перенести анотацію на сам літерал (`export const config: Config = { retires: 3, timeout: 10_000 };`) або написати `const base = { … } satisfies Config;`, отримаємо:

```text
error TS2561: Object literal may only specify known properties, but 'retires' does not exist in type 'Config'. Did you mean to write 'retries'?
```

=== sources
- [Object Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Differences between type aliases and interfaces — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- [Type compatibility (structural typing) — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [The satisfies operator — TypeScript 4.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [noUncheckedIndexedAccess — TSConfig reference](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess)
- [Differences between Type and Interface — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/differences-between-type-and-interface/)
- [Index Signatures — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/index-signatures/)
- [Interfaces — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/interfaces)
- [Freshness (excess property checks) — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/freshness)
- [Index Signatures — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/index-signatures)
