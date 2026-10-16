import mammoth from 'mammoth';
import { htmlToModuleContent, type ModuleContentResult } from './html-to-module-content';
import { structuredModuleContentSchema } from './structured-content-schema';

export const LEGACY_DOC_MESSAGE =
  'Please open this file in Word, use File → Save As → Word Document (.docx), and upload again.';

// Old binary Word files (.doc) start with the OLE compound-file signature; .docx files are zip
// archives. Checked on the bytes, not just the file name, since a renamed .doc is still a .doc.
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export type WordFileCheck = { success: true } | { success: false; error: string };

export function checkWordFile(fileName: string, bytes: Uint8Array): WordFileCheck {
  if (/\.doc$/i.test(fileName) || startsWith(bytes, OLE_SIGNATURE)) return { success: false, error: LEGACY_DOC_MESSAGE };
  if (!/\.docx$/i.test(fileName) || !startsWith(bytes, ZIP_SIGNATURE)) {
    return { success: false, error: 'Upload a Word document (.docx).' };
  }
  return { success: true };
}

// Stores one embedded image and returns its storage path, which becomes the image block's
// storagePath. Injected so parsing stays testable without Supabase.
export type UploadImage = (bytes: Buffer, contentType: string, imageNumber: number) => Promise<string>;

// The module is usable only when `errors` is empty. Every error is written for the admin, naming
// the lesson and what to change in Word.
export type ParsedModule = ModuleContentResult;

function failed(error: string): ParsedModule {
  return { module: null, lessons: [], errors: [error], warnings: [] };
}

// Formats every browser shows, matching the lesson images bucket (migration 0015).
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function parseStructuredModule(fileName: string, fileBytes: Buffer, uploadImage: UploadImage): Promise<ParsedModule> {
  const fileCheck = checkWordFile(fileName, fileBytes);
  if (!fileCheck.success) return failed(fileCheck.error);

  let imageCount = 0;
  const imageErrors: string[] = [];
  let conversion;
  try {
    conversion = await mammoth.convertToHtml(
      { buffer: fileBytes },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          imageCount += 1;
          const imageNumber = imageCount;
          // Word often stores charts and clip art as EMF/WMF pictures, which browsers can't show.
          if (!SUPPORTED_IMAGE_TYPES.includes(image.contentType)) {
            const format = image.contentType.replace(/^image\/(x-)?/, '').toUpperCase();
            imageErrors.push(
              `Picture ${imageNumber} in the file is in ${format} format, which can't be shown on the website. ` +
                'In Word, right-click it, choose Save as Picture, save it as PNG, then delete it and insert the PNG instead.',
            );
            return { src: `unsupported-image-${imageNumber}` };
          }
          const bytes = await image.readAsBuffer();
          if (bytes.length > MAX_IMAGE_BYTES) {
            imageErrors.push(`Picture ${imageNumber} in the file is larger than 10 MB. Use a smaller version of the picture.`);
            return { src: `oversized-image-${imageNumber}` };
          }
          return { src: await uploadImage(bytes, image.contentType, imageNumber) };
        }),
      },
    );
  } catch {
    return failed('This file could not be read as a Word document. Open it in Word, save it again as .docx, and upload it again.');
  }

  const result = htmlToModuleContent(conversion.value);

  // mammoth reports Word styles it didn't recognise (for example a custom "Lesson Title" style
  // instead of Heading 2) — content in those styles came through as plain text.
  const styleWarnings = conversion.messages
    .filter((message) => message.type === 'warning' && message.message.startsWith('Unrecognised'))
    .map((message) => `${message.message}. Text in this style was treated as a normal paragraph.`);
  const warnings = [...styleWarnings, ...result.warnings];

  if (imageErrors.length > 0) result.errors.push(...imageErrors);
  if (result.errors.length > 0 || !result.module) return { ...result, warnings };

  // A last check on the exact shape that gets saved and later rendered.
  const validation = structuredModuleContentSchema.safeParse({ title: result.module.title, lessons: result.lessons });
  if (!validation.success) {
    const issue = validation.error.issues[0];
    const lessonIndex = issue?.path[0] === 'lessons' && typeof issue.path[1] === 'number' ? issue.path[1] : null;
    const lesson = lessonIndex !== null ? result.lessons[lessonIndex] : undefined;
    const where = lesson ? `Lesson '${lesson.title}'` : 'This file';
    return { ...result, errors: [`${where} has content that couldn't be converted. Check it for empty lists, tables or quiz answers.`], warnings };
  }

  return { module: { title: validation.data.title }, lessons: validation.data.lessons, errors: [], warnings };
}
