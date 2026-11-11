import type { HighlighterCore } from 'shiki/core';

// Shiki is loaded on first use, in its own chunks, so it never blocks the first paint.
let highlighter: Promise<HighlighterCore> | null = null;

function getHighlighter() {
  highlighter ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [import('@shikijs/themes/github-dark-default')],
        langs: [
          import('@shikijs/langs/typescript'),
          import('@shikijs/langs/tsx'),
          import('@shikijs/langs/javascript'),
          import('@shikijs/langs/json'),
          import('@shikijs/langs/bash'),
          import('@shikijs/langs/yaml'),
          import('@shikijs/langs/html'),
        ],
        engine: createJavaScriptRegexEngine(),
      }),
  );
  return highlighter;
}

const ALIASES: Record<string, string> = { ts: 'typescript', js: 'javascript', sh: 'bash', shell: 'bash', yml: 'yaml' };
const SUPPORTED = new Set(['typescript', 'tsx', 'javascript', 'json', 'bash', 'yaml', 'html']);
const cache = new Map<string, string>();

export async function highlight(code: string, lang: string): Promise<string | null> {
  const l = ALIASES[lang] ?? lang;
  if (!SUPPORTED.has(l)) return null;
  const key = l + '\u0000' + code;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = await getHighlighter();
  const html = h.codeToHtml(code, { lang: l, theme: 'github-dark-default' });
  cache.set(key, html);
  return html;
}
