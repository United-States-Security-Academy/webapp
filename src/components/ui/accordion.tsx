'use client';

import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icon';

export function AccordionItem({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: IconName;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
              <Icon name={icon} className="h-4 w-4" />
            </span>
          )}
          <span className="text-sm font-bold text-navy-900 sm:text-base">{title}</span>
        </span>
        <Icon
          name="chevronDown"
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="pb-5 pl-0 sm:pl-12">{children}</div>}
    </div>
  );
}

export function Accordion({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white px-5 shadow-sm">{children}</div>;
}
