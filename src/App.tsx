import { useEffect, useState } from 'react';
import { findLesson } from './content';
import { useRoute } from './lib/router';
import { BottlenecksPage } from './components/BottlenecksPage';
import { Home } from './components/Home';
import { LessonPage } from './components/LessonPage';
import { SearchPalette } from './components/SearchPalette';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { TrackPage } from './components/TrackPage';

export function App() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
      else if (e.key === '/' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [route.name, route.name === 'lesson' ? route.slug : '']);

  // Scroll on navigation: to the anchor if there is one (re-applied once code highlighting
  // has settled the layout), otherwise to the top of the new page.
  const routeKey = JSON.stringify(route);
  useEffect(() => {
    setSearchOpen(false);
    const anchor = route.name === 'lesson' ? route.anchor : undefined;
    if (!anchor) { window.scrollTo({ top: 0 }); return; }
    const go = () => document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
    const t1 = setTimeout(go, 0);
    const t2 = setTimeout(go, 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const docsTrack = route.name === 'lesson' || route.name === 'track' ? route.track : undefined;
  const lesson = route.name === 'lesson' ? findLesson(route.track, route.slug) : undefined;

  let main;
  if (route.name === 'home') main = <Home />;
  else if (route.name === 'bottlenecks') main = <BottlenecksPage />;
  else if (route.name === 'track') main = <TrackPage track={route.track} />;
  else if (lesson) main = <LessonPage lesson={lesson} />;
  else main = <div className="lesson"><h1>Lesson not found</h1><p><a className="link" href="#/">Back home</a></p></div>;

  return (
    <>
      <TopNav route={route} onSearch={() => setSearchOpen(true)} onMenu={docsTrack ? () => setMenuOpen(true) : undefined} />
      {route.name === 'home' ? (
        main
      ) : (
        <div className={`docs ${docsTrack ? '' : 'no-side'}`}>
          {docsTrack && (
            <>
              <div className={`side-col ${menuOpen ? 'open' : ''}`}>
                <Sidebar track={docsTrack} slug={lesson?.slug} onNavigate={() => setMenuOpen(false)} />
              </div>
              {menuOpen && <div className="side-scrim" onClick={() => setMenuOpen(false)} />}
            </>
          )}
          <main className="docs-main">{main}</main>
        </div>
      )}
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
