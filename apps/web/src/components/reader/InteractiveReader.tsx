import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Menu,
  Lightbulb,
  StickyNote,
  Sun,
  Moon,
} from 'lucide-react';
import {
  bookPageToPdfPage,
  getBookContentTotalPages,
  pdfPageToBookDisplay,
} from '@smartteacherbook/shared';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
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
import { FloatingImagePopup } from './FloatingImagePopup';

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
  const { isDark, toggleTheme } = useTheme();

  const totalPages = Math.max(1, book.totalPages || 1);
  const contentStartPdfPage = book.contentStartPdfPage || 1;
  const contentTotalPages = getBookContentTotalPages(totalPages, contentStartPdfPage);

  // Reader UI State (Default 55% zoom matching desktop overview)
  const ZOOM_PRESETS = [0.45, 0.55, 0.65, 0.75, 0.85, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 2.5;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoomLevel, setZoomLevel] = useState<number>(0.55);
  const isZoomingRef = useRef(false);
  const zoomAnchorRef = useRef<{ pageNum: number; relativeTop: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Responsive Viewport Tracking (Mobile & Tablet Optimization)
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1200;
  });

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;

  // Thumbnails panel visibility (auto hidden on mobile for maximum book reading area)
  const [showThumbnails, setShowThumbnails] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Mobile direct page jump modal
  const [isMobileJumpOpen, setIsMobileJumpOpen] = useState<boolean>(false);

  // Reader Comprehensive Slide-over Tools Menu (Single clean menu for all tools)
  const [isReaderMenuOpen, setIsReaderMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setViewportWidth(w);
      if (w < 1024) {
        setShowThumbnails(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch Swipe for Mobile & Tablet (when Marker Studio is inactive)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMarkerActive) return;
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isMarkerActive || !touchStartRef.current) return;
    const touchEnd = e.changedTouches[0];
    const deltaX = touchEnd.clientX - touchStartRef.current.x;
    const deltaY = touchEnd.clientY - touchStartRef.current.y;

    // Minimum swipe threshold: 50px horizontal, less than 65px vertical drift
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 65) {
      if (deltaX < 0) {
        // Swiped left -> Next page
        if (currentPage < totalPages) {
          scrollToPage(currentPage + 1, 'smooth');
        }
      } else {
        // Swiped right -> Previous page
        if (currentPage > 1) {
          scrollToPage(currentPage - 1, 'smooth');
        }
      }
    }
    touchStartRef.current = null;
  };

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
  const [selectedAnswerHotspotId, setSelectedAnswerHotspotId] = useState<string | null>(null);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);

  // Floating Draggable & Resizable Image Popups (No Fullscreen Overlay!)
  const [floatingAnswerImage, setFloatingAnswerImage] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
  } | null>(null);

  const [floatingTranscriptImage, setFloatingTranscriptImage] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    imageUrl?: string | null;
  } | null>(null);

  // Active Media Players
  const [activeAudioItem, setActiveAudioItem] = useState<{
    id: string;
    title: string;
    url: string;
    durationSeconds?: number;
    transcriptImageUrl?: string;
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
          answerImages: a.answerImages || (a.imageUrl ? [a.imageUrl] : []),
          transcriptText: a.transcriptText,
          transcriptImages: a.transcriptImages,
          targetMediaId: a.targetMediaId,
          targetTeacherBookId: a.targetTeacherBookId,
          targetTeacherPageNumber: a.targetTeacherPageNumber,
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
    if (isZoomingRef.current) return;
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

  // Anchored Zoom Engine (Pages stay rock-solid in place without jumping)
  const applyZoom = useCallback(
    (newZoomOrUpdater: number | ((prev: number) => number)) => {
      const container = scrollContainerRef.current;
      const targetPage = currentPage;
      const el = pageRefs.current.get(targetPage);

      if (container && el) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        zoomAnchorRef.current = {
          pageNum: targetPage,
          relativeTop: elRect.top - containerRect.top,
        };
      }

      isZoomingRef.current = true;

      setZoomLevel((prev) => {
        const target =
          typeof newZoomOrUpdater === 'function'
            ? newZoomOrUpdater(prev)
            : newZoomOrUpdater;
        const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(target.toFixed(2))));
        return clamped;
      });
    },
    [currentPage],
  );

  const zoomIn = useCallback(() => {
    applyZoom((prev) => {
      const next = ZOOM_PRESETS.find((p) => p > prev + 0.01);
      return next !== undefined ? next : Math.min(MAX_ZOOM, Number((prev + 0.1).toFixed(2)));
    });
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    applyZoom((prev) => {
      const prevPresets = ZOOM_PRESETS.filter((p) => p < prev - 0.01);
      const prevPreset = prevPresets.length > 0 ? prevPresets[prevPresets.length - 1] : undefined;
      return prevPreset !== undefined ? prevPreset : Math.max(MIN_ZOOM, Number((prev - 0.1).toFixed(2)));
    });
  }, [applyZoom]);

  const resetZoom = useCallback(() => {
    applyZoom(1.0);
  }, [applyZoom]);

  // Synchronously lock scroll position to anchor page before browser paints
  useLayoutEffect(() => {
    if (!zoomAnchorRef.current || !scrollContainerRef.current) return;
    const { pageNum, relativeTop } = zoomAnchorRef.current;
    const targetEl = pageRefs.current.get(pageNum);
    const container = scrollContainerRef.current;

    if (targetEl && container) {
      const targetScrollTop = targetEl.offsetTop - relativeTop;
      container.scrollTop = Math.max(0, targetScrollTop);
    }

    zoomAnchorRef.current = null;

    requestAnimationFrame(() => {
      isZoomingRef.current = false;
    });
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
        if (isReaderMenuOpen) setIsReaderMenuOpen(false);
        else if (isMobileJumpOpen) setIsMobileJumpOpen(false);
        else if (floatingAnswerImage?.isOpen) setFloatingAnswerImage(null);
        else if (floatingTranscriptImage?.isOpen) setFloatingTranscriptImage(null);
        else if (isTocOpen) setIsTocOpen(false);
        else if (isAnswersOpen) setIsAnswersOpen(false);
        else if (isBookmarksOpen) setIsBookmarksOpen(false);
        else if (isMediaOpen) setIsMediaOpen(false);
        else if (isMarkerActive) setIsMarkerActive(false);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMarkerActive((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToPage(currentPage + 1, 'smooth');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToPage(currentPage - 1, 'smooth');
      } else if (isCtrlOrCmd && isZoomIn) {
        e.preventDefault();
        zoomIn();
      } else if (isCtrlOrCmd && isZoomOut) {
        e.preventDefault();
        zoomOut();
      } else if (isCtrlOrCmd && isZoomReset) {
        e.preventDefault();
        resetZoom();
      } else if (!isCtrlOrCmd && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        zoomIn();
      } else if (!isCtrlOrCmd && e.key === '-') {
        e.preventDefault();
        zoomOut();
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
    zoomIn,
    zoomOut,
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
      const linkedM = mediaList.find((m) => m.id === h.targetMediaId);
      const rawTranscript =
        (h as any).transcriptImageUrl ||
        (h as any).transcriptImages?.[0] ||
        (linkedM as any)?.transcriptImageUrl ||
        (linkedM as any)?.transcriptImages?.[0];
      const transcriptUrl = rawTranscript ? resolveAssetUrl(rawTranscript) || rawTranscript : undefined;

      setActiveAudioItem({
        id: h.id,
        title: (h as any).label || (h as any).tooltipText || `Audio Maşq • ${pageNum}-bet`,
        url: url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        durationSeconds: 120,
        transcriptImageUrl: transcriptUrl,
      });
    } else if (h.type === 'VIDEO') {
      const url =
        resolveAssetUrl(h.targetUrl) ||
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      setActiveVideoItem({
        id: h.id,
        title: (h as any).label || (h as any).tooltipText || `Video Darslik • ${pageNum}-bet`,
        url,
      });
    } else if (h.type === 'ANSWER_LINK') {
      setSelectedAnswerHotspotId(h.id);
      const matchingAnswer = pageAnswerItems.find(
        (a) => a.id === h.id || a.studentPageNumber === pageNum,
      );
      const rawImg =
        (h as any).imageUrl ||
        (h as any).answerImages?.[0] ||
        matchingAnswer?.imageUrl ||
        matchingAnswer?.answerImages?.[0];
      const answerImgUrl = rawImg ? resolveAssetUrl(rawImg) || rawImg : null;

      // Open floating draggable & resizable window (NO background overlay!)
      setFloatingAnswerImage({
        isOpen: true,
        title: (h as any).exerciseLabel || (h as any).label || `Javoblar kaliti • ${pageNum}-bet`,
        subtitle: `${book.title} • ${pageNum}-sahifa`,
        imageUrl: answerImgUrl,
      });
    }
  };

  // Combine remote answer keys + visual hotspots for the current page
  const pageAnswerItems = useMemo(() => {
    const list: AnswerItem[] = [];
    const seen = new Set<string>();

    // 1. From visual hotspots on current page (highest fidelity, newly added in editor)
    hotspots
      .filter((h: any) => h.pageNumber === currentPage && h.type === 'ANSWER_LINK')
      .forEach((h: any, idx: number) => {
        const id = h.id || `hs_ans_${h.pageNumber}_${idx}`;
        seen.add(id);
        const linkedM = mediaList.find((m) => m.id === h.targetMediaId);
        list.push({
          id,
          studentExerciseLabel: h.exerciseLabel || h.label || `Javoblar #${idx + 1}`,
          studentPageNumber: h.pageNumber || currentPage,
          solutionKey: h.solutionText || '',
          notes: h.methodologyNotes || undefined,
          imageUrl: h.imageUrl || (h.answerImages && h.answerImages[0]) || undefined,
          answerImages: h.answerImages || (h.imageUrl ? [h.imageUrl] : []),
          transcriptText: h.transcriptText || undefined,
          transcriptImages: h.transcriptImages || [],
          targetMediaId: h.targetMediaId || undefined,
          targetMediaTitle: linkedM?.title,
          targetMediaUrl: linkedM?.url,
          targetTeacherBookId: h.targetTeacherBookId || undefined,
          targetTeacherPageNumber: h.targetTeacherPageNumber || undefined,
        });
      });

    // 2. From remote answer keys on current page
    answerKeys
      .filter((a) => a.studentPageNumber === currentPage && (!a.id || !seen.has(a.id)))
      .forEach((a) => list.push(a));

    return list;
  }, [answerKeys, hotspots, currentPage, mediaList]);

  // Current page display info
  const pageDisplayInfo = useMemo(() => {
    return pdfPageToBookDisplay(currentPage, totalPages, contentStartPdfPage);
  }, [currentPage, totalPages, contentStartPdfPage]);

  // Page width based on zoom level (base 820px) with adaptive layout for mobile & tablet
  const basePageWidth = 820;
  const targetWidth = Math.round(basePageWidth * zoomLevel);
  // On mobile (<640px), keep page fit to available width with padding so it never horizontally cuts off
  const maxAvailableWidth = isMobile
    ? viewportWidth - 20
    : viewportWidth - (showThumbnails ? (isTablet ? 96 : 112) : 24);
  const computedPageWidth = isMobile ? Math.min(targetWidth, maxAvailableWidth) : targetWidth;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F6F7FB] dark:bg-[#0E1220] text-[#1B2238] dark:text-[#E6E8EC] select-none overflow-hidden">
      {/* =========================================================================
          Top SmartBoard Navigation Bar (Matching Design)
      ========================================================================= */}
      <header className="h-14 sm:h-16 shrink-0 bg-[#FFFFFF] dark:bg-[#171C2E] border-b border-[#E6E9F2] dark:border-[#262C42] px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 shadow-sm dark:shadow-lg z-30">
        {/* Left: Exit & Book Details */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={handleExit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:hover:text-white dark:border-[#262C42] border transition-colors text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
            title="Çiqiş"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Çiqiş</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-[#1B2238] dark:text-white truncate max-w-[120px] xs:max-w-[170px] sm:max-w-xs md:max-w-md">
                {book.title}
              </h1>
              <span className="inline-flex px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-[#EEF4FF] dark:bg-[#EEF4FF]/10 text-[#2A4FB8] dark:text-[#8FA8F7] border border-[#BAD2FF] dark:border-[#8FA8F7]/30 shrink-0">
                {formatGrade(book.gradeId)}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#7A8299] dark:text-[#8B93AD] truncate hidden md:block">
              {book.type === 'TEACHER_BOOK'
                ? "Öqituvçi kitobi (Teacher's Book)"
                : book.type === 'WORKBOOK'
                ? 'İş daftari (Workbook)'
                : "Öquvçi darsligi (Student's Book)"}
            </p>
          </div>
        </div>

        {/* Center: Mobile/Tablet Clickable Page Pill (opens jump modal) */}
        <button
          type="button"
          onClick={() => setIsMobileJumpOpen(true)}
          className="lg:hidden flex items-center rounded-full bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#10152A] dark:hover:bg-[#262C42] dark:border-[#262C42] border px-3.5 py-1.5 gap-1.5 shadow-inner transition active:scale-95 cursor-pointer"
          title="Başqa sahifaga ötiş"
        >
          <span className="text-[#2A4FB8] dark:text-[#8FA8F7] font-black text-xs sm:text-sm">
            {pageDisplayInfo.isFrontMatter
              ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplayInfo.frontMatterIndex}`
              : `${pageDisplayInfo.bookPage}-bet`}
          </span>
          <span className="text-[#7A8299] dark:text-[#7A8299] font-normal text-xs sm:text-sm">/</span>
          <span className="text-[#1B2238] dark:text-[#E6E8EC] text-xs sm:text-sm font-semibold">
            {pageDisplayInfo.isFrontMatter ? totalPages : contentTotalPages}
          </span>
        </button>

        {/* Center: Desktop Direct Indicator & Quick Jump Form */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] px-3 py-1.5 rounded-xl shadow-inner text-xs font-bold text-[#2A4FB8] dark:text-[#8FA8F7]">
            <span>
              {pageDisplayInfo.isFrontMatter
                ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplayInfo.frontMatterIndex}`
                : `${pageDisplayInfo.bookPage} / ${contentTotalPages} bet`}
            </span>
            <span className="text-[10px] text-[#7A8299] dark:text-[#8B93AD] font-normal">
              (PDF {currentPage}/{totalPages})
            </span>
          </div>

          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={contentTotalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="Bet..."
              className="w-16 h-8 text-center bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] rounded-lg text-xs text-[#1B2238] dark:text-white placeholder-[#7A8299] dark:placeholder-[#8B93AD] focus:outline-none focus:border-[#2A4FB8]"
            />
            <button
              type="submit"
              className="h-8 px-3 rounded-lg bg-[#2A4FB8] hover:bg-[#234399] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Ötiş
            </button>
          </form>
        </div>

        {/* Right: Mobile/Tablet Single Clean Menu Button */}
        <button
          type="button"
          onClick={() => setIsReaderMenuOpen(true)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:hover:text-white dark:border-[#262C42] border transition-all text-xs font-bold shadow-xs shrink-0"
          title="Asboblar menyusi"
        >
          <Menu className="h-4 w-4 text-[#2A4FB8] dark:text-[#8FA8F7]" />
          <span className="hidden sm:inline">Menyu</span>
        </button>

        {/* Right: Desktop Full SmartBoard Toolbar */}
        <div className="hidden lg:flex items-center gap-1.5 sm:gap-2">
          {/* Thumbnails Toggle */}
          <button
            onClick={() => setShowThumbnails((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors border ${
              showThumbnails
                ? 'bg-[#2A4FB8] text-white border-[#2A4FB8]'
                : 'bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42]'
            }`}
            title="Sahifalar paneli"
          >
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors border ${
              isSearchOpen
                ? 'bg-[#2A4FB8] text-white border-[#2A4FB8]'
                : 'bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42]'
            }`}
            title="Qidiriş"
          >
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={zoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
            className="p-1.5 sm:p-2 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42] disabled:opacity-30 transition-colors border"
            title="Kiçraytiriş (Ctrl / Cmd + -)"
          >
            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Zoom Select Dropdown */}
          <div className="relative">
            <select
              value={Math.round(zoomLevel * 100)}
              onChange={(e) => applyZoom(Number(e.target.value) / 100)}
              className="appearance-none bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42] text-xs font-bold pl-2.5 pr-6 py-1.5 rounded-xl border focus:outline-none cursor-pointer"
              title="Masshtab (Zoom)"
            >
              {ZOOM_PRESETS.map((p) => {
                const pct = Math.round(p * 100);
                return (
                  <option key={pct} value={pct}>
                    {pct}%
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3 h-3 text-[#7A8299] dark:text-[#8B93AD] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Zoom In */}
          <button
            onClick={zoomIn}
            disabled={zoomLevel >= MAX_ZOOM}
            className="p-1.5 sm:p-2 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42] disabled:opacity-30 transition-colors border"
            title="Kattalaştiriş (Ctrl / Cmd + +)"
          >
            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Marker Studio Toggle */}
          <button
            onClick={() => setIsMarkerActive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isMarkerActive
                ? 'bg-[#F5B82E] text-slate-950 border-[#F5B82E] shadow-md shadow-[#F5B82E]/20'
                : 'bg-[#F5B82E]/10 hover:bg-[#F5B82E]/20 text-[#B45309] dark:text-[#F5B82E] border-[#F5B82E]/40'
            }`}
            title="Marker Studio (M)"
          >
            <PenTool className="h-3.5 w-3.5 text-[#B45309] dark:text-[#F5B82E]" />
            <span className="hidden xl:inline">Marker Studio</span>
          </button>

          {/* TOC Drawer Toggle */}
          <button
            onClick={() => setIsTocOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors border ${
              isTocOpen
                ? 'bg-[#2A4FB8] text-white border-[#2A4FB8]'
                : 'bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42]'
            }`}
            title="Mundarija (TOC)"
          >
            <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          {/* Bookmarks & Notes Toggle */}
          <button
            onClick={() => setIsBookmarksOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors relative border ${
              isBookmarksOpen
                ? 'bg-[#2A4FB8] text-white border-[#2A4FB8]'
                : 'bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42]'
            }`}
            title="Xatçöplar va izohlar"
          >
            <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#F5B82E] text-[9px] font-bold text-slate-950 flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* Media Library Drawer Toggle */}
          <button
            onClick={() => setIsMediaOpen((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors relative border ${
              isMediaOpen
                ? 'bg-[#0E7C70] text-white border-[#0E7C70]'
                : 'bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#0E7C70] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#5ED3C4] dark:border-[#262C42]'
            }`}
            title="Media kutubxona"
          >
            <Headphones className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {mediaList.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#0E7C70] text-[9px] font-bold text-white flex items-center justify-center">
                {mediaList.length}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42] transition-colors border"
            title={isDark ? "Yorug' rejim (Light mode)" : "Qorong'i rejim (Dark mode)"}
            aria-label="Rejimni almashtirish"
          >
            {isDark ? (
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#F5B82E]" />
            ) : (
              <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#2A4FB8]" />
            )}
          </button>

          {/* User Profile Avatar */}
          <div
            className="w-7 h-7 rounded-full bg-[#2A4FB8] text-white font-black text-xs flex items-center justify-center ring-2 ring-[#8FA8F7]/30 shrink-0 select-none"
            title={currentUser?.fullName || currentUser?.email || "Öqituvçi"}
          >
            {userInitial}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] border-[#E6E9F2] dark:bg-[#262C42] dark:hover:bg-[#262C42] dark:text-[#E6E8EC] dark:border-[#262C42] transition-colors border"
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
        <div className="bg-[#FFFFFF] dark:bg-[#0B101D] border-b border-[#E6E9F2] dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 z-30">
          <div className="flex-1 max-w-md flex items-center gap-2 bg-[#EEF1F8] dark:bg-[#060A14] border border-[#E6E9F2] dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <Search className="w-4 h-4 text-[#7A8299] dark:text-slate-400" />
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
              className="bg-transparent text-xs text-[#1B2238] dark:text-white placeholder-[#7A8299] dark:placeholder-slate-500 focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#7A8299] dark:text-slate-400 hover:text-[#1B2238] dark:hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setIsSearchOpen(false)}
            className="text-xs font-semibold text-[#7A8299] dark:text-slate-400 hover:text-[#1B2238] dark:hover:text-white px-2.5 py-1 rounded-lg"
          >
            Yopiş
          </button>
        </div>
      )}

      {/* =========================================================================
          Workspace: Left Thumbnails Sidebar + Center Document Canvas
      ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Thumbnails Drawer */}
        {showThumbnails && isMobile && (
          <div
            onClick={() => setShowThumbnails(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 animate-in fade-in"
          />
        )}

        {/* =========================================================================
            Left Vertical Page Thumbnails Sidebar / Drawer
        ========================================================================= */}
        {showThumbnails && (
          <aside
            ref={thumbnailContainerRef}
            className={`${
              isMobile
                ? 'fixed inset-y-0 left-0 z-40 w-24 pt-16 shadow-2xl animate-in slide-in-from-left duration-200'
                : 'w-20 sm:w-24 shrink-0 z-20'
            } bg-[#FFFFFF] dark:bg-[#171C2E] border-r border-[#E6E9F2] dark:border-[#262C42] overflow-y-auto overflow-x-hidden py-3 px-2 flex flex-col items-center gap-3.5 select-none`}
            style={{ scrollbarWidth: 'thin' }}
          >
            {isMobile && (
              <div className="w-full flex justify-between items-center px-1 pb-1 border-b border-[#E6E9F2] dark:border-[#262C42] mb-1">
                <span className="text-[10px] font-bold text-[#7A8299] dark:text-[#8B93AD]">Betlar</span>
                <button
                  type="button"
                  onClick={() => setShowThumbnails(false)}
                  className="p-1 rounded text-[#7A8299] hover:text-[#1B2238] dark:text-[#8B93AD] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
                  onClick={() => {
                    scrollToPage(pageNum, 'smooth');
                    if (isMobile) setShowThumbnails(false);
                  }}
                  className="flex flex-col items-center cursor-pointer group w-full"
                  title={`${pageDisplay.isFrontMatter ? 'Kiriş ' + pageDisplay.frontMatterIndex : pageDisplay.bookPage + '-bet'}`}
                >
                  {/* Thumbnail Preview Box */}
                  <div
                    className={`w-16 h-20 sm:h-22 rounded-lg overflow-hidden bg-white relative transition-all duration-150 flex items-center justify-center ${
                      isActive
                        ? 'border-2 border-[#2A4FB8] ring-2 ring-[#2A4FB8]/40 shadow-lg shadow-[#2A4FB8]/30 scale-105'
                        : 'border border-[#E6E9F2] dark:border-[#262C42] opacity-60 group-hover:opacity-100 group-hover:border-[#2A4FB8] dark:group-hover:border-[#8FA8F7]'
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
                      } flex-col items-center justify-center p-1 bg-[#EEF1F8] dark:bg-slate-800 text-[#7A8299] dark:text-slate-300 text-center`}
                    >
                      <span className="text-[10px] font-bold">{pageNumberLabel}</span>
                    </div>
                  </div>

                  {/* Page Number Underneath Thumbnail */}
                  <span
                    className={`text-[11px] font-bold text-center mt-1 transition-colors ${
                      isActive
                        ? 'text-[#2A4FB8] dark:text-indigo-400 font-extrabold'
                        : 'text-[#7A8299] hover:text-[#1B2238] dark:text-slate-400 dark:group-hover:text-white'
                    }`}
                  >
                    {pageNumberLabel}
                  </span>
                </div>
              );
            })}
          </aside>
        )}

        {/* Main Document Canvas */}
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              if (e.deltaY < 0) {
                zoomIn();
              } else {
                zoomOut();
              }
            }
          }}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F6F7FB] dark:bg-[#0E1220] py-4 sm:py-8 px-2 sm:px-4 flex flex-col items-center gap-6 sm:gap-8 relative select-none"
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
              className="relative shrink-0 rounded-2xl bg-white shadow-xl dark:shadow-2xl overflow-hidden border border-[#E6E9F2] dark:border-[#262C42]"
            >
              {/* Page Header Ribbon */}
              <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
                <span className="rounded-full bg-[#1B2238]/85 dark:bg-[#10152A]/85 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-md border border-[#E6E9F2]/30 dark:border-[#262C42]">
                  {pageDisplay.isFrontMatter
                    ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplay.frontMatterIndex}`
                    : `${pageDisplay.bookPage}-bet`}
                </span>
                {bookmarks.some((b) => b.pageNumber === pageNum) && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5B82E] text-slate-950 shadow-md">
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
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2A4FB8]">
                    {book.title}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {formatGrade(book.gradeId)}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md py-12">
                  <div className="h-16 w-16 rounded-2xl bg-[#EEF4FF] flex items-center justify-center text-[#2A4FB8] mb-4 shadow-sm">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {pageDisplay.isFrontMatter
                      ? `${strings.common?.introShort || 'Kiriş'} ${pageDisplay.frontMatterIndex}`
                      : `${pageDisplay.bookPage}-bet dars mavzusi`}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    Interaktiv darslik kontenti. Sahifadagi multimedia belgilarini bosib, audio eşitişingiz yoki video darslarni tomoşa qilişingiz mumkin.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleBookmark(pageNum)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>Xatçöp</span>
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage(pageNum);
                        const curHs = hotspots.find(
                          (h: any) => h.pageNumber === pageNum && h.type === 'ANSWER_LINK',
                        );
                        const rawImg =
                          (curHs as any)?.imageUrl ||
                          (curHs as any)?.answerImages?.[0];
                        setFloatingAnswerImage({
                          isOpen: true,
                          title: (curHs as any)?.exerciseLabel || `Javoblar kaliti • ${pageNum}-bet`,
                          subtitle: `${book.title} • ${pageNum}-sahifa`,
                          imageUrl: resolveAssetUrl(rawImg) || rawImg || null,
                        });
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
                  Overlaid Interactive Hotspots (Audio, Video, Answers, Notes)
                  100% VISUAL PARITY WITH ADMIN VISUAL PDF EDITOR
              ================================================================= */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {pageHs.map((hs: any) => {
                  const isAudio = hs.type === 'AUDIO';
                  const isVideo = hs.type === 'VIDEO';
                  const isAnswer = hs.type === 'ANSWER_LINK';
                  const isSolid = hs.appearanceStyle !== 'OUTLINE';

                  const accent = isAudio
                    ? '#0E7C70'
                    : isVideo
                    ? '#C23B5A'
                    : isAnswer
                    ? '#6D3FD1'
                    : '#15803D';

                  const size = hs.size || 'MD';

                  return (
                    <div
                      key={hs.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHotspotClick(hs, pageNum);
                      }}
                      style={{
                        left: `${(hs.rect?.x || 0) * 100}%`,
                        top: `${(hs.rect?.y || 0) * 100}%`,
                        width: `${(hs.rect?.w || 0) * 100}%`,
                        height: `${(hs.rect?.h || 0) * 100}%`,
                      }}
                      title={
                        hs.tooltipText ||
                        hs.label ||
                        (isAudio
                          ? 'Audioni tinglaş'
                          : isVideo
                          ? 'Videoni köriş'
                          : isAnswer
                          ? 'Javoblarni köriş'
                          : 'Eslatmani köriş')
                      }
                      className="absolute pointer-events-auto flex items-center justify-center cursor-pointer transition-transform group"
                    >
                      {/* Clean Icon-Only Appearance Badge (Matching Admin Panel Exactly) */}
                      <div
                        style={{
                          backgroundColor: isSolid ? accent : '#FFFFFF',
                          color: isSolid ? '#FFFFFF' : accent,
                          borderColor: accent,
                        }}
                        className={`rounded-full border-[1.5px] flex items-center justify-center shadow-md transition-all group-hover:scale-125 relative ${
                          size === 'LG'
                            ? 'w-7 h-7'
                            : size === 'SM'
                            ? 'w-4 h-4'
                            : 'w-5 h-5'
                        }`}
                      >
                        {isAudio ? (
                          <Headphones
                            className={
                              size === 'LG'
                                ? 'w-3.5 h-3.5'
                                : size === 'SM'
                                ? 'w-2.5 h-2.5'
                                : 'w-3 h-3'
                            }
                          />
                        ) : isVideo ? (
                          <Play
                            className={`${
                              size === 'LG'
                                ? 'w-3.5 h-3.5'
                                : size === 'SM'
                                ? 'w-2.5 h-2.5'
                                : 'w-3 h-3'
                            } fill-current ml-0.5`}
                          />
                        ) : isAnswer ? (
                          <>
                            <Lightbulb
                              className={
                                size === 'LG'
                                  ? 'w-3.5 h-3.5'
                                  : size === 'SM'
                                  ? 'w-2.5 h-2.5'
                                  : 'w-3 h-3'
                              }
                            />
                            {pageHs.filter((h: any) => h.type === 'ANSWER_LINK').length > 1 && (
                              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-600 text-white text-[8.5px] font-black flex items-center justify-center shadow-xs border border-white">
                                {pageHs.filter((h: any) => h.type === 'ANSWER_LINK').findIndex((h: any) => h.id === hs.id) + 1}
                              </span>
                            )}
                          </>
                        ) : (
                          <StickyNote
                            className={
                              size === 'LG'
                                ? 'w-3.5 h-3.5'
                                : size === 'SM'
                                ? 'w-2.5 h-2.5'
                                : 'w-3 h-3'
                            }
                          />
                        )}
                      </div>
                    </div>
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
        onClose={() => {
          setIsAnswersOpen(false);
          setSelectedAnswerHotspotId(null);
        }}
        currentPage={currentPage}
        bookTitle={book.title}
        answers={pageAnswerItems}
        selectedHotspotId={selectedAnswerHotspotId}
        onSwitchToPage={(page) => scrollToPage(page, 'smooth')}
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

      {/* Audio Player Modal with Transcript Button */}
      {activeAudioItem && (
        <AudioPlayerModal
          isOpen={true}
          onClose={() => setActiveAudioItem(null)}
          title={activeAudioItem.title}
          audioUrl={activeAudioItem.url}
          transcriptImageUrl={activeAudioItem.transcriptImageUrl}
          onOpenTranscript={() => {
            setFloatingTranscriptImage({
              isOpen: true,
              title: `Transkript • ${activeAudioItem.title}`,
              subtitle: 'Listening Audio transkripti',
              imageUrl: activeAudioItem.transcriptImageUrl,
            });
          }}
        />
      )}

      {/* Floating Draggable Answer Key Image Popup (No Overlay!) */}
      {floatingAnswerImage?.isOpen && (
        <FloatingImagePopup
          isOpen={true}
          onClose={() => setFloatingAnswerImage(null)}
          title={floatingAnswerImage.title}
          subtitle={floatingAnswerImage.subtitle}
          badge="Javob"
          type="ANSWER"
          imageUrl={floatingAnswerImage.imageUrl}
          initialOffset={{ x: 20, y: -20 }}
        />
      )}

      {/* Floating Draggable Audio Transcript Image Popup (No Overlay!) */}
      {floatingTranscriptImage?.isOpen && (
        <FloatingImagePopup
          isOpen={true}
          onClose={() => setFloatingTranscriptImage(null)}
          title={floatingTranscriptImage.title}
          subtitle={floatingTranscriptImage.subtitle}
          badge="Transkript"
          type="TRANSCRIPT"
          imageUrl={floatingTranscriptImage.imageUrl}
          initialOffset={{ x: -20, y: 30 }}
        />
      )}

      {/* Mobile Quick Jump Modal Dialog */}
      {isMobileJumpOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1B2238] dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2A4FB8] dark:text-[#8FA8F7]" />
                <span>Sahifaga ötiş</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileJumpOpen(false)}
                className="p-1 rounded-lg text-[#7A8299] hover:text-[#1B2238] dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = parseInt(jumpInput, 10);
                if (!isNaN(p) && p >= 1 && p <= contentTotalPages) {
                  const targetPdf = bookPageToPdfPage(p, contentStartPdfPage);
                  scrollToPage(targetPdf, 'smooth');
                  setIsMobileJumpOpen(false);
                  setJumpInput('');
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] text-[#7A8299] dark:text-slate-400 font-medium block mb-1">
                  1 dan {contentTotalPages} gaça bet raqami:
                </label>
                <input
                  type="number"
                  autoFocus
                  min={1}
                  max={contentTotalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder={`Masalan: ${pageDisplayInfo.bookPage || 1}`}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-white text-sm font-bold placeholder-[#7A8299] dark:placeholder-slate-500 focus:outline-none focus:border-[#2A4FB8] text-center"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileJumpOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Bekor qiliş
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] text-white text-xs font-bold shadow-md shadow-[#2A4FB8]/30 cursor-pointer"
                >
                  Ötiş
                </button>
              </div>
            </form>
          </div>
        </div>
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

      {/* =========================================================================
          Comprehensive Reader Tools Slide-Over Drawer Menu
      ========================================================================= */}
      {isReaderMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setIsReaderMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Container */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#FFFFFF] dark:bg-[#0B101D] border-l border-[#E6E9F2] dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto p-4 sm:p-5 z-10 animate-in slide-in-from-right duration-200">
            {/* Top Area: Header & Navigation/Tool Actions */}
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E6E9F2] dark:border-slate-800/80">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#1B2238] dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#2A4FB8] dark:text-[#8FA8F7]" />
                    <span>Darslik asboblari</span>
                  </h3>
                  <p className="text-[11px] text-[#7A8299] dark:text-slate-400 truncate mt-0.5">
                    {book.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReaderMenuOpen(false)}
                  className="p-1.5 rounded-xl text-[#7A8299] hover:text-[#1B2238] dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Section 1: Navigation & Search */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A8299] dark:text-slate-500 px-1">
                  Navigatsiya
                </p>

                {/* Search in Book */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReaderMenuOpen(false);
                    setIsSearchOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="w-4 h-4 text-[#2A4FB8] dark:text-[#8FA8F7]" />
                    <span>Qidiriş</span>
                  </div>
                </button>

                {/* Table of Contents (TOC) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReaderMenuOpen(false);
                    setIsTocOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <List className="w-4 h-4 text-[#2A4FB8] dark:text-[#8FA8F7]" />
                    <span>Mundarija (TOC)</span>
                  </div>
                  {tocEntries.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#E6E9F2] dark:bg-slate-800 text-[#1B2238] dark:text-slate-400 font-mono">
                      {tocEntries.length}
                    </span>
                  )}
                </button>

                {/* Thumbnails Sidebar Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setShowThumbnails((prev) => !prev);
                    setIsReaderMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    showThumbnails
                      ? 'bg-[#EEF4FF] text-[#2A4FB8] border border-[#BAD2FF] dark:bg-indigo-600/20 dark:text-indigo-300 dark:border-indigo-500/30'
                      : 'bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4 text-[#2A4FB8] dark:text-[#8FA8F7]" />
                    <span>Sahifalar lentasi</span>
                  </div>
                  <span className="text-[10px] font-bold">
                    {showThumbnails ? 'Yoniq' : 'Öçiq'}
                  </span>
                </button>
              </div>

              {/* Section 2: SmartBoard & Interactive Tools */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A8299] dark:text-slate-500 px-1">
                  Interaktiv Asboblar
                </p>

                {/* Marker Studio Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMarkerActive((prev) => !prev);
                    setIsReaderMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isMarkerActive
                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PenTool className="w-4 h-4 text-[#B45309] dark:text-amber-400" />
                    <span>Marker Studio (Doska qalami)</span>
                  </div>
                  <span className="text-[10px] font-bold">
                    {isMarkerActive ? 'Faol' : 'Öçiq'}
                  </span>
                </button>

                {/* Bookmarks & Notes */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReaderMenuOpen(false);
                    setIsBookmarksOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-[#B45309] dark:text-amber-400" />
                    <span>Xatçöplar va izohlar</span>
                  </div>
                  {bookmarks.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                      {bookmarks.length}
                    </span>
                  )}
                </button>

                {/* Media Library */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReaderMenuOpen(false);
                    setIsMediaOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Headphones className="w-4 h-4 text-[#0E7C70] dark:text-[#5ED3C4]" />
                    <span>Media kutubxonasi (Audio/Video)</span>
                  </div>
                  {mediaList.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#E6E9F2] dark:bg-slate-800 text-[#1B2238] dark:text-slate-400 font-mono">
                      {mediaList.length}
                    </span>
                  )}
                </button>

                {/* Answer Keys Drawer */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReaderMenuOpen(false);
                    setIsAnswersOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-4 h-4 text-[#6D3FD1] dark:text-[#B69CFF]" />
                    <span>Maşq javoblari kaliti</span>
                  </div>
                  {pageAnswerItems.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#6D3FD1] text-white font-bold">
                      {pageAnswerItems.length} ta
                    </span>
                  )}
                </button>
              </div>

              {/* Section 3: View & Zoom Controls */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A8299] dark:text-slate-500 px-1">
                  Köriniş va Masshtab
                </p>

                {/* Theme Mode Toggle in Drawer */}
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? (
                      <Sun className="w-4 h-4 text-[#F5B82E]" />
                    ) : (
                      <Moon className="w-4 h-4 text-[#2A4FB8]" />
                    )}
                    <span>{isDark ? "Yorug' rejim (Light mode)" : "Qorong'i rejim (Dark mode)"}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#7A8299] dark:text-slate-400">
                    {isDark ? "Qorong'i" : "Yorug'"}
                  </span>
                </button>

                {/* Zoom Controller */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#EEF1F8] dark:bg-slate-900/60 border border-[#E6E9F2] dark:border-slate-800">
                  <span className="text-xs font-semibold text-[#1B2238] dark:text-slate-300">Masshtab</span>
                  <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-slate-950 p-1 rounded-lg border border-[#E6E9F2] dark:border-slate-800">
                    <button
                      type="button"
                      onClick={zoomOut}
                      disabled={zoomLevel <= MIN_ZOOM}
                      className="p-1 rounded-md text-[#7A8299] hover:text-[#1B2238] hover:bg-[#EEF1F8] dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Kiçraytiriş"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={resetZoom}
                      className="px-2 py-0.5 text-[11px] font-bold font-mono text-[#2A4FB8] dark:text-indigo-400 hover:underline cursor-pointer"
                      title="100% ga qaytarish"
                    >
                      {Math.round(zoomLevel * 100)}%
                    </button>
                    <button
                      type="button"
                      onClick={zoomIn}
                      disabled={zoomLevel >= MAX_ZOOM}
                      className="p-1 rounded-md text-[#7A8299] hover:text-[#1B2238] hover:bg-[#EEF1F8] dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Kattalaştiriş"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => {
                    toggleFullscreen();
                    setIsReaderMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-900/60 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-[#2A4FB8] dark:text-indigo-400" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-[#2A4FB8] dark:text-indigo-400" />
                    )}
                    <span>{isFullscreen ? 'Oynani kiçraytiriş' : 'Butun ekran (Fullscreen)'}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Area: User Info & Exit */}
            <div className="pt-4 border-t border-[#E6E9F2] dark:border-slate-800/80 space-y-3">
              {/* Teacher Profile */}
              <div className="flex items-center gap-2.5 px-1 py-1">
                <div className="w-8 h-8 rounded-full bg-[#2A4FB8] text-white font-black text-xs flex items-center justify-center ring-2 ring-[#8FA8F7]/30 shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#1B2238] dark:text-white truncate">
                    {currentUser?.fullName || currentUser?.email || 'Öqituvçi'}
                  </p>
                  <p className="text-[10px] text-[#7A8299] dark:text-slate-400 truncate">
                    {currentUser?.email || 'teacher@ilmchi.uz'}
                  </p>
                </div>
              </div>

              {/* Exit Reader */}
              <button
                type="button"
                onClick={handleExit}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#EEF1F8] hover:bg-[#E6E9F2] text-[#1B2238] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Darslikdan çiqiş</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
