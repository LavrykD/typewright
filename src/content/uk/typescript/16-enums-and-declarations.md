---
title: Enum, простори імен і файли оголошень
module: TypeScript на практиці
description: Як насправді компілюються enum, чому об'єднання зазвичай кращі, для чого сьогодні простори імен і як .d.ts-файли, declare, @types, глобальне розширення та triple-slash директиви описують код, якого TypeScript не бачить.
level: Intermediate
minutes: 35
---
## Enum компілюються в справжні об'єкти

На відміну від майже всього іншого в TypeScript, `enum` створює JavaScript-код, що виконується.

```ts
enum Status { Idle, Running, Done }      // 0, 1, 2

Status.Running;      // 1
Status[1];           // 'Running' — числові enum мають зворотне відображення
```

Два різновиди:

```ts
enum Browser {                           // рядковий enum: читабельні значення, без зворотного відображення
  Chromium = 'chromium',
  Firefox = 'firefox',
}
```

> [!PITFALL] Числові enum приймають будь-яку змінну типу `number`
> ```ts
> enum Status { Idle, Running, Done }
> function setStatus(s: Status) {}
> setStatus(42);                    // ✗ з TypeScript 5.0 відхиляється (літерал поза діапазоном)
> const fromApi: number = 42;
> setStatus(fromApi);               // ✓ компілюється — приймається будь-яке число
> ```
> Числові enum лишаються присвоюваними з `number` з історичних причин (бітові прапорці), тож значення з JSON чи API прослизає просто так. Рядкові enum не мають цієї «дірки» — зате вони номінальні: не можна передати звичайний рядок `'chromium'` туди, де очікується `Browser`.

### `const enum`

Члени `const enum` **вбудовуються** в кожне місце використання (`Status.Done` стає `2`), а об'єкт не генерується. Це ламається, коли інший файл чи інструмент компілює файли по одному (`isolatedModules`, Babel, esbuild, type stripping у Node), — уникайте його в коді застосунків.

### Краще об'єднання (плюс const-об'єкт, якщо потрібні значення)

```ts
// Тип
type Browser = 'chromium' | 'firefox' | 'webkit';

// Якщо значення потрібні й під час виконання:
const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
type Browser2 = (typeof BROWSERS)[number];

// Або об'єкт з іменованими константами:
const Browser = { Chromium: 'chromium', Firefox: 'firefox' } as const;
type Browser3 = (typeof Browser)[keyof typeof Browser];   // 'chromium' | 'firefox'
```

Об'єднання стираються (нульова ціна під час виконання), працюють зі звичайними рядками з JSON, так само добре автодоповнюються й дозволені з `erasableSyntaxOnly` і type stripping у Node — а enum ні.

## Простори імен (namespace)

`namespace` старший за ES-модулі. Він групує оголошення під однією назвою й компілюється в об'єкт:

```ts
namespace Validation {
  export const isEmail = (s: string) => s.includes('@');
}
Validation.isEmail('a@b.c');
```

У сучасному коді **використовуйте модулі** (`export` з файлу). Простори імен ще трапляються у двох місцях: у старих `.d.ts`-файлах і як простори *лише з типами*, що групують типи (вони стираються й цілком нормальні). Писати `module Foo {}` замість namespace застаріло з TypeScript 6 — використовуйте `namespace`.

## Файли оголошень: опис коду, якого TypeScript не бачить

TypeScript потрібні типи для всього, що ви використовуєте. Для звичайного JavaScript (скрипт із CDN, глобальна змінна, яку додає ваш застосунок, нетипізований пакет) ви описуєте його **амбієнтними оголошеннями** через `declare`. Вони не генерують коду — це обіцянка, що ця річ існує під час виконання.

```ts title="src/globals.d.ts"
// Глобальне значення, яке застосунок кладе у window; читається в Playwright через page.evaluate
declare global {
  interface Window {
    __APP_STATE__: { user?: { id: string }; ready: boolean };
  }
}
export {};   // робить файл модулем, щоб `declare global` був дозволений
```

```ts
// У тесті — тепер типізовано:
const ready = await page.evaluate(() => window.__APP_STATE__.ready);
```

Інтерфейси **зливаються**: повторне оголошення `interface Window` додає члени до вбудованого. Це називається *злиттям оголошень* (declaration merging), і саме так бібліотеки дозволяють розширювати свої типи.

### Нетипізовані пакети

```ts title="src/vendor.d.ts"
declare module 'legacy-csv' {
  export function parse(text: string): string[][];
}
```

Без такого оголошення імпорт нетипізованого пакета падає з *TS7016: Could not find a declaration file for module 'legacy-csv'.*

### Пакети `@types`

Для більшості популярних нетипізованих бібліотек є типи від спільноти в npm під `@types/…` (з проєкту DefinitelyTyped): `npm i -D @types/node`. Пам'ятайте з [уроку 1](#/typescript/mental-model): з TypeScript 6 глобальні пакети треба перелічити в `"types"`.

> [!PITFALL] `.d.ts`-файл, що «не працює»
> Файл оголошень — це або **скрипт** (без `import`/`export` на верхньому рівні: усе в ньому глобальне), або **модуль** (є `import`/`export`: назовні нічого не потрапляє, якщо не використати `declare global`). Один доданий `import` у глобальний `.d.ts` мовчки перетворює його на модуль, і всі його оголошення зникають із глобальної області. А ще переконайтеся, що файл потрапляє в `include` вашого tsconfig.

## Triple-slash директиви

Коментарі `///` на початку файлу — це інструкції компілятору, які трапляються переважно у файлах оголошень:

```ts
/// <reference types="node" />       // підключити пакет @types
/// <reference lib="dom" />          // підключити вбудовану бібліотеку
/// <reference path="./legacy.d.ts" />
```

У коді застосунків вони рідко потрібні: `tsconfig.json` (`types`, `lib`, `include`) — зрозуміліше місце. TypeScript 6 прибрав підтримку `/// <reference no-default-lib="true"/>`, а директива `amd-module` більше нічого не робить.

=== quiz
??? Що з цього створює JavaScript під час виконання?
- [ ] `type Status = 'idle' | 'done'`
- [x] `enum Status { Idle, Done }`
- [ ] `interface Status { value: string }`
- [ ] `declare const status: string`
> Enum компілюються в об'єкт (зі зворотним відображенням для числових членів). Типи, інтерфейси й `declare` стираються.

??? `setStatus(s: Status)` приймає числовий enum зі значеннями 0–2. Який виклик компілюється?
```ts
const fromApi: number = 42;
```
- [ ] `setStatus(42)`
- [x] `setStatus(fromApi)`
- [ ] Жоден
- [ ] Обидва
> З TypeScript 5.0 **літерал** поза діапазоном відхиляється, але будь-яке значення типу `number` і далі приймається — числові enum навмисно «нестрогі» заради сумісності з бітовими прапорцями. Рядкові об'єднання такої «дірки» не мають.

??? Що робить `declare global { interface Window { foo: string } }`?
- [ ] Створює властивість `window.foo` під час виконання
- [x] Додає `foo` до наявного типу `Window` через злиття оголошень — без коду під час виконання
- [ ] Замінює вбудований тип `Window`
- [ ] Нічого, якщо не додати ще й triple-slash директиву
> Амбієнтні оголошення лише описують; однойменні інтерфейси зливаються.

??? Ви додали `import type { User } from './types'` на початок `globals.d.ts`, і його глобальні оголошення перестали працювати. Чому?
- [ ] Імпорти типів заборонені у `.d.ts`
- [x] Імпорт на верхньому рівні робить файл модулем, тож його оголошення більше не глобальні (якщо не загорнути їх у `declare global`)
- [ ] Файл треба перейменувати на `.ts`
- [ ] Потрібна `/// <reference path>`
> Скрипт чи модуль — визначається наявністю import/export на верхньому рівні. У файлах-модулях загортайте глобальні оголошення в `declare global { … }`.

=== task Замініть enum на об'єднання
1. Вставте стартовий код у `src/env.ts`. Увімкніть `erasableSyntaxOnly` (вона вже ввімкнена з уроку 1) і запустіть `npx tsc`.
2. Перепишіть код через `const`-об'єкт + виведений тип-об'єднання, щоб він компілювався, а `node src/env.ts` друкував те саме.
--- starter ts
```ts
enum Env {
  Local = 'local',
  Staging = 'staging',
  Production = 'production',
}

function baseUrl(env: Env): string {
  return env === Env.Production ? 'https://app.example.com' : `https://${env}.example.com`;
}

console.log(baseUrl(Env.Staging));
```
--- expected
Enum не проходить з `erasableSyntaxOnly`:

```text
error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

Переписаний варіант, що компілюється й запускається прямо в Node:

```ts
const Env = { Local: 'local', Staging: 'staging', Production: 'production' } as const;
type Env = (typeof Env)[keyof typeof Env];

function baseUrl(env: Env): string {
  return env === Env.Production ? 'https://app.example.com' : `https://${env}.example.com`;
}

console.log(baseUrl(Env.Staging));   // https://staging.example.com
console.log(baseUrl('local'));       // теж дозволено — звичайні рядки працюють
```

=== task Типізуйте глобальне значення для page.evaluate
У вашій лабораторії Playwright (`pw-lab`) уявіть, що застосунок відкриває `window.__FEATURE_FLAGS__` типу `Record<string, boolean>`.

1. Напишіть тест, що читає його через `page.evaluate(() => window.__FEATURE_FLAGS__)`. Запустіть `npx tsc --noEmit` і зверніть увагу на помилку.
2. Додайте `tests/globals.d.ts` із блоком `declare global`, щоб помилка зникла, а результат став типізованим.
--- hint
Не забудьте `export {};`, щоб файл був модулем і `declare global` був дозволений, — і перевірте, що `include` у вашому tsconfig охоплює теку `tests`.
--- expected
До:

```text
error TS2339: Property '__FEATURE_FLAGS__' does not exist on type 'Window & typeof globalThis'.
```

Після додавання:

```ts
declare global {
  interface Window {
    __FEATURE_FLAGS__: Record<string, boolean>;
  }
}
export {};
```

`npx tsc --noEmit` проходить, а наведення курсора на результат `page.evaluate(...)` показує `Record<string, boolean>`. Під час виконання нічого не змінюється — на сторінці, що не встановлює прапорці, ви все одно отримаєте `undefined`. Тому оголошення — це обіцянка, яку треба дотримувати.

=== sources
- [Enums — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/enums)
- [Enums — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/enums/)
- [Namespaces — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/project/namespaces)
- [Declaration Files — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/intro/d.ts)
- [Merging and Extension — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/merging-and-extension/)
- [Triple-Slash Directives — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/triple-slash-directives/)
- [Declaration Merging — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [Triple-Slash Directives — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html)
