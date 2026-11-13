import {
  AdminRole,
  UserRole,
  BookType,
  BookStatus,
  HotspotType,
  MediaType,
  AccessRequestStatus,
  IngestionStatus,
  SubscriptionPlan,
} from '../enums';

export interface ExternalAccount {
  id: string;
  userId: string;
  provider: string;
  providerSubject: string;
  email?: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  googleId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  authProvider?: string;
  role?: UserRole;
  isActive: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  externalAccounts?: ExternalAccount[];
}

export interface Device {
  id: string;
  userId: string;
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  platform?: string | null;
  pushToken?: string | null;
  lastActiveAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface Admin {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: number; // 1 to 11
  gradeNumber: number;
  title: string;
  description?: string;
  priceMonthlyUzs: number;
  priceQuarterlyUzs: number;
  priceYearlyUzs: number;
  isActive: boolean;
  subjects?: Subject[];
}

export interface Subject {
  id: string;
  gradeId: number;
  name: string; // "Ingliz tili", "Matematika", "Fizika"
  code: string; // "ENG", "MATH", "PHYS"
  icon: string; // emoji or icon key
  color: string; // hex color for badges
  description?: string;
  isActive: boolean;
  books?: Book[];
  createdAt?: string;
}

export interface Book {
  id: string;
  gradeId: number;
  subjectId: string;
  type: BookType;
  title: string;
  version: number;
  status: BookStatus;
  totalPages: number;
  contentStartPdfPage?: number;
  manifestS3Key?: string | null;
  manifestSha256?: string | null;
  totalSizeBytes?: number;
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  bookId: string;
  pageNumber: number;
  imageNormalS3Key: string;
  imageHighS3Key: string;
  width: number;
  height: number;
  hasText: boolean;
}

export interface HotspotRect {
  x: number; // 0.0 to 1.0 (normalized)
  y: number; // 0.0 to 1.0 (normalized)
  w: number; // 0.0 to 1.0 (normalized)
  h: number; // 0.0 to 1.0 (normalized)
}

export interface Hotspot {
  id: string;
  pageId: string;
  type: HotspotType;
  rect: HotspotRect;
  targetMediaId?: string | null;
  targetUrl?: string | null;
  targetPageNumber?: number | null;
  exerciseLabel?: string | null;
  solutionText?: string | null;
  methodologyNotes?: string | null;
  multiAnswers?: any[] | null;
  imageUrl?: string | null;
}

export interface MediaFile {
  id: string;
  bookId: string;
  type: MediaType;
  filename: string;
  title?: string;
  unitLabel?: string;
  sizeBytes: number;
  checksumSha256: string;
  s3Key: string;
  durationSeconds?: number | null;
}

export interface TocItem {
  id: string;
  bookId: string;
  title: string;
  pageNumber: number;
  parentId?: string | null;
  sortOrder: number;
  children?: TocItem[];
}

export interface AnswerMapping {
  id: string;
  gradeId: number;
  subjectId: string;
  studentExerciseLabel: string;
  studentPageNumber: number;
  teacherPageNumber: number;
  teacherExerciseLabel?: string | null;
  notes?: string | null;
  solutionKey?: string | null;
  imageUrl?: string | null;
  format?: 'TEXT' | 'IMAGE' | 'BOTH';
}

export interface AccessRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  gradeId: number;
  gradeNumber?: number;
  subjectId?: string | null;
  subjectName?: string | null;
  plan: SubscriptionPlan;
  phoneNumber: string; // "+998 XX XXX XX XX"
  status: AccessRequestStatus;
  priceUzs: number;
  adminId?: string | null;
  internalNote?: string | null;
  callLoggedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  gradeId: number;
  subjectId?: string | null;
  plan: SubscriptionPlan;
  startsAt: string;
  expiresAt: string;
  grantedById: string;
  isActive: boolean;
  createdAt: string;
}

export interface LicenseTokenPayload {
  userId: string;
  deviceId: string;
  gradeId: number;
  subjectId?: string;
  plan: SubscriptionPlan;
  startsAt: number;
  expiresAt: number;
  issuedAt: number;
  serverTime: number;
  nonce: string;
}

export interface SignedLicense {
  payload: LicenseTokenPayload;
  signature: string;
  token: string;
}

export interface BookBundleManifest {
  manifestVersion: string;
  bundleVersion: number;
  grade: number;
  subject: string;
  bookType: BookType;
  bookTitle: string;
  createdAt: string;
  encryptionAlgorithm: 'AES-256-GCM';
  keyFingerprint: string;
  totalPages: number;
  pages: Array<{
    pageNumber: number;
    normalImage: { path: string; sizeBytes: number; sha256: string };
    highImage: { path: string; sizeBytes: number; sha256: string };
    textSnippet?: string;
    hotspots: Hotspot[];
  }>;
  media: Array<{
    id: string;
    filename: string;
    title: string;
    unitLabel?: string;
    type: MediaType;
    path: string;
    sizeBytes: number;
    sha256: string;
    durationSeconds?: number;
  }>;
  toc: TocItem[];
  totalSizeBytes: number;
  sha256: string;
}

export interface UserBookmarkItem {
  id: string;
  bookId: string;
  pageNumber: number;
  label?: string;
  createdAt: string;
}

export interface UserNoteItem {
  id: string;
  bookId: string;
  pageNumber: number;
  posX: number;
  posY: number;
  content: string;
  color: string;
  updatedAt: string;
}

export interface VectorStrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface VectorStroke {
  id: string;
  type: 'pen' | 'highlighter';
  color: string;
  thickness: number;
  opacity: number;
  points: VectorStrokePoint[];
}

export interface UserDrawingPage {
  id: string;
  bookId: string;
  pageNumber: number;
  strokes: VectorStroke[];
  updatedAt: string;
}

export interface UserReadingProgressItem {
  bookId: string;
  lastPageNumber: number;
  updatedAt: string;
}
