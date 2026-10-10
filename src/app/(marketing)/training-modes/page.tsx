import { PageBanner } from '@/components/layout/page-banner';
import { Icon, type IconName } from '@/components/ui/icon';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Training Modes',
  description: 'Three ways to train with USSA: web-based, classroom and instructor-led training.',
};

const TRAINING_MODES: { icon: IconName; title: string; description: string; features: string[] }[] = [
  {
    icon: 'monitor',
    title: 'Web-Based Training',
    description: 'Learn online anytime, anywhere, at your own pace.',
    features: [
      'Self-paced modules available 24/7',
      'Progress saved automatically as you go',
      'Ideal for working professionals and shift schedules',
    ],
  },
  {
    icon: 'classroom',
    title: 'Classroom Training',
    description: 'Interactive in-person learning with peers.',
    features: [
      'Facilitated group discussion and scenario work',
      'Hands-on exercises with direct instructor feedback',
      'Scheduled sessions at partner training facilities',
    ],
  },
  {
    icon: 'instructor',
    title: 'Instructor-Led Training',
    description: 'Expert instructors, real-world experience.',
    features: [
      'Instructors with direct field experience',
      'Live Q&A and case-study walkthroughs',
      'Available in-person or via live virtual sessions',
    ],
  },
];

export default function TrainingModesPage() {
  return (
    <>
      <PageBanner
        title="Training Modes"
        subtitle="Three ways to train, so certification fits your schedule and how you learn best."
      />

      <section className="bg-white py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4">
          {TRAINING_MODES.map((trainingMode) => (
            <div key={trainingMode.title} className="flex flex-col gap-4 rounded-lg border border-slate-200 p-6 shadow-sm sm:flex-row sm:items-start">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                <Icon name={trainingMode.icon} className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-navy-900">{trainingMode.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{trainingMode.description}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {trainingMode.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
