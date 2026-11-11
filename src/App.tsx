import { useEffect, useState } from 'react';
import { ContentContext, loadContent, useContent, type Content } from './content';
import { useRoute, type Route } from './lib/router';
import { useLang, useT, type Strings } from './lib/i18n';
import { BottlenecksPage } from './components/BottlenecksPage';
import { Home } from './components/Home';
import { LessonPage } from './components/LessonPage';
import { SearchPalette } from './components/SearchPalette';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { TrackPage } from './components/TrackPage';

export function App() {
  const lang = useLang();
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    let live = true;
    document.documentElement.lang = lang;
    loadContent(lang).then((c) => { if (live) setContent(c); });
    return () => { live = false; };
  }, [lang]);

  // Keep showing the previous language until the new one has loaded (no flash).
  if (!content) return <div className="boot" aria-busy="true" />;
  return (
    <ContentContext.Provider value={content}>
      <Shell />
    </ContentContext.Provider>
  );
}

function Shell() {
  const route = useRoute();
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
      else if (e.key === '/' && !typing) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Scroll on navigation: to the anchor if there is one (re-applied once code highlighting
  // has settled the layout), otherwise to the top of the new page.
  const routeKey = route.name === 'lesson' ? `${route.track}/${route.slug}#${route.anchor ?? ''}` : JSON.stringify(route);
  useEffect(() => {
    setSearchOpen(false);
    setMenuOpen(false);
    const anchor = route.name === 'lesson' ? route.anchor : undefined;
    if (!anchor) { window.scrollTo({ top: 0 }); return; }
    const go = () => document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
    const t1 = setTimeout(go, 0);
    const t2 = setTimeout(go, 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  return (
    <ContentRoutes route={route} t={t} searchOpen={searchOpen} setSearchOpen={setSearchOpen} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
  );
}

function ContentRoutes({ route, t, searchOpen, setSearchOpen, menuOpen, setMenuOpen }: {
  route: Route; t: Strings;
  searchOpen: boolean; setSearchOpen: (o: boolean) => void;
  menuOpen: boolean; setMenuOpen: (o: boolean) => void;
}) {
  const { findLesson, getTrack } = useContent();
  const docsTrack = route.name === 'lesson' || route.name === 'track' ? route.track : undefined;
  const lesson = route.name === 'lesson' ? findLesson(route.track, route.slug) : undefined;

  // Browser tab title follows the page.
  const pageTitle =
    route.name === 'home' ? null
    : route.name === 'bottlenecks' ? t.bottlenecks.title
    : route.name === 'track' ? getTrack(route.track)?.name
    : lesson?.title ?? t.notFound;
  useEffect(() => { document.title = pageTitle ? `${pageTitle.replace(/`/g, '')} · Typewright` : 'Typewright'; }, [pageTitle]);

  let main;
  if (route.name === 'home') main = <Home />;
  else if (route.name === 'bottlenecks') main = <BottlenecksPage />;
  else if (route.name === 'track') main = <TrackPage track={route.track} />;
  else if (lesson) main = <LessonPage lesson={lesson} />;
  else main = <div className="lesson"><h1>{t.notFound}</h1><p><a className="link" href="#/">{t.backHome}</a></p></div>;

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
