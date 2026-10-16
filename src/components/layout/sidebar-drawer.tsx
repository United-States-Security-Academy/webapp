'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';

export function SidebarDrawer({ label, children }: { label: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape') setIsOpen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Section links like /dashboard#certificates don't change the pathname, so also close the
  // menu whenever any link inside it is clicked.
  function handleMenuClick(clickEvent: React.MouseEvent) {
    if ((clickEvent.target as HTMLElement).closest('a')) setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="flex h-10 w-10 items-center justify-center rounded-md text-navy-900 hover:bg-slate-100"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      {/* Rendered into <body> rather than in place: an ancestor with a backdrop-filter, transform
          or z-index (like a frosted sticky header) would otherwise trap this fixed overlay inside
          its own box and stacking layer, so it would show up clipped behind the page content. */}
      {hasMounted &&
        createPortal(
          <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? '' : 'pointer-events-none'}`} inert={!isOpen}>
            <div
              className={`absolute inset-0 bg-navy-950/60 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
              onClick={() => setIsOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={label}
              onClick={handleMenuClick}
              className={`theme-fixed absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-navy-950 px-4 py-6 text-white shadow-xl transition-transform ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
