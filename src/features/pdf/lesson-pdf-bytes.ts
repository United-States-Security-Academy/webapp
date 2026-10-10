// Downloads a lesson's PDF at most once per version, shared by the viewer and the read-aloud player.
//
// Every lesson page gets a fresh signed URL, so the browser's normal HTTP cache never matches and
// each visit used to re-download the whole PDF (and "Listen" downloaded it a second time). This
// keeps the bytes in the browser's Cache Storage, keyed by lesson + file version instead of URL:
// repeat visits load from the device, and a replaced PDF has a new version, so it's fetched fresh.

const CACHE_NAME = 'ussa-lesson-pdfs';
// Same-page requests (viewer + player) share one download.
const inFlightDownloads = new Map<string, Promise<ArrayBuffer>>();

function cacheRequestFor(lessonId: string, version: string): Request {
  return new Request(`/__lesson-pdf-cache/${encodeURIComponent(lessonId)}?v=${encodeURIComponent(version)}`);
}

async function openPdfCache(): Promise<Cache | null> {
  // Unavailable in some private-browsing modes and non-HTTPS origins; then we simply don't cache.
  try {
    return typeof caches === 'undefined' ? null : await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

async function downloadOrReadFromCache(fileUrl: string, lessonId: string, version: string): Promise<ArrayBuffer> {
  const cache = await openPdfCache();
  const cacheRequest = cacheRequestFor(lessonId, version);

  const cachedResponse = await cache?.match(cacheRequest).catch(() => undefined);
  if (cachedResponse) return cachedResponse.arrayBuffer();

  // A plain browser fetch rather than letting pdf.js fetch the URL itself — pdf.js's own range
  // requests against Supabase's signed-URL endpoint were unreliable and could drop page content.
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Failed to download the PDF (status ${response.status}).`);
  const bytes = await response.arrayBuffer();

  if (cache) {
    try {
      // Drop this lesson's older versions so replaced PDFs don't pile up on the device.
      const { origin, pathname } = new URL(cacheRequest.url);
      const lessonPrefix = `${origin}${pathname}?`;
      for (const key of await cache.keys()) {
        if (key.url.startsWith(lessonPrefix) && key.url !== cacheRequest.url) await cache.delete(key);
      }
      await cache.put(cacheRequest, new Response(bytes.slice(0), { headers: { 'Content-Type': 'application/pdf' } }));
    } catch {
      // Out of storage quota or similar — the PDF still works, it just isn't kept for next time.
    }
  }
  return bytes;
}

export async function loadLessonPdfBytes(fileUrl: string, lessonId: string, version: string): Promise<ArrayBuffer> {
  const downloadKey = `${lessonId}@${version}`;
  let download = inFlightDownloads.get(downloadKey);
  if (!download) {
    download = downloadOrReadFromCache(fileUrl, lessonId, version);
    inFlightDownloads.set(downloadKey, download);
    download.catch(() => inFlightDownloads.delete(downloadKey));
  }
  // pdf.js takes ownership of (detaches) the buffer it's given, so every caller gets its own copy.
  return (await download).slice(0);
}

// Called on sign-out, so the next person on a shared computer doesn't inherit downloaded lessons.
export async function clearLessonPdfCache(): Promise<void> {
  inFlightDownloads.clear();
  try {
    if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
  } catch {
    // Nothing to clear.
  }
}
