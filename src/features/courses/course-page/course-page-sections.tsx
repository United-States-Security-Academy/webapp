import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
import { CourseCard } from '@/features/courses/course-card';
import type { Course, CourseDetailContentData } from '@/features/courses/course-types';
import { SITE_CONTACT, phoneHref } from '@/features/site/site-contact';

// The content sections of a course page. Every section is a plain, always-rendered block (no
// collapsed accordions), so readers can scan the page and search engines index all of it.

export function CoursePageSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 border-b border-slate-200 py-10 last:border-b-0">
      <h2 id={`${id}-heading`} className="text-xl font-bold text-navy-900 sm:text-2xl">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{children}</h3>;
}

export function CheckList({ items, columns = 1 }: { items: string[]; columns?: 1 | 2 }) {
  return (
    <ul className={`grid gap-x-8 gap-y-3 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
          <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FactGrid({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    // 1px gaps over a border-coloured background draw the dividers; an odd last cell spans the row.
    <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">
      {facts.map((fact, index) => (
        <div key={`${fact.label}-${index}`} className="flex flex-col gap-0.5 bg-white px-4 py-3 sm:last:odd:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{fact.label}</dt>
          <dd className="text-sm font-medium text-slate-900">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Notice({ icon, tone, children }: { icon: IconName; tone: 'important' | 'info'; children: ReactNode }) {
  const toneClasses = tone === 'important' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700';
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${toneClasses}`}>
      <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

export function OverviewSection({
  overview,
  keyInfo,
  importantNotice,
}: {
  overview: string[];
  keyInfo: { label: string; value: string }[];
  importantNotice?: string;
}) {
  return (
    <CoursePageSection id="overview" title="Overview">
      <div className="flex flex-col gap-4">
        {overview.map((paragraph, index) => (
          <p key={index} className="text-base leading-relaxed text-slate-700">
            {paragraph}
          </p>
        ))}
      </div>
      {importantNotice && (
        <div className="mt-6">
          <Notice icon="shieldCheck" tone="important">
            {importantNotice}
          </Notice>
        </div>
      )}
      {keyInfo.length > 0 && (
        <div className="mt-8">
          <SubHeading>At a glance</SubHeading>
          <div className="mt-3">
            <FactGrid facts={keyInfo} />
          </div>
        </div>
      )}
    </CoursePageSection>
  );
}

export function LearningSection({
  objectives,
  curriculumTopics,
}: {
  objectives: string[];
  curriculumTopics: { title: string; description: string }[];
}) {
  return (
    <CoursePageSection id="learn" title="What you'll learn">
      {objectives.length > 0 && <CheckList items={objectives} columns={2} />}
      {curriculumTopics.length > 0 && (
        <div className={objectives.length > 0 ? 'mt-8' : ''}>
          <SubHeading>Topics covered</SubHeading>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {curriculumTopics.map((topic, index) => (
              <div key={`${topic.title}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-semibold text-navy-900">{topic.title}</p>
                {topic.description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{topic.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </CoursePageSection>
  );
}

export function TrainingOptionsSection({ deliveryOptions }: { deliveryOptions: NonNullable<CourseDetailContentData['deliveryOptions']> }) {
  return (
    <CoursePageSection id="training" title="How you'll train">
      <div className={`grid gap-4 ${deliveryOptions.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {deliveryOptions.map((option, index) => (
          <div key={`${option.title}-${index}`} className="rounded-lg border border-slate-200 bg-white p-5">
            {option.title && <p className="font-bold text-navy-900">{option.title}</p>}
            <ul className="mt-3 flex flex-col gap-2">
              {option.points.map((point, pointIndex) => (
                <li key={pointIndex} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </CoursePageSection>
  );
}

export function RequirementsSection({ prerequisites, audience }: { prerequisites: string[]; audience: string[] }) {
  return (
    <CoursePageSection id="requirements" title="Requirements & who it's for">
      <div className={`grid gap-8 ${prerequisites.length > 0 && audience.length > 0 ? 'md:grid-cols-2' : ''}`}>
        {prerequisites.length > 0 && (
          <div>
            <SubHeading>Before you enroll</SubHeading>
            <div className="mt-3">
              <CheckList items={prerequisites} />
            </div>
          </div>
        )}
        {audience.length > 0 && (
          <div>
            <SubHeading>Who this course is for</SubHeading>
            <div className="mt-3">
              <CheckList items={audience} />
            </div>
          </div>
        )}
      </div>
    </CoursePageSection>
  );
}

export function ExamSection({
  examFacts,
  completionRequirements,
  outcomes,
  licensingNotice,
}: {
  examFacts: { label: string; value: string }[];
  completionRequirements: string[];
  outcomes: string[];
  licensingNotice?: string;
}) {
  return (
    <CoursePageSection id="exam" title="Exam & certificate">
      {examFacts.length > 0 && <FactGrid facts={examFacts} />}
      {completionRequirements.length > 0 && (
        <div className={examFacts.length > 0 ? 'mt-8' : ''}>
          <SubHeading>To complete the course</SubHeading>
          <div className="mt-3">
            <CheckList items={completionRequirements} />
          </div>
        </div>
      )}
      {outcomes.length > 0 && (
        <div className="mt-8">
          <SubHeading>On successful completion you&apos;ll have covered</SubHeading>
          <ul className="mt-3 flex flex-wrap gap-2">
            {outcomes.map((outcome, index) => (
              <li key={index} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {outcome}
              </li>
            ))}
          </ul>
        </div>
      )}
      {licensingNotice && (
        <div className="mt-8">
          <Notice icon="document" tone="info">
            {licensingNotice}
          </Notice>
        </div>
      )}
    </CoursePageSection>
  );
}

export function TuitionSection({
  priceLabel,
  tuitionIncludes,
  paymentNotes,
  action,
}: {
  priceLabel: string;
  tuitionIncludes: string[];
  paymentNotes: string[];
  action: ReactNode;
}) {
  return (
    <CoursePageSection id="tuition" title="Tuition">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course tuition</p>
            <p className="mt-1 text-3xl font-extrabold text-navy-900">{priceLabel}</p>
          </div>
          {action && <div className="w-full sm:w-auto sm:min-w-[14rem]">{action}</div>}
        </div>
        {tuitionIncludes.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <SubHeading>Tuition includes</SubHeading>
            <div className="mt-3">
              <CheckList items={tuitionIncludes} columns={2} />
            </div>
          </div>
        )}
      </div>
      {paymentNotes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {paymentNotes.map((note, index) => (
            <li key={index} className="text-xs leading-relaxed text-slate-500">
              {note}
            </li>
          ))}
        </ul>
      )}
    </CoursePageSection>
  );
}

export function AfterEnrollmentSection({ notes }: { notes: string[] }) {
  return (
    <CoursePageSection id="after-enrolling" title="After you enroll">
      <ol className="flex flex-col gap-5">
        {notes.map((note, index) => (
          <li key={index} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
              {index + 1}
            </span>
            <p className="pt-0.5 text-sm leading-relaxed text-slate-700">{note}</p>
          </li>
        ))}
      </ol>
    </CoursePageSection>
  );
}

export function FaqSection({ faqs }: { faqs: NonNullable<CourseDetailContentData['faqs']> }) {
  return (
    <CoursePageSection id="faq" title="Frequently asked questions">
      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {faqs.map((faq, index) => (
          // Native <details>: keyboard accessible, and the answer is in the HTML for search engines.
          <details key={index} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy-900 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <Icon name="chevronDown" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{faq.answer}</p>
          </details>
        ))}
      </div>
    </CoursePageSection>
  );
}

export function ContactSection() {
  const phones = [SITE_CONTACT.mainPhone, ...SITE_CONTACT.additionalPhones];
  return (
    <CoursePageSection id="contact" title="Questions? Contact us">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Icon name="phone" className="h-5 w-5 text-gold-600" aria-hidden />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Call</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {phones.map((phone) => (
              <li key={phone}>
                <a href={phoneHref(phone)} className="text-sm font-semibold text-navy-900 hover:underline">
                  {phone}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Icon name="mail" className="h-5 w-5 text-gold-600" aria-hidden />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
          <a href={`mailto:${SITE_CONTACT.email}`} className="mt-1 block break-all text-sm font-semibold text-navy-900 hover:underline">
            {SITE_CONTACT.email}
          </a>
          <p className="mt-2 text-xs text-slate-500">{SITE_CONTACT.officeHours}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Icon name="mapPin" className="h-5 w-5 text-gold-600" aria-hidden />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Visit</p>
          <p className="mt-1 text-sm text-slate-700">{SITE_CONTACT.address}</p>
        </div>
      </div>
    </CoursePageSection>
  );
}

export function RelatedCoursesSection({
  linkedCourses,
  otherTraining,
  basePath,
}: {
  linkedCourses: Course[];
  otherTraining: { title: string; description: string }[];
  basePath: string;
}) {
  return (
    <CoursePageSection id="related" title="Continue your training">
      {linkedCourses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {linkedCourses.map((course) => (
            <Link key={course.id} href={`${basePath}/${course.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-800 rounded-xl">
              <CourseCard course={course} />
            </Link>
          ))}
        </div>
      )}
      {otherTraining.length > 0 && (
        <div className={linkedCourses.length > 0 ? 'mt-8' : ''}>
          {linkedCourses.length > 0 && <SubHeading>More training from USSA</SubHeading>}
          <ul className={`grid gap-3 sm:grid-cols-2 ${linkedCourses.length > 0 ? 'mt-3' : ''}`}>
            {otherTraining.map((training, index) => (
              <li key={`${training.title}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-navy-900">{training.title}</p>
                {training.description && <p className="mt-1 text-xs leading-relaxed text-slate-600">{training.description}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Ask us about any of these programs at{' '}
            <a href={phoneHref(SITE_CONTACT.mainPhone)} className="font-semibold text-navy-800 hover:underline">
              {SITE_CONTACT.mainPhone}
            </a>
            .
          </p>
        </div>
      )}
    </CoursePageSection>
  );
}
