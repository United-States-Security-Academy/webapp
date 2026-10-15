// A Heading 3 in the Word file: starts a new section of the lesson.
export function HeadingBlock({ text, isFirst }: { text: string; isFirst: boolean }) {
  return (
    <h3 className={`text-xl font-semibold text-slate-900 sm:text-2xl ${isFirst ? '' : 'mt-4 border-t border-slate-200 pt-8'}`}>
      {text}
    </h3>
  );
}
