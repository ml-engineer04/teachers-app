export interface BookPageDisplayInfo {
  pdfPage: number;
  totalPdfPages: number;
  contentStartPdfPage: number;
  contentTotalPages: number;
  isFrontMatter: boolean;
  frontMatterIndex: number;
  bookPage: number | null;
}

/**
 * Clamps the 1-based physical PDF page where Page 1 of textbook content begins.
 */
export function normalizeContentStartPage(
  contentStartPdfPage?: number | null,
  totalPdfPages?: number | null,
): number {
  const parsed = Math.floor(Number(contentStartPdfPage));
  const safeStart = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  const maxTotal = Math.floor(Number(totalPdfPages));
  if (Number.isFinite(maxTotal) && maxTotal >= 1) {
    return Math.min(safeStart, maxTotal);
  }
  return safeStart;
}

/**
 * Returns total logical content pages starting at book Page 1.
 */
export function getBookContentTotalPages(
  totalPdfPages: number,
  contentStartPdfPage?: number | null,
): number {
  const safeTotal = Math.max(1, Math.floor(Number(totalPdfPages) || 1));
  const start = normalizeContentStartPage(contentStartPdfPage, safeTotal);
  return Math.max(1, safeTotal - (start - 1));
}

/**
 * Converts a physical 1-based PDF page index into textbook display numbering.
 */
export function pdfPageToBookDisplay(
  pdfPage: number,
  totalPdfPages: number,
  contentStartPdfPage?: number | null,
): BookPageDisplayInfo {
  const safeTotal = Math.max(1, Math.floor(Number(totalPdfPages) || 1));
  const safePdfPage = Math.max(1, Math.min(safeTotal, Math.floor(Number(pdfPage) || 1)));
  const start = normalizeContentStartPage(contentStartPdfPage, safeTotal);
  const contentTotalPages = getBookContentTotalPages(safeTotal, start);

  if (safePdfPage < start) {
    return {
      pdfPage: safePdfPage,
      totalPdfPages: safeTotal,
      contentStartPdfPage: start,
      contentTotalPages,
      isFrontMatter: true,
      frontMatterIndex: safePdfPage,
      bookPage: null,
    };
  }

  return {
    pdfPage: safePdfPage,
    totalPdfPages: safeTotal,
    contentStartPdfPage: start,
    contentTotalPages,
    isFrontMatter: false,
    frontMatterIndex: 0,
    bookPage: safePdfPage - (start - 1),
  };
}

/**
 * Maps a logical textbook page (Page 1, Page 2, ...) back to physical PDF page index.
 */
export function bookPageToPdfPage(
  bookPage: number,
  totalPdfPages: number,
  contentStartPdfPage?: number | null,
): number {
  const safeTotal = Math.max(1, Math.floor(Number(totalPdfPages) || 1));
  const start = normalizeContentStartPage(contentStartPdfPage, safeTotal);
  const requested = Math.floor(Number(bookPage) || 1);
  if (requested < 1) return 1;
  return Math.min(safeTotal, start - 1 + requested);
}
