import {
  denormalizeStrokePoints,
  doesPointHitStroke,
  mergeBookDrawings,
  pointsToSmoothSvgPath,
  resolveMergedBookmarks,
  resolveMergedNotes,
  toNormalizedPoint,
} from '../apps/mobile/src/utils/annotationHelpers';
import {
  evaluateGradeAccessExpiry,
  GradeAccessInfo,
  isGradeAccessValid,
} from '../apps/mobile/src/utils/subscriptionHelpers';
import { ContentService } from '../apps/api/src/modules/content/content.service';
import { SubjectsService } from '../apps/api/src/modules/subjects/subjects.service';
import { GradesService } from '../apps/api/src/modules/grades/grades.service';
import { UsersService } from '../apps/api/src/modules/users/users.service';
import { LicenseSignerService } from '../apps/api/src/modules/subscriptions/license-signer.service';
import { SubscriptionsService } from '../apps/api/src/modules/subscriptions/subscriptions.service';
import { RequestsService } from '../apps/api/src/modules/requests/requests.service';

export async function runAnnotationsAndSubscriptionLockTests(): Promise<
  { name: string; passed: boolean; details: string }[]
> {
  const results: { name: string; passed: boolean; details: string }[] = [];

  // 1. Device-local marker drawings, bookmarks, and notes persist across reload/expiry without touching untouched pages
  const localPayload = {
    updatedAt: '2026-11-12T10:00:00.000Z',
    modifiedPages: [30, 31],
    drawings: {
      30: [
        {
          id: 'st_30_marker',
          tool: 'HIGHLIGHTER' as const,
          color: '#F59E0B',
          strokeWidth: 18,
          points: [
            { x: 40, y: 120 },
            { x: 180, y: 120 },
          ],
        },
      ],
      31: [], // User deliberately erased page 31
    },
    bookmarksModified: true,
    bookmarks: [{ pageNumber: 30, title: 'Unit 3 • 30-sahifa' }],
    notesModified: true,
    notes: [{ id: 'nt_local_1', pageNumber: 30, text: 'Uyga vazifa tushuntirildi' }],
  };

  const mergedDrawings = mergeBookDrawings({
    localPayload,
    offlineDrawList: [
      {
        pageNumber: 31,
        strokes: [{ id: 'old_31', tool: 'PEN', color: '#DC2626', strokeWidth: 3.5, points: [{ x: 10, y: 10 }] }],
      },
      {
        pageNumber: 5,
        strokes: [{ id: 'sync_5', tool: 'PEN', color: '#2563EB', strokeWidth: 3.5, points: [{ x: 20, y: 20 }] }],
      },
    ],
    remoteDrawList: [],
  });
  const mergedBm = resolveMergedBookmarks({ localPayload, remoteBookmarks: [] });
  const mergedNotes = resolveMergedNotes({ localPayload, remoteNotes: [] });

  const localPreserved =
    mergedDrawings[30]?.length === 1 &&
    mergedDrawings[30][0].id === 'st_30_marker' &&
    mergedDrawings[31]?.length === 0 && // Deliberate local erase respected
    mergedDrawings[5]?.[0]?.id === 'sync_5' &&
    mergedBm.length === 1 &&
    mergedNotes.length === 1;

  results.push({
    name: 'Device-Local Marker Strokes, Bookmarks & Notes Persist Safely',
    passed: localPreserved,
    details: `Page30=${mergedDrawings[30]?.length}, Page31Erased=${mergedDrawings[31]?.length}, BM=${mergedBm.length}, Notes=${mergedNotes.length}`,
  });

  // 2. Automatic lock on monthly subscription expiry & unlock on reactivation
  const expiresAtIso = '2026-12-01T00:00:00.000Z';
  const beforeExpiryMs = Date.parse('2026-11-15T12:00:00.000Z');
  const afterExpiryMs = Date.parse('2026-12-02T00:00:00.000Z');

  const cachedActive: GradeAccessInfo = {
    gradeId: 5,
    status: 'ACTIVE',
    daysRemaining: 16,
    planName: '1 Oylik Obuna',
    expiresAt: expiresAtIso,
  };

  const validBefore = isGradeAccessValid(cachedActive, beforeExpiryMs);
  const evalAfter = evaluateGradeAccessExpiry(cachedActive, afterExpiryMs);
  const validAfter = isGradeAccessValid(cachedActive, afterExpiryMs);

  const renewedSub: GradeAccessInfo = {
    ...cachedActive,
    status: 'ACTIVE',
    daysRemaining: 30,
    expiresAt: '2027-01-02T00:00:00.000Z',
  };
  const validAfterRenewal = isGradeAccessValid(renewedSub, afterExpiryMs);

  results.push({
    name: 'Monthly Subscription Auto-Locks on Expiry & Re-Unlocks After Renewal',
    passed:
      validBefore === true &&
      evalAfter.status === 'EXPIRED' &&
      evalAfter.daysRemaining === 0 &&
      validAfter === false &&
      validAfterRenewal === true,
    details: `Before=${validBefore}, AfterExpiryStatus=${evalAfter.status}, ValidAfter=${validAfter}, AfterRenewal=${validAfterRenewal}`,
  });

  // 3. Backend ContentService isolates user drawings/notes from shared textbook Book & Hotspots
  const svc = new ContentService({ isConnected: false } as any, {} as any);
  const book = await svc.createBook({
    title: 'Matematika 6-sinf',
    gradeId: 6,
    subjectId: 'sub_math',
    totalPages: 80,
    type: 'STUDENT_BOOK',
  } as any);

  const initialHotspots = svc.getBookHotspots(book.id);
  svc.saveUserDrawings('teacher_a', book.id, 30, localPayload.drawings[30]);
  svc.addUserNote('teacher_a', book.id, 30, 'Shaxsiy eslatma');
  svc.addUserBookmark('teacher_a', book.id, 30, 'Mening xatcho‘pim');

  const teacherADrawings = svc.getUserDrawings('teacher_a', book.id, 30);
  const teacherBDrawings = svc.getUserDrawings('teacher_b', book.id, 30);
  const bookAfter = await svc.findById(book.id);
  const hotspotsAfter = svc.getBookHotspots(book.id);

  results.push({
    name: 'Teacher Annotations Never Mutate Shared Database Textbook or Other Users',
    passed:
      teacherADrawings.length === 1 &&
      teacherBDrawings.length === 0 &&
      bookAfter?.title === 'Matematika 6-sinf' &&
      hotspotsAfter.length === initialHotspots.length,
    details: `TeacherA=${teacherADrawings.length}, TeacherB=${teacherBDrawings.length}, Hotspots=${hotspotsAfter.length}`,
  });

  // 4. Marker Coordinate Normalization, Smooth SVG Paths & Mid-Segment Eraser Hit-Testing
  const pStart = toNormalizedPoint(100, 150, 400, 600); // { x: 0.25, y: 0.25 }
  const pMid = toNormalizedPoint(200, 300, 400, 600); // { x: 0.5, y: 0.5 }
  const pEnd = toNormalizedPoint(300, 150, 400, 600); // { x: 0.75, y: 0.25 }
  const normalizedStroke = {
    id: 'hl_smooth_1',
    tool: 'HIGHLIGHTER' as const,
    color: '#FDE047',
    strokeWidth: 20,
    opacity: 0.42,
    normalized: true,
    points: [pStart, pMid, pEnd],
  };

  // Scale up 2x (e.g. Tablet/FullScreen) and verify proportional projection
  const scaledPts = denormalizeStrokePoints(normalizedStroke, 800, 1200);
  const smoothPath = pointsToSmoothSvgPath(scaledPts);
  const dotPath = pointsToSmoothSvgPath([{ x: 10, y: 20 }]);

  // Long horizontal stroke for segment eraser hit-testing
  const longStroke = {
    id: 'hl_long',
    tool: 'HIGHLIGHTER' as const,
    color: '#4ADE80',
    strokeWidth: 20,
    normalized: true,
    points: [
      { x: 0.1, y: 0.5 },
      { x: 0.9, y: 0.5 },
    ],
  };
  const hitsSegmentMiddle = doesPointHitStroke(200, 305, longStroke, 400, 600, 18); // y=300 is segment middle
  const missesFarPoint = doesPointHitStroke(200, 100, longStroke, 400, 600, 18);

  results.push({
    name: 'Marker Normalized Scaling, Smooth SVG Curves & Segment Eraser Hit-Testing',
    passed:
      scaledPts.length === 3 &&
      Math.round(scaledPts[1].x) === 400 &&
      Math.round(scaledPts[1].y) === 600 &&
      smoothPath.includes(' Q ') &&
      dotPath.startsWith('M 10.0 20.0') &&
      hitsSegmentMiddle === true &&
      missesFarPoint === false,
    details: `ScaledMid=(${scaledPts[1]?.x},${scaledPts[1]?.y}), SmoothHasQ=${smoothPath.includes(' Q ')}, HitsSegMid=${hitsSegmentMiddle}, MissesFar=${missesFarPoint}`,
  });

  // 5. Single-request-per-subject enforcement & Admin duplicate subscription guard
  const mockPrisma = { isConnected: false } as any;
  const subjectsSvc = new SubjectsService();
  const gradesSvc = new GradesService(subjectsSvc);
  const usersSvc = new UsersService(mockPrisma);
  const subsSvc = new SubscriptionsService(mockPrisma, new LicenseSignerService());
  const mockEmailSvc = {
    sendNewAccessRequestAlert: async () => ({ delivered: false }),
    sendAccessRequestReceived: async () => ({ delivered: false }),
    sendSubscriptionApproved: async () => ({ delivered: false }),
  } as any;
  const reqSvc = new RequestsService(mockPrisma, subsSvc, mockEmailSvc, gradesSvc, subjectsSvc, usersSvc);

  const req1 = await reqSvc.create('usr_single_1', 'teacher@example.com', {
    gradeId: 5,
    subjectId: 'ENG',
    plan: 'MONTHLY' as any,
    phoneNumber: '+998 90 123 45 67',
  });

  let duplicatePendingBlocked = false;
  try {
    await reqSvc.create('usr_single_1', 'teacher@example.com', {
      gradeId: 5,
      subjectId: 'sub_eng',
      plan: 'MONTHLY' as any,
      phoneNumber: '+998 90 123 45 67',
    });
  } catch (err: any) {
    duplicatePendingBlocked = err?.status === 409;
  }

  await reqSvc.grantAccess({ requestId: req1.id, adminId: 'admin_test' });

  let duplicateAfterApprovalBlocked = false;
  try {
    await reqSvc.create('usr_single_1', 'teacher@example.com', {
      gradeId: 5,
      subjectId: 'ENG',
      plan: 'THREE_MONTHS' as any,
      phoneNumber: '+998 90 123 45 67',
    });
  } catch (err: any) {
    duplicateAfterApprovalBlocked = err?.status === 409;
  }

  // Different subject on same grade OR rejected request can submit normally
  const reqDiffSub = await reqSvc.create('usr_single_1', 'teacher@example.com', {
    gradeId: 5,
    subjectId: 'MATH',
    plan: 'MONTHLY' as any,
    phoneNumber: '+998 90 123 45 67',
  });
  await reqSvc.rejectAccess(reqDiffSub.id, 'admin_test', 'Test reject');
  const reqReapplyAfterReject = await reqSvc.create('usr_single_1', 'teacher@example.com', {
    gradeId: 5,
    subjectId: 'MATH',
    plan: 'MONTHLY' as any,
    phoneNumber: '+998 90 123 45 67',
  });

  results.push({
    name: 'Single Request Per Grade+Subject Enforced (Blocks Pending/Active Duplicate, Allows Different Subject or Rejected Re-apply)',
    passed:
      Boolean(req1.id) &&
      duplicatePendingBlocked &&
      duplicateAfterApprovalBlocked &&
      Boolean(reqReapplyAfterReject.id),
    details: `DupPendingBlocked=${duplicatePendingBlocked}, DupApprovedBlocked=${duplicateAfterApprovalBlocked}, ReapplyAfterReject=${Boolean(reqReapplyAfterReject.id)}`,
  });

  return results;
}
