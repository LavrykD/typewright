---
title: Сумісність типів — твердження, варіантність і брендовані типи
module: Потужність рівня типів
description: Коли TypeScript дозволяє одному типу заступити інший — твердження типів і їхня небезпека, коваріантність і контраваріантність, «дірка» біваріантності методів і брендовані типи для ідентифікаторів, які не можна змішувати.
level: Advanced
minutes: 40
---
## Уся гра — у присвоюваності

Майже кожна помилка типів — це те саме питання: *чи можна тип S присвоїти типу T?* TypeScript відповідає на нього **структурно** (за формою) і, заради зручності, не є ідеально **коректним** (sound) — кілька небезпечних речей дозволено навмисно. Цей урок — про те, де ці «дірки».

## Твердження типу: `as`

Твердження каже компілятору: «повір, це саме такий тип». Під час виконання воно **нічого** не робить — це не приведення й не перетворення.

```ts
const el = document.getElementById('price') as HTMLInputElement;
el.value;               // компілятор задоволений — а впаде, якщо це насправді <span> чи null
```

TypeScript дозволяє твердження лише тоді, коли один тип міг би бути іншим (один присвоюваний іншому):

```ts
const n = 'x' as number;
// ✗ TS2352: Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other.
```

Обхідний шлях — **подвійне твердження** через `unknown`: воно компілюється, і це майже завжди тривожний сигнал:

```ts
const n = 'x' as unknown as number;   // компілюється; бреше під час виконання
```

> [!PITFALL] `{} as Foo` ховає відсутні властивості
> ```ts
> const user = {} as User;          // ✓ компілюється — user.name під час виконання дорівнює undefined
> const user2: User = {};           // ✗ Property 'name' is missing…
> ```
> Анотація перевіряє об'єкт; твердження перевірку вимикає. Обирайте анотації або `satisfies`, а `as` залишайте для фактів, яких компілятор справді не може знати (наприклад, тип DOM-елемента з відомим id).

### Твердження non-null `!`

`value!` прибирає `null | undefined` з типу. Те саме: жодної перевірки під час виконання.

```ts
const token = process.env.TOKEN!;   // string — а під час виконання undefined, якщо не задано
```

У тестах краще явна перевірка, що гучно падає: `if (!token) throw new Error('TOKEN is not set');`.

## Варіантність: у який бік тече присвоюваність?

Нехай `Cat` присвоюваний `Animal`:

| Варіантність | Значення | Де трапляється |
| --- | --- | --- |
| **Коваріантність** | `Box<Cat>` → `Box<Animal>` ✓ | типи повернення, незмінні дані |
| **Контраваріантність** | `Box<Animal>` → `Box<Cat>` ✓ | **параметри** функцій |
| **Інваріантність** | має точно збігатися | змінні дані (у коректній системі) |
| **Біваріантність** | в обидва боки | параметри методів (навмисна «дірка») |

Контраваріантність параметрів логічна: обробник, що приймає *будь-яку* тварину, безпечно використати там, де очікують обробник котів, — але не навпаки.

```ts
type Handlers = {
  onCat: (c: Cat) => void;
  onAnimal: (a: Animal) => void;
};

h.onCat = h.onAnimal;   // ✓ обробляє будь-яку тварину, тож котів — точно
h.onAnimal = h.onCat;   // ✗ Types of parameters 'c' and 'a' are incompatible. Property 'meow' is missing…
```

Ця помилка — заслуга `strictFunctionTypes` (частина `strict`).

> [!PITFALL] Синтаксис методу й досі біваріантний
> `strictFunctionTypes` діє лише для **властивостей функціонального типу** (`onCat: (c: Cat) => void`). Параметри, оголошені **синтаксисом методу** (`handle(a: Animal): void`), залишаються біваріантними, тож цей код компілюється — і може впасти:
> ```ts
> interface AnimalHandler { handle(a: Animal): void }
> const h: AnimalHandler = { handle(c: Cat) { c.meow(); } };   // ✓ компілюється!
> h.handle({ name: 'Rex' });                                    // 💥 c.meow is not a function
> ```
> Для колбеків, які ви визначаєте самі, обирайте синтаксис властивості: `handle: (a: Animal) => void`.

> [!WARNING] Масиви коваріантні — і це некоректно
> `const animals: Animal[] = cats;` дозволено, а потім `animals.push(dog)` кладе собаку в масив `cats`. TypeScript приймає це заради зручності. Для параметрів, які ви не збираєтеся змінювати, використовуйте `readonly Animal[]` — незмінні масиви коваріантні безпечно.

### Анотації варіантності

Для дженерик-типів можна явно вказати задуману варіантність: `out` (коваріантний) і `in` (контраваріантний). TypeScript перевірить оголошення на відповідність:

```ts
interface Producer<out T> { get(): T }
interface Consumer<in T> { accept(value: T): void }
```

Потрібні вони рідко — переважно у великих бібліотеках.

## Номінальна типізація через бренди

Через структурну типізацію два рядкові ідентифікатори взаємозамінні — і це зазвичай баг, що чекає свого часу:

```ts
function cancelOrder(orderId: string) { /* … */ }
cancelOrder(user.id);    // ✓ компілюється — не той ID!
```

**Бренд** додає властивість, що існує лише в типах, тож структурно однакові типи перестають збігатися:

```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

const toOrderId = (raw: string) => raw as OrderId;   // єдине, свідоме твердження

function cancelOrder(id: OrderId) { /* … */ }
cancelOrder(toOrderId('o_1'));   // ✓
cancelOrder(userId);             // ✗ Type '"UserId"' is not assignable to type '"OrderId"'.
cancelOrder('o_1');              // ✗ Type 'string' is not assignable to type '{ readonly __brand: "OrderId"; }'.
```

Під час виконання `UserId` — звичайний рядок, бренд нічого не коштує. Помістіть єдиний `as` у функцію-конструктор (найкраще таку, що перевіряє формат), а всюди інде використовуйте брендований тип.

=== quiz
??? Що робить `const el = x as HTMLInputElement` під час виконання?
- [ ] Перетворює `x` на елемент input
- [ ] Кидає помилку, якщо `x` не input
- [x] Нічого — змінює лише те, у що вірить компілятор
- [ ] За лаштунками викликає `instanceof`
> Твердження стираються. Якщо потрібна гарантія під час виконання, перевіряйте через `instanceof` або type guard.

??? Чому `h.onAnimal = h.onCat` — помилка в режимі `strict`?
- [ ] Коти — не тварини
- [x] Параметри функцій перевіряються контраваріантно: обробник лише котів не може приймати будь-яку тварину
- [ ] Функціональні типи інваріантні
- [ ] Через `noImplicitAny`
> `strictFunctionTypes` робить параметри функціональних типів контраваріантними. Зворотне присвоєння (`onCat = onAnimal`) — нормальне.

??? Яке оголошення зберігає небезпечну біваріантну перевірку параметрів навіть зі `strict`?
- [ ] `handle: (a: Animal) => void`
- [x] `handle(a: Animal): void`
- [ ] `readonly handle: (a: Animal) => void`
> Синтаксис методу виключено зі `strictFunctionTypes`. Для типів колбеків, які ви контролюєте, використовуйте синтаксис властивості.

??? Яка ціна брендованого типу на кшталт `string & { __brand: 'UserId' }` під час виконання?
- [ ] Додаткова властивість на кожному рядку
- [ ] Об'єкт-обгортка
- [x] Жодної — бренд існує лише в системі типів
- [ ] Звертання до Symbol
> Бренди стираються. Єдиний код під час виконання — валідація, яку ви поклали у функцію-конструктор.

=== task Не плутайте ідентифікатори
У `src/ids.ts`:

1. Створіть брендовані типи `UserId` і `ProjectId` та функції-конструктори `userId(raw)` / `projectId(raw)`, що кидають помилку, якщо рядок не починається з `u_` / `p_`.
2. Напишіть `addMember(project: ProjectId, user: UserId)`.
3. Викличте її правильно, потім із переставленими аргументами, потім із «сирими» рядками. Запустіть `npx tsc`.
--- expected
```ts
type UserId = string & { readonly __brand: 'UserId' };
type ProjectId = string & { readonly __brand: 'ProjectId' };

export function userId(raw: string): UserId {
  if (!raw.startsWith('u_')) throw new Error(`Not a user id: ${raw}`);
  return raw as UserId;
}
export function projectId(raw: string): ProjectId {
  if (!raw.startsWith('p_')) throw new Error(`Not a project id: ${raw}`);
  return raw as ProjectId;
}
```

Виклик із переставленими аргументами й виклик із сирими рядками — обидва помилки компіляції (`Type '"UserId"' is not assignable to type '"ProjectId"'` і `Type 'string' is not assignable to type '{ readonly __brand: "ProjectId"; }'`); компілюється лише правильний виклик. Під час виконання ідентифікатори — звичайні рядки.

=== task Знайдіть «дірку» біваріантності
1. Вставте стартовий код у `src/variance.ts` і запустіть `npx tsc` — зауважте, що він компілюється.
2. Запустіть `node src/variance.ts` і прочитайте помилку.
3. Змініть **лише** інтерфейс `Listener`, щоб погане присвоєння стало помилкою компіляції.
--- starter ts
```ts
type Animal = { name: string };
type Cat = Animal & { meow(): void };

interface Listener {
  notify(a: Animal): void;
}

const catListener: Listener = {
  notify(c: Cat) { c.meow(); },
};

catListener.notify({ name: 'Rex' });
```
--- expected
Оригінал компілюється, але падає:

```text
TypeError: c.meow is not a function
```

Перехід на синтаксис властивості — `notify: (a: Animal) => void;` — змушує `npx tsc` повідомити про проблему в місці присвоєння:

```text
error TS2322: Type '(c: Cat) => void' is not assignable to type '(a: Animal) => void'.
```

=== sources
- [Type Assertion — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/type-assertion)
- [Type Compatibility — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/type-compatibility)
- [Nominal Typing — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/nominaltyping)
- [Others: Covariance and Contravariance — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/others/)
- [Erased Structural Types — The Concise TypeScript Book](https://gibbok.github.io/typescript-book/book/erased-structural-types/)
- [strictFunctionTypes — TSConfig reference](https://www.typescriptlang.org/tsconfig/#strictFunctionTypes)
- [Type Compatibility — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
