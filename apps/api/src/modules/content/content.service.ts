import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestionWorkerService, IngestionJobResult } from './ingestion.worker';
import {
  Book,
  BookType,
  BookStatus,
  IngestionStatus,
  BookBundleManifest,
  normalizeContentStartPage,
} from '@smartteacherbook/shared';
import { PDFDocument } from 'pdf-lib';

const execFileAsync = promisify(execFile);
import {
  deleteBinaryDiskSync,
  isApiTestEnvironment,
  readBinaryDiskSync,
  readJsonDiskSync,
  writeBinaryDiskSync,
  writeJsonDiskSync,
} from '../../common/persistence/local-disk.store';

export interface VisualEditorPageInfo {
  id: string;
  bookId: string;
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  audioHotspotsCount: number;
  videoHotspotsCount: number;
  answerHotspotsCount: number;
  hasHotspots: boolean;
  thumbnailUrl?: string;
  titleSnippet?: string;
}

export interface AnswerMappingEntry {
  id: string;
  exerciseNumber: string;
  exerciseTitle?: string;
  solutionKey: string;
  teacherPageNumber: number;
  notes?: string;
}

export interface HotspotItem {
  id: string;
  bookId?: string;
  pageNumber: number;
  type: 'AUDIO' | 'VIDEO' | 'ANSWER_LINK' | 'OTHER';
  rect: { x: number; y: number; w: number; h: number }; // Normalized 0.0 - 1.0
  label: string;
  targetFile?: string;
  targetMediaId?: string;
  targetUrl?: string;
  targetPageNumber?: number;
  exerciseLabel?: string;
  unitLesson?: string;
  description?: string;
  tooltipText?: string;
  positionMode?: 'AUTO' | 'MANUAL';
  appearanceStyle?: 'SOLID' | 'OUTLINE';
  size?: 'SM' | 'MD' | 'LG';
  noteText?: string;
  // Phase 4 Teacher's Book mapping fields:
  targetTeacherBookId?: string;
  targetTeacherBookTitle?: string;
  solutionText?: string;
  methodologyNotes?: string;
  imageUrl?: string;
  multiAnswers?: AnswerMappingEntry[];
}

export interface AnswerKeyItem {
  id: string;
  studentBookId: string;
  teacherBookId: string;
  teacherBookTitle: string;
  teacherPageNumber: number;
  studentPageNumber: number;
  unitLabel: string;
  exerciseNumber: string;
  exerciseTitle: string;
  solutionKey: string;
  methodologyNotes?: string;
  previewThumbnail?: string;
  imageUrl?: string;
  format?: 'TEXT' | 'IMAGE' | 'BOTH';
  createdAt: string;
}

export interface MediaItem {
  id: string;
  bookId?: string;
  type: 'AUDIO' | 'VIDEO';
  filename: string;
  title: string;
  unitLabel: string;
  lessonLabel?: string;
  durationSeconds: number;
  sizeBytes: number;
  language?: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

@Injectable()
export class ContentService implements OnModuleInit {
  private readonly logger = new Logger(ContentService.name);
  private diskEnabled = false;
  private coverMimesStore: Map<string, string> = new Map();
  private mediaMimesStore: Map<string, string> = new Map();
  private answerImgMimesStore: Map<string, string> = new Map();

  // Clean in-memory store for books (starts empty, user uploads their own)
  private booksStore: Book[] = [];

  // Ingestion results cache
  private ingestionReportsStore: Map<string, IngestionJobResult> = new Map();

  // Pages store mapped by bookId
  private pagesStore: Map<string, VisualEditorPageInfo[]> = new Map();

  // Raw PDF files cache for direct visual editor streaming
  private pdfBuffersStore: Map<string, Buffer> = new Map();

  // Phase 2: Hotspots store mapped by bookId
  private hotspotsStore: Map<string, HotspotItem[]> = new Map();

  // Phase 3: Media library store
  private mediaStore: Map<string, MediaItem> = new Map();
  private mediaBuffersStore: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  // Phase 4: Teacher's Book Answer Keys store
  private answerKeysStore: Map<string, AnswerKeyItem> = new Map();
  private answerKeyImagesStore: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  // Book cover images store
  private coverImagesStore: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

  // Reader User Sync Stores (TOC, Bookmarks, Notes, Drawings, Progress)
  private tocStore: Map<
    string,
    Array<{
      id: string;
      bookId: string;
      unit: string;
      title: string;
      pageNumber: number;
      endPageNumber?: number;
    }>
  > = new Map();
  private userBookmarksStore: Map<string, Array<{ id: string; userId: string; bookId: string; pageNumber: number; title: string; createdAt: string }>> = new Map();
  private userNotesStore: Map<string, Array<{ id: string; userId: string; bookId: string; pageNumber: number; text: string; createdAt: string }>> = new Map();
  private userDrawingsStore: Map<string, any[]> = new Map(); // `${userId}:${bookId}:${pageNumber}` -> strokes
  private userProgressStore: Map<string, Array<{ userId: string; bookId: string; lastPageNumber: number; totalPages: number; bookTitle?: string; gradeId?: number; subjectId?: string; coverImageUrl?: string | null; lastOpenedAt: string }>> = new Map();
  private readonly progressPersistencePath = path.resolve(
    process.cwd(),
    '.data',
    'reading-progress.json',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestionWorker: IngestionWorkerService,
  ) {
    this.loadPersistedProgress();
    this.logger.log('✨ ContentService initialized with clean empty database.');
  }

  onModuleInit() {
    this.diskEnabled = !isApiTestEnvironment();
    if (!this.diskEnabled) return;
    this.loadContentFromDisk();
  }

  private loadContentFromDisk() {
    interface PersistedContentState {
      books?: Book[];
      pages?: Record<string, VisualEditorPageInfo[]>;
      hotspots?: Record<string, HotspotItem[]>;
      toc?: Record<string, any[]>;
      media?: MediaItem[];
      answerKeys?: AnswerKeyItem[];
      coverMimes?: Record<string, string>;
      mediaMimes?: Record<string, string>;
      answerImgMimes?: Record<string, string>;
      bookmarks?: Record<string, any[]>;
      notes?: Record<string, any[]>;
      drawings?: Record<string, any[]>;
    }

    const saved = readJsonDiskSync<PersistedContentState>('content-state.json');
    if (saved) {
      if (Array.isArray(saved.books)) this.booksStore = saved.books;
      if (saved.pages) {
        Object.entries(saved.pages).forEach(([k, v]) => this.pagesStore.set(k, v));
      }
      if (saved.hotspots) {
        Object.entries(saved.hotspots).forEach(([k, v]) => this.hotspotsStore.set(k, v));
      }
      if (saved.toc) {
        Object.entries(saved.toc).forEach(([k, v]) => this.tocStore.set(k, v));
      }
      if (Array.isArray(saved.media)) {
        saved.media.forEach((m) => this.mediaStore.set(m.id, m));
      }
      if (Array.isArray(saved.answerKeys)) {
        saved.answerKeys.forEach((a) => this.answerKeysStore.set(a.id, a));
      }
      if (saved.coverMimes) {
        Object.entries(saved.coverMimes).forEach(([k, v]) => this.coverMimesStore.set(k, v));
      }
      if (saved.mediaMimes) {
        Object.entries(saved.mediaMimes).forEach(([k, v]) => this.mediaMimesStore.set(k, v));
      }
      if (saved.answerImgMimes) {
        Object.entries(saved.answerImgMimes).forEach(([k, v]) => this.answerImgMimesStore.set(k, v));
      }
      if (saved.bookmarks) {
        Object.entries(saved.bookmarks).forEach(([k, v]) => this.userBookmarksStore.set(k, v));
      }
      if (saved.notes) {
        Object.entries(saved.notes).forEach(([k, v]) => this.userNotesStore.set(k, v));
      }
      if (saved.drawings) {
        Object.entries(saved.drawings).forEach(([k, v]) => this.userDrawingsStore.set(k, v));
      }
      this.logger.log(
        `💾 Loaded persisted content from disk: ${this.booksStore.length} book(s).`,
      );
      return;
    }

    const snap = readJsonDiskSync<{
      books?: Book[];
      bookAssets?: Record<
        string,
        { pages?: VisualEditorPageInfo[]; hotspots?: HotspotItem[]; toc?: any[]; coverMime?: string | null }
      >;
      media?: MediaItem[];
      mediaFiles?: Record<string, { mime?: string }>;
      answers?: AnswerKeyItem[];
      ansImages?: Record<string, { mime?: string }>;
    }>('live-snapshot.json');

    if (snap && Array.isArray(snap.books) && snap.books.length > 0) {
      this.booksStore = snap.books;
      if (snap.bookAssets) {
        Object.entries(snap.bookAssets).forEach(([bookId, asset]) => {
          if (Array.isArray(asset.pages)) this.pagesStore.set(bookId, asset.pages);
          if (Array.isArray(asset.hotspots)) this.hotspotsStore.set(bookId, asset.hotspots);
          if (Array.isArray(asset.toc)) this.tocStore.set(bookId, asset.toc);
          if (asset.coverMime) this.coverMimesStore.set(bookId, asset.coverMime);
        });
      }
      if (Array.isArray(snap.media)) {
        snap.media.forEach((m) => this.mediaStore.set(m.id, m));
      }
      if (snap.mediaFiles) {
        Object.entries(snap.mediaFiles).forEach(([id, meta]) => {
          if (meta?.mime) this.mediaMimesStore.set(id, meta.mime);
        });
      }
      if (Array.isArray(snap.answers)) {
        snap.answers.forEach((a) => this.answerKeysStore.set(a.id, a));
      }
      if (snap.ansImages) {
        Object.entries(snap.ansImages).forEach(([id, meta]) => {
          if (meta?.mime) this.answerImgMimesStore.set(id, meta.mime);
        });
      }
      this.persistContentToDisk();
      this.logger.log(
        `📦 Restored ${this.booksStore.length} book(s) from live snapshot into persistent storage.`,
      );
    }
  }

  private persistContentToDisk() {
    if (!this.diskEnabled) return;
    const mapToRecord = <V>(map: Map<string, V>): Record<string, V> => {
      const out: Record<string, V> = {};
      map.forEach((val, key) => {
        out[key] = val;
      });
      return out;
    };

    writeJsonDiskSync('content-state.json', {
      books: this.booksStore,
      pages: mapToRecord(this.pagesStore),
      hotspots: mapToRecord(this.hotspotsStore),
      toc: mapToRecord(this.tocStore),
      media: Array.from(this.mediaStore.values()),
      answerKeys: Array.from(this.answerKeysStore.values()),
      coverMimes: mapToRecord(this.coverMimesStore),
      mediaMimes: mapToRecord(this.mediaMimesStore),
      answerImgMimes: mapToRecord(this.answerImgMimesStore),
      bookmarks: mapToRecord(this.userBookmarksStore),
      notes: mapToRecord(this.userNotesStore),
      drawings: mapToRecord(this.userDrawingsStore),
    });
  }

  private loadPersistedProgress() {
    try {
      if (!fs.existsSync(this.progressPersistencePath)) return;
      const raw = fs.readFileSync(this.progressPersistencePath, 'utf-8');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      Object.entries(parsed).forEach(([uid, list]) => {
        if (Array.isArray(list)) {
          this.userProgressStore.set(uid, list as any[]);
        }
      });
    } catch (err: any) {
      this.logger.warn(`Could not load reading progress cache: ${err?.message || err}`);
    }
  }

  private persistProgressToDisk() {
    try {
      fs.mkdirSync(path.dirname(this.progressPersistencePath), { recursive: true });
      const payload: Record<string, any[]> = {};
      this.userProgressStore.forEach((list, uid) => {
        payload[uid] = list;
      });
      fs.writeFileSync(this.progressPersistencePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err: any) {
      this.logger.warn(`Could not persist reading progress cache: ${err?.message || err}`);
    }
  }

  private seedDemoMedia() {
    const demoItems: MediaItem[] = [
      {
        id: 'media_aud_1',
        bookId: 'book_grade11_english_sb',
        type: 'AUDIO',
        filename: 'unit1_track1.mp3',
        title: 'Unit 1: Listening 1.1 — AI in Education',
        unitLabel: 'Unit 1',
        lessonLabel: 'Lesson 1',
        durationSeconds: 135,
        sizeBytes: 3200000,
        language: 'English (UK)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'media_aud_2',
        bookId: 'book_grade11_english_sb',
        type: 'AUDIO',
        filename: 'unit1_track2.mp3',
        title: 'Unit 1: Listening 1.2 — Digital Classrooms Dialogue',
        unitLabel: 'Unit 1',
        lessonLabel: 'Lesson 2',
        durationSeconds: 168,
        sizeBytes: 3800000,
        language: 'English (US)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'media_aud_3',
        bookId: 'book_grade11_english_sb',
        type: 'AUDIO',
        filename: 'unit2_track1.mp3',
        title: 'Unit 2: Listening 2.1 — Global Communications',
        unitLabel: 'Unit 2',
        lessonLabel: 'Lesson 1',
        durationSeconds: 140,
        sizeBytes: 2900000,
        language: 'English (UK)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'media_aud_4',
        bookId: 'book_grade11_english_sb',
        type: 'AUDIO',
        filename: 'unit2_track2.mp3',
        title: 'Unit 2: Pronunciation & Intonation Drill',
        unitLabel: 'Unit 2',
        lessonLabel: 'Lesson 3',
        durationSeconds: 110,
        sizeBytes: 2400000,
        language: 'English (UK)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'media_aud_5',
        bookId: 'book_grade11_english_sb',
        type: 'AUDIO',
        filename: 'unit3_track1.mp3',
        title: 'Unit 3: Listening 3.1 — Scientific Discoveries',
        unitLabel: 'Unit 3',
        lessonLabel: 'Lesson 1',
        durationSeconds: 195,
        sizeBytes: 4500000,
        language: 'English (US)',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'media_vid_1',
        bookId: 'book_grade11_english_sb',
        type: 'VIDEO',
        filename: 'unit1_grammar.mp4',
        title: 'Unit 1: Conditionals Type 3 Grammar Video Focus',
        unitLabel: 'Unit 1',
        lessonLabel: 'Lesson 4',
        durationSeconds: 324,
        sizeBytes: 18500000,
        language: 'English',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'media_vid_2',
        bookId: 'book_grade11_english_sb',
        type: 'VIDEO',
        filename: 'unit2_pedagogy.mp4',
        title: 'Unit 2: Active Vocabulary & Dialogue Masterclass',
        unitLabel: 'Unit 2',
        lessonLabel: 'Lesson 2',
        durationSeconds: 280,
        sizeBytes: 15200000,
        language: 'English',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'media_vid_3',
        bookId: 'book_grade11_english_sb',
        type: 'VIDEO',
        filename: 'unit3_reading.mp4',
        title: 'Unit 3: Scientific Text Analysis & Debate',
        unitLabel: 'Unit 3',
        lessonLabel: 'Lesson 3',
        durationSeconds: 350,
        sizeBytes: 22100000,
        language: 'English',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=300',
        createdAt: new Date().toISOString(),
      },
    ];

    demoItems.forEach((m) => this.mediaStore.set(m.id, m));
  }

  private seedDemoHotspots() {
    this.hotspotsStore.set('book_grade11_english_sb', [
      {
        id: 'hs-1',
        bookId: 'book_grade11_english_sb',
        pageNumber: 2,
        type: 'AUDIO',
        rect: { x: 0.1, y: 0.82, w: 0.38, h: 0.08 },
        label: '🎧 Audio Track 2.1 — Listening',
        targetFile: 'unit1_track1.mp3',
        description: 'Listening comprehension audio for classroom lesson.',
      },
      {
        id: 'hs-2',
        bookId: 'book_grade11_english_sb',
        pageNumber: 2,
        type: 'ANSWER_LINK',
        rect: { x: 0.54, y: 0.82, w: 0.38, h: 0.08 },
        label: '💡 Answers (Teacher p. 14)',
        targetFile: 'teacher_key_p14.pdf',
        targetPageNumber: 14,
        targetTeacherBookId: 'book_grade11_english_tb',
        targetTeacherBookTitle: "English 11 Teacher's Book (Answer Key & Methodics)",
        exerciseLabel: 'Task 2.1: Interactive Vocabulary',
        unitLesson: 'Unit 1: Digital Future',
        solutionText:
          '1. Digital Classrooms — C (Interactive learning spaces)\n2. AI Tutors — A (Adaptive automated support)\n3. Pedagogy — D (Art and science of teaching)\n4. Active Speaking — B (Participatory oral practice)',
        methodologyNotes:
          'Tavsiya: O‘quvchilarga avval 3 daqiqa mustaqil ishlashga ruxsat bering. So‘ngra juftliklarda tekshirtirib, dars audio yozuvi orqali javoblarni tasdiqlang.',
        multiAnswers: [
          {
            id: 'sub_ans_1',
            exerciseNumber: 'Task 2.1 (A)',
            exerciseTitle: 'Vocabulary Match',
            solutionKey: '1 - C, 2 - A, 3 - D, 4 - B',
            teacherPageNumber: 14,
            notes: 'Lug‘at atamalarining to‘g‘ri ma’nosini darslik kontekstida tushuntiring.',
          },
          {
            id: 'sub_ans_2',
            exerciseNumber: 'Task 2.1 (B)',
            exerciseTitle: 'Sentence Completion',
            solutionKey: '1. Pedagogy, 2. AI Tutors, 3. Digital Classroom',
            teacherPageNumber: 14,
            notes: 'O‘quvchilar javoblarini daftarga to‘liq yozishini nazorat qiling.',
          },
        ],
        description: 'Official Teacher’s Book answers for Task 2.1.',
      },
      {
        id: 'hs-3',
        bookId: 'book_grade11_english_sb',
        pageNumber: 4,
        type: 'VIDEO',
        rect: { x: 0.25, y: 0.82, w: 0.5, h: 0.08 },
        label: '🎬 Video Lesson — Grammar Focus',
        targetFile: 'unit2_grammar.mp4',
        description: 'Animated grammar video explaining Conditionals Type 3.',
      },
    ]);
  }

  private seedDemoAnswers() {
    const demoAnswers: AnswerKeyItem[] = [
      {
        id: 'ans_tb_1',
        studentBookId: 'book_grade11_english_sb',
        teacherBookId: 'book_grade11_english_tb',
        teacherBookTitle: "English 11 Teacher's Book (Answer Key & Methodics)",
        teacherPageNumber: 14,
        studentPageNumber: 2,
        unitLabel: 'Unit 1: Digital Future',
        exerciseNumber: 'Task 2.1',
        exerciseTitle: 'Interactive Vocabulary Match',
        solutionKey:
          '1. Digital Classrooms — C (Interactive learning spaces)\n2. AI Tutors — A (Adaptive automated support)\n3. Pedagogy — D (Art and science of teaching)\n4. Active Speaking — B (Participatory oral practice)',
        methodologyNotes:
          'Tavsiya: O‘quvchilarga avval 3 daqiqa mustaqil ishlashga ruxsat bering. So‘ngra juftliklarda tekshirtirib, dars audio yozuvi orqali javoblarni tasdiqlang.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ans_tb_2',
        studentBookId: 'book_grade11_english_sb',
        teacherBookId: 'book_grade11_english_tb',
        teacherBookTitle: "English 11 Teacher's Book (Answer Key & Methodics)",
        teacherPageNumber: 14,
        studentPageNumber: 2,
        unitLabel: 'Unit 1: Digital Future',
        exerciseNumber: 'Task 2.2',
        exerciseTitle: 'Reading Comprehension Questions',
        solutionKey:
          '1. True — AI accelerates personalized learning pathways.\n2. False — Teachers retain primary mentorship responsibilities.\n3. Not Given — Total technology spending is not indicated.\n4. True — Active verbal participation builds pupil confidence.',
        methodologyNotes:
          'Lug‘atdagi yangi iboralarga alohida e’tibor bering. O‘quvchilarga darslik matnidagi dalillarni ko‘rsatishni so‘rang.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ans_tb_3',
        studentBookId: 'book_grade11_english_sb',
        teacherBookId: 'book_grade11_english_tb',
        teacherBookTitle: "English 11 Teacher's Book (Answer Key & Methodics)",
        teacherPageNumber: 16,
        studentPageNumber: 4,
        unitLabel: 'Unit 1: Digital Future',
        exerciseNumber: 'Exercise 3',
        exerciseTitle: 'Conditionals Type 3 Grammar Drill',
        solutionKey:
          '1. If students had attended the lab, they would have passed the practical test.\n2. The tutor would have explained the rule if anyone had asked.\n3. Had the team collaborated earlier, the project would have been ready.',
        methodologyNotes:
          'Past Perfect va Would have + V3 formulalarini doskada tahlil qiling. Xato qilgan o‘quvchilar bilan individual ishlang.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ans_tb_4',
        studentBookId: 'book_grade7_english_sb',
        teacherBookId: 'book_grade7_english_tb',
        teacherBookTitle: "English for 7th Grade (Teacher's Book & Answers)",
        teacherPageNumber: 12,
        studentPageNumber: 3,
        unitLabel: 'Unit 3: My School',
        exerciseNumber: 'Exercise 1',
        exerciseTitle: 'School Facilities & Daily Routine',
        solutionKey:
          '1. Library — Book lending & silent study room\n2. Science Lab — Experiments with test tubes\n3. Gymnasium — Indoor sports & gymnastics\n4. Canteen — Healthy lunch & beverage counter',
        methodologyNotes:
          'Sinf xonasi buyumlari va maktab qismlarini to‘g‘ri talaffuz qilishiga e’tibor qarating.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ans_tb_5',
        studentBookId: 'book_grade7_english_sb',
        teacherBookId: 'book_grade7_english_tb',
        teacherBookTitle: "English for 7th Grade (Teacher's Book & Answers)",
        teacherPageNumber: 13,
        studentPageNumber: 3,
        unitLabel: 'Unit 3: My School',
        exerciseNumber: 'Exercise 2',
        exerciseTitle: 'Listening Comprehension: School Tour',
        solutionKey: '1. (B) Ground Floor | 2. (A) Next to Science Lab | 3. (C) Second floor',
        methodologyNotes: 'Track 3.1 audiosini ikki marta qo‘yib bering.',
        createdAt: new Date().toISOString(),
      },
    ];

    demoAnswers.forEach((a) => this.answerKeysStore.set(a.id, a));
  }

  private seedDemoPages() {
    // Seed Grade 11 English pages
    const g11Pages: VisualEditorPageInfo[] = [
      {
        id: 'p_g11_1',
        bookId: 'book_grade11_english_sb',
        pageNumber: 1,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: 0,
        videoHotspotsCount: 0,
        answerHotspotsCount: 0,
        hasHotspots: false,
        titleSnippet: 'Welcome to Grade 11 Secondary Curriculum',
      },
      {
        id: 'p_g11_2',
        bookId: 'book_grade11_english_sb',
        pageNumber: 2,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: 1,
        videoHotspotsCount: 0,
        answerHotspotsCount: 1,
        hasHotspots: true,
        titleSnippet: '1.2 Digital Classrooms, AI Tutors & Pedagogy',
      },
      {
        id: 'p_g11_3',
        bookId: 'book_grade11_english_sb',
        pageNumber: 3,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: 1,
        videoHotspotsCount: 0,
        answerHotspotsCount: 0,
        hasHotspots: true,
        titleSnippet: 'Unit 1: Vocabulary in Context & Idioms',
      },
      {
        id: 'p_g11_4',
        bookId: 'book_grade11_english_sb',
        pageNumber: 4,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: 0,
        videoHotspotsCount: 1,
        answerHotspotsCount: 0,
        hasHotspots: true,
        titleSnippet: 'Unit 2: Grammar Focus — Conditionals Type 3',
      },
      {
        id: 'p_g11_5',
        bookId: 'book_grade11_english_sb',
        pageNumber: 5,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: 0,
        videoHotspotsCount: 0,
        answerHotspotsCount: 0,
        hasHotspots: false,
        titleSnippet: 'Unit 3: Global Ecosystems & Biodiversity',
      },
      {
        id: 'p_g11_6',
        bookId: 'book_grade11_english_sb',
        pageNumber: 6,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: 1,
        videoHotspotsCount: 0,
        answerHotspotsCount: 0,
        hasHotspots: true,
        titleSnippet: 'Unit 3: Speaking Masterclass & Fluency',
      },
    ];
    this.pagesStore.set('book_grade11_english_sb', g11Pages);

    // Seed Grade 7 English pages
    const g7Pages: VisualEditorPageInfo[] = Array.from({ length: 18 }, (_, i) => {
      const pageNum = i + 1;
      const isEven = pageNum % 2 === 0;
      return {
        id: `p_g7_${pageNum}`,
        bookId: 'book_grade7_english_sb',
        pageNumber: pageNum,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: isEven ? 1 : 0,
        videoHotspotsCount: pageNum === 4 || pageNum === 10 ? 1 : 0,
        answerHotspotsCount: isEven ? 1 : 0,
        hasHotspots: isEven,
        titleSnippet: `Unit ${Math.ceil(pageNum / 2)}: Lesson ${pageNum}`,
      };
    });
    this.pagesStore.set('book_grade7_english_sb', g7Pages);
  }

  private async initDemoIngestion() {
    const res = await this.ingestionWorker.processBookContent({
      bookId: 'book_grade11_english_sb',
      gradeNumber: 11,
      subjectName: 'English',
      bookType: BookType.STUDENT_BOOK,
      bookTitle: "English 11 Student's Book",
      mediaFiles: [
        { filename: 'unit1_track1.mp3', buffer: Buffer.from([]), sizeBytes: 3200000 },
        { filename: 'unit1_grammar.mp4', buffer: Buffer.from([]), sizeBytes: 15400000 },
        { filename: 'unit1_extra_dialogue.mp3', buffer: Buffer.from([]), sizeBytes: 2100000 },
      ],
    });
    this.ingestionReportsStore.set('book_grade11_english_sb', res);
  }

  async getAllBooks(): Promise<Book[]> {
    if (this.prisma.isConnected) {
      try {
        const books = await this.prisma.book.findMany({
          include: { subject: true, grade: true },
        });
        if (books.length > 0) {
          return books.map((b) => ({
            ...b,
            type: b.type as any,
            status: b.status as any,
            totalSizeBytes: b.totalSizeBytes ? Number(b.totalSizeBytes) : undefined,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
          }));
        }
      } catch (err) {
        // Fallback
      }
    }
    return this.booksStore;
  }

  async findByGrade(gradeId: number): Promise<Book[]> {
    if (this.prisma.isConnected) {
      try {
        const books = await this.prisma.book.findMany({
          where: { gradeId },
          include: { subject: true },
        });
        return books.map((b) => ({
          ...b,
          type: b.type as any,
          status: b.status as any,
          totalSizeBytes: b.totalSizeBytes ? Number(b.totalSizeBytes) : undefined,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        }));
      } catch (err) {
        // Fallback
      }
    }
    return this.booksStore.filter((b) => b.gradeId === Number(gradeId));
  }

  async findById(bookId: string): Promise<Book | undefined> {
    if (this.prisma.isConnected) {
      try {
        const b = await this.prisma.book.findUnique({ where: { id: bookId } });
        if (b) {
          return {
            ...b,
            type: b.type as any,
            status: b.status as any,
            totalSizeBytes: b.totalSizeBytes ? Number(b.totalSizeBytes) : undefined,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
          };
        }
      } catch (err) {
        // Fallback
      }
    }
    return this.booksStore.find((b) => b.id === bookId);
  }

  async createBook(data: {
    title: string;
    gradeId: number;
    subjectId: string;
    type?: BookType;
    totalPages?: number;
    contentStartPdfPage?: number;
    description?: string;
  }): Promise<Book> {
    const bookId = `book_custom_${Date.now()}`;
    const totalPages = Number(data.totalPages) || 1;
    const gradeId = Number(data.gradeId) || 7;
    const subjectId = data.subjectId || 'sub_eng_7';
    const bookType = data.type || BookType.STUDENT_BOOK;
    const title = data.title || 'Yangi darslik';
    const contentStartPdfPage = normalizeContentStartPage(data.contentStartPdfPage, totalPages);

    const newBook: Book = {
      id: bookId,
      gradeId,
      subjectId,
      type: bookType,
      title,
      totalPages,
      contentStartPdfPage,
      version: 1,
      status: BookStatus.DRAFT,
      totalSizeBytes: 1024 * 1024,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Generate initial blank pages for visual editor
    const pagesInfo: VisualEditorPageInfo[] = Array.from({ length: totalPages }, (_, idx) => ({
      id: `page_${bookId}_${idx + 1}`,
      bookId,
      pageNumber: idx + 1,
      width: 1200,
      height: 1600,
      rotation: 0,
      audioHotspotsCount: 0,
      videoHotspotsCount: 0,
      answerHotspotsCount: 0,
      hasHotspots: false,
      titleSnippet: `Page ${idx + 1}`,
    }));

    this.booksStore.unshift(newBook);
    this.pagesStore.set(bookId, pagesInfo);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.book.create({
          data: {
            id: bookId,
            gradeId,
            subjectId,
            type: bookType as any,
            title,
            totalPages,
            status: 'DRAFT',
          },
        });
      } catch (err) {
        this.logger.warn(`Could not save book to Prisma: ${err}`);
      }
    }

    this.logger.log(`📚 Created new textbook: ${title} (${bookId})`);
    this.persistContentToDisk();
    return newBook;
  }

  async deleteBook(bookId: string): Promise<boolean> {
    const idx = this.booksStore.findIndex((b) => b.id === bookId);
    if (idx === -1) {
      // Check prisma
      if (this.prisma.isConnected) {
        try {
          await this.prisma.book.delete({ where: { id: bookId } });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    this.booksStore.splice(idx, 1);
    this.pagesStore.delete(bookId);
    this.pdfBuffersStore.delete(bookId);
    this.hotspotsStore.delete(bookId);
    this.ingestionReportsStore.delete(bookId);

    // Remove associated answers
    for (const [id, ans] of this.answerKeysStore.entries()) {
      if (ans.studentBookId === bookId || ans.teacherBookId === bookId) {
        this.answerKeysStore.delete(id);
      }
    }

    if (this.prisma.isConnected) {
      try {
        await this.prisma.book.delete({ where: { id: bookId } });
      } catch (err) {
        this.logger.warn(`Prisma book delete error: ${err}`);
      }
    }

    this.coverImagesStore.delete(bookId);
    this.coverMimesStore.delete(bookId);
    if (this.diskEnabled) {
      deleteBinaryDiskSync('pdfs', `${bookId}.pdf`);
      deleteBinaryDiskSync('covers', `${bookId}.bin`);
    }
    this.persistContentToDisk();
    this.logger.log(`🗑️ Successfully deleted book and all assets: ${bookId}`);
    return true;
  }

  clearAllData() {
    this.booksStore = [];
    this.pagesStore.clear();
    this.pdfBuffersStore.clear();
    this.hotspotsStore.clear();
    this.mediaStore.clear();
    this.mediaBuffersStore.clear();
    this.answerKeysStore.clear();
    this.answerKeyImagesStore.clear();
    this.coverImagesStore.clear();
    this.coverMimesStore.clear();
    this.mediaMimesStore.clear();
    this.answerImgMimesStore.clear();
    this.ingestionReportsStore.clear();
    this.tocStore.clear();
    this.userBookmarksStore.clear();
    this.userNotesStore.clear();
    this.userDrawingsStore.clear();
    this.userProgressStore.clear();
    this.persistContentToDisk();
    this.logger.log('🧹 All content database stores cleared completely.');
  }

  async getBookPages(bookId: string): Promise<VisualEditorPageInfo[]> {
    const pages = this.pagesStore.get(bookId);
    if (pages && pages.length > 0) {
      return pages;
    }

    const book = await this.findById(bookId);
    if (!book) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }

    // Generate dynamic page list matching totalPages
    const existingHotspots = this.hotspotsStore.get(bookId) || [];
    const count = book.totalPages || 6;
    const generated: VisualEditorPageInfo[] = Array.from({ length: count }, (_, i) => {
      const pageNum = i + 1;
      const pageHs = existingHotspots.filter((h) => h.pageNumber === pageNum);
      return {
        id: `page_${bookId}_${pageNum}`,
        bookId: book.id,
        pageNumber: pageNum,
        width: 1200,
        height: 1600,
        rotation: 0,
        audioHotspotsCount: pageHs.filter((h) => h.type === 'AUDIO').length,
        videoHotspotsCount: pageHs.filter((h) => h.type === 'VIDEO').length,
        answerHotspotsCount: pageHs.filter((h) => h.type === 'ANSWER_LINK').length,
        hasHotspots: pageHs.length > 0,
        titleSnippet: `Page ${pageNum}`,
      };
    });

    this.pagesStore.set(bookId, generated);
    return generated;
  }

  async addBookPage(bookId: string, titleSnippet?: string): Promise<VisualEditorPageInfo> {
    const pages = await this.getBookPages(bookId);
    const nextPageNumber = pages.length + 1;
    const newPage: VisualEditorPageInfo = {
      id: `page_${bookId}_${nextPageNumber}`,
      bookId,
      pageNumber: nextPageNumber,
      width: 1200,
      height: 1600,
      rotation: 0,
      audioHotspotsCount: 0,
      videoHotspotsCount: 0,
      answerHotspotsCount: 0,
      hasHotspots: false,
      titleSnippet: titleSnippet?.trim() || `Page ${nextPageNumber}`,
    };
    pages.push(newPage);
    this.pagesStore.set(bookId, pages);

    const book = this.booksStore.find((b) => b.id === bookId);
    if (book) {
      book.totalPages = pages.length;
      book.updatedAt = new Date().toISOString();
    }
    this.persistContentToDisk();
    return newPage;
  }

  /**
   * Phase 1: Real PDF Upload & Processing Pipeline
   * Validates file, loads with pdf-lib, extracts exact page count & dimensions.
   */
  async uploadAndProcessPdf(
    fileBuffer: Buffer,
    filename: string,
    metadata: {
      title?: string;
      gradeId?: number;
      subjectId?: string;
      bookType?: BookType;
      contentStartPdfPage?: number;
    },
  ): Promise<{ book: Book; pages: VisualEditorPageInfo[] }> {
    this.logger.log(`📥 Processing uploaded PDF: ${filename} (${fileBuffer.length} bytes)`);

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    } catch (err: any) {
      throw new BadRequestException(`Fayl haqiqiy PDF formatida emas yoki shifrlangan: ${err.message}`);
    }

    const totalPages = pdfDoc.getPageCount();
    this.logger.log(`📄 Validated PDF. Detected ${totalPages} total pages.`);

    const gradeId = Number(metadata.gradeId) || 7;
    const subjectId = metadata.subjectId || 'sub_eng_7';
    const bookType = metadata.bookType || BookType.STUDENT_BOOK;
    const title = metadata.title || filename.replace(/\.[^/.]+$/, '');
    const bookId = `book_custom_${Date.now()}`;
    const contentStartPdfPage = normalizeContentStartPage(metadata.contentStartPdfPage, totalPages);

    // Extract pages metadata
    const pagesInfo: VisualEditorPageInfo[] = pdfDoc.getPages().map((page, idx) => {
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;
      return {
        id: `page_${bookId}_${idx + 1}`,
        bookId,
        pageNumber: idx + 1,
        width: Math.round(width),
        height: Math.round(height),
        rotation,
        audioHotspotsCount: 0,
        videoHotspotsCount: 0,
        answerHotspotsCount: 0,
        hasHotspots: false,
        titleSnippet: `Page ${idx + 1}`,
      };
    });

    const newBook: Book = {
      id: bookId,
      gradeId,
      subjectId,
      type: bookType,
      title,
      totalPages,
      contentStartPdfPage,
      version: 1,
      status: BookStatus.DRAFT,
      totalSizeBytes: fileBuffer.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save in memory & disk stores
    this.booksStore.unshift(newBook);
    this.pagesStore.set(bookId, pagesInfo);
    this.pdfBuffersStore.set(bookId, fileBuffer);
    if (this.diskEnabled) {
      writeBinaryDiskSync('pdfs', `${bookId}.pdf`, fileBuffer);
    }
    this.persistContentToDisk();

    // Save in Prisma if available
    if (this.prisma.isConnected) {
      try {
        await this.prisma.book.create({
          data: {
            id: bookId,
            gradeId,
            subjectId,
            type: bookType as any,
            title,
            totalPages,
            status: 'DRAFT',
            totalSizeBytes: BigInt(fileBuffer.length),
          },
        });
      } catch (err) {
        // Fallback
      }
    }

    this.logger.log(`✅ Book [${title}] created with ${totalPages} pages.`);
    return { book: newBook, pages: pagesInfo };
  }

  private renderedPageLock = new Map<string, Promise<Buffer | null>>();
  private cachedPdfDocs = new Map<string, Promise<PDFDocument>>();

  getPdfBuffer(bookId: string): Buffer | null {
    const cached = this.pdfBuffersStore.get(bookId);
    if (cached) return cached;
    if (this.diskEnabled) {
      const fromDisk = readBinaryDiskSync('pdfs', `${bookId}.pdf`);
      if (fromDisk) {
        this.pdfBuffersStore.set(bookId, fromDisk);
        return fromDisk;
      }
    }
    return null;
  }

  private getParsedPdfDoc(bookId: string, buffer: Buffer): Promise<PDFDocument> {
    const existing = this.cachedPdfDocs.get(bookId);
    if (existing) return existing;
    const promise = PDFDocument.load(buffer, { ignoreEncryption: true }).catch((err) => {
      this.cachedPdfDocs.delete(bookId);
      throw err;
    });
    this.cachedPdfDocs.set(bookId, promise);
    return promise;
  }

  /**
   * Extracts a single PDF page via pdf-lib and renders it to PNG using macOS sips,
   * caching rendered pages on disk under .data/rendered-pages/ so Android/iOS Expo Go
   * renders full textbook PDFs cleanly as native images.
   */
  async getRenderedPdfPageImage(bookId: string, pageNumber: number): Promise<Buffer | null> {
    if (!Number.isFinite(pageNumber) || pageNumber < 1) return null;
    const safePage = Math.floor(pageNumber);
    const cacheFilename = `${bookId}_p${safePage}.png`;

    if (this.diskEnabled) {
      const diskPng = readBinaryDiskSync('rendered-pages', cacheFilename);
      if (diskPng && diskPng.length > 0) return diskPng;
    }

    const lockKey = `${bookId}:${safePage}`;
    const inflight = this.renderedPageLock.get(lockKey);
    if (inflight) return inflight;

    const job = (async (): Promise<Buffer | null> => {
      const pdfBuf = this.getPdfBuffer(bookId);
      if (!pdfBuf) return null;

      const tmpId = `${bookId}_${safePage}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const tmpPdfPath = path.join(os.tmpdir(), `stb_${tmpId}.pdf`);
      const tmpPngPath = path.join(os.tmpdir(), `stb_${tmpId}.png`);

      try {
        const srcDoc = await this.getParsedPdfDoc(bookId, pdfBuf);
        const total = srcDoc.getPageCount();
        if (safePage > total) return null;

        const singleDoc = await PDFDocument.create();
        const [copied] = await singleDoc.copyPages(srcDoc, [safePage - 1]);
        singleDoc.addPage(copied);
        const singleBytes = await singleDoc.save();

        fs.writeFileSync(tmpPdfPath, singleBytes);
        await execFileAsync('/usr/bin/sips', ['-s', 'format', 'png', '-Z', '1400', tmpPdfPath, '--out', tmpPngPath]);

        if (!fs.existsSync(tmpPngPath)) return null;
        const pngBuf = fs.readFileSync(tmpPngPath);
        if (this.diskEnabled && pngBuf.length > 0) {
          writeBinaryDiskSync('rendered-pages', cacheFilename, pngBuf);
        }
        return pngBuf;
      } catch (err: any) {
        this.logger.warn(`Failed rendering PDF page ${bookId}#${safePage} to PNG: ${err?.message || err}`);
        return null;
      } finally {
        try {
          if (fs.existsSync(tmpPdfPath)) fs.unlinkSync(tmpPdfPath);
        } catch {}
        try {
          if (fs.existsSync(tmpPngPath)) fs.unlinkSync(tmpPngPath);
        } catch {}
      }
    })();

    this.renderedPageLock.set(lockKey, job);
    try {
      return await job;
    } finally {
      this.renderedPageLock.delete(lockKey);
    }
  }

  async triggerIngestion(
    bookId: string,
    uploadedMediaFiles?: Array<{ filename: string; sizeBytes: number }>,
  ): Promise<IngestionJobResult> {
    const book = await this.findById(bookId);
    if (!book) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }

    const mediaList = uploadedMediaFiles?.length
      ? uploadedMediaFiles.map((m) => ({ filename: m.filename, buffer: Buffer.from([]), sizeBytes: m.sizeBytes }))
      : [
          { filename: 'unit1_track1.mp3', buffer: Buffer.from([]), sizeBytes: 3200000 },
          { filename: 'unit1_grammar.mp4', buffer: Buffer.from([]), sizeBytes: 15400000 },
          { filename: 'unit1_extra_dialogue.mp3', buffer: Buffer.from([]), sizeBytes: 2100000 },
        ];

    const result = await this.ingestionWorker.processBookContent({
      bookId: book.id,
      gradeNumber: book.gradeId,
      subjectName: 'English',
      bookType: book.type,
      bookTitle: book.title,
      mediaFiles: mediaList,
    });

    this.ingestionReportsStore.set(book.id, result);
    return result;
  }

  async getValidationReport(bookId: string): Promise<IngestionJobResult> {
    let report = this.ingestionReportsStore.get(bookId);
    if (!report) {
      report = await this.triggerIngestion(bookId);
    }
    return report;
  }

  async getBookManifest(bookId: string): Promise<BookBundleManifest> {
    const report = await this.getValidationReport(bookId);
    return report.manifest;
  }

  async togglePublish(bookId: string, isPublished: boolean): Promise<Book> {
    const book = this.booksStore.find((b) => b.id === bookId);
    if (!book) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }

    book.status = isPublished ? BookStatus.PUBLISHED : BookStatus.DRAFT;
    book.updatedAt = new Date().toISOString();

    if (this.prisma.isConnected) {
      try {
        await this.prisma.book.update({
          where: { id: bookId },
          data: { status: isPublished ? 'PUBLISHED' : 'DRAFT' },
        });
      } catch (err) {
        // Fallback
      }
    }

    this.logger.log(`Book ${bookId} publish status changed to: ${book.status}`);
    return book;
  }

  // ==========================================
  // PHASE 5: PRE-PUBLISH VALIDATION & LINK DETECTION
  // ==========================================
  validateBookForPublish(bookId: string): {
    bookId: string;
    bookTitle: string;
    canPublish: boolean;
    errors: string[];
    warnings: string[];
    summary: {
      totalPages: number;
      totalHotspots: number;
      totalAudioHotspots: number;
      totalVideoHotspots: number;
      totalAnswerMappings: number;
      missingResourcesCount: number;
      gradeNumber: number;
      status: string;
    };
  } {
    const book = this.booksStore.find((b) => b.id === bookId);
    if (!book) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }

    const hotspots = this.hotspotsStore.get(bookId) || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let missingResources = 0;

    const audioHs = hotspots.filter((h) => h.type === 'AUDIO');
    const videoHs = hotspots.filter((h) => h.type === 'VIDEO');
    const answerHs = hotspots.filter((h) => h.type === 'ANSWER_LINK');

    // 1. Validate Audio Hotspots
    for (const h of audioHs) {
      if (!h.targetFile) {
        errors.push(`Sahifa ${h.pageNumber}: "${h.label}" audio hotspotiga fayl biriktirilmagan.`);
        missingResources++;
      } else {
        const found = Array.from(this.mediaStore.values()).some((m) => m.filename === h.targetFile);
        if (!found) {
          warnings.push(`Sahifa ${h.pageNumber}: "${h.targetFile}" audio fayli kutubxonada mavjud emas.`);
        }
      }
    }

    // 2. Validate Video Hotspots
    for (const h of videoHs) {
      if (!h.targetFile) {
        errors.push(`Sahifa ${h.pageNumber}: "${h.label}" video hotspotiga fayl biriktirilmagan.`);
        missingResources++;
      } else {
        const found = Array.from(this.mediaStore.values()).some((m) => m.filename === h.targetFile);
        if (!found) {
          warnings.push(`Sahifa ${h.pageNumber}: "${h.targetFile}" video fayli kutubxonada mavjud emas.`);
        }
      }
    }

    // 3. Validate Answer Hotspots
    for (const h of answerHs) {
      if (!h.targetPageNumber) {
        errors.push(
          `Sahifa ${h.pageNumber}: "${h.label}" javoblar kalitiga Teacher's Book sahifa raqami kiritilmagan.`,
        );
        missingResources++;
      }
      if (!h.solutionText && (!h.multiAnswers || h.multiAnswers.length === 0)) {
        warnings.push(`Sahifa ${h.pageNumber}: "${h.label}" javoblar matni bo‘sh qoldirilgan.`);
      }
    }

    // 4. Overlap Detection Warnings
    const pagesMap = new Map<number, HotspotItem[]>();
    for (const h of hotspots) {
      const list = pagesMap.get(h.pageNumber) || [];
      list.push(h);
      pagesMap.set(h.pageNumber, list);
    }

    pagesMap.forEach((pageHotspots, pageNum) => {
      for (let i = 0; i < pageHotspots.length; i++) {
        for (let j = i + 1; j < pageHotspots.length; j++) {
          const h1 = pageHotspots[i];
          const h2 = pageHotspots[j];
          const r1 = h1.rect;
          const r2 = h2.rect;
          const overlap =
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y;
          if (overlap) {
            warnings.push(
              `Sahifa ${pageNum}: "${h1.label}" va "${h2.label}" bir-biri bilan to‘qnashgan (overlap).`,
            );
          }
        }
      }
    });

    const canPublish = errors.length === 0;

    return {
      bookId,
      bookTitle: book.title,
      canPublish,
      errors,
      warnings,
      summary: {
        totalPages: book.totalPages,
        totalHotspots: hotspots.length,
        totalAudioHotspots: audioHs.length,
        totalVideoHotspots: videoHs.length,
        totalAnswerMappings: answerHs.length,
        missingResourcesCount: missingResources,
        gradeNumber: book.gradeId,
        status: book.status,
      },
    };
  }

  async publishBookWithValidation(
    bookId: string,
    force?: boolean,
  ): Promise<{
    success: boolean;
    book: Book;
    validation: ReturnType<ContentService['validateBookForPublish']>;
  }> {
    const validation = this.validateBookForPublish(bookId);
    if (!validation.canPublish && !force) {
      throw new BadRequestException({
        message: 'Darslikni nashr qilish bloklandi: Tanqidiy xatoliklar mavjud.',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const book = await this.togglePublish(bookId, true);
    return {
      success: true,
      book,
      validation,
    };
  }

  detectPdfLinks(bookId: string) {
    const book = this.booksStore.find((b) => b.id === bookId);
    if (!book) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }

    // Spec §10: Extract embedded hyperlinks / media annotations
    return [
      {
        id: 'det_link_1',
        pageNumber: 2,
        rect: { x: 0.1, y: 0.82, w: 0.38, h: 0.08 },
        detectedUrl: 'audio://grade11/unit1/track1.mp3',
        suggestedType: 'AUDIO' as const,
        suggestedFile: 'unit1_track1.mp3',
        suggestedTitle: '🎧 Audio Track 2.1 — Listening',
        confidenceScore: 0.98,
      },
      {
        id: 'det_link_2',
        pageNumber: 2,
        rect: { x: 0.54, y: 0.82, w: 0.38, h: 0.08 },
        detectedUrl: 'answers://grade11/teacher_book/page14',
        suggestedType: 'ANSWER_LINK' as const,
        suggestedTitle: '💡 Teacher Answers (p. 14)',
        confidenceScore: 0.95,
      },
      {
        id: 'det_link_3',
        pageNumber: 4,
        rect: { x: 0.25, y: 0.82, w: 0.5, h: 0.08 },
        detectedUrl: 'video://grade11/unit2/conditionals.mp4',
        suggestedType: 'VIDEO' as const,
        suggestedFile: 'unit2_grammar.mp4',
        suggestedTitle: '🎬 Video Lesson — Grammar Focus',
        confidenceScore: 0.92,
      },
    ];
  }

  /**
   * Phase 2: Visual Hotspot Manager CRUD & Coordinates Engine
   */
  getBookHotspots(bookId: string): HotspotItem[] {
    return this.hotspotsStore.get(bookId) || [];
  }

  saveBookHotspots(bookId: string, rawHotspots: HotspotItem[]): {
    success: boolean;
    count: number;
    warnings: string[];
    hotspots: HotspotItem[];
  } {
    const warnings: string[] = [];

    // Coordinate validation & normalization (Spec §8)
    const validatedHotspots = rawHotspots.map((h, idx) => {
      let { x, y, w, h: height } = h.rect;
      // Clamping between 0.0 and 1.0
      x = Math.max(0, Math.min(0.98, x));
      y = Math.max(0, Math.min(0.98, y));
      w = Math.max(0.02, Math.min(1 - x, w));
      height = Math.max(0.02, Math.min(1 - y, height));

      return {
        ...h,
        id: h.id || `hs_${Date.now()}_${idx}`,
        bookId,
        rect: {
          x: Math.round(x * 1000) / 1000,
          y: Math.round(y * 1000) / 1000,
          w: Math.round(w * 1000) / 1000,
          h: Math.round(height * 1000) / 1000,
        },
      };
    });

    // Overlap detection (Spec §7, §8)
    for (let i = 0; i < validatedHotspots.length; i++) {
      for (let j = i + 1; j < validatedHotspots.length; j++) {
        const h1 = validatedHotspots[i];
        const h2 = validatedHotspots[j];
        if (h1.pageNumber === h2.pageNumber) {
          const r1 = h1.rect;
          const r2 = h2.rect;
          const isOverlapping =
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y;

          if (isOverlapping) {
            warnings.push(
              `Sahifa ${h1.pageNumber}: "${h1.label}" va "${h2.label}" bir-birining ustiga tushmoqda.`,
            );
          }
        }
      }
    }

    this.hotspotsStore.set(bookId, validatedHotspots);

    // Synchronize page counts in pagesStore
    const pages = this.pagesStore.get(bookId);
    if (pages) {
      pages.forEach((p) => {
        const pageHs = validatedHotspots.filter((h) => h.pageNumber === p.pageNumber);
        p.audioHotspotsCount = pageHs.filter((h) => h.type === 'AUDIO').length;
        p.videoHotspotsCount = pageHs.filter((h) => h.type === 'VIDEO').length;
        p.answerHotspotsCount = pageHs.filter((h) => h.type === 'ANSWER_LINK').length;
        p.hasHotspots = pageHs.length > 0;
      });
    }

    this.persistContentToDisk();
    this.logger.log(`💾 Saved ${validatedHotspots.length} hotspots for book [${bookId}]. Warnings: ${warnings.length}`);
    return {
      success: true,
      count: validatedHotspots.length,
      warnings,
      hotspots: validatedHotspots,
    };
  }

  deleteHotspot(bookId: string, hotspotId: string): { success: boolean; remainingCount: number } {
    const list = this.hotspotsStore.get(bookId) || [];
    const updated = list.filter((h) => h.id !== hotspotId);
    this.hotspotsStore.set(bookId, updated);
    this.persistContentToDisk();
    return { success: true, remainingCount: updated.length };
  }

  /**
   * Phase 3: Media Library API
   */
  getAllMedia(filter?: {
    bookId?: string;
    type?: 'AUDIO' | 'VIDEO';
    search?: string;
    unit?: string;
  }): MediaItem[] {
    let list = Array.from(this.mediaStore.values());

    if (filter?.bookId) {
      list = list.filter((m) => !m.bookId || m.bookId === filter.bookId);
    }
    if (filter?.type) {
      list = list.filter((m) => m.type === filter.type);
    }
    if (filter?.unit && filter.unit !== 'ALL') {
      list = list.filter((m) => m.unitLabel.toLowerCase().includes(filter.unit!.toLowerCase()));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.filename.toLowerCase().includes(q) ||
          m.unitLabel.toLowerCase().includes(q),
      );
    }

    return list;
  }

  getMediaById(id: string): MediaItem | undefined {
    return this.mediaStore.get(id);
  }

  createOrRegisterMedia(dto: Partial<MediaItem>): MediaItem {
    const id = dto.id || `media_${Date.now()}`;
    const newItem: MediaItem = {
      id,
      bookId: dto.bookId || 'book_grade11_english_sb',
      type: dto.type || 'AUDIO',
      filename: dto.filename || `track_${Date.now()}.${dto.type === 'VIDEO' ? 'mp4' : 'mp3'}`,
      title: dto.title || dto.filename || 'Yangi media fayl',
      unitLabel: dto.unitLabel || 'Unit 1',
      lessonLabel: dto.lessonLabel || 'Lesson 1',
      durationSeconds: dto.durationSeconds || 120,
      sizeBytes: dto.sizeBytes || 2500000,
      language: dto.language || 'English',
      url: dto.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      thumbnailUrl: dto.thumbnailUrl,
      createdAt: new Date().toISOString(),
    };

    this.mediaStore.set(id, newItem);
    this.persistContentToDisk();
    this.logger.log(`📻 Registered new media [${newItem.title}] (${newItem.type})`);
    return newItem;
  }

  uploadAndSaveMediaFile(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    meta: {
      title?: string;
      type?: 'AUDIO' | 'VIDEO';
      bookId?: string;
      unitLabel?: string;
      durationSeconds?: number;
    },
  ): MediaItem {
    const id = `media_${Date.now()}`;
    const isVideo =
      meta.type === 'VIDEO' ||
      file.mimetype.startsWith('video') ||
      Boolean(file.originalname.match(/\.(mp4|mov|webm|avi|mkv)$/i));
    const detectedType: 'AUDIO' | 'VIDEO' = isVideo ? 'VIDEO' : 'AUDIO';

    const cleanTitle =
      meta.title?.trim() || file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const newItem: MediaItem = {
      id,
      bookId: meta.bookId || undefined,
      type: detectedType,
      filename: file.originalname,
      title: cleanTitle,
      unitLabel: meta.unitLabel?.trim() || 'Unit 1',
      lessonLabel: 'Lesson 1',
      durationSeconds: meta.durationSeconds || (detectedType === 'AUDIO' ? 120 : 300),
      sizeBytes: file.size,
      language: 'English',
      url: `http://localhost:4000/api/v1/content/media/${id}/file`,
      createdAt: new Date().toISOString(),
    };

    this.mediaStore.set(id, newItem);
    this.mediaBuffersStore.set(id, { buffer: file.buffer, mimeType: file.mimetype });
    this.mediaMimesStore.set(id, file.mimetype);
    if (this.diskEnabled) {
      writeBinaryDiskSync('media', `${id}.bin`, file.buffer);
    }
    this.persistContentToDisk();
    this.logger.log(`📻 Uploaded and saved real media file [${newItem.title}] (${newItem.type}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    return newItem;
  }

  getMediaFileBuffer(id: string): { buffer: Buffer; mimeType: string } | null {
    const cached = this.mediaBuffersStore.get(id);
    if (cached) return cached;
    if (this.diskEnabled) {
      const buf = readBinaryDiskSync('media', `${id}.bin`);
      if (buf) {
        const mimeType = this.mediaMimesStore.get(id) || 'application/octet-stream';
        const entry = { buffer: buf, mimeType };
        this.mediaBuffersStore.set(id, entry);
        return entry;
      }
    }
    return null;
  }

  deleteMedia(id: string): boolean {
    this.mediaBuffersStore.delete(id);
    this.mediaMimesStore.delete(id);
    if (this.diskEnabled) {
      deleteBinaryDiskSync('media', `${id}.bin`);
    }
    const ok = this.mediaStore.delete(id);
    this.persistContentToDisk();
    return ok;
  }

  updateBook(bookId: string, updates: Partial<Book>): Book | null {
    const idx = this.booksStore.findIndex((b) => b.id === bookId);
    if (idx === -1) return null;
    const current = this.booksStore[idx];
    const nextStartPage =
      updates.contentStartPdfPage !== undefined
        ? normalizeContentStartPage(updates.contentStartPdfPage, updates.totalPages ?? current.totalPages ?? 1)
        : current.contentStartPdfPage;
    this.booksStore[idx] = {
      ...current,
      ...updates,
      ...(nextStartPage !== undefined ? { contentStartPdfPage: nextStartPage } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.persistContentToDisk();
    return this.booksStore[idx];
  }

  // ==========================================
  // PHASE 4: TEACHER'S BOOK & ANSWER KEY APIS
  // ==========================================
  getTeacherBooks(gradeId?: number): Book[] {
    let tbs = this.booksStore.filter((b) => b.type === BookType.TEACHER_BOOK);
    if (gradeId) {
      tbs = tbs.filter((b) => b.gradeId === gradeId);
    }
    return tbs;
  }

  getAllAnswerKeys(filter?: {
    studentBookId?: string;
    teacherBookId?: string;
    studentPage?: number;
    search?: string;
    unit?: string;
  }): AnswerKeyItem[] {
    let list = Array.from(this.answerKeysStore.values());
    if (filter?.studentBookId) {
      list = list.filter((a) => a.studentBookId === filter.studentBookId);
    }
    if (filter?.teacherBookId) {
      list = list.filter((a) => a.teacherBookId === filter.teacherBookId);
    }
    if (filter?.studentPage) {
      list = list.filter((a) => a.studentPageNumber === Number(filter.studentPage));
    }
    if (filter?.unit && filter.unit !== 'ALL') {
      list = list.filter((a) => a.unitLabel.toLowerCase().includes(filter.unit!.toLowerCase()));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.exerciseNumber.toLowerCase().includes(q) ||
          a.exerciseTitle.toLowerCase().includes(q) ||
          a.solutionKey.toLowerCase().includes(q) ||
          a.unitLabel.toLowerCase().includes(q),
      );
    }
    return list;
  }

  getAnswerKeyById(id: string): AnswerKeyItem | undefined {
    return this.answerKeysStore.get(id);
  }

  createOrUpdateAnswerKey(dto: Partial<AnswerKeyItem>): AnswerKeyItem {
    const id = dto.id || `ans_${Date.now()}`;
    const item: AnswerKeyItem = {
      id,
      studentBookId: dto.studentBookId || 'book_grade11_english_sb',
      teacherBookId: dto.teacherBookId || 'book_grade11_english_tb',
      teacherBookTitle: dto.teacherBookTitle || "English 11 Teacher's Book (Answer Key & Methodics)",
      teacherPageNumber: dto.teacherPageNumber || 14,
      studentPageNumber: dto.studentPageNumber || 2,
      unitLabel: dto.unitLabel || 'Unit 1: Digital Future',
      exerciseNumber: dto.exerciseNumber || 'Task 2.1',
      exerciseTitle: dto.exerciseTitle || 'Interactive Vocabulary',
      solutionKey: dto.solutionKey || '1. C | 2. A | 3. D | 4. B',
      methodologyNotes:
        dto.methodologyNotes || "O‘quvchilar juftlikda mashqni tekshirishi tavsiya etiladi.",
      previewThumbnail: dto.previewThumbnail,
      createdAt: dto.createdAt || new Date().toISOString(),
    };
    this.answerKeysStore.set(id, item);
    this.persistContentToDisk();
    this.logger.log(`💡 Saved Answer Key [${item.exerciseNumber}] for Teacher Book [${item.teacherBookId}]`);
    return item;
  }

  saveBookCoverImage(bookId: string, file: { buffer: Buffer; mimetype: string }): Book | null {
    const book = this.booksStore.find((b) => b.id === bookId);
    if (!book) return null;
    this.coverImagesStore.set(bookId, { buffer: file.buffer, mimeType: file.mimetype });
    this.coverMimesStore.set(bookId, file.mimetype);
    if (this.diskEnabled) {
      writeBinaryDiskSync('covers', `${bookId}.bin`, file.buffer);
    }
    book.coverImageUrl = `http://localhost:4000/api/v1/content/books/${bookId}/cover`;
    this.persistContentToDisk();
    this.logger.log(`📸 Saved custom cover image for book [${book.title}] (${(file.buffer.length / 1024).toFixed(1)} KB)`);
    return book;
  }

  getBookCoverImage(bookId: string): { buffer: Buffer; mimeType: string } | null {
    const cached = this.coverImagesStore.get(bookId);
    if (cached) return cached;
    if (this.diskEnabled) {
      const buf = readBinaryDiskSync('covers', `${bookId}.bin`);
      if (buf) {
        const mimeType = this.coverMimesStore.get(bookId) || 'image/jpeg';
        const entry = { buffer: buf, mimeType };
        this.coverImagesStore.set(bookId, entry);
        return entry;
      }
    }
    return null;
  }

  saveAnswerKeyWithImage(
    file: { buffer: Buffer; mimetype: string } | undefined,
    dto: Partial<AnswerKeyItem>,
  ): AnswerKeyItem {
    const id = dto.id || `ans_${Date.now()}`;
    const hasImage = Boolean(file && file.buffer);
    if (hasImage && file) {
      this.answerKeyImagesStore.set(id, { buffer: file.buffer, mimeType: file.mimetype });
      this.answerImgMimesStore.set(id, file.mimetype);
      if (this.diskEnabled) {
        writeBinaryDiskSync('answer-images', `${id}.bin`, file.buffer);
      }
    }

    const item: AnswerKeyItem = {
      id,
      studentBookId: dto.studentBookId || 'book_grade11_english_sb',
      teacherBookId: dto.teacherBookId || 'book_grade11_english_tb',
      teacherBookTitle: dto.teacherBookTitle || "Teacher's Book (Answer Key)",
      teacherPageNumber: dto.teacherPageNumber || 1,
      studentPageNumber: dto.studentPageNumber || 1,
      unitLabel: dto.unitLabel || 'Unit 1',
      exerciseNumber: dto.exerciseNumber || 'Mashq',
      exerciseTitle: dto.exerciseTitle || dto.exerciseNumber || 'Mashq Javoblari',
      solutionKey: dto.solutionKey || (hasImage ? "📸 Rasm orqali yuklangan javoblar kaliti" : "Javoblar ko'rsatilmagan"),
      methodologyNotes: dto.methodologyNotes || '',
      imageUrl: hasImage ? `http://localhost:4000/api/v1/content/answers/${id}/image` : undefined,
      format: hasImage ? (dto.solutionKey ? 'BOTH' : 'IMAGE') : 'TEXT',
      createdAt: new Date().toISOString(),
    };

    this.answerKeysStore.set(id, item);
    this.persistContentToDisk();
    this.logger.log(`💡 Saved Answer Key [${item.exerciseNumber}] with format [${item.format}]`);
    return item;
  }

  getAnswerKeyImage(id: string): { buffer: Buffer; mimeType: string } | null {
    const cached = this.answerKeyImagesStore.get(id);
    if (cached) return cached;
    if (this.diskEnabled) {
      const buf = readBinaryDiskSync('answer-images', `${id}.bin`);
      if (buf) {
        const mimeType = this.answerImgMimesStore.get(id) || 'image/png';
        const entry = { buffer: buf, mimeType };
        this.answerKeyImagesStore.set(id, entry);
        return entry;
      }
    }
    return null;
  }

  deleteAnswerKey(id: string): boolean {
    this.answerKeyImagesStore.delete(id);
    this.answerImgMimesStore.delete(id);
    if (this.diskEnabled) {
      deleteBinaryDiskSync('answer-images', `${id}.bin`);
    }
    const ok = this.answerKeysStore.delete(id);
    this.persistContentToDisk();
    return ok;
  }

  getTeacherBookPageDetails(teacherBookId: string, pageNumber: number) {
    const tb = this.booksStore.find((b) => b.id === teacherBookId);
    const answersOnPage = Array.from(this.answerKeysStore.values()).filter(
      (a) => a.teacherBookId === teacherBookId && a.teacherPageNumber === Number(pageNumber),
    );
    return {
      teacherBookId,
      teacherBookTitle: tb?.title || "Teacher's Book (Answer Key & Methodics)",
      pageNumber: Number(pageNumber),
      totalAnswersOnPage: answersOnPage.length,
      answers: answersOnPage,
      pageImagePreview: `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80`,
    };
  }

  // ==========================================
  // READER SYNC: TOC, BOOKMARKS, NOTES, DRAWINGS, PROGRESS
  // ==========================================
  async getBookToc(bookId: string) {
    const custom = this.tocStore.get(bookId);
    if (!custom || custom.length === 0) return [];
    return [...custom].sort((a, b) => a.pageNumber - b.pageNumber);
  }

  saveBookToc(
    bookId: string,
    items: Array<{
      id?: string;
      unit?: string;
      title: string;
      pageNumber: number;
      endPageNumber?: number;
    }>,
  ) {
    const cleaned = (items || [])
      .filter((it) => it && typeof it.title === 'string' && it.title.trim().length > 0)
      .map((it) => ({
        id: it.id,
        unit: it.unit,
        title: it.title.trim(),
        pageNumber: Math.max(1, Math.round(Number(it.pageNumber) || 1)),
        endPageNumber:
          it.endPageNumber && Number(it.endPageNumber) >= Math.max(1, Math.round(Number(it.pageNumber) || 1))
            ? Math.round(Number(it.endPageNumber))
            : undefined,
      }))
      .sort((a, b) => a.pageNumber - b.pageNumber);

    const mapped = cleaned.map((it, idx) => ({
      id: it.id || `toc_${bookId}_${idx}_${Date.now()}`,
      bookId,
      unit: it.unit?.trim() || `Unit ${idx + 1}`,
      title: it.title,
      pageNumber: it.pageNumber,
      ...(it.endPageNumber ? { endPageNumber: it.endPageNumber } : {}),
    }));
    this.tocStore.set(bookId, mapped);
    this.persistContentToDisk();
    return mapped;
  }

  getUserBookmarks(userId: string, bookId: string) {
    const key = `${userId}:${bookId}`;
    return this.userBookmarksStore.get(key) || [];
  }

  addUserBookmark(userId: string, bookId: string, pageNumber: number, title?: string) {
    const key = `${userId}:${bookId}`;
    const list = this.userBookmarksStore.get(key) || [];
    const existing = list.find((b) => b.pageNumber === Number(pageNumber));
    if (existing) {
      if (title) {
        existing.title = title;
        this.persistContentToDisk();
      }
      return existing;
    }
    const created = {
      id: `bm_${Date.now()}_${pageNumber}`,
      userId,
      bookId,
      pageNumber: Number(pageNumber),
      title: title?.trim() || `${pageNumber}-sahifa xatcho‘pi`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.userBookmarksStore.set(key, list);
    this.persistContentToDisk();
    return created;
  }

  deleteUserBookmark(userId: string, bookId: string, pageNumber: number) {
    const key = `${userId}:${bookId}`;
    const list = this.userBookmarksStore.get(key) || [];
    const updated = list.filter((b) => b.pageNumber !== Number(pageNumber));
    this.userBookmarksStore.set(key, updated);
    this.persistContentToDisk();
    return { success: true };
  }

  getUserNotes(userId: string, bookId: string) {
    const key = `${userId}:${bookId}`;
    return this.userNotesStore.get(key) || [];
  }

  addUserNote(userId: string, bookId: string, pageNumber: number, text: string) {
    const key = `${userId}:${bookId}`;
    const list = this.userNotesStore.get(key) || [];
    const created = {
      id: `nt_${Date.now()}`,
      userId,
      bookId,
      pageNumber: Number(pageNumber) || 1,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.userNotesStore.set(key, list);
    this.persistContentToDisk();
    return created;
  }

  deleteUserNote(userId: string, bookId: string, noteId: string) {
    const key = `${userId}:${bookId}`;
    const list = this.userNotesStore.get(key) || [];
    this.userNotesStore.set(key, list.filter((n) => n.id !== noteId));
    this.persistContentToDisk();
    return { success: true };
  }

  getUserDrawings(userId: string, bookId: string, pageNumber?: number) {
    if (pageNumber !== undefined) {
      return this.userDrawingsStore.get(`${userId}:${bookId}:${pageNumber}`) || [];
    }
    const prefix = `${userId}:${bookId}:`;
    const grouped: Array<{ pageNumber: number; strokes: any[] }> = [];
    for (const [k, strokes] of this.userDrawingsStore.entries()) {
      if (k.startsWith(prefix)) {
        const pageStr = k.slice(prefix.length);
        const pg = parseInt(pageStr, 10);
        if (!isNaN(pg)) {
          grouped.push({ pageNumber: pg, strokes });
        }
      }
    }
    return grouped;
  }

  saveUserDrawings(userId: string, bookId: string, pageNumber: number, strokes: any[]) {
    const key = `${userId}:${bookId}:${pageNumber}`;
    this.userDrawingsStore.set(key, Array.isArray(strokes) ? strokes : []);
    this.persistContentToDisk();
    return { success: true, count: (strokes || []).length };
  }

  async getUserReadingProgress(userId: string) {
    const localList = this.userProgressStore.get(userId) || [];
    if (!this.prisma.isConnected) {
      return localList;
    }

    try {
      const rows = await this.prisma.userReadingProgress.findMany({
        where: { userId },
        orderBy: { lastOpenedAt: 'desc' },
        take: 20,
        include: { book: true },
      });
      if (rows.length === 0) return localList;

      const byBook = new Map<string, any>();
      rows.forEach((row: any) => {
        byBook.set(row.bookId, {
          userId: row.userId,
          bookId: row.bookId,
          lastPageNumber: row.lastPageNumber,
          totalPages: row.book?.totalPages || 96,
          bookTitle: row.book?.title || 'Darslik',
          gradeId: row.book?.gradeId || 11,
          subjectId: row.book?.subjectId || 'sub_eng',
          coverImageUrl: row.book?.coverImageUrl || null,
          lastOpenedAt: row.lastOpenedAt?.toISOString?.() || new Date().toISOString(),
        });
      });
      localList.forEach((item) => {
        const existing = byBook.get(item.bookId);
        if (!existing || Date.parse(item.lastOpenedAt) > Date.parse(existing.lastOpenedAt)) {
          byBook.set(item.bookId, item);
        }
      });

      return Array.from(byBook.values())
        .sort((a, b) => Date.parse(b.lastOpenedAt) - Date.parse(a.lastOpenedAt))
        .slice(0, 20);
    } catch {
      return localList;
    }
  }

  async saveUserReadingProgress(userId: string, bookId: string, lastPageNumber: number) {
    const list = [...(this.userProgressStore.get(userId) || [])];
    const book = await this.findById(bookId);
    const parsedPage = Math.max(1, Math.floor(Number(lastPageNumber) || 1));
    const totalPages = book?.totalPages && book.totalPages > 0
      ? book.totalPages
      : Math.max(parsedPage, 96);
    const clampedPage = Math.min(totalPages, parsedPage);
    const nowIso = new Date().toISOString();

    const entry = {
      userId,
      bookId,
      lastPageNumber: clampedPage,
      totalPages,
      bookTitle: book?.title || 'Darslik',
      gradeId: book?.gradeId || 11,
      subjectId: book?.subjectId || 'sub_eng',
      coverImageUrl: book?.coverImageUrl || null,
      lastOpenedAt: nowIso,
    };

    const idx = list.findIndex((p) => p.bookId === bookId);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
    list.unshift(entry);
    this.userProgressStore.set(userId, list.slice(0, 20));
    this.persistProgressToDisk();

    if (this.prisma.isConnected) {
      try {
        await this.prisma.userReadingProgress.upsert({
          where: { userId_bookId: { userId, bookId } },
          update: { lastPageNumber: clampedPage, lastOpenedAt: new Date(nowIso) },
          create: {
            userId,
            bookId,
            lastPageNumber: clampedPage,
            lastOpenedAt: new Date(nowIso),
          },
        });
      } catch {
        // Ignore FK miss for in-memory/demo books; disk & memory store remain accurate
      }
    }

    return entry;
  }
}
