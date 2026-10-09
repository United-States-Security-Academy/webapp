'use client';

import { useState } from 'react';
import type { DailyEnrollmentCount } from './admin-overview-queries';

const RANGE_OPTIONS = [7, 30, 90] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING = { top: 12, right: 12, bottom: 28, left: 32 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

function formatDay(isoDate: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

// Rounds the axis maximum up to a tidy number so gridlines land on whole values.
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((multiplier) => multiplier * magnitude).find((candidate) => candidate * 4 >= value) ?? magnitude * 10;
  return step * 4;
}

export function EnrollmentTrendChart({ dailyEnrollments }: { dailyEnrollments: DailyEnrollmentCount[] }) {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const points = dailyEnrollments.slice(-rangeDays);
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const yMax = niceMax(Math.max(...points.map((point) => point.count)));
  const xFor = (index: number) => PADDING.left + (points.length === 1 ? PLOT_WIDTH / 2 : (index / (points.length - 1)) * PLOT_WIDTH);
  const yFor = (value: number) => PADDING.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${xFor(index)},${yFor(point.count)}`).join(' ');
  const areaPath = `${linePath} L${xFor(points.length - 1)},${yFor(0)} L${xFor(0)},${yFor(0)} Z`;
  const gridValues = [0, 1, 2, 3, 4].map((step) => (yMax / 4) * step);
  const labelEvery = Math.ceil(points.length / 7);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  function handlePointerMove(pointerEvent: React.PointerEvent<SVGRectElement>) {
    const bounds = pointerEvent.currentTarget.getBoundingClientRect();
    const relativeX = ((pointerEvent.clientX - bounds.left) / bounds.width) * PLOT_WIDTH;
    const index = Math.round((relativeX / PLOT_WIDTH) * (points.length - 1));
    setHoveredIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy-900">Enrollments</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            <span className="font-semibold text-navy-900">{total}</span> in the last {rangeDays} days
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold" role="group" aria-label="Date range">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setRangeDays(option);
                setHoveredIndex(null);
              }}
              aria-pressed={rangeDays === option}
              className={`rounded-md px-3 py-1 ${rangeDays === option ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'}`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-auto w-full" aria-hidden="true">
          <defs>
            <linearGradient id="enrollment-area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c6a15b" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#c6a15b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridValues.map((gridValue) => (
            <g key={gridValue}>
              <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={yFor(gridValue)} y2={yFor(gridValue)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PADDING.left - 8} y={yFor(gridValue)} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
                {Number.isInteger(gridValue) ? gridValue : gridValue.toFixed(1)}
              </text>
            </g>
          ))}

          {points.map((point, index) =>
            index % labelEvery === 0 || index === points.length - 1 ? (
              <text key={point.date} x={xFor(index)} y={CHART_HEIGHT - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {formatDay(point.date, rangeDays === 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' })}
              </text>
            ) : null,
          )}

          <path d={areaPath} fill="url(#enrollment-area-fill)" />
          <path d={linePath} fill="none" stroke="#122a52" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {hoveredPoint && hoveredIndex !== null && (
            <g>
              <line
                x1={xFor(hoveredIndex)}
                x2={xFor(hoveredIndex)}
                y1={PADDING.top}
                y2={yFor(0)}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={xFor(hoveredIndex)} cy={yFor(hoveredPoint.count)} r="5" fill="#c6a15b" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}

          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoveredIndex(null)}
          />
        </svg>

        {hoveredPoint && hoveredIndex !== null && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-navy-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg"
            style={{ left: `${(xFor(hoveredIndex) / CHART_WIDTH) * 100}%` }}
          >
            <p className="font-semibold">{formatDay(hoveredPoint.date, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            <p className="text-slate-300">
              {hoveredPoint.count} enrollment{hoveredPoint.count === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Enrollments per day, last {rangeDays} days (UTC)</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDay(point.date, { month: 'long', day: 'numeric', year: 'numeric' })}</th>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
