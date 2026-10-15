import type { StructuredInline } from '@/db/schema/structured-courses';
import { InlineContent } from './inline-content';

// Scrolls sideways on small screens instead of squeezing the columns. The scroll area can take
// keyboard focus so it can also be scrolled with the arrow keys.
export function TableBlock({ rows, hasHeaderRow }: { rows: StructuredInline[][][]; hasHeaderRow: boolean }) {
  const [firstRow, ...otherRows] = rows;
  const headerRow = hasHeaderRow ? firstRow : undefined;
  const bodyRows = hasHeaderRow ? otherRows : rows;

  return (
    <div role="region" aria-label="Table" tabIndex={0} className="-mx-4 overflow-x-auto px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-800 sm:mx-0 sm:px-0">
      <table className="min-w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-left text-sm sm:text-[15px]">
        {headerRow && (
          <thead className="bg-navy-900 text-white">
            <tr>
              {headerRow.map((cell, cellIndex) => (
                <th key={cellIndex} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold sm:whitespace-normal">
                  <InlineContent runs={cell} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200 even:bg-slate-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="min-w-[8rem] px-4 py-3 align-top text-slate-700">
                  <InlineContent runs={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
