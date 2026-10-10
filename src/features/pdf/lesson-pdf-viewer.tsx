'use client';

import { useEffect, useRef, useState } from 'react';
import type * as PdfjsLib from 'pdfjs-dist';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { loadLessonPdfBytes } from './lesson-pdf-bytes';
import './pdf-text-layer.css';

const MAX_PAGE_RENDER_WIDTH = 720;
const FULLSCREEN_MAX_PAGE_RENDER_WIDTH = 1100;
const MIN_PAGE_RENDER_WIDTH = 280;
const THUMBNAIL_WIDTH = 96;
const ZOOM_STEP_PERCENT = 10;
const MIN_ZOOM_PERCENT = 50;
const MAX_ZOOM_PERCENT = 200;

type LoadState = 'loading' | 'ready' | 'error';

// The page at a fixed reading point near the top of the view (30% down). Scrolling a page's top to
// the top of the view always reports that same page back, so restoring a saved page after a
// re-render or layout change never drifts to the next one.
function findPageAtReadingPoint(scrollArea: HTMLElement, pagesContainer: HTMLElement): number {
  const readingPoint = scrollArea.scrollTop + scrollArea.clientHeight * 0.3;
  let pageNumber = 1;
  for (const pageWrapper of Array.from(pagesContainer.children) as HTMLElement[]) {
    if (pageWrapper.offsetTop > readingPoint) break;
    pageNumber = Number(pageWrapper.dataset.pageNumber) || pageNumber;
  }
  return pageNumber;
}

// Scrolls only the viewer's own scroll area — scrollIntoView would also scroll the surrounding
// lesson page. offsetTop is relative to the scroll area (its nearest positioned ancestor).
function scrollPageIntoView(scrollArea: HTMLElement, pagesContainer: HTMLElement, pageNumber: number, behavior: ScrollBehavior) {
  const target = pagesContainer.querySelector<HTMLElement>(`[data-page-number="${pageNumber}"]`);
  if (!target) return;
  scrollArea.scrollTo({ top: pageNumber === 1 ? 0 : target.offsetTop - 16, behavior });
}

// Render at the scroll area's actual available width (minus its padding) so pages never overflow
// on narrow phone screens, capped at a comfortable reading width. The scroll area reserves its
// scrollbar gutter up front, so this width doesn't shrink once the pages load and the scrollbar appears.
function measureFitWidth(scrollArea: HTMLElement | null, maxWidth: number): number {
  const availableWidth = (scrollArea?.clientWidth ?? maxWidth + 32) - 32;
  return Math.max(MIN_PAGE_RENDER_WIDTH, Math.min(maxWidth, availableWidth));
}

export function PdfViewer({ fileUrl, lessonId, pdfVersion }: { fileUrl: string; lessonId: string; pdfVersion: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailListRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<PdfjsLib.PDFDocumentProxy | null>(null);
  const pdfjsLibRef = useRef<typeof PdfjsLib | null>(null);
  const stopPageTrackingRef = useRef<(() => void) | null>(null);
  // The page the reader is on, kept in a ref so re-rendering (zoom, entering/leaving full screen)
  // can bring them back to it instead of jumping to page 1.
  const currentPageRef = useRef(1);
  const pendingRestorePageRef = useRef<number | null>(null);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [numPages, setNumPages] = useState(0);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [baseRenderWidth, setBaseRenderWidth] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load the document once per fileUrl — rendering (below) reruns on zoom changes without
  // re-fetching it.
  useEffect(() => {
    let isCancelled = false;
    setLoadState('loading');
    setNumPages(0);
    setPageInputValue('1');
    setZoomPercent(100);
    setBaseRenderWidth(null);
    currentPageRef.current = 1;
    pdfDocumentRef.current = null;

    async function loadDocument() {
      // pdfjs-dist's own build is itself a webpack bundle with internal variable names that
      // collide with our webpack's runtime under Next's dev-mode module wrapping
      // (webpack/webpack#20095, unfixed in Next's bundled webpack). Loading it as a real
      // browser ES module from /public — never handed to webpack — sidesteps the bug entirely.
      // @ts-expect-error -- runtime-only path into /public, not a resolvable TS module specifier
      const pdfjsLib: typeof PdfjsLib = await import(/* webpackIgnore: true */ '/pdfjs/pdf.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      pdfjsLibRef.current = pdfjsLib;

      try {
        // Shared with the read-aloud player and kept on the device between visits.
        const pdfBytes = await loadLessonPdfBytes(fileUrl, lessonId, pdfVersion);
        if (isCancelled) return;

        const pdfDocument = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        if (isCancelled) return;

        const fitWidth = measureFitWidth(scrollAreaRef.current, MAX_PAGE_RENDER_WIDTH);

        pdfDocumentRef.current = pdfDocument;
        setNumPages(pdfDocument.numPages);
        setBaseRenderWidth(fitWidth);
      } catch (error) {
        console.error('Failed to load PDF:', error);
        if (!isCancelled) setLoadState('error');
      }
    }

    loadDocument();
    return () => {
      isCancelled = true;
    };
  }, [fileUrl, lessonId, pdfVersion]);

  // Render every page (and its thumbnail) whenever the document finishes loading or the zoom changes.
  useEffect(() => {
    const pdfDocument = pdfDocumentRef.current;
    const pdfjsLib = pdfjsLibRef.current;
    if (!baseRenderWidth || !pdfDocument || !pdfjsLib) return;
    let isCancelled = false;

    function setupPageTracking() {
      stopPageTrackingRef.current?.();
      const scrollArea = scrollAreaRef.current;
      const pagesContainer = pagesContainerRef.current;
      if (!scrollArea || !pagesContainer) return;

      let animationFrame = 0;
      function updateCurrentPage() {
        animationFrame = 0;
        if (!scrollArea || !pagesContainer) return;
        const pageNumber = findPageAtReadingPoint(scrollArea, pagesContainer);
        if (pageNumber === currentPageRef.current) return;
        currentPageRef.current = pageNumber;
        setPageInputValue(String(pageNumber));
        highlightThumbnail(pageNumber);
      }
      function handleScroll() {
        if (!animationFrame) animationFrame = requestAnimationFrame(updateCurrentPage);
      }

      scrollArea.addEventListener('scroll', handleScroll, { passive: true });
      stopPageTrackingRef.current = () => {
        scrollArea.removeEventListener('scroll', handleScroll);
        cancelAnimationFrame(animationFrame);
      };
      setPageInputValue(String(currentPageRef.current));
      highlightThumbnail(currentPageRef.current);
    }

    function highlightThumbnail(pageNumber: number) {
      const thumbnailList = thumbnailListRef.current;
      if (!thumbnailList) return;
      thumbnailList.querySelectorAll<HTMLButtonElement>('.thumbnail-button').forEach((button) => {
        const isActive = button.dataset.pageNumber === String(pageNumber);
        button.classList.toggle('border-gold-500', isActive);
        button.classList.toggle('bg-gold-500/10', isActive);
        if (isActive) button.scrollIntoView({ block: 'nearest' });
      });
    }

    async function renderPages(pdfDocument: PdfjsLib.PDFDocumentProxy, baseRenderWidth: number, pdfjsLib: typeof PdfjsLib) {
      const pagesContainer = pagesContainerRef.current;
      const thumbnailList = thumbnailListRef.current;
      if (!pagesContainer) return;
      pagesContainer.innerHTML = '';
      if (thumbnailList) thumbnailList.innerHTML = '';

      setLoadState('loading');
      const pageToRestore = currentPageRef.current;
      const pageRenderWidth = baseRenderWidth * (zoomPercent / 100);
      const outputScale = window.devicePixelRatio || 1;

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);
        if (isCancelled) return;

        // Pick a whole-pixel CSS width first and derive the scale from it, so the canvas backing
        // store is exactly outputScale x its displayed size — any mismatch makes the browser
        // resample the bitmap, which visibly softens text.
        const unscaledViewport = page.getViewport({ scale: 1 });
        const cssWidth = Math.round(pageRenderWidth);
        const viewport = page.getViewport({ scale: cssWidth / unscaledViewport.width });
        const cssHeight = Math.round(viewport.height);

        const pageWrapper = document.createElement('div');
        pageWrapper.dataset.pageNumber = String(pageNumber);
        pageWrapper.className = 'relative mb-4 scroll-mt-4';

        // Render at the display's actual pixel density, not just CSS pixels — otherwise the
        // canvas backing store is lower-resolution than the screen and gets blurrily upscaled
        // on any HiDPI display (Retina, or Windows display scaling above 100%). No max-width: a
        // page wider than the scroll area scrolls sideways rather than being squeezed (and blurred).
        const canvas = document.createElement('canvas');
        canvas.className = 'block shadow-md';
        canvas.width = Math.round(cssWidth * outputScale);
        canvas.height = Math.round(cssHeight * outputScale);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        pageWrapper.appendChild(canvas);
        pagesContainer.appendChild(pageWrapper);

        const canvasContext = canvas.getContext('2d');
        if (canvasContext) {
          const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
          await page.render({ canvas, canvasContext, viewport, transform }).promise;
        }
        if (isCancelled) return;

        // A real, invisible text layer positioned exactly over the canvas — this is what makes
        // the page's text selectable/copyable, since the canvas itself is just pixels.
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${cssWidth}px`;
        textLayerDiv.style.height = `${cssHeight}px`;
        pageWrapper.appendChild(textLayerDiv);
        try {
          const textContent = await page.getTextContent();
          if (isCancelled) return;
          await new pdfjsLib.TextLayer({ textContentSource: textContent, container: textLayerDiv, viewport }).render();
        } catch (textLayerError) {
          console.error('Failed to render text layer:', textLayerError);
        }
        if (isCancelled) return;

        // Thumbnail: a scaled-down copy of the already-rendered canvas, rather than a second
        // full pdfjs render pass — cheap, and keeps thumbnails perfectly in sync with the page.
        if (thumbnailList && canvasContext) {
          const thumbScale = THUMBNAIL_WIDTH / viewport.width;
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = THUMBNAIL_WIDTH;
          thumbCanvas.height = Math.max(1, Math.floor(viewport.height * thumbScale));
          const thumbContext = thumbCanvas.getContext('2d');
          thumbContext?.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);

          const thumbButton = document.createElement('button');
          thumbButton.type = 'button';
          thumbButton.dataset.pageNumber = String(pageNumber);
          thumbButton.className =
            'thumbnail-button flex flex-col items-center gap-1 rounded-md border-2 border-transparent p-1 hover:border-gold-400/60';
          thumbButton.appendChild(thumbCanvas);
          const label = document.createElement('span');
          label.className = 'text-[10px] font-semibold text-slate-500';
          label.textContent = String(pageNumber);
          thumbButton.appendChild(label);
          thumbButton.addEventListener('click', () => scrollToPage(pageNumber));
          thumbnailList.appendChild(thumbButton);
        }
      }

      if (isCancelled) return;
      // The pages container is still display:none until React applies the 'ready' state, so the
      // scroll position is restored by the effect below once the pages are actually laid out.
      pendingRestorePageRef.current = pageToRestore;
      setLoadState('ready');
      setupPageTracking();
    }

    renderPages(pdfDocument, baseRenderWidth, pdfjsLib);
    return () => {
      isCancelled = true;
      stopPageTrackingRef.current?.();
    };
  }, [baseRenderWidth, zoomPercent]);

  useEffect(() => {
    if (loadState !== 'ready' || pendingRestorePageRef.current === null) return;
    const pageNumber = pendingRestorePageRef.current;
    pendingRestorePageRef.current = null;
    if (scrollAreaRef.current && pagesContainerRef.current) {
      scrollPageIntoView(scrollAreaRef.current, pagesContainerRef.current, pageNumber, 'instant');
    }
  }, [loadState]);

  // Keep our state in sync when the browser leaves real full screen on its own (Esc, or the
  // browser's own exit gesture).
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement !== null && document.fullscreenElement === rootRef.current);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fallback full screen (browsers without the Fullscreen API on elements, e.g. iPhone Safari) is
  // just the viewer stretched over the page, so it needs its own Esc handling and scroll lock.
  useEffect(() => {
    if (!isFullscreen || document.fullscreenElement) return;
    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape') setIsFullscreen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Re-fit the pages to the new space after entering or leaving full screen. Waits a frame so the
  // layout change has happened before measuring.
  useEffect(() => {
    if (!pdfDocumentRef.current) return;
    const frame = requestAnimationFrame(() => {
      setBaseRenderWidth(measureFitWidth(scrollAreaRef.current, isFullscreen ? FULLSCREEN_MAX_PAGE_RENDER_WIDTH : MAX_PAGE_RENDER_WIDTH));
    });
    return () => cancelAnimationFrame(frame);
  }, [isFullscreen]);

  async function handleToggleFullscreen() {
    if (isFullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen();
      else setIsFullscreen(false);
      return;
    }
    const root = rootRef.current;
    if (root && typeof root.requestFullscreen === 'function') {
      try {
        await root.requestFullscreen();
        return;
      } catch {
        // Fall through to the stretched-over-the-page fallback.
      }
    }
    setIsFullscreen(true);
  }

  function scrollToPage(pageNumber: number) {
    if (scrollAreaRef.current && pagesContainerRef.current) {
      scrollPageIntoView(scrollAreaRef.current, pagesContainerRef.current, pageNumber, 'smooth');
    }
    setIsSidebarOpen(false);
  }

  function handlePageInputSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const targetPage = Math.min(numPages, Math.max(1, Number.parseInt(pageInputValue, 10) || 1));
    scrollToPage(targetPage);
  }

  function handleZoomOut() {
    setZoomPercent((current) => Math.max(MIN_ZOOM_PERCENT, current - ZOOM_STEP_PERCENT));
  }

  function handleZoomIn() {
    setZoomPercent((current) => Math.min(MAX_ZOOM_PERCENT, current + ZOOM_STEP_PERCENT));
  }

  return (
    // contain:inline-size — the viewer's width always comes from the space the page gives it, never
    // from the pages drawn inside it. Without this, leaving full screen briefly left 1100px-wide
    // pages in place, which stretched the lesson page's grid column; the re-fit then measured
    // that stretched width and the page stayed wider than the screen.
    <div
      ref={rootRef}
      className={`overflow-hidden bg-white [contain:inline-size] ${isFullscreen ? 'fixed inset-0 z-[60] flex flex-col' : 'rounded-lg border border-slate-200'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-navy-950 px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-label="Toggle page thumbnails"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 lg:hidden"
          >
            <Icon name="menu" className="h-4 w-4" />
          </button>
          {numPages > 0 && (
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 text-xs">
              <input
                value={pageInputValue}
                onChange={(changeEvent) => setPageInputValue(changeEvent.target.value)}
                inputMode="numeric"
                className="w-10 rounded-md border border-white/20 bg-white/10 px-1.5 py-1 text-center text-white focus:border-gold-400 focus:outline-none"
              />
              <span className="text-slate-300">/ {numPages}</span>
            </form>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomPercent <= MIN_ZOOM_PERCENT}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-30"
          >
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <span className="w-11 text-center text-xs text-slate-200">{zoomPercent}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomPercent >= MAX_ZOOM_PERCENT}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-30"
          >
            <Icon name="plus" className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-white/20" aria-hidden="true" />
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold hover:bg-white/10"
          >
            <Icon name={isFullscreen ? 'collapse' : 'expand'} className="h-4 w-4" />
            <span className="hidden sm:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
          </button>
        </div>
      </div>

      <div className={`relative flex ${isFullscreen ? 'min-h-0 flex-1' : ''}`} style={isFullscreen ? undefined : { height: '75vh' }}>
        <div
          className={`${isSidebarOpen ? 'flex' : 'hidden'} absolute inset-y-0 left-0 z-10 w-32 flex-col gap-2 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2 sm:w-40 lg:static lg:z-auto lg:flex`}
        >
          <div ref={thumbnailListRef} className="flex flex-col gap-2" />
        </div>

        <div ref={scrollAreaRef} className="relative flex-1 overflow-auto bg-slate-100 p-4 [scrollbar-gutter:stable]">
          {loadState === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Spinner className="h-4 w-4" /> Loading document...
            </div>
          )}
          {loadState === 'error' && <p className="py-12 text-center text-sm text-red-600">Failed to load the PDF.</p>}
          <div ref={pagesContainerRef} className={`mx-auto flex w-fit flex-col items-center ${loadState === 'ready' ? '' : 'hidden'}`} />
        </div>
      </div>
    </div>
  );
}
