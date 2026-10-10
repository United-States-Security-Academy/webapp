import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { lessons } from '@/db/schema';

export async function getLessonById(lessonId: string) {
  const [lessonRecord] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  return lessonRecord ?? null;
}

