---
title: Утилітні типи на кожен день
module: Потужність рівня типів
description: Partial, Required, Readonly, Pick, Omit, Record, Exclude, Extract, NonNullable, ReturnType, Parameters і Awaited — і реальні ситуації, де кожен із них виправдовує себе.
level: Intermediate
minutes: 25
---
## Навіщо утилітні типи

Утилітні типи — це дженерик-типи, що постачаються з TypeScript і перетворюють інші типи. Вони дають змогу **виводити** типи замість дублювання — тож коли оригінал змінюється, усе виведене з нього оновлюється автоматично.

## Форма об'єктів

| Утиліта | Що робить | Типове застосування |
| --- | --- | --- |
| `Partial<T>` | усі властивості необов'язкові | дані для оновлення, перевизначення опцій |
| `Required<T>` | усі властивості обов'язкові | конфігурація після застосування значень за замовчуванням |
| `Readonly<T>` | усі властивості readonly | заморожена конфігурація, знімки стану |
| `Pick<T, K>` | залишає лише ключі `K` | форма, що редагує частину сутності |
| `Omit<T, K>` | прибирає ключі `K` | дані для «створення» без `id` |
| `Record<K, V>` | об'єкт із ключами `K` і значеннями `V` | таблиці відповідностей, мапи тестових даних |

```ts
interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: Date;
}

type NewUser = Omit<User, 'id' | 'createdAt'>;          // що приймає ендпоінт «створення»
type UserUpdate = Partial<Pick<User, 'name' | 'role'>>; // що можна змінити в «редагуванні профілю»
type UsersByRole = Record<User['role'], User[]>;        // { admin: User[]; member: User[] }

interface Options { retries?: number; timeout?: number }

function withDefaults(opts: Partial<Options>): Required<Options> {
  return { retries: 2, timeout: 30_000, ...opts };
}
```

> [!PITFALL] `Omit` не перевіряє ключі, які ви прибираєте
> `Pick<User, 'emial'>` — це помилка, а от `Omit<User, 'emial'>` мовчки компілюється (ключ просто не прибирається), бо параметр ключів у `Omit` має обмеження `K extends keyof any`. Через друкарську помилку властивість залишається на місці. Якщо це важливо, визначте сувору версію: `type StrictOmit<T, K extends keyof T> = Omit<T, K>;`

> [!PITFALL] `Omit` на об'єднанні його сплющує
> `Omit` не дистрибутивний. На дискримінованому об'єднанні він залишає лише ключі, спільні для всіх членів, і руйнує дискриміновану форму. Використовуйте дистрибутивний помічник:
> ```ts
> type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
> ```

## Фільтрація об'єднань

```ts
type Status = 'idle' | 'running' | 'passed' | 'failed' | null;

type Finished = Extract<Status, 'passed' | 'failed'>;  // "passed" | "failed"
type Active = Exclude<Status, 'passed' | 'failed'>;    // "idle" | "running" | null
type Known = NonNullable<Status>;                      // прибирає null і undefined
```

## Типи з функцій

Часто потрібний тип вам не належить — зате у вас є функція. Виведіть тип із неї:

```ts
async function createOrder(userId: number, items: string[], opts?: { express: boolean }) {
  return { id: 'o_1', total: 42, eta: new Date() };
}

type CreateOrderArgs = Parameters<typeof createOrder>;
// [userId: number, items: string[], opts?: { express: boolean } | undefined]

type Order = Awaited<ReturnType<typeof createOrder>>;
// { id: string; total: number; eta: Date }
```

> [!TIP] Виведення типів зі сторонніх бібліотек
> Це працює і для стороннього коду. Якщо бібліотека експортує функцію, але не тип її опцій, `Parameters<typeof fn>[0]` дасть вам тип опцій — зручно з API Playwright: `type GotoOptions = Parameters<Page['goto']>[1];`

## Інші корисні вбудовані типи

- `ReturnType<F>`, `Parameters<F>`, `ConstructorParameters<C>`, `InstanceType<C>`
- `Awaited<T>` — рекурсивно розгортає проміси
- `NoInfer<T>` — блокує виведення з певної позиції (див. [Дженерики](#/typescript/generics))
- `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` — для рядкових літеральних типів

=== quiz
??? Вам потрібні дані для «створення користувача»: усі поля `User`, крім `id` і `createdAt`. Що найкраще?
- [ ] `Partial<User>`
- [x] `Omit<User, 'id' | 'createdAt'>`
- [ ] `Pick<User, 'id' | 'createdAt'>`
- [ ] `Exclude<User, 'id' | 'createdAt'>`
> `Omit` прибирає ключі з об'єктного типу. `Exclude` фільтрує члени об'єднання, а не ключі об'єкта.

??? Чим відрізняються `Exclude` і `Omit`?
- [ ] Це синоніми
- [x] `Exclude` прибирає члени з об'єднання; `Omit` прибирає властивості з об'єктного типу
- [ ] `Exclude` працює лише з рядками
> `Exclude<'a' | 'b', 'a'>` дорівнює `'b'`. `Omit<{ a: 1; b: 2 }, 'a'>` дорівнює `{ b: 2 }`.

??? Чому дорівнює `T`?
```ts
async function load() { return [1, 2, 3]; }
type T = ReturnType<typeof load>;
```
- [ ] `number[]`
- [x] `Promise<number[]>`
- [ ] `Awaited<number[]>`
> `async`-функція повертає Promise. Загорніть у `Awaited<…>`, щоб отримати `number[]`.

??? Чи дає `Omit<User, 'emial'>` (з друкарською помилкою) помилку компіляції?
- [ ] Так, невідомі ключі відхиляються
- [x] Ні — `Omit` приймає будь-який ключ, тож друкарська помилка мовчки нічого не прибирає
> `Omit<T, K extends keyof any>` не обмежує ключі до `keyof T`. `Pick` — обмежує.

=== task Виводьте, а не дублюйте
У `src/orders.ts`, почавши зі стартового коду, виведіть кожен тип з `Order` або з функцій. Не пишіть вручну жодного об'єктного типу, окрім `Order`.
--- starter ts
```ts
export interface Order {
  id: string;
  customerEmail: string;
  items: { sku: string; qty: number }[];
  status: 'draft' | 'paid' | 'shipped' | 'cancelled';
  createdAt: Date;
}

export async function fetchOrders(status?: Order['status']) {
  return [] as Order[];
}

// 1. NewOrder: Order без id, status і createdAt
// 2. OrderPatch: лише необов'язкові status та items
// 3. OpenStatus: усі статуси, крім 'shipped' і 'cancelled'
// 4. FetchOrdersResult: значення, яким вирішується fetchOrders
// 5. FetchStatusArg: тип першого параметра fetchOrders
```
--- expected
```ts
type NewOrder = Omit<Order, 'id' | 'status' | 'createdAt'>;
type OrderPatch = Partial<Pick<Order, 'status' | 'items'>>;
type OpenStatus = Exclude<Order['status'], 'shipped' | 'cancelled'>;   // "draft" | "paid"
type FetchOrdersResult = Awaited<ReturnType<typeof fetchOrders>>;      // Order[]
type FetchStatusArg = Parameters<typeof fetchOrders>[0];               // Order['status'] | undefined
```

Тепер додайте статус `'refunded'` до `Order` — `OpenStatus` підхопить його автоматично, без жодних інших правок.

=== sources
- [Utility Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Indexed Access Types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [Distributive conditional types — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)
- [Predefined Conditional Types — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/predefined-conditional-types/)
- [Type Manipulation — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/type-manipulation/)
