---
title: Модулі та tsconfig без сліз
module: TypeScript на практиці
description: ESM проти CommonJS, module і moduleResolution, import type і verbatimModuleSyntax, розширення файлів і опції tsconfig, які справді мають значення.
level: Intermediate
minutes: 30
---
## Дві системи модулів

У JavaScript дві системи модулів, і більшість болю з «не знаходить модуль» походить від їхнього змішування:

| | ES-модулі (ESM) | CommonJS (CJS) |
| --- | --- | --- |
| Синтаксис | `import` / `export` | `require()` / `module.exports` |
| У Node обирається через | `"type": "module"` у package.json або `.mjs` / `.mts` | за замовчуванням або `.cjs` / `.cts` |
| `await` на верхньому рівні | ✓ | ✗ |
| `__dirname` | ✗ (використовуйте `import.meta.dirname`) | ✓ |

Можна писати синтаксис `import` у файлі `.ts` і все одно отримати CommonJS — TypeScript вирішує це на основі `module` і вашого package.json.

## `module` і `moduleResolution`: оберіть смугу

Запам'ятовувати всі комбінації не потрібно. Є два добрі набори налаштувань:

```json title="Код, що виконується в Node (скрипти, сервери, інструменти)"
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
```

```json title="Код, що проходить через бандлер (Vite, webpack тощо)"
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

`nodenext` точно моделює поведінку Node — зокрема **вимогу розширень файлів** у відносних імпортах в ESM. `bundler` моделює те, що дозволяють бандлери (імпорти без розширень, мапи `exports`).

> [!PITFALL] «Relative import paths need explicit file extensions»
> З `nodenext` і ESM рядок `import { x } from './utils'` не працює: *Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'.* Сам Node вимагає розширення. Пишіть `./utils.js` (так, `.js` — файл, який буде під час виконання), а коли запускаєте `.ts` напряму — `./utils.ts` разом із `rewriteRelativeImportExtensions` або `allowImportingTsExtensions`.

> [!WARNING] Застаріле в TypeScript 6
> `moduleResolution: "node"` (він же `node10`) позначено застарілим, `classic` видалено, а `baseUrl` більше не працює як корінь пошуку модулів. Старі туторіали використовують усі три. Використовуйте `nodenext` або `bundler`, а для псевдонімів — `paths` (або `imports` у package.json, наприклад `#/utils`).

## `import type` і `verbatimModuleSyntax`

Коли імпортуєте щось лише як тип, скажіть про це:

```ts
import type { Page, Locator } from '@playwright/test';  // повністю стирається
import { test, expect, type TestInfo } from '@playwright/test';
```

З `verbatimModuleSyntax: true` TypeScript **вимагає** `type` для імпортів лише типів. Правило стає простим: імпорт без `type` залишається у вихідному коді, імпорт із `type` зникає. Це важливо, бо середовища, що лише прибирають типи (Node, esbuild), не можуть зазирнути в інші файли, щоб вгадати, чи є імпорт типом.

## Опції tsconfig, які варто знати

| Опція | Що робить | Рекомендація |
| --- | --- | --- |
| `strict` | Вмикає родину суворих перевірок (null checks, implicit any, …). З 6.0 за замовчуванням `true` | Завжди вмикайте |
| `noUncheckedIndexedAccess` | `arr[i]` має тип `T \| undefined` | Вмикайте для нового коду |
| `exactOptionalPropertyTypes` | `x?: string` не приймає явного `undefined` | За бажанням; сувора, але шумна |
| `noEmit` | Лише перевірка типів, без виводу | Коли JS обробляє бандлер чи раннер |
| `skipLibCheck` | Не перевіряти файли `.d.ts` у node_modules | Увімкнено — економить час і чужі помилки |
| `types` | Які глобальні пакети `@types` підключати. З 6.0 за замовчуванням `[]` | Перелічіть потрібні: `["node"]` |
| `target` / `lib` | Який синтаксис JS генерувати / які вбудовані API доступні | `esnext` або свіжий `es20xx` |
| `isolatedModules` | Кожен файл має компілюватися окремо | Мається на увазі в сценаріях `verbatimModuleSyntax` |
| `erasableSyntaxOnly` | Забороняє enum, namespace і властивості-параметри | Увімкніть, якщо запускаєте TS напряму в Node |

> [!TIP] Подивіться підсумкову конфігурацію
> `npx tsc --showConfig` друкує остаточну, злиту конфігурацію — разом з усім, що успадковано через `extends`. Це найшвидший спосіб відповісти на питання «чому ця опція ввімкнена?».

## Псевдоніми шляхів

```json
{
  "compilerOptions": {
    "paths": { "@pages/*": ["./tests/pages/*"] }
  }
}
```

> [!PITFALL] `paths` впливає лише на перевірку типів
> `paths` підказує *перевіряльнику типів*, як знаходити імпорти; він їх не переписує. Те, що виконує ваш код, теж має розуміти псевдонім. Тестовий раннер Playwright і Vite читають `paths` самі, а звичайний Node — ні: там використовуйте `"imports"` у package.json (`#pages/*`), які Node підтримує нативно.

=== quiz
??? Який імпорт працює з `module: "nodenext"` в ESM-пакеті?
- [ ] `import { sum } from './math'`
- [x] `import { sum } from './math.js'`
- [ ] `import { sum } from 'math'`
> ESM-завантажувач Node вимагає повних відносних шляхів із розширеннями, і `nodenext` застосовує те саме правило. Ви пишете розширення файлу, який існуватиме під час виконання.

??? Що змінює `verbatimModuleSyntax`?
- [ ] Перетворює всі імпорти на require()
- [x] Імпорти залишаються або прибираються точно так, як написано, — імпорти лише типів мають використовувати `import type`
- [ ] Вимикає перевірку типів імпортів
> Правило стає передбачуваним: немає ключового слова `type` — імпорт залишається у вихідному JavaScript.

??? Який `moduleResolution` має використовувати застосунок на Vite?
- [ ] `node`
- [ ] `classic`
- [x] `bundler`
- [ ] `nodenext`
> `bundler` відповідає тому, що дозволяють бандлери. `node`/`node10` у TypeScript 6 застарілий, а `classic` видалено.

??? Ви додали `"paths": { "@utils/*": ["./src/utils/*"] }`, і `node src/main.ts` не знаходить `@utils/date`. Чому?
- [ ] Синтаксис `paths` неправильний
- [x] `paths` лише підказує перевіряльнику типів; Node не читає tsconfig
- [ ] Потрібен ще й `baseUrl`
> Node сам знаходить модулі. Для псевдонімів, які працюють під час виконання, використовуйте `imports` у package.json.

=== task Діагностуйте налаштування модулів
У проєкті `ts-lab`:

1. Створіть `src/math.ts`, що експортує `sum(a: number, b: number)`.
2. У `src/main.ts` напишіть `import { sum } from './math';` і виведіть `sum(2, 3)`.
3. Запустіть `npx tsc` і прочитайте помилку.
4. Виправте імпорт для вашого налаштування (у вас увімкнено `rewriteRelativeImportExtensions` з уроку 1) і запустіть `node src/main.ts`.
5. Запустіть `npx tsc --showConfig` і знайдіть у виводі `strict` і `types`.
--- expected
Крок 3 показує:

```text
error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './math.js'?
```

З `import { sum } from './math.ts';` і `npx tsc`, і `node src/main.ts` проходять успішно, друкуючи `5`.

`--showConfig` друкує злитий JSON з `"strict": true` і `"types": ["node"]`.

=== task Імпорти лише типів
1. Увімкніть `verbatimModuleSyntax` (вона вже є в конфігурації з уроку 1).
2. Створіть `src/types.ts`, що експортує `export type User = { id: number }`.
3. В іншому файлі напишіть `import { User } from './types.ts';` і запустіть `npx tsc`.
4. Виправте.
--- expected
```text
error TS1484: 'User' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

Виправлено так: `import type { User } from './types.ts';`. Якби ви запустили зламану версію в Node, вона впала б під час виконання з `SyntaxError` про те, що модуль не надає експорту з назвою `User`, — бо типів під час виконання не існує.

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
