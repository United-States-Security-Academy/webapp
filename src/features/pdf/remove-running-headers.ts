// A line of text from one PDF page, with where it sits vertically: 0 = top edge, 1 = bottom edge.
export interface PositionedLine {
  text: string;
  verticalPosition: number;
}

// Headers and footers live in these top/bottom bands of the page.
const MARGIN_BAND = 0.1;
// A margin line counts as a running header/footer when it repeats on at least this share of
// pages (and on at least 2 pages), once digits are ignored.
const REPEAT_SHARE = 0.4;

// Digits are masked so "Page 3 of 40" and "Page 4 of 40" (or a dated footer) compare as the same line.
function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

const PAGE_NUMBER_PATTERNS = [
  /^#$/, // 3
  /^[-–—|]\s*#\s*[-–—|]$/, // - 3 -
  /^(page|pg\.?|p\.)\s*#(\s*(of|\/)\s*#)?$/, // Page 3, Page 3 of 40, p. 3
  /^#\s*(of|\/)\s*#$/, // 3 of 40, 3/40
  /^[ivxlcdm]{1,6}$/, // roman numerals used on front-matter pages
];

function isPageNumber(normalizedText: string): boolean {
  return PAGE_NUMBER_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

function isInMargin(line: PositionedLine): boolean {
  return line.verticalPosition < MARGIN_BAND || line.verticalPosition > 1 - MARGIN_BAND;
}

// Returns each page's readable text with running headers, footers and page numbers removed, so
// read-aloud doesn't announce "Student Handbook, page 12 of 40" on every page. Only margin lines
// are ever dropped, and only when they look like page numbers or repeat across pages — a one-off
// line near the bottom of a single page (the end of a paragraph) is kept.
export function removeRunningHeadersAndFooters(pages: PositionedLine[][]): string[] {
  const pagesContainingMarginLine = new Map<string, number>();
  for (const pageLines of pages) {
    const marginLinesOnPage = new Set(pageLines.filter(isInMargin).map((line) => normalizeForComparison(line.text)));
    for (const normalizedText of marginLinesOnPage) {
      pagesContainingMarginLine.set(normalizedText, (pagesContainingMarginLine.get(normalizedText) ?? 0) + 1);
    }
  }

  const minimumRepeats = Math.max(2, Math.ceil(pages.length * REPEAT_SHARE));

  return pages.map((pageLines) =>
    pageLines
      .filter((line) => {
        if (!isInMargin(line)) return true;
        const normalizedText = normalizeForComparison(line.text);
        if (!normalizedText || isPageNumber(normalizedText)) return false;
        return (pagesContainingMarginLine.get(normalizedText) ?? 0) < minimumRepeats;
      })
      .map((line) => line.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}
