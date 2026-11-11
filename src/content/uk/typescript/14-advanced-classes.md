---
title: Просунуті класи — аксесори, статичні члени, міксини й декоратори
module: TypeScript на практиці
description: Геттери й сеттери, автоаксесори, статичні члени й приватні конструктори, спільна поведінка через міксини та стандартні декоратори TypeScript 5 — і де кожен із них доречний (а де ні) у тестовому коді.
level: Advanced
minutes: 35
---
## Геттери та сеттери

Аксесори ззовні виглядають як властивості, але виконують код:

```ts
class Cart {
  #items: { price: number; qty: number }[] = [];

  get total(): number {
    return this.#items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  set discount(percent: number) {
    if (percent < 0 || percent > 100) throw new RangeError('discount must be 0–100');
    this.#discount = percent;
  }
  #discount = 0;
}

const cart = new Cart();
cart.total;          // обчислюється при кожному читанні
cart.discount = 10;  // виконує валідацію
```

`get` без `set` фактично робить властивість доступною лише для читання.

> [!TIP] Нехай сеттери будуть нудними
> Сеттер, що запускає мережеві запити чи важку роботу, дивує читача — `cart.discount = 10` виглядає як дешеве присвоєння. Коли є справжня робота чи можлива невдача, обирайте явний метод (`applyDiscount(10)`).

### Автоаксесори

Ключове слово `accessor` оголошує властивість на основі приватного поля зі згенерованою парою геттер/сеттер. Саме по собі воно мало що змінює — головне його призначення — дати **декораторам** точку для перехоплення:

```ts
class Settings {
  accessor theme = 'light';
}
```

## Статичні члени

Члени `static` належать самому класу, а не екземплярам:

```ts
class TestIds {
  static #next = 0;
  static next(prefix: string) {
    return `${prefix}-${++TestIds.#next}`;
  }
}
TestIds.next('user');   // 'user-1'
```

Блок `static { … }` виконується один раз під час визначення класу — зручно для одноразового налаштування, що потребує приватного доступу.

> [!WARNING] Статичний стан спільний у межах воркера
> У Playwright кожен процес-воркер завантажує ваші модулі один раз, тож статичний (і модульний) стан спільний для всіх тестів цього воркера — і **не** спільний між воркерами. Не використовуйте його для того, що має належати тесту; для цього є фікстури.

## Приватні конструктори й фабрики

`private`-конструктор змушує створювати екземпляри через статичну фабрику — зручно, коли створення асинхронне (конструктори не можуть бути `async`):

```ts
class ApiClient {
  private constructor(private readonly token: string) {}

  static async login(request: APIRequestContext, user: string, password: string) {
    const res = await request.post('/api/login', { data: { user, password } });
    const { token } = await res.json();
    return new ApiClient(token);
  }
}

const client = await ApiClient.login(request, 'ada', 's3cret');
new ApiClient('x');   // ✗ Constructor of class 'ApiClient' is private…
```

(Для стислості тут використано властивість-параметр — у тестах Playwright це нормально, але чому явні поля переносніші, див. в [уроці про класи](#/typescript/classes).)

## Міксини: спільна поведінка без глибокого наслідування

Клас може розширювати лише один базовий клас. **Міксин** — це функція, що приймає клас і повертає його нащадка з додатковою поведінкою, тож кілька міксинів можна поєднувати:

```ts
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
  };
}

function Tagged<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    tags: string[] = [];
    tag(t: string) { this.tags.push(t); return this; }
  };
}

class Report { title = 'nightly'; }
const RichReport = Tagged(Timestamped(Report));

const r = new RichReport();
r.tag('smoke');
r.createdAt; r.title;     // усе типізовано
```

> [!NOTE] Міксини проти композиції
> Міксини працюють, але ускладнюють розуміння ієрархій класів. Для page objects звичайна **композиція** (сторінка *має* `Header` і `Table`) зазвичай зрозуміліша — див. [Page Object Model](#/playwright/page-object-model).

## Декоратори (TypeScript 5+)

Декоратори — це функції, що обгортають або анотують класи та їхні члени. TypeScript 5.0 реалізує **стандартні** (TC39) декоратори — без жодних прапорців. Старіший варіант `experimentalDecorators` (його використовують Angular і NestJS) має іншу сигнатуру; не змішуйте туторіали для цих двох.

```ts
function logged<This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => R,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>,
) {
  return function (this: This, ...args: Args): R {
    console.log(`→ ${String(context.name)}`, ...args);
    return target.call(this, ...args);
  };
}

class Checkout {
  @logged
  pay(amount: number) { return `paid ${amount}`; }
}

new Checkout().pay(42);   // друкує "→ pay 42"
```

Об'єкт `context` повідомляє декоратору, до чого його прикріплено (`kind`, `name`, `static`, `private`, `addInitializer`, `metadata`).

> [!PITFALL] Декораторам потрібен справжній компілятор
> Декоратори генерують код, тож вони **не** стираються: вбудований type stripping у Node падає із синтаксичною помилкою на `@logged`, а `erasableSyntaxOnly` їх відхиляє. Вони працюють, коли ваш код компілює `tsc`, бандлер чи інший повноцінний трансформер. І ще: стандартні декоратори не можуть декорувати **параметри** (стиль Angular `constructor(@Inject() x)` потребує `experimentalDecorators`).

> [!TIP] У Playwright обирайте `test.step`
> Типове застосування декоратора в тестовому коді — «логувати/звітувати кожен метод page object» — краще розв'язується обгортанням методів у `test.step(...)`: це видно у звітах і трейсах, не потребує додаткової компіляції й працює з раннером Playwright одразу.

=== quiz
??? Як ззовні поводиться аксесор `get total()` без `set`?
- [ ] Як метод, який треба викликати як `total()`
- [x] Як властивість лише для читання, що обчислюється при кожному читанні
- [ ] Як статична властивість
- [ ] Як кешоване значення, обчислене один раз
> Аксесори читаються як властивості. Без сеттера присвоєння відхиляється.

??? Навіщо приватний конструктор разом зі статичним методом `create()`?
- [ ] Щоб клас працював швидше
- [x] Щоб контролювати створення — наприклад, асинхронне налаштування чи валідацію, — бо конструктори не можуть бути async
- [ ] Щоб дозволити множинне наслідування
- [ ] Щоб усі екземпляри мали спільний стан
> Конструктори синхронні й не можуть повернути інший тип. Статична фабрика може чекати, перевіряти й повертати екземпляр.

??? Що приймає і що повертає функція-міксин?
- [ ] Об'єкт і його копію
- [x] Клас (конструктор) і нового нащадка з додатковими членами
- [ ] Інтерфейс і клас, що його реалізує
- [ ] Два класи та їхній злитий прототип
> Міксини — це фабрики класів: `(Base) => class extends Base { … }`.

??? Чому `node file.ts` падає на класі з `@logged`?
- [ ] Декоратори видалили з TypeScript
- [x] Декоратори генерують код, тож type stripping у Node не може їх просто стерти
- [ ] Node потребує `experimentalDecorators`
- [ ] Декоратори працюють лише з функціями, а не з класами
> Type stripping лише прибирає типи. Декораторам потрібен компілятор, що переписує клас.

=== task Валідація через сеттер
Напишіть клас `Viewport` з приватними полями `#width` / `#height`, геттерами для обох і сеттером `size`, що приймає `{ width, height }` і кидає `RangeError`, якщо будь-яке значення менше за 320 або більше за 3840. Додайте геттер лише для читання `aspect`.
--- expected
```ts
class Viewport {
  #width = 1280;
  #height = 720;

  get width() { return this.#width; }
  get height() { return this.#height; }
  get aspect() { return +(this.#width / this.#height).toFixed(2); }

  set size({ width, height }: { width: number; height: number }) {
    for (const v of [width, height]) {
      if (v < 320 || v > 3840) throw new RangeError(`Invalid dimension: ${v}`);
    }
    this.#width = width;
    this.#height = height;
  }
}

const v = new Viewport();
v.size = { width: 1920, height: 1080 };
console.log(v.aspect);              // 1.78
v.size = { width: 100, height: 100 };  // RangeError: Invalid dimension: 100
```

`v.aspect = 2` — помилка компіляції (*Cannot assign to 'aspect' because it is a read-only property*).

=== task Поєднайте два міксини
Використовуючи тип `Constructor` з уроку, напишіть `WithRetries` (додає `retries = 0` і `retry()`, що його збільшує) та `WithLabel` (додає `label = ''`). Застосуйте обидва до `class Job { name = 'build'; }` і виведіть усі властивості нового екземпляра.
--- expected
```ts
const RetryableLabelledJob = WithLabel(WithRetries(Job));
const job = new RetryableLabelledJob();
job.retry();
job.label = 'nightly';
console.log(job.name, job.retries, job.label);
```

```text
build 1 nightly
```

Наведення курсора на `job` показує всі три члени типізованими; помилка в назві `job.retrys` — це помилка компіляції.

=== sources
- [Class (accessors, statics, decorators) — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/class/)
- [Mixins — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/type-system/mixins)
- [Classes are Useful — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/classesareuseful)
- [Limit Property Setters — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/propertysetters)
- [Decorators — TypeScript 5.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators)
- [Mixins — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/mixins.html)
