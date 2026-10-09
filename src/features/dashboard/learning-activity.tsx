'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Days are bucketed in the learner's own time zone, which the server doesn't know — so these
// components wait until they mount in the browser before showing anything date-dependent.
function useBrowserToday(): Date | null {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const now = new Date();
    setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);
  return today;
}

function toLocalDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeekMonday(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function useLessonsPerDay(completedAtIsoList: string[]): Map<string, number> {
  return useMemo(() => {
    const countsByDay = new Map<string, number>();
    for (const completedAtIso of completedAtIsoList) {
      const dayKey = toLocalDayKey(new Date(completedAtIso));
      countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
    }
    return countsByDay;
  }, [completedAtIsoList]);
}

function useWeekNavigation(today: Date | null) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = today ? addDays(startOfWeekMonday(today), weekOffset * 7) : null;
  const weekDays = weekStart ? WEEKDAY_LABELS.map((_, index) => addDays(weekStart, index)) : [];
  return {
    weekDays,
    isCurrentWeek: weekOffset === 0,
    goToPreviousWeek: () => setWeekOffset((current) => current - 1),
    goToNextWeek: () => setWeekOffset((current) => Math.min(0, current + 1)),
  };
}

function WeekHeader({
  title,
  weekDays,
  isCurrentWeek,
  onPrevious,
  onNext,
}: {
  title: string;
  weekDays: Date[];
  isCurrentWeek: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const firstDay = weekDays[0];
  const lastDay = weekDays[weekDays.length - 1];
  const rangeLabel =
    firstDay && lastDay
      ? `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : '';

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h3 className="text-sm font-bold text-navy-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{rangeLabel}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Previous week"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-navy-800 hover:text-navy-800"
        >
          <Icon name="chevronDown" className="h-3.5 w-3.5 rotate-90" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isCurrentWeek}
          aria-label="Next week"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-navy-800 hover:text-navy-800 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
        >
          <Icon name="chevronDown" className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>
    </div>
  );
}

export function LearningStreakStats({
  completedAtIsoList,
  certificateCount,
}: {
  completedAtIsoList: string[];
  certificateCount: number;
}) {
  const today = useBrowserToday();
  const lessonsPerDay = useLessonsPerDay(completedAtIsoList);

  let dayStreak = 0;
  let lessonsThisMonth = 0;
  if (today) {
    // A streak stays alive through today even before today's first lesson, so start counting
    // from yesterday when nothing has been completed yet today.
    let cursor = lessonsPerDay.has(toLocalDayKey(today)) ? today : addDays(today, -1);
    while (lessonsPerDay.has(toLocalDayKey(cursor))) {
      dayStreak += 1;
      cursor = addDays(cursor, -1);
    }
    lessonsThisMonth = completedAtIsoList.filter((completedAtIso) => {
      const completedAt = new Date(completedAtIso);
      return completedAt.getFullYear() === today.getFullYear() && completedAt.getMonth() === today.getMonth();
    }).length;
  }

  const stats = [
    { label: 'Day streak', value: today ? dayStreak : '–', icon: 'target' as const },
    { label: 'Lessons this month', value: today ? lessonsThisMonth : '–', icon: 'checkCircle' as const },
    { label: 'Certificates', value: certificateCount, icon: 'award' as const },
  ];

  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-navy-900">
            <Icon name={stat.icon} className="h-4 w-4 text-gold-600" />
            {stat.value}
          </p>
          <p className="text-[11px] leading-tight text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function WeeklyStreakCard({ completedAtIsoList }: { completedAtIsoList: string[] }) {
  const today = useBrowserToday();
  const lessonsPerDay = useLessonsPerDay(completedAtIsoList);
  const { weekDays, isCurrentWeek, goToPreviousWeek, goToNextWeek } = useWeekNavigation(today);
  const activeDayCount = weekDays.filter((day) => lessonsPerDay.has(toLocalDayKey(day))).length;

  return (
    <Card>
      <WeekHeader
        title="Weekly Streak"
        weekDays={weekDays}
        isCurrentWeek={isCurrentWeek}
        onPrevious={goToPreviousWeek}
        onNext={goToNextWeek}
      />
      <p className="mt-4 text-xs font-semibold text-slate-600">
        {today ? `${activeDayCount}/7 days active` : ' '}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {weekDays.map((day) => {
          const isActive = lessonsPerDay.has(toLocalDayKey(day));
          const isToday = today !== null && toLocalDayKey(day) === toLocalDayKey(today);
          return (
            <div
              key={day.toISOString()}
              className={`flex flex-col items-center rounded-lg py-1.5 ${
                isActive ? 'bg-gold-500 text-navy-950' : isToday ? 'ring-1 ring-navy-800 text-navy-900' : 'text-slate-500'
              }`}
              title={isActive ? `${lessonsPerDay.get(toLocalDayKey(day))} lesson(s) completed` : undefined}
            >
              <span className="text-[10px] font-semibold">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</span>
              <span className="text-sm font-bold">{day.getDate()}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function WeeklyLessonsChart({ completedAtIsoList }: { completedAtIsoList: string[] }) {
  const today = useBrowserToday();
  const lessonsPerDay = useLessonsPerDay(completedAtIsoList);
  const { weekDays, isCurrentWeek, goToPreviousWeek, goToNextWeek } = useWeekNavigation(today);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);

  const dailyCounts = weekDays.map((day) => ({ day, dayKey: toLocalDayKey(day), count: lessonsPerDay.get(toLocalDayKey(day)) ?? 0 }));
  const weekTotal = dailyCounts.reduce((sum, entry) => sum + entry.count, 0);
  const maxCount = Math.max(1, ...dailyCounts.map((entry) => entry.count));
  const isFutureDay = (day: Date) => today !== null && day.getTime() > today.getTime();

  return (
    <Card>
      <WeekHeader
        title="Lessons Completed"
        weekDays={weekDays}
        isCurrentWeek={isCurrentWeek}
        onPrevious={goToPreviousWeek}
        onNext={goToNextWeek}
      />
      <p className="mt-4 text-xs font-semibold text-slate-600">
        {today ? `${weekTotal} lesson${weekTotal === 1 ? '' : 's'} this week` : ' '}
      </p>

      <div className="mt-3 flex h-32 items-end gap-2 border-b border-slate-200" aria-hidden="true">
        {dailyCounts.map(({ day, dayKey, count }) => {
          const isHovered = hoveredDayKey === dayKey;
          return (
            <div
              key={dayKey}
              className="relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHoveredDayKey(dayKey)}
              onMouseLeave={() => setHoveredDayKey(null)}
            >
              {isHovered && !isFutureDay(day) && (
                <span className="absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md bg-navy-900 px-2 py-1 text-[11px] font-semibold text-white">
                  {count} lesson{count === 1 ? '' : 's'}
                </span>
              )}
              <div
                className={`w-full max-w-[22px] rounded-t ${count > 0 ? (isHovered ? 'bg-gold-600' : 'bg-gold-500') : 'bg-slate-100'}`}
                style={{ height: count > 0 ? `${(count / maxCount) * 100}%` : '4px' }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2" aria-hidden="true">
        {dailyCounts.map(({ day, dayKey }) => (
          <span key={dayKey} className="flex-1 text-center text-[10px] font-semibold text-slate-400">
            {WEEKDAY_LABELS[(day.getDay() + 6) % 7]}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Lessons completed per day</caption>
        <tbody>
          {dailyCounts.map(({ day, dayKey, count }) => (
            <tr key={dayKey}>
              <th scope="row">{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</th>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
