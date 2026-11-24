import type { IconName } from '@/components/ui/icon';
import type { CourseCategory } from './course-types';

export const COURSE_CATEGORIES: CourseCategory[] = ['military', 'lawEnforcement', 'corrections', 'security', 'safety'];

interface CourseCategoryMeta {
  label: string;
  // Full program name, e.g. "Military Training" — used as page/card titles.
  programTitle: string;
  // One-line summary shown on the homepage program cards.
  tagline: string;
  // Search-result title and description for the /programs page, phrased the way people search.
  seoTitle: string;
  seoDescription: string;
  icon: IconName;
  // Kebab-case segment used in /programs/[urlSlug] — distinct from the camelCase DB enum value.
  urlSlug: string;
  image: string;
  overview: string;
}

export const COURSE_CATEGORY_META: Record<CourseCategory, CourseCategoryMeta> = {
  military: {
    label: 'Military',
    programTitle: 'Military Training',
    tagline: 'Leadership, tactical skills, mission readiness, ethics, and professional development for military personnel.',
    seoTitle: 'Military Training Courses & Certification',
    seoDescription:
      'Online military training courses covering leadership, tactical decision-making, ethics and mission readiness for service members at every career stage.',
    icon: 'military',
    urlSlug: 'military',
    image: '/Picture3.png',
    overview:
      "USSA's Military Training programs build leadership, tactical proficiency, and mission readiness for service " +
      'members at every stage of their career. Courses cover military ethics and professional standards, tactical ' +
      'decision-making, leadership development, and operational readiness — designed by instructors with real ' +
      'operational experience to prepare personnel for the demands of modern military service.',
  },
  lawEnforcement: {
    label: 'Law Enforcement',
    programTitle: 'Law Enforcement Training',
    tagline: 'Use of force, investigations, patrol operations, de-escalation, active shooter response, and more.',
    seoTitle: 'Law Enforcement Training Courses Online',
    seoDescription:
      'Law enforcement officer training in use of force, de-escalation, investigations, patrol operations and active shooter response, built on real scenarios.',
    icon: 'lawEnforcement',
    urlSlug: 'law-enforcement',
    image: '/Picture4.png',
    overview:
      "USSA's Law Enforcement Training equips officers with the practical, legally sound skills the job demands — " +
      'from use-of-force fundamentals and de-escalation to investigations, patrol operations, and active shooter ' +
      'response. Every program is built around real-world scenarios so officers leave prepared to protect their ' +
      'communities and themselves.',
  },
  corrections: {
    label: 'Corrections',
    programTitle: 'Corrections Training',
    tagline: 'Inmate supervision, crisis intervention, report writing, legal updates, and operational safety.',
    seoTitle: 'Corrections Officer Training Courses',
    seoDescription:
      'Corrections officer training in inmate supervision, crisis intervention, report writing, legal updates and operational safety for institutional staff.',
    icon: 'corrections',
    urlSlug: 'corrections',
    image: '/Picture2.png',
    overview:
      "USSA's Corrections Training prepares officers and staff for the realities of institutional supervision — " +
      'inmate management, crisis intervention, legal updates, and operational safety. Programs emphasize sound ' +
      'judgment under pressure and thorough documentation, helping corrections professionals maintain safety and ' +
      'order while meeting evolving legal and regulatory standards.',
  },
  security: {
    label: 'Security',
    programTitle: 'Security Training',
    tagline: 'Security officer certification, site operations, access control, risk management, and more.',
    seoTitle: 'Security Officer Training & Certification Online',
    seoDescription:
      'Security officer training and certification covering site operations, access control, risk management and incident response for security professionals.',
    icon: 'security',
    urlSlug: 'security',
    image: '/Picture1.png',
    overview:
      "USSA's Security Training programs, including our Security Officer Certification, cover the core " +
      'competencies private and contract security professionals need: site operations, access control, risk ' +
      "management, and incident response. Whether you're entering the field or advancing your credentials, these " +
      'programs build the practical skills employers and licensing boards require.',
  },
  safety: {
    label: 'Safety',
    programTitle: 'Safety & Emergency Preparedness',
    tagline: 'Workplace safety, OSHA compliance, first aid/CPR, fire safety, and emergency response training.',
    seoTitle: 'Safety & Emergency Preparedness Training',
    seoDescription:
      'Workplace safety training covering OSHA compliance, first aid and CPR, fire safety and emergency response planning for safety officers and managers.',
    icon: 'safety',
    urlSlug: 'safety',
    image: '/Picture5.png',
    overview:
      "USSA's Safety & Emergency Preparedness programs cover workplace safety, OSHA compliance, first aid and CPR, " +
      'fire safety, and emergency response planning. Built for safety officers, facility managers, and first ' +
      'responders alike, these courses help organizations reduce risk and respond effectively when it matters most.',
  },
};

export function getCourseCategoryByUrlSlug(urlSlug: string): CourseCategory | null {
  const match = COURSE_CATEGORIES.find((category) => COURSE_CATEGORY_META[category].urlSlug === urlSlug);
  return match ?? null;
}
