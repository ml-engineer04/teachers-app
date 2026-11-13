import { Book, Grade } from '@smartteacherbook/shared';
import { offlineStore } from './offlineStore';
import { DownloadedItem } from './downloadsManager';

const KEY_GRADES = 'catalog:grades_v1';
const KEY_SUBJECTS = 'catalog:subjects_v1';
const KEY_BOOKS = 'catalog:books_v1';
const KEY_PROGRESS = 'catalog:progress_v1';

class OfflineCatalogCache {
  async saveGrades(grades: Grade[]): Promise<void> {
    if (Array.isArray(grades) && grades.length > 0) {
      await offlineStore.putJson(KEY_GRADES, grades).catch(() => {});
    }
  }

  async getGrades(): Promise<Grade[] | null> {
    return offlineStore.getJson<Grade[]>(KEY_GRADES);
  }

  async saveSubjects(subjects: any[]): Promise<void> {
    if (Array.isArray(subjects) && subjects.length > 0) {
      await offlineStore.putJson(KEY_SUBJECTS, subjects).catch(() => {});
    }
  }

  async getSubjects(): Promise<any[] | null> {
    return offlineStore.getJson<any[]>(KEY_SUBJECTS);
  }

  async saveBooks(books: Book[]): Promise<void> {
    if (Array.isArray(books) && books.length > 0) {
      await offlineStore.putJson(KEY_BOOKS, books).catch(() => {});
    }
  }

  async getBooks(): Promise<Book[] | null> {
    return offlineStore.getJson<Book[]>(KEY_BOOKS);
  }

  async saveProgress(progress: any[]): Promise<void> {
    if (Array.isArray(progress)) {
      await offlineStore.putJson(KEY_PROGRESS, progress).catch(() => {});
    }
  }

  async getProgress(): Promise<any[] | null> {
    return offlineStore.getJson<any[]>(KEY_PROGRESS);
  }

  mergeBooksWithDownloads(cachedBooks: Book[] | null | undefined, downloaded: DownloadedItem[]): Book[] {
    const bookMap = new Map<string, Book>();
    (cachedBooks || []).forEach((b) => bookMap.set(b.id, b));
    downloaded.forEach((dl) => {
      if (!bookMap.has(dl.bookId)) {
        bookMap.set(dl.bookId, {
          id: dl.bookId,
          title: dl.title,
          gradeId: dl.gradeId,
          subjectId: dl.subjectId || dl.subjectCode || 'sub_eng',
          totalPages: dl.totalPages || 6,
          totalSizeBytes: dl.sizeBytes,
          coverImageUrl: dl.coverImageUrl,
          type: (dl.bookType as any) || 'STUDENT_BOOK',
          status: 'PUBLISHED' as any,
          version: 1,
          createdAt: dl.downloadedAt,
          updatedAt: dl.downloadedAt,
        });
      }
    });
    return Array.from(bookMap.values());
  }
}

export const offlineCatalogCache = new OfflineCatalogCache();
