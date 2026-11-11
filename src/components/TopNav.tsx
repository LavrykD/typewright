import { allLessons, lessonKey } from '../content';
import type { Route } from '../lib/router';
import { useProgress } from '../lib/progress';
import { Icon } from './Icon';
import { Logo } from './Logo';

export function TopNav({ route, onSearch, onMenu }: { route: Route; onSearch: () => void; onMenu?: () => void }) {
  const p = useProgress();
  const done = allLessons.filter((l) => p.done[lessonKey(l)]).length;
  const pct = Math.round((done / allLessons.length) * 100);
  const active = route.name === 'lesson' || route.name === 'track' ? route.track : route.name;

  return (
    <header className="topnav">
      <div className="topnav-inner">
        {onMenu && (
          <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation">
            <Icon name="menu" size={18} />
          </button>
        )}
        <Logo />
        <nav className="topnav-tabs" aria-label="Sections">
          <a href="#/typescript" className={active === 'typescript' ? 'active' : ''}>TypeScript</a>
          <a href="#/playwright" className={active === 'playwright' ? 'active' : ''}>Playwright</a>
          <a href="#/bottlenecks" className={active === 'bottlenecks' ? 'active' : ''}>Bottlenecks</a>
        </nav>
        <button type="button" className="search-btn" onClick={onSearch}>
          <Icon name="search" size={15} />
          <span>Search lessons…</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="progress-pill" title={`${done} of ${allLessons.length} lessons complete`}>
          <svg width="18" height="18" viewBox="0 0 36 36" aria-hidden>
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--mist)" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--mint)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 94.2} 94.2`} transform="rotate(-90 18 18)" />
          </svg>
          <span>{pct}%</span>
        </div>
      </div>
    </header>
  );
}
