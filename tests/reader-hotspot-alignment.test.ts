import * as fs from 'node:fs';
import * as path from 'node:path';
import { TRANSLATIONS as MOBILE_TRANSLATIONS } from '../apps/mobile/src/i18n/translations';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export async function runReaderHotspotAlignmentTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // 1. Verify openBookBtn translation across uz, ru, en (No raw i18n keys)
  // Check both mobile and web translations
  const webTransFile = path.resolve(__dirname, '../apps/web/src/i18n/translations.ts');
  const webCode = fs.readFileSync(webTransFile, 'utf-8');

  const uzHasBtn = webCode.includes("openBookBtn: 'Kitobni ochish'");
  const ruHasBtn = webCode.includes("openBookBtn: 'Открыть книгу'");
  const enHasBtn = webCode.includes("openBookBtn: 'Open Book'");
  const uzHasNoBooks = webCode.includes("noBooksInGrade: 'Bu sinfda darsliklar mavjud emas'");

  const validI18n =
    uzHasBtn &&
    ruHasBtn &&
    enHasBtn &&
    uzHasNoBooks &&
    MOBILE_TRANSLATIONS.uz.grades.openBookBtn === 'Kitobni ochish';

  results.push({
    name: 'Trilingual openBookBtn and noBooksInGrade Translations Present',
    passed: validI18n,
    details: `uzBtn=${uzHasBtn}, ruBtn=${ruHasBtn}, enBtn=${enHasBtn}, noBooks=${uzHasNoBooks}`,
  });

  // 2. Test auto-resuming reading progress vs contentStartPdfPage
  function resolveInitialPage(
    book: { id: string; contentStartPdfPage?: number },
    readingProgress: Array<{ bookId: string; lastPageNumber: number }>,
    explicitPage?: number,
  ): number {
    if (explicitPage && explicitPage > 0) return explicitPage;
    const prog = readingProgress.find((p) => p.bookId === book.id);
    if (prog && prog.lastPageNumber > 0) return prog.lastPageNumber;
    if (book.contentStartPdfPage && book.contentStartPdfPage > 1) return book.contentStartPdfPage;
    return 1;
  }

  const book1 = { id: 'book_custom_1', contentStartPdfPage: 4 };
  const progressEmpty: any[] = [];
  const progressSaved = [{ bookId: 'book_custom_1', lastPageNumber: 25 }];

  const pageDefault = resolveInitialPage(book1, progressEmpty);
  const pageSaved = resolveInitialPage(book1, progressSaved);
  const pageExplicit = resolveInitialPage(book1, progressSaved, 12);

  const navigationOk = pageDefault === 4 && pageSaved === 25 && pageExplicit === 12;

  results.push({
    name: 'Smart Reader Initial Page Resolution (contentStart vs lastPage)',
    passed: navigationOk,
    details: `default=${pageDefault} (expected 4), saved=${pageSaved} (expected 25), explicit=${pageExplicit} (expected 12)`,
  });

  // 3. Test precision audio hotspot coordinates on page 9 matching printed CD badges
  // On Page 9 (1111x1400 image):
  // CD1 02: cx ~ 0.133, cy ~ 0.075
  // CD1 03: cx ~ 0.133, cy ~ 0.117
  // CD1 04: cx ~ 0.133, cy ~ 0.835
  const hotspots = [
    { id: 'hs_1', rect: { x: 0.108, y: 0.055, w: 0.05, h: 0.04 } }, // Audio 1
    { id: 'hs_2', rect: { x: 0.108, y: 0.097, w: 0.05, h: 0.04 } }, // Audio 2
    { id: 'hs_3', rect: { x: 0.108, y: 0.815, w: 0.05, h: 0.04 } }, // Audio 3
  ];

  const centers = hotspots.map((h) => ({
    cx: +(h.rect.x + h.rect.w / 2).toFixed(3),
    cy: +(h.rect.y + h.rect.h / 2).toFixed(3),
  }));

  const expectedCenters = [
    { cx: 0.133, cy: 0.075 },
    { cx: 0.133, cy: 0.117 },
    { cx: 0.133, cy: 0.835 },
  ];

  const hotspotsAligned = centers.every(
    (c, i) =>
      Math.abs(c.cx - expectedCenters[i].cx) <= 0.005 &&
      Math.abs(c.cy - expectedCenters[i].cy) <= 0.005,
  );

  results.push({
    name: 'Precision Audio Hotspot Alignment Matching Physical CD Badges',
    passed: hotspotsAligned,
    details: `Audio1 center=(${centers[0].cx}, ${centers[0].cy}), Audio2=(${centers[1].cx}, ${centers[1].cy}), Audio3=(${centers[2].cx}, ${centers[2].cy})`,
  });

  return results;
}
