---
title: Функції, що добре типізуються
module: Базові типи
description: Типи функцій, необов'язкові параметри й параметри за замовчуванням, перевантаження, дивні правила void і типізація асинхронних функцій.
level: Intermediate
minutes: 25
---
## Параметри на вході, тип повернення на виході

Параметрам тип потрібен завжди (його нема з чого вивести). Типи повернення виводяться, але якщо анотувати їх в експортованих функціях, випадкова зміна стане помилкою компіляції у визначенні функції, а не десь у далекому місці виклику.

```ts
export function retryDelay(attempt: number, baseMs = 200): number {
  return baseMs * 2 ** attempt;
}
```

- `baseMs = 200` — **параметр за замовчуванням**: для того, хто викликає, він необов'язковий, а всередині завжди `number`.
- `baseMs?: number` теж був би необов'язковим, але всередині мав би тип `number | undefined` — і `undefined` довелося б обробляти самостійно.

## Типи функцій

```ts
type Predicate<T> = (item: T) => boolean;

const isEven: Predicate<number> = (n) => n % 2 === 0;   // n виведено як number

function filterAll<T>(items: T[], ...preds: Predicate<T>[]): T[] {
  return items.filter((item) => preds.every((p) => p(item)));
}
```

**Rest-параметр** `...preds` збирає будь-яку кількість аргументів у масив.

## `void` — це не `undefined`

Тип повернення `void` у *типі функції* означає «значення, що повертається, буде проігноровано», а не «функція не повинна нічого повертати»:

```ts
const results: number[] = [];
[1, 2, 3].forEach((n) => results.push(n));   // ✓ push повертає число; forEach його ігнорує
```

Ось чому колбеки з типом `() => void` охоче приймають функції, які щось повертають.

> [!PITFALL] `async`-колбеки там, де очікується `void`
> Оскільки `() => void` приймає будь-яку функцію, він приймає й `async`-функцію, що повертає Promise, — і цей Promise **ніхто не чекає**:
> ```ts
> ['a', 'b'].forEach(async (id) => {
>   await deleteUser(id);   // forEach не чекає; помилки стають необробленими відхиленнями
> });
> ```
> Використовуйте `for…of` з `await` або `await Promise.all(ids.map(deleteUser))`. У Playwright саме цей баг змушує кроки виконуватися не по порядку. Правила лінтера `@typescript-eslint/no-misused-promises` і `no-floating-promises` його ловлять.

## Перевантаження

Перевантаження дають одній функції кілька *сигнатур виклику*. Той, хто викликає, бачить сигнатури перевантажень; сигнатура реалізації прихована:

```ts
function parse(input: string): number;
function parse(input: string[]): number[];
function parse(input: string | string[]): number | number[] {
  return Array.isArray(input) ? input.map(Number) : Number(input);
}

const one = parse('42');          // number
const many = parse(['1', '2']);   // number[]
```

> [!TIP] Спершу спробуйте об'єднання або дженерики
> Перевантаження багатослівні, а реалізація перевіряється щодо кожного перевантаження не надто суворо. Якщо тип повернення не залежить від типу входу, простіше використати параметр-об'єднання. Якщо залежить — дженерик часто чистіший.

## Типізація асинхронних функцій

`async`-функція завжди повертає `Promise`. Анотуйте значення, яким він **вирішується**, всередині `Promise<…>`:

```ts
type User = { id: number; name: string };

async function getUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as User;   // чесне твердження: ми цього не перевіряли
}
```

`Awaited<T>` розгортає тип проміса: `Awaited<ReturnType<typeof getUser>>` — це `User`.

## Деструктуровані параметри

Анотуйте весь об'єкт, а не кожне ім'я окремо:

```ts variant="bad"
function login({ email: string, password: string }) {}   // перейменування! створює змінні `string`
```

```ts variant="good"
function login({ email, password }: { email: string; password: string }) {}
```

> [!PITFALL] «Типи» всередині шаблону деструктуризації — це перейменування
> У JavaScript `{ email: string }` у шаблоні означає «візьми `email` і назви його `string`». У режимі `strict` TypeScript повідомить, що параметри неявно мають тип `any`, — але вперше це повідомлення збиває з пантелику. Типи завжди пишуться **після** всього шаблону.

=== quiz
??? Який тип у `timeout` всередині функції?
```ts
function wait(timeout = 1000) { /* … */ }
```
- [ ] `number | undefined`
- [x] `number`
- [ ] `any`
> Значення за замовчуванням означає, що той, хто викликає, може його пропустити, але всередині функції це завжди число.

??? Чому цей код компілюється, хоча `push` повертає число?
```ts
const out: number[] = [];
[1, 2].forEach((n) => out.push(n));
```
- [ ] `forEach` має тип `any`
- [x] Тип функції з поверненням `void` приймає функції, що повертають значення; результат ігнорується
- [ ] Стрілкові функції завжди повертають void
> `void` у типі функції означає «той, хто викликає, ігнорує значення, що повертається», тож передати функцію, яка щось повертає, безпечно.

??? Що не так з цим циклом у стилі Playwright?
```ts
names.forEach(async (name) => {
  await page.getByLabel('Name').fill(name);
});
```
- [ ] Нічого — `forEach` чекає на async-колбеки
- [x] `forEach` не чекає на проміси, тож заповнення перекриваються, а помилки залишаються необробленими
- [ ] `fill` не можна використовувати в циклі
> Використовуйте `for (const name of names) { await … }`, щоб виконувати їх по черзі.

??? Яка анотація деструктурованого параметра правильна?
- [ ] `function f({ id: number }) {}`
- [x] `function f({ id }: { id: number }) {}`
- [ ] `function f({ id }: number) {}`
> Усередині шаблону деструктуризації `id: number` перейменовує `id` на змінну з назвою `number`. Тип пишуть після шаблону.

=== task Виправте баг в асинхронному циклі
Вставте початковий код у `src/cleanup.ts` і запустіть його командою `node src/cleanup.ts`.

1. Зверніть увагу на порядок рядків у виводі.
2. Перепишіть `cleanup` так, щоб видалення відбувалися **одне за одним**, а «done» друкувалося останнім.
3. Потім напишіть `cleanupParallel`, яка видаляє всіх **одночасно**, але все одно друкує «done» останнім.
--- starter ts
```ts
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function deleteUser(id: string): Promise<void> {
  await wait(Math.random() * 100);
  console.log('deleted', id);
}

async function cleanup(ids: string[]) {
  ids.forEach(async (id) => {
    await deleteUser(id);
  });
  console.log('done');
}

await cleanup(['u1', 'u2', 'u3']);
```
--- expected
Оригінал друкує `done` **першим**, а потім видалення у випадковому порядку:

```text
done
deleted u2
deleted u1
deleted u3
```

Послідовна версія (`for (const id of ids) await deleteUser(id);`) завжди друкує:

```text
deleted u1
deleted u2
deleted u3
done
```

Паралельна версія (`await Promise.all(ids.map(deleteUser));`) друкує три видалення у випадковому порядку, а `done` — останнім.

=== task Перевантаження проти дженериків
Напишіть функцію `first`, яка повертає перший елемент масиву або `undefined` для порожнього масиву.

1. Реалізуйте її як дженерик: `function first<T>(items: T[]): T | undefined`.
2. Наведіть курсор на результат `first([1, 2])`, `first(['a'])` і `first([])`.
3. Бонус: напишіть `toArray(x)` з перевантаженнями, щоб і `toArray('a')`, і `toArray(['a'])` повертали `string[]`.
--- expected
```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}
first([1, 2]);   // number | undefined
first(['a']);    // string | undefined
first([]);       // undefined  (T виводиться як never)
```

Робочий набір перевантажень:

```ts
function toArray(x: string): string[];
function toArray(x: string[]): string[];
function toArray(x: string | string[]): string[] {
  return Array.isArray(x) ? x : [x];
}
```

=== sources
- [More on Functions — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [Return type void — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html#return-type-void)
- [Function overloads — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [no-floating-promises — typescript-eslint](https://typescript-eslint.io/rules/no-floating-promises/)
- [no-misused-promises — typescript-eslint](https://typescript-eslint.io/rules/no-misused-promises/)
- [Overloads — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/overloads/)
- [Functions — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/functions)
- [Callable — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/callable)
