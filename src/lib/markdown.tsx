/**
 * A tiny, purpose-built markdown dialect for lesson content.
 *
 * Blocks
 *   ## Heading / ### Heading          → anchored headings (feed the "On this page" TOC)
 *   paragraphs, "- " lists, "1. " lists, | tables |
 *   ```ts title="file.ts" variant="bad|good"   → highlighted code block
 *   > [!NOTE|TIP|WARNING|PITFALL] Optional title
 *   > callout body (markdown)
 *   :::steps … ### Step title … :::   → numbered steps
 *
 * Inline
 *   `code`, **bold**, *italic*, [text](url) — links starting with "#/" stay in-app.
 */
import { Fragment, type ReactNode } from 'react';
import { CodeBlock } from '../components/CodeBlock';
import { Callout, type CalloutKind } from '../components/Callout';
import { goToSection } from './router';

export type Block =
  | { type: 'heading'; level: 2 | 3; text: string; id: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; lang: string; code: string; title?: string; variant?: 'bad' | 'good' }
  | { type: 'callout'; kind: CalloutKind; title?: string; blocks: Block[] }
  | { type: 'steps'; steps: { title: string; blocks: Block[] }[] }
  | { type: 'table'; head: string[]; rows: string[][] };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function parseAttrs(info: string): { lang: string; title?: string; variant?: 'bad' | 'good' } {
  const lang = info.split(/\s+/)[0] || 'text';
  const title = /title="([^"]*)"/.exec(info)?.[1];
  const v = /variant="(bad|good)"/.exec(info)?.[1] as 'bad' | 'good' | undefined;
  return { lang, title, variant: v };
}

export function parse(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const isBlockStart = (l: string) =>
    /^#{2,3}\s/.test(l) || l.startsWith('```') || l.startsWith('>') || /^\s*[-*]\s/.test(l) ||
    /^\s*\d+\.\s/.test(l) || l.startsWith(':::') || l.startsWith('|');

  while (i < lines.length) {
    const line = lines[i]!;

    if (!line.trim()) { i++; continue; }

    // Fenced code
    if (line.startsWith('```')) {
      const attrs = parseAttrs(line.slice(3).trim());
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) buf.push(lines[i++]!);
      i++; // closing fence
      blocks.push({ type: 'code', code: buf.join('\n'), ...attrs });
      continue;
    }

    // Steps container
    if (line.startsWith(':::steps')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith(':::')) buf.push(lines[i++]!);
      i++;
      const steps: { title: string; blocks: Block[] }[] = [];
      let cur: { title: string; body: string[] } | null = null;
      let inFence = false;
      for (const l of buf) {
        if (l.startsWith('```')) inFence = !inFence;
        const m = !inFence && /^###\s+(.*)$/.exec(l);
        if (m) {
          if (cur) steps.push({ title: cur.title, blocks: parse(cur.body.join('\n')) });
          cur = { title: m[1]!, body: [] };
        } else cur?.body.push(l);
      }
      if (cur) steps.push({ title: cur.title, blocks: parse(cur.body.join('\n')) });
      blocks.push({ type: 'steps', steps });
      continue;
    }

    // Headings
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      // Optional explicit id: "## Заголовок {#stable-id}" keeps anchors identical across languages.
      const m = /^(.*?)\s*\{#([\w-]+)\}$/.exec(h[2]!.trim());
      const text = (m ? m[1]! : h[2]!).trim();
      blocks.push({ type: 'heading', level: h[1]!.length as 2 | 3, text, id: m ? m[2]! : slugify(text) });
      i++;
      continue;
    }

    // Callouts
    if (line.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>')) buf.push(lines[i++]!.replace(/^>\s?/, ''));
      const m = /^\[!(NOTE|TIP|WARNING|PITFALL)\]\s*(.*)$/.exec(buf[0] ?? '');
      if (m) {
        blocks.push({
          type: 'callout',
          kind: m[1]!.toLowerCase() as CalloutKind,
          title: m[2] || undefined,
          blocks: parse(buf.slice(1).join('\n')),
        });
      } else {
        blocks.push({ type: 'callout', kind: 'note', blocks: parse(buf.join('\n')) });
      }
      continue;
    }

    // Tables
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith('|')) {
        const cells = lines[i]!.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ type: 'table', head: rows[0] ?? [], rows: rows.slice(1) });
      continue;
    }

    // Lists
    const listMatch = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1]!);
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i]!;
        const m = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(l);
        if (m && /\d/.test(m[1]!) === ordered) { items.push(m[2]!); i++; continue; }
        if (l.trim() && /^\s{2,}/.test(l) && items.length) { items[items.length - 1] += ' ' + l.trim(); i++; continue; }
        break;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph
    const buf: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !isBlockStart(lines[i]!)) buf.push(lines[i++]!.trim());
    if (buf.length === 0) { buf.push(line.trim()); i++; }
    blocks.push({ type: 'paragraph', text: buf.join(' ') });
  }
  return blocks;
}

/* ---------- inline ---------- */

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)]+\))/g;

export function Inline({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith('`')) out.push(<code key={k++} className="ic">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('**')) out.push(<strong key={k++}><Inline text={tok.slice(2, -2)} /></strong>);
    else if (tok.startsWith('*')) out.push(<em key={k++}><Inline text={tok.slice(1, -1)} /></em>);
    else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const href = lm[2]!;
      const external = /^https?:/.test(href);
      out.push(
        <a key={k++} href={href} className="link" {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
          <Inline text={lm[1]!} />
          {external && <span className="ext" aria-hidden>↗</span>}
        </a>,
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/* ---------- render ---------- */

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <Fragment key={i}>{renderBlock(b)}</Fragment>
      ))}
    </>
  );
}

function renderBlock(b: Block): ReactNode {
  switch (b.type) {
    case 'heading': {
      const Tag = b.level === 2 ? 'h2' : 'h3';
      return (
        <Tag id={b.id} className="anchored">
          <a href={`#${b.id}`} className="anchor" aria-hidden onClick={(e) => { e.preventDefault(); goToSection(b.id); }}>#</a>
          <Inline text={b.text} />
        </Tag>
      );
    }
    case 'paragraph':
      return <p><Inline text={b.text} /></p>;
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return <Tag>{b.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}</Tag>;
    }
    case 'code':
      return <CodeBlock code={b.code} lang={b.lang} title={b.title} variant={b.variant} />;
    case 'callout':
      return <Callout kind={b.kind} title={b.title}><Blocks blocks={b.blocks} /></Callout>;
    case 'steps':
      return (
        <ol className="steps">
          {b.steps.map((s, i) => (
            <li key={i} className="step">
              <div className="step-num">{i + 1}</div>
              <div className="step-body">
                <div className="step-title"><Inline text={s.title} /></div>
                <Blocks blocks={s.blocks} />
              </div>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead><tr>{b.head.map((c, i) => <th key={i}><Inline text={c} /></th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Inline text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
  }
}

export function Markdown({ src }: { src: string }) {
  return <Blocks blocks={parse(src)} />;
}

/** Strip inline-code backticks for plain-text contexts (tab title, buttons, search). */
export const plain = (text: string) => text.replace(/`|\*\*/g, '');

/** Plain text of a parsed block, for search indexing. */
export function blockText(b: Block): string {
  switch (b.type) {
    case 'heading': case 'paragraph': return b.text;
    case 'list': return b.items.join(' ');
    case 'code': return b.code;
    case 'callout': return (b.title ?? '') + ' ' + b.blocks.map(blockText).join(' ');
    case 'steps': return b.steps.map((s) => s.title + ' ' + s.blocks.map(blockText).join(' ')).join(' ');
    case 'table': return [b.head, ...b.rows].flat().join(' ');
  }
}

/** Plain text of a markdown string, for search indexing. */
export function toPlain(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*#>|]/g, ' ')
    .replace(/\[!(\w+)\]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
