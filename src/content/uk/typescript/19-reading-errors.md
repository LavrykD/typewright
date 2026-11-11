---
title: Читання помилок TypeScript
module: TypeScript на практиці
description: Як читати помилку TypeScript згори донизу, що насправді означають найпоширеніші коди помилок і спокійна процедура їх виправлення — замість того, щоб глушити.
level: Foundations
minutes: 25
---
## Дві частини кожної помилки

Помилка TypeScript має **код** і **повідомлення**, а повідомлення часто є ланцюжком:

```text
src/run.ts(14,5): error TS2345: Argument of type '{ name: () => string; retries: number; browser: { name: "chromium"; headless: boolean; }; }' is not assignable to parameter of type 'TestConfig'.
  Types of property 'name' are incompatible.
    Type '() => string' is not assignable to type 'string'.
```

- **`src/run.ts(14,5)`** — файл, рядок, стовпчик.
- **`TS2345`** — код помилки. Зручний для пошуку; він вказує *категорію* проблеми.
- **Перший рядок** — підсумок: *що* не так (аргумент не підходить до параметра).
- **Кожен рядок із відступом** відповідає на питання *«чому?»* щодо рядка над ним.

## Читайте згори донизу, дійте за нижнім рядком

Низ ланцюжка — зазвичай справжня причина. У прикладі:

1. Об'єкт конфігурації не підходить до `TestConfig` — *чому?*
2. Його властивість `name` має неправильний тип — *чому?*
3. Це **функція** `() => string`, а очікується `string`.

Тож коли дочитаєте до останнього рядка, виправлення очевидне: десь написано `name: getName` замість `name: getName()`.

> [!TIP] Наводьте курсор, а не мружтеся
> У VS Code наведіть курсор на червоне підкреслення: побачите весь ланцюжок, гарно відформатований. Панель **Problems** показує всі помилки проєкту. А `npx tsc --noEmit --pretty` друкує в терміналі кольорові багаторядкові помилки (в інтерактивному терміналі «гарний» вивід увімкнено за замовчуванням).

## Помилки, які ви бачитимете найчастіше

| Код | Повідомлення (скорочено) | Зазвичай означає |
| --- | --- | --- |
| TS2322 | Type 'X' is not assignable to type 'Y' | присвоєння чи значення, що повертається, має неправильний тип |
| TS2345 | Argument of type 'X' is not assignable to parameter of type 'Y' | те саме, але для аргументу функції |
| TS2339 | Property 'x' does not exist on type 'Y' | друкарська помилка або спершу треба звузити об'єднання |
| TS2741 | Property 'x' is missing in type … but required in type 'Y' | в об'єкті бракує обов'язкового поля |
| TS2353 | Object literal may only specify known properties | зайва/неправильно написана властивість у свіжому літералі |
| TS18048 / TS2532 | 'x' is possibly 'undefined' | обробіть випадок `undefined` (звуження, `?.`, `??`) |
| TS7006 | Parameter 'x' implicitly has an 'any' type | додайте тип параметра |
| TS2307 | Cannot find module 'x' | неправильний шлях, відсутній пакет або розширення |
| TS7016 | Could not find a declaration file for module 'x' | нетипізований пакет — встановіть `@types/x` або оголосіть його |
| TS2769 | No overload matches this call | прочитайте підпомилку кожного перевантаження, щоб знайти найближче |
| TS1484 | 'X' is a type and must be imported using a type-only import | використайте `import type` (`verbatimModuleSyntax`) |
| TS2835 | Relative import paths need explicit file extensions | додайте `.js` / `.ts` при `nodenext` |

> [!PITFALL] Помилку показано там, де зустрічаються типи, а не там, де баг
> TypeScript повідомляє про невідповідність там, де порівнюються два типи, — часто це виклик функції далеко від справжньої помилки. У прикладі помилка вказує на `run(config)`, а баг — там, де збудовано `config`. Коли вказаний рядок виглядає нормально, йдіть за типами **назад** (наводьте курсор на змінні) до місця, де з'явилося неправильне значення.

## Об'єднання літералів роблять помилки точними

```text
src/run.ts(16,41): error TS2322: Type '"webkit"' is not assignable to type '"chromium" | "firefox"'.
```

Коли властивість типізована як об'єднання рядкових літералів, помилка перелічує рівно те, що дозволено, — одна з найкращих причин обирати об'єднання літералів замість `string`.

## Процедура виправлення помилок

:::steps
### Спершу виправте першу помилку
Помилки йдуть каскадом: один неправильний тип на початку може породити десять помилок далі. Виправляйте з початку списку й перезапускайте.
### Дочитайте ланцюжок до кінця
Останній рядок із відступом — справжня причина. Питайте «чому?» на кожному рівні, доки все не стане зрозумілим.
### Наведіть курсор на обидві сторони
Перевірте фактичний тип значення й очікуваний тип. Виведення часто дає щось ширше (`string`) чи вужче (`never`), ніж ви думали.
### Виправляйте значення чи тип — а не перевіряльник
Змініть код або виправте тип. Уникайте `as`, `!`, `any` і `@ts-ignore`, якщо не можете пояснити, *чому* компілятор помиляється.
:::

> [!WARNING] `@ts-ignore` проти `@ts-expect-error`
> Якщо помилку справді треба приглушити, обирайте `// @ts-expect-error <причина>`: вона **падає**, коли помилка зникає, тож приглушення не переживе проблему. `@ts-ignore` мовчки залишається назавжди й ховає також будь-яку *нову* помилку в цьому рядку.

=== quiz
??? Де в багаторядковій помилці зазвичай описано справжню причину?
- [ ] У першому рядку
- [x] В останньому (з найбільшим відступом) рядку
- [ ] У коді помилки
- [ ] У назві файлу та стовпчику
> Перший рядок каже, що не так; кожен вкладений пояснює чому; низ — зазвичай і є справжня невідповідність.

??? `TS2339: Property 'error' does not exist on type 'Result'`, де `Result` — об'єднання. Найімовірніше виправлення?
- [ ] Додати `as any`
- [x] Спершу звузити об'єднання (наприклад, перевірити дискримінант), а потім звертатися до `error`
- [ ] Зробити `error` необов'язковою в кожному члені
- [ ] Вимкнути `strict`
> В об'єднанні можна звертатися лише до властивостей, що є в кожному члені. Звузьте до члена, у якого є `error`.

??? Чому `@ts-expect-error` кращий за `@ts-ignore`?
- [ ] Він швидше компілюється
- [x] Він сам повідомляє про помилку, коли приглушеної помилки вже немає, тож застарілі приглушення помітні
- [ ] Він працює на кількох рядках
- [ ] Його вимагає `strict`
> `@ts-expect-error` «самоочищується»: щойно проблему виправлено, він скаржиться й нагадує його прибрати.

??? Помилка вказує на `run(config)`, а цей рядок виглядає правильно. Що робити?
- [ ] Додати `as TestConfig` до виклику
- [x] Навести курсор на `config` і простежити його тип назад до місця, де створено неправильне значення
- [ ] Перезапустити сервер TypeScript
- [ ] Видалити `node_modules`
> Помилки з'являються там, де порівнюються типи. Справжній баг часто там, де збудовано значення.

=== task Розшифруйте ланцюжок помилки
Вставте стартовий код у `src/decode.ts` і запустіть `npx tsc`. Для кожної помилки запишіть (коментарем) рядок-першопричину з ланцюжка й однорядкове виправлення — а потім застосуйте виправлення, доки `npx tsc` не пройде.
--- starter ts
```ts
type TestConfig = {
  name: string;
  retries: number;
  browser: { name: 'chromium' | 'firefox'; headless: boolean };
};
function getName() { return 'login'; }
function run(config: TestConfig) { console.log(config.name); }

const config = {
  name: getName,
  retries: 2,
  browser: { name: 'chromium' as const, headless: true },
};
run(config);

run({ name: 'a', retries: 1, browser: { name: 'webkit', headless: true } });

const missing: TestConfig = { name: 'x', retries: 1 };
```
--- expected
`npx tsc` показує три помилки:

```text
error TS2345: Argument of type '{ name: () => string; … }' is not assignable to parameter of type 'TestConfig'.
  Types of property 'name' are incompatible.
    Type '() => string' is not assignable to type 'string'.
error TS2322: Type '"webkit"' is not assignable to type '"chromium" | "firefox"'.
error TS2741: Property 'browser' is missing in type '{ name: string; retries: number; }' but required in type 'TestConfig'.
```

Виправлення: викликати функцію (`name: getName()`), використати дозволений браузер (`'firefox'`) — або розширити об'єднання, якщо WebKit має бути дозволений, — і додати відсутню властивість `browser`. Після цього `npx tsc` нічого не друкує.

=== task Зробіть приглушення чесними
1. Додайте `const n: number = 'oops';` з `// @ts-ignore` над ним. Запустіть `npx tsc`.
2. Виправте значення на `1`. Запустіть знову — зверніть увагу: ніщо не каже, що коментар тепер марний.
3. Замініть його на `// @ts-expect-error demo` і запустіть ще раз.
--- expected
З `@ts-ignore` обидва запуски мовчать — застарілий коментар залишився б назавжди.

З `@ts-expect-error` над рядком, де помилки **вже немає**:

```text
error TS2578: Unused '@ts-expect-error' directive.
```

У цьому й суть: приглушення нагадує вам видалити його, щойно проблему розв'язано.

=== sources
- [Interpreting Errors — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/main/interpreting-errors)
- [Common Errors — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main/common-errors)
- [Errors in TypeScript — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main)
- [// @ts-expect-error comments — TypeScript 3.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#-ts-expect-error-comments)
- [pretty — TSConfig reference](https://www.typescriptlang.org/tsconfig/#pretty)
