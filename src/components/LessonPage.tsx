import { useMemo } from 'react';
import { lessonKey, useContent } from '../content';
import type { Lesson } from '../content/types';
import { Blocks, Inline, parse } from '../lib/markdown';
import { lessonHref } from '../lib/router';
import { progress, useProgress } from '../lib/progress';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';
import { Quiz } from './Quiz';
import { TaskCard } from './TaskCard';
import { Toc, type TocItem } from './Toc';

export function LessonPage({ lesson }: { lesson: Lesson }) {
  const p = useProgress();
  const t = useT();
  const { getTrack, neighbours } = useContent();
  const key = lessonKey(lesson);
  const blocks = useMemo(() => parse(lesson.body), [lesson]);
  const toc: TocItem[] = useMemo(() => {
    const items: TocItem[] = blocks.flatMap((b) => (b.type === 'heading' ? [{ id: b.id, text: b.text, level: b.level }] : []));
    if (lesson.quiz.length) items.push({ id: 'check-yourself', text: t.lesson.checkYourself, level: 2 });
    if (lesson.tasks.length) items.push({ id: 'hands-on', text: t.lesson.handsOn, level: 2 });
    items.push({ id: 'sources', text: t.lesson.sources, level: 2 });
    return items;
  }, [blocks, lesson, t]);
  const { prev, next } = neighbours(lesson);
  const done = !!p.done[key];
  const tasksDone = lesson.tasks.filter((_, i) => p.tasks[`${key}#${i}`]).length;

  return (
    <>
      <article className="lesson">
        <div className="eyebrow"><span className="dot" />{getTrack(lesson.track)?.name} · {lesson.module}</div>
        <h1><Inline text={lesson.title} /></h1>
        <p className="lead"><Inline text={lesson.description} /></p>
        <div className="lesson-meta">
          <span><Icon name="clock" size={14} /> {t.minutes(lesson.minutes)}</span>
          <span><Icon name="layers" size={14} /> {t.levels[lesson.level]}</span>
          <span><Icon name="target" size={14} /> {t.qAndT(lesson.quiz.length, lesson.tasks.length)}</span>
        </div>

        <div className="prose"><Blocks blocks={blocks} /></div>

        {lesson.quiz.length > 0 && (
          <section className="lesson-section">
            <h2 id="check-yourself" className="anchored">{t.lesson.checkYourself}</h2>
            <p className="muted">{t.lesson.checkIntro}</p>
            <Quiz lessonKey={key} questions={lesson.quiz} />
          </section>
        )}

        {lesson.tasks.length > 0 && (
          <section className="lesson-section">
            <h2 id="hands-on" className="anchored">{t.lesson.handsOn}</h2>
            <p className="muted">{t.lesson.handsIntro(tasksDone, lesson.tasks.length)}</p>
            {lesson.tasks.map((task, i) => <TaskCard key={i} task={task} index={i} lessonKey={key} />)}
          </section>
        )}

        <section className="lesson-section">
          <h2 id="sources" className="anchored">{t.lesson.sources}</h2>
          <p className="muted">{t.lesson.sourcesIntro}</p>
          <ul className="sources">
            {lesson.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer"><Icon name="link" size={14} />{s.title}</a>
                <span className="source-host">{new URL(s.url).hostname.replace(/^www\./, '')}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className={`complete-bar ${done ? 'is-done' : ''}`}>
          <div>
            <div className="complete-title">{done ? t.lesson.completeTitle : t.lesson.completePrompt}</div>
            <div className="muted sm">{t.lesson.savedLocally}</div>
          </div>
          <button type="button" className={done ? 'btn-outline' : 'btn-primary'} onClick={() => progress.toggleDone(key)}>
            {done ? <><Icon name="check" size={15} /> {t.lesson.completed}</> : t.lesson.markComplete}
          </button>
        </div>

        <nav className="pager">
          {prev ? (
            <a href={lessonHref(prev.track, prev.slug)} className="pager-card">
              <span className="pager-dir"><Icon name="arrowLeft" size={14} /> {t.lesson.previous}</span>
              <span className="pager-title"><Inline text={prev.title} /></span>
            </a>
          ) : <span />}
          {next && (
            <a href={lessonHref(next.track, next.slug)} className="pager-card right">
              <span className="pager-dir">{t.lesson.next} <Icon name="arrowRight" size={14} /></span>
              <span className="pager-title"><Inline text={next.title} /></span>
            </a>
          )}
        </nav>
      </article>
      <aside className="toc-col"><Toc items={toc} /></aside>
    </>
  );
}
