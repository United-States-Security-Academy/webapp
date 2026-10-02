import { Icon } from '@/components/ui/icon';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import type { CourseDetailContentData } from '@/features/courses/course-types';

function ChecklistCopy({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
          <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CourseDetailOverview({
  detailContent,
  priceLabel,
}: {
  detailContent: CourseDetailContentData;
  priceLabel: string;
}) {
  const {
    courseCode,
    tagline,
    quickFacts,
    overview,
    importantNotice,
    keyInfo,
    deliveryOptions,
    prerequisites,
    objectives,
    curriculumTopics,
    examInfo,
    completionRequirements,
    outcomes,
    whoShouldTakeThis,
    licensingNotice,
    relatedCourses,
    tuitionIncludes,
    paymentNotes,
    contact,
    afterEnrollmentNotes,
  } = detailContent;

  return (
    <div className="flex flex-col gap-8">
      {(courseCode || tagline || (quickFacts && quickFacts.length > 0)) && (
        <div className="overflow-hidden rounded-lg bg-navy-950 text-white">
          <div className="p-6 sm:p-8">
            {courseCode && <p className="text-xs font-bold tracking-[0.2em] text-gold-400">{courseCode}</p>}
            {tagline && <h2 className="mt-2 text-xl font-extrabold leading-snug sm:text-2xl">{tagline}</h2>}
          </div>
          {quickFacts && quickFacts.length > 0 && (
            <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="bg-navy-900 px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gold-400">{fact.label}</p>
                  <p className="mt-1 text-sm font-semibold">{fact.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {overview && overview.length > 0 && (
        <div className="flex flex-col gap-3">
          {overview.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {importantNotice && (
        <div className="flex gap-3 rounded-md border border-gold-300 bg-gold-50 p-4">
          <Icon name="target" className="h-5 w-5 shrink-0 text-gold-600" />
          <p className="text-sm leading-relaxed text-navy-900">{importantNotice}</p>
        </div>
      )}

      <Accordion>
        {keyInfo && keyInfo.length > 0 && (
          <AccordionItem title="Course at a Glance" icon="document" defaultOpen>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {keyInfo.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm last:border-b-0"
                >
                  <dt className="font-semibold text-slate-500">{item.label}</dt>
                  <dd className="text-right text-slate-800">{item.value}</dd>
                </div>
              ))}
            </dl>
          </AccordionItem>
        )}

        {deliveryOptions && deliveryOptions.length > 0 && (
          <AccordionItem title="How You'll Train" icon="monitor">
            <div className="flex flex-col gap-4">
              {deliveryOptions.map((option) => (
                <div key={option.title}>
                  <p className="text-sm font-bold text-navy-900">{option.title}</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {option.points.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                        <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionItem>
        )}

        {prerequisites && prerequisites.length > 0 && (
          <AccordionItem title="Before You Enroll" icon="checkCircle">
            <ChecklistCopy items={prerequisites} />
          </AccordionItem>
        )}

        {objectives && objectives.length > 0 && (
          <AccordionItem title="Course Objectives" icon="target">
            <ol className="flex flex-col gap-2.5">
              {objectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-gold-400">
                    {index + 1}
                  </span>
                  {objective}
                </li>
              ))}
            </ol>
          </AccordionItem>
        )}

        {curriculumTopics && curriculumTopics.length > 0 && (
          <AccordionItem title="What You'll Learn" icon="bookOpen">
            <div className="grid gap-4 sm:grid-cols-2">
              {curriculumTopics.map((topic) => (
                <div key={topic.title} className="rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-bold text-navy-900">{topic.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{topic.description}</p>
                </div>
              ))}
            </div>
          </AccordionItem>
        )}

        {examInfo && examInfo.length > 0 && (
          <AccordionItem title="Final Examination" icon="award">
            <dl className="flex flex-col gap-2">
              {examInfo.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 text-sm">
                  <dt className="font-semibold text-slate-500">{item.label}</dt>
                  <dd className="text-slate-800">{item.value}</dd>
                </div>
              ))}
            </dl>
          </AccordionItem>
        )}

        {completionRequirements && completionRequirements.length > 0 && (
          <AccordionItem title="Completion Requirements" icon="checkCircle">
            <ChecklistCopy items={completionRequirements} />
          </AccordionItem>
        )}

        {outcomes && outcomes.length > 0 && (
          <AccordionItem title="Upon Successful Completion" icon="award">
            <div className="flex flex-wrap gap-2">
              {outcomes.map((outcome) => (
                <span key={outcome} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-navy-800">
                  {outcome}
                </span>
              ))}
            </div>
          </AccordionItem>
        )}

        {whoShouldTakeThis && whoShouldTakeThis.length > 0 && (
          <AccordionItem title="Who Should Take This Course?" icon="users">
            <ChecklistCopy items={whoShouldTakeThis} />
          </AccordionItem>
        )}

        {tuitionIncludes && tuitionIncludes.length > 0 && (
          <AccordionItem title={`Tuition & What's Included — ${priceLabel}`} icon="chart">
            <ChecklistCopy items={tuitionIncludes} />
            {paymentNotes && paymentNotes.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                {paymentNotes.map((note, index) => (
                  <p key={index} className="text-xs text-slate-500">
                    {note}
                  </p>
                ))}
              </div>
            )}
          </AccordionItem>
        )}

        {afterEnrollmentNotes && afterEnrollmentNotes.length > 0 && (
          <AccordionItem title="After You Enroll" icon="mail">
            <div className="flex flex-col gap-2">
              {afterEnrollmentNotes.map((note, index) => (
                <p key={index} className="text-sm leading-relaxed text-slate-600">
                  {note}
                </p>
              ))}
            </div>
          </AccordionItem>
        )}

        {contact && (contact.address || contact.phone || contact.email) && (
          <AccordionItem title="Questions? Contact Us" icon="phone">
            <div className="flex flex-col gap-1.5 text-sm text-slate-600">
              {contact.address && (
                <p className="flex items-start gap-2">
                  <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {contact.address}
                </p>
              )}
              {contact.phone && (
                <p className="flex items-center gap-2">
                  <Icon name="phone" className="h-4 w-4 shrink-0 text-slate-400" />
                  {contact.phone}
                  {contact.altPhone ? ` / ${contact.altPhone}` : ''}
                </p>
              )}
              {contact.email && (
                <p className="flex items-center gap-2">
                  <Icon name="mail" className="h-4 w-4 shrink-0 text-slate-400" />
                  {contact.email}
                </p>
              )}
            </div>
          </AccordionItem>
        )}
      </Accordion>

      {relatedCourses && relatedCourses.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Continue Your Training</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {relatedCourses.map((related) => (
              <div key={related.title} className="rounded-md border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-navy-900">{related.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{related.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {licensingNotice && (
        <div className="flex gap-3 rounded-md border border-navy-900/20 bg-slate-50 p-4">
          <Icon name="shieldCheck" className="h-5 w-5 shrink-0 text-navy-800" />
          <p className="text-xs leading-relaxed text-slate-600">{licensingNotice}</p>
        </div>
      )}
    </div>
  );
}
