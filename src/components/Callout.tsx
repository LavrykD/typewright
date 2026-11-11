import { useT } from '../lib/i18n';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Inline } from '../lib/markdown';

export type CalloutKind = 'note' | 'tip' | 'warning' | 'pitfall';

const ICON: Record<CalloutKind, 'info' | 'bulb' | 'alert' | 'flame'> = {
  note: 'info', tip: 'bulb', warning: 'alert', pitfall: 'flame',
};

export function Callout({ kind, title, children }: { kind: CalloutKind; title?: string; children: ReactNode }) {
  const label = useT().callout[kind];
  return (
    <aside className={`callout callout-${kind}`}>
      <div className="callout-icon"><Icon name={ICON[kind]} size={16} /></div>
      <div className="callout-body">
        <div className="callout-title">
          <span className="callout-kind">{label}</span>
          {title && <span className="callout-heading"><Inline text={title} /></span>}
        </div>
        {children}
      </div>
    </aside>
  );
}
