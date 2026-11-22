import { Book, Grade } from '@smartteacherbook/shared';
import { mobileApi } from '../api/mobileApi';
import { offlineCatalogCache } from '../storage/offlineCatalogCache';

const CATALOG_TTL_MS = 5 * 60 * 1000; // 5 minutes freshness

class CatalogService {
  private lastGradesFetch = 0;
  private lastSubjectsFetch = 0;
  private lastBooksFetch = 0;
  private pricingCache = new Map<string, { data: any[]; timestamp: number }>();

  private inFlightGrades: Promise<Grade[]> | null = null;
  private inFlightSubjects: Promise<any[]> | null = null;
  private inFlightBooks: Promise<Book[]> | null = null;
  private inFlightPricing = new Map<string, Promise<any[]>>();

  // ---------------------------------------------------------------------------
  // GRADES
  // ---------------------------------------------------------------------------
  async getGrades(force = false): Promise<Grade[]> {
    const cachedSync = offlineCatalogCache.getGradesSync();
    const now = Date.now();
    const isFresh = cachedSync && cachedSync.length > 0 && now - this.lastGradesFetch < CATALOG_TTL_MS;

    if (!force && isFresh) {
      return cachedSync;
    }

    if (this.inFlightGrades) {
      return this.inFlightGrades;
    }

    this.inFlightGrades = (async () => {
      try {
        const networkGrades = await mobileApi.getGrades();
        if (Array.isArray(networkGrades) && networkGrades.length > 0) {
          await offlineCatalogCache.saveGrades(networkGrades);
          this.lastGradesFetch = Date.now();
          return networkGrades;
        }
      } catch (err) {
        // Return cached grades if available
        const fallback = (await offlineCatalogCache.getGrades()) || cachedSync;
        if (fallback && fallback.length > 0) return fallback;
        throw err;
      } finally {
        this.inFlightGrades = null;
      }
      return (await offlineCatalogCache.getGrades()) || [];
    })();

    return this.inFlightGrades;
  }

  // ---------------------------------------------------------------------------
  // SUBJECTS
  // ---------------------------------------------------------------------------
  async getSubjects(force = false): Promise<any[]> {
    const cachedSync = offlineCatalogCache.getSubjectsSync();
    const now = Date.now();
    const isFresh = cachedSync && cachedSync.length > 0 && now - this.lastSubjectsFetch < CATALOG_TTL_MS;

    if (!force && isFresh) {
      return cachedSync;
    }

    if (this.inFlightSubjects) {
      return this.inFlightSubjects;
    }

    this.inFlightSubjects = (async () => {
      try {
        const networkSubjects = await mobileApi.getSubjects();
        if (Array.isArray(networkSubjects) && networkSubjects.length > 0) {
          await offlineCatalogCache.saveSubjects(networkSubjects);
          this.lastSubjectsFetch = Date.now();
          return networkSubjects;
        }
      } catch (err) {
        const fallback = (await offlineCatalogCache.getSubjects()) || cachedSync;
        if (fallback && fallback.length > 0) return fallback;
        throw err;
      } finally {
        this.inFlightSubjects = null;
      }
      return (await offlineCatalogCache.getSubjects()) || [];
    })();

    return this.inFlightSubjects;
  }

  // ---------------------------------------------------------------------------
  // BOOKS
  // ---------------------------------------------------------------------------
  async getBooks(force = false): Promise<Book[]> {
    const cachedSync = offlineCatalogCache.getBooksSync();
    const now = Date.now();
    const isFresh = cachedSync && cachedSync.length > 0 && now - this.lastBooksFetch < CATALOG_TTL_MS;

    if (!force && isFresh) {
      return cachedSync;
    }

    if (this.inFlightBooks) {
      return this.inFlightBooks;
    }

    this.inFlightBooks = (async () => {
      try {
        const networkBooks = await mobileApi.getAllBooks();
        if (Array.isArray(networkBooks) && networkBooks.length > 0) {
          await offlineCatalogCache.saveBooks(networkBooks);
          this.lastBooksFetch = Date.now();
          return networkBooks;
        }
      } catch (err) {
        const fallback = (await offlineCatalogCache.getBooks()) || cachedSync;
        if (fallback && fallback.length > 0) return fallback;
        throw err;
      } finally {
        this.inFlightBooks = null;
      }
      return (await offlineCatalogCache.getBooks()) || [];
    })();

    return this.inFlightBooks;
  }

  // ---------------------------------------------------------------------------
  // PRICING PLANS
  // ---------------------------------------------------------------------------
  async getPricingPlans(gradeId?: number, subjectId?: string, force = false): Promise<any[]> {
    const key = `${gradeId || 'all'}:${subjectId || 'all'}`;
    const now = Date.now();
    const cached = this.pricingCache.get(key);

    if (!force && cached && now - cached.timestamp < CATALOG_TTL_MS) {
      return cached.data;
    }

    const inFlight = this.inFlightPricing.get(key);
    if (inFlight) {
      return inFlight;
    }

    const fetchPromise = (async () => {
      try {
        const plans = await mobileApi.getPricingPlans(gradeId, subjectId);
        if (Array.isArray(plans)) {
          this.pricingCache.set(key, { data: plans, timestamp: Date.now() });
          return plans;
        }
      } catch (err) {
        if (cached) return cached.data;
        throw err;
      } finally {
        this.inFlightPricing.delete(key);
      }
      return cached?.data || [];
    })();

    this.inFlightPricing.set(key, fetchPromise);
    return fetchPromise;
  }

  // ---------------------------------------------------------------------------
  // INVALIDATION & SYNC
  // ---------------------------------------------------------------------------
  invalidateAll(): void {
    this.lastGradesFetch = 0;
    this.lastSubjectsFetch = 0;
    this.lastBooksFetch = 0;
    this.pricingCache.clear();
  }
}

export const catalogService = new CatalogService();
