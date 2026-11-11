import { lessonKey, useContent } from '../content';
import { Inline } from '../lib/markdown';
import { lessonHref } from '../lib/router';
import { useProgress } from '../lib/progress';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';

export function Sidebar({ track, slug, onNavigate }: { track: string; slug?: string; onNavigate?: () => void }) {
  const p = useProgress();
  const t = useT();
  const { getTrack, modulesOf } = useContent();
  const tr = getTrack(track);
  if (!tr) return null;
  return (
    <nav className="sidebar" aria-label={tr.name}>
      <a href={`#/${tr.id}`} className={`side-overview ${!slug ? 'active' : ''}`} onClick={onNavigate}>
        <Icon name={tr.id === 'typescript' ? 'code' : 'play'} size={16} />
        {t.track.overview(tr.name)}
      </a>
      {modulesOf(tr.id).map((m) => (
        <div key={m.name} className="side-group">
          <div className="side-group-title">{m.name}</div>
          {m.lessons.map((l) => {
            const done = !!p.done[lessonKey(l)];
            return (
              <a key={l.slug} href={lessonHref(l.track, l.slug)} onClick={onNavigate}
                className={`side-item ${l.slug === slug ? 'active' : ''} ${done ? 'done' : ''}`}
                aria-current={l.slug === slug ? 'page' : undefined}>
                <span className="side-dot">{done ? <Icon name="check" size={11} /> : null}</span>
                <span className="side-label"><Inline text={l.title} /></span>
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
