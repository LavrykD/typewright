import { useSyncExternalStore } from 'react';

/** Hash routes: #/  ·  #/bottlenecks  ·  #/typescript/<slug>  ·  #/playwright/<slug> */
export type Route =
  | { name: 'home' }
  | { name: 'bottlenecks' }
  | { name: 'track'; track: string }
  | { name: 'lesson'; track: string; slug: string; anchor?: string };

function parseHash(hash: string): Route {
  const [path = '', anchor] = hash.replace(/^#\/?/, '').split('#');
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
