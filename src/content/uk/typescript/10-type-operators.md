---
title: Оператори типів — keyof, typeof, умовні та відображені типи
module: Потужність рівня типів
description: Будуйте типи з інших типів. typeof та індексований доступ, умовні типи з infer, дистрибуція по об'єднаннях, відображені типи з перейменуванням ключів і типи шаблонних літералів.
level: Advanced
minutes: 40
---
## Типи зі значень: `typeof`

У позиції типу `typeof` дає тип **значення**. Поєднайте його з індексованим доступом, щоб витягати частини:

```ts
const defaults = { baseURL: 'http://localhost:3000', retries: 2, headless: true };

type Defaults = typeof defaults;                // { baseURL: string; retries: number; headless: boolean }
type Retries = Defaults['retries'];             // number
type DefaultKey = keyof typeof defaults;        // "baseURL" | "retries" | "headless"
```

> [!NOTE] Два різні `typeof`
> `typeof x === 'string'` в умові `if` — це оператор JavaScript, що працює під час виконання. `type T = typeof x` — оператор TypeScript рівня типів. Те саме ключове слово, різні світи.

## Умовні типи

Умовний тип обирає один із двох типів залежно від перевірки — `A extends B ? X : Y` читається як «якщо A можна присвоїти B, то X, інакше Y»:

```ts
type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<'hello'>;  // "yes"
type B = IsString<42>;       // "no"
```

### `infer`: зіставлення з шаблоном на рівні типів

Усередині умови `extends` вираз `infer X` захоплює частину типу:

```ts
type ElementOf<T> = T extends (infer E)[] ? E : never;
type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;

type E = ElementOf<string[]>;                 // string
type V = UnwrapPromise<Promise<number>>;      // number
type F = FirstArg<(id: number, x: string) => void>; // number
```

Саме так реалізовано вбудовані `ReturnType`, `Parameters` і `Awaited`.

## Дистрибуція по об'єднаннях

Коли перевіряється «голий» параметр типу, умовні типи **розподіляються** по об'єднаннях — застосовуються до кожного члена окремо:

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type R = ToArray<string | number>;   // string[] | number[]  (а не (string | number)[])
```

Так працює `Exclude<T, U>`: `T extends U ? never : T` відкидає відповідні члени по одному.

> [!PITFALL] Неочікувана дистрибуція (і зникаючий `never`)
> Дистрибуція дивує у двох випадках:
> 1. `ToArray<string | number>` дає `string[] | number[]`, а не `(string | number)[]`.
> 2. `IsString<never>` дає `never`, а не `"no"`, — бо `never` є порожнім об'єднанням, і розподіляти нема по чому.
>
> Щоб вимкнути дистрибуцію, загорніть обидві сторони в кортеж: `type ToArray<T> = [T] extends [unknown] ? T[] : never;`

## Відображені типи (mapped types)

Відображений тип будує об'єктний тип, проходячись по ключах:

```ts
type Flags<T> = { [K in keyof T]: boolean };

type FeatureFlags = Flags<{ darkMode: string; beta: number }>;
// { darkMode: boolean; beta: boolean }
```

Модифікатори можна додавати або прибирати через `+` / `-`:

```ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };   // прибирає `?` — як Required<T>
```

### Перейменування ключів через `as`

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// Фільтрація ключів: відображаємо непотрібні в never
type OnlyStrings<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };
```

## Типи шаблонних літералів

Рядкові типи можна складати, як шаблонні рядки:

```ts
type Method = 'GET' | 'POST';
type Version = 'v1' | 'v2';
type Endpoint = `/${Version}/${'users' | 'orders'}`;
// "/v1/users" | "/v1/orders" | "/v2/users" | "/v2/orders"

type TestId = `data-testid=${string}`;
const ok: TestId = 'data-testid=submit';   // ✓
const bad: TestId = 'id=submit';           // ✗
```

Об'єднання всередині шаблонних літералів перемножуються: 2 × 2 варіанти вище дають 4 рядки.

> [!WARNING] Знайте, коли зупинитися
> Програмування на рівні типів потужне й затягує. Якщо типу потрібен коментар, щоб його зрозуміти, або він породжує нечитабельні повідомлення про помилки для ваших колег, простіший (трохи менш точний) тип зазвичай є кращим інженерним рішенням.

=== quiz
??? Чому дорівнює `R`?
```ts
type ToArray<T> = T extends unknown ? T[] : never;
type R = ToArray<'a' | 'b'>;
```
- [ ] `('a' | 'b')[]`
- [x] `'a'[] | 'b'[]`
- [ ] `never`
- [ ] `unknown[]`
> Умовний тип над «голим» параметром типу розподіляється по об'єднанню й застосовується до кожного члена окремо.

??? Що робить `infer`?
- [ ] Змушує TypeScript вгадати тип зі значень під час виконання
- [x] Захоплює частину типу всередині умови `extends` умовного типу
- [ ] Вимикає виведення для параметра
- [ ] Перетворює значення на тип
> `T extends Promise<infer V> ? V : T` зіставляє з шаблоном і називає внутрішній тип `V`.

??? Чому дорівнює `K`?
```ts
const env = { dev: 'http://localhost', prod: 'https://app.example' };
type K = keyof typeof env;
```
- [ ] `string`
- [x] `"dev" | "prod"`
- [ ] `{ dev: string; prod: string }`
> `typeof env` дає тип об'єкта; `keyof` — об'єднання його ключів.

??? Як зробити всі властивості `T` обов'язковими за допомогою відображеного типу?
- [ ] `{ [K in keyof T]+?: T[K] }`
- [x] `{ [K in keyof T]-?: T[K] }`
- [ ] `{ [K in keyof T]!: T[K] }`
> `-?` прибирає модифікатор необов'язковості. Саме так визначено вбудований `Required<T>`.

??? Скільки членів у цьому об'єднанні?
```ts
type Route = `/${'en' | 'de' | 'fr'}/${'home' | 'about'}`;
```
- [ ] 2
- [ ] 5
- [x] 6
> Типи шаблонних літералів утворюють декартів добуток: 3 × 2 = 6 рядків.

=== task Відтворіть три вбудовані утиліти
Напишіть власні версії в `src/my-utils.ts` — **не** заглядаючи спершу в `lib.es5.d.ts`.

1. `MyReturnType<F>` — тип повернення типу функції.
2. `MyAwaited<T>` — розгортає вкладені проміси: `MyAwaited<Promise<Promise<number>>>` дорівнює `number`.
3. `MyPick<T, K extends keyof T>`.
4. Перевірте кожен за допомогою тестового помічника зі стартового коду — кожен рядок має компілюватися.
--- starter ts
```ts
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// ваші типи тут

type Tests = [
  Expect<Equal<MyReturnType<() => string>, string>>,
  Expect<Equal<MyAwaited<Promise<Promise<number>>>, number>>,
  Expect<Equal<MyPick<{ a: 1; b: 2; c: 3 }, 'a' | 'c'>, { a: 1; c: 3 }>>,
];
```
--- hint
`MyAwaited` має викликати сам себе: `T extends Promise<infer V> ? MyAwaited<V> : T`.
--- expected
```ts
type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;
type MyAwaited<T> = T extends Promise<infer V> ? MyAwaited<V> : T;
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
```

`npx tsc` проходить без помилок. Якщо якийсь тип неправильний, на відповідному рядку побачите `Type 'false' does not satisfy the constraint 'true'` — крихітний тестовий фреймворк, побудований лише з типів.

=== task Типізовані змінні середовища
Згенеруйте тип назв змінних середовища для тестів з об'єкта конфігурації.
--- starter ts
```ts
const services = { api: 3001, web: 3000, auth: 3002 } as const;

// 1. type ServiceName = …           → "api" | "web" | "auth"
// 2. type EnvVar = …                → "API_URL" | "WEB_URL" | "AUTH_URL"
// 3. type Urls = …                  → { API_URL: string; WEB_URL: string; AUTH_URL: string }

// 4. реалізуйте:
// function buildUrls(host: string): Urls
```
--- hint
`Uppercase<K>` — вбудований внутрішній тип. Для кроку 3 використайте відображений тип з перейменуванням ключів через `as` по `ServiceName`.
--- expected
```ts
type ServiceName = keyof typeof services;
type EnvVar = `${Uppercase<ServiceName>}_URL`;
type Urls = { [K in ServiceName as `${Uppercase<K>}_URL`]: string };

function buildUrls(host: string): Urls {
  return {
    API_URL: `${host}:${services.api}`,
    WEB_URL: `${host}:${services.web}`,
    AUTH_URL: `${host}:${services.auth}`,
  };
}
```

Якщо пропустити один ключ або написати його як `APIURL`, буде помилка компіляції.

=== sources
- [Creating Types from Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Conditional Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [Mapped Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [Template Literal Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [Typeof Type Operator — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
- [Mapped Types — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/mapped-types/)
- [Conditional Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/conditional-types/)
- [infer — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/infer-type-inference-in-conditional-types/)
- [Template Union Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/template-union-types/)
- [Moving Types — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/moving-types)
