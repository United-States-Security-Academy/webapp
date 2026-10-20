import { useId } from 'react';

// Decorative artwork for the veterans announcement and the /veterans page: a waving U.S. flag and
// gold light streaks, drawn as SVG so they stay sharp at any size. Both are hidden from screen readers.

const FLAG_WIDTH = 600;
const FLAG_HEIGHT = 400;
const STRIPE_HEIGHT = FLAG_HEIGHT / 13;
const CANTON_WIDTH = 240;
const CANTON_HEIGHT = STRIPE_HEIGHT * 7;
const WAVE_PHASE = 0.6;

function waveAngle(x: number): number {
  return (x / FLAG_WIDTH) * Math.PI * 3 + WAVE_PHASE;
}

// The flag ripples more towards its free (right) edge.
function waveY(x: number, y: number): number {
  return y + 16 * Math.sin(waveAngle(x)) * (0.35 + (0.65 * x) / FLAG_WIDTH);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// A band of the flag between two straight lines, bent by the wave.
function bandPath(fromX: number, toX: number, topY: number, bottomY: number): string {
  const xs: number[] = [];
  for (let x = fromX; x < toX; x += 10) xs.push(x);
  xs.push(toX);
  const top = xs.map((x) => `${round(x)},${round(waveY(x, topY))}`);
  const bottom = [...xs].reverse().map((x) => `${round(x)},${round(waveY(x, bottomY))}`);
  return `M${top.join('L')}L${bottom.join('L')}Z`;
}

function starPath(centerX: number, centerY: number, outerRadius: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : outerRadius * 0.382;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${round(centerX + radius * Math.cos(angle))},${round(centerY + radius * Math.sin(angle))}`);
  }
  return `M${points.join('L')}Z`;
}

const RED_STRIPES = Array.from({ length: 7 }, (_, index) => bandPath(0, FLAG_WIDTH, index * 2 * STRIPE_HEIGHT, (index * 2 + 1) * STRIPE_HEIGHT));
const FLAG_OUTLINE = bandPath(0, FLAG_WIDTH, 0, FLAG_HEIGHT);
const CANTON = bandPath(0, CANTON_WIDTH, 0, CANTON_HEIGHT);
// 50 stars: nine rows, alternating six and five.
const STARS = Array.from({ length: 9 }, (_, row) => {
  const y = ((row + 1) * CANTON_HEIGHT) / 10;
  const count = row % 2 === 0 ? 6 : 5;
  return Array.from({ length: count }, (_, column) => {
    const x = ((column * 2 + (row % 2 === 0 ? 1 : 2)) * CANTON_WIDTH) / 12;
    return starPath(x, waveY(x, y), 9);
  });
})
  .flat()
  .join('');
// Light and shadow across the folds, following the slope of the wave.
const FOLD_STOPS = Array.from({ length: 21 }, (_, index) => {
  const offset = index / 20;
  return { offset, slope: Math.cos(waveAngle(offset * FLAG_WIDTH)) };
});

export function VeteransFlag({ className }: { className?: string }) {
  const id = useId();
  const clipId = `${id}-flag`;
  const shadowId = `${id}-shadow`;
  const shineId = `${id}-shine`;

  return (
    <svg viewBox={`-10 -30 ${FLAG_WIDTH + 20} ${FLAG_HEIGHT + 60}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <clipPath id={clipId}>
          <path d={FLAG_OUTLINE} />
        </clipPath>
        <linearGradient id={shadowId} x1="0" x2="1" y1="0" y2="0">
          {FOLD_STOPS.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor="#000" stopOpacity={round(Math.max(0, -stop.slope) * 0.45)} />
          ))}
        </linearGradient>
        <linearGradient id={shineId} x1="0" x2="1" y1="0" y2="0">
          {FOLD_STOPS.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor="#fff" stopOpacity={round(Math.max(0, stop.slope) * 0.22)} />
          ))}
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="-30" width={FLAG_WIDTH} height={FLAG_HEIGHT + 60} fill="#eef0f4" />
        {RED_STRIPES.map((stripe) => (
          <path key={stripe} d={stripe} fill="#b31b2c" />
        ))}
        <path d={CANTON} fill="#1b2f6b" />
        <path d={STARS} fill="#f4f5f8" />
        <rect x="0" y="-30" width={FLAG_WIDTH} height={FLAG_HEIGHT + 60} fill={`url(#${shadowId})`} />
        <rect x="0" y="-30" width={FLAG_WIDTH} height={FLAG_HEIGHT + 60} fill={`url(#${shineId})`} />
      </g>
    </svg>
  );
}

const STREAKS: { d: string; width: number }[] = [
  { d: 'M-50 340 C 250 250, 520 430, 1050 110', width: 2.5 },
  { d: 'M-50 372 C 300 300, 620 390, 1050 60', width: 1.5 },
  { d: 'M260 420 C 480 320, 760 210, 1050 24', width: 2 },
  { d: 'M-20 300 C 360 350, 680 210, 1050 170', width: 1 },
];

export function GoldStreaks({ className }: { className?: string }) {
  const id = useId();
  const gradientId = `${id}-gold`;
  const glowId = `${id}-glow`;

  return (
    <svg viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#c6a15b" stopOpacity="0" />
          <stop offset="0.35" stopColor="#c6a15b" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#f7dc95" stopOpacity="1" />
          <stop offset="1" stopColor="#fff3cf" stopOpacity="0.15" />
        </linearGradient>
        <filter id={glowId} x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round">
        <g filter={`url(#${glowId})`} opacity="0.7">
          {STREAKS.map((streak) => (
            <path key={streak.d} d={streak.d} strokeWidth={streak.width * 4} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        {STREAKS.map((streak) => (
          <path key={streak.d} d={streak.d} strokeWidth={streak.width} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}
