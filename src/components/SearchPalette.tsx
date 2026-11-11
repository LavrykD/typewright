import { useEffect, useMemo, useRef, useState } from 'react';
import { allLessons, getTrack } from '../content';
import { blockText, parse } from '../lib/markdown';
import { lessonHref } from '../lib/router';
import { Icon } from './Icon';

interface Entry { track: string; slug: string; lessonTitle: string; heading?: string; anchor?: string; text: string }

function buildIndex(): Entry[] {
  const out: Entry[] = [];
  for (const l of allLessons) {
    out.push({ track: l.track, slug: l.slug, lessonTitle: l.title, text: `${l.title} ${l.description} ${l.module}`.toLowerCase() });
    let cur: Entry | null = null;
    for (const b of parse(l.body)) {
      if (b.type === 'heading') {
        cur = { track: l.track, slug: l.slug, lessonTitle: l.title, heading: b.text.replace(/`/g, ''), anchor: b.id, text: b.text.toLowerCase() };
        out.push(cur);
      } else if (cur) {
        cur.text += ' ' + blockText(b).toLowerCase();
      }
    }
  }
  return out;
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const index = useMemo(buildIndex, []);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(''); setSel(0); input.current?.focus(); } }, [open]);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return index.filter((e) => !e.heading).slice(0, 8);
    return index
      .map((e) => {
        let score = 0;
        for (const t of terms) {
          if (!e.text.includes(t)) return { e, score: -1 };
          if (e.heading?.toLowerCase().includes(t)) score += 6;
          if (e.lessonTitle.toLowerCase().includes(t)) score += e.heading ? 2 : 8;
          score += 1;
        }
        return { e, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.e);
  }, [q, index]);

  if (!open) return null;

  const go = (e: Entry) => { window.location.hash = lessonHref(e.track, e.slug, e.anchor); onClose(); };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-label="Search lessons" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" size={16} />
          <input ref={input} autoFocus value={q} placeholder="Search: generics, storageState, flaky, satisfies…"
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === 'Enter' && results[sel]) go(results[sel]);
            }} />
          <kbd>esc</kbd>
        </div>
        <div className="palette-results">
          {results.length === 0 && <div className="palette-empty">No matches for “{q}”.</div>}
          {results.map((r, i) => (
            <button key={r.track + r.slug + (r.anchor ?? '')} type="button" className={`palette-row ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)} onClick={() => go(r)}>
              <span className="palette-track">{getTrack(r.track)?.name}</span>
              <span className="palette-main">
                <span className="palette-title">{r.heading ?? r.lessonTitle}</span>
                {r.heading && <span className="palette-sub">{r.lessonTitle}</span>}
              </span>
              <Icon name="arrowRight" size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
