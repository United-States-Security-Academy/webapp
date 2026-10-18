'use client';

import { useEffect, useState } from 'react';

export interface CourseSectionLink {
  id: string;
  label: string;
}

// In-page links to the course page's sections, pinned to the top while scrolling, with the
// section being read highlighted. Plain anchor links, so it works before JavaScript loads too.
export function CourseSectionNav({ sections }: { sections: CourseSectionLink[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const elements = sections.map((section) => document.getElementById(section.id)).filter((element) => element !== null);
    if (elements.length === 0) return;

    // A section counts as "being read" once its top passes the upper third of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <nav aria-label="Course sections" className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur print:hidden">
      <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-slate-100 text-navy-900' : 'text-slate-500 hover:text-navy-900'
                }`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
