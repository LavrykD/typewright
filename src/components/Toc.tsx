import { Inline } from '../lib/markdown';
import { useT } from '../lib/i18n';
import { goToSection } from '../lib/router';
import { useEffect, useState } from 'react';

export interface TocItem { id: string; text: string; level: 2 | 3 }

export function Toc({ items }: { items: TocItem[] }) {
  const title = useT().lesson.onThisPage;
  const [active, setActive] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const onScroll = () => {
      let cur = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top < 120) cur = el.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);

  if (items.length === 0) return null;
  return (
    <nav className="toc" aria-label="On this page">
      <div className="toc-title">{title}</div>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} className={`toc-item l${i.level} ${active === i.id ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); goToSection(i.id); }}>
          <Inline text={i.text} />
        </a>
      ))}
    </nav>
  );
}
