import { useT } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { highlight } from '../lib/highlight';

interface Props {
  code: string;
  lang: string;
  title?: string;
  variant?: 'bad' | 'good';
}

export function CodeBlock({ code, lang, title, variant }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const t = useT().code;

  useEffect(() => {
    let live = true;
    highlight(code, lang).then((h) => { if (live) setHtml(h); }).catch(() => {});
    return () => { live = false; };
  }, [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard blocked */ }
  };

  return (
    <figure className={`code ${variant ? 'code-' + variant : ''}`}>
      <figcaption className="code-head">
        {variant && <span className={`code-tag ${variant}`}>{variant === 'bad' ? t.avoid : t.prefer}</span>}
        <span className="code-title">{title ?? t.langs[lang] ?? lang}</span>
        <button type="button" className="code-copy" onClick={copy} aria-label={t.copyLabel}>
          {copied ? t.copied : t.copy}
        </button>
      </figcaption>
      {html ? (
        <div className="code-body" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="code-body"><pre><code>{code}</code></pre></div>
      )}
    </figure>
  );
}
