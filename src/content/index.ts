import type { Lesson, Track, TrackId } from './types';
import { pwLessons, tsLessons } from './loader';
import { parse, type Block } from '../lib/markdown';

export const tracks: Track[] = [
  {
    id: 'typescript',
    name: 'TypeScript',
    tagline: 'From “it compiles” to types that catch real bugs — narrowing, generics, type-level tools and the config that trips everyone up.',
    version: 'TypeScript 7.0',
    lessons: tsLessons,
  },
  {
    id: 'playwright',
    name: 'Playwright',
    tagline: 'Reliable end-to-end tests: locators, auto-waiting, fixtures, auth, network control, debugging and killing flakiness.',
    version: 'Playwright 1.65',
    lessons: pwLessons,
  },
];

export const allLessons: Lesson[] = tracks.flatMap((t) => t.lessons);
export const lessonKey = (l: Pick<Lesson, 'track' | 'slug'>) => `${l.track}/${l.slug}`;

export const getTrack = (id: string) => tracks.find((t) => t.id === id);
export const findLesson = (track: string, slug: string) =>
  allLessons.find((l) => l.track === track && l.slug === slug);

export function modulesOf(track: TrackId | string): { name: string; lessons: Lesson[] }[] {
  const out: { name: string; lessons: Lesson[] }[] = [];
  for (const l of getTrack(track)?.lessons ?? []) {
    const last = out[out.length - 1];
    if (last && last.name === l.module) last.lessons.push(l);
    else out.push({ name: l.module, lessons: [l] });
  }
  return out;
}

export function neighbours(l: Lesson): { prev?: Lesson; next?: Lesson } {
  const list = getTrack(l.track)?.lessons ?? [];
  const i = list.findIndex((x) => x.slug === l.slug);
  return { prev: list[i - 1], next: list[i + 1] };
}

/* Every "> [!PITFALL]" callout across the curriculum, for the Bottlenecks wiki page. */
export interface Bottleneck {
  lesson: Lesson;
  title: string;
  section?: { id: string; text: string };
  blocks: Block[];
}

export const bottlenecks: Bottleneck[] = allLessons.flatMap((lesson) => {
  const found: Bottleneck[] = [];
  let section: { id: string; text: string } | undefined;
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.type === 'heading') section = { id: b.id, text: b.text };
      else if (b.type === 'callout' && b.kind === 'pitfall') found.push({ lesson, title: b.title ?? 'Bottleneck', section, blocks: b.blocks });
      else if (b.type === 'steps') b.steps.forEach((s) => walk(s.blocks));
    }
  };
  walk(parse(lesson.body));
  return found;
});
