/**
 * The one expressive moment in the system (per the Mintlify reference): a soft, painted-looking
 * cloud landscape on a deep teal → mint sky. Everything below the hero stays monochrome.
 * Clouds are kept away from the centred headline so text stays legible.
 */

// One cumulus silhouette: [cx, cy, r] puffs on a flat base, drawn in a 0–400 × 0–160 box.
const PUFFS: [number, number, number][] = [
  [60, 112, 44], [118, 86, 58], [186, 64, 74], [258, 80, 60], [318, 104, 46], [356, 122, 30],
  [150, 112, 48], [226, 116, 52], [290, 124, 38],
];

const CLOUDS: { x: number; y: number; s: number; o: number; flip?: boolean }[] = [
  { x: -150, y: 410, s: 1.25, o: 1 },
  { x: 1070, y: 395, s: 1.2, o: 1, flip: true },
  { x: 310, y: 500, s: 1.5, o: 0.95 },
  { x: 700, y: 520, s: 1.3, o: 0.95, flip: true },
  { x: 40, y: 150, s: 0.42, o: 0.55 },
  { x: 1190, y: 110, s: 0.38, o: 0.5, flip: true },
  { x: 1280, y: 260, s: 0.3, o: 0.4 },
];

function Cloud({ x, y, s, o, flip }: { x: number; y: number; s: number; o: number; flip?: boolean }) {
  const t = flip ? `translate(${x + 400 * s} ${y}) scale(${-s} ${s})` : `translate(${x} ${y}) scale(${s})`;
  return (
    <g transform={t} opacity={o}>
      {/* soft shadow under the cloud */}
      <ellipse cx="200" cy="150" rx="190" ry="16" fill="#03251c" opacity="0.18" filter="url(#blur8)" />
      <g filter="url(#paint)">
        {PUFFS.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} fill="url(#cloudBody)" />)}
        <rect x="20" y="118" width="360" height="30" rx="15" fill="url(#cloudBody)" />
      </g>
      {/* sunlit tops */}
      {PUFFS.slice(0, 5).map(([cx, cy, r], i) => (
        <circle key={i} cx={cx - r * 0.18} cy={cy - r * 0.3} r={r * 0.62} fill="url(#cloudLight)" />
      ))}
    </g>
  );
}

export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#052e23" />
          <stop offset="0.5" stopColor="#0a5e41" />
          <stop offset="1" stopColor="#2f9a6c" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1c2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff1c2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="textWash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#042a1f" stopOpacity="0.55" />
          <stop offset="1" stopColor="#042a1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cloudBody" x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff8e6" />
          <stop offset="0.55" stopColor="#f6e2b3" />
          <stop offset="1" stopColor="#d6b077" />
        </linearGradient>
        <radialGradient id="cloudLight" cx="0.4" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fffaf0" stopOpacity="0" />
        </radialGradient>
        <filter id="paint" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <filter id="blur8"><feGaussianBlur stdDeviation="8" /></filter>
        <pattern id="grain" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.45" fill="#ffffff" opacity="0.04" />
        </pattern>
      </defs>
      <rect width="1440" height="640" fill="url(#sky)" />
      <ellipse cx="720" cy="560" rx="620" ry="260" fill="url(#glow)" />
      {[[180, 70], [420, 40], [760, 34], [1010, 30], [1300, 70], [600, 96], [90, 230], [1360, 200], [880, 90]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 2 ? 1.5 : 1} fill="#fff8dc" opacity="0.65" />
      ))}
      {CLOUDS.map((c, i) => <Cloud key={i} {...c} />)}
      <ellipse cx="720" cy="230" rx="560" ry="210" fill="url(#textWash)" />
      <rect width="1440" height="640" fill="url(#grain)" />
    </svg>
  );
}
