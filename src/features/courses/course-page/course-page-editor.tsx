'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { CourseDetailContentData } from '@/features/courses/course-types';
import { updateCourseDetailContent } from './course-page-actions';
import { buildExamFacts, isAutomaticFact, type CourseExamSummary } from './course-page-facts';
import { FieldLabel, ObjectListEditor, TextField, TextListEditor } from './course-page-list-editors';

type LabelValue = { label: string; value: string };
type TitleDescription = { title: string; description: string };

// Every field present (blank when unused), so the form can bind to it directly. Blank lines and
// sections are dropped again when saving.
interface EditorState {
  courseCode: string;
  tagline: string;
  quickFacts: LabelValue[];
  overview: string[];
  importantNotice: string;
  keyInfo: LabelValue[];
  objectives: string[];
  curriculumTopics: TitleDescription[];
  deliveryOptions: { title: string; points: string[] }[];
  prerequisites: string[];
  whoShouldTakeThis: string[];
  examInfo: LabelValue[];
  completionRequirements: string[];
  outcomes: string[];
  licensingNotice: string;
  tuitionIncludes: string[];
  paymentNotes: string[];
  afterEnrollmentNotes: string[];
  faqs: { question: string; answer: string }[];
  relatedCourseSlugs: string[];
  relatedCourses: TitleDescription[];
}

function toEditorState(detail: CourseDetailContentData | null): EditorState {
  return {
    courseCode: detail?.courseCode ?? '',
    tagline: detail?.tagline ?? '',
    quickFacts: detail?.quickFacts ?? [],
    overview: detail?.overview ?? [],
    importantNotice: detail?.importantNotice ?? '',
    keyInfo: detail?.keyInfo ?? [],
    objectives: detail?.objectives ?? [],
    curriculumTopics: detail?.curriculumTopics ?? [],
    deliveryOptions: detail?.deliveryOptions ?? [],
    prerequisites: detail?.prerequisites ?? [],
    whoShouldTakeThis: detail?.whoShouldTakeThis ?? [],
    examInfo: detail?.examInfo ?? [],
    completionRequirements: detail?.completionRequirements ?? [],
    outcomes: detail?.outcomes ?? [],
    licensingNotice: detail?.licensingNotice ?? '',
    tuitionIncludes: detail?.tuitionIncludes ?? [],
    paymentNotes: detail?.paymentNotes ?? [],
    afterEnrollmentNotes: detail?.afterEnrollmentNotes ?? [],
    faqs: detail?.faqs ?? [],
    relatedCourseSlugs: detail?.relatedCourseSlugs ?? [],
    relatedCourses: detail?.relatedCourses ?? [],
  };
}

function EditorSection({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id={`${id}-heading`} className="text-lg font-bold text-navy-900">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-5 flex flex-col gap-6">{children}</div>
    </section>
  );
}

function AutomaticNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
      <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

const EDITOR_SECTIONS = [
  { id: 'editor-header', label: 'Header' },
  { id: 'editor-overview', label: 'Overview' },
  { id: 'editor-learn', label: "What you'll learn" },
  { id: 'editor-training', label: "How you'll train" },
  { id: 'editor-requirements', label: 'Requirements' },
  { id: 'editor-exam', label: 'Exam & certificate' },
  { id: 'editor-tuition', label: 'Tuition' },
  { id: 'editor-after', label: 'After you enroll' },
  { id: 'editor-faq', label: 'FAQ' },
  { id: 'editor-related', label: 'Related training' },
];

export interface RelatedCourseOption {
  slug: string;
  title: string;
  isPublished: boolean;
}

export function CoursePageEditor({
  courseId,
  courseSlug,
  initialContent,
  priceLabel,
  exam,
  courseOptions,
}: {
  courseId: string;
  courseSlug: string;
  initialContent: CourseDetailContentData | null;
  priceLabel: string;
  exam: CourseExamSummary | null;
  courseOptions: RelatedCourseOption[];
}) {
  const router = useRouter();
  const [state, setState] = useState(() => toEditorState(initialContent));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(toEditorState(initialContent)));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const isDirty = useMemo(() => JSON.stringify(state) !== savedSnapshot, [state, savedSnapshot]);

  // Warn before leaving the page (closing the tab, reloading) with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(unloadEvent: BeforeUnloadEvent) {
      unloadEvent.preventDefault();
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function update<Key extends keyof EditorState>(key: Key, value: EditorState[Key]) {
    setState((previous) => ({ ...previous, [key]: value }));
    setSavedAt(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    const result = await updateCourseDetailContent(courseId, state);
    setIsSaving(false);
    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }
    const savedState = toEditorState(result.data);
    setState(savedState);
    setSavedSnapshot(JSON.stringify(savedState));
    setSavedAt(new Date());
    router.refresh();
  }

  function handleDiscard() {
    if (!window.confirm('Discard all changes since your last save?')) return;
    setState(JSON.parse(savedSnapshot) as EditorState);
    setErrorMessage(null);
  }

  const automaticFactNote = (item: LabelValue) =>
    isAutomaticFact(item.label, exam) ? (
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 sm:col-span-2">
        <Icon name="eyeOff" className="h-3.5 w-3.5" aria-hidden />
        Hidden on the page: this is shown automatically from the course or exam settings. You can remove this row.
      </p>
    ) : null;

  const publishedOptions = courseOptions.filter((option) => option.isPublished && option.slug !== courseSlug);
  const unselectedOptions = publishedOptions.filter((option) => !state.relatedCourseSlugs.includes(option.slug));

  return (
    <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label="Editor sections" className="hidden lg:block">
        <ul className="sticky top-20 flex flex-col gap-0.5 text-sm">
          {EDITOR_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="block rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-white hover:text-navy-900">
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-6 pb-28">
        <EditorSection id="editor-header" title="Header" description="The top of the page, beside the course title and summary.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Course code" htmlFor="course-code" help="Shown under the highlights, e.g. USSA-TX-L2-101." />
              <TextField id="course-code" value={state.courseCode} onChange={(value) => update('courseCode', value)} maxLength={60} />
            </div>
            <div>
              <FieldLabel label="Tagline" htmlFor="tagline" help="A short line above the title, e.g. Start your security career in Texas." />
              <TextField id="tagline" value={state.tagline} onChange={(value) => update('tagline', value)} maxLength={200} />
            </div>
          </div>
          <ObjectListEditor
            label="Highlights"
            help="Key facts shown in the header, e.g. Course length: 6 hours. Three to six work best."
            items={state.quickFacts}
            onChange={(items) => update('quickFacts', items)}
            itemName="highlight"
            layout="row"
            fields={[
              { key: 'label', label: 'Label', placeholder: 'Course length', maxLength: 200 },
              { key: 'value', label: 'Value', placeholder: '6 hours', maxLength: 2000 },
            ]}
            renderItemNote={automaticFactNote}
          />
          <AutomaticNote>
            The title, summary and price come from the course details (<strong>{priceLabel}</strong>). Change them with{' '}
            <Link href={`/instructor/courses/${courseSlug}`} className="font-semibold text-navy-800 hover:underline">
              Edit details
            </Link>{' '}
            on the course screen.
          </AutomaticNote>
        </EditorSection>

        <EditorSection id="editor-overview" title="Overview" description="What the course is and why it matters.">
          <TextListEditor
            label="Description"
            help="One box per paragraph."
            items={state.overview}
            onChange={(items) => update('overview', items)}
            itemName="paragraph"
            multiline
            maxLength={2000}
          />
          <div>
            <FieldLabel
              label="Important notice"
              htmlFor="important-notice"
              help="Optional. Shown in a highlighted box, e.g. that completing the course is not itself a license."
            />
            <TextField
              id="important-notice"
              value={state.importantNotice}
              onChange={(value) => update('importantNotice', value)}
              multiline
              rows={3}
              maxLength={4000}
            />
          </div>
          <ObjectListEditor
            label="At a glance"
            help="A table of course details, e.g. Course access: 24/7 online, Regulatory authority: Texas DPS."
            items={state.keyInfo}
            onChange={(items) => update('keyInfo', items)}
            itemName="row"
            layout="row"
            fields={[
              { key: 'label', label: 'Label', maxLength: 200 },
              { key: 'value', label: 'Value', maxLength: 2000 },
            ]}
            renderItemNote={automaticFactNote}
          />
        </EditorSection>

        <EditorSection id="editor-learn" title="What you'll learn">
          <TextListEditor
            label="Objectives"
            help="What students will be able to do after the course. Start each with a verb, e.g. Explain…, Identify…"
            items={state.objectives}
            onChange={(items) => update('objectives', items)}
            itemName="objective"
            multiline
            maxLength={2000}
          />
          <ObjectListEditor
            label="Topics covered"
            help="The main subjects, each with a one- or two-sentence description."
            items={state.curriculumTopics}
            onChange={(items) => update('curriculumTopics', items)}
            itemName="topic"
            fields={[
              { key: 'title', label: 'Topic', maxLength: 200 },
              { key: 'description', label: 'Description', multiline: true, maxLength: 2000 },
            ]}
          />
          <AutomaticNote>The module and lesson list is added automatically from the course content.</AutomaticNote>
        </EditorSection>

        <EditorSection id="editor-training" title="How you'll train" description="Ways to take the course, e.g. 100% online and in-person classroom.">
          {state.deliveryOptions.map((option, optionIndex) => (
            <div key={optionIndex} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <FieldLabel label={`Option ${optionIndex + 1} name`} htmlFor={`delivery-option-${optionIndex}`} />
                  <TextField
                    id={`delivery-option-${optionIndex}`}
                    value={option.title}
                    onChange={(value) =>
                      update(
                        'deliveryOptions',
                        state.deliveryOptions.map((existing, index) => (index === optionIndex ? { ...existing, title: value } : existing)),
                      )
                    }
                    placeholder="100% Online"
                    maxLength={200}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => update('deliveryOptions', state.deliveryOptions.filter((_, index) => index !== optionIndex))}
                >
                  Remove option
                </Button>
              </div>
              <div className="mt-4">
                <TextListEditor
                  label="What it involves"
                  items={option.points}
                  onChange={(points) =>
                    update(
                      'deliveryOptions',
                      state.deliveryOptions.map((existing, index) => (index === optionIndex ? { ...existing, points } : existing)),
                    )
                  }
                  itemName="point"
                  maxLength={2000}
                />
              </div>
            </div>
          ))}
          {state.deliveryOptions.length < 10 && (
            <div>
              <Button type="button" variant="outline" onClick={() => update('deliveryOptions', [...state.deliveryOptions, { title: '', points: [] }])}>
                Add a training option
              </Button>
            </div>
          )}
        </EditorSection>

        <EditorSection id="editor-requirements" title="Requirements & who it's for">
          <TextListEditor
            label="Before you enroll"
            help="Prerequisites and what students need, e.g. reliable internet access."
            items={state.prerequisites}
            onChange={(items) => update('prerequisites', items)}
            itemName="requirement"
            multiline
            maxLength={2000}
          />
          <TextListEditor
            label="Who this course is for"
            items={state.whoShouldTakeThis}
            onChange={(items) => update('whoShouldTakeThis', items)}
            itemName="audience"
            multiline
            maxLength={2000}
          />
        </EditorSection>

        <EditorSection id="editor-exam" title="Exam & certificate">
          <AutomaticNote>
            {exam ? (
              <>
                Shown automatically from the exam settings:{' '}
                <strong>{buildExamFacts(exam).map((fact) => `${fact.label} ${fact.value}`).join(' · ')}</strong>. Change them in{' '}
              </>
            ) : (
              <>This course has no exam with questions yet, so no exam rules are shown. Set one up in </>
            )}
            <Link href={`/instructor/courses/${courseSlug}/assessment`} className="font-semibold text-navy-800 hover:underline">
              Manage assessment
            </Link>
            .
          </AutomaticNote>
          <ObjectListEditor
            label="Extra exam details"
            help="Anything else about the exam, e.g. Format: Online, open book. Leave out the passing score, time limit and attempts."
            items={state.examInfo}
            onChange={(items) => update('examInfo', items)}
            itemName="exam detail"
            layout="row"
            fields={[
              { key: 'label', label: 'Label', maxLength: 200 },
              { key: 'value', label: 'Value', maxLength: 2000 },
            ]}
            renderItemNote={automaticFactNote}
          />
          <TextListEditor
            label="To complete the course"
            help="Everything a student must do to earn the certificate."
            items={state.completionRequirements}
            onChange={(items) => update('completionRequirements', items)}
            itemName="requirement"
            multiline
            maxLength={2000}
          />
          <TextListEditor
            label="Topics covered on completion"
            help="Short phrases shown as tags, e.g. Use-of-force fundamentals."
            items={state.outcomes}
            onChange={(items) => update('outcomes', items)}
            itemName="topic"
            maxLength={200}
          />
          <div>
            <FieldLabel label="Licensing note" htmlFor="licensing-notice" help="Optional. How the certificate relates to state licensing." />
            <TextField
              id="licensing-notice"
              value={state.licensingNotice}
              onChange={(value) => update('licensingNotice', value)}
              multiline
              rows={4}
              maxLength={4000}
            />
          </div>
        </EditorSection>

        <EditorSection id="editor-tuition" title="Tuition" description={`The price (${priceLabel}) comes from the course details.`}>
          <TextListEditor
            label="Tuition includes"
            help="The first six also appear on the enroll card."
            items={state.tuitionIncludes}
            onChange={(items) => update('tuitionIncludes', items)}
            itemName="item"
            maxLength={2000}
          />
          <TextListEditor
            label="Payment notes"
            help="Small print under the tuition, e.g. that government licensing fees are separate."
            items={state.paymentNotes}
            onChange={(items) => update('paymentNotes', items)}
            itemName="note"
            multiline
            maxLength={2000}
          />
        </EditorSection>

        <EditorSection id="editor-after" title="After you enroll" description="What happens next, shown as numbered steps.">
          <TextListEditor
            label="Steps"
            items={state.afterEnrollmentNotes}
            onChange={(items) => update('afterEnrollmentNotes', items)}
            itemName="step"
            multiline
            maxLength={2000}
          />
        </EditorSection>

        <EditorSection id="editor-faq" title="Frequently asked questions">
          <ObjectListEditor
            label="Questions"
            help="Common questions from students, e.g. how long they have to finish, or when the certificate arrives."
            items={state.faqs}
            onChange={(items) => update('faqs', items)}
            itemName="question"
            fields={[
              { key: 'question', label: 'Question', maxLength: 200 },
              { key: 'answer', label: 'Answer', multiline: true, maxLength: 4000 },
            ]}
          />
          <AutomaticNote>The contact details (phone numbers, email, address) are shown on every course page automatically.</AutomaticNote>
        </EditorSection>

        <EditorSection id="editor-related" title="Related training" description="Shown at the bottom of the page as “Continue your training”.">
          <div>
            <FieldLabel label="Linked courses" help="Courses on this site. They show with their picture and price, and link to their page." />
            {state.relatedCourseSlugs.length > 0 && (
              <ol className="mb-2 flex flex-col gap-2">
                {state.relatedCourseSlugs.map((slug, index) => {
                  const option = courseOptions.find((courseOption) => courseOption.slug === slug);
                  return (
                    <li key={slug} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="min-w-0 text-slate-800">
                        {option?.title ?? slug}
                        {!option?.isPublished && <span className="ml-2 text-xs font-semibold text-amber-800">Not published — hidden</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => update('relatedCourseSlugs', state.relatedCourseSlugs.filter((_, slugIndex) => slugIndex !== index))}
                        aria-label={`Remove ${option?.title ?? slug}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Icon name="close" className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
            {unselectedOptions.length > 0 ? (
              <select
                value=""
                onChange={(changeEvent) => {
                  if (changeEvent.target.value) update('relatedCourseSlugs', [...state.relatedCourseSlugs, changeEvent.target.value]);
                }}
                aria-label="Add a linked course"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-navy-800 focus:outline-none sm:w-auto"
              >
                <option value="">Add a course…</option>
                {unselectedOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.title}
                  </option>
                ))}
              </select>
            ) : (
              publishedOptions.length === 0 && <p className="text-xs text-slate-500">No other published courses yet.</p>
            )}
          </div>
          <ObjectListEditor
            label="Other training"
            help="Programs that aren't courses on this site yet. Listed as text; once one becomes a course, link it above and remove it here."
            items={state.relatedCourses}
            onChange={(items) => update('relatedCourses', items)}
            itemName="program"
            fields={[
              { key: 'title', label: 'Name', maxLength: 200 },
              { key: 'description', label: 'Description', multiline: true, maxLength: 2000 },
            ]}
          />
        </EditorSection>
      </div>

      {/* Save bar: pinned to the bottom of the screen so saving is always one click away. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="min-w-0 text-sm" role="status">
            {errorMessage ? (
              <span className="font-medium text-red-600">{errorMessage}</span>
            ) : isDirty ? (
              <span className="font-medium text-amber-800">You have unsaved changes</span>
            ) : savedAt ? (
              <span className="font-medium text-green-700">Saved. The course page is updated.</span>
            ) : (
              <span className="text-slate-500">All changes saved</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <a
              href={`/courses/${courseSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Icon name="eye" className="h-4 w-4" aria-hidden /> View page
            </a>
            {isDirty && (
              <Button type="button" variant="outline" onClick={handleDiscard} disabled={isSaving}>
                Discard
              </Button>
            )}
            <Button type="button" variant="gold" onClick={handleSave} isLoading={isSaving} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
