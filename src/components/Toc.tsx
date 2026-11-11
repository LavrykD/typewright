import { useEffect, useState } from 'react';

export interface TocItem { id: string; text: string; level: 2 | 3 }

export function Toc({ items }: { items: TocItem[] }) {
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
      <div className="toc-title">On this page</div>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} className={`toc-item l${i.level} ${active === i.id ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth' }); }}>
          {i.text.replace(/`/g, '')}
        </a>
      ))}
    </nav>
  );
}
