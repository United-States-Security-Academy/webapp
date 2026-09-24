'use client';

import { useEffect, useRef, useState } from 'react';
import type * as PdfjsLib from 'pdfjs-dist';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import './pdf-text-layer.css';

const MAX_PAGE_RENDER_WIDTH = 720;
const MIN_PAGE_RENDER_WIDTH = 280;
const THUMBNAIL_WIDTH = 96;
const ZOOM_STEP_PERCENT = 10;
const MIN_ZOOM_PERCENT = 50;
const MAX_ZOOM_PERCENT = 200;

type LoadState = 'loading' | 'ready' | 'error';

export function PdfViewer({ fileUrl }: { fileUrl: string }) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailListRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<PdfjsLib.PDFDocumentProxy | null>(null);
  const pdfjsLibRef = useRef<typeof PdfjsLib | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [numPages, setNumPages] = useState(0);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [baseRenderWidth, setBaseRenderWidth] = useState<number | null>(null);

  // Load the document once per fileUrl — rendering (below) reruns on zoom changes without
  // re-fetching it.
  useEffect(() => {
    let isCancelled = false;
    setLoadState('loading');
    setNumPages(0);
    setPageInputValue('1');
    setZoomPercent(100);
    setBaseRenderWidth(null);
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
        // Fetch the bytes ourselves and hand pdfjs the raw data instead of a URL — letting
        // pdfjs manage the HTTP request against Supabase's signed-URL endpoint (even with
        // range/streaming disabled) was unreliable and could silently drop page content. A
        // plain browser fetch is well-tested and guaranteed to hand back the complete body.
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to download the PDF (status ${response.status}).`);
        const pdfBytes = await response.arrayBuffer();
        if (isCancelled) return;

        const pdfDocument = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        if (isCancelled) return;

        // Render at the scroll area's actual available width (minus its padding) so pages
        // never overflow on narrow phone screens, capped at a comfortable reading width on desktop.
        const availableWidth = (scrollAreaRef.current?.clientWidth ?? MAX_PAGE_RENDER_WIDTH + 32) - 32;
        const fitWidth = Math.max(MIN_PAGE_RENDER_WIDTH, Math.min(MAX_PAGE_RENDER_WIDTH, availableWidth));

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
  }, [fileUrl]);

  // Render every page (and its thumbnail) whenever the document finishes loading or the zoom changes.
  useEffect(() => {
    const pdfDocument = pdfDocumentRef.current;
    const pdfjsLib = pdfjsLibRef.current;
    if (!baseRenderWidth || !pdfDocument || !pdfjsLib) return;
    let isCancelled = false;

    function setupPageObserver() {
      observerRef.current?.disconnect();
      const scrollArea = scrollAreaRef.current;
      const pagesContainer = pagesContainerRef.current;
      if (!scrollArea || !pagesContainer) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const mostVisible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!mostVisible) return;
          const pageNumber = Number((mostVisible.target as HTMLElement).dataset.pageNumber);
          if (pageNumber) {
            setPageInputValue(String(pageNumber));
            highlightThumbnail(pageNumber);
          }
        },
        { root: scrollArea, threshold: [0.25, 0.5, 0.75] },
      );

      Array.from(pagesContainer.children).forEach((child) => observer.observe(child));
      observerRef.current = observer;
      highlightThumbnail(1);
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
      const pageRenderWidth = baseRenderWidth * (zoomPercent / 100);
      const outputScale = window.devicePixelRatio || 1;

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = pageRenderWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const pageWrapper = document.createElement('div');
        pageWrapper.dataset.pageNumber = String(pageNumber);
        pageWrapper.className = 'relative mb-4 scroll-mt-4';

        // Render at the display's actual pixel density, not just CSS pixels — otherwise the
        // canvas backing store is lower-resolution than the screen and gets blurrily upscaled
        // on any HiDPI display (Retina, or Windows display scaling above 100%).
        const canvas = document.createElement('canvas');
        canvas.className = 'max-w-full shadow-md';
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
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
        textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
        textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
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
      setLoadState('ready');
      setupPageObserver();
    }

    renderPages(pdfDocument, baseRenderWidth, pdfjsLib);
    return () => {
      isCancelled = true;
      observerRef.current?.disconnect();
    };
  }, [baseRenderWidth, zoomPercent]);

  function scrollToPage(pageNumber: number) {
    const target = pagesContainerRef.current?.querySelector<HTMLElement>(`[data-page-number="${pageNumber}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
        </div>
      </div>

      <div className="relative flex" style={{ height: '75vh' }}>
        <div
          className={`${isSidebarOpen ? 'flex' : 'hidden'} absolute inset-y-0 left-0 z-10 w-32 flex-col gap-2 overflow-y-auto border-r border-slate-200 bg-slate-50 p-2 sm:w-40 lg:static lg:z-auto lg:flex`}
        >
          <div ref={thumbnailListRef} className="flex flex-col gap-2" />
        </div>

        <div ref={scrollAreaRef} className="relative flex-1 overflow-y-auto bg-slate-100 p-4">
          {loadState === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Spinner className="h-4 w-4" /> Loading document...
            </div>
          )}
          {loadState === 'error' && <p className="py-12 text-center text-sm text-red-600">Failed to load the PDF.</p>}
          <div ref={pagesContainerRef} className={`flex flex-col items-center ${loadState === 'ready' ? '' : 'hidden'}`} />
        </div>
      </div>
    </div>
  );
}
