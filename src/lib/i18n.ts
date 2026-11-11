import { useSyncExternalStore } from 'react';
import type { Level } from '../content/types';

export type Lang = 'en' | 'uk';
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'uk', label: 'УК', name: 'Українська' },
];

/* ---------- language store (per-viewer, localStorage) ---------- */

const KEY = 'typewright:lang';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'uk') return saved;
  } catch { /* storage unavailable */ }
  const prefs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  return prefs.some((l) => /^uk\b/i.test(l)) ? 'uk' : 'en';
}

let lang: Lang = initial();
const listeners = new Set<() => void>();

export function setLang(next: Lang) {
  lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
  document.documentElement.lang = next;
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => lang,
    () => lang,
  );
}

/* ---------- plurals ---------- */

/** Ukrainian plural: 1 урок, 2 уроки, 5 уроків, 21 урок, 11 уроків. */
function ukPlural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const enPlural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* ---------- strings ---------- */

const en = {
  langLabel: 'Language',
  nav: { typescript: 'TypeScript', playwright: 'Playwright', bottlenecks: 'Bottlenecks', search: 'Search lessons…', openNav: 'Open navigation', sections: 'Sections' },
  progressTitle: (d: number, t: number) => `${d} of ${t} lessons complete`,
  loading: 'Loading…',
  notFound: 'Lesson not found',
  backHome: 'Back home',
  levels: { Foundations: 'Foundations', Intermediate: 'Intermediate', Advanced: 'Advanced' } as Record<Level, string>,
  minutes: (n: number) => `${n} min`,
  hours: (n: number) => `~${n} hours`,
  lessons: (n: number) => `${n} ${enPlural(n, 'lesson', 'lessons')}`,
  lessonsOf: (d: number, t: number) => `${d}/${t} lessons`,
  completeCount: (n: number) => `${n} complete`,
  qAndT: (q: number, t: number) => `${q} ${enPlural(q, 'question', 'questions')} · ${t} ${enPlural(t, 'task', 'tasks')}`,
  home: {
    badge: 'Built on the official docs',
    title: 'Learn TypeScript and Playwright, one hard thing at a time.',
    lead: 'A self-study knowledge base with clear explanations, real examples, quizzes that explain themselves, and hands-on tasks with the result you should end up with.',
    start: 'Start with TypeScript',
    continue: (t: string) => `Continue: ${t}`,
    jump: 'Jump to Playwright',
    tracksEyebrow: 'Two tracks',
    tracksTitle: "Pick a track. They're designed to be learned together.",
    tracksLead: 'Playwright tests are written in TypeScript, so every TypeScript lesson pays off twice. Start with TypeScript if generics or narrowing feel fuzzy.',
    howEyebrow: 'How every lesson works',
    howTitle: 'Read it, see it, test yourself, build it.',
    how: [
      { t: 'Clear explanation', d: 'The mental model first, then the details — written from the official docs, with links to every source.' },
      { t: 'Real examples', d: 'Runnable code with “avoid / prefer” pairs, so you see the mistake next to the fix.' },
      { t: 'Self-explaining quiz', d: 'Every answer — right or wrong — tells you why. Retry as often as you like.' },
      { t: 'Manual tasks', d: 'Step-by-step tasks for your own editor, with the exact result you should end up with.' },
    ],
    bnEyebrow: 'The bottleneck wiki',
    bnTitle: (n: number) => `The ${n} things that trip everyone up.`,
    bnLead: 'Every “bottleneck” callout across the curriculum, collected in one place — the questions you’d otherwise lose an afternoon to.',
    bnOpen: 'Open the wiki',
    footer: 'Typewright — a personal study companion. Content is based on the official TypeScript and Playwright documentation; always check the sources for the latest details.',
    reset: 'Reset progress',
    resetConfirm: 'Reset all progress (lessons, tasks and quiz answers)? This can’t be undone.',
    mock: { eyebrow: 'TypeScript · Core types', title: 'Narrowing & discriminated unions', nav: ['Mental model', 'Narrowing', 'Generics', 'Type operators', 'tsconfig'], toc: ['typeof guards', 'in operator', 'Discriminants', 'Exhaustiveness'], tocTitle: 'On this page', quiz: 'What does', quizEnd: 'prove here?' },
  },
  track: { overview: (name: string) => `${name} overview` },
  lesson: {
    checkYourself: 'Check yourself',
    checkIntro: 'Answer from memory first. Every answer explains the why — wrong answers are where the learning is.',
    handsOn: 'Hands-on tasks',
    handsIntro: (d: number, t: number) => `Do these in your own editor. There’s no auto-grading — compare against the expected result, then tick it off. (${d}/${t} done)`,
    sources: 'Sources',
    sourcesIntro: 'This lesson is based on these official and trusted references. When in doubt, they win.',
    completeTitle: 'Lesson complete',
    completePrompt: 'Finished reading and practising?',
    savedLocally: 'Progress is saved in this browser.',
    markComplete: 'Mark lesson complete',
    completed: 'Completed',
    previous: 'Previous',
    next: 'Next',
    onThisPage: 'On this page',
  },
  quiz: {
    answered: (a: number, t: number) => `${a} of ${t} answered`,
    correct: (c: number, t: number) => `${c} of ${t} correct`,
    retry: 'Retry',
    right: 'Correct.',
    wrong: 'Not quite.',
  },
  task: {
    label: (n: number) => `Task ${n}`,
    hint: 'Hint',
    starter: 'Starter code',
    show: 'Show expected result',
    hide: 'Hide expected result',
    done: 'I did this',
    expected: 'What you should end up with',
  },
  code: {
    avoid: 'Avoid', prefer: 'Prefer', copy: 'Copy', copied: 'Copied', copyLabel: 'Copy code',
    langs: { ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', js: 'JavaScript', javascript: 'JavaScript', json: 'JSON', bash: 'Terminal', sh: 'Terminal', yaml: 'YAML', yml: 'YAML', html: 'HTML', text: 'Output' } as Record<string, string>,
  },
  callout: { note: 'Note', tip: 'Tip', warning: 'Warning', pitfall: 'Bottleneck' },
  bottlenecks: {
    eyebrow: 'Wiki',
    title: 'Bottlenecks',
    lead: 'The hard parts, in one place. Each entry is pulled straight from a lesson — open it to see the full explanation, examples and a task to practise it.',
    all: (n: number) => `All (${n})`,
  },
  search: {
    placeholder: 'Search: generics, storageState, flaky, satisfies…',
    none: (q: string) => `No matches for “${q}”.`,
    label: 'Search lessons',
  },
};

export type Strings = typeof en;

const uk: Strings = {
  langLabel: 'Мова',
  nav: { typescript: 'TypeScript', playwright: 'Playwright', bottlenecks: 'Вузькі місця', search: 'Пошук уроків…', openNav: 'Відкрити навігацію', sections: 'Розділи' },
  progressTitle: (d, t) => `Завершено ${d} з ${t} уроків`,
  loading: 'Завантаження…',
  notFound: 'Урок не знайдено',
  backHome: 'На головну',
  levels: { Foundations: 'Основи', Intermediate: 'Середній рівень', Advanced: 'Поглиблено' },
  minutes: (n) => `${n} хв`,
  hours: (n) => `~${n} год`,
  lessons: (n) => `${n} ${ukPlural(n, 'урок', 'уроки', 'уроків')}`,
  lessonsOf: (d, t) => `${d}/${t} ${ukPlural(t, 'урок', 'уроки', 'уроків')}`,
  completeCount: (n) => `завершено: ${n}`,
  qAndT: (q, t) => `${q} ${ukPlural(q, 'запитання', 'запитання', 'запитань')} · ${t} ${ukPlural(t, 'завдання', 'завдання', 'завдань')}`,
  home: {
    badge: 'На основі офіційної документації',
    title: 'Вивчайте TypeScript і Playwright — по одній складній темі за раз.',
    lead: 'База знань для самонавчання: зрозумілі пояснення, реальні приклади, тести, що пояснюють кожну відповідь, і практичні завдання з результатом, який має у вас вийти.',
    start: 'Почати з TypeScript',
    continue: (t) => `Продовжити: ${t}`,
    jump: 'Перейти до Playwright',
    tracksEyebrow: 'Два напрями',
    tracksTitle: 'Оберіть напрям. Їх задумано вивчати разом.',
    tracksLead: 'Тести Playwright пишуть на TypeScript, тож кожен урок TypeScript окупається двічі. Почніть із TypeScript, якщо дженерики чи звуження типів поки що здаються туманними.',
    howEyebrow: 'Як побудований кожен урок',
    howTitle: 'Прочитайте, побачте, перевірте себе, зробіть самі.',
    how: [
      { t: 'Зрозуміле пояснення', d: 'Спершу ментальна модель, потім деталі — на основі офіційної документації, з посиланнями на кожне джерело.' },
      { t: 'Реальні приклади', d: 'Робочий код із парами «уникайте / краще так», щоб помилку було видно поруч із виправленням.' },
      { t: 'Тест із поясненнями', d: 'Кожна відповідь — правильна чи ні — пояснює, чому. Проходьте скільки завгодно разів.' },
      { t: 'Практичні завдання', d: 'Покрокові завдання для вашого редактора з точним результатом, який має вийти.' },
    ],
    bnEyebrow: 'Вікі вузьких місць',
    bnTitle: (n) => `${n} ${ukPlural(n, 'пастка', 'пастки', 'пасток')}, на яких спотикаються всі.`,
    bnLead: 'Усі позначки «вузьке місце» з курсу в одному місці — питання, на які інакше можна витратити пів дня.',
    bnOpen: 'Відкрити вікі',
    footer: 'Typewright — особистий помічник для навчання. Матеріали ґрунтуються на офіційній документації TypeScript і Playwright; найсвіжіші деталі завжди перевіряйте за джерелами.',
    reset: 'Скинути прогрес',
    resetConfirm: 'Скинути весь прогрес (уроки, завдання й відповіді на тести)? Це не можна скасувати.',
    mock: { eyebrow: 'TypeScript · Базові типи', title: 'Звуження типів і дискриміновані об’єднання', nav: ['Ментальна модель', 'Звуження', 'Дженерики', 'Оператори типів', 'tsconfig'], toc: ['typeof-перевірки', 'оператор in', 'Дискримінанти', 'Вичерпність'], tocTitle: 'На цій сторінці', quiz: 'Що тут доводить', quizEnd: '?' },
  },
  track: { overview: (name) => `${name}: огляд` },
  lesson: {
    checkYourself: 'Перевірте себе',
    checkIntro: 'Спершу відповідайте з пам’яті. Кожна відповідь пояснює «чому» — саме на помилках і вчаться.',
    handsOn: 'Практичні завдання',
    handsIntro: (d, t) => `Виконуйте їх у власному редакторі. Автоматичної перевірки немає — порівняйте з очікуваним результатом і позначте завдання. (Виконано: ${d}/${t})`,
    sources: 'Джерела',
    sourcesIntro: 'Урок спирається на ці офіційні та перевірені матеріали. Якщо є сумнів — праві вони.',
    completeTitle: 'Урок завершено',
    completePrompt: 'Прочитали й попрактикувалися?',
    savedLocally: 'Прогрес зберігається в цьому браузері.',
    markComplete: 'Позначити урок завершеним',
    completed: 'Завершено',
    previous: 'Назад',
    next: 'Далі',
    onThisPage: 'На цій сторінці',
  },
  quiz: {
    answered: (a, t) => `Відповідей: ${a} з ${t}`,
    correct: (c, t) => `Правильно: ${c} з ${t}`,
    retry: 'Пройти ще раз',
    right: 'Правильно.',
    wrong: 'Не зовсім.',
  },
  task: {
    label: (n) => `Завдання ${n}`,
    hint: 'Підказка',
    starter: 'Початковий код',
    show: 'Показати очікуваний результат',
    hide: 'Сховати очікуваний результат',
    done: 'Виконано',
    expected: 'Що має вийти',
  },
  code: {
    avoid: 'Уникайте', prefer: 'Краще так', copy: 'Копіювати', copied: 'Скопійовано', copyLabel: 'Копіювати код',
    langs: { ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', js: 'JavaScript', javascript: 'JavaScript', json: 'JSON', bash: 'Термінал', sh: 'Термінал', yaml: 'YAML', yml: 'YAML', html: 'HTML', text: 'Вивід' },
  },
  callout: { note: 'Примітка', tip: 'Порада', warning: 'Увага', pitfall: 'Вузьке місце' },
  bottlenecks: {
    eyebrow: 'Вікі',
    title: 'Вузькі місця',
    lead: 'Найскладніше — в одному місці. Кожен запис узято з уроку: відкрийте його, щоб побачити повне пояснення, приклади й завдання для практики.',
    all: (n) => `Усі (${n})`,
  },
  search: {
    placeholder: 'Пошук: generics, storageState, звуження, satisfies…',
    none: (q) => `Нічого не знайдено за запитом «${q}».`,
    label: 'Пошук уроків',
  },
};

const ALL: Record<Lang, Strings> = { en, uk };

export function useT(): Strings {
  return ALL[useLang()];
}

/** ⌘K on Apple platforms, Ctrl K elsewhere. */
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const searchShortcut = isMac ? '⌘K' : 'Ctrl K';
