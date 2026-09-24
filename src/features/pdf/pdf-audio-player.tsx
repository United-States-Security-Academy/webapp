'use client';

import { useEffect, useRef, useState } from 'react';
import type * as PdfjsLib from 'pdfjs-dist';
import type { Worker as TesseractWorker } from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { saveLessonAudioTranscript } from './lesson-audio-transcript-actions';

type PlaybackState = 'idle' | 'extracting' | 'playing' | 'paused' | 'error';

const READING_RATE_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const OCR_RENDER_SCALE = 2; // higher resolution than on-screen display improves OCR accuracy
const OCR_WORKER_STARTUP_TIMEOUT_MS = 45_000;
const OCR_PAGE_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

async function extractPageTexts(fileUrl: string, onProgress: (message: string) => void): Promise<string[]> {
  // Same runtime-module trick as PdfViewer (lesson-pdf-viewer.tsx) — pdfjs-dist's own bundle
  // breaks under Next's webpack in dev mode, so it's loaded as a real browser ES module from
  // /public instead of through webpack. See that file's comment for the full explanation.
  // @ts-expect-error -- runtime-only path into /public, not a resolvable TS module specifier
  const pdfjsLib: typeof PdfjsLib = await import(/* webpackIgnore: true */ '/pdfjs/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

  // Fetch the bytes ourselves and hand pdfjs the raw data instead of a URL — letting pdfjs
  // manage the HTTP request against Supabase's signed-URL endpoint (even with range/streaming
  // disabled) was unreliable and silently returned empty text content on some pages. A plain
  // browser fetch is well-tested and guaranteed to hand back the complete body.
  onProgress('Downloading document...');
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Failed to download the PDF (status ${response.status}).`);
  const pdfBytes = await response.arrayBuffer();

  const pdfDocument = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pageTexts: string[] = [];

  // Only spun up if a page actually turns out to need OCR (no text layer) — most PDFs never
  // touch this, so the ~model-download cost of Tesseract only happens when it's really needed.
  let ocrWorker: TesseractWorker | null = null;

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      onProgress(`Reading page ${pageNumber} of ${pdfDocument.numPages}...`);
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      let pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!pageText) {
        onProgress(`Scanning page ${pageNumber} of ${pdfDocument.numPages} (no text layer found)...`);
        if (!ocrWorker) {
          const { createWorker } = await import('tesseract.js');
          // Self-hosted worker/core/language files (copied to /public/tesseract by
          // scripts/copy-tesseract-assets.cjs) instead of tesseract.js's default third-party
          // CDN — that CDN being slow, blocked, or unreachable previously made this hang
          // indefinitely with zero feedback. The timeout below is a second line of defense in
          // case anything still stalls.
          ocrWorker = await withTimeout(
            createWorker('eng', 1, {
              workerPath: '/tesseract/worker.min.js',
              corePath: '/tesseract/tesseract-core.wasm.js',
              langPath: '/tesseract',
              gzip: true,
            }),
            OCR_WORKER_STARTUP_TIMEOUT_MS,
            'Timed out starting the OCR engine.',
          );
        }

        const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const canvasContext = canvas.getContext('2d');
        if (canvasContext) {
          await page.render({ canvas, canvasContext, viewport }).promise;
          const {
            data: { text: ocrText },
          } = await withTimeout(ocrWorker.recognize(canvas), OCR_PAGE_TIMEOUT_MS, `Timed out scanning page ${pageNumber}.`);
          pageText = ocrText.replace(/\s+/g, ' ').trim();
        }
      }

      pageTexts.push(pageText || `Page ${pageNumber} has no readable text.`);
    }
  } finally {
    await ocrWorker?.terminate();
  }

  return pageTexts;
}

// Chunked per PDF page rather than one giant utterance — keeps each utterance well under the
// length where some browsers silently truncate speech synthesis, and doubles as a natural
// "reading page X of Y" indicator and a page-granularity resume/start point.
export function PdfAudioPlayer({
  fileUrl,
  lessonId,
  cachedPages,
}: {
  fileUrl: string;
  lessonId: string;
  cachedPages: string[] | null;
}) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(cachedPages?.length ?? 0);
  const [startPageInput, setStartPageInput] = useState('1');
  const [isSupported, setIsSupported] = useState(true);
  const pageTextsRef = useRef<string[] | null>(cachedPages);
  const activeTokenRef = useRef(0);
  const rateRef = useRef(1);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    return () => {
      activeTokenRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speakFromPage(pageTexts: string[], pageIndex: number, token: number) {
    if (pageIndex >= pageTexts.length) {
      setPlaybackState('idle');
      setCurrentPage(0);
      return;
    }

    setCurrentPage(pageIndex + 1);
    const utterance = new SpeechSynthesisUtterance(pageTexts[pageIndex]);
    utterance.rate = rateRef.current;
    utterance.onend = () => {
      if (activeTokenRef.current === token) speakFromPage(pageTexts, pageIndex + 1, token);
    };
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      if (activeTokenRef.current === token) {
        setPlaybackState('error');
        setErrorMessage('Playback was interrupted.');
      }
    };
    window.speechSynthesis.speak(utterance);
    setPlaybackState('playing');
  }

  async function handlePlay() {
    if (playbackState === 'paused') {
      window.speechSynthesis.resume();
      setPlaybackState('playing');
      return;
    }

    setErrorMessage(null);
    setPlaybackState('extracting');
    const token = activeTokenRef.current;
    try {
      let pageTexts = pageTextsRef.current;
      if (!pageTexts) {
        pageTexts = await extractPageTexts(fileUrl, (message) => {
          if (activeTokenRef.current === token) setProgressMessage(message);
        });
        if (activeTokenRef.current !== token) return;
        pageTextsRef.current = pageTexts;
        setTotalPages(pageTexts.length);
        // Fire-and-forget: cache what this browser just worked out (including any OCR) so the
        // next student to click Listen on this lesson skips straight to instant playback.
        saveLessonAudioTranscript(lessonId, pageTexts).catch((cacheError) => {
          console.error('Failed to cache lesson audio transcript:', cacheError);
        });
      }
      if (activeTokenRef.current !== token) return;
      setProgressMessage(null);

      const startIndex = Math.min(pageTexts.length - 1, Math.max(0, (Number.parseInt(startPageInput, 10) || 1) - 1));
      speakFromPage(pageTexts, startIndex, token);
    } catch (error) {
      if (activeTokenRef.current !== token) return;
      setPlaybackState('error');
      setProgressMessage(null);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to prepare audio for this document.');
    }
  }

  function handlePause() {
    window.speechSynthesis.pause();
    setPlaybackState('paused');
  }

  function handleStop() {
    activeTokenRef.current += 1;
    window.speechSynthesis.cancel();
    setPlaybackState('idle');
    setCurrentPage(0);
  }

  if (!isSupported) return null;

  const isBusy = playbackState === 'playing' || playbackState === 'paused';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      {playbackState === 'playing' ? (
        <Button variant="outline" onClick={handlePause}>
          <Icon name="pause" className="h-4 w-4" /> Pause
        </Button>
      ) : (
        <Button variant="outline" onClick={handlePlay} isLoading={playbackState === 'extracting'}>
          {playbackState !== 'extracting' && <Icon name="play" className="h-4 w-4" />}
          {playbackState === 'paused' ? 'Resume' : 'Listen'}
        </Button>
      )}

      {isBusy && (
        <Button variant="outline" onClick={handleStop}>
          Stop
        </Button>
      )}

      {!isBusy && (
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Start at page
          <Input
            value={startPageInput}
            onChange={(changeEvent) => setStartPageInput(changeEvent.target.value)}
            inputMode="numeric"
            className="w-14 px-2 py-1 text-xs"
          />
        </label>
      )}

      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        Speed
        <select
          value={rate}
          onChange={(changeEvent) => setRate(Number(changeEvent.target.value))}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
        >
          {READING_RATE_OPTIONS.map((rateOption) => (
            <option key={rateOption} value={rateOption}>
              {rateOption}x
            </option>
          ))}
        </select>
      </label>

      {playbackState === 'extracting' && (
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Spinner className="h-3.5 w-3.5" /> {progressMessage ?? 'Preparing audio...'}
        </span>
      )}
      {totalPages > 0 && isBusy && (
        <span className="text-xs text-slate-500">
          Reading page {currentPage} of {totalPages}
        </span>
      )}
      {errorMessage && <span className="text-xs text-red-600">{errorMessage}</span>}
    </div>
  );
}
