import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Book, Hotspot } from '@smartteacherbook/shared';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  PenTool,
  Pen,
  List,
  KeyRound,
  Bookmark,
  Headphones,
  RotateCcw,
  Sparkles,
  Volume2,
  Play,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Layers,
  FileQuestion,
  Search,
  X,
} from 'lucide-react';
import {
  bookPageToPdfPage,
  getBookContentTotalPages,
  pdfPageToBookDisplay,
} from '@smartteacherbook/shared';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { webApi, resolveAssetUrl } from '../../services/api/webApi';
import { notify } from '../../utils/notify';
import {
  DrawingCanvasLayer,
  DrawTool,
  DrawStrokeSize,
  WebDrawStroke,
} from './DrawingCanvasLayer';
import { MarkerStudioBar } from './MarkerStudioBar';
import { AudioPlayerModal } from './AudioPlayerModal';
import { VideoPlayerModal } from './VideoPlayerModal';
import { AnswerKeyDrawer, AnswerItem } from './AnswerKeyDrawer';
import { TocDrawer, TocEntry } from './TocDrawer';
import { BookmarksNotesDrawer, BookmarkEntry, NoteEntry } from './BookmarksNotesDrawer';
import { MediaLibraryDrawer, MediaLibraryItem } from './MediaLibraryDrawer';

interface InteractiveReaderProps {
  book: Book;
  initialPage?: number;
  onExit: () => void;
}

export const InteractiveReader: React.FC<InteractiveReaderProps> = ({
  book,
  initialPage = 1,
  onExit,
}) => {
  const { t, formatGrade, strings } = useI18n();

  const totalPages = Math.max(1, book.totalPages || 1);
  const contentStartPdfPage = book.contentStartPdfPage || 1;
  const contentTotalPages = getBookContentTotalPages(totalPages, contentStartPdfPage);

  // Reader UI State (Default 55% zoom matching desktop overview)
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoomLevel, setZoomLevel] = useState<number>(0.55);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // User Profile
  const { user } = useAuth();
  const currentUser = (user as any)?.user || user;
  const userInitial = ((currentUser?.fullName || currentUser?.email || 'S').trim().charAt(0) || 'S').toUpperCase();

  // Search in Reader State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Marker Studio State
  const [isMarkerActive, setIsMarkerActive] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<DrawTool>('PEN');
  const [activeColor, setActiveColor] = useState<string>('#4F46E5');
  const [strokeSize, setStrokeSize] = useState<DrawStrokeSize>('MD');
  const [strokesByPage, setStrokesByPage] = useState<Record<number, WebDrawStroke[]>>({});

  // Modals & Drawers
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isAnswersOpen, setIsAnswersOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);

  // Active Media Players
  const [activeAudioItem, setActiveAudioItem] = useState<{
    id: string;
    title: string;
    url: string;
    durationSeconds?: number;
  } | null>(null);

  const [activeVideoItem, setActiveVideoItem] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);

  // Remote data
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [mediaList, setMediaList] = useState<MediaLibraryItem[]>([]);
  const [answerKeys, setAnswerKeys] = useState<AnswerItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [pageAspectMap, setPageAspectMap] = useState<Record<number, number>>({});
  const [bookAspectRatio, setBookAspectRatio] = useState<number>(1.2593);

  // Virtualized page image loading (avoids firing 400+ simultaneous image requests)
  const [loadedPages, setLoadedPages] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (let p = Math.max(1, initialPage - 2); p <= initialPage + 2; p++) {
      initial.add(p);
    }
    return initial;
  });

  const [loadedThumbs, setLoadedThumbs] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (let p = Math.max(1, initialPage - 6); p <= initialPage + 6; p++) {
      initial.add(p);
    }
    return initial;
  });

  useEffect(() => {
    setLoadedPages((prev) => {
      const next = new Set(prev);
      for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
        next.add(p);
      }
      return next.size === prev.size ? prev : next;
    });

    setLoadedThumbs((prev) => {
      const next = new Set(prev);
      for (let p = Math.max(1, currentPage - 6); p <= Math.min(totalPages, currentPage + 6); p++) {
        next.add(p);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [currentPage, totalPages]);

  // Jump page input
  const [jumpInput, setJumpInput] = useState<string>('');

  // Refs for virtual/vertical scroll & thumbnails auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const thumbnailRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const thumbnailContainerRef = useRef<HTMLElement>(null);
  const progressSaveTimer = useRef<any>(null);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const el = thumbnailRefs.current.get(currentPage);
    if (el && thumbnailContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  // Load Book Data & Annotations
  useEffect(() => {
    let mounted = true;
    const fetchBookData = async () => {
      setLoadingData(true);
      try {
        const [hsRes, tocRes, bmRes, notesRes, mediaRes, answersRes, pagesRes] =
          await Promise.all([
            webApi.getBookHotspots(book.id).catch(() => []),
            webApi.getBookToc(book.id).catch(() => []),
            webApi.getBookmarks(book.id).catch(() => []),
            webApi.getNotes(book.id).catch(() => []),
            webApi.getMedia(book.id).catch(() => []),
            webApi.getAnswerKeys(book.id).catch(() => []),
            webApi.getBookPages(book.id).catch(() => []),
          ]);

        if (!mounted) return;

        // Populate aspect ratios from page dimensions (e.g. 621x782 => 1.2593)
        if (Array.isArray(pagesRes) && pagesRes.length > 0) {
          const aspectMap: Record<number, number> = {};
          let initialRatio = 0;
          for (const p of pagesRes) {
            const w = Number(p.width || 0);
            const h = Number(p.height || 0);
            if (w > 0 && h > 0) {
              const ratio = +(h / w).toFixed(4);
              aspectMap[Number(p.pageNumber)] = ratio;
              if (!initialRatio) initialRatio = ratio;
            }
          }
          setPageAspectMap(aspectMap);
          if (initialRatio > 0.4 && initialRatio < 3) {
            setBookAspectRatio(initialRatio);
          }
        }

        setHotspots(hsRes || []);
        setTocEntries(
          (tocRes || []).map((t: any, i: number) => ({
            id: t.id || `toc_${i}`,
            unit: t.unit || t.unitTitle,
            title: t.title || `Unit ${i + 1}`,
            pageNumber: Number(t.pageNumber || 1),
            subtitle: t.subtitle,
          })),
        );
        setBookmarks(
          (bmRes || []).map((b: any) => ({
            id: b.id,
            pageNumber: Number(b.pageNumber),
            title: b.title,
          })),
        );
        setNotes(
          (notesRes || []).map((n: any) => ({
            id: n.id,
            pageNumber: Number(n.pageNumber),
            text: n.text,
            createdAt: n.createdAt,
          })),
        );

        // Format media list
        const formattedMedia: MediaLibraryItem[] = (mediaRes || []).map((m: any) => ({
          id: m.id,
          type: m.type === 'VIDEO' ? 'VIDEO' : 'AUDIO',
          title: m.title || m.filename || 'Audio Track',
          subtitle: m.subtitle,
          durationSeconds: m.durationSeconds,
          pageNumber: m.pageNumber,
          url: m.url,
        }));
        setMediaList(formattedMedia);

        // Format answer keys
        const formattedAnswers: AnswerItem[] = (answersRes || []).map((a: any) => ({
          id: a.id,
          studentExerciseLabel: a.studentExerciseLabel || a.exerciseLabel || 'Maşq',
          studentPageNumber: Number(a.studentPageNumber || 1),
          solutionKey: a.solutionKey || a.solutionText,
          notes: a.notes || a.methodologyNotes,
          imageUrl: a.imageUrl,
        }));
        setAnswerKeys(formattedAnswers);

        // Fetch drawings for current book
        const drawingsRes = await webApi.getDrawings(book.id).catch(() => []);
        if (drawingsRes && Array.isArray(drawingsRes)) {
          const map: Record<number, WebDrawStroke[]> = {};
          drawingsRes.forEach((d: any) => {
            if (d.pageNumber && Array.isArray(d.strokes)) {
              map[Number(d.pageNumber)] = d.strokes;
            }
          });
          setStrokesByPage(map);
        }
      } finally {
        if (mounted) setLoadingData(false);
      }
    };

    fetchBookData();
    return () => {
      mounted = false;
    };
  }, [book.id]);

  // Scroll to initial page on mount
  useEffect(() => {
    if (initialPage > 1) {
      setTimeout(() => {
        scrollToPage(initialPage, 'smooth');
      }, 350);
    }
  }, [initialPage]);

  // Save progress with debounce
  const debouncedSaveProgress = useCallback(
    (page: number) => {
      if (progressSaveTimer.current) {
        clearTimeout(progressSaveTimer.current);
      }
      progressSaveTimer.current = setTimeout(() => {
        webApi.saveReadingProgress(book.id, page).catch(() => {});
      }, 1500);
    },
    [book.id],
  );

  // Track active page via scroll position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollMiddle = container.scrollTop + container.clientHeight / 2;

    let closestPage = currentPage;
    let minDistance = Infinity;

    pageRefs.current.forEach((el, pageNum) => {
      if (!el) return;
      const elMiddle = el.offsetTop + el.clientHeight / 2;
      const distance = Math.abs(scrollMiddle - elMiddle);
      if (distance < minDistance) {
        minDistance = distance;
        closestPage = pageNum;
      }
    });

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
      debouncedSaveProgress(closestPage);
    }
  }, [currentPage, debouncedSaveProgress]);

  // Jump to specific page
  const scrollToPage = (pageNum: number, behavior: ScrollBehavior = 'smooth') => {
    const safePage = Math.max(1, Math.min(totalPages, pageNum));
    const targetEl = pageRefs.current.get(safePage);
    if (targetEl && scrollContainerRef.current) {
      const topOffset = targetEl.offsetTop - 70; // Header height offset
      scrollContainerRef.current.scrollTo({ top: Math.max(0, topOffset), behavior });
      setCurrentPage(safePage);
      debouncedSaveProgress(safePage);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(jumpInput, 10);
    if (!isNaN(val) && val >= 1 && val <= contentTotalPages) {
      const targetPdfPage = bookPageToPdfPage(val, totalPages, contentStartPdfPage);
      scrollToPage(targetPdfPage, 'smooth');
      setJumpInput('');
    } else {
      notify.warning(`Iltimos, 1 dan ${contentTotalPages} gaça bet raqamini kiriting.`);
    }
  };

  // Fullscreen toggle & auto-sync
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Safe exit ensuring browser fullscreen is cleanly released when exiting the reader
  const handleExit = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit();
  }, [onExit]);

  // Clean up fullscreen on unmount as well
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Listen to fullscreen changes to keep state in sync with browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Zoom change with scroll anchoring so the active page stays locked in view
  const zoomAnchorRef = useRef<{ pageNum: number; offsetFromTop: number } | null>(null);

  const changeZoom = useCallback(
    (delta: number) => {
      const container = scrollContainerRef.current;
      const currentEl = pageRefs.current.get(currentPage);
      if (container && currentEl) {
        const containerRect = container.getBoundingClientRect();
        const elRect = currentEl.getBoundingClientRect();
        zoomAnchorRef.current = {
          pageNum: currentPage,
          offsetFromTop: elRect.top - containerRect.top,
        };
      }
      setZoomLevel((prev) => {
        const next = Math.max(0.5, Math.min(2.5, Number((prev + delta).toFixed(2))));
        return next;
      });
    },
    [currentPage],
  );

  const resetZoom = useCallback(() => {
    const container = scrollContainerRef.current;
    const currentEl = pageRefs.current.get(currentPage);
    if (container && currentEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = currentEl.getBoundingClientRect();
      zoomAnchorRef.current = {
        pageNum: currentPage,
        offsetFromTop: elRect.top - containerRect.top,
      };
    }
    setZoomLevel(1.0);
  }, [currentPage]);

  // Restore scroll anchor right after zoom state update applies to DOM
  useEffect(() => {
    if (!zoomAnchorRef.current || !scrollContainerRef.current) return;
    const { pageNum, offsetFromTop } = zoomAnchorRef.current;
    const targetEl = pageRefs.current.get(pageNum);
    const container = scrollContainerRef.current;
    if (targetEl && container) {
      const newScrollTop = targetEl.offsetTop - offsetFromTop;
      container.scrollTop = Math.max(0, newScrollTop);
    }
    zoomAnchorRef.current = null;
  }, [zoomLevel]);

  // Keyboard Shortcuts (M for marker, Esc for drawers, Arrows for scrolling, Ctrl/Cmd + - for zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing inside input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isZoomIn =
        e.key === '+' ||
        e.key === '=' ||
        e.code === 'NumpadAdd' ||
        e.code === 'Equal';
      const isZoomOut =
        e.key === '-' ||
        e.key === '_' ||
        e.code === 'NumpadSubtract' ||
        e.code === 'Minus';
      const isZoomReset =
        e.key === '0' ||
        e.code === 'Digit0' ||
        e.code === 'Numpad0';

      if (e.key === 'Escape') {
        if (isTocOpen) setIsTocOpen(false);
        else if (isAnswersOpen) setIsAnswersOpen(false);
        else if (isBookmarksOpen) setIsBookmarksOpen(false);
        else if (isMediaOpen) setIsMediaOpen(false);
        else if (isMarkerActive) setIsMarkerActive(false);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMarkerActive((prev) => !prev);
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToPage(currentPage + 1, 'smooth');
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToPage(currentPage - 1, 'smooth');
      } else if (isCtrlOrCmd && isZoomIn) {
        e.preventDefault();
        changeZoom(0.15);
      } else if (isCtrlOrCmd && isZoomOut) {
        e.preventDefault();
        changeZoom(-0.15);
      } else if (isCtrlOrCmd && isZoomReset) {
        e.preventDefault();
        resetZoom();
      } else if (!isCtrlOrCmd && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        changeZoom(0.15);
      } else if (!isCtrlOrCmd && e.key === '-') {
        e.preventDefault();
        changeZoom(-0.15);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTocOpen,
    isAnswersOpen,
    isBookmarksOpen,
    isMediaOpen,
    isMarkerActive,
    currentPage,
    changeZoom,
    resetZoom,
  ]);

  // Annotation Actions (Bookmarks & Notes)
  const handleToggleBookmark = async (pageNum: number) => {
    const exists = bookmarks.some((b) => b.pageNumber === pageNum);
    if (exists) {
      setBookmarks((prev) => prev.filter((b) => b.pageNumber !== pageNum));
      await webApi.deleteBookmark(book.id, pageNum).catch(() => {});
      notify.info(`${pageNum}-sahifa xatçöplardan olindi.`);
    } else {
      setBookmarks((prev) => [...prev, { pageNumber: pageNum }]);
      await webApi.addBookmark(book.id, pageNum).catch(() => {});
      notify.success(`${pageNum}-sahifa xatçöp qilib saqlandi.`);
    }
  };

  const handleAddNote = async (pageNum: number, text: string) => {
    const tempId = `note_${Date.now()}`;
    const newNote: NoteEntry = {
      id: tempId,
      pageNumber: pageNum,
      text,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    try {
      const res = await webApi.addNote(book.id, pageNum, text);
      if (res && res.id) {
        setNotes((prev) =>
          prev.map((n) => (n.id === tempId ? { ...n, id: res.id } : n)),
        );
      }
      notify.success("Izoh saqlandi!");
    } catch {
      notify.error("Izohni serverda saqlaşda xatolik yuz berdi");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await webApi.deleteNote(book.id, noteId).catch(() => {});
    notify.info("Izoh öçirildi.");
  };

  // Drawing Actions
  const handleSaveStrokes = (pageNum: number, newStrokes: WebDrawStroke[]) => {
    setStrokesByPage((prev) => ({
      ...prev,
      [pageNum]: newStrokes,
    }));
    webApi.saveDrawings(book.id, pageNum, newStrokes).catch(() => {});
  };

  const handleUndoDrawing = () => {
    const cur = strokesByPage[currentPage] || [];
    if (cur.length === 0) return;
    const updated = cur.slice(0, -1);
    handleSaveStrokes(currentPage, updated);
  };

  const handleClearDrawing = () => {
    if ((strokesByPage[currentPage] || []).length === 0) return;
    handleSaveStrokes(currentPage, []);
    notify.info(`${currentPage}-sahifadagi barça çizmalar tozalandi.`);
  };

  // Hotspot click handler
  const handleHotspotClick = (h: Hotspot, pageNum: number) => {
    if (h.type === 'AUDIO') {
      const url =
        resolveAssetUrl(h.targetUrl) ||
        (h.targetMediaId ? resolveAssetUrl(`/content/media/${h.targetMediaId}/file`) : '');
      setActiveAudioItem({
        id: h.id,
        title: (h as any).label || (h as any).tooltipText || `Audio Maşq • ${pageNum}-sahifa`,
        url: url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        durationSeconds: 120,
      });
    } else if (h.type === 'VIDEO') {
      const url =
        resolveAssetUrl(h.targetUrl) ||
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      setActiveVideoItem({
        id: h.id,
        title: (h as any).label || (h as any).tooltipText || `Video Darslik • ${pageNum}-sahifa`,
        url,
      });
    } else if (h.type === 'ANSWER_LINK') {
      setIsAnswersOpen(true);
    }
  };

  // Current page display info
  const pageDisplayInfo = useMemo(() => {
    return pdfPageToBookDisplay(currentPage, totalPages, contentStartPdfPage);
  }, [currentPage, totalPages, contentStartPdfPage]);

  // Page width based on zoom level (base 820px)
  const basePageWidth = 820;
  const computedPageWidth = Math.round(basePageWidth * zoomLevel);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0F172A] text-slate-100 select-none overflow-hidden">
      {/* =========================================================================
          Top SmartBoard Navigation Bar (Matching Design)
      ========================================================================= */}
      <header className="h-14 sm:h-16 shrink-0 bg-[#0B101D] border-b border-slate-800/90 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shadow-lg z-30">
        {/* Left: Exit & Book Details */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 transition-colors text-xs font-semibold shadow-sm shrink-0"
            title="Çiqiş"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Chiqish</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                {book.title}
              </h1>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                {formatGrade(book.gradeId)}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden sm:block">
              {book.type === 'TEACHER_BOOK'
                ? "O'qituvchi kitobi (Teacher's Book)"
                : book.type === 'WORKBOOK'
                ? 'Iş daftari (Workbook)'
                : "Öquvçi darsligi (Student's Book)"}
            </p>
          </div>
        </div>

        {/* Center: Smart Page Indicator & Quick Jump */}
        <div className="flex items-center gap-2">
          {/* Page Indicator Pill */}
          <div className="flex items-center gap-1.5 bg-[#060A14] border border-slate-750 px-3 py-1.5 rounded-xl shadow-inner text-xs font-bold text-indigo-400">
            <span>
              {pageDisplayInfo.isFrontMatter
                ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplayInfo.frontMatterIndex}`
                : `${pageDisplayInfo.bookPage} / ${contentTotalPages} bet`}
            </span>
            <span className="text-[10px] text-slate-500 font-normal hidden md:inline">
              (PDF {currentPage}/{totalPages})
            </span>
          </div>

          {/* Quick Page Jump Form */}
          <form onSubmit={handleJumpSubmit} className="hidden sm:flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={contentTotalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="Bet..."
              className="w-16 h-8 text-center bg-[#060A14] border border-slate-750 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-sm"
            >
              O'tish
            </button>
          </form>
        </div>

        {/* Right: SmartBoard Tools & Drawers */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              isSearchOpen
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="Qidiriş"
          >
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => changeZoom(-0.05)}
            disabled={zoomLevel <= 0.45}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
            title="Kiçraytiriş (Ctrl / Cmd + -)"
          >
            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Zoom Select Dropdown */}
          <div className="relative">
            <select
              value={Math.round(zoomLevel * 100)}
              onChange={(e) => setZoomLevel(Number(e.target.value) / 100)}
              className="appearance-none bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold pl-2.5 pr-6 py-1.5 rounded-xl border border-slate-700/80 focus:outline-none cursor-pointer"
              title="Masshtab (Zoom)"
            >
              <option value={45}>45%</option>
              <option value={50}>50%</option>
              <option value={55}>55%</option>
              <option value={65}>65%</option>
              <option value={75}>75%</option>
              <option value={85}>85%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Zoom In */}
          <button
            onClick={() => changeZoom(0.05)}
            disabled={zoomLevel >= 2.45}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
            title="Kattalaştiriş (Ctrl / Cmd + +)"
          >
            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Marker Studio Toggle */}
          <button
            onClick={() => setIsMarkerActive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isMarkerActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
            title="Marker Studio (M)"
          >
            <PenTool className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden xl:inline">Marker Studio</span>
          </button>

          {/* TOC Drawer Toggle */}
          <button
            onClick={() => setIsTocOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              isTocOpen
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="Mundarija (TOC)"
          >
            <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Quick Drawing Pen */}
          <button
            onClick={() => setIsMarkerActive((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              isMarkerActive
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 text-emerald-400'
            }`}
            title="Çiziş qalami"
          >
            <Pen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Bookmarks & Notes Toggle */}
          <button
            onClick={() => setIsBookmarksOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors relative ${
              isBookmarksOpen
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="Xatçöplar va izohlar"
          >
            <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* Media Library Drawer Toggle */}
          <button
            onClick={() => setIsMediaOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors relative ${
              isMediaOpen
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800/80 hover:bg-slate-700 text-purple-400'
            }`}
            title="Media kutubxona"
          >
            <Headphones className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {mediaList.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-purple-500 text-[9px] font-bold text-white flex items-center justify-center">
                {mediaList.length}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <div
            className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center ring-2 ring-indigo-400/30 shrink-0 select-none"
            title={currentUser?.fullName || currentUser?.email || "Öqituvçi"}
          >
            {userInitial}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors hidden sm:block"
            title={isFullscreen ? 'Oynani kiçraytiriş' : 'Butun ekran (Fullscreen)'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Quick Search Overlay Dropdown */}
      {isSearchOpen && (
        <div className="bg-[#0B101D] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 z-30">
          <div className="flex-1 max-w-md flex items-center gap-2 bg-[#060A14] border border-slate-700 px-3 py-1.5 rounded-xl">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                const num = parseInt(val, 10);
                if (!isNaN(num) && num >= 1 && num <= contentTotalPages) {
                  scrollToPage(num, 'smooth');
                }
              }}
              placeholder="Sahifa raqamini kiriting (masalan: 3)..."
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg"
          >
            Yopish
          </button>
        </div>
      )}

      {/* =========================================================================
          Workspace: Left Thumbnails Sidebar + Center Document Canvas
      ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* =========================================================================
            Left Vertical Page Thumbnails Sidebar (Matching Screenshot)
        ========================================================================= */}
        <aside
          ref={thumbnailContainerRef}
          className="w-20 sm:w-24 shrink-0 bg-[#0B0F19] border-r border-slate-800/80 overflow-y-auto overflow-x-hidden py-3 px-2 flex flex-col items-center gap-3.5 select-none z-20"
          style={{ scrollbarWidth: 'thin' }}
        >
          {Array.from({ length: totalPages }, (_, i) => {
            const pageNum = i + 1;
            const isActive = pageNum === currentPage;
            const pageDisplay = pdfPageToBookDisplay(
              pageNum,
              totalPages,
              contentStartPdfPage,
            );
            const pageImageUrl = `${resolveAssetUrl(`/content/books/${book.id}/pages/${pageNum}/image`)}`;
            const pageNumberLabel = pageDisplay.isFrontMatter
              ? pageDisplay.frontMatterIndex
              : pageDisplay.bookPage;
            const shouldRenderThumb = loadedThumbs.has(pageNum) || Math.abs(pageNum - currentPage) <= 6;

            return (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) thumbnailRefs.current.set(pageNum, el);
                  else thumbnailRefs.current.delete(pageNum);
                }}
                onClick={() => scrollToPage(pageNum, 'smooth')}
                className="flex flex-col items-center cursor-pointer group w-full"
                title={`${pageDisplay.isFrontMatter ? 'Kiriş ' + pageDisplay.frontMatterIndex : pageDisplay.bookPage + '-bet'}`}
              >
                {/* Thumbnail Preview Box */}
                <div
                  className={`w-16 h-20 sm:h-22 rounded-lg overflow-hidden bg-white relative transition-all duration-150 flex items-center justify-center ${
                    isActive
                      ? 'border-2 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/30 scale-105'
                      : 'border border-slate-700/60 opacity-60 group-hover:opacity-100 group-hover:border-slate-500'
                  }`}
                >
                  {shouldRenderThumb ? (
                    <img
                      src={pageImageUrl}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-fill block pointer-events-none"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.thumb-fallback');
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`thumb-fallback absolute inset-0 ${
                      shouldRenderThumb ? 'hidden' : 'flex'
                    } flex-col items-center justify-center p-1 bg-slate-800 text-slate-300 text-center`}
                  >
                    <span className="text-[10px] font-bold">{pageNumberLabel}</span>
                  </div>
                </div>

                {/* Page Number Underneath Thumbnail */}
                <span
                  className={`text-[11px] font-bold text-center mt-1 transition-colors ${
                    isActive
                      ? 'text-indigo-400 font-extrabold'
                      : 'text-slate-400 group-hover:text-white'
                  }`}
                >
                  {pageNumberLabel}
                </span>
              </div>
            );
          })}
        </aside>

        {/* Main Document Canvas */}
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0A0F1D] py-8 px-4 flex flex-col items-center gap-8 relative select-none scroll-smooth"
        >
        {Array.from({ length: totalPages }, (_, i) => {
          const pageNum = i + 1;
          const pageHs = hotspots.filter((h: any) => Number(h.pageNumber) === pageNum);
          const pageDisplay = pdfPageToBookDisplay(
            pageNum,
            totalPages,
            contentStartPdfPage,
          );
          const pageImageUrl = `${resolveAssetUrl(`/content/books/${book.id}/pages/${pageNum}/image`)}`;

          const pageAspect = pageAspectMap[pageNum] || bookAspectRatio || 1.2593;
          const computedPageHeight = Math.round(computedPageWidth * pageAspect);
          const shouldRenderImg = loadedPages.has(pageNum) || Math.abs(pageNum - currentPage) <= 2;

          return (
            <div
              key={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
              style={{
                width: `${computedPageWidth}px`,
                height: `${computedPageHeight}px`,
                minHeight: `${computedPageHeight}px`,
                maxHeight: `${computedPageHeight}px`,
              }}
              className="relative shrink-0 rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-800/80 transition-[width,height] duration-150"
            >
              {/* Page Header Ribbon */}
              <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
                <span className="rounded-full bg-slate-900/85 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-md border border-slate-700">
                  {pageDisplay.isFrontMatter
                    ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplay.frontMatterIndex}`
                    : `${pageDisplay.bookPage}-bet`}
                </span>
                {bookmarks.some((b) => b.pageNumber === pageNum) && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-md">
                    <Bookmark className="h-3.5 w-3.5 fill-current" />
                  </span>
                )}
              </div>

              {/* Rendered Book Page Image */}
              {shouldRenderImg ? (
                <img
                  src={pageImageUrl}
                  alt={`Kitob ${book.title} ${pageNum}-sahifa`}
                  loading="eager"
                  className="w-full h-full object-fill block pointer-events-none select-none"
                  onLoad={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'block';
                    if (target.naturalWidth > 0 && target.naturalHeight > 0) {
                      const measuredRatio = +(target.naturalHeight / target.naturalWidth).toFixed(4);
                      setPageAspectMap((prev) => {
                        if (prev[pageNum] && Math.abs(prev[pageNum] - measuredRatio) < 0.005) return prev;
                        return { ...prev, [pageNum]: measuredRatio };
                      });
                    }
                    const fallbackDiv = target.parentElement?.querySelector('.page-fallback');
                    if (fallbackDiv) {
                      (fallbackDiv as HTMLElement).style.display = 'none';
                    }
                  }}
                  onError={(e) => {
                    // Fallback to textbook page mock if rendered PNG is not yet generated
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallbackDiv = target.parentElement?.querySelector('.page-fallback');
                    if (fallbackDiv) {
                      (fallbackDiv as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/40 text-slate-400 select-none">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin mb-3" />
                  <span className="text-xs font-bold text-slate-300">
                    {pageDisplay.isFrontMatter
                      ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplay.frontMatterIndex}`
                      : `${pageDisplay.bookPage}-sahifa`}
                  </span>
                </div>
              )}

              {/* Fallback Page Card */}
              <div
                className="page-fallback absolute inset-0 hidden flex-col items-center justify-between p-12 text-slate-800 bg-gradient-to-b from-amber-50/20 via-white to-slate-50"
              >
                <div className="w-full flex justify-between items-center border-b pb-4 border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {book.title}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {formatGrade(book.gradeId)}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md py-12">
                  <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {pageDisplay.isFrontMatter
                      ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplay.frontMatterIndex}`
                      : `${pageDisplay.bookPage}-bet dars mavzusi`}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    Interaktiv darslik kontenti. Sahifadagi multimedia belgilarini bosib, audio eshitishingiz yoki video darslarni tomosha qilishingiz mumkin.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleBookmark(pageNum)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>Xatcho'p</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage(pageNum);
                        setIsAnswersOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Javoblar</span>
                    </button>
                  </div>
                </div>

                <div className="w-full flex justify-between items-center border-t pt-4 border-slate-200 text-xs text-slate-400">
                  <span>ilmçi • Raqamli ta‘lim platformasi</span>
                  <span className="font-bold">
                    {pageDisplay.isFrontMatter
                      ? `Kiriş ${pageDisplay.frontMatterIndex}`
                      : `${pageDisplay.bookPage}`}
                  </span>
                </div>
              </div>

              {/* =================================================================
                  Overlaid Interactive Hotspots (Audio, Video, Answers)
              ================================================================= */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {pageHs.map((hs: any) => {
                  const isAudio = hs.type === 'AUDIO';
                  const isVideo = hs.type === 'VIDEO';
                  const isAnswer = hs.type === 'ANSWER_LINK';

                  // Center coordinates strictly matching Admin Visual Hotspot Editor midpoint
                  const centerX = ((hs.rect?.x || 0) + (hs.rect?.w || 0) / 2) * 100;
                  const centerY = ((hs.rect?.y || 0) + (hs.rect?.h || 0) / 2) * 100;

                  return (
                    <button
                      key={hs.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHotspotClick(hs, pageNum);
                      }}
                      style={{
                        left: `${centerX}%`,
                        top: `${centerY}%`,
                      }}
                      className={`absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full shadow-xl transition-all transform hover:scale-125 focus:outline-none ${
                        isAudio
                          ? 'h-9 w-9 bg-purple-600 hover:bg-purple-700 text-white ring-4 ring-purple-400/30 animate-pulse'
                          : isVideo
                          ? 'h-9 w-9 bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/30'
                          : 'h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-400/30'
                      }`}
                      title={hs.label || hs.tooltipText || (isAudio ? 'Audioni tinglaş' : isVideo ? 'Videoni köriş' : 'Javoblarni köriş')}
                    >
                      {isAudio ? (
                        <Volume2 className="h-4.5 w-4.5 fill-current" />
                      ) : isVideo ? (
                        <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                      ) : (
                        <KeyRound className="h-4.5 w-4.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* =================================================================
                  Overlaid HTML5 Drawing Canvas Layer
              ================================================================= */}
              <DrawingCanvasLayer
                activeTool={isMarkerActive ? activeTool : null}
                activeColor={activeColor}
                strokeSize={strokeSize}
                width={computedPageWidth}
                height={computedPageHeight}
                initialStrokes={strokesByPage[pageNum] || []}
                onStrokesChange={(strokes) => handleSaveStrokes(pageNum, strokes)}
              />
            </div>
          );
        })}
        </main>
      </div>

      {/* =========================================================================
          Floating Marker Studio Bar (SmartBoard Toolbar)
      ========================================================================= */}
      {isMarkerActive && (
        <MarkerStudioBar
          activeTool={activeTool}
          activeColor={activeColor}
          strokeSize={strokeSize}
          onSelectTool={(tool) => setActiveTool(tool)}
          onSelectColor={(color) => setActiveColor(color)}
          onSelectSize={(size) => setStrokeSize(size)}
          onUndo={handleUndoDrawing}
          onClear={handleClearDrawing}
          onClose={() => setIsMarkerActive(false)}
        />
      )}

      {/* =========================================================================
          Drawers & Modals
      ========================================================================= */}
      {/* Table of Contents Drawer */}
      <TocDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        totalPages={totalPages}
        currentPage={currentPage}
        contentStartPdfPage={contentStartPdfPage}
        onSelectPage={(page) => scrollToPage(page, 'smooth')}
        tocItems={tocEntries}
      />

      {/* Answer Key Drawer */}
      <AnswerKeyDrawer
        isOpen={isAnswersOpen}
        onClose={() => setIsAnswersOpen(false)}
        currentPage={currentPage}
        bookTitle={book.title}
        answers={answerKeys}
      />

      {/* Bookmarks & Notes Drawer */}
      <BookmarksNotesDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        currentPage={currentPage}
        totalPages={totalPages}
        contentStartPdfPage={contentStartPdfPage}
        bookmarks={bookmarks}
        notes={notes}
        onSelectPage={(page) => scrollToPage(page, 'smooth')}
        onToggleBookmark={handleToggleBookmark}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />

      {/* Media Library Drawer */}
      <MediaLibraryDrawer
        isOpen={isMediaOpen}
        onClose={() => setIsMediaOpen(false)}
        mediaItems={mediaList}
        totalPages={totalPages}
        contentStartPdfPage={contentStartPdfPage}
        onPlayMedia={(item) => {
          if (item.type === 'AUDIO') {
            setActiveAudioItem({
              id: item.id,
              title: item.title,
              url: item.url || '',
              durationSeconds: item.durationSeconds || undefined,
            });
          } else {
            setActiveVideoItem({
              id: item.id,
              title: item.title,
              url: item.url || '',
            });
          }
        }}
        onSelectPage={(page) => scrollToPage(page, 'smooth')}
      />

      {/* Audio Player Modal */}
      {activeAudioItem && (
        <AudioPlayerModal
          isOpen={true}
          onClose={() => setActiveAudioItem(null)}
          title={activeAudioItem.title}
          audioUrl={activeAudioItem.url}
        />
      )}

      {/* Video Player Modal */}
      {activeVideoItem && (
        <VideoPlayerModal
          isOpen={true}
          onClose={() => setActiveVideoItem(null)}
          title={activeVideoItem.title}
          videoUrl={activeVideoItem.url}
        />
      )}
    </div>
  );
};
