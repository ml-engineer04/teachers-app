import { Book, Grade } from '@smartteacherbook/shared';
import { offlineStore } from './offlineStore';
import { DownloadedItem } from './downloadsManager';

const KEY_GRADES = 'catalog:grades_v1';
const KEY_SUBJECTS = 'catalog:subjects_v1';
const KEY_BOOKS = 'catalog:books_v1';
const KEY_PROGRESS = 'catalog:progress_v1';

class OfflineCatalogCache {
  private memGrades: Grade[] | null = null;
  private memSubjects: any[] | null = null;
  private memBooks: Book[] | null = null;
  private memProgress: any[] | null = null;

  getGradesSync(): Grade[] | null {
    return this.memGrades;
  }

  async saveGrades(grades: Grade[]): Promise<void> {
    if (Array.isArray(grades) && grades.length > 0) {
      this.memGrades = grades;
      await offlineStore.putJson(KEY_GRADES, grades).catch(() => {});
    }
  }

  async getGrades(): Promise<Grade[] | null> {
    if (this.memGrades !== null) return this.memGrades;
    const data = await offlineStore.getJson<Grade[]>(KEY_GRADES);
    if (data) this.memGrades = data;
    return data;
  }

  getSubjectsSync(): any[] | null {
    return this.memSubjects;
  }

  async saveSubjects(subjects: any[]): Promise<void> {
    if (Array.isArray(subjects) && subjects.length > 0) {
      this.memSubjects = subjects;
      await offlineStore.putJson(KEY_SUBJECTS, subjects).catch(() => {});
    }
  }

  async getSubjects(): Promise<any[] | null> {
    if (this.memSubjects !== null) return this.memSubjects;
    const data = await offlineStore.getJson<any[]>(KEY_SUBJECTS);
    if (data) this.memSubjects = data;
    return data;
  }

  getBooksSync(): Book[] | null {
    return this.memBooks;
  }

  async saveBooks(books: Book[]): Promise<void> {
    if (Array.isArray(books) && books.length > 0) {
      this.memBooks = books;
      await offlineStore.putJson(KEY_BOOKS, books).catch(() => {});
    }
  }

  async getBooks(): Promise<Book[] | null> {
    if (this.memBooks !== null) return this.memBooks;
    const data = await offlineStore.getJson<Book[]>(KEY_BOOKS);
    if (data) this.memBooks = data;
    return data;
  }

  getProgressSync(): any[] | null {
    return this.memProgress;
  }

  async saveProgress(progress: any[]): Promise<void> {
    if (Array.isArray(progress)) {
      this.memProgress = progress;
      await offlineStore.putJson(KEY_PROGRESS, progress).catch(() => {});
    }
  }

  async getProgress(): Promise<any[] | null> {
    if (this.memProgress !== null) return this.memProgress;
    const data = await offlineStore.getJson<any[]>(KEY_PROGRESS);
    if (data) this.memProgress = data;
    return data;
  }

  async preload(): Promise<void> {
    await Promise.all([
      this.getGrades(),
      this.getSubjects(),
      this.getBooks(),
      this.getProgress(),
    ]).catch(() => {});
  }

  clearMemoryCache(): void {
    this.memGrades = null;
    this.memSubjects = null;
    this.memBooks = null;
    this.memProgress = null;
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
