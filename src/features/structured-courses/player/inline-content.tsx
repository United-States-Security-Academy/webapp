import { Fragment } from 'react';
import type { StructuredInline } from '@/db/schema/structured-courses';

// Renders stored text runs as plain React elements — uploaded content is never injected as HTML.
// Links were limited to http(s)/mailto when the file was parsed, and are checked again here.
export function InlineContent({ runs }: { runs: StructuredInline[] }) {
  return (
    <>
      {runs.map((run, index) => {
        const lines = run.text.split('\n');
        let content: React.ReactNode = lines.map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {line}
          </Fragment>
        ));
        if (run.bold) content = <strong className="font-semibold text-slate-900">{content}</strong>;
        if (run.italic) content = <em>{content}</em>;
        if (run.href && /^(https?:|mailto:)/i.test(run.href)) {
          content = (
            <a href={run.href} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-800 underline underline-offset-2 hover:text-gold-600">
              {content}
            </a>
          );
        }
        return <Fragment key={index}>{content}</Fragment>;
      })}
    </>
  );
}
