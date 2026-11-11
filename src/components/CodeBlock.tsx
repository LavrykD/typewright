import { useEffect, useState } from 'react';
import { highlight } from '../lib/highlight';

interface Props {
  code: string;
  lang: string;
  title?: string;
  variant?: 'bad' | 'good';
}

const LANG_LABEL: Record<string, string> = {
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', js: 'JavaScript', javascript: 'JavaScript',
  json: 'JSON', bash: 'Terminal', sh: 'Terminal', yaml: 'YAML', yml: 'YAML', html: 'HTML', text: 'Output',
};

export function CodeBlock({ code, lang, title, variant }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        {variant && <span className={`code-tag ${variant}`}>{variant === 'bad' ? 'Avoid' : 'Prefer'}</span>}
        <span className="code-title">{title ?? LANG_LABEL[lang] ?? lang}</span>
        <button type="button" className="code-copy" onClick={copy} aria-label="Copy code">
          {copied ? 'Copied' : 'Copy'}
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
