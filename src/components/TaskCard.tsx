import { useT } from '../lib/i18n';
import { useState } from 'react';
import type { Task } from '../content/types';
import { Markdown } from '../lib/markdown';
import { progress, useProgress } from '../lib/progress';
import { CodeBlock } from './CodeBlock';
import { Icon } from './Icon';

export function TaskCard({ task, index, lessonKey }: { task: Task; index: number; lessonKey: string }) {
  const p = useProgress();
  const key = `${lessonKey}#${index}`;
  const done = !!p.tasks[key];
  const [showExpected, setShowExpected] = useState(false);
  const t = useT().task;

  return (
    <article className={`task ${done ? 'is-done' : ''}`}>
      <header className="task-head">
        <span className="eyebrow">{t.label(index + 1)}</span>
        <h3 className="task-title">{task.title}</h3>
      </header>

      <div className="task-steps"><Markdown src={task.steps} /></div>

      {task.starter && <CodeBlock code={task.starter} lang={task.starterLang ?? 'ts'} title={t.starter} />}

      {task.hints?.map((h, i) => (
        <details key={i} className="hint">
          <summary><Icon name="bulb" size={14} /> {t.hint} {task.hints!.length > 1 ? i + 1 : ''}</summary>
          <div className="hint-body"><Markdown src={h} /></div>
        </details>
      ))}

      <div className="task-actions">
        <button type="button" className="btn-outline" onClick={() => setShowExpected((s) => !s)} aria-expanded={showExpected}>
          <Icon name="eye" size={15} /> {showExpected ? t.hide : t.show}
        </button>
        <label className="check">
          <input type="checkbox" checked={done} onChange={() => progress.toggleTask(key)} />
          <span className="check-box"><Icon name="check" size={12} /></span>
          {t.done}
        </label>
      </div>

      {showExpected && (
        <div className="task-expected">
          <div className="eyebrow">{t.expected}</div>
          <Markdown src={task.expected} />
        </div>
      )}
    </article>
  );
}
