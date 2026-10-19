import { describe, expect, it } from 'vitest';
import { courseDetailContentSchema, normalizeCourseDetailContent } from '@/features/courses/course-page/course-detail-content-schema';
import { buildExamFacts, isAutomaticFact, withoutAutomaticFacts, type CourseExamSummary } from '@/features/courses/course-page/course-page-facts';

const EXAM: CourseExamSummary = { passingScorePercentage: 75, timeLimitMinutes: 30, maxAttempts: 3, questionCount: 32 };

describe('automatic course facts', () => {
  it('hides typed-in rows that repeat the price, whatever the case', () => {
    expect(isAutomaticFact('Tuition', null)).toBe(true);
    expect(isAutomaticFact(' tuition ', null)).toBe(true);
    expect(isAutomaticFact('Price', null)).toBe(true);
    expect(isAutomaticFact('Tuition includes', null)).toBe(false);
  });

  it('hides typed-in exam rules only when the course has an exam to show instead', () => {
    for (const label of ['Passing Score', 'Exam Attempts', 'Examination Attempts', 'Maximum Attempts', 'Time limit']) {
      expect(isAutomaticFact(label, EXAM)).toBe(true);
      expect(isAutomaticFact(label, null)).toBe(false);
    }
  });

  it('keeps everything else, including "Final Examination: Required"', () => {
    const live = [
      { label: 'Course Access', value: '24/7 Online Access' },
      { label: 'Tuition', value: '$85.99' },
      { label: 'Final Examination', value: 'Required' },
      { label: 'Passing Score', value: '75% or Higher' },
      { label: 'Examination Attempts', value: 'Maximum of 3 Attempts' },
      { label: 'Regulatory Authority', value: 'Texas DPS' },
    ];
    expect(withoutAutomaticFacts(live, EXAM).map((fact) => fact.label)).toEqual(['Course Access', 'Final Examination', 'Regulatory Authority']);
    expect(withoutAutomaticFacts(undefined, EXAM)).toEqual([]);
  });

  it('describes the exam from its settings', () => {
    expect(buildExamFacts(EXAM)).toEqual([
      { label: 'Passing score', value: '75% or higher' },
      { label: 'Questions', value: '32 multiple-choice' },
      { label: 'Time limit', value: '30 minutes' },
      { label: 'Attempts', value: 'Up to 3 attempts' },
    ]);
    expect(buildExamFacts({ ...EXAM, timeLimitMinutes: null, maxAttempts: null }).slice(2)).toEqual([
      { label: 'Time limit', value: 'No time limit' },
      { label: 'Attempts', value: 'Unlimited' },
    ]);
  });
});

describe('course page content validation', () => {
  it('trims text and drops blank lines, rows and whole empty sections', () => {
    const parsed = courseDetailContentSchema.parse({
      courseCode: '  USSA-1  ',
      tagline: '',
      overview: ['First paragraph.  ', '', '   '],
      objectives: [],
      quickFacts: [
        { label: 'Course length', value: '6 hours' },
        { label: '', value: 'orphan value' },
      ],
      deliveryOptions: [
        { title: 'Online', points: ['Self-paced', ''] },
        { title: '', points: [''] },
      ],
      faqs: [{ question: 'How long?', answer: '' }],
      relatedCourseSlugs: ['level-iii', 'level-iii', ''],
    });
    expect(normalizeCourseDetailContent(parsed)).toEqual({
      courseCode: 'USSA-1',
      overview: ['First paragraph.'],
      quickFacts: [{ label: 'Course length', value: '6 hours' }],
      deliveryOptions: [{ title: 'Online', points: ['Self-paced'] }],
      relatedCourseSlugs: ['level-iii'],
    });
  });

  it('drops fields the editor does not manage, like the retired per-course contact details', () => {
    const parsed = courseDetailContentSchema.parse({ contact: { phone: '123' }, tagline: 'Hello', somethingElse: true });
    expect(normalizeCourseDetailContent(parsed)).toEqual({ tagline: 'Hello' });
  });

  it('accepts the live Level II content shape', () => {
    const result = courseDetailContentSchema.safeParse({
      courseCode: 'USSA-TX-L2-101',
      keyInfo: [{ label: 'Tuition', value: '$85.99' }],
      deliveryOptions: [{ title: 'Option 1 — 100% Online', points: ['Study from any device'] }],
      relatedCourses: [{ title: 'Texas Level III', description: 'Advanced training.' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects text that is far too long, with a readable message', () => {
    const result = courseDetailContentSchema.safeParse({ tagline: 'x'.repeat(201) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Keep each line under 200 characters.');
  });
});
