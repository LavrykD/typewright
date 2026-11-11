import { createContext, useContext } from 'react';
import type { Lesson, Track, TrackId } from './types';
import { parseLesson } from './loader';
import { parse, type Block } from '../lib/markdown';
import type { Lang } from '../lib/i18n';

export interface Bottleneck {
  lesson: Lesson;
  title: string;
  section?: { id: string; text: string };
  blocks: Block[];
}

export interface Content {
  lang: Lang;
  tracks: Track[];
  allLessons: Lesson[];
  bottlenecks: Bottleneck[];
  getTrack(id: string): Track | undefined;
  findLesson(track: string, slug: string): Lesson | undefined;
  modulesOf(track: TrackId | string): { name: string; lessons: Lesson[] }[];
  neighbours(l: Lesson): { prev?: Lesson; next?: Lesson };
}

type Files = Record<string, string>;

const load = (track: TrackId, files: Files) =>
  Object.keys(files).sort().map((f) => parseLesson(track, f, files[f]!));

export function buildContent(lang: Lang, ts: Files, pw: Files, taglines: Record<TrackId, string>): Content {
  const tracks: Track[] = [
    { id: 'typescript', name: 'TypeScript', tagline: taglines.typescript, version: 'TypeScript 7.0', lessons: load('typescript', ts) },
    { id: 'playwright', name: 'Playwright', tagline: taglines.playwright, version: 'Playwright 1.65', lessons: load('playwright', pw) },
  ];
  const allLessons = tracks.flatMap((t) => t.lessons);
  const getTrack = (id: string) => tracks.find((t) => t.id === id);

  /* Every "> [!PITFALL]" callout across the curriculum, for the Bottlenecks wiki page. */
  const bottlenecks = allLessons.flatMap((lesson) => {
    const found: Bottleneck[] = [];
    let section: { id: string; text: string } | undefined;
    const walk = (blocks: Block[]) => {
      for (const b of blocks) {
        if (b.type === 'heading') section = { id: b.id, text: b.text };
        else if (b.type === 'callout' && b.kind === 'pitfall') found.push({ lesson, title: b.title ?? '', section, blocks: b.blocks });
        else if (b.type === 'steps') b.steps.forEach((s) => walk(s.blocks));
      }
    };
    walk(parse(lesson.body));
    return found;
  });

  return {
    lang,
    tracks,
    allLessons,
    bottlenecks,
    getTrack,
    findLesson: (track, slug) => allLessons.find((l) => l.track === track && l.slug === slug),
    modulesOf(track) {
      const out: { name: string; lessons: Lesson[] }[] = [];
      for (const l of getTrack(track)?.lessons ?? []) {
        const last = out[out.length - 1];
        if (last && last.name === l.module) last.lessons.push(l);
        else out.push({ name: l.module, lessons: [l] });
      }
      return out;
    },
    neighbours(l) {
      const list = getTrack(l.track)?.lessons ?? [];
      const i = list.findIndex((x) => x.slug === l.slug);
      return { prev: list[i - 1], next: list[i + 1] };
    },
  };
}

/** Each language is its own chunk, so only the language you read is downloaded. */
const cache = new Map<Lang, Promise<Content>>();
export function loadContent(lang: Lang): Promise<Content> {
  let p = cache.get(lang);
  if (!p) {
    p = (lang === 'uk' ? import('./uk') : import('./en')).then((m) => m.default);
    cache.set(lang, p);
  }
  return p;
}

export const ContentContext = createContext<Content | null>(null);
export function useContent(): Content {
  const c = useContext(ContentContext);
  if (!c) throw new Error('useContent() used outside <ContentContext>');
  return c;
}

export const lessonKey = (l: Pick<Lesson, 'track' | 'slug'>) => `${l.track}/${l.slug}`;
