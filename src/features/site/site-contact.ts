// USSA's contact details in one place, so the header, footer, contact page, course pages and exam
// messages can't drift apart. Change a number or address here and it updates everywhere.
export const SITE_CONTACT = {
  mainPhone: '(832) 260-6092',
  // Additional lines shown on course pages for enrollment and course questions.
  additionalPhones: ['(832) 272-0511', '(817) 825-2872'],
  email: 'info@ussa-academy.com',
  address: '12808 W. Airport Blvd., Suite 224, Sugar Land, Texas 77478',
  officeHours: 'Monday - Friday, 8:00 AM - 5:00 PM CT',
} as const;

// "(832) 260-6092" -> "tel:+18322606092"
export function phoneHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '')}`;
}
