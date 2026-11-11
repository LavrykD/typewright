import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Inline } from '../lib/markdown';

export type CalloutKind = 'note' | 'tip' | 'warning' | 'pitfall';

const META: Record<CalloutKind, { label: string; icon: 'info' | 'bulb' | 'alert' | 'flame' }> = {
  note: { label: 'Note', icon: 'info' },
  tip: { label: 'Tip', icon: 'bulb' },
  warning: { label: 'Warning', icon: 'alert' },
  pitfall: { label: 'Bottleneck', icon: 'flame' },
};

export function Callout({ kind, title, children }: { kind: CalloutKind; title?: string; children: ReactNode }) {
  const m = META[kind];
  return (
    <aside className={`callout callout-${kind}`}>
      <div className="callout-icon"><Icon name={m.icon} size={16} /></div>
      <div className="callout-body">
        <div className="callout-title">
          <span className="callout-kind">{m.label}</span>
          {title && <span className="callout-heading"><Inline text={title} /></span>}
        </div>
        {children}
      </div>
    </aside>
  );
}
