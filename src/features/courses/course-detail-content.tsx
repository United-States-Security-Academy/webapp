import { notFound } from 'next/navigation';
import { getAuthenticatedUserFromSession } from '@/features/auth/get-authenticated-user';
import { getCourseBySlug, listPublishedCoursesBySlugs } from '@/features/courses/course-queries';
import { getCourseContentTree, listLessonsInOrder } from '@/features/courses/course-content-queries';
import { isUserEnrolledInCourse } from '@/features/enrollments/enrollment-queries';
import { computeCourseProgress, getCompletedLessonTimes } from '@/features/progress/course-progress-queries';
import { getCourseExamSummary, getRequiredAssessmentStatuses } from '@/features/assessments/assessment-queries';
import { formatCoursePrice } from '@/features/courses/format-course-price';
import { getStructuredCourseOutlines } from '@/features/structured-courses/structured-course-outline-queries';
import {
  buildStructuredLessonHref,
  computeStructuredCourseProgress,
  findContinueLesson,
} from '@/features/structured-courses/structured-course-progress';
import { StructuredCourseOutline } from '@/features/structured-courses/structured-course-outline';
import { CourseHero } from './course-page/course-hero';
import { CourseSectionNav, type CourseSectionLink } from './course-page/course-section-nav';
import { CourseEnrollAction, CourseEnrollCard, CourseMobileEnrollBar, type CourseEnrollState } from './course-page/course-enroll-card';
import { PdfCourseCurriculum } from './course-page/course-curriculum';
import { buildExamFacts, withoutAutomaticFacts } from './course-page/course-page-facts';
import {
  AfterEnrollmentSection,
  ContactSection,
  CoursePageSection,
  ExamSection,
  FaqSection,
  LearningSection,
  OverviewSection,
  RelatedCoursesSection,
  RequirementsSection,
  TrainingOptionsSection,
  TuitionSection,
} from './course-page/course-page-sections';

interface CourseDetailContentProps {
  courseSlug: string;
  // '/courses' for the public marketing catalog, '/dashboard/courses' for the signed-in app shell.
  basePath: string;
}

// A course's full page — header, section links, description sections, course content and the
// enroll card — shared by the public catalog and the student dashboard. The description comes
// from the course page editor (courses.detail_content); price and exam rules come from the
// course and assessment settings so they're always what the app actually charges and enforces.
export async function CourseDetailContent({ courseSlug, basePath }: CourseDetailContentProps) {
  const authenticatedUser = await getAuthenticatedUserFromSession();
  const courseRecord = await getCourseBySlug(courseSlug);
  if (!courseRecord) notFound();

  const isOwnerOrAdmin =
    !!authenticatedUser && (authenticatedUser.role === 'admin' || authenticatedUser.userId === courseRecord.ownerId);
  if (courseRecord.status !== 'published' && !isOwnerOrAdmin) notFound();

  const detail = courseRecord.detailContent ?? {};
  // Structured courses show their published Word-upload modules instead of the PDF lessons.
  const isStructured = courseRecord.deliveryFormat === 'structured';

  // One parallel wave: course content, the exam rules, related courses, plus this learner's
  // enrollment, progress and exam status.
  const [modulesWithLessons, isEnrolled, completedAtByLessonId, assessmentStatuses, structuredOutlines, exam, linkedCourses] =
    await Promise.all([
      getCourseContentTree(courseRecord.id),
      authenticatedUser ? isUserEnrolledInCourse(authenticatedUser.userId, courseRecord.id) : false,
      authenticatedUser ? getCompletedLessonTimes(authenticatedUser.userId, [courseRecord.id]) : new Map<string, Date>(),
      authenticatedUser ? getRequiredAssessmentStatuses(authenticatedUser.userId, [courseRecord.id]) : null,
      isStructured ? getStructuredCourseOutlines([courseRecord.id], authenticatedUser?.userId ?? null) : null,
      getCourseExamSummary(courseRecord.id),
      listPublishedCoursesBySlugs((detail.relatedCourseSlugs ?? []).filter((slug) => slug !== courseRecord.slug)),
    ]);

  const hasFullAccess = isOwnerOrAdmin || isEnrolled;
  const structuredOutline = structuredOutlines ? (structuredOutlines.get(courseRecord.id) ?? []) : null;
  const orderedPdfLessons = listLessonsInOrder(modulesWithLessons);
  const progress = !authenticatedUser
    ? { totalLessons: 0, completedLessons: 0, completedAt: null }
    : structuredOutline
      ? computeStructuredCourseProgress(structuredOutline)
      : computeCourseProgress(
          orderedPdfLessons.map((lesson) => lesson.id),
          completedAtByLessonId,
        );
  const completedLessonIds = new Set(completedAtByLessonId.keys());

  const isCourseComplete = hasFullAccess && progress.completedAt !== null;
  const assessmentStatus = assessmentStatuses?.get(courseRecord.id);
  const hasPassedAssessment = assessmentStatus?.hasPassed ?? true;
  const lessonHrefPrefix = `${basePath}/${courseRecord.slug}/lessons`;

  let continueHref: string | null = null;
  if (structuredOutline) {
    const continueLesson = findContinueLesson(structuredOutline);
    if (continueLesson) continueHref = buildStructuredLessonHref(basePath, courseRecord.slug, continueLesson);
  } else {
    const nextLesson = orderedPdfLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? orderedPdfLessons[0];
    if (nextLesson) continueHref = `${lessonHrefPrefix}/${nextLesson.slug}`;
  }

  const priceLabel = formatCoursePrice(courseRecord.priceAmountMinor, courseRecord.currency);
  const enrollState: CourseEnrollState = {
    isSignedIn: !!authenticatedUser,
    hasFullAccess,
    isFree: courseRecord.priceAmountMinor === 0,
    progress,
    continueHref,
    isCourseComplete,
    // The exam and certificate pages live in the student dashboard.
    certificateHref: isCourseComplete && hasPassedAssessment ? `/dashboard/certificates/${courseRecord.slug}` : null,
    examHref: isCourseComplete && !hasPassedAssessment ? `/dashboard/courses/${courseRecord.slug}/assessment` : null,
  };

  // Typed-in rows that repeat the price or exam rules are replaced by the real values.
  const highlights = withoutAutomaticFacts(detail.quickFacts, exam);
  const keyInfo = withoutAutomaticFacts(detail.keyInfo, exam);
  const examFacts = [...(exam ? buildExamFacts(exam) : []), ...withoutAutomaticFacts(detail.examInfo, exam)];

  const overview = detail.overview ?? [];
  const objectives = detail.objectives ?? [];
  const curriculumTopics = detail.curriculumTopics ?? [];
  const deliveryOptions = detail.deliveryOptions ?? [];
  const prerequisites = detail.prerequisites ?? [];
  const audience = detail.whoShouldTakeThis ?? [];
  const completionRequirements = detail.completionRequirements ?? [];
  const outcomes = detail.outcomes ?? [];
  const tuitionIncludes = detail.tuitionIncludes ?? [];
  const paymentNotes = detail.paymentNotes ?? [];
  const afterEnrollmentNotes = detail.afterEnrollmentNotes ?? [];
  const faqs = detail.faqs ?? [];
  const otherTraining = detail.relatedCourses ?? [];

  const lessonCount = structuredOutline
    ? structuredOutline.reduce((total, outlineModule) => total + outlineModule.lessons.length, 0)
    : orderedPdfLessons.length;
  const moduleCount = structuredOutline ? structuredOutline.length : modulesWithLessons.length;

  const curriculumSection = (
    <CoursePageSection key="curriculum" id="curriculum" title="Course content">
      {/* The size of the course is only revealed once the learner has paid (or enrolled). */}
      {hasFullAccess && lessonCount > 0 && (
        <p className="-mt-2 mb-4 text-sm text-slate-500">
          {moduleCount} module{moduleCount === 1 ? '' : 's'} &middot; {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
        </p>
      )}
      {structuredOutline ? (
        <StructuredCourseOutline outline={structuredOutline} courseSlug={courseRecord.slug} basePath={basePath} hasFullAccess={hasFullAccess} />
      ) : (
        <PdfCourseCurriculum
          modulesWithLessons={modulesWithLessons}
          completedLessonIds={completedLessonIds}
          hasFullAccess={hasFullAccess}
          lessonHrefPrefix={lessonHrefPrefix}
        />
      )}
    </CoursePageSection>
  );

  // Learners who are enrolled come here to study, so the lessons come first for them.
  const sections: { link: CourseSectionLink | null; node: React.ReactNode }[] = [
    ...(hasFullAccess ? [{ link: { id: 'curriculum', label: 'Course content' }, node: curriculumSection }] : []),
    ...(overview.length > 0 || keyInfo.length > 0 || detail.importantNotice
      ? [
          {
            link: { id: 'overview', label: 'Overview' },
            node: <OverviewSection key="overview" overview={overview} keyInfo={keyInfo} importantNotice={detail.importantNotice} />,
          },
        ]
      : []),
    ...(objectives.length > 0 || curriculumTopics.length > 0
      ? [{ link: { id: 'learn', label: "What you'll learn" }, node: <LearningSection key="learn" objectives={objectives} curriculumTopics={curriculumTopics} /> }]
      : []),
    ...(!hasFullAccess ? [{ link: { id: 'curriculum', label: 'Course content' }, node: curriculumSection }] : []),
    ...(deliveryOptions.length > 0
      ? [{ link: { id: 'training', label: "How you'll train" }, node: <TrainingOptionsSection key="training" deliveryOptions={deliveryOptions} /> }]
      : []),
    ...(prerequisites.length > 0 || audience.length > 0
      ? [{ link: { id: 'requirements', label: 'Requirements' }, node: <RequirementsSection key="requirements" prerequisites={prerequisites} audience={audience} /> }]
      : []),
    ...(examFacts.length > 0 || completionRequirements.length > 0 || outcomes.length > 0 || detail.licensingNotice
      ? [
          {
            link: { id: 'exam', label: 'Exam & certificate' },
            node: (
              <ExamSection
                key="exam"
                examFacts={examFacts}
                completionRequirements={completionRequirements}
                outcomes={outcomes}
                licensingNotice={detail.licensingNotice}
              />
            ),
          },
        ]
      : []),
    ...(!hasFullAccess
      ? [
          {
            link: { id: 'tuition', label: 'Tuition' },
            node: (
              <TuitionSection
                key="tuition"
                priceLabel={priceLabel}
                tuitionIncludes={tuitionIncludes}
                paymentNotes={paymentNotes}
                action={<CourseEnrollAction state={enrollState} courseSlug={courseRecord.slug} priceLabel={priceLabel} />}
              />
            ),
          },
        ]
      : []),
    ...(afterEnrollmentNotes.length > 0 ? [{ link: null, node: <AfterEnrollmentSection key="after-enrolling" notes={afterEnrollmentNotes} /> }] : []),
    ...(faqs.length > 0 ? [{ link: { id: 'faq', label: 'FAQ' }, node: <FaqSection key="faq" faqs={faqs} /> }] : []),
    { link: { id: 'contact', label: 'Contact' }, node: <ContactSection key="contact" /> },
    ...(linkedCourses.length > 0 || otherTraining.length > 0
      ? [
          {
            link: null,
            node: <RelatedCoursesSection key="related" linkedCourses={linkedCourses} otherTraining={otherTraining} basePath={basePath} />,
          },
        ]
      : []),
  ];

  const backLink = basePath === '/courses' ? { href: '/courses', label: 'All courses' } : { href: '/dashboard/courses', label: 'Browse courses' };

  return (
    <div className={hasFullAccess ? '' : 'pb-24 lg:pb-0'}>
      <CourseHero course={courseRecord} courseCode={detail.courseCode} tagline={detail.tagline} highlights={highlights} backLink={backLink} />

      <div className="mx-auto max-w-6xl px-4 pb-16 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        {/* Phones: the enroll card comes straight after the header. Large screens: a pinned
            column on the right that overlaps the bottom of the header. */}
        <aside className="relative z-10 -mt-6 lg:order-2 lg:-mt-60">
          <div className="lg:sticky lg:top-6">
            <CourseEnrollCard state={enrollState} courseSlug={courseRecord.slug} priceLabel={priceLabel} includes={tuitionIncludes} />
          </div>
        </aside>

        <div className="min-w-0 pt-6 lg:order-1 lg:pt-4">
          <CourseSectionNav sections={sections.flatMap((section) => (section.link ? [section.link] : []))} />
          {sections.map((section) => section.node)}
        </div>
      </div>

      {!hasFullAccess && <CourseMobileEnrollBar priceLabel={priceLabel} />}
    </div>
  );
}
