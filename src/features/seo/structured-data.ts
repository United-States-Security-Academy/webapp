import { SITE_CONTACT } from '@/features/site/site-contact';
import { COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { Course } from '@/features/courses/course-types';
import { ACTIVE_SOCIAL_LINKS } from './social-links';
import { SITE_NAME, SITE_URL, absoluteUrl } from './site-seo';

// schema.org builders for <JsonLd>. Only facts the site already states — no ratings or reviews.

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

// "(832) 260-6092" -> "+1-832-260-6092"
function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function buildOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: 'USSA',
    url: SITE_URL,
    logo: absoluteUrl('/ussalogo.png'),
    telephone: toInternationalPhone(SITE_CONTACT.mainPhone),
    email: SITE_CONTACT.email,
    address: { '@type': 'PostalAddress', ...SITE_CONTACT.postalAddress },
    parentOrganization: { '@type': 'Organization', name: 'Deltacon Global Inc.' },
    ...(ACTIVE_SOCIAL_LINKS.length > 0 && { sameAs: ACTIVE_SOCIAL_LINKS.map((socialLink) => socialLink.href) }),
  };
}

export function buildFaqStructuredData(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export function buildBreadcrumbStructuredData(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

// Lessons are always delivered on the site; a course whose delivery options mention a classroom
// or in-person session is offered onsite too.
const ONSITE_PATTERN = /classroom|in[- ]person|on[- ]?site/i;

export function buildCourseStructuredData(course: Course, description: string) {
  const detail = course.detailContent ?? {};
  const deliveryText = (detail.deliveryOptions ?? []).flatMap((option) => [option.title, ...option.points]).join(' ');
  const courseModes = ONSITE_PATTERN.test(deliveryText) ? ['Online', 'Onsite'] : ['Online'];
  const url = absoluteUrl(`/courses/${course.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description,
    url,
    ...(detail.courseCode && { courseCode: detail.courseCode }),
    ...(course.thumbnailUrl && { image: course.thumbnailUrl }),
    about: COURSE_CATEGORY_META[course.category].programTitle,
    provider: { '@type': 'EducationalOrganization', '@id': ORGANIZATION_ID, name: SITE_NAME, sameAs: SITE_URL },
    offers: {
      '@type': 'Offer',
      category: course.priceAmountMinor === 0 ? 'Free' : 'Paid',
      price: (course.priceAmountMinor / 100).toFixed(2),
      priceCurrency: course.currency.toUpperCase(),
      url,
    },
    hasCourseInstance: courseModes.map((courseMode) => ({ '@type': 'CourseInstance', courseMode })),
  };
}
