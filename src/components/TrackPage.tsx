import { getTrack, lessonKey, modulesOf } from '../content';
import { lessonHref } from '../lib/router';
import { useProgress } from '../lib/progress';
import { Icon } from './Icon';

export function TrackPage({ track }: { track: string }) {
  const p = useProgress();
  const t = getTrack(track);
  if (!t) return <div className="lesson"><h1>Not found</h1></div>;
  const done = t.lessons.filter((l) => p.done[lessonKey(l)]).length;
  const minutes = t.lessons.reduce((s, l) => s + l.minutes, 0);

  return (
    <div className="lesson track-page">
      <div className="eyebrow"><span className="dot" />{t.version}</div>
      <h1>{t.name}</h1>
      <p className="lead">{t.tagline}</p>
      <div className="lesson-meta">
        <span><Icon name="book" size={14} /> {t.lessons.length} lessons</span>
        <span><Icon name="clock" size={14} /> ~{Math.round(minutes / 60)} hours</span>
        <span><Icon name="check" size={14} /> {done} complete</span>
      </div>

      {modulesOf(t.id).map((m, mi) => (
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
                    <span className="tag">{l.level}</span>
                    <span className="muted sm">{l.minutes} min</span>
                    {isDone && <span className="done-badge"><Icon name="check" size={12} /></span>}
                  </div>
                  <h3>{l.title}</h3>
                  <p>{l.description}</p>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
