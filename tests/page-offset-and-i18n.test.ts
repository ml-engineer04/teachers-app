import {
  bookPageToPdfPage,
  getBookContentTotalPages,
  normalizeContentStartPage,
  pdfPageToBookDisplay,
} from '../packages/shared/src/utils/pageOffset';
import {
  interpolate,
  localizeBookType,
  localizeGradeLabel,
  localizeSubjectName,
  TRANSLATIONS,
} from '../apps/mobile/src/i18n/translations';
import {
  matchesBookSearch,
  matchesGradeSearch,
} from '../apps/mobile/src/utils/searchMatch';

function collectLeafKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function getByPath(obj: Record<string, any>, path: string): unknown {
  return path.split('.').reduce<any>((acc, seg) => (acc ? acc[seg] : undefined), obj);
}

export async function runPageOffsetAndI18nTests(): Promise<
  { name: string; passed: boolean; details: string }[]
> {
  const results: { name: string; passed: boolean; details: string }[] = [];

  // 1. Page offset front-matter & content Page 1 calculation
  const totalPdf = 115;
  const startPdf = 5;
  const normalizedStart = normalizeContentStartPage(startPdf, totalPdf);
  const contentTotal = getBookContentTotalPages(totalPdf, startPdf);
  const front3 = pdfPageToBookDisplay(3, totalPdf, startPdf);
  const page1 = pdfPageToBookDisplay(5, totalPdf, startPdf);
  const page10 = pdfPageToBookDisplay(14, totalPdf, startPdf);
  const roundTrip10 = bookPageToPdfPage(10, totalPdf, startPdf);

  const offsetOk =
    normalizedStart === 5 &&
    contentTotal === 111 &&
    front3.isFrontMatter === true &&
    front3.frontMatterIndex === 3 &&
    front3.bookPage === null &&
    page1.isFrontMatter === false &&
    page1.bookPage === 1 &&
    page10.bookPage === 10 &&
    roundTrip10 === 14;

  results.push({
    name: 'Maps contentStartPdfPage front matter, Page 1 start, and inverse jump accurately',
    passed: offsetOk,
    details: `contentTotal=${contentTotal}, front3=${front3.frontMatterIndex}, page1=${page1.bookPage}, roundTrip10=${roundTrip10}`,
  });

  // 2. Clamping and default start=1 behavior
  const clampedStart = normalizeContentStartPage(999, 40);
  const clampedPdf = bookPageToPdfPage(999, 40, 4);
  const defaultInfo = pdfPageToBookDisplay(7, 40, undefined);
  const clampOk = clampedStart === 40 && clampedPdf === 40 && defaultInfo.bookPage === 7 && !defaultInfo.isFrontMatter;

  results.push({
    name: 'Clamps out-of-range page numbers and preserves default offset=1',
    passed: clampOk,
    details: `clampedStart=${clampedStart}, clampedPdf=${clampedPdf}, defaultBookPage=${defaultInfo.bookPage}`,
  });

  // 3. Full trilingual dictionary parity across uz / ru / en
  const uzKeys = collectLeafKeys(TRANSLATIONS.uz);
  const ruKeys = collectLeafKeys(TRANSLATIONS.ru);
  const enKeys = collectLeafKeys(TRANSLATIONS.en);

  const missingInRu = uzKeys.filter((k) => !ruKeys.includes(k));
  const missingInEn = uzKeys.filter((k) => !enKeys.includes(k));
  const emptyLeaves = (['uz', 'ru', 'en'] as const).flatMap((lang) =>
    uzKeys
      .map((k) => {
        const val = getByPath(TRANSLATIONS[lang], k);
        return typeof val === 'string' && val.trim().length > 0 ? null : `${lang}:${k}`;
      })
      .filter(Boolean),
  );

  results.push({
    name: 'Maintains 100% non-empty trilingual key parity across uz, ru, and en dictionaries',
    passed: missingInRu.length === 0 && missingInEn.length === 0 && emptyLeaves.length === 0 && uzKeys.length > 100,
    details: `keys=${uzKeys.length}, missingRu=${missingInRu.length}, missingEn=${missingInEn.length}, empty=${emptyLeaves.length}`,
  });

  // 4. Subject, book type, grade, and template interpolation across all 3 languages
  const subjectCheck =
    localizeSubjectName('Matematika', 'uz') === 'Matematika' &&
    localizeSubjectName('Matematika', 'ru') === 'Математика' &&
    localizeSubjectName('Matematika', 'en') === 'Mathematics';
  const gradeCheck =
    localizeGradeLabel(5, 'uz') === '5-sinf' &&
    localizeGradeLabel(5, 'ru') === '5 класс' &&
    localizeGradeLabel(5, 'en') === 'Grade 5';
  const bookTypeCheck =
    localizeBookType('WORKBOOK', 'uz') === 'Mashq daftari' &&
    localizeBookType('WORKBOOK', 'ru') === 'Рабочая тетрадь' &&
    localizeBookType('WORKBOOK', 'en') === 'Workbook';
  const interpCheck = interpolate('Hello {name} ({count})', { name: 'Ali', count: 3 }) === 'Hello Ali (3)';

  results.push({
    name: 'Localizes subjects, grades, book types, and template variables across uz/ru/en',
    passed: subjectCheck && gradeCheck && bookTypeCheck && interpCheck,
    details: `subject=${subjectCheck}, grade=${gradeCheck}, type=${bookTypeCheck}, interp=${interpCheck}`,
  });

  // 5. Multilingual / Cyrillic / apostrophe-tolerant search matching
  const sampleSubjects = [
    { id: 'sub_eng', code: 'ENG', name: 'Ingliz tili' },
    { id: 'sub_uzb', code: 'UZB', name: 'Ona tili' },
  ];
  const sampleBook = {
    title: "O‘qituvchi metodik qo‘llanmasi 5",
    gradeId: 5,
    subjectId: 'sub_eng',
    type: 'TEACHER_BOOK' as any,
  };
  const searchChecks =
    matchesBookSearch(sampleBook, "oqituvchi 5", sampleSubjects) &&
    matchesBookSearch(sampleBook, 'инглиз 5', sampleSubjects) &&
    matchesBookSearch(sampleBook, 'english teacher book', sampleSubjects) &&
    matchesBookSearch(sampleBook, '5-sinf darslik?', sampleSubjects) === false &&
    matchesBookSearch(sampleBook, '5sinf metodika', sampleSubjects) &&
    matchesGradeSearch(5, '5 класс', ['sub_eng'], sampleSubjects) &&
    matchesGradeSearch(5, 'english', ['sub_eng'], sampleSubjects);

  results.push({
    name: 'Matches books & grades across Latin/Cyrillic, apostrophe variants, and uz/ru/en terms',
    passed: searchChecks,
    details: `searchChecks=${searchChecks}`,
  });

  return results;
}
