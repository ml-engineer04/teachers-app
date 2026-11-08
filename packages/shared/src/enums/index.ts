export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}

export enum UserRole {
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY', // 30 days
  THREE_MONTHS = 'THREE_MONTHS', // 90 days
  YEARLY = 'YEARLY', // 365 days
}

export enum BookType {
  STUDENT_BOOK = 'STUDENT_BOOK',
  TEACHER_BOOK = 'TEACHER_BOOK',
  WORKBOOK = 'WORKBOOK',
}

export enum BookStatus {
  DRAFT = 'DRAFT',
  INGESTING = 'INGESTING',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum HotspotType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  EXTERNAL_URL = 'EXTERNAL_URL',
  INTERNAL_PAGE = 'INTERNAL_PAGE',
  ANSWER_LINK = 'ANSWER_LINK',
}

export enum MediaType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID_APPROVED = 'PAID_APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum IngestionStatus {
  PENDING = 'PENDING',
  CONVERTING_PDF = 'CONVERTING_PDF',
  EXTRACTING_TEXT = 'EXTRACTING_TEXT',
  EXTRACTING_LINKS = 'EXTRACTING_LINKS',
  MATCHING_MEDIA = 'MATCHING_MEDIA',
  GENERATING_MANIFEST = 'GENERATING_MANIFEST',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum LanguageCode {
  EN = 'en',
  UZ = 'uz',
}

export enum PageTurnStyle {
  CURL = 'CURL',
  SLIDE = 'SLIDE',
}

export enum AppTheme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}
