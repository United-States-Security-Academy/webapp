import { PageBanner } from './page-banner';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export function LegalDocument({
  title,
  subtitle,
  lastUpdated,
  sections,
}: {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageBanner title={title} subtitle={subtitle} />
      <section className="bg-white py-12">
        <article className="mx-auto max-w-3xl px-4 text-sm leading-relaxed text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last updated {lastUpdated}</p>
          {sections.map((section) => (
            <section key={section.heading} className="mt-8">
              <h2 className="text-lg font-bold text-navy-900">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </section>
    </>
  );
}
