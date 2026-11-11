import { getTrack, lessonKey, modulesOf } from '../content';
import { lessonHref } from '../lib/router';
import { useProgress } from '../lib/progress';
import { Icon } from './Icon';

export function Sidebar({ track, slug, onNavigate }: { track: string; slug?: string; onNavigate?: () => void }) {
  const p = useProgress();
  const t = getTrack(track);
  if (!t) return null;
  return (
    <nav className="sidebar" aria-label={`${t.name} lessons`}>
      <a href={`#/${t.id}`} className={`side-overview ${!slug ? 'active' : ''}`} onClick={onNavigate}>
        <Icon name={t.id === 'typescript' ? 'code' : 'play'} size={16} />
        {t.name} overview
      </a>
      {modulesOf(t.id).map((m) => (
        <div key={m.name} className="side-group">
          <div className="side-group-title">{m.name}</div>
          {m.lessons.map((l) => {
            const done = !!p.done[lessonKey(l)];
            return (
              <a key={l.slug} href={lessonHref(l.track, l.slug)} onClick={onNavigate}
                className={`side-item ${l.slug === slug ? 'active' : ''} ${done ? 'done' : ''}`}
                aria-current={l.slug === slug ? 'page' : undefined}>
                <span className="side-dot">{done ? <Icon name="check" size={11} /> : null}</span>
                <span className="side-label">{l.title}</span>
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
