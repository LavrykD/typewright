import { lessonKey, useContent } from '../content';
import type { Route } from '../lib/router';
import { useProgress } from '../lib/progress';
import { LANGS, searchShortcut, setLang, useLang, useT } from '../lib/i18n';
import { Icon } from './Icon';
import { Logo } from './Logo';

export function TopNav({ route, onSearch, onMenu }: { route: Route; onSearch: () => void; onMenu?: () => void }) {
  const p = useProgress();
  const t = useT();
  const lang = useLang();
  const { allLessons } = useContent();
  const done = allLessons.filter((l) => p.done[lessonKey(l)]).length;
  const pct = allLessons.length ? Math.round((done / allLessons.length) * 100) : 0;
  const active = route.name === 'lesson' || route.name === 'track' ? route.track : route.name;

  return (
    <header className="topnav">
      <div className="topnav-inner">
        {onMenu && (
          <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label={t.nav.openNav}>
            <Icon name="menu" size={18} />
          </button>
        )}
        <Logo />
        <nav className="topnav-tabs" aria-label={t.nav.sections}>
          <a href="#/typescript" className={active === 'typescript' ? 'active' : ''}>{t.nav.typescript}</a>
          <a href="#/playwright" className={active === 'playwright' ? 'active' : ''}>{t.nav.playwright}</a>
          <a href="#/bottlenecks" className={active === 'bottlenecks' ? 'active' : ''}>{t.nav.bottlenecks}</a>
        </nav>
        <button type="button" className="search-btn" onClick={onSearch}>
          <Icon name="search" size={15} />
          <span>{t.nav.search}</span>
          <kbd>{searchShortcut}</kbd>
        </button>
        <div className="lang-switch" role="group" aria-label={t.langLabel}>
          {LANGS.map((l) => (
            <button key={l.id} type="button" title={l.name} aria-pressed={lang === l.id}
              className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="progress-pill" title={t.progressTitle(done, allLessons.length)}>
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
