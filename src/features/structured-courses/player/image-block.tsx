'use client';

import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/icon';

// Tap the picture to see it full screen. A native <dialog> gives Escape-to-close, focus handling
// and the dark backdrop for free.
export function ImageBlock({ url, alt }: { url: string | undefined; alt: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (!url) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
        This picture couldn&apos;t be loaded.
      </div>
    );
  }

  function open() {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <figure>
      <button
        type="button"
        onClick={open}
        className="group block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-800"
        aria-label={alt ? `View full screen: ${alt}` : 'View picture full screen'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Supabase Storage URL */}
        <img src={url} alt={alt} loading="lazy" className="mx-auto max-h-[28rem] w-auto object-contain" />
      </button>
      {alt && <figcaption className="mt-2 text-sm text-slate-500">{alt}</figcaption>}

      <dialog
        ref={dialogRef}
        onClose={() => setIsOpen(false)}
        onClick={close}
        className="theme-fixed m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/90"
        aria-label={alt || 'Picture'}
      >
        {isOpen && (
          <div className="flex h-full w-full items-center justify-center p-4">
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
              autoFocus
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
            <motion.img
              src={url}
              alt={alt}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </dialog>
    </figure>
  );
}
