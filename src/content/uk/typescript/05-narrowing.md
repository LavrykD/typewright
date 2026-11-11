---
title: Звуження типів і дискриміновані об'єднання
module: Базові типи
description: Як TypeScript стежить за вашими if-умовами, щоб уточнювати типи; патерн дискримінованого об'єднання для моделювання реальних даних і перевірки вичерпності через never.
level: Foundations
minutes: 30
---
## Що таке звуження

Об'єднання на кшталт `string | number` означає «щось одне з цього». Перш ніж викликати методи, що є лише в рядків, ви маєте *довести*, що саме у вас. TypeScript читає ваші перевірки під час виконання і **звужує** тип у кожній гілці — це називають аналізом потоку керування (control-flow analysis).

```ts
function format(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase();   // value: string
  }
  return value.toFixed(2);        // value: number
}
```

Пам'ятайте [ментальну модель](#/typescript/mental-model): типи стираються, тож звуження завжди працює через **справжні перевірки JavaScript** над значеннями.

## Інструменти звуження

| Перевірка | Що звужує | Приклад |
| --- | --- | --- |
| `typeof x === '…'` | примітиви (`string`, `number`, `boolean`, `undefined`, `function`, `object`…) | `typeof id === 'number'` |
| перевірка на істинність | прибирає `null`, `undefined` (а також `''` і `0`!) | `if (user) …` |
| `===` / `!==` | літеральні значення, `null` | `if (status === 'done') …` |
| `'key' in x` | об'єднання об'єктів за наявністю властивості | `if ('error' in res) …` |
| `x instanceof C` | екземпляри класів | `if (e instanceof TimeoutError) …` |
| `Array.isArray(x)` | масиви | `if (Array.isArray(input)) …` |

> [!PITFALL] `typeof null === 'object'`
> Класика JavaScript: перевірка `typeof x === 'object'` **не** виключає `null`. TypeScript це знає й залишає `null` у типі — тому всюди й трапляється `typeof x === 'object' && x !== null`.

## Дискриміновані об'єднання — патерн для моделювання реальних даних

Дайте кожному члену об'єднання спільну літеральну властивість (**дискримінант**). Перевірка цієї властивості звужує весь об'єкт:

```ts
type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string; retryable: boolean }
  | { status: 'loading' };

function render(result: ApiResult<string[]>) {
  switch (result.status) {
    case 'success':
      return result.data.join(', ');           // тут data існує
    case 'error':
      return result.retryable ? 'Retry…' : result.message;
    case 'loading':
      return 'Loading…';
  }
}
```

Порівняйте зі стилем «мішок необов'язкових полів», де ніщо не заважає неможливим станам:

```ts variant="bad"
type ApiResult = {
  loading: boolean;
  data?: string[];
  error?: string;   // чи можуть data І error бути заданими одночасно? тип це дозволяє
};
```

```ts variant="good"
type ApiResult =
  | { status: 'success'; data: string[] }
  | { status: 'error'; error: string }
  | { status: 'loading' };   // неможливі стани тепер просто не виразити
```

## Вичерпність через `never`

Коли ви обробили всі випадки, тип, що залишився, — `never`. Присвойте його змінній типу `never`, і TypeScript видасть помилку того дня, коли хтось додасть новий варіант і забуде його обробити:

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function icon(result: ApiResult<unknown>) {
  switch (result.status) {
    case 'success': return '✓';
    case 'error':   return '✗';
    case 'loading': return '…';
    default:        return assertNever(result);
  }
}
```

Додайте `| { status: 'cancelled' }` до `ApiResult` — і `assertNever(result)` стане червоним: *Argument of type '{ status: "cancelled" }' is not assignable to parameter of type 'never'.*

## Власні type guards і функції-твердження

Коли перевірка надто складна, щоб писати її прямо в умові, винесіть її у функцію, що повертає **предикат типу**:

```ts
type User = { id: number; email: string };

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'number' &&
    'email' in value && typeof value.email === 'string'
  );
}

const data: unknown = await res.json();
if (isUser(data)) {
  data.email;   // User
}
```

**Функція-твердження** (assertion function) звужує тип, кидаючи помилку замість повернення boolean:

```ts
function assertIsDefined<T>(value: T, msg?: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) throw new Error(msg ?? 'Expected a value');
}

const el = document.querySelector('#app');
assertIsDefined(el);
el.innerHTML = '…';  // Element, а не Element | null
```

> [!WARNING] Предикат — це ваша обіцянка
> TypeScript повністю довіряє `value is User` — він не перевіряє, чи тіло вашої функції справді це доводить. Помилковий guard так само небезпечний, як `as User`. Тестуйте свої guards.

> [!TIP] Виведені предикати типів
> Починаючи з TypeScript 5.5, прості фільтри звужують тип автоматично: `ids.filter((id) => id !== undefined)` перетворює `(number | undefined)[]` на `number[]`, і писати `id is number` самому не треба.

## Коли звуження «губиться»

Звуження стосується конкретного посилання в конкретній точці коду. Його можна скинути:

```ts
function handle(user: { name?: string }) {
  if (user.name) {
    setTimeout(() => {
      user.name.length;   // ✗ possibly undefined — колбек виконається пізніше; user.name могло змінитися
    });
  }
}
```

> [!PITFALL] Звуження не переживає колбеків для змінних властивостей
> Усередині колбека TypeScript не може знати, що властивість тим часом не перепризначили. Спершу скопіюйте її в `const`: `const name = user.name; if (name) setTimeout(() => name.length);`

=== quiz
??? Яка перевірка звужує `x: string | null` до `string` **і** не виключає випадково порожній рядок?
- [ ] `if (x)`
- [x] `if (x !== null)`
- [ ] `if (typeof x === 'object')`
- [ ] `if (!!x)`
> Перевірка на істинність виключає також `''`, а це цілком валідний рядок. Порівняння з `null` прибирає саме той випадок, який ви маєте на увазі.

??? Чим може бути `value: string | Date | null` після `if (typeof value === 'object')`?
- [ ] `Date`
- [x] `Date | null`
- [ ] `object`
- [ ] `string | Date`
> У JavaScript `typeof null` дорівнює `'object'`, тож TypeScript залишає `null` у звуженому типі.

??? Що робить об'єднання «дискримінованим»?
- [ ] Кожен його член — клас
- [x] Кожен член має спільну властивість з окремим літеральним типом
- [ ] Його оголошено через `interface`, а не `type`
- [ ] Воно містить `never`
> Спільна властивість із літеральним типом (як-от `status: 'success' | 'error'`) дає змогу одним `===` чи `switch` звузити весь об'єкт.

??? Чим допомагає `assertNever(result)` у гілці `default`?
- [ ] Пришвидшує роботу switch
- [x] Якщо додати новий варіант об'єднання й не обробити його, `result` вже не буде `never` — і це помилка компіляції
- [ ] Ловить помилки виконання з API
- [ ] Знімає потребу в типі повернення
> Коли всі випадки оброблено, залишається тип `never`. Необроблений новий випадок залишає там справжній тип, який не можна передати в параметр типу `never`.

??? Що TypeScript перевіряє в тілі `function isUser(v: unknown): v is User`?
- [ ] Що перевірено кожну властивість `User`
- [ ] Що функція повертає `true` лише для валідних користувачів
- [x] Лише те, що функція повертає boolean, — самому предикату TypeScript довіряє
> Предикати типів — неперевірені твердження. Помилковий guard мовчки дає неправильні типи, тож тримайте guards маленькими й покритими тестами.

=== task Змоделюйте запуск тесту дискримінованим об'єднанням
Створіть `src/test-run.ts`. Опишіть стан тесту Playwright як дискриміноване об'єднання й напишіть функцію, що його описує.

1. Визначте `TestRun` з чотирма станами: `queued`, `running` (має `startedAt: number`), `passed` (має `durationMs: number`), `failed` (має `error: string` і `retry: number`).
2. Напишіть `describe(run: TestRun): string` із `switch` за дискримінантом.
3. Додайте вичерпну гілку `default` з `assertNever`.
4. Нарешті додайте п'ятий стан `skipped` з `reason: string` — і **до того**, як його обробити, запустіть `npx tsc`.
--- hint
Дискримінант можна назвати `state` або `status`. У випадку `failed` щось на кшталт ``return `failed after ${run.retry} retries: ${run.error}`;``.
--- expected
Форма приблизно така:

```ts
type TestRun =
  | { state: 'queued' }
  | { state: 'running'; startedAt: number }
  | { state: 'passed'; durationMs: number }
  | { state: 'failed'; error: string; retry: number };
```

Після додавання `skipped`, але до його обробки, `npx tsc` показує помилку на рядку з `assertNever(run)`, подібну до:

```text
error TS2345: Argument of type '{ state: "skipped"; reason: string; }' is not assignable to parameter of type 'never'.
```

Додавання `case 'skipped':` знову робить код таким, що компілюється.

=== task Напишіть і зламайте type guard
1. Напишіть `isProduct(value: unknown): value is Product` для `type Product = { sku: string; price: number; tags: string[] }`.
2. Перевірте її на: валідному продукті, `null`, `{ sku: 'A1', price: '9.99', tags: [] }` і `{ sku: 'A1', price: 9.99 }`.
3. Потім навмисно приберіть із guard перевірку `price` і переконайтеся, що TypeScript усе одно компілює код.
--- hint
`tags` перевіряйте так: `Array.isArray(value.tags) && value.tags.every((t) => typeof t === 'string')`.
--- expected
Виведення чотирьох результатів друкує:

```text
true false false false
```

Після видалення перевірки `price` код компілюється без жодної помилки — а третій вхід (ціна рядком) тепер повертає `true`. Саме тому предикатам потрібні тести: компілятор довіряє їм наосліп.

=== sources
- [Narrowing — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Discriminated unions — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Exhaustiveness checking — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- [Assertion functions — TypeScript 3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions)
- [Inferred type predicates — TypeScript 5.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates)
- [Narrowing — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/narrowing/)
- [Control Flow Analysis — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/control-flow-analysis/)
- [Discriminated Unions — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/discriminated-unions/)
- [Type Guard — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/typeguard)
- [Never Type — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/never)
