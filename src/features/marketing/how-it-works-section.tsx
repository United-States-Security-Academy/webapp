const ENROLLMENT_STEPS: { step: string; title: string; description: string }[] = [
  {
    step: '01',
    title: 'Create Your Account',
    description: 'Create your free USSA account.',
  },
  {
    step: '02',
    title: 'Choose Your Training',
    description: 'Browse courses and select the program that fits your goals.',
  },
  {
    step: '03',
    title: 'Complete Your Training',
    description: 'Learn online or attend your scheduled classroom/instructor-led program.',
  },
  {
    step: '04',
    title: 'Earn Your Certificate',
    description: 'Complete the requirements and receive your certificate.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <p className="text-center text-xs font-bold tracking-[0.3em] text-gold-600">GETTING STARTED</p>
        <h2 className="mt-2 text-center text-2xl font-extrabold tracking-wide text-navy-900 sm:text-3xl">How It Works</h2>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {ENROLLMENT_STEPS.map((enrollmentStep, index) => (
            <div key={enrollmentStep.step} className="relative flex flex-col items-center px-2 text-center">
              {index < ENROLLMENT_STEPS.length - 1 && (
                <span className="absolute left-1/2 top-7 hidden h-px w-full bg-slate-200 lg:block" aria-hidden />
              )}
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-extrabold text-gold-400">
                {enrollmentStep.step}
              </span>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-navy-900">{enrollmentStep.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{enrollmentStep.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
