import { useState } from 'react';
import { useContent } from '../content';
import { Blocks, Inline, plain } from '../lib/markdown';
import { lessonHref } from '../lib/router';
import { useT } from '../lib/i18n';
import { Icon } from './Icon';

export function BottlenecksPage() {
  const [filter, setFilter] = useState<'all' | 'typescript' | 'playwright'>('all');
  const t = useT();
  const { bottlenecks } = useContent();
  const list = bottlenecks.filter((b) => filter === 'all' || b.lesson.track === filter);

  return (
    <div className="lesson wide">
      <div className="eyebrow"><span className="dot" />{t.bottlenecks.eyebrow}</div>
      <h1>{t.bottlenecks.title}</h1>
      <p className="lead">{t.bottlenecks.lead}</p>
      <div className="segmented" role="tablist">
        {(['all', 'typescript', 'playwright'] as const).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? t.bottlenecks.all(bottlenecks.length) : f === 'typescript' ? 'TypeScript' : 'Playwright'}
          </button>
        ))}
      </div>
      <div className="bn-list">
        {list.map((b, i) => (
          <article key={i} className="bn-card">
            <header>
              <Icon name="flame" size={16} className="bn-icon" />
              <h3><Inline text={b.title} /></h3>
            </header>
            <div className="prose compact"><Blocks blocks={b.blocks} /></div>
            <a className="bn-link" href={lessonHref(b.lesson.track, b.lesson.slug, b.section?.id)}>
              {b.lesson.track === 'typescript' ? 'TypeScript' : 'Playwright'} · {plain(b.lesson.title)}{b.section ? ` › ${plain(b.section.text)}` : ''}
              <Icon name="arrowRight" size={14} />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
