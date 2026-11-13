import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  MousePointer,
  Headphones,
  Video,
  Lightbulb,
  StickyNote,
  Eye,
  Check,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Maximize2,
  Plus,
  X,
  Play,
  Pause,
  Trash2,
  Copy,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Smartphone,
  Tablet,
  Monitor,
  UploadCloud,
  Sparkles,
  Rocket,
  Music,
  Film,
  Search,
  CheckCircle2,
  AlertTriangle,
  List,
  BookOpen,
} from 'lucide-react';
import {
  Book,
  BookType,
  normalizeContentStartPage,
  pdfPageToBookDisplay,
} from '@smartteacherbook/shared';

const API_BASE = 'http://localhost:4000/api/v1';

async function adminFetchJson<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('stb_admin_token') : null;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json();
}

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
  imageHighUrl?: string;
  imageNormalUrl?: string;
}

export type HotspotType = 'AUDIO' | 'VIDEO' | 'ANSWER_LINK' | 'OTHER';

export interface HotspotItem {
  id: string;
  bookId?: string;
  pageNumber: number;
  type: HotspotType;
  rect: { x: number; y: number; w: number; h: number };
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
  targetTeacherBookId?: string;
  targetTeacherBookTitle?: string;
  solutionText?: string;
  methodologyNotes?: string;
  imageUrl?: string;
}

export interface MediaItem {
  id: string;
  bookId?: string;
  type: 'AUDIO' | 'VIDEO';
  filename: string;
  title: string;
  unitLabel: string;
  durationSeconds: number;
  sizeBytes: number;
  url: string;
  thumbnailUrl?: string;
}

export type EditorToolMode =
  | 'SELECT'
  | 'DRAW_AUDIO'
  | 'DRAW_VIDEO'
  | 'DRAW_ANSWER'
  | 'DRAW_OTHER';

type ResizeHandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface VisualPdfEditorProps {
  initialBookId?: string;
  onSelectBookId?: (bookId: string) => void;
  activeGrades?: number[];
  onBackToBooks?: () => void;
  onOpenMobilePreview?: () => void;
}

/**
 * Miniature PDF Page Thumbnail Card for the Left "Book Pages" Sidebar
 */
const PdfPageThumbnail: React.FC<{
  pdfDoc: any;
  pageNumber: number;
  isSelected: boolean;
}> = ({ pdfDoc, pageNumber, isSelected }) => {
  const thumbRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdfDoc || !thumbRef.current) return;

    const renderThumb = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !thumbRef.current) return;
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = thumbRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {}
    };

    renderThumb();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, isSelected]);

  if (!pdfDoc) {
    return (
      <div className="w-full h-28 bg-gradient-to-br from-sky-50 via-white to-indigo-50 rounded-lg border border-slate-200/70 p-2 flex flex-col justify-between overflow-hidden">
        <div className="space-y-1">
          <div className="h-2 w-3/4 bg-indigo-200/70 rounded" />
          <div className="h-1.5 w-1/2 bg-sky-200/70 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-1 my-1">
          <div className="h-7 bg-sky-100 rounded border border-sky-200/60" />
          <div className="h-7 bg-indigo-100 rounded border border-indigo-200/60" />
        </div>
        <div className="h-2 w-full bg-slate-200/70 rounded" />
      </div>
    );
  }

  return (
    <canvas
      ref={thumbRef}
      className="w-full h-auto max-h-32 object-contain bg-white rounded-lg border border-slate-100 mx-auto block"
    />
  );
};

export function VisualPdfEditor({
  initialBookId = '',
  onSelectBookId,
  activeGrades,
  onBackToBooks,
  onOpenMobilePreview,
}: VisualPdfEditorProps) {
  // Core Book & Pages State
  const [booksList, setBooksList] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<VisualPage[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [unitFilter, setUnitFilter] = useState<string>('ALL');
  const [tocUnits, setTocUnits] = useState<
    Array<{ id: string; unit?: string; title: string; pageNumber: number; endPageNumber?: number }>
  >([]);
  const [isUnitsModalOpen, setIsUnitsModalOpen] = useState<boolean>(false);
  const [unitDrafts, setUnitDrafts] = useState<
    Array<{ id: string; title: string; pageNumber: string; endPageNumber: string }>
  >([]);
  const [newUnitTitle, setNewUnitTitle] = useState<string>('');
  const [newUnitStartPage, setNewUnitStartPage] = useState<string>('1');
  const [newUnitEndPage, setNewUnitEndPage] = useState<string>('');
  const [isSavingUnits, setIsSavingUnits] = useState<boolean>(false);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);
  const [contentStartInput, setContentStartInput] = useState<string>('1');
  const [isSavingBookOffset, setIsSavingBookOffset] = useState<boolean>(false);

  // Canvas & Viewport State
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [pageAspect, setPageAspect] = useState<number>(1.42);
  const [isFitToScreen, setIsFitToScreen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'MOBILE' | 'TABLET' | 'DESKTOP'>('MOBILE');
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isJumpOpen, setIsJumpOpen] = useState<boolean>(false);
  const [jumpInput, setJumpInput] = useState<string>('1');

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false);
  const [isAddingPage, setIsAddingPage] = useState<boolean>(false);
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  const directMediaInputRef = useRef<HTMLInputElement | null>(null);
  const pdfLoadSeqRef = useRef<number>(0);
  const renderSeqRef = useRef<number>(0);
  const activePdfRenderTaskRef = useRef<any>(null);

  const handleSwitchBook = useCallback(
    (nextId: string) => {
      setSelectedBookId(nextId);
      const found = booksList.find((b) => b.id === nextId) || null;
      if (found) setCurrentBook(found);
    },
    [booksList],
  );

  useEffect(() => {
    if (selectedBookId) {
      onSelectBookId?.(selectedBookId);
    }
  }, [selectedBookId, onSelectBookId]);

  const getBaseWidth = (mode: 'MOBILE' | 'TABLET' | 'DESKTOP') =>
    mode === 'MOBILE' ? 410 : mode === 'TABLET' ? 560 : 720;

  const computeFitScale = useCallback(() => {
    const el = canvasScrollRef.current;
    if (!el) return 1.0;
    const availW = Math.max(220, el.clientWidth - 48);
    const availH = Math.max(220, el.clientHeight - 48);
    const baseW = getBaseWidth(viewMode);
    const baseH = baseW * pageAspect;
    const raw = Math.min(availW / baseW, availH / baseH);
    return Math.min(1.6, Math.max(0.3, +raw.toFixed(2)));
  }, [viewMode, pageAspect]);

  const handleFitToScreen = useCallback(() => {
    const fitted = computeFitScale();
    setZoomScale(fitted);
    setIsFitToScreen(true);
  }, [computeFitScale]);

  useEffect(() => {
    if (!isFitToScreen) return;
    const applyFit = () => {
      const fitted = computeFitScale();
      setZoomScale((prev) => (Math.abs(prev - fitted) >= 0.01 ? fitted : prev));
    };
    applyFit();
    const el = canvasScrollRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(applyFit);
      observer.observe(el);
    }
    window.addEventListener('resize', applyFit);
    return () => {
      window.removeEventListener('resize', applyFit);
      observer?.disconnect();
    };
  }, [isFitToScreen, computeFitScale]);

  // Hotspots & Undo/Redo State
  const [activeTool, setActiveTool] = useState<EditorToolMode>('SELECT');
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'GENERAL' | 'ADVANCED'>('GENERAL');

  const [undoStack, setUndoStack] = useState<HotspotItem[][]>([]);
  const [redoStack, setRedoStack] = useState<HotspotItem[][]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Dragging, Resizing, Drawing State
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

  // Media, Answer Keys & Audio Preview State
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [mediaSearch, setMediaSearch] = useState<string>('');
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [isPlayingPreviewAudio, setIsPlayingPreviewAudio] = useState<boolean>(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [previewVideoModal, setPreviewVideoModal] = useState<HotspotItem | null>(null);
  const [previewAnswerModal, setPreviewAnswerModal] = useState<HotspotItem | null>(null);
  const [previewNoteModal, setPreviewNoteModal] = useState<HotspotItem | null>(null);
  const [teacherBooksList, setTeacherBooksList] = useState<Book[]>([]);

  // Publish & Shortcuts Modals + Toast
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(
    null,
  );

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ==========================================
  // 1. INITIAL DATA LOADING
  // ==========================================
  const loadBooks = useCallback(async () => {
    try {
      const list = await adminFetchJson<Book[]>('/content/books');
      if (Array.isArray(list)) {
        setBooksList(list);
        const match =
          list.find((b) => b.id === (selectedBookId || initialBookId)) || list[0] || null;
        if (match) {
          setSelectedBookId(match.id);
          setCurrentBook(match);
        }
      }
    } catch {}
  }, [initialBookId, selectedBookId]);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (initialBookId && initialBookId !== selectedBookId) {
      setSelectedBookId(initialBookId);
    }
  }, [initialBookId]);

  const loadBookAssets = useCallback(async (bookId: string) => {
    if (!bookId) {
      setPages(
        Array.from({ length: 6 }, (_, i) => ({
          id: `demo_p_${i + 1}`,
          bookId: 'demo',
          pageNumber: i + 1,
          width: 1200,
          height: 1600,
          rotation: 0,
          audioHotspotsCount: 0,
          videoHotspotsCount: 0,
          answerHotspotsCount: 0,
          hasHotspots: false,
          titleSnippet: `Page ${i + 1}`,
        })),
      );
      setPdfDoc(null);
      return;
    }

    setIsLoadingPages(true);
    try {
      const [pagesRes, hsRes, mediaRes, tocRes, tbRes] = await Promise.all([
        adminFetchJson<VisualPage[]>(`/content/books/${bookId}/pages`).catch(() => []),
        adminFetchJson<HotspotItem[]>(`/content/books/${bookId}/hotspots`).catch(() => []),
        adminFetchJson<MediaItem[]>(`/content/media?bookId=${bookId}`).catch(() => []),
        adminFetchJson<any[]>(`/content/books/${bookId}/toc`).catch(() => []),
        adminFetchJson<Book[]>('/content/teacher-books').catch(() => []),
      ]);

      setPages(Array.isArray(pagesRes) ? pagesRes : []);
      const loadedHs = Array.isArray(hsRes) ? hsRes : [];
      setHotspots(loadedHs);
      setSelectedHotspotId(loadedHs.find((h) => h.pageNumber === 1)?.id || loadedHs[0]?.id || null);
      setMediaList(Array.isArray(mediaRes) ? mediaRes : []);
      setTocUnits(Array.isArray(tocRes) ? tocRes : []);
      setTeacherBooksList(Array.isArray(tbRes) ? tbRes : []);
      setUndoStack([]);
      setRedoStack([]);
      setHasUnsavedChanges(false);
      setCurrentPage(1);
      setJumpInput('1');
    } finally {
      setIsLoadingPages(false);
    }
  }, []);

  const loadPdfStream = useCallback(async (bookId: string) => {
    const seq = ++pdfLoadSeqRef.current;
    if (!bookId || typeof window === 'undefined' || !(window as any).pdfjsLib) {
      setPdfDoc(null);
      setIsLoadingPdf(false);
      setPdfLoadError(null);
      return;
    }
    setPdfDoc(null);
    setIsLoadingPdf(true);
    setPdfLoadError(null);
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('stb_admin_token') : null;
      const res = await fetch(`${API_BASE}/content/books/${bookId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (seq !== pdfLoadSeqRef.current) return;
      if (!res.ok) {
        setPdfDoc(null);
        setPdfLoadError(res.status === 404 ? 'NO_PDF' : `HTTP ${res.status}`);
        return;
      }
      const buf = await res.arrayBuffer();
      if (seq !== pdfLoadSeqRef.current) return;
      const doc = await (window as any).pdfjsLib.getDocument({ data: buf }).promise;
      if (seq !== pdfLoadSeqRef.current) return;
      setPdfDoc(doc);
      setPdfLoadError(null);
    } catch (err: any) {
      if (seq !== pdfLoadSeqRef.current) return;
      setPdfDoc(null);
      setPdfLoadError(err?.message || 'PDF yuklashda xatolik');
    } finally {
      if (seq === pdfLoadSeqRef.current) {
        setIsLoadingPdf(false);
      }
    }
  }, []);

  useEffect(() => {
    const matched = booksList.find((b) => b.id === selectedBookId) || null;
    if (matched) {
      setCurrentBook(matched);
      setContentStartInput(String(matched.contentStartPdfPage || 1));
    }
    loadBookAssets(selectedBookId);
    loadPdfStream(selectedBookId);
  }, [selectedBookId, booksList, loadBookAssets, loadPdfStream]);

  const activeContentStartPdfPage = normalizeContentStartPage(
    currentBook?.contentStartPdfPage || parseInt(contentStartInput, 10) || 1,
    pages.length || currentBook?.totalPages || 1,
  );

  const handleSaveBookPageOffset = async (targetStartPage?: number) => {
    if (!selectedBookId) return;
    const raw = targetStartPage ?? parseInt(contentStartInput, 10);
    const maxPages = Math.max(1, pages.length || currentBook?.totalPages || 1);
    const normalized = normalizeContentStartPage(raw, maxPages);
    setContentStartInput(String(normalized));
    setIsSavingBookOffset(true);
    try {
      const updated = await adminFetchJson<Book>(`/content/books/${selectedBookId}`, {
        method: 'PATCH',
        body: JSON.stringify({ contentStartPdfPage: normalized }),
      });
      setCurrentBook((prev) => (prev ? { ...prev, contentStartPdfPage: updated?.contentStartPdfPage || normalized } : prev));
      setBooksList((prev) =>
        prev.map((b) =>
          b.id === selectedBookId
            ? { ...b, contentStartPdfPage: updated?.contentStartPdfPage || normalized }
            : b,
        ),
      );
      showToast(`1-sahifa PDF #${normalized} betidan boshlanadigan qilib saqlandi ✅`);
    } catch (e: any) {
      showToast(`Saqlashda xatolik: ${e?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingBookOffset(false);
    }
  };

  // Render active PDF page or real uploaded page image onto a clean white sheet (never synthetic fallback letters)
  const renderPageCanvas = useCallback(async () => {
    const canvas = pageCanvasRef.current;
    if (!canvas) return;

    const seq = ++renderSeqRef.current;
    if (activePdfRenderTaskRef.current?.cancel) {
      try {
        activePdfRenderTaskRef.current.cancel();
      } catch {}
      activePdfRenderTaskRef.current = null;
    }

    const targetW = getBaseWidth(viewMode);
    const drawBlankSheet = (aspect: number) => {
      const safeAspect = Number.isFinite(aspect) && aspect > 0.4 ? aspect : 1.42;
      setPageAspect((prev) => (Math.abs(prev - safeAspect) > 0.005 ? safeAspect : prev));
      const dpr = 1.5;
      const displayW = Math.round(targetW * zoomScale);
      const displayH = Math.round(targetW * safeAspect * zoomScale);
      canvas.width = Math.max(1, Math.round(displayW * dpr));
      canvas.height = Math.max(1, Math.round(displayH * dpr));
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    if (pdfDoc) {
      try {
        const safePageNum = Math.max(1, Math.min(pdfDoc.numPages || 1, currentPage));
        const page = await pdfDoc.getPage(safePageNum);
        if (seq !== renderSeqRef.current) return;

        const rawVp = page.getViewport({ scale: 1 });
        const nextAspect = +(rawVp.height / rawVp.width).toFixed(4);
        setPageAspect((prev) => (Math.abs(prev - nextAspect) > 0.005 ? nextAspect : prev));
        const fitScale = targetW / rawVp.width;
        const viewport = page.getViewport({ scale: fitScale * zoomScale * 1.5 });

        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        canvas.style.width = `${Math.round(viewport.width / 1.5)}px`;
        canvas.style.height = `${Math.round(viewport.height / 1.5)}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Solid white base prevents transparent PDF layers from leaking prior content
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const task = page.render({ canvasContext: ctx, viewport });
          activePdfRenderTaskRef.current = task;
          await task.promise;
          if (seq === renderSeqRef.current) {
            activePdfRenderTaskRef.current = null;
          }
        }
        return;
      } catch (err: any) {
        if (seq !== renderSeqRef.current || err?.name === 'RenderingCancelledException') {
          return;
        }
      }
    }

    const activePageObj = pages.find((p) => p.pageNumber === currentPage);
    const rawPageImg = activePageObj?.imageHighUrl || activePageObj?.imageNormalUrl;
    const resolvedPageImg = rawPageImg
      ? rawPageImg.startsWith('/')
        ? `http://localhost:4000${rawPageImg}`
        : rawPageImg
      : '';

    if (resolvedPageImg) {
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (seq !== renderSeqRef.current) {
              resolve();
              return;
            }
            const nextAspect =
              img.naturalWidth > 0 ? +(img.naturalHeight / img.naturalWidth).toFixed(4) : 1.42;
            drawBlankSheet(nextAspect);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            resolve();
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = resolvedPageImg;
        });
        return;
      } catch {
        if (seq !== renderSeqRef.current) return;
      }
    }

    const fallbackAspect =
      activePageObj && activePageObj.width > 0 && activePageObj.height > 0
        ? +(activePageObj.height / activePageObj.width).toFixed(4)
        : 1.42;
    drawBlankSheet(fallbackAspect);
  }, [pdfDoc, pages, currentPage, zoomScale, viewMode]);

  useEffect(() => {
    renderPageCanvas();
  }, [renderPageCanvas]);

  // ==========================================
  // 2. COMPUTED SELECTIONS & UNDO / REDO
  // ==========================================
  const totalPagesCount = Math.max(1, pdfDoc?.numPages || pages.length || currentBook?.totalPages || 6);
  const currentPageHotspots = useMemo(
    () => hotspots.filter((h) => h.pageNumber === currentPage),
    [hotspots, currentPage],
  );
  const selectedHotspot = useMemo(
    () => hotspots.find((h) => h.id === selectedHotspotId) || null,
    [hotspots, selectedHotspotId],
  );

  const pushUndo = useCallback((snapshot: HotspotItem[]) => {
    setUndoStack((prev) => [...prev.slice(-25), JSON.parse(JSON.stringify(snapshot))]);
    setRedoStack([]);
    setHasUnsavedChanges(true);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, JSON.parse(JSON.stringify(hotspots))]);
    setUndoStack((u) => u.slice(0, -1));
    setHotspots(prev);
    setHasUnsavedChanges(true);
  }, [undoStack, hotspots]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, JSON.parse(JSON.stringify(hotspots))]);
    setRedoStack((r) => r.slice(0, -1));
    setHotspots(next);
    setHasUnsavedChanges(true);
  }, [redoStack, hotspots]);

  // ==========================================
  // 3. SAVE & CRUD ACTIONS
  // ==========================================
  const handleSaveChanges = useCallback(async () => {
    if (!selectedBookId) {
      showToast('Avval kitob yuklang yoki tanlang!', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const data = await adminFetchJson<any>(`/content/books/${selectedBookId}/hotspots`, {
        method: 'POST',
        body: JSON.stringify({ hotspots }),
      });
      setHasUnsavedChanges(false);
      if (data.warnings?.length > 0) {
        showToast(
          `Saqlandi (${data.count} ta). ${data.warnings.length} ta ogohlantirish mavjud.`,
          'warning',
        );
      } else {
        showToast(`✅ ${data.count} ta hotspot muvaffaqiyatli saqlandi!`);
      }
      loadBookAssets(selectedBookId);
    } catch (err: any) {
      showToast(`Saqlashda xatolik: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [selectedBookId, hotspots, showToast, loadBookAssets]);

  const updateHotspot = useCallback(
    (id: string, patch: Partial<HotspotItem>, recordUndo = false) => {
      if (recordUndo) pushUndo(hotspots);
      setHotspots((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
      setHasUnsavedChanges(true);
    },
    [hotspots, pushUndo],
  );

  const handleDuplicateHotspot = useCallback(
    (targetId?: string) => {
      const id = targetId || selectedHotspotId;
      const source = hotspots.find((h) => h.id === id);
      if (!source) return;
      pushUndo(hotspots);
      const copy: HotspotItem = {
        ...JSON.parse(JSON.stringify(source)),
        id: `hs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        rect: {
          ...source.rect,
          x: Math.min(0.85, source.rect.x + 0.03),
          y: Math.min(0.88, source.rect.y + 0.03),
        },
        label: `${source.label} (nusxa)`,
      };
      setHotspots((prev) => [...prev, copy]);
      setSelectedHotspotId(copy.id);
    },
    [hotspots, selectedHotspotId, pushUndo],
  );

  const handleDeleteHotspot = useCallback(
    (targetId?: string) => {
      const id = targetId || selectedHotspotId;
      if (!id) return;
      pushUndo(hotspots);
      setHotspots((prev) => prev.filter((h) => h.id !== id));
      if (selectedHotspotId === id) setSelectedHotspotId(null);
    },
    [hotspots, selectedHotspotId, pushUndo],
  );

  const createQuickHotspot = (type: HotspotType, x = 0.08, y = 0.24, w = 0.075, h = 0.055) => {
    pushUndo(hotspots);
    const defaults: Record<HotspotType, { label: string }> = {
      AUDIO: { label: 'Audio' },
      VIDEO: { label: 'Video' },
      ANSWER_LINK: { label: 'Javoblar' },
      OTHER: { label: 'Eslatma' },
    };
    const item: HotspotItem = {
      id: `hs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bookId: selectedBookId,
      pageNumber: currentPage,
      type,
      rect: { x, y, w, h },
      label: defaults[type].label,
      tooltipText: '',
      positionMode: 'AUTO',
      appearanceStyle: 'SOLID',
      size: 'MD',
      targetPageNumber: type === 'ANSWER_LINK' ? currentPage : undefined,
      exerciseLabel: undefined,
      solutionText: undefined,
      noteText: undefined,
    };
    setHotspots((prev) => [...prev, item]);
    setSelectedHotspotId(item.id);
    setActiveTool('SELECT');
    setInspectorTab('GENERAL');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveChanges();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedHotspotId) handleDeleteHotspot(selectedHotspotId);
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((p) => Math.min(totalPagesCount, p + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === '?') {
        setIsShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveChanges, handleUndo, handleRedo, handleDeleteHotspot, selectedHotspotId, totalPagesCount]);

  // ==========================================
  // 4. CANVAS MOUSE HANDLERS (DRAW / MOVE / RESIZE)
  // ==========================================
  const getRelPoint = (e: React.MouseEvent) => {
    const el = overlayLayerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPreviewMode || e.target !== e.currentTarget) return;
    const pt = getRelPoint(e);

    if (activeTool === 'SELECT') {
      setSelectedHotspotId(null);
      return;
    }
    setIsDrawing(true);
    setDrawStart(pt);
    setDrawingBox({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getRelPoint(e);

    if (isDrawing && drawStart) {
      setDrawingBox({
        x: Math.min(drawStart.x, pt.x),
        y: Math.min(drawStart.y, pt.y),
        w: Math.abs(pt.x - drawStart.x),
        h: Math.abs(pt.y - drawStart.y),
      });
      return;
    }

    if (isDragging && dragStart && selectedHotspotId) {
      const dx = pt.x - dragStart.x;
      const dy = pt.y - dragStart.y;
      const r = dragStart.initialRect;
      updateHotspot(selectedHotspotId, {
        positionMode: 'MANUAL',
        rect: {
          ...r,
          x: Math.max(0, Math.min(1 - r.w, r.x + dx)),
          y: Math.max(0, Math.min(1 - r.h, r.y + dy)),
        },
      });
      return;
    }

    if (isResizing && resizeStart && resizeHandle && selectedHotspotId) {
      const dx = pt.x - resizeStart.x;
      const dy = pt.y - resizeStart.y;
      const r = { ...resizeStart.initialRect };
      if (resizeHandle.includes('e')) r.w = Math.max(0.05, Math.min(1 - r.x, r.w + dx));
      if (resizeHandle.includes('s')) r.h = Math.max(0.05, Math.min(1 - r.y, r.h + dy));
      if (resizeHandle.includes('w')) {
        const nextX = Math.max(0, Math.min(r.x + r.w - 0.05, r.x + dx));
        r.w += r.x - nextX;
        r.x = nextX;
      }
      if (resizeHandle.includes('n')) {
        const nextY = Math.max(0, Math.min(r.y + r.h - 0.05, r.y + dy));
        r.h += r.y - nextY;
        r.y = nextY;
      }
      updateHotspot(selectedHotspotId, { positionMode: 'MANUAL', rect: r });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing && drawingBox && drawStart) {
      const toolToType: Record<EditorToolMode, HotspotType> = {
        SELECT: 'AUDIO',
        DRAW_AUDIO: 'AUDIO',
        DRAW_VIDEO: 'VIDEO',
        DRAW_ANSWER: 'ANSWER_LINK',
        DRAW_OTHER: 'OTHER',
      };
      const t = toolToType[activeTool];
      // Support both click-to-drop AND drag-to-draw cleanly (compact icon badge on click)
      if (drawingBox.w >= 0.05 && drawingBox.h >= 0.045) {
        createQuickHotspot(t, drawingBox.x, drawingBox.y, drawingBox.w, drawingBox.h);
      } else {
        const defW = 0.075;
        const defH = 0.055;
        createQuickHotspot(
          t,
          Math.max(0.02, Math.min(1 - defW, drawStart.x - defW / 2)),
          Math.max(0.02, Math.min(1 - defH, drawStart.y - defH / 2)),
          defW,
          defH,
        );
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawingBox(null);
    setIsDragging(false);
    setDragStart(null);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStart(null);
  };

  // ==========================================
  // 5. UPLOAD PDF, ADD PAGE, DIRECT MEDIA UPLOAD, DETECT & PUBLISH
  // ==========================================
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPdf(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name.replace(/\.[^/.]+$/, ''));
      const defaultGrade = currentBook?.gradeId ?? booksList[0]?.gradeId ?? activeGrades?.[0] ?? 1;
      form.append('gradeId', String(defaultGrade));
      form.append('subjectId', currentBook?.subjectId || booksList[0]?.subjectId || 'sub_eng');
      form.append('bookType', currentBook?.type || BookType.STUDENT_BOOK);

      const res = await adminFetchJson<{ book: Book; pages: VisualPage[] }>(
        '/content/books/upload-pdf',
        { method: 'POST', body: form },
      );
      setBooksList((prev) => [res.book, ...prev]);
      setSelectedBookId(res.book.id);
      setCurrentBook(res.book);
      setPages(res.pages);
      setCurrentPage(1);
      showToast(`✅ "${res.book.title}" yuklandi (${res.book.totalPages} sahifa)!`);
    } catch (err: any) {
      showToast(`PDF yuklashda xatolik: ${err.message}`, 'error');
    } finally {
      setIsUploadingPdf(false);
      e.target.value = '';
    }
  };

  const handleAddPage = async () => {
    if (!selectedBookId) {
      pdfFileInputRef.current?.click();
      return;
    }
    setIsAddingPage(true);
    try {
      const added = await adminFetchJson<VisualPage>(`/content/books/${selectedBookId}/pages`, {
        method: 'POST',
        body: JSON.stringify({ titleSnippet: `Page ${totalPagesCount + 1}` }),
      });
      setPages((prev) => [...prev, added]);
      setCurrentPage(added.pageNumber);
      showToast(`✅ ${added.pageNumber}-sahifa qo‘shildi`);
    } catch {
      showToast('Sahifa qo‘shib bo‘lmadi', 'error');
    } finally {
      setIsAddingPage(false);
    }
  };

  const handleDirectMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedHotspot) return;
    setIsUploadingMedia(true);
    try {
      const isVid = selectedHotspot.type === 'VIDEO' || file.type.startsWith('video/');
      const form = new FormData();
      form.append('file', file);
      form.append('title', file.name.replace(/\.[^/.]+$/, ''));
      form.append('type', isVid ? 'VIDEO' : 'AUDIO');
      if (selectedBookId) form.append('bookId', selectedBookId);
      form.append('unitLabel', `Page ${selectedHotspot.pageNumber}`);

      const uploaded = await adminFetchJson<MediaItem>('/content/media/upload', {
        method: 'POST',
        body: form,
      });
      setMediaList((prev) => [uploaded, ...prev]);
      updateHotspot(
        selectedHotspot.id,
        {
          targetMediaId: uploaded.id,
          targetFile: uploaded.filename,
          targetUrl: uploaded.url,
          label: selectedHotspot.label || uploaded.title,
        },
        true,
      );
      showToast(`✅ "${uploaded.filename}" yuklandi va ulandi!`);
    } catch (err: any) {
      showToast(`Media yuklash xatosi: ${err.message}`, 'error');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleAutoDetectLinks = async () => {
    if (!selectedBookId) {
      showToast('Avval backenddagi kitobni tanlang', 'warning');
      return;
    }
    try {
      const res = await adminFetchJson<any>(`/content/books/${selectedBookId}/detect-links`, {
        method: 'POST',
      });
      const detected = res?.detectedLinks || [];
      if (detected.length === 0) {
        showToast('Yangi ichki havolalar topilmadi', 'warning');
        return;
      }
      pushUndo(hotspots);
      const newOnes: HotspotItem[] = detected.map((d: any, i: number) => ({
        id: `hs_auto_${Date.now()}_${i}`,
        bookId: selectedBookId,
        pageNumber: d.pageNumber || currentPage,
        type: d.suggestedType || 'AUDIO',
        rect: d.rect || { x: 0.1, y: 0.15 + i * 0.12, w: 0.34, h: 0.1 },
        label: d.label || d.filename || 'Auto Hotspot',
        targetFile: d.targetFile || d.filename,
        tooltipText: d.suggestedType === 'VIDEO' ? 'Watch video' : 'Listen audio',
        positionMode: 'AUTO',
        appearanceStyle: 'SOLID',
        size: 'MD',
      }));
      setHotspots((prev) => [...prev, ...newOnes]);
      showToast(`✨ ${newOnes.length} ta hotspot avtomatik qo‘shildi!`);
    } catch (err: any) {
      showToast(`Aniqlashda xatolik: ${err.message}`, 'error');
    }
  };

  const handleOpenPublishCheck = async () => {
    if (!selectedBookId) return;
    setIsPublishModalOpen(true);
    try {
      const rep = await adminFetchJson<any>(`/content/books/${selectedBookId}/publish-validation`);
      setValidationReport(rep);
    } catch {}
  };

  const handleConfirmPublish = async () => {
    if (!selectedBookId) return;
    setIsPublishing(true);
    try {
      await adminFetchJson(`/content/books/${selectedBookId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ force: true }),
      });
      showToast('🚀 Kitob muvaffaqiyatli nashr qilindi (Published)!');
      setIsPublishModalOpen(false);
      loadBooks();
    } catch (err: any) {
      showToast(`Nashr qilish xatosi: ${err.message}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Sync audio preview cleanup
  useEffect(() => {
    setIsPlayingPreviewAudio(false);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
    }
  }, [selectedHotspotId]);

  const linkedMediaObj = useMemo(() => {
    if (!selectedHotspot) return null;
    return (
      mediaList.find(
        (m) =>
          m.id === selectedHotspot.targetMediaId ||
          (selectedHotspot.targetFile && m.filename === selectedHotspot.targetFile),
      ) || null
    );
  }, [selectedHotspot, mediaList]);

  const toggleInspectorAudioPreview = () => {
    const audioEl = audioPreviewRef.current;
    const rawUrl = selectedHotspot?.targetUrl || linkedMediaObj?.url;
    const url = rawUrl?.startsWith('/') ? `http://localhost:4000${rawUrl}` : rawUrl;
    if (!audioEl || !url) {
      showToast('Avval audio fayl biriktiring (Upload yoki Replace)', 'warning');
      return;
    }
    if (isPlayingPreviewAudio) {
      audioEl.pause();
      setIsPlayingPreviewAudio(false);
    } else {
      if (audioEl.src !== url) audioEl.src = url;
      audioEl.play().catch(() => {});
      setIsPlayingPreviewAudio(true);
    }
  };

  // Filtered left sidebar pages
  const visiblePages = useMemo(() => {
    const base =
      pages.length > 0
        ? pages
        : Array.from({ length: totalPagesCount }, (_, i) => ({
            id: `pg_${i + 1}`,
            bookId: selectedBookId || 'demo',
            pageNumber: i + 1,
            width: 1200,
            height: 1600,
            rotation: 0,
            audioHotspotsCount: 0,
            videoHotspotsCount: 0,
            answerHotspotsCount: 0,
            hasHotspots: false,
            titleSnippet: `Page ${i + 1}`,
          }));

    if (unitFilter === 'WITH_HOTSPOTS') {
      return base.filter((p) => hotspots.some((h) => h.pageNumber === p.pageNumber));
    }
    return base;
  }, [pages, totalPagesCount, selectedBookId, unitFilter, hotspots]);

  const activeUnitName = useMemo(() => {
    const sorted = [...tocUnits].sort((a, b) => a.pageNumber - b.pageNumber);
    const found = sorted.slice().reverse().find((u) => currentPage >= u.pageNumber);
    return found?.title || currentBook?.title || `Kitob sahifasi`;
  }, [tocUnits, currentPage, currentBook]);

  const openUnitsModal = () => {
    const sorted = [...tocUnits].sort((a, b) => a.pageNumber - b.pageNumber);
    setUnitDrafts(
      sorted.map((u) => ({
        id: u.id,
        title: u.title,
        pageNumber: String(u.pageNumber),
        endPageNumber: u.endPageNumber ? String(u.endPageNumber) : '',
      })),
    );
    setNewUnitTitle('');
    setNewUnitStartPage(String(currentPage));
    setNewUnitEndPage('');
    setIsUnitsModalOpen(true);
  };

  const handleAddUnitDraft = () => {
    const title = newUnitTitle.trim();
    const start = Math.max(1, Math.min(totalPagesCount, parseInt(newUnitStartPage, 10) || currentPage));
    const endRaw = parseInt(newUnitEndPage, 10);
    const end = !isNaN(endRaw) && endRaw >= start ? String(Math.min(totalPagesCount, endRaw)) : '';
    if (!title) {
      showToast('Unit nomini kiriting', 'warning');
      return;
    }
    setUnitDrafts((prev) =>
      [
        ...prev,
        {
          id: `toc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title,
          pageNumber: String(start),
          endPageNumber: end,
        },
      ].sort((a, b) => (parseInt(a.pageNumber, 10) || 1) - (parseInt(b.pageNumber, 10) || 1)),
    );
    setNewUnitTitle('');
    setNewUnitStartPage(String(Math.min(totalPagesCount, start + 1)));
    setNewUnitEndPage('');
  };

  const handleSaveUnits = async () => {
    if (!selectedBookId) return;
    setIsSavingUnits(true);
    try {
      const items = unitDrafts
        .filter((d) => d.title.trim().length > 0)
        .map((d, idx) => ({
          id: d.id,
          unit: `Unit ${idx + 1}`,
          title: d.title.trim(),
          pageNumber: Math.max(1, Math.min(totalPagesCount, parseInt(d.pageNumber, 10) || 1)),
          endPageNumber:
            d.endPageNumber && parseInt(d.endPageNumber, 10) >= (parseInt(d.pageNumber, 10) || 1)
              ? Math.min(totalPagesCount, parseInt(d.endPageNumber, 10))
              : undefined,
        }))
        .sort((a, b) => a.pageNumber - b.pageNumber);

      const saved = await adminFetchJson<
        Array<{ id: string; unit?: string; title: string; pageNumber: number; endPageNumber?: number }>
      >(`/content/books/${selectedBookId}/toc`, {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
      setTocUnits(Array.isArray(saved) ? saved : items);
      setIsUnitsModalOpen(false);
      showToast(`Bo‘limlar (Units) saqlandi: ${items.length} ta ✅`);
    } catch (e: any) {
      showToast(`Unitlarni saqlashda xatolik: ${e?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingUnits(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#F5F7FF] overflow-hidden select-none">
      {/* Hidden File Inputs */}
      <input
        ref={pdfFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handlePdfUpload}
        className="hidden"
      />
      <input
        ref={directMediaInputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov"
        onChange={handleDirectMediaUpload}
        className="hidden"
      />
      <audio ref={audioPreviewRef} onEnded={() => setIsPlayingPreviewAudio(false)} />

      {/* ================================================================= */}
      {/* TOP HEADER BAR (Matching Mockup 1-to-1)                           */}
      {/* ================================================================= */}
      <div className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Back arrow + Title + Subtitle + Book Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          {onBackToBooks && (
            <button
              onClick={onBackToBooks}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition shrink-0"
              title="Darsliklarga qaytish"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-extrabold text-slate-900 leading-tight shrink-0">
                Edit Hotspots
              </h2>
              {booksList.length > 0 ? (
                <select
                  aria-label="Kitobni tanlang"
                  value={selectedBookId}
                  onChange={(e) => handleSwitchBook(e.target.value)}
                  className="text-[11.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2.5 py-1 max-w-[220px] truncate cursor-pointer shrink-0 hover:bg-indigo-100/70 transition"
                >
                  {booksList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.gradeId}-sinf • {b.title}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => pdfFileInputRef.current?.click()}
                  className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-100 transition shrink-0"
                >
                  + PDF kitob yuklash
                </button>
              )}
            </div>
            <p className="text-[11.5px] font-medium text-slate-500 truncate mt-0.5">
              {currentBook ? `${currentBook.gradeId}-sinf • ` : ''}
              {activeUnitName} •{' '}
              {(() => {
                const info = pdfPageToBookDisplay(currentPage, Math.max(1, pages.length || currentBook?.totalPages || 1), activeContentStartPdfPage);
                return info.isFrontMatter
                  ? `Muqova/Kirish ${info.frontMatterIndex} (PDF ${currentPage})`
                  : `${info.bookPage}-sahifa${activeContentStartPdfPage > 1 ? ` (PDF ${currentPage})` : ''}`;
              })()}
            </p>
          </div>
        </div>

        {/* Center Segmented Tool Strip: Select | Audio | Video | Answer | Note */}
        <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-2xl p-1 gap-1 shadow-inner">
          {(
            [
              { id: 'SELECT', label: 'Select', icon: MousePointer },
              { id: 'DRAW_AUDIO', label: 'Audio', icon: Headphones },
              { id: 'DRAW_VIDEO', label: 'Video', icon: Video },
              { id: 'DRAW_ANSWER', label: 'Answer', icon: Lightbulb },
              { id: 'DRAW_OTHER', label: 'Note', icon: StickyNote },
            ] as const
          ).map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.id && !isPreviewMode;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setIsPreviewMode(false);
                  setActiveTool(tool.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Preview | Publish | Save Changes */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPreviewMode((p) => !p)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
              isPreviewMode
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreviewMode ? 'Editing Mode' : 'Preview'}</span>
          </button>

          {selectedBookId && (
            <button
              onClick={handleOpenPublishCheck}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 transition"
              title="Nashr qilish tekshiruvi"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>
          )}

          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition disabled:opacity-60 relative"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saqlanmoqda...' : 'Save Changes'}</span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-amber-300 absolute -top-0.5 -right-0.5 ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3-PANE WORKSPACE                                                  */}
      {/* ================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Book Switcher + Pages Thumbnails */}
        <div className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Dedicated Prominent Book Switcher */}
          <div className="p-3 bg-indigo-50/70 border-b border-indigo-100/90 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Tahrirlanayotgan kitob</span>
              </span>
              {booksList.length > 0 && (
                <span className="text-[10px] font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded-full border border-indigo-100">
                  {booksList.length} ta
                </span>
              )}
            </div>
            {booksList.length > 0 ? (
              <select
                aria-label="Tahrirlanayotgan kitobni tanlang"
                value={selectedBookId}
                onChange={(e) => handleSwitchBook(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-indigo-200 bg-white text-xs font-extrabold text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none cursor-pointer"
              >
                {booksList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.gradeId}-sinf • {b.title}
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => pdfFileInputRef.current?.click()}
                className="w-full py-2 px-2.5 rounded-xl border border-dashed border-indigo-300 bg-white hover:bg-indigo-50 text-xs font-bold text-indigo-700 flex items-center justify-center gap-1.5 transition"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Hali kitob yo‘q — PDF yuklash</span>
              </button>
            )}
          </div>

          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">Book Pages</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={openUnitsModal}
                  className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 transition"
                  title="Unitlar va sahifalarni sozlash"
                >
                  <List className="w-3 h-3" />
                  <span>Units ({tocUnits.length})</span>
                </button>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {totalPagesCount} p
                </span>
              </div>
            </div>
            <select
              value={unitFilter}
              onChange={(e) => {
                const v = e.target.value;
                setUnitFilter(v);
                if (v.startsWith('UNIT_')) {
                  const pg = parseInt(v.replace('UNIT_', ''), 10);
                  if (!isNaN(pg)) setCurrentPage(pg);
                }
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700"
            >
              <option value="ALL">Barcha sahifalar</option>
              <option value="WITH_HOTSPOTS">Faqat hotspotli</option>
              {tocUnits.map((u) => (
                <option key={u.id} value={`UNIT_${u.pageNumber}`}>
                  {u.title} (p.{u.pageNumber})
                </option>
              ))}
            </select>

            {selectedBookId && (
              <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-amber-900">
                    1-sahifa (PDF beti):
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, totalPagesCount)}
                      value={contentStartInput}
                      onChange={(e) => setContentStartInput(e.target.value)}
                      className="w-12 px-1.5 py-0.5 rounded-lg border border-amber-300 bg-white text-[11px] font-extrabold text-center text-slate-900"
                    />
                    <button
                      type="button"
                      disabled={isSavingBookOffset}
                      onClick={() => handleSaveBookPageOffset()}
                      className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold disabled:opacity-50"
                    >
                      {isSavingBookOffset ? '...' : 'OK'}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSavingBookOffset}
                  onClick={() => handleSaveBookPageOffset(currentPage)}
                  className="w-full py-1 rounded-lg bg-white hover:bg-amber-100/70 border border-amber-300/80 text-[10px] font-extrabold text-amber-900 transition"
                >
                  Hozirgi bet (PDF #{currentPage}) = 1-sahifa
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoadingPages ? (
              <div className="text-center py-8 text-xs text-slate-400 font-semibold">
                Yuklanmoqda...
              </div>
            ) : (
              visiblePages.map((pg) => {
                const active = pg.pageNumber === currentPage;
                const pageHsCount = hotspots.filter((h) => h.pageNumber === pg.pageNumber).length;
                const unitStart = tocUnits.find((u) => u.pageNumber === pg.pageNumber);
                return (
                  <button
                    key={pg.id}
                    onClick={() => {
                      setCurrentPage(pg.pageNumber);
                      setJumpInput(String(pg.pageNumber));
                    }}
                    className={`w-full text-left rounded-xl p-1.5 transition relative group ${
                      active
                        ? 'ring-2 ring-indigo-600 bg-indigo-50/60 shadow-sm'
                        : 'hover:bg-slate-50 border border-slate-200/80'
                    }`}
                  >
                    {unitStart && (
                      <div className="mb-1 px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-extrabold truncate">
                        {unitStart.title}
                      </div>
                    )}
                    <PdfPageThumbnail
                      pdfDoc={pdfDoc}
                      pageNumber={pg.pageNumber}
                      isSelected={active}
                    />
                    <div className="flex items-center justify-between px-1 pt-1.5">
                      <span
                        className={`text-[11px] font-extrabold ${
                          active ? 'text-indigo-700' : 'text-slate-600'
                        }`}
                      >
                        {(() => {
                          const disp = pdfPageToBookDisplay(pg.pageNumber, Math.max(1, totalPagesCount), activeContentStartPdfPage);
                          if (disp.isFrontMatter) return `Kirish ${disp.frontMatterIndex}`;
                          return activeContentStartPdfPage > 1
                            ? `${disp.bookPage}-bet (PDF ${pg.pageNumber})`
                            : `${pg.pageNumber}`;
                        })()}
                      </span>
                      {pageHsCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                          {pageHsCount} ta
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-100 space-y-1.5">
            <button
              onClick={handleAddPage}
              disabled={isAddingPage}
              className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAddingPage ? 'Qo‘shilmoqda...' : 'Add Page'}</span>
            </button>
            <button
              onClick={() => pdfFileInputRef.current?.click()}
              disabled={isUploadingPdf}
              className="w-full py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[11px] font-bold text-indigo-700 flex items-center justify-center gap-1 transition"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isUploadingPdf ? 'Yuklanmoqda...' : 'Yangi PDF yuklash'}</span>
            </button>
          </div>
        </div>

        {/* CENTER WORKSPACE: Canvas Sub-Toolbar + Interactive Page Canvas */}
        <div className="flex-1 flex flex-col bg-[#F1F5FF] overflow-hidden relative">
          {/* Sub-Toolbar */}
          <div className="mx-4 mt-3 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-1 gap-1">
                <button
                  onClick={() => {
                    setIsFitToScreen(false);
                    setZoomScale((z) => Math.max(0.3, +(z - 0.1).toFixed(2)));
                  }}
                  className="p-1 rounded-lg hover:bg-white text-slate-600"
                  title="Kichiklashtirish"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-extrabold text-slate-800 min-w-[44px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={() => {
                    setIsFitToScreen(false);
                    setZoomScale((z) => Math.min(2.0, +(z + 0.1).toFixed(2)));
                  }}
                  className="p-1 rounded-lg hover:bg-white text-slate-600"
                  title="Kattalashtirish"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                  title="Bekor qilish (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                  title="Qaytarish (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleFitToScreen}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                  isFitToScreen
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                title="Sahifani ekranga moslash"
              >
                <Maximize2
                  className={`w-3.5 h-3.5 ${isFitToScreen ? 'text-white' : 'text-slate-500'}`}
                />
                <span>Fit to Screen</span>
              </button>

              {selectedBookId && (
                <button
                  onClick={handleAutoDetectLinks}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 flex items-center gap-1"
                  title="PDF havolalarni avtomatik aniqlash"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto Detect</span>
                </button>
              )}
            </div>

            {/* Right: Show Hotspots Switch */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Show Hotspots</span>
              <button
                type="button"
                onClick={() => setShowHotspots((s) => !s)}
                className={`w-10 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                  showHotspots ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow block" />
              </button>
            </label>
          </div>

          {/* Scrollable Interactive Canvas */}
          <div ref={canvasScrollRef} className="flex-1 overflow-auto p-5 flex">
            <div className="relative m-auto shrink-0 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-visible inline-block">
              <canvas ref={pageCanvasRef} className="rounded-2xl block bg-white" />

              {isLoadingPdf && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                  <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600">
                    Kitob sahifasi yuklanmoqda...
                  </div>
                </div>
              )}

              {!isLoadingPdf &&
                !pdfDoc &&
                !(
                  pages.find((p) => p.pageNumber === currentPage)?.imageHighUrl ||
                  pages.find((p) => p.pageNumber === currentPage)?.imageNormalUrl
                ) &&
                selectedBookId && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        pdfFileInputRef.current?.click();
                      }}
                      className="pointer-events-auto px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-extrabold text-indigo-700 flex items-center gap-2 shadow-sm transition"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {pdfLoadError && pdfLoadError !== 'NO_PDF'
                          ? 'PDF yuklashda xatolik — qayta yuklash'
                          : 'Kitob PDF faylini yuklash'}
                      </span>
                    </button>
                  </div>
                )}

              {/* Hotspot Interactive Overlay Layer */}
              <div
                ref={overlayLayerRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className={`absolute inset-0 rounded-2xl ${
                  activeTool !== 'SELECT' && !isPreviewMode ? 'cursor-crosshair' : 'cursor-default'
                }`}
              >
                {showHotspots &&
                  currentPageHotspots.map((hs) => {
                    const selected = hs.id === selectedHotspotId && !isPreviewMode;
                    const isAudio = hs.type === 'AUDIO';
                    const isVideo = hs.type === 'VIDEO';
                    const isAnswer = hs.type === 'ANSWER_LINK';
                    const isSolid = hs.appearanceStyle !== 'OUTLINE';
                    const accent = isAudio
                      ? '#4F46E5'
                      : isVideo
                      ? '#2563EB'
                      : isAnswer
                      ? '#D97706'
                      : '#059669';

                    return (
                      <div
                        key={hs.id}
                        style={{
                          left: `${hs.rect.x * 100}%`,
                          top: `${hs.rect.y * 100}%`,
                          width: `${hs.rect.w * 100}%`,
                          height: `${hs.rect.h * 100}%`,
                          borderColor: selected ? '#4F46E5' : accent,
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (isPreviewMode) {
                            if (hs.type === 'AUDIO') {
                              setSelectedHotspotId(hs.id);
                              setTimeout(toggleInspectorAudioPreview, 30);
                            } else if (hs.type === 'VIDEO') {
                              setPreviewVideoModal(hs);
                            } else if (hs.type === 'ANSWER_LINK') {
                              setPreviewAnswerModal(hs);
                            } else {
                              setPreviewNoteModal(hs);
                            }
                            return;
                          }
                          setSelectedHotspotId(hs.id);
                          const pt = getRelPoint(e);
                          pushUndo(hotspots);
                          setIsDragging(true);
                          setDragStart({ x: pt.x, y: pt.y, initialRect: { ...hs.rect } });
                        }}
                        title={hs.tooltipText || hs.label || ''}
                        className={`absolute rounded-xl transition-shadow flex items-center justify-center ${
                          selected
                            ? 'border-2 border-indigo-600 bg-indigo-500/10 ring-4 ring-indigo-500/15 z-20 cursor-move'
                            : 'border border-transparent hover:border-indigo-400/70 hover:bg-indigo-500/5 z-10 cursor-pointer'
                        }`}
                      >
                        {/* Dark Floating Mini-Toolbar right above selected hotspot */}
                        {selected && (
                          <div
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-2 py-1 flex items-center gap-1 shadow-lg z-30 whitespace-nowrap"
                          >
                            <button
                              onClick={() => setInspectorTab('ADVANCED')}
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-200"
                              title="Sozlamalar"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicateHotspot(hs.id)}
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-200"
                              title="Nusxalash"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteHotspot(hs.id)}
                              className="p-1 rounded-lg hover:bg-rose-600 text-rose-300 hover:text-white"
                              title="O‘chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Clean Icon-Only Appearance Badge (no text overlay clutter) */}
                        <div
                          style={{
                            backgroundColor: isSolid ? accent : '#FFFFFF',
                            color: isSolid ? '#FFFFFF' : accent,
                            borderColor: accent,
                          }}
                          className={`rounded-full border-[1.5px] flex items-center justify-center shadow-sm transition-transform hover:scale-110 ${
                            hs.size === 'LG'
                              ? 'w-7 h-7'
                              : hs.size === 'SM'
                              ? 'w-4 h-4'
                              : 'w-5 h-5'
                          }`}
                        >
                          {isAudio ? (
                            <Headphones className={hs.size === 'LG' ? 'w-3.5 h-3.5' : hs.size === 'SM' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                          ) : isVideo ? (
                            <Play className={`${hs.size === 'LG' ? 'w-3.5 h-3.5' : hs.size === 'SM' ? 'w-2.5 h-2.5' : 'w-3 h-3'} fill-current`} />
                          ) : isAnswer ? (
                            <Lightbulb className={hs.size === 'LG' ? 'w-3.5 h-3.5' : hs.size === 'SM' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                          ) : (
                            <StickyNote className={hs.size === 'LG' ? 'w-3.5 h-3.5' : hs.size === 'SM' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                          )}
                        </div>

                        {/* 8 Resize Handles when Selected */}
                        {selected &&
                          (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandleType[]).map(
                            (dir) => {
                              const posMap: Record<ResizeHandleType, string> = {
                                nw: '-top-1.5 -left-1.5 cursor-nwse-resize',
                                n: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                                ne: '-top-1.5 -right-1.5 cursor-nesw-resize',
                                e: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize',
                                se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
                                s: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                                sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
                                w: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize',
                              };
                              return (
                                <div
                                  key={dir}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const pt = getRelPoint(e);
                                    pushUndo(hotspots);
                                    setIsResizing(true);
                                    setResizeHandle(dir);
                                    setResizeStart({
                                      x: pt.x,
                                      y: pt.y,
                                      initialRect: { ...hs.rect },
                                    });
                                  }}
                                  className={`w-3 h-3 rounded-sm bg-white border-2 border-indigo-600 shadow absolute z-30 ${posMap[dir]}`}
                                />
                              );
                            },
                          )}
                      </div>
                    );
                  })}

                {/* Active Drawing Box Preview */}
                {isDrawing && drawingBox && (
                  <div
                    style={{
                      left: `${drawingBox.x * 100}%`,
                      top: `${drawingBox.y * 100}%`,
                      width: `${drawingBox.w * 100}%`,
                      height: `${drawingBox.h * 100}%`,
                    }}
                    className="absolute border-2 border-indigo-600 bg-indigo-500/15 rounded-xl pointer-events-none"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT INSPECTOR PANEL (Matching Mockup 1-to-1)                    */}
        {/* ================================================================= */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          {selectedHotspot ? (
            <>
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {selectedHotspot.type === 'AUDIO' ? (
                      <Headphones className="w-4 h-4" />
                    ) : selectedHotspot.type === 'VIDEO' ? (
                      <Video className="w-4 h-4" />
                    ) : selectedHotspot.type === 'ANSWER_LINK' ? (
                      <Lightbulb className="w-4 h-4" />
                    ) : (
                      <StickyNote className="w-4 h-4" />
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {selectedHotspot.type === 'AUDIO'
                      ? 'Audio Hotspot'
                      : selectedHotspot.type === 'VIDEO'
                      ? 'Video Hotspot'
                      : selectedHotspot.type === 'ANSWER_LINK'
                      ? 'Answer Hotspot'
                      : 'Note Hotspot'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedHotspotId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-tabs: General | Advanced */}
              <div className="flex border-b border-slate-100 px-4">
                <button
                  onClick={() => setInspectorTab('GENERAL')}
                  className={`flex-1 py-2.5 text-xs font-extrabold border-b-2 transition ${
                    inspectorTab === 'GENERAL'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setInspectorTab('ADVANCED')}
                  className={`flex-1 py-2.5 text-xs font-extrabold border-b-2 transition ${
                    inspectorTab === 'ADVANCED'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Advanced
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {inspectorTab === 'GENERAL' ? (
                  <>
                    {/* Mini Preview Card (1-to-1 Mockup Top Card) */}
                    <div className="bg-[#F8FAFF] border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            {selectedHotspot.type === 'AUDIO' ? (
                              <Headphones className="w-5 h-5" />
                            ) : selectedHotspot.type === 'VIDEO' ? (
                              <Video className="w-5 h-5" />
                            ) : selectedHotspot.type === 'ANSWER_LINK' ? (
                              <Lightbulb className="w-5 h-5" />
                            ) : (
                              <StickyNote className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 truncate">
                              {selectedHotspot.label}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {selectedHotspot.tooltipText ||
                                `${selectedHotspot.pageNumber}-sahifa • Faqat ikonka`}
                            </p>
                          </div>
                        </div>

                        {selectedHotspot.type === 'AUDIO' ? (
                          <button
                            onClick={toggleInspectorAudioPreview}
                            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm"
                          >
                            {isPlayingPreviewAudio ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                        ) : selectedHotspot.type === 'VIDEO' ? (
                          <button
                            onClick={() => setPreviewVideoModal(selectedHotspot)}
                            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </button>
                        ) : null}
                      </div>

                      {selectedHotspot.type === 'AUDIO' && (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 flex items-center gap-0.5 h-4">
                            {[4, 8, 12, 6, 14, 9, 12, 5, 10, 14, 7, 11, 6, 9, 5].map((h, i) => (
                              <div
                                key={i}
                                style={{ height: `${h}px` }}
                                className={`flex-1 rounded-full ${
                                  i < 6 ? 'bg-indigo-500' : 'bg-indigo-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">
                            {linkedMediaObj?.durationSeconds
                              ? `${Math.floor(linkedMediaObj.durationSeconds / 60)}:${String(
                                  linkedMediaObj.durationSeconds % 60,
                                ).padStart(2, '0')}`
                              : '01:45'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Linked Audio / Video OR Answer Key / Note Config */}
                    {(selectedHotspot.type === 'AUDIO' || selectedHotspot.type === 'VIDEO') && (
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-800 block">
                          {selectedHotspot.type === 'AUDIO'
                            ? 'Linked Audio File'
                            : 'Linked Video File'}
                        </label>
                        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              {selectedHotspot.type === 'AUDIO' ? (
                                <Music className="w-4 h-4" />
                              ) : (
                                <Film className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {selectedHotspot.targetFile ||
                                  linkedMediaObj?.filename ||
                                  'Fayl biriktirilmagan'}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {linkedMediaObj
                                  ? `${(linkedMediaObj.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                                  : 'Kutubxonadan tanlang'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsMediaModalOpen(true)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-bold text-slate-700 shrink-0"
                          >
                            Replace
                          </button>
                        </div>
                        <button
                          onClick={() => directMediaInputRef.current?.click()}
                          disabled={isUploadingMedia}
                          className="w-full py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[11px] font-bold text-indigo-700 flex items-center justify-center gap-1"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>
                            {isUploadingMedia
                              ? 'Yuklanmoqda...'
                              : 'Kompyuterdan yangi fayl yuklash'}
                          </span>
                        </button>
                      </div>
                    )}

                    {selectedHotspot.type === 'ANSWER_LINK' && (
                      <div className="space-y-2.5">
                        <label className="text-xs font-extrabold text-slate-800 block">
                          Javoblar kaliti ma’lumoti
                        </label>
                        <input
                          type="text"
                          value={selectedHotspot.exerciseLabel || ''}
                          onChange={(e) =>
                            updateHotspot(selectedHotspot.id, { exerciseLabel: e.target.value })
                          }
                          placeholder="Mashq nomi (ixtiyoriy)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                        />
                        <textarea
                          rows={2}
                          value={selectedHotspot.solutionText || ''}
                          onChange={(e) =>
                            updateHotspot(selectedHotspot.id, { solutionText: e.target.value })
                          }
                          placeholder="Javoblarni shu yerga yozing..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                        />
                        <textarea
                          rows={2}
                          value={selectedHotspot.methodologyNotes || ''}
                          onChange={(e) =>
                            updateHotspot(selectedHotspot.id, { methodologyNotes: e.target.value })
                          }
                          placeholder="Metodik eslatma (ixtiyoriy)..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                        />
                      </div>
                    )}

                    {selectedHotspot.type === 'OTHER' && (
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-800 block">
                          Eslatma matni
                        </label>
                        <textarea
                          rows={3}
                          value={selectedHotspot.noteText || ''}
                          onChange={(e) =>
                            updateHotspot(selectedHotspot.id, { noteText: e.target.value })
                          }
                          placeholder="O‘qituvchi uchun muhim eslatma..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                        />
                      </div>
                    )}

                    {/* Position Radio */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Position
                      </label>
                      <div className="flex items-center gap-5">
                        {(
                          [
                            { id: 'AUTO', label: 'Auto (smart)' },
                            { id: 'MANUAL', label: 'Manual' },
                          ] as const
                        ).map((pos) => {
                          const checked = (selectedHotspot.positionMode || 'AUTO') === pos.id;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() =>
                                updateHotspot(selectedHotspot.id, { positionMode: pos.id }, true)
                              }
                              className="flex items-center gap-2 text-xs font-bold text-slate-700"
                            >
                              <span
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  checked ? 'border-indigo-600' : 'border-slate-300'
                                }`}
                              >
                                {checked && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 block" />
                                )}
                              </span>
                              <span>{pos.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Appearance Section (Style Tiles + Size Select) */}
                    <div className="space-y-3">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Appearance
                      </label>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-500">Style</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateHotspot(
                                selectedHotspot.id,
                                { appearanceStyle: 'SOLID' },
                                true,
                              )
                            }
                            className={`w-11 h-9 rounded-xl border flex items-center justify-center transition ${
                              (selectedHotspot.appearanceStyle || 'SOLID') === 'SOLID'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 bg-white text-slate-500'
                            }`}
                            title="Solid Rangli"
                          >
                            {selectedHotspot.type === 'AUDIO' ? (
                              <Headphones className="w-4 h-4" />
                            ) : selectedHotspot.type === 'VIDEO' ? (
                              <Video className="w-4 h-4" />
                            ) : selectedHotspot.type === 'ANSWER_LINK' ? (
                              <Lightbulb className="w-4 h-4" />
                            ) : (
                              <StickyNote className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              updateHotspot(
                                selectedHotspot.id,
                                { appearanceStyle: 'OUTLINE' },
                                true,
                              )
                            }
                            className={`w-11 h-9 rounded-xl border flex items-center justify-center transition ${
                              selectedHotspot.appearanceStyle === 'OUTLINE'
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 bg-white text-slate-400'
                            }`}
                            title="Oq / Ramkali"
                          >
                            {selectedHotspot.type === 'AUDIO' ? (
                              <Headphones className="w-4 h-4 opacity-70" />
                            ) : selectedHotspot.type === 'VIDEO' ? (
                              <Video className="w-4 h-4 opacity-70" />
                            ) : selectedHotspot.type === 'ANSWER_LINK' ? (
                              <Lightbulb className="w-4 h-4 opacity-70" />
                            ) : (
                              <StickyNote className="w-4 h-4 opacity-70" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-500">Size</span>
                        <select
                          value={selectedHotspot.size || 'MD'}
                          onChange={(e) =>
                            updateHotspot(
                              selectedHotspot.id,
                              { size: e.target.value as 'SM' | 'MD' | 'LG' },
                              true,
                            )
                          }
                          className="w-40 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                        >
                          <option value="SM">Small</option>
                          <option value="MD">Medium</option>
                          <option value="LG">Large</option>
                        </select>
                      </div>
                    </div>

                    {/* Tooltip Text */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Izoh (ixtiyoriy, faqat kursorda)
                      </label>
                      <input
                        type="text"
                        value={selectedHotspot.tooltipText || ''}
                        onChange={(e) =>
                          updateHotspot(selectedHotspot.id, { tooltipText: e.target.value })
                        }
                        placeholder="Ixtiyoriy izoh..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                      />
                    </div>

                    {/* Bottom Delete & Duplicate Buttons */}
                    <div className="pt-2 space-y-2">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Actions
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                          className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[11px] font-extrabold flex items-center justify-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Hotspot</span>
                        </button>
                        <button
                          onClick={() => handleDuplicateHotspot(selectedHotspot.id)}
                          className="py-2 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-extrabold flex items-center justify-center gap-1 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicate</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ADVANCED TAB */
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Hotspot nomi (Label)
                      </label>
                      <input
                        type="text"
                        value={selectedHotspot.label}
                        onChange={(e) =>
                          updateHotspot(selectedHotspot.id, { label: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Koordinatalar (%)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { key: 'x', label: 'X (%)' },
                            { key: 'y', label: 'Y (%)' },
                            { key: 'w', label: 'Width (%)' },
                            { key: 'h', label: 'Height (%)' },
                          ] as const
                        ).map((f) => (
                          <div key={f.key} className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 block">
                              {f.label}
                            </span>
                            <input
                              type="number"
                              value={Math.round(selectedHotspot.rect[f.key] * 100)}
                              onChange={(e) => {
                                const val = Math.max(2, Math.min(98, Number(e.target.value) || 0)) / 100;
                                updateHotspot(selectedHotspot.id, {
                                  positionMode: 'MANUAL',
                                  rect: { ...selectedHotspot.rect, [f.key]: val },
                                });
                              }}
                              className="w-full bg-transparent text-xs font-extrabold text-slate-900 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedHotspot.type === 'ANSWER_LINK' && teacherBooksList.length > 0 && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Teacher’s Book bog‘lash
                        </label>
                        <select
                          value={selectedHotspot.targetTeacherBookId || ''}
                          onChange={(e) =>
                            updateHotspot(selectedHotspot.id, {
                              targetTeacherBookId: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                        >
                          <option value="">Tanlang...</option>
                          {teacherBooksList.map((tb) => (
                            <option key={tb.id} value={tb.id}>
                              {tb.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty Selection State */
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#F8FAFF] border border-slate-200/80 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                    <MousePointer className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">Hotspot tanlanmagan</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Sahifadagi mavjud hotspotni bosing yoki yuqoridagi vositalardan birini tanlab
                    sahifaga chizing.
                  </p>
                </div>

                {currentBook && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                        Faol darslik
                      </span>
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {currentBook.gradeId}-sinf
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {currentBook.title}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        onClick={openUnitsModal}
                        className="py-1.5 px-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center justify-center gap-1 transition"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Units ({tocUnits.length})</span>
                      </button>
                      <button
                        onClick={() => pdfFileInputRef.current?.click()}
                        disabled={isUploadingPdf}
                        className="py-1.5 px-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 text-[11px] font-bold text-slate-700 hover:text-indigo-700 flex items-center justify-center gap-1 transition"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isUploadingPdf ? '...' : 'Yangi PDF'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Tezkor qo‘shish ({currentPage}-sahifa)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => createQuickHotspot('AUDIO')}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-xs font-bold text-slate-700 flex items-center gap-2"
                    >
                      <Headphones className="w-4 h-4 text-indigo-600" />
                      <span>+ Audio</span>
                    </button>
                    <button
                      onClick={() => createQuickHotspot('VIDEO')}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-bold text-slate-700 flex items-center gap-2"
                    >
                      <Video className="w-4 h-4 text-blue-600" />
                      <span>+ Video</span>
                    </button>
                    <button
                      onClick={() => createQuickHotspot('ANSWER_LINK')}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 text-xs font-bold text-slate-700 flex items-center gap-2"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>+ Javoblar</span>
                    </button>
                    <button
                      onClick={() => createQuickHotspot('OTHER')}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-xs font-bold text-slate-700 flex items-center gap-2"
                    >
                      <StickyNote className="w-4 h-4 text-emerald-600" />
                      <span>+ Eslatma</span>
                    </button>
                  </div>
                </div>
              </div>

              {onOpenMobilePreview && (
                <button
                  onClick={onOpenMobilePreview}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Mobil Ilovada Ko‘rish</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* BOTTOM NAVIGATION & STATUS BAR (1-to-1 Mockup Footer)             */}
      {/* ================================================================= */}
      <div className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between gap-4 shrink-0">
        {/* Left: Keyboard Shortcuts */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          className="flex items-center gap-2 text-left hover:bg-slate-50 px-2.5 py-1.5 rounded-xl transition"
        >
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <div>
            <p className="text-xs font-bold text-slate-800 leading-none">Keyboard Shortcuts</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">Press ? for help</p>
          </div>
        </button>

        {/* Center: Previous | Page X / N | Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {isJumpOpen ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(jumpInput, 10);
                if (!isNaN(n) && n >= 1 && n <= totalPagesCount) setCurrentPage(n);
                setIsJumpOpen(false);
              }}
              className="flex items-center gap-1"
            >
              <input
                type="number"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onBlur={() => setIsJumpOpen(false)}
                autoFocus
                min={1}
                max={totalPagesCount}
                className="w-16 px-2 py-1 rounded-xl border border-indigo-400 text-xs font-extrabold text-center"
              />
            </form>
          ) : (
            <button
              onClick={() => {
                setJumpInput(String(currentPage));
                setIsJumpOpen(true);
              }}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-xs font-extrabold text-slate-800"
              title="Sahifaga o'tish uchun bosing"
            >
              {(() => {
                const disp = pdfPageToBookDisplay(currentPage, Math.max(1, totalPagesCount), activeContentStartPdfPage);
                if (disp.isFrontMatter) {
                  return `Kirish ${disp.frontMatterIndex} (PDF ${currentPage} / ${totalPagesCount})`;
                }
                return activeContentStartPdfPage > 1
                  ? `${disp.bookPage} / ${disp.contentTotalPages}-bet (PDF ${currentPage})`
                  : `Page ${currentPage} / ${totalPagesCount}`;
              })()}
            </button>
          )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPagesCount, p + 1))}
            disabled={currentPage >= totalPagesCount}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: View Mode Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">View Mode:</span>
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            {(
              [
                { id: 'MOBILE', icon: Smartphone, title: 'Mobile (410px)' },
                { id: 'TABLET', icon: Tablet, title: 'Tablet (560px)' },
                { id: 'DESKTOP', icon: Monitor, title: 'Desktop (720px)' },
              ] as const
            ).map((vm) => {
              const Icon = vm.icon;
              const active = viewMode === vm.id;
              return (
                <button
                  key={vm.id}
                  onClick={() => setViewMode(vm.id)}
                  title={vm.title}
                  className={`p-1.5 rounded-lg transition ${
                    active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODALS: MEDIA PICKER, PUBLISH, SHORTCUTS, PREVIEWS & TOAST        */}
      {/* ================================================================= */}
      {isMediaModalOpen && selectedHotspot && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Media kutubxonasidan tanlash ({selectedHotspot.type})
              </h3>
              <button onClick={() => setIsMediaModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                placeholder="Fayl nomi yoki unit bo‘yicha qidirish..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {mediaList
                .filter(
                  (m) =>
                    m.type === (selectedHotspot.type === 'VIDEO' ? 'VIDEO' : 'AUDIO') &&
                    (!mediaSearch ||
                      m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                      m.filename.toLowerCase().includes(mediaSearch.toLowerCase())),
                )
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      updateHotspot(
                        selectedHotspot.id,
                        {
                          targetMediaId: m.id,
                          targetFile: m.filename,
                          targetUrl: m.url,
                          label: m.title,
                        },
                        true,
                      );
                      setIsMediaModalOpen(false);
                    }}
                    className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-indigo-50 rounded-xl text-left transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{m.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {m.filename} • {(m.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <span className="text-[11px] font-extrabold text-indigo-600">Tanlash →</span>
                  </button>
                ))}
              {mediaList.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  Hozircha media fayllar yo‘q. Quyidan yangi fayl yuklashingiz mumkin.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Kitobni Nashr Qilish</h3>
              <button onClick={() => setIsPublishModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Sahifalar soni: {totalPagesCount}</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-indigo-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Jami hotspotlar: {hotspots.length}</span>
              </div>
              {validationReport?.warnings?.length > 0 && (
                <div className="text-amber-700 bg-amber-50 p-2 rounded-lg flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{validationReport.warnings[0]}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
              >
                {isPublishing ? 'Nashr qilinmoqda...' : '🚀 Nashr Qilish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Tezkor Klaviatura Tugmalari</h3>
              <button onClick={() => setIsShortcutsOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['Ctrl / Cmd + S', 'Saqlash (Save Changes)'],
                ['Ctrl / Cmd + Z', 'Bekor qilish (Undo)'],
                ['Delete / Backspace', 'Tanlangan hotspotni o‘chirish'],
                ['← / →', 'Oldingi / Keyingi sahifa'],
                ['?', 'Ushbu oynani ochish / yopish'],
              ].map(([k, desc]) => (
                <div key={k} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <kbd className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800">{k}</kbd>
                  <span className="text-slate-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(previewVideoModal || previewAnswerModal || previewNoteModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                {(previewVideoModal || previewAnswerModal || previewNoteModal)?.label}
              </h3>
              <button
                onClick={() => {
                  setPreviewVideoModal(null);
                  setPreviewAnswerModal(null);
                  setPreviewNoteModal(null);
                }}
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {previewVideoModal && (
              <video
                src={
                  previewVideoModal.targetUrl?.startsWith('/')
                    ? `http://localhost:4000${previewVideoModal.targetUrl}`
                    : previewVideoModal.targetUrl
                }
                controls
                className="w-full rounded-xl bg-slate-950 aspect-video"
              />
            )}
            {previewAnswerModal && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5">
                <p className="font-extrabold text-slate-900">
                  {previewAnswerModal.exerciseLabel || 'Javoblar kaliti'}
                </p>
                <p className="text-slate-800 whitespace-pre-line">
                  {previewAnswerModal.solutionText || 'Javob matni kiritilmagan.'}
                </p>
              </div>
            )}
            {previewNoteModal && (
              <p className="text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                {previewNoteModal.noteText || previewNoteModal.tooltipText || 'Eslatma'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MANUAL UNITS (MUNDARIJA) MODAL                                    */}
      {/* ================================================================= */}
      {isUnitsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Bo‘limlar (Units / Mundarija) sozlash
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Har bir unit nomi va qaysi sahifadan boshlanishini kiriting. Mobil ilova shu ro‘yxatdan foydalanadi.
                </p>
              </div>
              <button
                onClick={() => setIsUnitsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Unit Row */}
            <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-indigo-800">
                  Yangi Unit qo‘shish
                </span>
                <button
                  type="button"
                  onClick={() => setNewUnitStartPage(String(currentPage))}
                  className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-md hover:bg-indigo-100"
                >
                  Joriy sahifani qo‘yish ({currentPage}-p)
                </button>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUnitDraft();
                    }
                  }}
                  placeholder="Masalan: Around the world yoki 1. Family and pets"
                  className="col-span-6 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  max={totalPagesCount}
                  value={newUnitStartPage}
                  onChange={(e) => setNewUnitStartPage(e.target.value)}
                  placeholder="Boshlanish p."
                  title="Boshlanish sahifasi"
                  className="col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  max={totalPagesCount}
                  value={newUnitEndPage}
                  onChange={(e) => setNewUnitEndPage(e.target.value)}
                  placeholder="Tugash (opt)"
                  title="Tugash sahifasi (ixtiyoriy)"
                  className="col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                />
                <button
                  type="button"
                  onClick={handleAddUnitDraft}
                  className="col-span-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Qo‘shish</span>
                </button>
              </div>
            </div>

            {/* Existing / Draft Units List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {unitDrafts.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                  Hozircha hech qanday Unit qo‘shilmagan. Yuqoridan unit nomi va boshlanish sahifasini kiriting.
                </div>
              ) : (
                unitDrafts.map((u, idx) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200/80 rounded-xl p-2"
                  >
                    <span className="col-span-1 text-center text-[11px] font-extrabold text-slate-400">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={u.title}
                      onChange={(e) =>
                        setUnitDrafts((prev) =>
                          prev.map((d) => (d.id === u.id ? { ...d, title: e.target.value } : d)),
                        )
                      }
                      className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800"
                    />
                    <input
                      type="number"
                      min={1}
                      max={totalPagesCount}
                      value={u.pageNumber}
                      onChange={(e) =>
                        setUnitDrafts((prev) =>
                          prev.map((d) =>
                            d.id === u.id ? { ...d, pageNumber: e.target.value } : d,
                          ),
                        )
                      }
                      title="Boshlanish sahifasi"
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-extrabold text-indigo-700 text-center"
                    />
                    <input
                      type="number"
                      min={1}
                      max={totalPagesCount}
                      value={u.endPageNumber}
                      onChange={(e) =>
                        setUnitDrafts((prev) =>
                          prev.map((d) =>
                            d.id === u.id ? { ...d, endPageNumber: e.target.value } : d,
                          ),
                        )
                      }
                      placeholder="—"
                      title="Tugash sahifasi"
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 text-center"
                    />
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const pg = parseInt(u.pageNumber, 10);
                          if (!isNaN(pg) && pg >= 1) {
                            setCurrentPage(pg);
                            setJumpInput(String(pg));
                            setIsUnitsModalOpen(false);
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 text-[10px] font-bold text-indigo-700"
                        title="Shu sahifaga o‘tish"
                      >
                        O‘tish
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUnitDrafts((prev) => prev.filter((d) => d.id !== u.id))
                        }
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500">
                Jami {unitDrafts.length} ta unit • avtomatik sahifa tartibida saqlanadi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUnitsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSaveUnits}
                  disabled={isSavingUnits}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-60"
                >
                  {isSavingUnits ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-xs font-extrabold text-white ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'warning'
              ? 'bg-amber-600'
              : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
