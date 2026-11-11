---
title: Стрілкові функції та `this`
module: Початок роботи
description: Як JavaScript визначає `this`, чому стрілкові функції його захоплюють, коли стрілки — поганий вибір, стрілкові властивості класу й наслідування, а також пастка з поверненням об'єктного літерала.
level: Foundations
minutes: 30
---
## `this` визначається викликом, а не місцем оголошення

Для звичайної функції `function` значення `this` встановлюється тим, **як її викликано**:

| Виклик | `this` дорівнює |
| --- | --- |
| `obj.method()` | `obj` |
| `method()` (звичайний виклик, суворий режим) | `undefined` |
| `method.call(x)` / `.apply(x)` / `.bind(x)()` | `x` |
| `new Thing()` | новий об'єкт |

Тож та сама функція може бачити різні `this`:

```ts
const counter = {
  count: 0,
  inc() { this.count++; },
};

counter.inc();            // ✓ this === counter
const inc = counter.inc;
inc();                    // ✗ TypeError: Cannot read properties of undefined (reading 'count')
```

Модулі й класи завжди виконуються в суворому режимі, тож «загублений» `this` дорівнює `undefined` — і ви отримуєте падіння, а не тихе звертання до глобального об'єкта.

## Стрілкові функції захоплюють `this`

Стрілкова функція **не має власного `this`** — вона використовує `this` того місця, де її написано (лексичний `this`). Власного `arguments` у неї теж немає.

```ts
class Timer {
  seconds = 0;

  startBroken() {
    setInterval(function () {
      this.seconds++;          // ✗ тут `this` — не Timer
    }, 1000);
  }

  start() {
    setInterval(() => {
      this.seconds++;          // ✓ стрілка використовує `this` методу start()
    }, 1000);
  }
}
```

З `noImplicitThis` (частина `strict`) TypeScript повідомляє про зламану версію: *'this' implicitly has type 'any' because it does not have a type annotation.*

До того ж стрілки просто коротші:

```ts
const double = (n: number) => n * 2;
const ids = users.map((u) => u.id);
```

## Стрілкові функції як властивості класу

Коли метод **передаватимуть далі** — як обробник подій чи колбек, — визначте його як властивість зі стрілковою функцією, щоб він був прив'язаний до екземпляра:

```ts
class Cart {
  items: string[] = [];
  add = (item: string) => { this.items.push(item); };   // завжди прив'язаний
}

const cart = new Cart();
['mug', 'pen'].forEach(cart.add);   // ✓ працює — `this` дорівнює cart
```

Якщо ви завжди викликаєте його лише як `cart.add(...)`, звичайний метод підходить — і він кращий (див. нижче).

> [!WARNING] Компроміси стрілкових властивостей
> Стрілкова властивість створюється **для кожного екземпляра** (звичайний метод живе один раз у прототипі), її не можна викликати через `super.add()` з нащадка, і тестові «шпигуни» на `Cart.prototype.add` її не побачать. Використовуйте стрілкові властивості лише для функцій, які ви комусь передаєте.

## Коли стрілка **не** підходить

Деякі бібліотеки викликають ваш колбек зі змістовним `this` — наприклад, обробник `addEventListener` у DOM (`this` — це елемент) або `function () { this.timeout(5000) }` у Mocha. Якщо документація каже «`this` — це …» всередині колбека, використовуйте `function`, бо стрілка проігнорує цей `this`.

Потрібні і `this` бібліотеки, і зовнішній? Спершу збережіть зовнішній:

```ts
const self = this;
element.addEventListener('click', function () {
  self.log(this);   // `this` = елемент, `self` = зовнішній об'єкт
});
```

## Стрілки та наслідування

Оскільки стрілкових властивостей немає в прототипі, нащадок не може дістатися батьківської версії через `super`.

> [!PITFALL] Старий трюк «збережи батьківську стрілку» більше не проходить перевірку типів
> Старші матеріали радять скопіювати батьківську стрілку в поле перед перевизначенням:
> ```ts
> class Child extends Adder {
>   private superAdd = this.add;          // ✗ TS2729
>   add = (b: number) => this.superAdd(b) * 10;
> }
> ```
> Із сучасною семантикою полів класу (`useDefineForClassFields`, значення за замовчуванням для актуальних цілей компіляції) TypeScript повідомляє *TS2729: Property 'add' is used before its initialization*. Якщо щось має перевизначатися, зробіть це **методом прототипу**, а прив'язуйте там, де передаєте:
> ```ts
> class Adder {
>   a: number;
>   constructor(a: number) { this.a = a; }
>   add(b: number) { return this.a + b; }
> }
> class Child extends Adder {
>   override add(b: number) { return super.add(b) * 10; }
> }
> const child = new Child(1);
> [2].map((b) => child.add(b));   // [30] — прив'язка стрілкою в місці виклику
> ```

## Повернення об'єктного літерала

```ts
const make = () => { bar: 123 };     // ✗ повертає undefined!
const make2 = () => ({ bar: 123 });  // ✓ повертає { bar: 123 }
```

У першому рядку `{` відкриває **тіло функції**, а `bar:` розбирається як *мітка* (label), тож функція нічого не повертає. TypeScript спокійно виводить `() => void` — без жодної помилки. Загортайте об'єктні літерали в дужки й анотуйте тип повернення невеликих помічників: з `(): { bar: number } => { bar: 123 }` ви отримаєте *TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.*

## Явна типізація `this`

Функція може оголосити тип `this` як фіктивний перший параметр — під час виконання його немає:

```ts
function onClick(this: HTMLButtonElement, e: MouseEvent) {
  this.disabled = true;
}
button.addEventListener('click', onClick);   // ✓ перевірено
onClick(new MouseEvent('click'));            // ✗ The 'this' context of type 'void' is not assignable…
```

## У Playwright

Ваш тестовий код майже повністю складається зі стрілкових функцій: `test('…', async ({ page }) => { … })`. Playwright передає все через **аргумент із фікстурами**, а не через `this`, тож стрілки — саме те, що треба. (Це одна з причин, чому в Playwright немає стилю Mocha з `this.timeout()` — використовуйте `test.setTimeout()`.)

=== quiz
??? Що станеться?
```ts
const obj = { n: 1, get() { return this.n; } };
const g = obj.get;
g();
```
- [ ] Поверне `1`
- [ ] Поверне `undefined`
- [x] Кине помилку, бо при звичайному виклику `this` дорівнює `undefined` (модулі суворі)
- [ ] Поверне глобальне `n`
> `this` береться з місця виклику. Перед `g()` немає об'єкта, тож у суворому коді `this` дорівнює `undefined`, і `this.n` кидає помилку.

??? Чому стрілкова функція всередині методу бачить `this` методу?
- [ ] Стрілки прив'язують `this` до глобального об'єкта
- [x] Стрілки не мають власного `this`; вони використовують навколишній (лексичний) `this`
- [ ] TypeScript автоматично додає `.bind(this)`
- [ ] Стрілки завжди отримують об'єкт, де їх визначено, як аргумент
> Лексичний `this` — визначальна властивість стрілкових функцій. Для сучасних цілей компілятор нічого не додає.

??? Що поверне `const f = () => { ok: true }; f()`?
- [ ] `{ ok: true }`
- [x] `undefined`
- [ ] `true`
- [ ] Синтаксичну помилку
> Фігурні дужки — це тіло функції, а `ok:` — мітка. Використовуйте `() => ({ ok: true })`.

??? Коли для колбека краще звичайна `function`?
- [ ] Завжди — стрілки повільніші
- [x] Коли бібліотека навмисно задає `this` для колбека (наприклад, обробники DOM, Mocha)
- [ ] Коли колбек асинхронний
- [ ] Коли TypeScript не може вивести типи параметрів
> Стрілка проігнорує `this`, який надає бібліотека. Якщо документація говорить про `this` у вашому колбеку — використовуйте `function`.

=== task Виправте загублений `this`
1. Збережіть стартовий код як `src/timer.ts` і запустіть `npx tsc`, потім `node src/timer.ts`.
2. Виправте `tick` так, щоб передача його в `setTimeout` працювала, — не змінюючи рядок із `setTimeout`.
3. Потім поверніть як було й виправте інакше: залиште `tick` звичайним методом і змініть лише рядок із `setTimeout`.
--- starter ts
```ts
class Stopwatch {
  elapsed = 0;
  tick() {
    this.elapsed += 1;
    console.log('elapsed', this.elapsed);
  }
  start() {
    setTimeout(this.tick, 10);
  }
}
new Stopwatch().start();
```
--- expected
`npx tsc` **проходить** — TypeScript не може знати, що `this.tick` втратить `this`, коли його передають як значення. Під час виконання код навіть не падає:

```text
elapsed NaN
```

Node викликає колбеки таймерів із `this`, що дорівнює його внутрішньому об'єкту `Timeout` (браузери використовують `window`), тож `this.elapsed` дорівнює `undefined`, а `undefined + 1` — це `NaN`. Загублений `this`, що *не* кидає помилку, — найгірший вид багу: тихо неправильні дані.

Виправлення 1 — стрілкова властивість: `tick = () => { this.elapsed += 1; console.log('elapsed', this.elapsed); };`

Виправлення 2 — прив'язка в місці виклику: `setTimeout(() => this.tick(), 10);` (або `setTimeout(this.tick.bind(this), 10)`).

Обидва друкують:

```text
elapsed 1
```

=== task Пастка з об'єктним літералом
1. Напишіть `const enable = () => { active: true };` і виведіть `enable()`. Запустіть `npx tsc`, потім `node`.
2. Додайте тип повернення: `const enable = (): { active: boolean } => { active: true };` і знову запустіть `npx tsc`.
3. Виправте.
4. Бонус: спробуйте `const toUser = (name: string) => { name, active: true };` і прочитайте помилку.
--- expected
Крок 1 компілюється без жодної помилки й друкує `undefined` — фігурні дужки є тілом функції, а `active:` — міткою.

Крок 2 перетворює тихий баг на помилку компіляції:

```text
error TS2355: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
```

Виправлено: `const enable = (): { active: boolean } => ({ active: true });`

Бонусна версія навіть не розбирається — `name, active: true` не є коректною інструкцією всередині блоку:

```text
error TS1005: ';' expected.
```

Висновок: анотуйте типи повернення невеликих помічників і загортайте об'єктні літерали, що повертаються, у `( )`.

=== sources
- [Arrow Functions — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/future-javascript/arrow-functions)
- [this — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/recap/this)
- [Class: this — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/class/)
- [Arrow function expressions — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [this — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [Declaring this in a function — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/functions.html#declaring-this-in-a-function)
