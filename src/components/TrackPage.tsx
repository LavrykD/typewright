import { lessonKey, useContent } from '../content';
import { Inline } from '../lib/markdown';
import { lessonHref } from '../lib/router';
import { useProgress } from '../lib/progress';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';

export function TrackPage({ track }: { track: string }) {
  const p = useProgress();
  const t = useT();
  const { getTrack, modulesOf } = useContent();
  const tr = getTrack(track);
  if (!tr) return <div className="lesson"><h1>{t.notFound}</h1><p><a className="link" href="#/">{t.backHome}</a></p></div>;
  const done = tr.lessons.filter((l) => p.done[lessonKey(l)]).length;
  const minutes = tr.lessons.reduce((s, l) => s + l.minutes, 0);

  return (
    <div className="lesson track-page">
      <div className="eyebrow"><span className="dot" />{tr.version}</div>
      <h1>{tr.name}</h1>
      <p className="lead">{tr.tagline}</p>
      <div className="lesson-meta">
        <span><Icon name="book" size={14} /> {t.lessons(tr.lessons.length)}</span>
        <span><Icon name="clock" size={14} /> {t.hours(Math.round(minutes / 60))}</span>
        <span><Icon name="check" size={14} /> {t.completeCount(done)}</span>
      </div>

      {modulesOf(tr.id).map((m, mi) => (
        <section key={m.name} className="module">
          <div className="module-head">
            <span className="module-num">{String(mi + 1).padStart(2, '0')}</span>
            <h2>{m.name}</h2>
          </div>
          <div className="lesson-cards">
            {m.lessons.map((l) => {
              const isDone = !!p.done[lessonKey(l)];
              return (
                <a key={l.slug} href={lessonHref(l.track, l.slug)} className={`lesson-card ${isDone ? 'done' : ''}`}>
                  <div className="lesson-card-top">
                    <span className="tag">{t.levels[l.level]}</span>
                    <span className="muted sm">{t.minutes(l.minutes)}</span>
                    {isDone && <span className="done-badge"><Icon name="check" size={12} /></span>}
                  </div>
                  <h3><Inline text={l.title} /></h3>
                  <p><Inline text={l.description} /></p>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
