/**
 * Lessons are authored as plain markdown files (one per lesson) so they're easy to read, edit and extend.
 *
 *   ---
 *   title: Narrowing
 *   module: Core types
 *   description: One sentence.
 *   level: Foundations | Intermediate | Advanced
 *   minutes: 20
 *   ---
 *   <lesson body markdown>
 *
 *   === quiz
 *   ??? Question text (inline `code` ok)
 *   ```ts            ← optional code shown with the question
 *   ```
 *   - [ ] wrong option
 *   - [x] right option
 *   > Explanation (markdown, may span several "> " lines)
 *
 *   === task Task title
 *   <steps markdown>
 *   --- starter ts   ← optional, a single fenced block
 *   --- hint         ← optional, repeatable
 *   --- expected     ← required: what you should end up with
 *
 *   === sources
 *   - [Title](https://…)
 *
 * The file name (minus the "NN-" prefix) is the lesson slug; the prefix sets the order.
 */
import type { Lesson, Level, QuizQuestion, Source, Task, TrackId } from './types';

function frontmatter(src: string): { meta: Record<string, string>; rest: string } {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(src);
  if (!m) return { meta: {}, rest: src };
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, rest: src.slice(m[0].length) };
}

/** Split on lines that start with `marker`, ignoring markers inside fenced code. */
function splitOn(src: string, marker: string): { head: string; parts: { arg: string; text: string }[] } {
  const lines = src.split('\n');
  let head: string[] = [];
  const parts: { arg: string; text: string[] }[] = [];
  let inFence = false;
  for (const l of lines) {
    if (l.startsWith('```')) inFence = !inFence;
    if (!inFence && l.startsWith(marker)) {
      parts.push({ arg: l.slice(marker.length).trim(), text: [] });
      continue;
    }
    if (parts.length) parts[parts.length - 1]!.text.push(l);
    else head.push(l);
  }
  return { head: head.join('\n'), parts: parts.map((p) => ({ arg: p.arg, text: p.text.join('\n').trim() })) };
}

function parseQuiz(text: string, file: string): QuizQuestion[] {
  return splitOn(text, '??? ').parts.map(({ arg, text: body }) => {
    const code = /^```\w*\n([\s\S]*?)\n```/m.exec(body)?.[1];
    const options: string[] = [];
    let answer = -1;
    const explain: string[] = [];
    let inFence = false;
    for (const l of body.split('\n')) {
      if (l.startsWith('```')) { inFence = !inFence; continue; }
      if (inFence) continue;
      const o = /^- \[( |x)\] (.*)$/.exec(l);
      if (o) { if (o[1] === 'x') answer = options.length; options.push(o[2]!); }
      else if (l.startsWith('>')) explain.push(l.replace(/^>\s?/, ''));
    }
    if (answer < 0) console.warn(`[content] ${file}: question without a correct answer: ${arg}`);
    return { q: arg, code, options, answer: Math.max(answer, 0), explain: explain.join('\n') };
  });
}

function parseTask(title: string, text: string): Task {
  const { head, parts } = splitOn(text, '--- ');
  const task: Task = { title, steps: head.trim(), expected: '' };
  for (const p of parts) {
    const [kind, lang] = p.arg.split(/\s+/);
    if (kind === 'starter') {
      task.starter = /```\w*\n([\s\S]*?)\n```/.exec(p.text)?.[1] ?? p.text;
      task.starterLang = lang ?? 'ts';
    } else if (kind === 'hint') (task.hints ??= []).push(p.text);
    else if (kind === 'expected') task.expected = p.text;
  }
  return task;
}

function parseSources(text: string): Source[] {
  return [...text.matchAll(/\[([^\]]+)\]\((https?:[^)]+)\)/g)].map((m) => ({ title: m[1]!, url: m[2]! }));
}

export function parseLesson(track: TrackId, file: string, raw: string): Lesson {
  const slug = file.replace(/^.*\//, '').replace(/\.md$/, '').replace(/^\d+-/, '');
  const { meta, rest } = frontmatter(raw.replace(/\r\n/g, '\n'));
  const { head: body, parts } = splitOn(rest, '=== ');
  const lesson: Lesson = {
    slug,
    track,
    module: meta.module ?? 'Lessons',
    title: meta.title ?? slug,
    description: meta.description ?? '',
    level: (meta.level as Level) ?? 'Foundations',
    minutes: Number(meta.minutes ?? 15),
    body: body.trim(),
    quiz: [],
    tasks: [],
    sources: [],
  };
  for (const p of parts) {
    const [kind, ...restArg] = p.arg.split(' ');
    if (kind === 'quiz') lesson.quiz.push(...parseQuiz(p.text, file));
    else if (kind === 'task') lesson.tasks.push(parseTask(restArg.join(' '), p.text));
    else if (kind === 'sources') lesson.sources.push(...parseSources(p.text));
  }
  return lesson;
}
