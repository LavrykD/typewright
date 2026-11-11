import { useSyncExternalStore } from 'react';

/** Hash routes: #/  ·  #/bottlenecks  ·  #/typescript/<slug>  ·  #/playwright/<slug> */
export type Route =
  | { name: 'home' }
  | { name: 'bottlenecks' }
  | { name: 'track'; track: string }
  | { name: 'lesson'; track: string; slug: string; anchor?: string };

function parseHash(hash: string): Route {
  // Section ids can be Cyrillic, which browsers percent-encode in the URL.
  let raw = hash;
  try { raw = decodeURIComponent(hash); } catch { /* malformed escape: use as-is */ }
  const [path = '', anchor] = raw.replace(/^#\/?/, '').split('#');
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'bottlenecks') return { name: 'bottlenecks' };
  if (parts.length === 1) return { name: 'track', track: parts[0]! };
  return { name: 'lesson', track: parts[0]!, slug: parts[1]!, anchor };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseHash(hash);
}

export const lessonHref = (track: string, slug: string, anchor?: string) =>
  `#/${track}/${slug}${anchor ? '#' + anchor : ''}`;

/** Scroll to a section of the current lesson and record it in the URL (shareable, bookmarkable). */
export function goToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const [path = ''] = window.location.hash.replace(/^#/, '').split('#');
  history.replaceState(null, '', `#${path}#${id}`);
  el.scrollIntoView({ behavior: 'smooth' });
}
