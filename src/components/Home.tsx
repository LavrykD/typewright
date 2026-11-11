import { allLessons, bottlenecks, lessonKey, tracks } from '../content';
import { lessonHref } from '../lib/router';
import { useProgress } from '../lib/progress';
import { HeroArt } from './HeroArt';
import { Icon } from './Icon';
import { Inline } from '../lib/markdown';

export function Home() {
  const p = useProgress();
  const nextUp = allLessons.find((l) => !p.done[lessonKey(l)]);
  const started = Object.keys(p.done).length > 0;
  const ts = tracks[0]!;
  const pw = tracks[1]!;

  return (
    <div className="home">
      <section className="hero">
        <HeroArt />
        <div className="hero-inner">
          <div className="hero-badge"><span className="dot light" /> Built on the official docs · {ts.version} · {pw.version}</div>
          <h1>Learn TypeScript and Playwright, one hard thing at a time.</h1>
          <p>A self-study knowledge base with clear explanations, real examples, quizzes that explain themselves, and hands-on tasks with the result you should end up with.</p>
          <div className="hero-cta">
            {started && nextUp ? (
              <a className="btn-light" href={lessonHref(nextUp.track, nextUp.slug)}>Continue: {nextUp.title} <Icon name="arrowRight" size={15} /></a>
            ) : (
              <a className="btn-light" href={lessonHref(ts.lessons[0]!.track, ts.lessons[0]!.slug)}>Start with TypeScript <Icon name="arrowRight" size={15} /></a>
            )}
            <a className="btn-hero-ghost" href={lessonHref(pw.lessons[0]!.track, pw.lessons[0]!.slug)}>Jump to Playwright</a>
          </div>
        </div>
        <div className="hero-product" aria-hidden>
          <div className="mock">
            <div className="mock-side">
              <div className="mock-logo" />
              {['Mental model', 'Narrowing', 'Generics', 'Type operators', 'tsconfig'].map((t, i) => (
                <div key={t} className={`mock-nav ${i === 1 ? 'on' : ''}`}><span />{t}</div>
              ))}
            </div>
            <div className="mock-main">
              <div className="mock-eyebrow">TypeScript · Core types</div>
              <div className="mock-h">Narrowing & discriminated unions</div>
              <div className="mock-p" /><div className="mock-p short" />
              <pre className="mock-code">{`type Result =
  | { ok: true; data: User }
  | { ok: false; error: string };

if (result.ok) {
  result.data.name; // ✓ narrowed
}`}</pre>
              <div className="mock-quiz"><b>Q1</b> What does <code>never</code> prove here?</div>
            </div>
            <div className="mock-toc">
              <div className="mock-toc-t">On this page</div>
              {['typeof guards', 'in operator', 'Discriminants', 'Exhaustiveness'].map((t, i) => (
                <div key={t} className={`mock-toc-i ${i === 2 ? 'on' : ''}`}>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <div className="eyebrow"><span className="dot" />Two tracks</div>
          <h2>Pick a track. They're designed to be learned together.</h2>
          <p>Playwright tests are written in TypeScript, so every TypeScript lesson pays off twice. Start with TypeScript if generics or narrowing feel fuzzy.</p>
        </div>
        <div className="track-grid">
          {tracks.map((t) => {
            const done = t.lessons.filter((l) => p.done[lessonKey(l)]).length;
            return (
              <a key={t.id} href={`#/${t.id}`} className="track-card">
                <div className="track-card-top">
                  <span className="track-icon"><Icon name={t.id === 'typescript' ? 'code' : 'play'} size={18} /></span>
                  <span className="tag">{t.version}</span>
                </div>
                <h3>{t.name}</h3>
                <p>{t.tagline}</p>
                <div className="track-foot">
                  <div className="meter"><span style={{ width: `${(done / t.lessons.length) * 100}%` }} /></div>
                  <span>{done}/{t.lessons.length} lessons</span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <div className="eyebrow"><span className="dot" />How every lesson works</div>
          <h2>Read it, see it, test yourself, build it.</h2>
        </div>
        <div className="how-grid">
          {[
            { icon: 'book', t: 'Clear explanation', d: 'The mental model first, then the details — written from the official docs, with links to every source.' },
            { icon: 'code', t: 'Real examples', d: 'Runnable code with “avoid / prefer” pairs, so you see the mistake next to the fix.' },
            { icon: 'target', t: 'Self-explaining quiz', d: 'Every answer — right or wrong — tells you why. Retry as often as you like.' },
            { icon: 'wrench', t: 'Manual tasks', d: 'Step-by-step tasks for your own editor, with the exact result you should end up with.' },
          ].map((c) => (
            <div key={c.t} className="feature-card">
              <Icon name={c.icon as 'book'} size={20} className="feature-icon" />
              <h3>{c.t}</h3>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-head row">
          <div>
            <div className="eyebrow"><span className="dot" />The bottleneck wiki</div>
            <h2>The {bottlenecks.length} things that trip everyone up.</h2>
            <p>Every “bottleneck” callout across the curriculum, collected in one place — the questions you'd otherwise lose an afternoon to.</p>
          </div>
          <a className="btn-primary" href="#/bottlenecks">Open the wiki <Icon name="arrowRight" size={15} /></a>
        </div>
        <div className="bn-preview">
          {bottlenecks.slice(0, 6).map((b, i) => (
            <a key={i} href={lessonHref(b.lesson.track, b.lesson.slug, b.section?.id)} className="bn-row">
              <Icon name="flame" size={16} className="bn-icon" />
              <span className="bn-title"><Inline text={b.title} /></span>
              <span className="bn-where">{b.lesson.track === 'typescript' ? 'TS' : 'PW'} · {b.lesson.title}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>Typewright — a personal study companion. Content is based on the official TypeScript and Playwright documentation; always check the sources for the latest details.</span>
      </footer>
    </div>
  );
}
