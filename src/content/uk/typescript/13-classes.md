---
title: Класи для тестового коду
module: TypeScript на практиці
description: Можливості класів, потрібні для page objects і помічників, — поля, модифікатори доступу, readonly, приватні #поля, implements, абстрактні класи — і пастка з властивостями-параметрами.
level: Intermediate
minutes: 25
---
## Чому класи тут важливі

Більшість коду на TypeScript можна писати звичайними функціями й об'єктами. Але **Page Object Model** у Playwright зазвичай пишуть класами, тож їх варто добре знати. Мінімальний клас:

```ts
import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel('Email');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string) {
    await this.email.fill(email);
    await this.submit.click();
  }
}
```

## Поля та `strictPropertyInitialization`

У режимі `strict` кожне оголошене поле має бути гарантовано присвоєне в конструкторі:

```ts
class Report {
  title: string;           // ✗ Property 'title' has no initializer and is not definitely assigned in the constructor.
  entries: string[] = [];  // ✓ ініціалізовано на місці
}
```

Присвойте поле в конструкторі, дайте йому ініціалізатор або — лише якщо його справді встановлює щось інше — використайте твердження гарантованого присвоєння `title!: string`.

## Модифікатори доступу проти `#private`

| | `private x` | `#x` |
| --- | --- | --- |
| Хто забезпечує | лише TypeScript (під час компіляції) | середовище виконання JavaScript |
| Доступне через `obj['x']` / під час виконання | так | ні |
| Видно в `JSON.stringify` / `console.log` | так | ні |

`public` (за замовчуванням), `protected` (клас і нащадки) та `private` існують **лише в TypeScript** і стираються. `#name` — справжня приватність JavaScript. Для тестового коду годиться будь-який варіант; просто знайте, що саме ви отримуєте.

## Властивості-параметри — і чому вони стають рідкістю {#parameter-properties-and-why-theyre-becoming-rare}

У TypeScript є скорочення, яке оголошує й присвоює поле з параметра конструктора:

```ts
class LoginPage {
  constructor(private readonly page: Page) {}   // оголошує й присвоює this.page
}
```

> [!PITFALL] Властивості-параметри не «стираються»
> Це скорочення змушує TypeScript *згенерувати* присвоєння `this.page = page`, тож це не чистий синтаксис типів. Вбудований type stripping у Node його відхиляє (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`), а опція `erasableSyntaxOnly` його позначає. Тестовий раннер Playwright перетворює його без проблем, тож у тестах це сьогодні працює, — але явні поля зберігають ваш код переносним на будь-яке середовище виконання.

> [!PITFALL] Ініціалізатори полів, що використовують властивість-параметр
> Цей стиль page objects трапляється в багатьох старих туторіалах:
> ```ts
> class LoginPage {
>   readonly email = this.page.getByLabel('Email');   // ✗
>   constructor(private readonly page: Page) {}
> }
> ```
> Із сучасними цілями компіляції TypeScript використовує стандартні поля класів JavaScript (`useDefineForClassFields`), які виконуються **до** того, як тіло конструктора присвоїть `this.page`. Компілятор повідомляє *TS2729: Property 'page' is used before its initialization*, а починаючи з Playwright 1.65 його тестовий раннер дотримується того самого правила, тож під час виконання `this.page` дорівнює `undefined`. Оголошуйте поля й присвоюйте їх у конструкторі — саме в явному стилі, показаному на початку цього уроку.

## `implements` і `abstract`

`implements` перевіряє, що клас відповідає інтерфейсу, — нічого не змінюючи й не додаючи до класу:

```ts
interface Navigable {
  goto(): Promise<void>;
}

class SettingsPage implements Navigable {
  constructor(readonly page: Page) {}
  async goto() { await this.page.goto('/settings'); }
}
```

**Абстрактний клас** може містити спільний справжній код і змушувати нащадків доповнити решту:

```ts
abstract class BasePage {
  constructor(protected readonly page: Page) {}
  abstract readonly path: string;

  async open() {
    await this.page.goto(this.path);
  }
}

class CartPage extends BasePage {
  readonly path = '/cart';
}
```

> [!WARNING] Ланцюжки наслідування стають крихкими
> Глибокі ієрархії `BasePage → AuthedPage → AdminPage → …` — поширений «запах» page objects. Обирайте невеликі класи, **складені** з компонентів (`Header`, `Table`), а спільне налаштування передавайте через [фікстури Playwright](#/playwright/fixtures), а не через базові класи.

## `this` у колбеках

Методи класу втрачають `this`, коли їх передають як колбеки:

```ts
class Counter {
  count = 0;
  inc() { this.count++; }
}
const c = new Counter();
[1, 2].forEach(c.inc);          // ✗ під час виконання: Cannot read properties of undefined (reading 'count')
[1, 2].forEach(() => c.inc());  // ✓
```

Якщо метод призначений для передавання, визначте його як поле зі стрілковою функцією (`inc = () => { this.count++; }`). Повна історія — зокрема коли стрілкові функції є поганим вибором — в уроці [Стрілкові функції та `this`](#/typescript/arrow-functions-and-this). Про аксесори, статичні члени, міксини й декоратори — в уроці [Просунуті класи](#/typescript/advanced-classes).

=== quiz
??? Що робить `private` на полі класу під час виконання?
- [ ] Ховає поле від іншого коду
- [x] Нічого — модифікатор стирається; його забезпечує лише компілятор
- [ ] Перетворює поле на `#private`
> Модифікатори доступу TypeScript діють лише під час компіляції. `#field` — це можливість JavaScript, що забезпечує приватність під час виконання.

??? Чому вбудована підтримка TypeScript у Node відхиляє `constructor(private page: Page) {}`?
- [ ] Node не підтримує класи
- [ ] `private` — невалідний TypeScript
- [x] Властивості-параметри потребують генерації коду (`this.page = page`), тож їх не можна просто стерти
> Node лише прибирає типи. Можливості, що генерують JavaScript, — властивості-параметри, enum, namespace з кодом — не підтримуються.

??? Що робить `class A implements B`?
- [ ] Копіює методи B в A
- [x] Перевіряє, що форма A відповідає B; під час виконання нічого не додає
- [ ] Змушує A наслідувати прототип B
> `implements` — це лише перевірка під час компіляції.

??? Яке оголошення поля в режимі `strict` є помилкою?
- [ ] `items: string[] = [];`
- [x] `title: string;` без присвоєння в конструкторі
- [ ] `readonly id = crypto.randomUUID();`
> `strictPropertyInitialization` вимагає, щоб кожне поле було гарантовано присвоєне.

=== task Напишіть page object як типізований клас
У чернетковому файлі (браузер не потрібен — це вправа на типізацію) напишіть `TodoPage` для [демо TodoMVC](https://demo.playwright.dev/todomvc).

1. Встановіть лише типи: `npm install -D @playwright/test`.
2. Поля: `page`, `newTodo` (placeholder `What needs to be done?`), `items` (test id `todo-item`).
3. Методи: `goto()`, `add(text: string)` (fill + натискання Enter), `count(): Promise<number>`.
4. Використовуйте явні поля, а не властивості-параметри. Запустіть `npx tsc`.
--- expected
```ts
import type { Locator, Page } from '@playwright/test';

export class TodoPage {
  readonly page: Page;
  readonly newTodo: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTodo = page.getByPlaceholder('What needs to be done?');
    this.items = page.getByTestId('todo-item');
  }

  async goto() {
    await this.page.goto('https://demo.playwright.dev/todomvc');
  }

  async add(text: string) {
    await this.newTodo.fill(text);
    await this.newTodo.press('Enter');
  }

  async count(): Promise<number> {
    return this.items.count();
  }
}
```

`npx tsc` проходить з увімкненою `erasableSyntaxOnly`. Ви використаєте цей клас по-справжньому в [уроці про Page Object Model](#/playwright/page-object-model).

=== sources
- [Classes — TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [Private class features — MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties)
- [erasableSyntaxOnly — TSConfig reference](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly)
- [Page object models — Playwright](https://playwright.dev/docs/pom)
- [Class — The Concise TypeScript Book (gibbok)](https://gibbok.github.io/typescript-book/book/class/)
- [Classes — TypeScript Deep Dive (Basarat)](https://basarat.gitbook.io/typescript/future-javascript/classes)
- [Classes are Useful — TypeScript Deep Dive](https://basarat.gitbook.io/typescript/main-1/classesareuseful)
