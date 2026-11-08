import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Save,
  Eye,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  Search,
  Filter,
  Music,
  Video,
  Lightbulb,
  Layers,
  FileText,
  Sliders,
  Sparkles,
  ExternalLink,
  Smartphone,
  RefreshCw,
  Check,
  ChevronDown,
  Info,
  MousePointer,
  Square,
  Copy,
  Trash2,
  Play,
  Pause,
  Volume2,
  Plus,
  X,
  Link2,
  Unlink,
  Film,
  Headphones,
  Clock,
  HardDrive,
} from 'lucide-react';
import { Book, BookType, BookStatus } from '@smartteacherbook/shared';

export interface VisualPage {
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
  titleSnippet?: string;
}

export type HotspotType = 'AUDIO' | 'VIDEO' | 'ANSWER_LINK' | 'OTHER';

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
  type: HotspotType;
  rect: { x: number; y: number; w: number; h: number }; // Normalized 0.0 - 1.0
  label: string;
  targetFile?: string;
  targetPageNumber?: number;
  exerciseLabel?: string;
  unitLesson?: string;
  description?: string;
  // Phase 4 Teacher's Book mapping fields:
  targetTeacherBookId?: string;
  targetTeacherBookTitle?: string;
  solutionText?: string;
  methodologyNotes?: string;
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
  createdAt?: string;
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
  createdAt?: string;
}

export type EditorToolMode = 'SELECT' | 'DRAW_AUDIO' | 'DRAW_VIDEO' | 'DRAW_ANSWER' | 'DRAW_OTHER';
type ResizeHandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface VisualPdfEditorProps {
  initialBookId?: string;
  onOpenMobilePreview?: () => void;
}

export function VisualPdfEditor({
  initialBookId = 'book_grade11_english_sb',
  onOpenMobilePreview,
}: VisualPdfEditorProps) {
  // ==========================================
  // STATE: Active Book & Pages Manifest
  // ==========================================
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId);
  const [booksList, setBooksList] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<VisualPage[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(2);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(true);

  // ==========================================
  // STATE: Zoom & Viewport Controls
  // ==========================================
  const [zoomScale, setZoomScale] = useState<number>(1.0); // 1.0 = 100%
  const [fitMode, setFitMode] = useState<'NONE' | 'FIT_WIDTH' | 'FIT_SCREEN'>('NONE');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayLayerRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // STATE: PDF.js Document & Rendering
  // ==========================================
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isPdfRendering, setIsPdfRendering] = useState<boolean>(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ==========================================
  // STATE: Thumbnail Navigation & Filter
  // ==========================================
  const [pageSearchQuery, setPageSearchQuery] = useState<string>('');
  const [filterOnlyHotspotPages, setFilterOnlyHotspotPages] = useState<boolean>(false);

  // ==========================================
  // STATE: Phase 2 Hotspots & Authoring Engine
  // ==========================================
  const [activeTool, setActiveTool] = useState<EditorToolMode>('SELECT');
  const [hotspots, setHotspots] = useState<HotspotItem[]>([
    {
      id: 'hs-1',
      pageNumber: 2,
      type: 'AUDIO',
      rect: { x: 0.1, y: 0.82, w: 0.38, h: 0.08 },
      label: '🎧 Audio Track 2.1 — Listening',
      targetFile: 'unit1_track1.mp3',
      exerciseLabel: 'Task 2.1',
      unitLesson: 'Unit 1, Lesson 2',
      description: 'Listening comprehension audio for classroom lesson.',
    },
    {
      id: 'hs-2',
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
      pageNumber: 4,
      type: 'VIDEO',
      rect: { x: 0.25, y: 0.82, w: 0.5, h: 0.08 },
      label: '🎬 Video Lesson — Grammar Focus',
      targetFile: 'unit1_grammar.mp4',
      exerciseLabel: 'Grammar Section',
      unitLesson: 'Unit 1, Lesson 4',
      description: 'Animated grammar video explaining Conditionals Type 3.',
    },
  ]);

  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>('hs-1');
  const [selectedHotspotIds, setSelectedHotspotIds] = useState<string[]>(['hs-1']);

  // Interaction tracking (Drawing, Moving, Resizing)
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingBox, setDrawingBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    initialRect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandleType | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    initialRect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  // Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState<HotspotItem[][]>([]);
  const [redoStack, setRedoStack] = useState<HotspotItem[][]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  // ==========================================
  // STATE: Phase 3 Media Library & Playback
  // ==========================================
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [mediaModalTab, setMediaModalTab] = useState<'AUDIO' | 'VIDEO'>('AUDIO');
  const [mediaSearchQuery, setMediaSearchQuery] = useState<string>('');
  const [mediaUnitFilter, setMediaUnitFilter] = useState<string>('ALL');

  // Audio Playback Preview State
  const [activePreviewAudioId, setActivePreviewAudioId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(135);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Video Playback Modal State
  const [previewVideoItem, setPreviewVideoItem] = useState<MediaItem | null>(null);

  // ==========================================
  // STATE: Phase 4 Teacher's Book & Answer Keys
  // ==========================================
  const [teacherBooksList, setTeacherBooksList] = useState<Book[]>([]);
  const [answerKeysList, setAnswerKeysList] = useState<AnswerKeyItem[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState<boolean>(false);
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState<boolean>(false);
  const [answerSearchQuery, setAnswerSearchQuery] = useState<string>('');
  const [answerUnitFilter, setAnswerUnitFilter] = useState<string>('ALL');
  const [previewTeacherBookPageModal, setPreviewTeacherBookPageModal] = useState<{
    isOpen: boolean;
    teacherBookId: string;
    teacherBookTitle: string;
    pageNumber: number;
    answers: AnswerKeyItem[];
    pageImagePreview?: string;
  } | null>(null);

  // ==========================================
  // STATE: Phase 5 Pre-Publish Validation, Preview Mode & Link Detection
  // ==========================================
  const [isPreviewModeActive, setIsPreviewModeActive] = useState<boolean>(false);
  const [activePreviewMobileAnswer, setActivePreviewMobileAnswer] = useState<HotspotItem | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [isValidatingPublish, setIsValidatingPublish] = useState<boolean>(false);
  const [isPublishingBook, setIsPublishingBook] = useState<boolean>(false);

  const [isDetectModalOpen, setIsDetectModalOpen] = useState<boolean>(false);
  const [detectedLinksList, setDetectedLinksList] = useState<any[]>([]);
  const [isDetectingLinks, setIsDetectingLinks] = useState<boolean>(false);

  // Current page filtered hotspots
  const currentPageHotspots = hotspots.filter((h) => h.pageNumber === currentPage);
  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId) || null;

  // Overlap detection on current page
  const overlappingPairs = React.useMemo(() => {
    const pairs: Array<[HotspotItem, HotspotItem]> = [];
    for (let i = 0; i < currentPageHotspots.length; i++) {
      for (let j = i + 1; j < currentPageHotspots.length; j++) {
        const h1 = currentPageHotspots[i];
        const h2 = currentPageHotspots[j];
        const r1 = h1.rect;
        const r2 = h2.rect;
        const isOverlapping =
          r1.x < r2.x + r2.w &&
          r1.x + r1.w > r2.x &&
          r1.y < r2.y + r2.h &&
          r1.y + r1.h > r2.y;
        if (isOverlapping) {
          pairs.push([h1, h2]);
        }
      }
    }
    return pairs;
  }, [currentPageHotspots]);

  // Push state onto undo stack
  const pushUndo = useCallback(
    (currentState: HotspotItem[]) => {
      setUndoStack((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(currentState))]);
      setRedoStack([]);
      setHasUnsavedChanges(true);
    },
    [],
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [JSON.parse(JSON.stringify(hotspots)), ...prev]);
    setHotspots(previous);
    setHasUnsavedChanges(true);
    showToast('Amal bekor qilindi (Undo)', 'warning');
  }, [undoStack, hotspots]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(hotspots))]);
    setHotspots(next);
    setHasUnsavedChanges(true);
    showToast('Amal qaytarildi (Redo)', 'success');
  }, [redoStack, hotspots]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 3500);
  };

  // Formatter helpers
  const formatDuration = (sec?: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ==========================================
  // 1. FETCH BOOKS, PAGES, HOTSPOTS & MEDIA
  // ==========================================
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/content/books');
      if (res.ok) {
        const data = await res.json();
        setBooksList(data);
        const active = data.find((b: Book) => b.id === selectedBookId) || data[0];
        if (active) {
          setCurrentBook(active);
        }
      }
    } catch {
      console.warn('Backend not available, using fallback book store');
    }
  };

  useEffect(() => {
    fetchPagesForBook(selectedBookId);
    fetchHotspotsForBook(selectedBookId);
    fetchMediaLibrary();
    fetchTeacherBooks();
    fetchAnswerKeys();
  }, [selectedBookId]);

  const fetchPagesForBook = async (bookId: string) => {
    setIsLoadingPages(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/content/books/${bookId}/pages`);
      if (res.ok) {
        const data: VisualPage[] = await res.json();
        setPages(data);
      }
    } catch {
      console.warn('Failed to fetch pages from backend, using default generator');
    } finally {
      setIsLoadingPages(false);
    }
  };

  const fetchHotspotsForBook = async (bookId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/v1/content/books/${bookId}/hotspots`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setHotspots(data);
          setSelectedHotspotId(data[0]?.id || null);
          setUndoStack([]);
          setRedoStack([]);
          setHasUnsavedChanges(false);
        }
      }
    } catch {
      console.warn('Failed to fetch hotspots from backend, using baseline data');
    }
  };

  const fetchMediaLibrary = async () => {
    setIsLoadingMedia(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/content/media?bookId=${selectedBookId}`);
      if (res.ok) {
        const data: MediaItem[] = await res.json();
        setMediaList(data);
      }
    } catch {
      console.warn('Failed to fetch media from backend');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const fetchTeacherBooks = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/content/teacher-books');
      if (res.ok) {
        const data: Book[] = await res.json();
        setTeacherBooksList(data);
      }
    } catch {
      console.warn('Failed to fetch teacher books');
    }
  };

  const fetchAnswerKeys = async () => {
    setIsLoadingAnswers(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/content/answers?studentBookId=${selectedBookId}`,
      );
      if (res.ok) {
        const data: AnswerKeyItem[] = await res.json();
        setAnswerKeysList(data);
      }
    } catch {
      console.warn('Failed to fetch answer keys');
    } finally {
      setIsLoadingAnswers(false);
    }
  };

  // ==========================================
  // 2. SAVE CHANGES TO BACKEND
  // ==========================================
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/content/books/${selectedBookId}/hotspots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotspots }),
      });

      if (res.ok) {
        const data = await res.json();
        setHasUnsavedChanges(false);
        if (data.warnings && data.warnings.length > 0) {
          showToast(`Saqlandi (${data.count} ta hotspot). ${data.warnings.length} ta ogohlantirish bor!`, 'warning');
        } else {
          showToast(`Hotspotlar muvaffaqiyatli saqlandi! (${data.count} ta)`, 'success');
        }
        fetchPagesForBook(selectedBookId);
      } else {
        showToast('Saqlashda xatolik yuz berdi!', 'error');
      }
    } catch {
      showToast('Backend bilan aloqa uzildi. Oflayn rejimda saqlandi.', 'warning');
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // 3. HOTSPOT CRUD & MEDIA CONNECTION (Phase 3)
  // ==========================================
  const handleDuplicateHotspot = useCallback(
    (targetId?: string) => {
      const idToDup = targetId || selectedHotspotId;
      if (!idToDup) return;
      const target = hotspots.find((h) => h.id === idToDup);
      if (!target) return;

      pushUndo(hotspots);
      const newId = `hs_${Date.now()}`;
      const duplicated: HotspotItem = {
        ...target,
        id: newId,
        label: `${target.label} (Nusxa)`,
        rect: {
          x: Math.min(0.92, Math.round((target.rect.x + 0.03) * 1000) / 1000),
          y: Math.min(0.92, Math.round((target.rect.y + 0.03) * 1000) / 1000),
          w: target.rect.w,
          h: target.rect.h,
        },
      };

      setHotspots((prev) => [...prev, duplicated]);
      setSelectedHotspotId(newId);
      setSelectedHotspotIds([newId]);
      showToast('Hotspot nusxalandi', 'success');
    },
    [hotspots, selectedHotspotId, pushUndo],
  );

  const handleDeleteHotspot = useCallback(
    (targetId?: string) => {
      const idToDel = targetId || selectedHotspotId;
      if (!idToDel) return;

      pushUndo(hotspots);
      setHotspots((prev) => prev.filter((h) => h.id !== idToDel));
      if (selectedHotspotId === idToDel) {
        setSelectedHotspotId(null);
        setSelectedHotspotIds([]);
      }
      showToast('Hotspot o‘chirildi', 'warning');
    },
    [hotspots, selectedHotspotId, pushUndo],
  );

  const handleUpdateSelectedHotspot = (fields: Partial<HotspotItem>) => {
    if (!selectedHotspotId) return;
    pushUndo(hotspots);
    setHotspots((prev) =>
      prev.map((h) => {
        if (h.id === selectedHotspotId) {
          return { ...h, ...fields };
        }
        return h;
      }),
    );
  };

  // Assign Media File to Selected Hotspot
  const handleAssignMediaToHotspot = (media: MediaItem) => {
    if (!selectedHotspotId) return;
    pushUndo(hotspots);
    setHotspots((prev) =>
      prev.map((h) => {
        if (h.id === selectedHotspotId) {
          return {
            ...h,
            type: media.type === 'AUDIO' ? 'AUDIO' : 'VIDEO',
            targetFile: media.filename,
            unitLesson: media.unitLabel,
            label:
              h.label.includes('Track') || h.label.includes('Lesson') || h.label.includes('Hotspot')
                ? media.title
                : h.label,
          };
        }
        return h;
      }),
    );
    setIsMediaModalOpen(false);
    setPreviewVideoItem(null);
    showToast(`"${media.title}" hotspotga biriktirildi!`, 'success');
  };

  // Remove Media Connection
  const handleRemoveMediaConnection = () => {
    if (!selectedHotspotId) return;
    pushUndo(hotspots);
    setHotspots((prev) =>
      prev.map((h) => {
        if (h.id === selectedHotspotId) {
          return {
            ...h,
            targetFile: undefined,
          };
        }
        return h;
      }),
    );
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingAudio(false);
    showToast('Media fayl birikmasi uzildi', 'warning');
  };

  // ==========================================
  // PHASE 4: TEACHER'S BOOK ANSWER MAPPING
  // ==========================================
  const handleAssignAnswerKeyToHotspot = (answer: AnswerKeyItem) => {
    if (!selectedHotspotId) return;
    pushUndo(hotspots);
    setHotspots((prev) =>
      prev.map((h) => {
        if (h.id === selectedHotspotId) {
          return {
            ...h,
            type: 'ANSWER_LINK',
            targetTeacherBookId: answer.teacherBookId,
            targetTeacherBookTitle: answer.teacherBookTitle,
            targetPageNumber: answer.teacherPageNumber,
            exerciseLabel: answer.exerciseNumber,
            label: `💡 ${answer.exerciseNumber} (TB p.${answer.teacherPageNumber})`,
            solutionText: answer.solutionKey,
            methodologyNotes: answer.methodologyNotes,
            unitLesson: answer.unitLabel,
          };
        }
        return h;
      }),
    );
    setIsAnswerModalOpen(false);
    showToast(`"${answer.exerciseNumber}" javoblar kaliti biriktirildi!`, 'success');
  };

  const handleClearAnswerConnection = () => {
    if (!selectedHotspotId) return;
    pushUndo(hotspots);
    setHotspots((prev) =>
      prev.map((h) => {
        if (h.id === selectedHotspotId) {
          return {
            ...h,
            targetTeacherBookId: undefined,
            targetTeacherBookTitle: undefined,
            targetPageNumber: undefined,
            solutionText: undefined,
            methodologyNotes: undefined,
            multiAnswers: undefined,
          };
        }
        return h;
      }),
    );
    showToast('Javoblar kaliti birikmasi tozalandi', 'warning');
  };

  const handleOpenTeacherBookPagePreview = async (
    teacherBookId: string,
    pageNumber: number,
  ) => {
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/content/teacher-books/${teacherBookId}/pages/${pageNumber}`,
      );
      if (res.ok) {
        const data = await res.json();
        setPreviewTeacherBookPageModal({
          isOpen: true,
          teacherBookId: data.teacherBookId,
          teacherBookTitle: data.teacherBookTitle,
          pageNumber: data.pageNumber,
          answers: data.answers || [],
          pageImagePreview: data.pageImagePreview,
        });
      } else {
        throw new Error('Not found');
      }
    } catch {
      // Fallback preview
      const tb = teacherBooksList.find((b) => b.id === teacherBookId);
      setPreviewTeacherBookPageModal({
        isOpen: true,
        teacherBookId,
        teacherBookTitle: tb?.title || "Teacher's Book (Answer Key)",
        pageNumber,
        answers: answerKeysList.filter(
          (a) => a.teacherBookId === teacherBookId && a.teacherPageNumber === pageNumber,
        ),
      });
    }
  };

  const handleAddSubAnswer = () => {
    if (!selectedHotspotId || !selectedHotspot) return;
    pushUndo(hotspots);
    const existing = selectedHotspot.multiAnswers || [];
    const count = existing.length + 1;
    const newSub: AnswerMappingEntry = {
      id: `sub_${Date.now()}`,
      exerciseNumber: `${selectedHotspot.exerciseLabel || 'Task'} (${String.fromCharCode(64 + count)})`,
      exerciseTitle: 'Qo‘shimcha qism / Sub-task',
      solutionKey: '',
      teacherPageNumber: selectedHotspot.targetPageNumber || 14,
    };
    handleUpdateSelectedHotspot({
      multiAnswers: [...existing, newSub],
    });
    showToast('Qo‘shimcha javob qatori qo‘shildi', 'success');
  };

  const handleRemoveSubAnswer = (subId: string) => {
    if (!selectedHotspotId || !selectedHotspot) return;
    pushUndo(hotspots);
    const updated = (selectedHotspot.multiAnswers || []).filter((s) => s.id !== subId);
    handleUpdateSelectedHotspot({ multiAnswers: updated });
    showToast('Qo‘shimcha javob o‘chirildi', 'warning');
  };

  const handleUpdateSubAnswer = (subId: string, fields: Partial<AnswerMappingEntry>) => {
    if (!selectedHotspotId || !selectedHotspot) return;
    const updated = (selectedHotspot.multiAnswers || []).map((s) => {
      if (s.id === subId) {
        return { ...s, ...fields };
      }
      return s;
    });
    handleUpdateSelectedHotspot({ multiAnswers: updated });
  };

  const filteredAnswerList = React.useMemo(() => {
    return answerKeysList.filter((item) => {
      if (answerUnitFilter !== 'ALL' && !item.unitLabel.includes(answerUnitFilter)) {
        return false;
      }
      if (answerSearchQuery) {
        const q = answerSearchQuery.toLowerCase();
        return (
          item.exerciseNumber.toLowerCase().includes(q) ||
          item.exerciseTitle.toLowerCase().includes(q) ||
          item.solutionKey.toLowerCase().includes(q) ||
          item.unitLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [answerKeysList, answerSearchQuery, answerUnitFilter]);

  // ==========================================
  // PHASE 5: PRE-PUBLISH VALIDATION & LINK DETECTION HANDLERS
  // ==========================================
  const handleOpenPublishModal = async () => {
    setIsPublishModalOpen(true);
    setIsValidatingPublish(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/content/books/${selectedBookId}/publish-validation`);
      if (res.ok) {
        const data = await res.json();
        setValidationReport(data);
      }
    } catch {
      console.warn('Failed to fetch validation report');
    } finally {
      setIsValidatingPublish(false);
    }
  };

  const handleConfirmPublish = async () => {
    setIsPublishingBook(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/content/books/${selectedBookId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(
          `"${data.book?.title || 'Darslik'}" muvaffaqiyatli nashr qilindi! Mobil ilovaga darhol sinxronlandi.`,
          'success',
        );
        setIsPublishModalOpen(false);
        fetchBooks();
      } else {
        const err = await res.json();
        showToast(err.message || 'Nashr qilishda xatolik yuz berdi!', 'error');
      }
    } catch {
      showToast('Backend bilan aloqa uzildi!', 'error');
    } finally {
      setIsPublishingBook(false);
    }
  };

  const handleDetectLinks = async () => {
    setIsDetectingLinks(true);
    setIsDetectModalOpen(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/content/books/${selectedBookId}/detect-links`,
        { method: 'POST' },
      );
      if (res.ok) {
        const data = await res.json();
        setDetectedLinksList(data);
      }
    } catch {
      console.warn('Failed to detect links from backend');
    } finally {
      setIsDetectingLinks(false);
    }
  };

  const handleAcceptDetectedLink = (link: any) => {
    pushUndo(hotspots);
    const newId = `hs_${Date.now()}`;
    const newHotspot: HotspotItem = {
      id: newId,
      bookId: selectedBookId,
      pageNumber: link.pageNumber,
      type: link.suggestedType,
      rect: link.rect,
      label: link.suggestedTitle,
      targetFile: link.suggestedFile,
      targetPageNumber: link.suggestedType === 'ANSWER_LINK' ? 14 : undefined,
      targetTeacherBookId:
        link.suggestedType === 'ANSWER_LINK' ? 'book_grade11_english_tb' : undefined,
      solutionText:
        link.suggestedType === 'ANSWER_LINK' ? '1. C | 2. A | 3. D | 4. B' : undefined,
      exerciseLabel: `Task ${link.pageNumber}.1`,
      unitLesson: `Unit ${Math.ceil(link.pageNumber / 2)}`,
      description: `Avtomatik aniqlangan havola (${Math.round(link.confidenceScore * 100)}% ishonchlilik).`,
    };
    setHotspots((prev) => [...prev, newHotspot]);
    setDetectedLinksList((prev) => prev.filter((l) => l.id !== link.id));
    showToast(`"${link.suggestedTitle}" hotspotga aylantirildi!`, 'success');
  };

  const handleAcceptAllDetectedLinks = () => {
    if (detectedLinksList.length === 0) return;
    pushUndo(hotspots);
    const newItems: HotspotItem[] = detectedLinksList.map((link, idx) => ({
      id: `hs_${Date.now()}_${idx}`,
      bookId: selectedBookId,
      pageNumber: link.pageNumber,
      type: link.suggestedType,
      rect: link.rect,
      label: link.suggestedTitle,
      targetFile: link.suggestedFile,
      targetPageNumber: link.suggestedType === 'ANSWER_LINK' ? 14 : undefined,
      targetTeacherBookId:
        link.suggestedType === 'ANSWER_LINK' ? 'book_grade11_english_tb' : undefined,
      solutionText:
        link.suggestedType === 'ANSWER_LINK' ? '1. C | 2. A | 3. D | 4. B' : undefined,
      exerciseLabel: `Task ${link.pageNumber}.${idx + 1}`,
      unitLesson: `Unit ${Math.ceil(link.pageNumber / 2)}`,
      description: `Avtomatik aniqlangan havola (${Math.round(link.confidenceScore * 100)}% ishonchlilik).`,
    }));
    setHotspots((prev) => [...prev, ...newItems]);
    setDetectedLinksList([]);
    setIsDetectModalOpen(false);
    showToast(`${newItems.length} ta aniqlangan havola qabul qilindi!`, 'success');
  };

  // Play / Pause Audio Preview Engine
  const handleTogglePlayAudio = (mediaUrl: string, audioId: string, durationSec: number) => {
    if (activePreviewAudioId === audioId && isPlayingAudio) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsPlayingAudio(false);
    } else {
      setActivePreviewAudioId(audioId);
      setIsPlayingAudio(true);
      setAudioCurrentTime(0);
      setAudioDuration(durationSec);

      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = mediaUrl;
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().catch(() => {
          // Simulated progress fallback if external audio URL fails or is blocked
        });
      }
    }
  };

  // Audio timer simulation / sync
  useEffect(() => {
    let interval: any = null;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioCurrentTime((prev) => {
          if (prev >= audioDuration) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingAudio, audioDuration]);

  // ==========================================
  // 4. KEYBOARD SHORTCUTS (Delete, Undo, Dup)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedHotspotId) {
          e.preventDefault();
          handleDeleteHotspot(selectedHotspotId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateHotspot();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsDrawing(false);
        setDrawingBox(null);
        setIsMediaModalOpen(false);
        setPreviewVideoItem(null);
        setSelectedHotspotId(null);
        setActiveTool('SELECT');
      } else if (e.key === '1') {
        setActiveTool('SELECT');
      } else if (e.key === '2') {
        setActiveTool('DRAW_AUDIO');
      } else if (e.key === '3') {
        setActiveTool('DRAW_VIDEO');
      } else if (e.key === '4') {
        setActiveTool('DRAW_ANSWER');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHotspotId, handleDeleteHotspot, handleDuplicateHotspot, handleUndo, handleRedo]);

  // ==========================================
  // 5. PDF UPLOAD PIPELINE
  // ==========================================
  const handlePdfFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadError('Faqat PDF (.pdf) formatidagi darslik faylini yuklash mumkin!');
      return;
    }

    setUploadError(null);
    setIsUploadingPdf(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('gradeId', String(currentBook?.gradeId || 11));
      formData.append('subjectId', currentBook?.subjectId || 'sub_eng_11');
      formData.append('bookType', currentBook?.type || BookType.STUDENT_BOOK);

      const res = await fetch('http://localhost:4000/api/v1/content/books/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const result = await res.json();
      setBooksList((prev) => [result.book, ...prev]);
      setSelectedBookId(result.book.id);
      setCurrentBook(result.book);
      setPages(result.pages);
      setCurrentPage(1);

      showToast(`Darslik muvaffaqiyatli yuklandi: ${result.book.totalPages} ta sahifa aniqlandi!`, 'success');
      loadPdfDocument(result.book.id);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'PDF yuklashda xatolik yuz berdi');
      showToast('PDF yuklashda xatolik yuz berdi', 'error');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // ==========================================
  // 6. PDF.js HIGH-DPI RENDERING
  // ==========================================
  const loadPdfDocument = async (bookId: string) => {
    if (typeof window === 'undefined' || !(window as any).pdfjsLib) return;

    try {
      const pdfUrl = `http://localhost:4000/api/v1/content/books/${bookId}/pdf`;
      const loadingTask = (window as any).pdfjsLib.getDocument(pdfUrl);
      const loadedDoc = await loadingTask.promise;
      setPdfDoc(loadedDoc);
    } catch {
      console.warn('Backend PDF stream not reachable, falling back to curriculum canvas renderer.');
      setPdfDoc(null);
    }
  };

  useEffect(() => {
    loadPdfDocument(selectedBookId);
  }, [selectedBookId]);

  const renderCurrentPage = useCallback(async () => {
    const canvas = pageCanvasRef.current;
    if (!canvas) return;

    if (pdfDoc) {
      try {
        setIsPdfRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoomScale * 1.5 });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / 1.5}px`;
        canvas.style.height = `${viewport.height / 1.5}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      } catch (err) {
        console.warn('PDF.js render error, fallback to vector curriculum canvas:', err);
        renderCurriculumFallback(canvas);
      } finally {
        setIsPdfRendering(false);
      }
    } else {
      renderCurriculumFallback(canvas);
    }
  }, [pdfDoc, currentPage, zoomScale]);

  const renderCurriculumFallback = (canvas: HTMLCanvasElement) => {
    const baseW = 600;
    const baseH = 800;
    const renderScale = zoomScale * 1.5;

    canvas.width = baseW * renderScale;
    canvas.height = baseH * renderScale;
    canvas.style.width = `${baseW * zoomScale}px`;
    canvas.style.height = `${baseH * zoomScale}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(renderScale, renderScale);

    // Page Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, baseW, baseH);

    // Header Stripe
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, baseW, 60);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 60);
    ctx.lineTo(baseW - 30, 60);
    ctx.stroke();

    // Grade & Unit Label
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(`ENGLISH ${currentBook?.gradeId || 11} • UNIT 1: DIGITAL FUTURE`, 35, 38);

    // Page Number Top Right
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`${currentPage}`, baseW - 55, 38);

    // Lesson Title
    ctx.fillStyle = '#0F2942';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('1.2 Digital Classrooms, AI Tutors & Pedagogy', 35, 110);

    // Paragraph Simulation
    ctx.fillStyle = '#475569';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('In modern educational institutions, high-impact interactive learning materials', 35, 150);
    ctx.fillText('combine listening audio files, methodology keys, and digital answer rubrics.', 35, 172);
    ctx.fillText('This visual authoring editor lets administrators connect textbook page regions', 35, 194);
    ctx.fillText('directly to multimedia assets with precision normalized coordinates (0.0 – 1.0).', 35, 216);

    // Exercise 1 Card
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(35, 250, baseW - 70, 180, 12);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.stroke();

    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('Task 2.1: Listening & Interactive Vocabulary', 55, 280);

    ctx.fillStyle = '#334155';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Listen to the audio track and match the key educational concepts with their definitions.', 55, 305);
    ctx.fillText('1. Artificial Intelligence in Language Pedagogy', 55, 335);
    ctx.fillText('2. Teacher-Guided Active Mentorship Model', 55, 360);
    ctx.fillText('3. Offline Keystore Envelope Encryption Protocol', 55, 385);

    // Exercise 2 Card
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(35, 455, baseW - 70, 160, 12);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('Task 2.2: Reading Comprehension & Answer Verification', 55, 485);

    ctx.fillStyle = '#334155';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Compare your draft answers with the official Teacher’s Book methodology key.', 55, 510);
    ctx.fillText('Teachers can tap the green answer hotspot in mobile app to view full solutions.', 55, 535);

    // Bottom Footer
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('SmartTeacherBook Pedagogical Platform • Ministry of Preschool and School Education', 35, baseH - 25);
  };

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // ==========================================
  // 7. ZOOM & FIT MODES
  // ==========================================
  const handleZoomIn = () => {
    setFitMode('NONE');
    setZoomScale((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setFitMode('NONE');
    setZoomScale((prev) => Math.max(0.4, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleFitToWidth = () => {
    if (!workspaceContainerRef.current) return;
    const containerWidth = workspaceContainerRef.current.clientWidth - 120;
    const targetScale = Math.max(0.5, Math.min(2.2, containerWidth / 600));
    setZoomScale(Math.round(targetScale * 100) / 100);
    setFitMode('FIT_WIDTH');
  };

  const handleFitToScreen = () => {
    if (!workspaceContainerRef.current) return;
    const containerHeight = workspaceContainerRef.current.clientHeight - 140;
    const targetScale = Math.max(0.5, Math.min(1.8, containerHeight / 800));
    setZoomScale(Math.round(targetScale * 100) / 100);
    setFitMode('FIT_SCREEN');
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // ==========================================
  // 8. INTERACTIVE CANVAS MOUSE ENGINE
  // ==========================================
  const getNormalizedCoordinates = (e: React.MouseEvent<any>) => {
    if (!overlayLayerRef.current) return { x: 0, y: 0 };
    const rect = overlayLayerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const coords = getNormalizedCoordinates(e);

    // DRAWING MODE
    if (activeTool !== 'SELECT') {
      setIsDrawing(true);
      setDrawStart(coords);
      setDrawingBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
      return;
    }

    // SELECT MODE: Click on empty space deselects
    if ((e.target as HTMLElement) === overlayLayerRef.current) {
      setSelectedHotspotId(null);
      setSelectedHotspotIds([]);
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getNormalizedCoordinates(e);

    // 1: DRAWING BOX
    if (isDrawing && drawStart) {
      const x = Math.min(drawStart.x, coords.x);
      const y = Math.min(drawStart.y, coords.y);
      const w = Math.abs(coords.x - drawStart.x);
      const h = Math.abs(coords.y - drawStart.y);
      setDrawingBox({ x, y, w, h });
      return;
    }

    // 2: DRAGGING HOTSPOT
    if (isDragging && dragStart && selectedHotspotId) {
      const deltaX = coords.x - dragStart.x;
      const deltaY = coords.y - dragStart.y;

      const newX = Math.max(0, Math.min(1 - dragStart.initialRect.w, dragStart.initialRect.x + deltaX));
      const newY = Math.max(0, Math.min(1 - dragStart.initialRect.h, dragStart.initialRect.y + deltaY));

      setHotspots((prev) =>
        prev.map((hs) => {
          if (hs.id === selectedHotspotId) {
            return {
              ...hs,
              rect: {
                ...hs.rect,
                x: Math.round(newX * 1000) / 1000,
                y: Math.round(newY * 1000) / 1000,
              },
            };
          }
          return hs;
        }),
      );
      setHasUnsavedChanges(true);
      return;
    }

    // 3: RESIZING HOTSPOT
    if (isResizing && resizeStart && resizeHandle && selectedHotspotId) {
      const deltaX = coords.x - resizeStart.x;
      const deltaY = coords.y - resizeStart.y;
      const init = resizeStart.initialRect;
      const minW = 0.04;
      const minH = 0.03;

      let newX = init.x;
      let newY = init.y;
      let newW = init.w;
      let newH = init.h;

      if (resizeHandle.includes('w')) {
        newX = Math.max(0, Math.min(init.x + init.w - minW, init.x + deltaX));
        newW = init.x + init.w - newX;
      }
      if (resizeHandle.includes('e')) {
        newW = Math.max(minW, Math.min(1 - init.x, init.w + deltaX));
      }
      if (resizeHandle.includes('n')) {
        newY = Math.max(0, Math.min(init.y + init.h - minH, init.y + deltaY));
        newH = init.y + init.h - newY;
      }
      if (resizeHandle.includes('s')) {
        newH = Math.max(minH, Math.min(1 - init.y, init.h + deltaY));
      }

      setHotspots((prev) =>
        prev.map((hs) => {
          if (hs.id === selectedHotspotId) {
            return {
              ...hs,
              rect: {
                x: Math.round(newX * 1000) / 1000,
                y: Math.round(newY * 1000) / 1000,
                w: Math.round(newW * 1000) / 1000,
                h: Math.round(newH * 1000) / 1000,
              },
            };
          }
          return hs;
        }),
      );
      setHasUnsavedChanges(true);
    }
  };

  const handleOverlayMouseUp = () => {
    // Finish Drawing
    if (isDrawing && drawingBox) {
      setIsDrawing(false);
      setDrawStart(null);

      if (drawingBox.w >= 0.02 && drawingBox.h >= 0.02) {
        pushUndo(hotspots);

        const typeMap: Record<EditorToolMode, HotspotType> = {
          DRAW_AUDIO: 'AUDIO',
          DRAW_VIDEO: 'VIDEO',
          DRAW_ANSWER: 'ANSWER_LINK',
          DRAW_OTHER: 'OTHER',
          SELECT: 'AUDIO',
        };
        const newType = typeMap[activeTool] || 'AUDIO';
        const countOfType = hotspots.filter((h) => h.type === newType).length + 1;
        const newId = `hs_${Date.now()}`;

        // Find available media matching type
        const matchingMedia = mediaList.find((m) => m.type === newType);
        const matchingAnswer =
          answerKeysList.find((a) => a.studentPageNumber === currentPage) || answerKeysList[0];
        const defaultTeacherBook = teacherBooksList[0];

        const newHotspot: HotspotItem = {
          id: newId,
          bookId: selectedBookId,
          pageNumber: currentPage,
          type: newType,
          rect: {
            x: Math.round(drawingBox.x * 1000) / 1000,
            y: Math.round(drawingBox.y * 1000) / 1000,
            w: Math.round(drawingBox.w * 1000) / 1000,
            h: Math.round(drawingBox.h * 1000) / 1000,
          },
          label:
            newType === 'AUDIO'
              ? `🎧 Audio Track ${currentPage}.${countOfType}`
              : newType === 'VIDEO'
              ? `🎬 Video Lesson ${currentPage}.${countOfType}`
              : newType === 'ANSWER_LINK'
              ? `💡 Teacher Answers (p. ${matchingAnswer?.teacherPageNumber || currentPage + 12})`
              : `⚡ Interactive ${currentPage}.${countOfType}`,
          targetFile: matchingMedia ? matchingMedia.filename : undefined,
          targetPageNumber:
            newType === 'ANSWER_LINK'
              ? matchingAnswer?.teacherPageNumber || currentPage + 12
              : undefined,
          targetTeacherBookId:
            newType === 'ANSWER_LINK'
              ? matchingAnswer?.teacherBookId || defaultTeacherBook?.id || 'book_grade11_english_tb'
              : undefined,
          targetTeacherBookTitle:
            newType === 'ANSWER_LINK'
              ? matchingAnswer?.teacherBookTitle || defaultTeacherBook?.title || "English 11 Teacher's Book"
              : undefined,
          exerciseLabel:
            newType === 'ANSWER_LINK'
              ? matchingAnswer?.exerciseNumber || `Task ${currentPage}.${countOfType}`
              : `Exercise ${countOfType}`,
          unitLesson:
            newType === 'ANSWER_LINK'
              ? matchingAnswer?.unitLabel || `Unit ${Math.ceil(currentPage / 2)}`
              : `Unit ${Math.ceil(currentPage / 2)}`,
          solutionText:
            newType === 'ANSWER_LINK'
              ? matchingAnswer?.solutionKey || '1. C | 2. A | 3. D | 4. B'
              : undefined,
          methodologyNotes:
            newType === 'ANSWER_LINK'
              ? matchingAnswer?.methodologyNotes || 'O‘quvchilar juftlikda tekshirishlari tavsiya etiladi.'
              : undefined,
          description: 'Vizual muharrirda chizilgan yangi interaktiv hotspot.',
        };

        setHotspots((prev) => [...prev, newHotspot]);
        setSelectedHotspotId(newId);
        setSelectedHotspotIds([newId]);
        setActiveTool('SELECT');
        showToast('Yangi hotspot yaratildi', 'success');
      }
      setDrawingBox(null);
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
    }
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart(null);
    }
  };

  const handleHotspotMouseDown = (e: React.MouseEvent, hs: HotspotItem) => {
    e.stopPropagation();
    if (activeTool !== 'SELECT') return;

    if (e.shiftKey) {
      setSelectedHotspotIds((prev) =>
        prev.includes(hs.id) ? prev.filter((id) => id !== hs.id) : [...prev, hs.id],
      );
      setSelectedHotspotId(hs.id);
    } else {
      setSelectedHotspotId(hs.id);
      setSelectedHotspotIds([hs.id]);
    }

    const coords = getNormalizedCoordinates(e);
    pushUndo(hotspots);
    setIsDragging(true);
    setDragStart({
      x: coords.x,
      y: coords.y,
      initialRect: { ...hs.rect },
    });
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: ResizeHandleType, hs: HotspotItem) => {
    e.stopPropagation();
    setSelectedHotspotId(hs.id);
    setSelectedHotspotIds([hs.id]);

    const coords = getNormalizedCoordinates(e);
    pushUndo(hotspots);
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: coords.x,
      y: coords.y,
      initialRect: { ...hs.rect },
    });
  };

  // Helper styles by hotspot type
  const getHotspotStyles = (type: HotspotType, isSelected: boolean) => {
    switch (type) {
      case 'AUDIO':
        return {
          bg: isSelected ? 'bg-blue-600/35' : 'bg-blue-600/20',
          border: 'border-blue-500',
          ring: isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#090F1D]' : '',
          text: 'text-blue-900',
          badgeBg: 'bg-blue-600 text-white',
          icon: <Music className="w-3.5 h-3.5" />,
          titleColor: 'text-blue-400',
        };
      case 'VIDEO':
        return {
          bg: isSelected ? 'bg-purple-600/35' : 'bg-purple-600/20',
          border: 'border-purple-500',
          ring: isSelected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-[#090F1D]' : '',
          text: 'text-purple-900',
          badgeBg: 'bg-purple-600 text-white',
          icon: <Video className="w-3.5 h-3.5" />,
          titleColor: 'text-purple-400',
        };
      case 'ANSWER_LINK':
        return {
          bg: isSelected ? 'bg-emerald-600/35' : 'bg-emerald-600/20',
          border: 'border-emerald-500',
          ring: isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#090F1D]' : '',
          text: 'text-emerald-900',
          badgeBg: 'bg-emerald-600 text-white',
          icon: <Lightbulb className="w-3.5 h-3.5" />,
          titleColor: 'text-emerald-400',
        };
      case 'OTHER':
      default:
        return {
          bg: isSelected ? 'bg-amber-600/35' : 'bg-amber-600/20',
          border: 'border-amber-500',
          ring: isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#090F1D]' : '',
          text: 'text-amber-900',
          badgeBg: 'bg-amber-600 text-white',
          icon: <Sparkles className="w-3.5 h-3.5" />,
          titleColor: 'text-amber-400',
        };
    }
  };

  const totalPagesCount = pages.length || currentBook?.totalPages || 6;
  const handleNavigatePage = (newPageNumber: number) => {
    if (newPageNumber >= 1 && newPageNumber <= totalPagesCount) {
      setCurrentPage(newPageNumber);
      setSelectedHotspotId(null);
      setSelectedHotspotIds([]);
    }
  };

  // Filter thumbnails
  const filteredPages = pages.filter((p) => {
    if (filterOnlyHotspotPages && !p.hasHotspots) return false;
    if (pageSearchQuery && !p.pageNumber.toString().includes(pageSearchQuery.trim())) return false;
    return true;
  });

  // Filter media files in library modal
  const filteredMediaList = mediaList.filter((m) => {
    if (m.type !== mediaModalTab) return false;
    if (mediaUnitFilter !== 'ALL' && !m.unitLabel.toLowerCase().includes(mediaUnitFilter.toLowerCase())) {
      return false;
    }
    if (mediaSearchQuery) {
      const q = mediaSearchQuery.toLowerCase().trim();
      return (
        m.title.toLowerCase().includes(q) ||
        m.filename.toLowerCase().includes(q) ||
        m.unitLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Linked media item for selected hotspot
  const linkedMediaForSelected = selectedHotspot?.targetFile
    ? mediaList.find((m) => m.filename === selectedHotspot.targetFile) || null
    : null;

  return (
    <div
      ref={workspaceContainerRef}
      className={`flex flex-col h-full bg-[#0F172A] text-slate-100 select-none overflow-hidden font-sans ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Hidden real audio element for preview playback */}
      <audio ref={audioPlayerRef} onEnded={() => setIsPlayingAudio(false)} className="hidden" />

      {/* Toast Notification Banner */}
      {toastNotification && (
        <div
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold transition-all border animate-fadeIn ${
            toastNotification.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
              : toastNotification.type === 'warning'
              ? 'bg-amber-950/95 text-amber-200 border-amber-500/50 shadow-amber-950/50'
              : 'bg-rose-950/95 text-rose-200 border-rose-500/50 shadow-rose-950/50'
          }`}
        >
          {toastNotification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{toastNotification.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* A. TOP TOOLBAR (Desktop-First, Professional)               */}
      {/* ========================================================= */}
      <header className="h-14 bg-[#1E293B] border-b border-slate-700/80 px-5 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Left: Book Meta & Book Selector */}
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="bg-slate-800 text-white font-black text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {booksList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {currentBook?.type || "Student's Book"}
              </span>

              <span className="text-[11px] font-bold text-slate-400 hidden lg:inline">
                {currentBook?.gradeId ? `${currentBook.gradeId}-sinf` : '11-sinf'} • Ingliz tili
              </span>
            </div>
          </div>
        </div>

        {/* Center: Page Controls & Zoom */}
        <div className="flex items-center space-x-3">
          {/* Page Previous / Next */}
          <div className="flex items-center space-x-1 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded-xl shadow-inner">
            <button
              onClick={() => handleNavigatePage(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Oldingi sahifa"
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold px-2 text-white">
              Page <span className="text-blue-400">{currentPage}</span> / {totalPagesCount}
            </span>

            <button
              onClick={() => handleNavigatePage(currentPage + 1)}
              disabled={currentPage >= totalPagesCount}
              title="Keyingi sahifa"
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom In/Out & Presets */}
          <div className="flex items-center space-x-1 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded-xl">
            <button
              onClick={handleZoomOut}
              disabled={zoomScale <= 0.4}
              title="Kichraytirish (-)"
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-mono font-bold px-1.5 min-w-[50px] text-center text-slate-200">
              {Math.round(zoomScale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoomScale >= 2.5}
              title="Kattalashtirish (+)"
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fit Width / Screen */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-800/90 border border-slate-700 p-1 rounded-xl">
            <button
              onClick={handleFitToWidth}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                fitMode === 'FIT_WIDTH' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fit Width
            </button>
            <button
              onClick={handleFitToScreen}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                fitMode === 'FIT_SCREEN' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fit Screen
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Oynani kichik qilish' : 'To‘liq ekran'}
            className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hidden sm:flex"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Right: History, Media Library Shortcut, Save & Publish */}
        <div className="flex items-center space-x-3">
          {/* Media Library Direct Shortcut */}
          <button
            onClick={() => {
              setMediaModalTab('AUDIO');
              setIsMediaModalOpen(true);
            }}
            title="Audio & Video Kutubxonasini ko‘rish"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 shadow-sm"
          >
            <Film className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Media Library</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-600/30 text-blue-300 font-mono">
              {mediaList.length}
            </span>
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center space-x-0.5 bg-slate-800/80 border border-slate-700 px-1 py-0.5 rounded-xl">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Orqaga (Ctrl+Z)"
              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Oldinga (Ctrl+Y)"
              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Unsaved Changes Indicator */}
          <div className="hidden xl:flex items-center space-x-1.5 text-[11px] font-bold">
            <span
              className={`w-2 h-2 rounded-full ${
                hasUnsavedChanges ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span className={hasUnsavedChanges ? 'text-amber-300' : 'text-emerald-300'}>
              {hasUnsavedChanges ? 'O‘zgarishlar saqlanmagan' : 'Barchasi saqlangan'}
            </span>
          </div>

          {/* Save Changes Button */}
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md transition-all ${
              hasUnsavedChanges
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
          </button>

          {/* Teacher Preview Simulator Toggle (Spec §11) */}
          <button
            onClick={() => setIsPreviewModeActive(!isPreviewModeActive)}
            title="O‘qituvchi mobil ko‘rinishida sinash (Preview Mode)"
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md transition-all ${
              isPreviewModeActive
                ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300'
                : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPreviewModeActive ? 'Tahrirlashga Qaytish' : 'Preview'}</span>
          </button>

          {/* Publish Button with Pre-flight Validation (Spec §12) */}
          <button
            onClick={handleOpenPublishModal}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Nashr Qilish (Publish)</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SECONDARY TOOLBAR: Phase 2, 3 & 5 Authoring Tools         */}
      {/* ========================================================= */}
      <div className="h-11 bg-[#131F37] border-b border-slate-700/60 px-5 flex items-center justify-between shrink-0 z-20">
        {/* Left: Mode Selection Tool Buttons */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Asboblar:
          </span>

          {/* 1. Pointer / Select Tool */}
          <button
            onClick={() => setActiveTool('SELECT')}
            title="Tanlash va surish (Tugma: 1)"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTool === 'SELECT'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Tanlash (1)</span>
          </button>

          {/* Detect Links from PDF Annotations (Spec §10) */}
          <button
            onClick={handleDetectLinks}
            title="PDF giperhavolalar va annotatsiyalarni avtomatik aniqlash (Spec §10)"
            className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Havolalarni Aniqlash</span>
          </button>

          {/* 2. Draw Audio Hotspot Tool */}
          <button
            onClick={() => setActiveTool('DRAW_AUDIO')}
            title="Audio Hotspot chizish (Tugma: 2)"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTool === 'DRAW_AUDIO'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50'
                : 'text-blue-400 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>+ Audio (2)</span>
          </button>

          {/* 3. Draw Video Hotspot Tool */}
          <button
            onClick={() => setActiveTool('DRAW_VIDEO')}
            title="Video Hotspot chizish (Tugma: 3)"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTool === 'DRAW_VIDEO'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-400/50'
                : 'text-purple-400 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>+ Video (3)</span>
          </button>

          {/* 4. Draw Answer Key Link Tool */}
          <button
            onClick={() => setActiveTool('DRAW_ANSWER')}
            title="Teacher’s Book javoblariga bog‘lash (Tugma: 4)"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTool === 'DRAW_ANSWER'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                : 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>+ Javoblar (4)</span>
          </button>

          {/* 5. Draw Other Interactive Tool */}
          <button
            onClick={() => setActiveTool('DRAW_OTHER')}
            title="Boshqa interaktiv element"
            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all ${
              activeTool === 'DRAW_OTHER'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                : 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Boshqa</span>
          </button>
        </div>

        {/* Right: Quick Action Buttons for Selected Hotspot */}
        <div className="flex items-center space-x-2">
          {overlappingPairs.length > 0 && (
            <div className="flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-950/70 border border-amber-600/50 px-2.5 py-0.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{overlappingPairs.length} ta hotspot ustma-ust tushgan</span>
            </div>
          )}

          {selectedHotspot && (
            <>
              <button
                onClick={() => handleDuplicateHotspot()}
                title="Tanlanganni nusxalash (Ctrl+D)"
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>Nusxalash (Ctrl+D)</span>
              </button>

              <button
                onClick={() => handleDeleteHotspot()}
                title="Tanlanganni o‘chirish (Delete)"
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900 border border-rose-800/60 flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>O‘chirish</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN WORKSPACE 3-COLUMN LAYOUT                            */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ======================================================= */}
        {/* B. LEFT SIDEBAR — PAGE THUMBNAILS (Phase 1)             */}
        {/* ======================================================= */}
        <aside className="w-64 bg-[#131F37] border-r border-slate-700/80 flex flex-col shrink-0 z-20 shadow-xl">
          <div className="p-3.5 border-b border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Sahifalar ({pages.length})</span>
              </span>
              <label className="cursor-pointer text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                <UploadCloud className="w-3 h-3" />
                <span>PDF almashtirish</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Page Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Sahifa raqami..."
                value={pageSearchQuery}
                onChange={(e) => setPageSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center space-x-1 text-slate-400">
                <Filter className="w-3 h-3" />
                <span>Faqat obyektlilar:</span>
              </span>
              <button
                onClick={() => setFilterOnlyHotspotPages((prev) => !prev)}
                className={`w-7 h-4 rounded-full transition-colors relative ${
                  filterOnlyHotspotPages ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                    filterOnlyHotspotPages ? 'left-3.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Thumbnails Scroll List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {isLoadingPages ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span>Sahifalar yuklanmoqda...</span>
              </div>
            ) : (
              filteredPages.map((page) => {
                const isActive = page.pageNumber === currentPage;
                const pageHsCount = hotspots.filter((h) => h.pageNumber === page.pageNumber).length;
                const hasAudio = hotspots.some((h) => h.pageNumber === page.pageNumber && h.type === 'AUDIO');
                const hasVideo = hotspots.some((h) => h.pageNumber === page.pageNumber && h.type === 'VIDEO');
                const hasAnswer = hotspots.some(
                  (h) => h.pageNumber === page.pageNumber && h.type === 'ANSWER_LINK',
                );

                return (
                  <div
                    key={page.id}
                    onClick={() => handleNavigatePage(page.pageNumber)}
                    className={`group cursor-pointer rounded-2xl p-2 transition-all border ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-black font-mono ${
                          isActive ? 'text-blue-400' : 'text-slate-300'
                        }`}
                      >
                        Sahifa {page.pageNumber}
                      </span>

                      {/* Hotspots Counter Badges */}
                      <div className="flex items-center space-x-1">
                        {hasAudio && (
                          <span
                            title="Audio darslik mavjud"
                            className="w-4 h-4 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px]"
                          >
                            🎵
                          </span>
                        )}
                        {hasVideo && (
                          <span
                            title="Video darslik mavjud"
                            className="w-4 h-4 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center text-[9px]"
                          >
                            🎬
                          </span>
                        )}
                        {hasAnswer && (
                          <span
                            title="O‘qituvchi kitobi javoblari bog‘langan"
                            className="w-4 h-4 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px]"
                          >
                            💡
                          </span>
                        )}
                        {pageHsCount > 0 && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {pageHsCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Miniature Page Skeleton */}
                    <div
                      className={`w-full aspect-[3/4] rounded-xl border flex flex-col justify-between p-2.5 transition-colors relative overflow-hidden ${
                        isActive
                          ? 'bg-white border-blue-400 text-slate-800'
                          : 'bg-white/95 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="space-y-1 opacity-70">
                        <div className="h-1.5 w-1/3 bg-slate-300 rounded" />
                        <div className="h-1 w-full bg-slate-200 rounded" />
                        <div className="h-1 w-5/6 bg-slate-200 rounded" />
                      </div>

                      <div className="h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700">
                        {page.titleSnippet ? page.titleSnippet.substring(0, 24) : `Page ${page.pageNumber}`}
                      </div>

                      <div className="flex justify-between items-center text-[8px] text-slate-400">
                        <span>SmartTeacher</span>
                        <span>{page.pageNumber}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ======================================================= */}
        {/* C. CENTER WORKSPACE: AUTHORING OR PREVIEW MODE (Spec §11) */}
        {/* ======================================================= */}
        <main className="flex-1 bg-[#090F1D] flex flex-col items-center justify-center p-6 overflow-auto custom-scrollbar relative">
          {isPreviewModeActive ? (
            /* TEACHER MOBILE APP SIMULATOR (Spec §11) */
            <div className="flex flex-col items-center animate-fadeIn py-2">
              {/* Simulator Top Notification */}
              <div className="mb-3 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>📱 O‘qituvchi Mobil Ilova Simulyatori (Read-Only Preview)</span>
                <button
                  onClick={() => setIsPreviewModeActive(false)}
                  className="ml-3 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[11px] hover:bg-amber-400"
                >
                  ✕ Chiqish
                </button>
              </div>

              {/* iPhone Frame */}
              <div className="w-[380px] h-[720px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-4 border-slate-700/80 relative flex flex-col overflow-hidden">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-end pr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-950/80 border border-blue-500/40" />
                </div>

                {/* Mobile Top Reader Bar */}
                <div className="pt-6 pb-2 px-3 border-b border-slate-800 flex items-center justify-between text-xs text-white shrink-0 bg-slate-900/90 z-20">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-[11px] truncate max-w-[170px]">
                      {currentBook?.title || 'Darslik'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-amber-400 font-bold">
                    Sahifa {currentPage} / {totalPagesCount}
                  </span>
                </div>

                {/* Mobile Page Canvas Container */}
                <div className="flex-1 bg-white relative overflow-hidden flex items-center justify-center">
                  <canvas ref={pageCanvasRef} className="max-w-full max-h-full object-contain pointer-events-none" />

                  {/* Read-Only Touchable Hotspots */}
                  <div className="absolute inset-0 pointer-events-auto">
                    {currentPageHotspots.map((hs) => {
                      const isAudio = hs.type === 'AUDIO';
                      const isVideo = hs.type === 'VIDEO';
                      const isAnswer = hs.type === 'ANSWER_LINK';

                      return (
                        <div
                          key={hs.id}
                          onClick={() => {
                            if (isAudio) {
                              const match = mediaList.find((m) => m.filename === hs.targetFile);
                              handleTogglePlayAudio(
                                match?.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                                hs.id,
                                match?.durationSeconds || 135,
                              );
                            } else if (isVideo) {
                              const match = mediaList.find((m) => m.filename === hs.targetFile) || {
                                id: hs.id,
                                title: hs.label,
                                filename: hs.targetFile || 'video.mp4',
                                type: 'VIDEO',
                                unitLabel: hs.unitLesson || 'Unit 1',
                                durationSeconds: 324,
                                sizeBytes: 18500000,
                                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                              };
                              setPreviewVideoItem(match as MediaItem);
                            } else if (isAnswer) {
                              setActivePreviewMobileAnswer(hs);
                            }
                          }}
                          style={{
                            left: `${hs.rect.x * 100}%`,
                            top: `${hs.rect.y * 100}%`,
                            width: `${hs.rect.w * 100}%`,
                            height: `${hs.rect.h * 100}%`,
                          }}
                          className={`absolute rounded-xl border-2 flex items-center justify-center p-1 cursor-pointer transition-transform active:scale-95 shadow-md ${
                            isAudio
                              ? 'bg-blue-600/30 border-blue-500 text-blue-900'
                              : isVideo
                              ? 'bg-purple-600/30 border-purple-500 text-purple-900'
                              : isAnswer
                              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-900'
                              : 'bg-amber-600/30 border-amber-500 text-amber-900'
                          }`}
                        >
                          <div className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-[10px] font-black truncate shadow">
                            {isAudio && '🎧 Audio tinglash'}
                            {isVideo && '🎬 Video dars'}
                            {isAnswer && '💡 Javoblar kaliti'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Slide-up Mobile Answer Sheet Drawer in Simulator */}
                  {activePreviewMobileAnswer && (
                    <div className="absolute inset-x-0 bottom-0 max-h-[80%] bg-[#0F172A] border-t-2 border-emerald-500 rounded-t-3xl p-4 shadow-2xl z-30 flex flex-col animate-slideUp text-white text-xs">
                      <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-3" />
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                        <span className="font-extrabold text-emerald-400 flex items-center space-x-1.5">
                          <Lightbulb className="w-4 h-4" />
                          <span>{activePreviewMobileAnswer.exerciseLabel || 'Javoblar Kaliti'}</span>
                        </span>
                        <button
                          onClick={() => setActivePreviewMobileAnswer(null)}
                          className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="py-3 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          Teacher's Book p.{activePreviewMobileAnswer.targetPageNumber || 14}
                        </span>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-emerald-300 whitespace-pre-wrap text-[11px] leading-relaxed">
                          {activePreviewMobileAnswer.solutionText ||
                            '1. C | 2. A | 3. D | 4. B\nRasmiy o‘qituvchi kitobi javoblari.'}
                        </div>

                        {activePreviewMobileAnswer.methodologyNotes && (
                          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-[11px] italic">
                            <span className="font-bold text-emerald-400 not-italic block mb-0.5">
                              Pedagogik ko‘rsatma:
                            </span>
                            {activePreviewMobileAnswer.methodologyNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Bottom Navigation & Audio Floating Bar */}
                <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between z-20 shrink-0">
                  <button
                    onClick={() => handleNavigatePage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold disabled:opacity-30"
                  >
                    ◀ Oldingi
                  </button>

                  <span className="text-xs font-mono text-slate-400 font-bold">
                    {currentPage} / {totalPagesCount}
                  </span>

                  <button
                    onClick={() => handleNavigatePage(currentPage + 1)}
                    disabled={currentPage >= totalPagesCount}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold disabled:opacity-30"
                  >
                    Keyingi ▶
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Normal Visual PDF Authoring Canvas */
            <>
              {/* Centered Canvas Container with Aspect Ratio and Hotspot Overlay */}
              <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-slate-700/80 bg-white">
                {/* The Main High-Resolution Canvas */}
                <canvas ref={pageCanvasRef} className="block select-none" />

                {/* Interactive Hotspot Drawing & Manipulation Layer */}
                <div
                  ref={overlayLayerRef}
                  onMouseDown={handleOverlayMouseDown}
                  onMouseMove={handleOverlayMouseMove}
                  onMouseUp={handleOverlayMouseUp}
                  onMouseLeave={handleOverlayMouseUp}
                  style={{
                    cursor:
                      activeTool !== 'SELECT'
                        ? 'crosshair'
                        : isDragging
                        ? 'grabbing'
                        : isResizing
                        ? `${resizeHandle}-resize`
                        : 'default',
                  }}
                  className="absolute inset-0 select-none"
                >
              {/* Render Existing Hotspots for this Page */}
              {currentPageHotspots.map((hs) => {
                const isSelected = selectedHotspotId === hs.id;
                const styleMeta = getHotspotStyles(hs.type, isSelected);
                const hasAssignedFile = Boolean(hs.targetFile);
                const isMediaAudio = hs.type === 'AUDIO';
                const isMediaVideo = hs.type === 'VIDEO';

                return (
                  <div
                    key={hs.id}
                    onMouseDown={(e) => handleHotspotMouseDown(e, hs)}
                    style={{
                      left: `${hs.rect.x * 100}%`,
                      top: `${hs.rect.y * 100}%`,
                      width: `${hs.rect.w * 100}%`,
                      height: `${hs.rect.h * 100}%`,
                      cursor: isSelected ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                    }}
                    className={`absolute rounded-xl border-2 flex flex-col justify-between p-1.5 transition-all shadow-lg ${
                      styleMeta.bg
                    } ${styleMeta.border} ${styleMeta.ring}`}
                  >
                    {/* Hotspot Top Badge with Icon & Label */}
                    <div className="flex items-center justify-between pointer-events-none">
                      <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-black truncate drop-shadow max-w-[85%]">
                        {styleMeta.icon}
                        <span className="truncate">{hs.label}</span>
                      </div>

                      {/* Interactive Canvas Play Button for Audio/Video */}
                      {hasAssignedFile && (isMediaAudio || isMediaVideo) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMediaAudio) {
                              const match = mediaList.find((m) => m.filename === hs.targetFile);
                              handleTogglePlayAudio(
                                match?.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                                hs.id,
                                match?.durationSeconds || 135,
                              );
                            } else {
                              const match = mediaList.find((m) => m.filename === hs.targetFile) || {
                                id: hs.id,
                                title: hs.label,
                                filename: hs.targetFile || 'video.mp4',
                                type: 'VIDEO',
                                unitLabel: hs.unitLesson || 'Unit 1',
                                durationSeconds: 324,
                                sizeBytes: 18500000,
                                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                              };
                              setPreviewVideoItem(match as MediaItem);
                            }
                          }}
                          className="pointer-events-auto w-5 h-5 rounded-full bg-slate-900 text-white hover:bg-blue-600 flex items-center justify-center shadow transition-colors"
                          title="Oldindan ko‘rish (Play Preview)"
                        >
                          {isMediaAudio && activePreviewAudioId === hs.id && isPlayingAudio ? (
                            <Pause className="w-2.5 h-2.5" />
                          ) : (
                            <Play className="w-2.5 h-2.5 ml-0.5" />
                          )}
                        </button>
                      )}

                      {/* Interactive Canvas Preview Button for Teacher's Book Answers */}
                      {hs.type === 'ANSWER_LINK' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTeacherBookPagePreview(
                              hs.targetTeacherBookId || 'book_grade11_english_tb',
                              hs.targetPageNumber || 14,
                            );
                          }}
                          className="pointer-events-auto w-5 h-5 rounded-full bg-slate-900 text-emerald-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center shadow transition-colors"
                          title="O‘qituvchi kitobi sahifasini ko‘rish"
                        >
                          <Eye className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    {/* Target File or Answer Page Preview */}
                    <div className="flex items-center justify-between pointer-events-none text-[9px] font-mono text-slate-900 font-extrabold px-1 truncate">
                      <span className="truncate font-bold">
                        {hs.type === 'ANSWER_LINK'
                          ? `💡 TB p.${hs.targetPageNumber || 14} • ${hs.exerciseLabel || 'Javoblar'}`
                          : hs.targetFile
                          ? `📁 ${hs.targetFile}`
                          : 'Biriktirilmagan'}
                      </span>
                      <span className="opacity-75">
                        {Math.round(hs.rect.w * 100)}×{Math.round(hs.rect.h * 100)}%
                      </span>
                    </div>

                    {/* 8 RESIZE HANDLES (Rendered only when Hotspot is Selected) */}
                    {isSelected && (
                      <>
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw', hs)}
                          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-nw-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 'n', hs)}
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-n-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne', hs)}
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-ne-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 'e', hs)}
                          className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-e-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se', hs)}
                          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-se-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 's', hs)}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-s-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw', hs)}
                          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-sw-resize z-30"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown(e, 'w', hs)}
                          className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow cursor-w-resize z-30"
                        />
                      </>
                    )}
                  </div>
                );
              })}

              {/* Active Drawing Preview Box */}
              {isDrawing && drawingBox && (
                <div
                  style={{
                    left: `${drawingBox.x * 100}%`,
                    top: `${drawingBox.y * 100}%`,
                    width: `${drawingBox.w * 100}%`,
                    height: `${drawingBox.h * 100}%`,
                  }}
                  className={`absolute rounded-xl border-2 border-dashed pointer-events-none transition-none shadow-xl flex items-center justify-center ${
                    activeTool === 'DRAW_AUDIO'
                      ? 'border-blue-400 bg-blue-500/25'
                      : activeTool === 'DRAW_VIDEO'
                      ? 'border-purple-400 bg-purple-500/25'
                      : activeTool === 'DRAW_ANSWER'
                      ? 'border-emerald-400 bg-emerald-500/25'
                      : 'border-amber-400 bg-amber-500/25'
                  }`}
                >
                  <span className="px-2 py-1 rounded bg-slate-900/90 text-white text-[10px] font-mono font-bold shadow">
                    {Math.round(drawingBox.w * 100)}% × {Math.round(drawingBox.h * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Floating Zoom / Page Bar at Bottom Center */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-2xl shadow-2xl flex items-center space-x-4 text-xs font-bold text-slate-300">
            <button
              onClick={() => handleNavigatePage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="hover:text-white disabled:opacity-30"
            >
              ← Oldingi
            </button>
            <span className="text-white">
              Sahifa {currentPage} / {totalPagesCount}
            </span>
            <button
              onClick={() => handleNavigatePage(currentPage + 1)}
              disabled={currentPage >= totalPagesCount}
              className="hover:text-white disabled:opacity-30"
            >
              Keyingi →
            </button>
          </div>
        </>
      )}
    </main>

    {/* ======================================================= */}
    {/* D. RIGHT SIDEBAR — HOTSPOT PROPERTIES & MEDIA MANAGER    */}
    {/* ======================================================= */}
    {!isPreviewModeActive && (
      <aside className="w-80 bg-[#131F37] border-l border-slate-700/80 flex flex-col shrink-0 z-20 shadow-xl p-4 space-y-4 overflow-y-auto custom-scrollbar">
          {selectedHotspot ? (
            /* Selected Hotspot Properties Editor */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Hotspot Xususiyatlari</h3>
                    <p className="text-[10px] font-mono text-slate-400">{selectedHotspot.id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDuplicateHotspot(selectedHotspot.id)}
                    title="Nusxalash (Ctrl+D)"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                    title="O‘chirish"
                    className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Hotspot Name / Label */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Hotspot Nomi:</label>
                <input
                  type="text"
                  value={selectedHotspot.label}
                  onChange={(e) => handleUpdateSelectedHotspot({ label: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Hotspot Type Switcher */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Hotspot Turi:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedHotspot({ type: 'AUDIO' })}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 border transition-all ${
                      selectedHotspot.type === 'AUDIO'
                        ? 'bg-blue-600 text-white border-blue-500 shadow'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <Music className="w-3 h-3" />
                    <span>Audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedHotspot({ type: 'VIDEO' })}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 border transition-all ${
                      selectedHotspot.type === 'VIDEO'
                        ? 'bg-purple-600 text-white border-purple-500 shadow'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedHotspot({ type: 'ANSWER_LINK' })}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 border transition-all ${
                      selectedHotspot.type === 'ANSWER_LINK'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <Lightbulb className="w-3 h-3" />
                    <span>Javoblar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedHotspot({ type: 'OTHER' })}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 border transition-all ${
                      selectedHotspot.type === 'OTHER'
                        ? 'bg-amber-600 text-white border-amber-500 shadow'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Boshqa</span>
                  </button>
                </div>
              </div>

              {/* Unit & Exercise Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Unit / Dars:</label>
                  <input
                    type="text"
                    value={selectedHotspot.unitLesson || ''}
                    onChange={(e) => handleUpdateSelectedHotspot({ unitLesson: e.target.value })}
                    placeholder="Unit 1, Lesson 2"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Mashq raqami:</label>
                  <input
                    type="text"
                    value={selectedHotspot.exerciseLabel || ''}
                    onChange={(e) => handleUpdateSelectedHotspot({ exerciseLabel: e.target.value })}
                    placeholder="Ex. 2a"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* ======================================================== */}
              {/* PHASE 3: DEDICATED AUDIO / VIDEO CONNECTION & PREVIEW    */}
              {/* ======================================================== */}
              {selectedHotspot.type === 'AUDIO' && (
                <div className="space-y-2 p-3 rounded-2xl bg-slate-900/90 border border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center space-x-1.5">
                      <Headphones className="w-3.5 h-3.5 text-blue-400" />
                      <span>Audio Fayl Birikmasi</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaModalTab('AUDIO');
                        setIsMediaModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                    >
                      <span>Kutubxona</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {selectedHotspot.targetFile ? (
                    <div className="space-y-2.5">
                      {/* File Card */}
                      <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs truncate max-w-[170px]">
                            {linkedMediaForSelected?.title || selectedHotspot.targetFile}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-blue-300">
                            {formatDuration(linkedMediaForSelected?.durationSeconds || 135)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          📁 {selectedHotspot.targetFile}
                        </p>

                        {/* Inline Audio Player Widget */}
                        <div className="pt-1.5 border-t border-blue-900/50 flex items-center space-x-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleTogglePlayAudio(
                                linkedMediaForSelected?.url ||
                                  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                                selectedHotspot.id,
                                linkedMediaForSelected?.durationSeconds || 135,
                              )
                            }
                            className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow"
                          >
                            {isPlayingAudio && activePreviewAudioId === selectedHotspot.id ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3 ml-0.5" />
                            )}
                          </button>

                          {/* Progress Scrubber */}
                          <div className="flex-1 space-y-0.5">
                            <div className="h-1.5 bg-blue-950 rounded-full overflow-hidden border border-blue-800">
                              <div
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (audioCurrentTime / (linkedMediaForSelected?.durationSeconds || 135)) * 100,
                                  )}%`,
                                }}
                                className="h-full bg-blue-500 rounded-full transition-all"
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                              <span>{formatDuration(audioCurrentTime)}</span>
                              <span>{formatDuration(linkedMediaForSelected?.durationSeconds || 135)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Connection Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMediaModalTab('AUDIO');
                            setIsMediaModalOpen(true);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-[11px] font-bold flex items-center justify-center space-x-1"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Almashtirish</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveMediaConnection}
                          className="py-1 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 text-[11px] font-bold flex items-center space-x-1 border border-rose-800/40"
                        >
                          <Unlink className="w-3 h-3" />
                          <span>Uzish</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Big Unassigned CTA */
                    <button
                      type="button"
                      onClick={() => {
                        setMediaModalTab('AUDIO');
                        setIsMediaModalOpen(true);
                      }}
                      className="w-full py-3 px-3 rounded-xl border border-dashed border-blue-700/60 bg-blue-950/20 hover:bg-blue-900/30 text-blue-400 flex flex-col items-center justify-center space-y-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-bold">Audio Kutubxonasidan Tanlash</span>
                      <span className="text-[10px] text-slate-400">MP3 faylni biriktirish uchun bosing</span>
                    </button>
                  )}
                </div>
              )}

              {/* VIDEO CONNECTION & PREVIEW (Spec §5) */}
              {selectedHotspot.type === 'VIDEO' && (
                <div className="space-y-2 p-3 rounded-2xl bg-slate-900/90 border border-purple-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      <span>Video Dars Birikmasi</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaModalTab('VIDEO');
                        setIsMediaModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                    >
                      <span>Kutubxona</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {selectedHotspot.targetFile ? (
                    <div className="space-y-2.5">
                      {/* Video Thumbnail Preview Card */}
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-slate-700 group">
                          <img
                            src={
                              linkedMediaForSelected?.thumbnailUrl ||
                              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300'
                            }
                            alt="Video Thumbnail"
                            className="w-full h-full object-cover opacity-80"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const match = linkedMediaForSelected || {
                                id: selectedHotspot.id,
                                title: selectedHotspot.label,
                                filename: selectedHotspot.targetFile || 'video.mp4',
                                type: 'VIDEO',
                                unitLabel: selectedHotspot.unitLesson || 'Unit 1',
                                durationSeconds: 324,
                                sizeBytes: 18500000,
                                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                              };
                              setPreviewVideoItem(match as MediaItem);
                            }}
                            className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                          >
                            <Play className="w-4 h-4 ml-0.5" />
                          </button>
                        </div>

                        <div>
                          <h4 className="font-bold text-white text-xs truncate">
                            {linkedMediaForSelected?.title || selectedHotspot.label}
                          </h4>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>{selectedHotspot.targetFile}</span>
                            <span>{formatDuration(linkedMediaForSelected?.durationSeconds || 324)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Video Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMediaModalTab('VIDEO');
                            setIsMediaModalOpen(true);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-bold flex items-center justify-center space-x-1"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Almashtirish</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveMediaConnection}
                          className="py-1 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 text-[11px] font-bold flex items-center space-x-1 border border-rose-800/40"
                        >
                          <Unlink className="w-3 h-3" />
                          <span>Uzish</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Big Unassigned CTA */
                    <button
                      type="button"
                      onClick={() => {
                        setMediaModalTab('VIDEO');
                        setIsMediaModalOpen(true);
                      }}
                      className="w-full py-3 px-3 rounded-xl border border-dashed border-purple-700/60 bg-purple-950/20 hover:bg-purple-900/30 text-purple-400 flex flex-col items-center justify-center space-y-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-bold">Video Kutubxonasidan Tanlash</span>
                      <span className="text-[10px] text-slate-400">MP4 videoni biriktirish uchun bosing</span>
                    </button>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PHASE 4: DEDICATED TEACHER'S BOOK ANSWER MAPPING WORKFLOW */}
              {/* ========================================================= */}
              {selectedHotspot.type === 'ANSWER_LINK' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-900/50">
                  <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                    <span className="text-xs font-black text-emerald-400 flex items-center space-x-1.5">
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <span>O‘qituvchi Kitobi Javoblari</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      TB p.{selectedHotspot.targetPageNumber || 14}
                    </span>
                  </div>

                  {/* 1. Target Teacher's Book Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">O‘qituvchi Kitobi (Teacher’s Book):</label>
                    <select
                      value={selectedHotspot.targetTeacherBookId || (teacherBooksList[0]?.id || 'book_grade11_english_tb')}
                      onChange={(e) => {
                        const targetBook = teacherBooksList.find((b) => b.id === e.target.value);
                        handleUpdateSelectedHotspot({
                          targetTeacherBookId: e.target.value,
                          targetTeacherBookTitle: targetBook?.title || "Teacher's Book",
                        });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      {teacherBooksList.length > 0 ? (
                        teacherBooksList.map((tb) => (
                          <option key={tb.id} value={tb.id}>
                            {tb.title} ({tb.totalPages} bet)
                          </option>
                        ))
                      ) : (
                        <option value="book_grade11_english_tb">
                          English 11 Teacher's Book (Answer Key & Methodics)
                        </option>
                      )}
                    </select>
                  </div>

                  {/* 2. Target Page Number in Teacher's Book with Stepper & Preview Trigger */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-300">TB Javoblar Sahifasi:</label>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenTeacherBookPagePreview(
                            selectedHotspot.targetTeacherBookId || 'book_grade11_english_tb',
                            selectedHotspot.targetPageNumber || 14,
                          )
                        }
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Sahifani ko‘rish</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSelectedHotspot({
                            targetPageNumber: Math.max(1, (selectedHotspot.targetPageNumber || 14) - 1),
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs border border-slate-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={selectedHotspot.targetPageNumber || 14}
                        onChange={(e) =>
                          handleUpdateSelectedHotspot({ targetPageNumber: parseInt(e.target.value) || 1 })
                        }
                        className="flex-1 px-3 py-1.5 text-center text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSelectedHotspot({
                            targetPageNumber: (selectedHotspot.targetPageNumber || 14) + 1,
                          })
                        }
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs border border-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 3. Unit and Exercise Identifier */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Darslik Bo‘limi:</label>
                      <input
                        type="text"
                        value={selectedHotspot.unitLesson || 'Unit 1'}
                        onChange={(e) => handleUpdateSelectedHotspot({ unitLesson: e.target.value })}
                        placeholder="Unit 1..."
                        className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Mashq Raqami:</label>
                      <input
                        type="text"
                        value={selectedHotspot.exerciseLabel || 'Task 2.1'}
                        onChange={(e) => handleUpdateSelectedHotspot({ exerciseLabel: e.target.value })}
                        placeholder="Task 2.1..."
                        className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 4. Solution Key (Answer Text) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Yechim / Javoblar Kaliti:</label>
                    <textarea
                      rows={3}
                      value={selectedHotspot.solutionText || ''}
                      onChange={(e) => handleUpdateSelectedHotspot({ solutionText: e.target.value })}
                      placeholder="1. C | 2. A | 3. D | 4. B&#10;Yoki to‘liq matnli javoblar..."
                      className="w-full p-2.5 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar"
                    />
                  </div>

                  {/* 5. Teacher Methodology Notes */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Metodik Ko‘rsatma (O‘qituvchi uchun):</label>
                    <textarea
                      rows={2}
                      value={selectedHotspot.methodologyNotes || ''}
                      onChange={(e) => handleUpdateSelectedHotspot({ methodologyNotes: e.target.value })}
                      placeholder="O‘quvchilarga avval mustaqil ishlashga berish tavsiya etiladi..."
                      className="w-full p-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* 6. Multi-Answer Support (Spec §6) */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Ko‘p qismli javoblar (Multi-task):</span>
                      <button
                        type="button"
                        onClick={handleAddSubAnswer}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Qism qo‘shish</span>
                      </button>
                    </div>

                    {selectedHotspot.multiAnswers && selectedHotspot.multiAnswers.length > 0 && (
                      <div className="space-y-2">
                        {selectedHotspot.multiAnswers.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <input
                                type="text"
                                value={sub.exerciseNumber}
                                onChange={(e) => handleUpdateSubAnswer(sub.id, { exerciseNumber: e.target.value })}
                                className="px-1.5 py-0.5 text-[11px] font-bold bg-slate-900 border border-slate-700 rounded text-emerald-400 w-24"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSubAnswer(sub.id)}
                                className="text-rose-400 hover:text-rose-300 p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={sub.solutionKey}
                              onChange={(e) => handleUpdateSubAnswer(sub.id, { solutionKey: e.target.value })}
                              placeholder="Ushbu qism javobi (masalan: 1-A, 2-C)..."
                              className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 7. Action Buttons: Browse Answers Library & Clear */}
                  <div className="pt-2 flex flex-col space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAnswerModalOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Javoblar Bazasidan Tanlash</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAnswerConnection}
                      className="w-full py-1.5 text-center text-slate-400 hover:text-rose-400 text-[11px] font-semibold transition-colors"
                    >
                      Javoblar kalitini uzish
                    </button>
                  </div>
                </div>
              )}

              {/* Normalized Coordinates Display Card (Spec §8) */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
                  <span>📐 Normalized Coordinates (0.0 – 1.0)</span>
                  <span className="text-emerald-400 font-mono">100% Moslashuvchan</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                  <div>X: {(selectedHotspot.rect.x * 100).toFixed(1)}%</div>
                  <div>Y: {(selectedHotspot.rect.y * 100).toFixed(1)}%</div>
                  <div>Eni (W): {(selectedHotspot.rect.w * 100).toFixed(1)}%</div>
                  <div>Bo‘yi (H): {(selectedHotspot.rect.h * 100).toFixed(1)}%</div>
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Tavsif va Metodik Eslatma:</label>
                <textarea
                  rows={2}
                  value={selectedHotspot.description || ''}
                  onChange={(e) => handleUpdateSelectedHotspot({ description: e.target.value })}
                  placeholder="Metodik eslatma yoki mashq tavsifi..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            /* No Hotspot Selected: General Page & Catalog Stats */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Sahifa Ma'lumotlari</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {currentBook?.title || 'Darslik'} • Sahifa {currentPage}
                </p>
              </div>

              {/* Page Stats Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sinf:</span>
                  <span className="font-bold text-white">{currentBook?.gradeId || 11}-sinf</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kitob turi:</span>
                  <span className="font-bold text-blue-400">{currentBook?.type || "Student's Book"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sahifadagi Hotspotlar:</span>
                  <span className="font-bold text-emerald-400">{currentPageHotspots.length} ta</span>
                </div>
              </div>

              {/* Current Page Hotspots List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Ushbu Sahifadagi Obyektlar:
                </h4>

                {currentPageHotspots.map((hs) => (
                  <div
                    key={hs.id}
                    onClick={() => {
                      setSelectedHotspotId(hs.id);
                      setSelectedHotspotIds([hs.id]);
                    }}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-xs space-y-1 hover:border-blue-500 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate">{hs.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-400">
                        {hs.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{hs.targetFile || 'Fayl biriktirilmagan'}</p>
                  </div>
                ))}

                {currentPageHotspots.length === 0 && (
                  <div className="p-6 rounded-2xl bg-slate-900/50 border border-dashed border-slate-700 text-center text-xs text-slate-400 space-y-2">
                    <Square className="w-6 h-6 text-slate-500 mx-auto" />
                    <p>Ushbu sahifada hali hech qanday hotspot chizilmagan.</p>
                    <p className="text-[10px] text-blue-400 font-bold">
                      Tepadagi + Audio yoki + Video asbobini tanlab, darslik ustida sichqoncha bilan to‘rtburchak chizing!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Guide Card */}
          <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-700/60 text-[11px] text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-200 block">⚡ Tezkor Tugmalar:</span>
            <div className="flex justify-between">
              <span>Nusxalash:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">Ctrl+D</kbd>
            </div>
            <div className="flex justify-between">
              <span>O‘chirish:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">Delete</kbd>
            </div>
            <div className="flex justify-between">
              <span>Orqaga qaytarish:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">Ctrl+Z</kbd>
            </div>
          </div>
        </aside>
      )}
      </div>

      {/* ========================================================= */}
      {/* PHASE 3: INTERACTIVE MEDIA LIBRARY MODAL                  */}
      {/* ========================================================= */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[85vh] bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex items-center justify-between shrink-0 bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                  {mediaModalTab === 'AUDIO' ? <Music className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Audio & Video Kutubxonasi</h3>
                  <p className="text-xs text-slate-400">
                    {selectedHotspot ? `"${selectedHotspot.label}" uchun fayl tanlang` : 'Darslik media fayllari ro‘yxati'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Audio vs Video Tabs */}
                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setMediaModalTab('AUDIO')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      mediaModalTab === 'AUDIO' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Audiolar</span>
                  </button>
                  <button
                    onClick={() => setMediaModalTab('VIDEO')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      mediaModalTab === 'VIDEO' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Videolar</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsMediaModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-700/60 bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 w-full sm:w-auto">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Fayl nomi yoki darslik mavzusi bo‘yicha qidirish..."
                  value={mediaSearchQuery}
                  onChange={(e) => setMediaSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={mediaUnitFilter}
                  onChange={(e) => setMediaUnitFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">Barcha Unitlar</option>
                  <option value="Unit 1">Unit 1: Digital Future</option>
                  <option value="Unit 2">Unit 2: Global Pedagogy</option>
                  <option value="Unit 3">Unit 3: Scientific Advances</option>
                </select>
              </div>
            </div>

            {/* Media Items Scrollable Grid / List */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
              {isLoadingMedia ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span>Kutubxona yuklanmoqda...</span>
                </div>
              ) : filteredMediaList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                  <Film className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>Qidiruv bo‘yicha fayllar topilmadi.</p>
                </div>
              ) : (
                filteredMediaList.map((media) => {
                  const isAudio = media.type === 'AUDIO';
                  const isPlaying = isPlayingAudio && activePreviewAudioId === media.id;
                  const isAssigned = selectedHotspot?.targetFile === media.filename;

                  return (
                    <div
                      key={media.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isAssigned
                          ? 'bg-blue-600/15 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                          : 'bg-slate-900/80 border-slate-700/80 hover:bg-slate-850 hover:border-slate-600'
                      }`}
                    >
                      {/* Media Left Details */}
                      <div className="flex items-center space-x-3.5 min-w-0">
                        {isAudio ? (
                          /* Audio Play / Pause Button */
                          <button
                            type="button"
                            onClick={() =>
                              handleTogglePlayAudio(media.url, media.id, media.durationSeconds)
                            }
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform hover:scale-105 ${
                              isPlaying
                                ? 'bg-blue-600 text-white shadow-blue-500/40'
                                : 'bg-blue-950/60 text-blue-400 border border-blue-800/60 hover:bg-blue-900/60'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                          </button>
                        ) : (
                          /* Video Thumbnail with Preview Action */
                          <div
                            onClick={() => setPreviewVideoItem(media)}
                            className="w-16 h-11 rounded-xl overflow-hidden relative bg-black shrink-0 border border-slate-700 cursor-pointer group"
                          >
                            <img
                              src={
                                media.thumbnailUrl ||
                                'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300'
                              }
                              alt={media.title}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow">
                              <Play className="w-2.5 h-2.5 ml-0.5" />
                            </div>
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-black text-white truncate">{media.title}</h4>
                            {isAssigned && (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                Biriktirilgan ✓
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1 font-mono">
                            <span>📁 {media.filename}</span>
                            <span>•</span>
                            <span className="text-blue-400 font-bold">{media.unitLabel}</span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{formatDuration(media.durationSeconds)}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <HardDrive className="w-3 h-3 text-slate-500" />
                              <span>{formatFileSize(media.sizeBytes)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        {!isAudio && (
                          <button
                            type="button"
                            onClick={() => setPreviewVideoItem(media)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ko‘rish</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAssignMediaToHotspot(media)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all ${
                            isAssigned
                              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                              : isAudio
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAssigned ? 'Tanlangan' : 'Biriktirish'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 3: DEDICATED HIGH-RES VIDEO PREVIEW MODAL           */}
      {/* ========================================================= */}
      {previewVideoItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-3xl bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{previewVideoItem.title}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {previewVideoItem.unitLabel} • {previewVideoItem.filename}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewVideoItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="bg-black p-2 flex items-center justify-center">
              <video
                controls
                autoPlay
                src={previewVideoItem.url}
                poster={previewVideoItem.thumbnailUrl}
                className="w-full max-h-[460px] rounded-xl object-contain bg-black shadow-inner"
              />
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                <span>⏱️ {formatDuration(previewVideoItem.durationSeconds)}</span>
                <span>💾 {formatFileSize(previewVideoItem.sizeBytes)}</span>
                <span>🌐 {previewVideoItem.language || 'English'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewVideoItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Yopish
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignMediaToHotspot(previewVideoItem)}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Ushbu Videoni Hotspotga Biriktirish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 4: TEACHER'S BOOK ANSWER KEY LIBRARY MODAL          */}
      {/* ========================================================= */}
      {isAnswerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[85vh] bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700 flex items-center justify-between shrink-0 bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">O‘qituvchi Kitobi Javoblar Bazasi</h3>
                  <p className="text-xs text-slate-400">
                    {selectedHotspot
                      ? `"${selectedHotspot.label}" uchun tayyor yechim kalitini tanlang`
                      : 'O‘qituvchi kitobi rasmiy javoblar ro‘yxati'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAnswerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-700/60 bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 w-full sm:w-auto">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Mashq kodi (Task 2.1), nomi yoki javob kaliti bo‘yicha qidirish..."
                  value={answerSearchQuery}
                  onChange={(e) => setAnswerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <select
                  value={answerUnitFilter}
                  onChange={(e) => setAnswerUnitFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Barcha Unitlar</option>
                  <option value="Unit 1">Unit 1: Digital Future</option>
                  <option value="Unit 2">Unit 2: Global Pedagogy</option>
                  <option value="Unit 3">Unit 3: My School</option>
                </select>
              </div>
            </div>

            {/* Answers Scrollable List */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
              {isLoadingAnswers ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                  <span>Javoblar bazasi yuklanmoqda...</span>
                </div>
              ) : filteredAnswerList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                  <Lightbulb className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>Qidiruv bo‘yicha mos javoblar topilmadi.</p>
                </div>
              ) : (
                filteredAnswerList.map((answer) => {
                  const isAssigned =
                    selectedHotspot?.targetPageNumber === answer.teacherPageNumber &&
                    selectedHotspot?.exerciseLabel === answer.exerciseNumber;

                  return (
                    <div
                      key={answer.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                        isAssigned
                          ? 'bg-emerald-600/15 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                          : 'bg-slate-900/80 border-slate-700/80 hover:bg-slate-850 hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        {/* Badges & Titles */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-black border border-emerald-500/30">
                            TB Sahifa {answer.teacherPageNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold">
                            {answer.unitLabel}
                          </span>
                          <h4 className="text-xs font-black text-white">{answer.exerciseNumber}: {answer.exerciseTitle}</h4>
                          {isAssigned && (
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                              Biriktirilgan ✓
                            </span>
                          )}
                        </div>

                        {/* Solution Snippet */}
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                          {answer.solutionKey}
                        </div>

                        {/* Methodology Notes */}
                        {answer.methodologyNotes && (
                          <div className="flex items-start space-x-1.5 text-[11px] text-slate-400 italic">
                            <span className="font-bold text-slate-300 shrink-0">💡 Metodika:</span>
                            <span>{answer.methodologyNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenTeacherBookPagePreview(answer.teacherBookId, answer.teacherPageNumber)
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1 border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Sahifani ko‘rish</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAssignAnswerKeyToHotspot(answer)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all ${
                            isAssigned
                              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAssigned ? 'Tanlangan' : 'Biriktirish'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 4: VISUAL TEACHER'S BOOK PAGE PREVIEW MODAL         */}
      {/* ========================================================= */}
      {previewTeacherBookPageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/60 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {previewTeacherBookPageModal.teacherBookTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Rasmiy O‘qituvchi Kitobi • Sahifa {previewTeacherBookPageModal.pageNumber}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewTeacherBookPageModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Page Inspection Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Simulated Teacher's Book Page Mockup */}
              <div className="bg-white rounded-2xl shadow-xl p-6 text-slate-900 flex flex-col justify-between border border-slate-300 min-h-[420px]">
                <div>
                  {/* Mockup Header */}
                  <div className="border-b-2 border-emerald-700 pb-2 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        TEACHER’S BOOK & PEDAGOGICAL METHODICS
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        Unit 1: Digital Classroom & AI
                      </h3>
                    </div>
                    <span className="text-lg font-black font-mono text-emerald-700">
                      p. {previewTeacherBookPageModal.pageNumber}
                    </span>
                  </div>

                  {/* Mockup Page Content Blocks */}
                  <div className="space-y-4 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="font-black text-emerald-900 text-xs block mb-1">
                        Task 2.1 — Interactive Vocabulary (Answer Key)
                      </span>
                      <p className="font-mono text-slate-800 text-[11px] leading-relaxed">
                        1. Digital Classrooms → C<br />
                        2. AI Tutors → A<br />
                        3. Pedagogy → D<br />
                        4. Active Speaking → B
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="font-black text-blue-900 text-xs block mb-1">
                        Task 2.2 — Reading Comprehension
                      </span>
                      <p className="font-mono text-slate-800 text-[11px] leading-relaxed">
                        1. True &nbsp;|&nbsp; 2. False &nbsp;|&nbsp; 3. Not Given &nbsp;|&nbsp; 4. True
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-600 italic border-l-2 border-emerald-500 pl-2">
                      “Teachers should facilitate paired dialogue before revealing verified answer keys.”
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t pt-2 flex justify-between font-mono">
                  <span>SmartTeacherBook Verified Curriculum</span>
                  <span>Page {previewTeacherBookPageModal.pageNumber}</span>
                </div>
              </div>

              {/* Mapped Exercises List & 1-Click Assignment */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Ushbu Sahifada Mavjud Javoblar ({previewTeacherBookPageModal.answers.length}):</span>
                  </h4>

                  {previewTeacherBookPageModal.answers.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-400">
                      Ushbu sahifaga oldindan indekslangan javoblar yo‘q. Yangi javob qo‘shish mumkin.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {previewTeacherBookPageModal.answers.map((ans) => (
                        <div
                          key={ans.id}
                          className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-emerald-400">
                              {ans.exerciseNumber}: {ans.exerciseTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleAssignAnswerKeyToHotspot(ans);
                                setPreviewTeacherBookPageModal(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow"
                            >
                              Hotspotga Biriktirish
                            </button>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300">
                            {ans.solutionKey}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>💡 O‘qituvchi mobil ilovada javobni shu ko‘rinishda ko‘radi.</span>
                  <button
                    type="button"
                    onClick={() => setPreviewTeacherBookPageModal(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 5: VALIDATION BEFORE PUBLISHING MODAL (Spec §12)    */}
      {/* ========================================================= */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-900/60 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Darslikni Nashr Qilish (Pre-Publish Check)</h3>
                  <p className="text-xs text-slate-400">
                    {currentBook?.title || 'Darslik'} • {currentBook?.gradeId ? `${currentBook.gradeId}-sinf` : '11-sinf'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Validation Report Content */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
              {isValidatingPublish ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
                  <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
                  <span>Darslik resurslari va havolalari tekshirilmoqda...</span>
                </div>
              ) : validationReport ? (
                <>
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center space-x-3 ${
                      validationReport.canPublish
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    {validationReport.canPublish ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        {validationReport.canPublish
                          ? 'Darslik nashrga 100% tayyor!'
                          : 'Nashr qilish bloklandi: Tanqidiy xatoliklar mavjud'}
                      </h4>
                      <p className="text-xs opacity-90 mt-0.5">
                        {validationReport.canPublish
                          ? 'Barcha media fayllar, Teacher’s Book javoblar kaliti va sahifalar to‘liq tekshirildi.'
                          : 'Iltimos, quyidagi xatoliklarni bartaraf etib qayta urinib ko‘ring.'}
                      </p>
                    </div>
                  </div>

                  {/* Metrics 4-Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Jami Sahifalar</span>
                      <span className="text-lg font-black font-mono text-white">
                        {validationReport.summary?.totalPages || 6}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-center">
                      <span className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Audiolar</span>
                      <span className="text-lg font-black font-mono text-blue-400">
                        {validationReport.summary?.totalAudioHotspots || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-center">
                      <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">Videolar</span>
                      <span className="text-lg font-black font-mono text-purple-400">
                        {validationReport.summary?.totalVideoHotspots || 0}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700/80 text-center">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">Javoblar Kaliti</span>
                      <span className="text-lg font-black font-mono text-emerald-400">
                        {validationReport.summary?.totalAnswerMappings || 0}
                      </span>
                    </div>
                  </div>

                  {/* Errors List (Blocking) */}
                  {validationReport.errors && validationReport.errors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Tanqidiy Xatoliklar ({validationReport.errors.length}):</span>
                      </h5>
                      <div className="space-y-1.5">
                        {validationReport.errors.map((err: string, i: number) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/60 text-rose-300 text-xs flex items-center space-x-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings List (Non-blocking) */}
                  {validationReport.warnings && validationReport.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Ogohlantirishlar ({validationReport.warnings.length}):</span>
                      </h5>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {validationReport.warnings.map((warn: string, i: number) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-300 text-xs flex items-center space-x-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-700 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Nashr qilingan darslik mobil ilovada o‘qituvchilarga darhol taqdim etiladi.
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPublish}
                  disabled={!validationReport?.canPublish || isPublishingBook}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5 transition-all"
                >
                  {isPublishingBook ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isPublishingBook ? 'Nashr qilinmoqda...' : 'Tasdiqlash va Nashr Qilish'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PHASE 5: AUTOMATIC LINK DETECTION MODAL (Spec §10)        */}
      {/* ========================================================= */}
      {isDetectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#1E293B] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-900/60 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">PDF Giperhavolalarni Aniqlash</h3>
                  <p className="text-xs text-slate-400">
                    PDF hujjatidagi ichki annotatsiyalar va audio/video belgilari
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDetectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Detected List */}
            <div className="p-6 overflow-y-auto space-y-3 max-h-[60vh] custom-scrollbar">
              {isDetectingLinks ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
                  <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
                  <span>PDF annotatsiyalari skanerlanmoqda...</span>
                </div>
              ) : detectedLinksList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p>Barcha aniqlangan havolalar qabul qilingan yoki qo‘shimcha havolalar mavjud emas.</p>
                </div>
              ) : (
                detectedLinksList.map((link) => (
                  <div
                    key={link.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[10px] font-black">
                          {Math.round(link.confidenceScore * 100)}% Ishonchlilik
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                          Sahifa {link.pageNumber}
                        </span>
                        <h5 className="font-extrabold text-white truncate">{link.suggestedTitle}</h5>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        🔗 {link.detectedUrl || link.suggestedFile}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAcceptDetectedLink(link)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 shadow-md transition-all"
                    >
                      Hotspotga Aylantirish
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-700 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                {detectedLinksList.length} ta havola aniqlandi.
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDetectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Yopish
                </button>
                {detectedLinksList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAcceptAllDetectedLinks}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/30 flex items-center space-x-1.5 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Barchasini Qabul Qilish ({detectedLinksList.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
