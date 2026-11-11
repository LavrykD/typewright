import { lessonKey, useContent } from '../content';
import { Inline, plain } from '../lib/markdown';
import { lessonHref } from '../lib/router';
import { progress, useProgress } from '../lib/progress';
import { useT } from '../lib/i18n';
import { HeroArt } from './HeroArt';
import { Icon, type IconName } from './Icon';

const HOW_ICONS: IconName[] = ['book', 'code', 'target', 'wrench'];

export function Home() {
  const p = useProgress();
  const t = useT();
  const h = t.home;
  const { allLessons, bottlenecks, tracks } = useContent();
  const nextUp = allLessons.find((l) => !p.done[lessonKey(l)]);
  const started = Object.keys(p.done).length > 0 || Object.keys(p.quiz).length > 0;
  const ts = tracks[0]!;
  const pw = tracks[1]!;

  const reset = () => { if (window.confirm(h.resetConfirm)) progress.resetAll(); };

  return (
    <div className="home">
      <section className="hero">
        <HeroArt />
        <div className="hero-inner">
          <div className="hero-badge"><span className="dot light" /> {h.badge} · {ts.version} · {pw.version}</div>
          <h1>{h.title}</h1>
          <p>{h.lead}</p>
          <div className="hero-cta">
            {started && nextUp ? (
              <a className="btn-light" href={lessonHref(nextUp.track, nextUp.slug)}>{h.continue(plain(nextUp.title))} <Icon name="arrowRight" size={15} /></a>
            ) : (
              <a className="btn-light" href={lessonHref(ts.lessons[0]!.track, ts.lessons[0]!.slug)}>{h.start} <Icon name="arrowRight" size={15} /></a>
            )}
            <a className="btn-hero-ghost" href={lessonHref(pw.lessons[0]!.track, pw.lessons[0]!.slug)}>{h.jump}</a>
          </div>
        </div>
        <div className="hero-product" aria-hidden>
          <div className="mock">
            <div className="mock-side">
              <div className="mock-logo" />
              {h.mock.nav.map((label, i) => (
                <div key={label} className={`mock-nav ${i === 1 ? 'on' : ''}`}><span />{label}</div>
              ))}
            </div>
            <div className="mock-main">
              <div className="mock-eyebrow">{h.mock.eyebrow}</div>
              <div className="mock-h">{h.mock.title}</div>
              <div className="mock-p" /><div className="mock-p short" />
              <pre className="mock-code">{`type Result =
  | { ok: true; data: User }
  | { ok: false; error: string };

if (result.ok) {
  result.data.name; // ✓
}`}</pre>
              <div className="mock-quiz"><b>Q1</b> {h.mock.quiz} <code>never</code>{h.mock.quizEnd === '?' ? '?' : ' ' + h.mock.quizEnd}</div>
            </div>
            <div className="mock-toc">
              <div className="mock-toc-t">{h.mock.tocTitle}</div>
              {h.mock.toc.map((label, i) => (
                <div key={label} className={`mock-toc-i ${i === 2 ? 'on' : ''}`}>{label}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <div className="eyebrow"><span className="dot" />{h.tracksEyebrow}</div>
          <h2>{h.tracksTitle}</h2>
          <p>{h.tracksLead}</p>
        </div>
        <div className="track-grid">
          {tracks.map((tr) => {
            const done = tr.lessons.filter((l) => p.done[lessonKey(l)]).length;
            return (
              <a key={tr.id} href={`#/${tr.id}`} className="track-card">
                <div className="track-card-top">
                  <span className="track-icon"><Icon name={tr.id === 'typescript' ? 'code' : 'play'} size={18} /></span>
                  <span className="tag">{tr.version}</span>
                </div>
                <h3>{tr.name}</h3>
                <p>{tr.tagline}</p>
                <div className="track-foot">
                  <div className="meter"><span style={{ width: `${(done / tr.lessons.length) * 100}%` }} /></div>
                  <span>{t.lessonsOf(done, tr.lessons.length)}</span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <div className="eyebrow"><span className="dot" />{h.howEyebrow}</div>
          <h2>{h.howTitle}</h2>
        </div>
        <div className="how-grid">
          {h.how.map((c, i) => (
            <div key={c.t} className="feature-card">
              <Icon name={HOW_ICONS[i]!} size={20} className="feature-icon" />
              <h3>{c.t}</h3>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head row">
          <div>
            <div className="eyebrow"><span className="dot" />{h.bnEyebrow}</div>
            <h2>{h.bnTitle(bottlenecks.length)}</h2>
            <p>{h.bnLead}</p>
          </div>
          <a className="btn-primary" href="#/bottlenecks">{h.bnOpen} <Icon name="arrowRight" size={15} /></a>
        </div>
        <div className="bn-preview">
          {bottlenecks.slice(0, 6).map((b, i) => (
            <a key={i} href={lessonHref(b.lesson.track, b.lesson.slug, b.section?.id)} className="bn-row">
              <Icon name="flame" size={16} className="bn-icon" />
              <span className="bn-title"><Inline text={b.title} /></span>
              <span className="bn-where">{b.lesson.track === 'typescript' ? 'TS' : 'PW'} · {plain(b.lesson.title)}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>{h.footer}</span>
        {started && (
          <button type="button" className="btn-ghost sm" onClick={reset}><Icon name="reset" size={14} /> {h.reset}</button>
        )}
      </footer>
    </div>
  );
}
