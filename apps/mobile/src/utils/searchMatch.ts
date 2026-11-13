import { Book } from '@smartteacherbook/shared';
import {
  localizeBookType,
  localizeGradeLabel,
  localizeSubjectName,
} from '../i18n/translations';

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
  ә: 'a',
  і: 'i',
  ң: 'ng',
  ү: 'u',
  ұ: 'u',
};

const SUBJECT_SYNONYMS: Record<string, string[]> = {
  eng: ['ingliz', 'english', 'английский', 'eng', 'chet tili', 'foreign language'],
  math: ['matematika', 'math', 'mathematics', 'математика', 'algebra', 'geometriya'],
  phys: ['fizika', 'physics', 'физика'],
  uzb: ['ona tili', 'uzbek', 'ozbek', 'родной язык', 'узбекский', 'adabiyot'],
  rus: ['rus tili', 'russian', 'русский язык'],
  bio: ['biologiya', 'biology', 'биология'],
  chem: ['kimyo', 'chemistry', 'химия'],
  hist: ['tarix', 'history', 'история'],
  geo: ['geografiya', 'geography', 'география'],
  it: ['informatika', 'informatics', 'информатика', 'kompyuter'],
};

const BOOK_TYPE_ALIASES: Record<string, string[]> = {
  STUDENT_BOOK: ['darslik', 'student book', 'учебник', 'asosiy kitob'],
  TEACHER_BOOK: ['oqituvchi kitobi', 'teacher book', 'metodika', 'metodik', 'книга для учителя'],
  WORKBOOK: ['ishchi daftar', 'mashq daftari', 'workbook', 'рабочая тетрадь'],
};

/**
 * Normalizes Latin/Cyrillic text, apostrophes, and punctuation for forgiving multilingual search.
 */
export function normalizeSearchText(raw: string | null | undefined): string {
  if (!raw) return '';
  const lowered = String(raw)
    .toLowerCase()
    .replace(/['‘’`ʼʻ´]/g, '')
    .replace(/[-–—_./\\•·,;:!?()[\]{}]+/g, ' ');

  let out = '';
  for (let i = 0; i < lowered.length; i += 1) {
    const ch = lowered[i];
    out += CYRILLIC_TO_LATIN[ch] ?? ch;
  }

  return out.replace(/\s+/g, ' ').trim();
}

export function tokenizeSearchQuery(query: string): string[] {
  const norm = normalizeSearchText(query);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

function collectSubjectSearchTerms(
  subjectId: string | undefined | null,
  subjects: Array<{ id?: string; code?: string; name?: string }>,
): string[] {
  const terms: string[] = [];
  if (subjectId) terms.push(subjectId);

  const rawLower = (subjectId || '').toLowerCase();
  const matched = subjects.find(
    (s) =>
      s.id === subjectId ||
      (s.code && s.code.toLowerCase() === rawLower) ||
      (s.code && rawLower.includes(s.code.toLowerCase())),
  );

  if (matched) {
    if (matched.id) terms.push(matched.id);
    if (matched.code) terms.push(matched.code);
    if (matched.name) terms.push(matched.name);
  }

  const resolvedId = matched?.id || subjectId || undefined;
  terms.push(
    localizeSubjectName(matched?.name, 'uz', resolvedId),
    localizeSubjectName(matched?.name, 'ru', resolvedId),
    localizeSubjectName(matched?.name, 'en', resolvedId),
  );

  const keySource = `${matched?.code || ''} ${matched?.id || ''} ${subjectId || ''}`.toLowerCase();
  for (const [key, aliases] of Object.entries(SUBJECT_SYNONYMS)) {
    if (keySource.includes(key)) {
      terms.push(...aliases);
    }
  }

  return terms;
}

function matchesNormalizedHaystack(
  rawParts: Array<string | number | null | undefined>,
  query: string,
): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return false;

  const haystack = normalizeSearchText(rawParts.filter((v) => v !== null && v !== undefined).join(' '));
  if (!haystack) return false;

  const compactHaystack = haystack.replace(/\s+/g, '');
  if (tokens.every((tok) => haystack.includes(tok) || compactHaystack.includes(tok))) {
    return true;
  }

  const compactQuery = tokens.join('');
  return compactQuery.length > 0 && compactHaystack.includes(compactQuery);
}

export function buildBookSearchHaystackParts(
  book: Pick<Book, 'title' | 'gradeId' | 'subjectId' | 'type'> & { description?: string },
  subjects: Array<{ id?: string; code?: string; name?: string }> = [],
): Array<string | number> {
  const parts: Array<string | number> = [book.title || ''];
  if (book.description) parts.push(book.description);

  if (typeof book.gradeId === 'number' && !Number.isNaN(book.gradeId)) {
    parts.push(
      book.gradeId,
      localizeGradeLabel(book.gradeId, 'uz'),
      localizeGradeLabel(book.gradeId, 'ru'),
      localizeGradeLabel(book.gradeId, 'en'),
      `${book.gradeId} sinf`,
      `${book.gradeId} klass`,
      `grade ${book.gradeId}`,
    );
  }

  parts.push(...collectSubjectSearchTerms(book.subjectId, subjects));

  const bookType = book.type || 'STUDENT_BOOK';
  parts.push(
    bookType,
    localizeBookType(bookType, 'uz'),
    localizeBookType(bookType, 'ru'),
    localizeBookType(bookType, 'en'),
    ...(BOOK_TYPE_ALIASES[bookType] || []),
  );

  return parts;
}

export function matchesBookSearch(
  book: Pick<Book, 'title' | 'gradeId' | 'subjectId' | 'type'> & { description?: string },
  query: string,
  subjects: Array<{ id?: string; code?: string; name?: string }> = [],
): boolean {
  return matchesNormalizedHaystack(buildBookSearchHaystackParts(book, subjects), query);
}

export function matchesGradeSearch(
  gradeNum: number,
  query: string,
  subjectIds: Array<string | undefined | null> = [],
  subjects: Array<{ id?: string; code?: string; name?: string }> = [],
): boolean {
  const parts: Array<string | number> = [
    gradeNum,
    localizeGradeLabel(gradeNum, 'uz'),
    localizeGradeLabel(gradeNum, 'ru'),
    localizeGradeLabel(gradeNum, 'en'),
    `${gradeNum} sinf`,
    `${gradeNum} klass`,
    `grade ${gradeNum}`,
  ];
  for (const sid of subjectIds) {
    parts.push(...collectSubjectSearchTerms(sid, subjects));
  }
  return matchesNormalizedHaystack(parts, query);
}
