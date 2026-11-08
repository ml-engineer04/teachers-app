import { AccessRequestStatus, AdminRole, BookType, HotspotType, MediaType, SubscriptionPlan } from '../enums';
import { HotspotRect } from '../types';

// Mobile Google Authentication (§7 Master Prompt)
export interface GoogleAuthDto {
  idToken: string; // Google JWT Token validated on NestJS backend
  email?: string;
  fullName?: string;
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  platform?: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
  deviceId: string;
}

export interface DeviceListResponse {
  devices: Array<{
    id: string;
    deviceId: string;
    deviceModel: string;
    osVersion: string;
    lastActiveAt: string;
    isCurrent: boolean;
  }>;
  maxAllowed: number;
  exceededLimit: boolean;
}

export interface RemoveDeviceDto {
  deviceIdToRemove: string;
}

// Request Access (§8 Master Prompt)
export interface CreateAccessRequestDto {
  gradeId: number;
  subjectId?: string;
  plan: SubscriptionPlan; // MONTHLY (30d), THREE_MONTHS (90d), YEARLY (365d)
  phoneNumber: string; // "+998 XX XXX XX XX"
}

// Admin Auth (§15 Master Prompt)
export interface AdminLoginDto {
  email: string;
  password: string;
  totpCode?: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  admin: {
    id: string;
    email: string;
    role: AdminRole;
    totpEnabled: boolean;
  };
}

// Admin Request Management
export interface UpdateAccessRequestStatusDto {
  status: AccessRequestStatus;
  internalNote?: string;
}

export interface GrantAccessDto {
  plan?: SubscriptionPlan;
  durationDays?: number; // 30, 90, 365 or custom
  internalNote?: string;
}

export interface RejectAccessDto {
  reason: string;
}

// Subject Management DTOs (§4 Master Prompt)
export interface CreateSubjectDto {
  gradeId: number;
  name: string;
  code: string;
  icon: string;
  color: string;
  description?: string;
}

export interface UpdateSubjectDto {
  name?: string;
  code?: string;
  icon?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
}

// Admin Grade / Price Management
export interface UpdateGradeDto {
  priceMonthlyUzs?: number;
  priceQuarterlyUzs?: number;
  priceYearlyUzs?: number;
  isActive?: boolean;
}

// Content Ingestion DTOs
export interface UploadBookDto {
  gradeId: number;
  subjectId: string;
  type: BookType;
  title: string;
  version?: number;
}

export interface IngestionHotspotUpdateDto {
  pageNumber: number;
  type: HotspotType;
  rect: HotspotRect;
  targetMediaId?: string;
  targetUrl?: string;
  targetPageNumber?: number;
}

export interface BulkAnswerMappingCsvRow {
  exerciseLabel: string;
  studentPageNumber: number;
  teacherPageNumber: number;
  teacherExerciseLabel?: string;
  notes?: string;
}
