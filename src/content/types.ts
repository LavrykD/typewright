export type TrackId = 'typescript' | 'playwright';

export type Level = 'Foundations' | 'Intermediate' | 'Advanced';

export interface Source {
  title: string;
  url: string;
}

export interface QuizQuestion {
  /** The question. Inline markdown (`code`, **bold**) is supported. */
  q: string;
  /** Optional code shown under the question. */
  code?: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** Why the answer is right (and why the tempting wrong answer is wrong). */
  explain: string;
}

export interface Task {
  title: string;
  /** Markdown: what to do, step by step. */
  steps: string;
  /** Optional starter code to copy. */
  starter?: string;
  starterLang?: string;
  hints?: string[];
  /** Markdown: what you should see when you're done (code, terminal output, behaviour). */
  expected: string;
}

export interface Lesson {
  slug: string;
  track: TrackId;
  module: string;
  title: string;
  description: string;
  level: Level;
  minutes: number;
  /** Markdown body. See src/lib/markdown.tsx for supported syntax. */
  body: string;
  quiz: QuizQuestion[];
  tasks: Task[];
  sources: Source[];
}

export interface Track {
  id: TrackId;
  name: string;
  tagline: string;
  version: string;
  lessons: Lesson[];
}
