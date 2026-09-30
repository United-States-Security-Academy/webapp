'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { COURSE_CATEGORIES, COURSE_CATEGORY_META } from '@/features/courses/course-category';
import type { CourseCategory } from '@/features/courses/course-types';

export function TrainingProgramsSection() {
  const [activeCategory, setActiveCategory] = useState<CourseCategory>(COURSE_CATEGORIES[0]!);
  const activeProgram = COURSE_CATEGORY_META[activeCategory];

  return (
    <section id="courses" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-2xl font-extrabold tracking-wide text-navy-900 sm:text-3xl">
          TRAINING PROGRAMS &amp; CERTIFICATIONS
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500">
          Select a program to learn how USSA trains and certifies professionals in that field.
        </p>

        <div className="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[280px_1fr]">
          <div className="flex flex-row overflow-x-auto lg:flex-col lg:overflow-visible lg:border-r lg:border-slate-200">
            {COURSE_CATEGORIES.map((category) => {
              const program = COURSE_CATEGORY_META[category];
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`flex shrink-0 items-center gap-3 whitespace-nowrap border-b-2 px-5 py-4 text-left text-sm font-bold transition lg:w-full lg:border-b-0 lg:border-l-4 ${
                    isActive
                      ? 'border-gold-500 bg-slate-50 text-navy-900'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-navy-800'
                  }`}
                >
                  <Icon name={program.icon} className="h-5 w-5 shrink-0" />
                  {program.label}
                </button>
              );
            })}
          </div>

          <div className="relative min-h-[420px]">
            <Image
              src={activeProgram.image}
              alt={activeProgram.programTitle}
              fill
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/85 to-navy-950/50" />

            <div className="relative flex h-full flex-col justify-center p-8 text-white sm:p-12">
              <h3 className="text-2xl font-extrabold leading-tight sm:text-3xl">{activeProgram.programTitle}</h3>
              <div className="mt-4 h-1 w-16 bg-gold-500" />
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-200">{activeProgram.overview}</p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={`/programs/${activeProgram.urlSlug}`}
                  className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-6 py-3 text-sm font-bold tracking-wide text-navy-950 hover:bg-gold-400"
                >
                  ABOUT {activeProgram.label.toUpperCase()} &raquo;
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 rounded-md border-2 border-white px-6 py-3 text-sm font-bold tracking-wide text-white hover:bg-white hover:text-navy-950"
                >
                  VIEW COURSES &raquo;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
