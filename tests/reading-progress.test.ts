import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  clampBookPage,
  mergeReadingProgressLists,
  normalizeProgressUserKey,
  resolveInitialBookPage,
} from '../apps/mobile/src/utils/readingProgressHelpers';
import { ContentService } from '../apps/api/src/modules/content/content.service';
import { ContentController } from '../apps/api/src/modules/content/content.controller';

export async function runReadingProgressTests(): Promise<
  { name: string; passed: boolean; details: string }[]
> {
  const results: { name: string; passed: boolean; details: string }[] = [];

  // 1. Saved page 30 resumes accurately when re-opening from Catalog (initialPage undefined) or Home fallback
  const catalogReopenPage = resolveInitialBookPage({
    explicitInitialPage: undefined,
    localEntry: {
      bookId: 'book_eng_5',
      lastPageNumber: 30,
      lastOpenedAt: '2026-11-12T10:00:00.000Z',
    },
    remoteEntry: null,
    totalPages: 110,
  });
  const staleDefaultReopenPage = resolveInitialBookPage({
    explicitInitialPage: 1,
    localEntry: {
      bookId: 'book_eng_5',
      lastPageNumber: 30,
      lastOpenedAt: '2026-11-12T10:00:00.000Z',
    },
    remoteEntry: {
      bookId: 'book_eng_5',
      lastPageNumber: 5,
      lastOpenedAt: '2026-11-12T08:00:00.000Z',
    },
    totalPages: 110,
  });
  results.push({
    name: 'Resume Saved Page 30 From Catalog / Home / Stale Defaults',
    passed: catalogReopenPage === 30 && staleDefaultReopenPage === 30,
    details: `Catalog reopen=${catalogReopenPage}, Stale default reopen=${staleDefaultReopenPage}`,
  });

  // 2. Freshest timestamp wins when syncing between offline device storage and server
  const remoteNewerPage = resolveInitialBookPage({
    explicitInitialPage: undefined,
    localEntry: {
      bookId: 'book_eng_5',
      lastPageNumber: 30,
      lastOpenedAt: '2026-11-12T09:00:00.000Z',
    },
    remoteEntry: {
      bookId: 'book_eng_5',
      lastPageNumber: 44,
      lastOpenedAt: '2026-11-12T11:30:00.000Z',
    },
    totalPages: 110,
  });
  const merged = mergeReadingProgressLists(
    [
      { bookId: 'book_eng_5', lastPageNumber: 30, lastOpenedAt: '2026-11-12T12:00:00.000Z' },
      { bookId: 'book_math_7', lastPageNumber: 12, lastOpenedAt: '2026-11-12T07:00:00.000Z' },
    ],
    [
      { bookId: 'book_eng_5', lastPageNumber: 8, lastOpenedAt: '2026-11-12T06:00:00.000Z' },
      { bookId: 'book_phys_9', lastPageNumber: 19, lastOpenedAt: '2026-11-12T09:00:00.000Z' },
    ],
  );
  results.push({
    name: 'Offline vs Remote Progress Merge Keeps Newest Timestamp Per Book',
    passed:
      remoteNewerPage === 44 &&
      merged.length === 3 &&
      merged[0].bookId === 'book_eng_5' &&
      merged[0].lastPageNumber === 30 &&
      merged[1].bookId === 'book_phys_9',
    details: `Remote newer=${remoteNewerPage}, Top merged=${merged[0]?.bookId}@${merged[0]?.lastPageNumber}`,
  });

  // 3. Page bounds clamping & consistent user key normalization
  const keyOk =
    normalizeProgressUserKey('  Teacher@School.UZ ') === 'teacher@school.uz' &&
    normalizeProgressUserKey('') === 'guest' &&
    normalizeProgressUserKey(undefined) === 'guest';
  const clampOk =
    clampBookPage(30, 110) === 30 &&
    clampBookPage(999, 110) === 110 &&
    clampBookPage(0, 110) === 1 &&
    clampBookPage(NaN, 110) === 1;
  results.push({
    name: 'User Key Normalization & Page Clamping Boundaries',
    passed: keyOk && clampOk,
    details: `keyOk=${keyOk}, clampOk=${clampOk}`,
  });

  // 4. Backend ContentService saves page 30 without truncating to 6 & survives restart
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stb-progress-test-'));
  let restartOk = false;
  let restoredPageFromDisk = 0;
  try {
    process.chdir(tempDir);
    const mockPrisma = { isConnected: false } as any;
    const mockWorker = {} as any;
    const svc1 = new ContentService(mockPrisma, mockWorker);
    const saved = await svc1.saveUserReadingProgress('teacher_user_1', 'book_demo_english_4', 30);

    // Simulate API process restart by creating a new ContentService instance
    const svc2 = new ContentService(mockPrisma, mockWorker);
    const listAfterRestart = await svc2.getUserReadingProgress('teacher_user_1');
    restoredPageFromDisk = listAfterRestart[0]?.lastPageNumber || 0;
    restartOk = saved.lastPageNumber === 30 && restoredPageFromDisk === 30;
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  results.push({
    name: 'Backend ContentService Persists Page 30 Across Process Restarts',
    passed: restartOk,
    details: `Page after restart=${restoredPageFromDisk}`,
  });

  // 5. Controller endpoints save/restore page 30 for a 110-page book and never downgrade on reopen
  const ctrlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stb-ctrl-progress-'));
  let controllerFlowOk = false;
  let ctrlDetails = '';
  try {
    process.chdir(ctrlDir);
    const svc = new ContentService({ isConnected: false } as any, {} as any);
    const controller = new ContentController(svc);
    const userCtx = { userId: 'usr_teacher_30' };

    const book = await svc.createBook({
      title: 'Ingliz tili 5-sinf',
      gradeId: 5,
      subjectId: 'sub_eng',
      totalPages: 110,
      type: 'STUDENT_BOOK',
    } as any);

    await controller.saveProgress({ bookId: book.id, lastPageNumber: 30 }, userCtx);

    // Simulate process restart + re-opening book from Catalog (initialPage undefined)
    const restartedSvc = new ContentService({ isConnected: false } as any, {} as any);
    const restartedController = new ContentController(restartedSvc);
    const remoteList = await restartedController.getProgress(userCtx);
    const remoteEntry = remoteList.find((p: any) => p.bookId === book.id) || null;

    const reopenedFromCatalog = resolveInitialBookPage({
      explicitInitialPage: undefined,
      localEntry: null,
      remoteEntry,
      totalPages: 110,
    });
    const reopenedFromOfflineDevice = resolveInitialBookPage({
      explicitInitialPage: undefined,
      localEntry: {
        bookId: book.id,
        lastPageNumber: 30,
        lastOpenedAt: '2026-11-12T10:30:00.000Z',
      },
      remoteEntry: null,
      totalPages: 110,
    });

    controllerFlowOk =
      remoteEntry?.lastPageNumber === 30 &&
      reopenedFromCatalog === 30 &&
      reopenedFromOfflineDevice === 30;
    ctrlDetails = `Saved=${remoteEntry?.lastPageNumber}, Catalog=${reopenedFromCatalog}, Offline=${reopenedFromOfflineDevice}`;
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(ctrlDir, { recursive: true, force: true });
  }

  results.push({
    name: 'ContentController End-to-End Save/Get Progress & Multi-Entry Restore at Page 30',
    passed: controllerFlowOk,
    details: ctrlDetails,
  });

  return results;
}
