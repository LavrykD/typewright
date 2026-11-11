import { useSyncExternalStore } from 'react';

/** Per-viewer progress, kept in localStorage. Everything degrades gracefully if storage is blocked. */
export interface Progress {
  done: Record<string, true>;          // lesson key → completed
  tasks: Record<string, true>;         // `${lessonKey}#${taskIndex}`
  quiz: Record<string, number>;        // `${lessonKey}#${q}` → chosen option
}

const KEY = 'typewright:progress:v1';
const empty: Progress = { done: {}, tasks: {}, quiz: {} };

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<Progress>) } : empty;
  } catch {
    return empty;
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();

function set(next: Progress) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export const progress = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  toggleDone(key: string) {
    const done = { ...state.done };
    if (done[key]) delete done[key]; else done[key] = true;
    set({ ...state, done });
  },
  toggleTask(key: string) {
    const tasks = { ...state.tasks };
    if (tasks[key]) delete tasks[key]; else tasks[key] = true;
    set({ ...state, tasks });
  },
  answer(key: string, option: number) {
    set({ ...state, quiz: { ...state.quiz, [key]: option } });
  },
  resetQuiz(prefix: string) {
    const quiz = Object.fromEntries(Object.entries(state.quiz).filter(([k]) => !k.startsWith(prefix + '#')));
    set({ ...state, quiz });
  },
  resetAll() { set(empty); },
};

export function useProgress(): Progress {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}
