import { Icon, type IconName } from '@/components/ui/icon';
import { StatCard } from '@/components/ui/stat-card';
import { RadialProgress } from '@/components/ui/radial-progress';

// Illustrative sample data for the mockup below — not real user data.
const MOCK_SIDEBAR_LINKS: { label: string; icon: IconName }[] = [
  { label: 'Dashboard', icon: 'monitor' },
  { label: 'My Courses', icon: 'bookOpen' },
  { label: 'Certificates', icon: 'award' },
  { label: 'Training History', icon: 'clock' },
];

const MOCK_COURSES: { title: string; lessons: string; percentage: number }[] = [
  { title: 'Security Officer Certification', lessons: '8/10 lessons', percentage: 80 },
  { title: 'Law Enforcement Use of Force', lessons: '5/11 lessons', percentage: 45 },
];

const MOCK_HISTORY: { text: string; time: string }[] = [
  { text: 'Completed "Access Control Basics"', time: '2h ago' },
  { text: 'Earned certificate — Corrections Training', time: '1d ago' },
  { text: 'Enrolled in Security Officer Certification', time: '3d ago' },
];

export function DashboardPreviewSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-xs font-bold tracking-[0.3em] text-gold-600">THE USSA PLATFORM</p>
        <h2 className="mx-auto mt-2 max-w-3xl text-center text-2xl font-extrabold tracking-wide text-navy-900 sm:text-3xl">
          YOUR TRAINING. YOUR PROGRESS. YOUR CERTIFICATIONS.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-600">
          Everything you need to manage your professional development in one place.
        </p>

        <div
          className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-3 rounded-full bg-white px-3 py-1 text-[11px] text-slate-400">app.ussa-academy.com/dashboard</span>
          </div>

          <div className="flex">
            <div className="hidden w-44 shrink-0 flex-col gap-1 bg-navy-950 p-4 sm:flex">
              <div className="mb-4 flex items-center gap-2 px-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-navy-950">
                  JD
                </span>
                <span className="text-[11px] font-semibold text-white">Jordan Davis</span>
              </div>
              {MOCK_SIDEBAR_LINKS.map((link, index) => (
                <span
                  key={link.label}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] font-semibold ${
                    index === 0 ? 'bg-white/10 text-gold-400' : 'text-slate-300'
                  }`}
                >
                  <Icon name={link.icon} className="h-3.5 w-3.5" />
                  {link.label}
                </span>
              ))}
            </div>

            <div className="flex-1 space-y-5 p-5">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Enrolled" value={3} icon="bookOpen" />
                <StatCard label="Certificates" value={1} icon="award" />
                <StatCard label="Lessons done" value={13} icon="checkCircle" />
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">My Courses</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MOCK_COURSES.map((course) => (
                    <div
                      key={course.title}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-navy-900">{course.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{course.lessons}</p>
                      </div>
                      <RadialProgress percentage={course.percentage} size={40} strokeWidth={4} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Certificates</p>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-gold-600">
                      <Icon name="award" className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-navy-900">Corrections Training</p>
                      <p className="text-[11px] text-slate-500">Earned Aug 14, 2026</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Training History</p>
                  <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
                    {MOCK_HISTORY.map((item) => (
                      <div key={item.text} className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] text-slate-600">{item.text}</p>
                        <p className="shrink-0 text-[10px] text-slate-400">{item.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
