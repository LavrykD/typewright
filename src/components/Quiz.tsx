import { useT } from '../lib/i18n';
import type { QuizQuestion } from '../content/types';
import { Inline, Markdown } from '../lib/markdown';
import { progress, useProgress } from '../lib/progress';
import { CodeBlock } from './CodeBlock';
import { Icon } from './Icon';

export function Quiz({ lessonKey, questions }: { lessonKey: string; questions: QuizQuestion[] }) {
  const p = useProgress();
  const t = useT().quiz;
  const answered = questions.filter((_, i) => p.quiz[`${lessonKey}#${i}`] !== undefined).length;
  const correct = questions.filter((q, i) => p.quiz[`${lessonKey}#${i}`] === q.answer).length;

  return (
    <div className="quiz">
      <div className="quiz-score">
        <div className="meter" aria-hidden>
          <span style={{ width: `${(answered / questions.length) * 100}%` }} />
        </div>
        <span>{answered === questions.length ? t.correct(correct, questions.length) : t.answered(answered, questions.length)}</span>
        {answered > 0 && (
          <button type="button" className="btn-ghost sm" onClick={() => progress.resetQuiz(lessonKey)}>
            <Icon name="reset" size={14} /> {t.retry}
          </button>
        )}
      </div>

      {questions.map((q, qi) => {
        const key = `${lessonKey}#${qi}`;
        const chosen = p.quiz[key];
        const done = chosen !== undefined;
        return (
          <div key={qi} className="quiz-q">
            <div className="quiz-q-head">
              <span className="quiz-num">Q{qi + 1}</span>
              <div className="quiz-text"><Inline text={q.q} /></div>
            </div>
            {q.code && <CodeBlock code={q.code} lang="ts" />}
            <div className="quiz-options" role="radiogroup">
              {q.options.map((opt, oi) => {
                let state = '';
                if (done) {
                  if (oi === q.answer) state = 'correct';
                  else if (oi === chosen) state = 'wrong';
                  else state = 'muted';
                }
                return (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={chosen === oi}
                    disabled={done}
                    className={`quiz-opt ${state}`}
                    onClick={() => progress.answer(key, oi)}
                  >
                    <span className="quiz-letter">{String.fromCharCode(65 + oi)}</span>
                    <span><Inline text={opt} /></span>
                    {state === 'correct' && <Icon name="check" size={16} className="quiz-mark" />}
                    {state === 'wrong' && <Icon name="x" size={16} className="quiz-mark" />}
                  </button>
                );
              })}
            </div>
            {done && (
              <div className={`quiz-explain ${chosen === q.answer ? 'ok' : 'no'}`}>
                <strong>{chosen === q.answer ? t.right : t.wrong}</strong> <Markdown src={q.explain} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
