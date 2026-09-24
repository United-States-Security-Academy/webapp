import { Icon, type IconName } from '@/components/ui/icon';

const DIFFERENTIATORS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'instructor',
    title: 'Learn From Experience',
    description: 'Training designed around real-world operational needs.',
  },
  {
    icon: 'monitor',
    title: 'Flexible Learning',
    description: 'Train online, at your own pace, from anywhere.',
  },
  {
    icon: 'award',
    title: 'Career-Focused Certifications',
    description: 'Build credentials that support professional advancement.',
  },
  {
    icon: 'users',
    title: 'Built for Professionals',
    description: 'Programs designed for military, law enforcement, corrections, security and safety professionals.',
  },
];

export function WhyTrainSection() {
  return (
    <section className="bg-navy-950 py-16 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <p className="text-center text-xs font-bold tracking-[0.3em] text-gold-400">WHY UNITED STATES SECURITY ACADEMY</p>
        <h2 className="mt-2 text-center text-2xl font-extrabold tracking-wide sm:text-3xl">Why Train With USSA?</h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DIFFERENTIATORS.map((differentiator) => (
            <div
              key={differentiator.title}
              className="flex flex-col items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-6 transition hover:border-gold-500/60 hover:bg-white/10"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-500 text-navy-950">
                <Icon name={differentiator.icon} className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-white">{differentiator.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{differentiator.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
