import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  Pressable,
  AppState,
  BackHandler,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Hotspot, HotspotType } from '@smartteacherbook/shared';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import {
  getBookContentTotalPages,
  normalizeContentStartPage,
  pdfPageToBookDisplay,
} from '@smartteacherbook/shared';
import { mobileApi } from '../services/api/mobileApi';
import { secureStorage } from '../services/storage/secureStorage';
import { DownloadsManager, OfflineBookPackage } from '../services/storage/downloadsManager';
import { readingProgressStore } from '../services/storage/readingProgressStore';
import { annotationsStore } from '../services/storage/annotationsStore';
import { SubscriptionManager } from '../services/subscription/subscriptionManager';
import { readerBenchmark } from '../utils/readerBenchmark';
import {
  mergeBookDrawings,
  resolveMergedBookmarks,
  resolveMergedNotes,
} from '../utils/annotationHelpers';
import {
  clampBookPage,
  normalizeProgressUserKey,
  resolveInitialBookPage,
} from '../utils/readingProgressHelpers';
import { notify } from '../services/notifications/notificationService';
import { PinchZoomView } from '../components/reader/PinchZoomView';
import { HotspotLayer } from '../components/reader/HotspotLayer';
import { AudioPlayerModal } from '../components/reader/AudioPlayerModal';
import { VideoPlayerModal } from '../components/reader/VideoPlayerModal';
import { AnswerKeySheet, AnswerItem } from '../components/reader/AnswerKeySheet';
import { FloatingImagePopup } from '../components/reader/FloatingImagePopup';
import { TocSearchDrawer, TocEntry } from '../components/reader/TocSearchDrawer';
import {
  BookmarksNotesDrawer,
  BookmarkEntry,
  NoteEntry,
} from '../components/reader/BookmarksNotesDrawer';
import { MediaLibraryDrawer, MediaLibraryItem } from '../components/reader/MediaLibraryDrawer';
import {
  computeFittedPageBox,
  extractInitialBookAspectRatio,
  resolvePageAspectRatio,
} from '../utils/pageGeometry';
import {
  DrawingHighlighterLayer,
  DrawTool,
  DrawStroke,
  DrawStrokeSize,
  HIGHLIGHTER_COLORS,
  PEN_COLORS,
  MarkerStudioToolbar,
} from '../components/reader/DrawingHighlighterLayer';
import { ReaderPageSkeleton } from '../components/common/Skeleton';

export interface ReaderBookParam {
  id: string;
  title: string;
  gradeId: number;
  subjectId: string;
  totalPages: number;
  contentStartPdfPage?: number;
  type?: string;
  initialPage?: number;
}

interface ReaderScreenProps {
  book?: ReaderBookParam;
  initialPage?: number;
  userEmail: string;
  userId?: string;
  onExit: () => void;
  onOpenSettings?: () => void;
  onRenewSubscription?: () => void;
}

const DEFAULT_BOOK: ReaderBookParam = {
  id: 'book_demo_english_4',
  title: 'English • 4-sinf',
  gradeId: 4,
  subjectId: 'sub_eng',
  totalPages: 96,
  type: 'STUDENT_BOOK',
  initialPage: 24,
};

interface ExtendedMediaItem extends MediaLibraryItem {
  filename?: string;
}

/**
 * 1-to-1 Scene Artwork SVGs for the Interactive Aquarium Lesson Cards (a, b, d, e)
 */
const SceneArtwork: React.FC<{ variant: 'dolphin' | 'stingray' | 'octopus' | 'shark' }> = ({
  variant,
}) => {
  if (variant === 'dolphin') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
        <Rect width="160" height="100" fill="#0EA5E9" />
        <Circle cx="130" cy="20" r="26" fill="#38BDF8" opacity="0.45" />
        <Path d="M0 72 Q40 60 80 72 T160 72 L160 100 L0 100 Z" fill="#0284C7" />
        <Path
          d="M42 62 C46 32, 82 22, 110 38 C118 42, 126 52, 120 60 C106 58, 94 56, 80 62 C68 68, 52 72, 42 62 Z"
          fill="#E2E8F0"
        />
        <Path d="M74 30 L84 18 L89 32 Z" fill="#CBD5E1" />
        <Circle cx="105" cy="44" r="2.2" fill="#0F172A" />
      </Svg>
    );
  }
  if (variant === 'stingray') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
        <Rect width="160" height="100" fill="#FDE68A" />
        <Rect x="0" y="52" width="160" height="48" fill="#38BDF8" opacity="0.85" />
        <Circle cx="44" cy="30" r="14" fill="#F87171" />
        <Circle cx="84" cy="28" r="14" fill="#FB923C" />
        <Circle cx="122" cy="30" r="14" fill="#4ADE80" />
        <Path d="M55 76 Q85 60 112 76 Q85 88 55 76 Z" fill="#64748B" />
      </Svg>
    );
  }
  if (variant === 'octopus') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
        <Rect width="160" height="100" fill="#0F766E" />
        <Circle cx="35" cy="24" r="24" fill="#14B8A6" opacity="0.35" />
        <Path d="M0 78 Q50 65 100 80 T160 76 L160 100 L0 100 Z" fill="#115E59" />
        <Circle cx="82" cy="48" r="14" fill="#F59E0B" />
        <Path
          d="M70 56 Q56 68 48 76 M76 60 Q70 74 66 80 M88 60 Q94 74 98 80 M94 56 Q108 68 116 74"
          stroke="#D97706"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <Circle cx="77" cy="46" r="2.1" fill="#0F172A" />
        <Circle cx="87" cy="46" r="2.1" fill="#0F172A" />
      </Svg>
    );
  }
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
      <Rect width="160" height="100" fill="#0C4A6E" />
      <Circle cx="40" cy="24" r="28" fill="#0284C7" opacity="0.35" />
      <Path
        d="M36 54 C56 38, 94 36, 122 52 L138 43 L133 56 L140 68 L122 58 C94 70, 56 66, 36 54 Z"
        fill="#64748B"
      />
      <Path d="M75 40 L84 24 L93 40 Z" fill="#475569" />
      <Circle cx="54" cy="51" r="2" fill="#0F172A" />
    </Svg>
  );
};

/**
 * Reusable windowed PDF page canvas renderer for Vertical scrolling reading mode
 */
const PdfVerticalPageCanvas: React.FC<{
  pdfDoc: any;
  pageNumber: number;
  width: number;
  height: number;
}> = React.memo(({ pdfDoc, pageNumber, width, height }) => {
  const hostRef = useRef<any>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web' || !pdfDoc || !hostRef.current || width < 40 || height < 40) return;
    let cancelled = false;

    const render = async () => {
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !hostRef.current) return;

        const host: HTMLElement = hostRef.current;
        const unscaled = page.getViewport({ scale: 1 });
        const fitScale = Math.min(width / unscaled.width, height / unscaled.height);
        const viewport = page.getViewport({ scale: fitScale });
        const dpr = window.devicePixelRatio || 1;

        let canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) {
          canvas = document.createElement('canvas');
          host.innerHTML = '';
          host.appendChild(canvas);
        }

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, width, height]);

  return (
    <View style={{ width, height, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <View ref={hostRef} style={{ width, height, alignItems: 'center', justifyContent: 'center' }} />
      {rendering && (
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: 5,
            borderRadius: 99,
          }}
        >
          <ActivityIndicator size="small" color={DS.colors.primary} />
        </View>
      )}
    </View>
  );
});

interface ReaderVerticalPageCardProps {
  pageNumber: number;
  inWindow: boolean;
  isLoaded: boolean;
  pageWidth: number;
  cardHeight: number;
  pageImgUrl?: string;
  hasPdf: boolean;
  pdfDoc: any;
  hotspots: Hotspot[];
  activeDrawTool: DrawTool;
  drawColor: string;
  drawSize: DrawStrokeSize;
  pageStrokes?: DrawStroke[];
  pageBadgeText: string;
  borderColor: string;
  cardBg: string;
  placeholderBg: string;
  onMarkLoaded: (pg: number) => void;
  onImageDimensionLoaded: (pg: number, e: any) => void;
  onHotspotPress: (h: Hotspot) => void;
  onStrokesChange: (pg: number, next: DrawStroke[]) => void;
  renderCustomFallback?: (pg: number, size: { width: number; height: number }) => React.ReactNode;
}

const ReaderVerticalPageCard = React.memo<ReaderVerticalPageCardProps>(({
  pageNumber,
  inWindow,
  isLoaded,
  pageWidth,
  cardHeight,
  pageImgUrl,
  hasPdf,
  pdfDoc,
  hotspots,
  activeDrawTool,
  drawColor,
  drawSize,
  pageStrokes,
  pageBadgeText,
  borderColor,
  cardBg,
  placeholderBg,
  onMarkLoaded,
  onImageDimensionLoaded,
  onHotspotPress,
  onStrokesChange,
  renderCustomFallback,
}) => {
  const [retryAttempt, setRetryAttempt] = useState(0);

  const handleLoad = useCallback(
    (e: any) => {
      readerBenchmark.markT3(pageNumber);
      onMarkLoaded(pageNumber);
      onImageDimensionLoaded(pageNumber, e);
    },
    [onMarkLoaded, onImageDimensionLoaded, pageNumber],
  );

  const handleError = useCallback(() => {
    if (retryAttempt < 1) {
      setTimeout(() => {
        setRetryAttempt((prev) => prev + 1);
      }, 400);
    } else {
      onMarkLoaded(pageNumber);
    }
  }, [onMarkLoaded, pageNumber, retryAttempt]);

  const handleStrokes = useCallback(
    (next: DrawStroke[]) => {
      onStrokesChange(pageNumber, next);
    },
    [onStrokesChange, pageNumber],
  );

  return (
    <View
      style={[
        styles.verticalPageCard,
        {
          width: pageWidth,
          height: cardHeight,
          marginBottom: 14,
          borderColor,
          backgroundColor: cardBg,
        },
      ]}
    >
      {inWindow ? (
        <View style={{ width: pageWidth, height: cardHeight, position: 'relative' }}>
          {!isLoaded && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
              <ReaderPageSkeleton style={{ width: '100%', height: '100%', marginTop: 0 }} />
            </View>
          )}
          {pageImgUrl ? (
            <Image
              key={`${pageImgUrl}_retry${retryAttempt}`}
              source={{
                uri:
                  retryAttempt > 0
                    ? `${pageImgUrl}${pageImgUrl.includes('?') ? '&' : '?'}retry=${retryAttempt}`
                    : pageImgUrl,
              }}
              style={styles.pageImageFull}
              resizeMode="contain"
              fadeDuration={0}
              progressiveRenderingEnabled={true}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : hasPdf && Platform.OS === 'web' && pdfDoc ? (
            <PdfVerticalPageCanvas
              pdfDoc={pdfDoc}
              pageNumber={pageNumber}
              width={pageWidth}
              height={cardHeight}
            />
          ) : renderCustomFallback ? (
            renderCustomFallback(pageNumber, { width: pageWidth, height: cardHeight })
          ) : null}
        </View>
      ) : (
        <View
          style={[
            styles.verticalPlaceholder,
            {
              width: pageWidth,
              height: cardHeight,
              backgroundColor: placeholderBg,
            },
          ]}
        />
      )}

      {inWindow && hotspots.length > 0 && (
        <HotspotLayer
          hotspots={hotspots}
          pageWidth={pageWidth}
          pageHeight={cardHeight}
          onHotspotPress={onHotspotPress}
        />
      )}

      {inWindow && (activeDrawTool !== null || (pageStrokes && pageStrokes.length > 0)) && (
        <DrawingHighlighterLayer
          activeTool={activeDrawTool}
          activeColor={drawColor}
          strokeSize={drawSize}
          width={pageWidth}
          height={cardHeight}
          initialStrokes={pageStrokes}
          onStrokesChange={handleStrokes}
        />
      )}

      <View style={styles.verticalPageBadge}>
        <Text style={styles.verticalPageBadgeText}>{pageBadgeText}</Text>
      </View>
    </View>
  );
});

export const ReaderScreen: React.FC<ReaderScreenProps> = ({
  book = DEFAULT_BOOK,
  initialPage,
  userEmail,
  userId = 'teacher_user',
  onExit,
  onOpenSettings,
  onRenewSubscription,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { strings, formatGrade } = useI18n();

  useEffect(() => {
    readerBenchmark.markT2();
  }, []);
  const progressUserKey = useMemo(
    () =>
      normalizeProgressUserKey(
        userEmail || (userId && userId !== 'teacher_user' ? userId : ''),
      ),
    [userEmail, userId],
  );

  const initialRestoredPage = useMemo(() => {
    const localSync = readingProgressStore.getBookProgressSync(progressUserKey, book.id);
    return resolveInitialBookPage({
      explicitInitialPage: initialPage ?? book.initialPage,
      localEntry: localSync,
      totalPages: Math.max(1, book.totalPages || 96),
    });
  }, [progressUserKey, book.id, book.totalPages, book.initialPage, initialPage]);

  const [currentPage, setCurrentPage] = useState<number>(initialRestoredPage);
  const [totalPages, setTotalPages] = useState<number>(Math.max(1, book.totalPages || 96));
  const [zoomLocked, setZoomLocked] = useState<boolean>(false);
  const [pdfAspectRatio, setPdfAspectRatio] = useState<number>(1.414);
  const [pageImageRatios, setPageImageRatios] = useState<Record<number, number>>({});
  const [canvasAreaSize, setCanvasAreaSize] = useState<{ width: number; height: number }>(() => {
    const win = Dimensions.get('window');
    return {
      width: Math.max(320, win.width || 375),
      height: Math.max(480, (win.height || 640) - 120),
    };
  });

  const [loadedPages, setLoadedPages] = useState<Set<number>>(
    () => new Set([initialRestoredPage, 1]),
  );
  const markPageLoaded = useCallback((pageNum: number) => {
    setLoadedPages((prev) => {
      if (prev.has(pageNum)) return prev;
      const cur = currentPageRef.current;
      const next = new Set<number>();
      for (const p of prev) {
        if (Math.abs(p - cur) <= 40) next.add(p);
      }
      next.add(pageNum);
      return next;
    });
  }, []);

  const handleImageDimensionLoaded = useCallback((pageNum: number, e: any) => {
    const src = e?.nativeEvent?.source || e?.nativeEvent?.target;
    const w = Number(src?.width || src?.naturalWidth || 0);
    const h = Number(src?.height || src?.naturalHeight || 0);
    if (w <= 0 || h <= 0) return;
    const ratio = h / w;
    if (!Number.isFinite(ratio) || ratio <= 0.25 || ratio >= 4) return;
    setPdfAspectRatio((prev) => {
      if (pageNum === 1 || Math.abs(prev - 1.414) < 0.001) {
        return Math.abs(prev - ratio) > 0.002 ? ratio : prev;
      }
      return prev;
    });
    setPageImageRatios((prev) => {
      const existing = prev[pageNum];
      if (typeof existing === 'number' && Math.abs(existing - ratio) <= 0.002) {
        return prev;
      }
      return { ...prev, [pageNum]: ratio };
    });
  }, []);

  // Remote Content State
  const [loadingBook, setLoadingBook] = useState(true);
  const [refreshingBook, setRefreshingBook] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [hasPdf, setHasPdf] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<ExtendedMediaItem[]>([]);
  const [answerMappings, setAnswerMappings] = useState<any[]>([]);
  const [answerKeys, setAnswerKeys] = useState<any[]>([]);
  const [tocItems, setTocItems] = useState<TocEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [drawingsMap, setDrawingsMap] = useState<Record<number, DrawStroke[]>>({});
  const [deviceId, setDeviceId] = useState<string>(userId || 'dev_web');
  const [offlineMissing, setOfflineMissing] = useState(false);
  const [subscriptionLocked, setSubscriptionLocked] = useState(false);

  // Canvas & Menus State
  const [pageDimensions, setPageDimensions] = useState({ width: 360, height: 540 });
  const [activeDrawTool, setActiveDrawTool] = useState<DrawTool>(null);
  const [drawColor, setDrawColor] = useState<string>(HIGHLIGHTER_COLORS[0].hex);
  const [drawSize, setDrawSize] = useState<DrawStrokeSize>('MD');
  const [topMenuVisible, setTopMenuVisible] = useState(false);

  // Floating Modal Cards State (Image 2 Cards)
  const [audioModal, setAudioModal] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    url?: string;
    transcriptImageUrl?: string;
    transcriptText?: string;
  }>({ visible: false, title: book.title });

  // Floating Zero-Overlay Image Popups (matching Web)
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

  const [videoModal, setVideoModal] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    url?: string;
    notes?: string;
  }>({ visible: false, title: book.title });

  const [answerModalVisible, setAnswerModalVisible] = useState(false);
  const [answerTab, setAnswerTab] = useState<'ANSWERS' | 'TRANSCRIPT'>('ANSWERS');
  const [activeAnswerPage, setActiveAnswerPage] = useState<number>(initialRestoredPage);
  const [selectedAnswerHotspotId, setSelectedAnswerHotspotId] = useState<string | null>(null);
  const [tocModalVisible, setTocModalVisible] = useState(false);
  const [contentStartPdfPage, setContentStartPdfPage] = useState<number>(() =>
    normalizeContentStartPage(book.contentStartPdfPage, book.totalPages),
  );
  const [offlineAssetUrlMap, setOfflineAssetUrlMap] = useState<Record<string, string>>({});
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [bmModalState, setBmModalState] = useState<{
    visible: boolean;
    tab: 'BOOKMARKS' | 'NOTES';
  }>({ visible: false, tab: 'BOOKMARKS' });
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [notePopup, setNotePopup] = useState<{
    visible: boolean;
    title: string;
    body: string;
  }>({ visible: false, title: '', body: '' });

  const pdfDocRef = useRef<any>(null);
  const pdfCanvasHostRef = useRef<any>(null);
  const verticalScrollRef = useRef<ScrollView | null>(null);
  const programmaticScrollRef = useRef<boolean>(false);
  const scrollUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingVerticalScrollPageRef = useRef<number | null>(null);
  const restoredBookRef = useRef<string | null>(null);
  const currentPageRef = useRef<number>(currentPage);
  const totalPagesRef = useRef<number>(totalPages);
  const remoteProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollUpdateRef = useRef<number>(0);
  const initialScrollDoneRef = useRef<boolean>(false);

  currentPageRef.current = currentPage;
  totalPagesRef.current = totalPages;

  const persistCurrentProgress = useCallback(
    (explicitPage?: number, immediate = false) => {
      if (!book.id || restoredBookRef.current !== book.id) return;
      const targetPage = clampBookPage(
        explicitPage ?? currentPageRef.current,
        totalPagesRef.current,
      );
      readingProgressStore.saveBookProgress(
        progressUserKey,
        book.id,
        targetPage,
        totalPagesRef.current,
      );

      if (remoteProgressTimerRef.current) {
        clearTimeout(remoteProgressTimerRef.current);
        remoteProgressTimerRef.current = null;
      }

      if (immediate) {
        mobileApi.saveReadingProgress(book.id, targetPage).catch(() => {});
      } else {
        remoteProgressTimerRef.current = setTimeout(() => {
          mobileApi.saveReadingProgress(book.id, targetPage).catch(() => {});
        }, 1500);
      }
    },
    [book.id, progressUserKey],
  );

  const handleExit = useCallback(() => {
    persistCurrentProgress(undefined, true);
    onExit();
  }, [persistCurrentProgress, onExit]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notePopup.visible) {
        setNotePopup((p) => ({ ...p, visible: false }));
        return true;
      }
      if (topMenuVisible) {
        setTopMenuVisible(false);
        return true;
      }
      if (audioModal.visible) {
        setAudioModal((prev) => ({ ...prev, visible: false }));
        return true;
      }
      if (videoModal.visible) {
        setVideoModal((prev) => ({ ...prev, visible: false }));
        return true;
      }
      if (mediaModalVisible) {
        setMediaModalVisible(false);
        return true;
      }
      if (bmModalState.visible) {
        setBmModalState((prev) => ({ ...prev, visible: false }));
        return true;
      }
      if (tocModalVisible) {
        setTocModalVisible(false);
        return true;
      }
      if (answerModalVisible) {
        setAnswerModalVisible(false);
        return true;
      }
      if (activeDrawTool !== null) {
        setActiveDrawTool(null);
        return true;
      }
      handleExit();
      return true;
    });
    return () => sub.remove();
  }, [
    notePopup.visible,
    topMenuVisible,
    audioModal.visible,
    videoModal.visible,
    mediaModalVisible,
    bmModalState.visible,
    tocModalVisible,
    answerModalVisible,
    activeDrawTool,
    handleExit,
  ]);

  useEffect(() => {
    secureStorage
      .getOrCreateDeviceId()
      .then((id) => {
        if (id) setDeviceId(id);
      })
      .catch(() => {});
  }, []);

  // Load full book metadata & interactive assets from backend
  useEffect(() => {
    let active = true;
    restoredBookRef.current = null;
    pendingVerticalScrollPageRef.current = null;

    const optimisticTotal = Math.max(1, book.totalPages || 96);
    const localSyncEntry = readingProgressStore.getBookProgressSync(progressUserKey, book.id);
    const startPage = resolveInitialBookPage({
      explicitInitialPage: initialPage ?? book.initialPage,
      localEntry: localSyncEntry,
      totalPages: optimisticTotal,
    });
    currentPageRef.current = startPage;
    totalPagesRef.current = optimisticTotal;
    setCurrentPage(startPage);
    setActiveAnswerPage(startPage);
    setTotalPages(optimisticTotal);

    // Instant optimistic pages initialization: starts rendering page image at 0ms!
    const versionParam = (book as any).pagesVersion || (book as any).version || '';
    const versionQuery = versionParam ? `?v=${versionParam}` : '';
    const initialOptimisticPages = Array.from({ length: optimisticTotal }, (_, i) => ({
      pageNumber: i + 1,
      imageUrl: `${mobileApi.API_BASE}/content/books/${book.id}/pages/${i + 1}/image${versionQuery}`,
      imageNormalUrl: `${mobileApi.API_BASE}/content/books/${book.id}/pages/${i + 1}/image${versionQuery}`,
      imageHighUrl: `${mobileApi.API_BASE}/content/books/${book.id}/pages/${i + 1}/image${versionQuery}`,
    }));
    setPages(initialOptimisticPages);
    setLoadingBook(false);
    pdfDocRef.current = null;
    setPdfReady(false);

    const loadAll = async () => {
      try {
        const [accessResult, offlinePkg, localAsyncEntry, localAnnotations] = await Promise.all([
          SubscriptionManager.checkBookAccess({
            bookId: book.id,
            gradeId: book.gradeId || 11,
            subjectId: book.subjectId,
            forceSync: false,
          }),
          DownloadsManager.getOfflineBookPackage(book.id).catch(() => null),
          readingProgressStore.getBookProgress(progressUserKey, book.id).catch(() => localSyncEntry),
          annotationsStore.getBookAnnotations(progressUserKey, book.id).catch(() => null),
        ]);

        if (!active) return;

        if (!accessResult.allowed) {
          setSubscriptionLocked(true);
          notify.warning(strings.modals.expiredTitle, strings.modals.expiredDesc);
          if (active) setLoadingBook(false);
          return;
        }
        setSubscriptionLocked(false);

        // CASE 1: Book is already downloaded to local storage (Offline Fast-Path)
        if (offlinePkg) {
          setIsOfflineSession(true);

          const pdfInfo = offlinePkg.pdfInfo || { hasPdf: false, totalPages: offlinePkg.pages?.length || book.totalPages || 96 };
          const bookPages = offlinePkg.pages || [];
          const bookHotspots = offlinePkg.hotspots || [];
          const rawMedia = offlinePkg.media || [];
          const mappings = offlinePkg.answerMappings || [];
          const keys = offlinePkg.answerKeys || [];
          const toc = offlinePkg.toc || [];

          const resolvedOffline = await DownloadsManager.resolveBookOfflineAssets(book.id, offlinePkg).catch(() => ({
            pkg: offlinePkg,
            urlToLocalUri: {},
          }));
          if (!active) return;
          setOfflineAssetUrlMap(resolvedOffline.urlToLocalUri || {});

          const computedTotal = Math.max(
            1,
            pdfInfo?.totalPages || 0,
            bookPages?.length || 0,
            book.totalPages || 96,
          );
          const resolvedStartPage = normalizeContentStartPage(
            (pdfInfo as any)?.contentStartPdfPage ??
              offlinePkg?.book?.contentStartPdfPage ??
              book.contentStartPdfPage,
            computedTotal,
          );
          setContentStartPdfPage(resolvedStartPage);

          const restoredPage = resolveInitialBookPage({
            explicitInitialPage: initialPage ?? book.initialPage,
            localEntry: localAsyncEntry,
            remoteEntry: null,
            totalPages: computedTotal,
          });

          currentPageRef.current = restoredPage;
          totalPagesRef.current = computedTotal;
          pendingVerticalScrollPageRef.current = null;

          setTotalPages(computedTotal);
          setCurrentPage(restoredPage);
          setActiveAnswerPage(restoredPage);
          setHasPdf(!!pdfInfo?.hasPdf);
          setPages(bookPages);
          setPdfAspectRatio((prev) => extractInitialBookAspectRatio(bookPages, prev));
          setHotspots(bookHotspots);

          if (restoredPage > 1 && restoredPage !== initialRestoredPage) {
            scrollVerticalToPage(restoredPage, false);
            setTimeout(() => {
              if (active) scrollVerticalToPage(restoredPage, false);
            }, 60);
          }

          setMediaList((rawMedia || []).map((m: any) => ({
            id: m.id,
            type: m.type === 'VIDEO' ? 'VIDEO' : 'AUDIO',
            title: m.title || m.filename || 'Media',
            filename: m.filename,
            subtitle: m.unitLabel || (m.pageNumber ? `${m.pageNumber}` : undefined),
            durationSeconds: m.durationSeconds,
            pageNumber: m.pageNumber,
            url: m.url,
          })));

          setAnswerMappings(mappings);
          setAnswerKeys(keys);
          setTocItems(toc);
          setBookmarks(
            resolveMergedBookmarks({
              localPayload: localAnnotations,
              offlineBookmarks: offlinePkg.bookmarks,
              remoteBookmarks: [],
            }),
          );
          setNotes(
            resolveMergedNotes({
              localPayload: localAnnotations,
              offlineNotes: offlinePkg.notes,
              remoteNotes: [],
            }),
          );
          setDrawingsMap(
            mergeBookDrawings({
              localPayload: localAnnotations,
              offlineDrawList: offlinePkg.drawings,
              remoteDrawList: [],
            }) as Record<number, DrawStroke[]>,
          );

          restoredBookRef.current = book.id;
          readingProgressStore.saveBookProgress(
            progressUserKey,
            book.id,
            restoredPage,
            computedTotal,
          );

          // Non-blocking sync when internet is present
          mobileApi.saveReadingProgress(book.id, restoredPage).catch(() => {});
          Promise.all([
            mobileApi.getBookmarks(book.id).catch(() => []),
            mobileApi.getNotes(book.id).catch(() => []),
            mobileApi.getDrawings(book.id).catch(() => []),
          ]).then(([bmList, noteList, drawList]) => {
            if (!active) return;
            if (bmList?.length) {
              setBookmarks(
                resolveMergedBookmarks({
                  localPayload: localAnnotations,
                  offlineBookmarks: offlinePkg.bookmarks,
                  remoteBookmarks: bmList,
                }),
              );
            }
            if (noteList?.length) {
              setNotes(
                resolveMergedNotes({
                  localPayload: localAnnotations,
                  offlineNotes: offlinePkg.notes,
                  remoteNotes: noteList,
                }),
              );
            }
            if (drawList?.length) {
              setDrawingsMap(
                mergeBookDrawings({
                  localPayload: localAnnotations,
                  offlineDrawList: offlinePkg.drawings,
                  remoteDrawList: drawList,
                }) as Record<number, DrawStroke[]>,
              );
            }
          }).catch(() => {});
          return;
        }

        // CASE 2: Online Book — Priority Stage 1 Core Rendering
        setIsOfflineSession(false);
        setOfflineMissing(false);

        let pdfInfo: any = null;
        let bookPages: any[] = [];
        let bookHotspots: any[] = [];

        try {
          const bundle = await mobileApi.getReaderBundle(book.id);
          if (bundle) {
            pdfInfo = bundle.pdfInfo;
            bookPages = bundle.pages;
            bookHotspots = bundle.hotspots;
          } else {
            const [pi, bp, bh] = await Promise.all([
              mobileApi.getBookPdfInfo(book.id),
              mobileApi.getBookPages(book.id),
              mobileApi.getBookHotspots(book.id),
            ]);
            pdfInfo = pi;
            bookPages = bp;
            bookHotspots = bh;
          }
        } catch {
          // If network failed and book is not downloaded
          setOfflineMissing(true);
          notify.error(strings.modals.offlineTitle, strings.modals.offlineDesc);
          return;
        }

        if (!active) return;

        const computedTotal = Math.max(
          1,
          pdfInfo?.totalPages || 0,
          bookPages?.length || 0,
          book.totalPages || 96,
        );
        const resolvedStartPage = normalizeContentStartPage(
          (pdfInfo as any)?.contentStartPdfPage ?? book.contentStartPdfPage,
          computedTotal,
        );
        setContentStartPdfPage(resolvedStartPage);

        const restoredPage = resolveInitialBookPage({
          explicitInitialPage: initialPage ?? book.initialPage,
          localEntry: localAsyncEntry,
          remoteEntry: null,
          totalPages: computedTotal,
        });

        currentPageRef.current = restoredPage;
        totalPagesRef.current = computedTotal;
        pendingVerticalScrollPageRef.current = null;

        setTotalPages(computedTotal);
        setCurrentPage(restoredPage);
        setActiveAnswerPage(restoredPage);
        setHasPdf(!!pdfInfo?.hasPdf);
        setPages(bookPages?.length ? bookPages : initialOptimisticPages);
        setPdfAspectRatio((prev) => extractInitialBookAspectRatio(bookPages, prev));
        setHotspots(bookHotspots || []);

        if (restoredPage > 1 && restoredPage !== initialRestoredPage) {
          scrollVerticalToPage(restoredPage, false);
          setTimeout(() => {
            if (active) scrollVerticalToPage(restoredPage, false);
          }, 60);
        }

        setBookmarks(
          resolveMergedBookmarks({
            localPayload: localAnnotations,
            remoteBookmarks: [],
          }),
        );
        setNotes(
          resolveMergedNotes({
            localPayload: localAnnotations,
            remoteNotes: [],
          }),
        );
        setDrawingsMap(
          mergeBookDrawings({
            localPayload: localAnnotations,
            remoteDrawList: [],
          }) as Record<number, DrawStroke[]>,
        );

        restoredBookRef.current = book.id;

        readingProgressStore.saveBookProgress(
          progressUserKey,
          book.id,
          restoredPage,
          computedTotal,
        );
        mobileApi.saveReadingProgress(book.id, restoredPage).catch(() => {});

        // Background Stage 2: Deferred secondary metadata hydration (frees network queue for initial page)
        setTimeout(() => {
          if (!active) return;
          Promise.all([
            mobileApi.getMedia(book.id).catch(() => []),
            mobileApi.getAnswerMappings(book.gradeId, book.subjectId).catch(() => []),
            mobileApi.getAnswerKeys(book.id).catch(() => []),
            mobileApi.getBookToc(book.id).catch(() => []),
            mobileApi.getBookmarks(book.id).catch(() => []),
            mobileApi.getNotes(book.id).catch(() => []),
            mobileApi.getDrawings(book.id).catch(() => []),
          ])
            .then(([rawMedia, mappings, keys, toc, bmList, noteList, drawList]) => {
              if (!active) return;
              if (rawMedia && rawMedia.length > 0) {
                setMediaList(
                  (rawMedia || []).map((m: any) => ({
                    id: m.id,
                    type: m.type === 'VIDEO' ? 'VIDEO' : 'AUDIO',
                    title: m.title || m.filename || 'Media',
                    filename: m.filename,
                    subtitle: m.unitLabel || (m.pageNumber ? `${m.pageNumber}` : undefined),
                    durationSeconds: m.durationSeconds,
                    pageNumber: m.pageNumber,
                    url: m.url,
                  })),
                );
              }
              if (mappings && mappings.length > 0) setAnswerMappings(mappings);
              if (keys && keys.length > 0) setAnswerKeys(keys);
              if (toc && toc.length > 0) setTocItems(toc);
              if (bmList && bmList.length > 0) {
                setBookmarks(
                  resolveMergedBookmarks({
                    localPayload: localAnnotations,
                    remoteBookmarks: bmList,
                  }),
                );
              }
              if (noteList && noteList.length > 0) {
                setNotes(
                  resolveMergedNotes({
                    localPayload: localAnnotations,
                    remoteNotes: noteList,
                  }),
                );
              }
              if (drawList && drawList.length > 0) {
                setDrawingsMap(
                  mergeBookDrawings({
                    localPayload: localAnnotations,
                    remoteDrawList: drawList,
                  }) as Record<number, DrawStroke[]>,
                );
              }
            })
            .catch(() => {});
        }, 750);
      } catch {
        if (active && restoredBookRef.current !== book.id) {
          pendingVerticalScrollPageRef.current = startPage > 1 ? startPage : null;
          restoredBookRef.current = book.id;
        }
      } finally {
        if (active) setLoadingBook(false);
      }
    };

    loadAll();
    return () => {
      active = false;
    };
  }, [
    book.id,
    book.gradeId,
    book.subjectId,
    book.totalPages,
    book.initialPage,
    initialPage,
    progressUserKey,
  ]);

  // Adjacent Page Smart Pre-fetch: guarantees next/previous page is already in image cache
  useEffect(() => {
    if (!book?.id || totalPages <= 0 || isOfflineSession) return;
    const nextPg = currentPage + 1;
    const prevPg = currentPage - 1;
    if (nextPg <= totalPages) {
      Image.prefetch(`${mobileApi.API_BASE}/content/books/${book.id}/pages/${nextPg}/image`).catch(() => {});
    }
    if (prevPg >= 1) {
      Image.prefetch(`${mobileApi.API_BASE}/content/books/${book.id}/pages/${prevPg}/image`).catch(() => {});
    }
  }, [currentPage, totalPages, book?.id, isOfflineSession]);

  const handlePullRefreshBook = useCallback(async () => {
    setRefreshingBook(true);
    persistCurrentProgress(currentPageRef.current);
    try {
      await SubscriptionManager.syncFromBackend().catch(() => {});
      const { allowed } = await SubscriptionManager.checkBookAccess({
        bookId: book.id,
        gradeId: book.gradeId || 11,
        subjectId: book.subjectId,
      });
      setSubscriptionLocked(!allowed);

      const online = await mobileApi.checkConnectivity();
      if (online) {
        const [
          pdfInfo,
          bookPages,
          bookHotspots,
          rawMedia,
          mappings,
          keys,
          toc,
          bmList,
          noteList,
          drawList,
        ] = await Promise.all([
          mobileApi.getBookPdfInfo(book.id),
          mobileApi.getBookPages(book.id),
          mobileApi.getBookHotspots(book.id),
          mobileApi.getMedia(book.id),
          mobileApi.getAnswerMappings(book.gradeId, book.subjectId),
          mobileApi.getAnswerKeys(book.id),
          mobileApi.getBookToc(book.id),
          mobileApi.getBookmarks(book.id),
          mobileApi.getNotes(book.id),
          mobileApi.getDrawings(book.id),
        ]);
        const computedTotal = Math.max(
          1,
          pdfInfo?.totalPages || 0,
          bookPages?.length || 0,
          book.totalPages || 96,
        );
        totalPagesRef.current = computedTotal;
        setTotalPages(computedTotal);
        setContentStartPdfPage(
          normalizeContentStartPage(
            (pdfInfo as any)?.contentStartPdfPage ?? book.contentStartPdfPage,
            computedTotal,
          ),
        );
        setIsOfflineSession(false);
        setHasPdf(!!pdfInfo?.hasPdf);
        setPages(bookPages || []);
        setPdfAspectRatio((prev) => extractInitialBookAspectRatio(bookPages, prev));
        setHotspots(bookHotspots || []);
        setMediaList(
          (rawMedia || []).map((m: any) => ({
            id: m.id,
            type: m.type === 'VIDEO' ? 'VIDEO' : 'AUDIO',
            title: m.title || m.filename || 'Media',
            filename: m.filename,
            subtitle: m.unitLabel || (m.pageNumber ? `${m.pageNumber}` : undefined),
            durationSeconds: m.durationSeconds,
            pageNumber: m.pageNumber,
            url: m.url,
          })),
        );
        setAnswerMappings(mappings || []);
        setAnswerKeys(keys || []);
        setTocItems(toc || []);
        const localAnnotations = await annotationsStore.getBookAnnotations(progressUserKey, book.id);
        setBookmarks(
          resolveMergedBookmarks({
            localPayload: localAnnotations,
            remoteBookmarks: bmList,
          }),
        );
        setNotes(
          resolveMergedNotes({
            localPayload: localAnnotations,
            remoteNotes: noteList,
          }),
        );
        setDrawingsMap(
          mergeBookDrawings({
            localPayload: localAnnotations,
            remoteDrawList: drawList,
          }) as Record<number, DrawStroke[]>,
        );
        setReloadTick((t) => t + 1);
      }
    } catch {
    } finally {
      setRefreshingBook(false);
    }
  }, [book.id, book.gradeId, book.subjectId, book.totalPages, progressUserKey, persistCurrentProgress]);

  // Save reading progress durably on page change (only after saved position has restored)
  useEffect(() => {
    if (!book.id || currentPage < 1 || restoredBookRef.current !== book.id) return;
    persistCurrentProgress(currentPage);
  }, [book.id, currentPage, persistCurrentProgress]);

  // Flush reading progress on app background, tab hide/close, or reader unmount
  // and re-verify monthly subscription status when returning to active foreground.
  useEffect(() => {
    const flush = () => persistCurrentProgress(undefined, true);
    const recheckSubscription = () => {
      SubscriptionManager.checkBookAccess({
        bookId: book.id,
        gradeId: book.gradeId || 11,
        subjectId: book.subjectId,
      })
        .then(({ allowed }) => {
          setSubscriptionLocked(!allowed);
        })
        .catch(() => {});
    };

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        flush();
      } else if (nextState === 'active') {
        recheckSubscription();
      }
    });

    let cleanupWeb: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') flush();
        else if (document.visibilityState === 'visible') recheckSubscription();
      };
      window.addEventListener('pagehide', flush);
      window.addEventListener('beforeunload', flush);
      window.addEventListener('focus', recheckSubscription);
      document.addEventListener('visibilitychange', onVisibility);
      cleanupWeb = () => {
        window.removeEventListener('pagehide', flush);
        window.removeEventListener('beforeunload', flush);
        window.removeEventListener('focus', recheckSubscription);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }

    return () => {
      flush();
      appStateSub.remove();
      cleanupWeb?.();
      if (scrollUnlockTimerRef.current) {
        clearTimeout(scrollUnlockTimerRef.current);
        scrollUnlockTimerRef.current = null;
      }
    };
  }, [persistCurrentProgress, book.id, book.gradeId]);

  // Load PDF.js document on Web when hasPdf === true (online with seamless offline fallback)
  useEffect(() => {
    if (Platform.OS !== 'web' || !hasPdf || typeof window === 'undefined') return;
    let cancelled = false;

    const injectScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if ((window as any).pdfjsLib) {
            resolve();
            return;
          }
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', (e) => reject(e));
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });

    const loadPdfDocument = async () => {
      try {
        const { pdfMinUrl, workerUrl } = mobileApi.getPdfJsUrls();
        const offlineLibUrl = await DownloadsManager.getOfflineVendorScriptUrl('pdf.min.js');
        const offlineWorkerUrl = await DownloadsManager.getOfflineVendorScriptUrl(
          'pdf.worker.min.js',
        );

        if (!(window as any).pdfjsLib) {
          const preferOfflineLib =
            typeof navigator !== 'undefined' && navigator.onLine === false && offlineLibUrl;
          if (preferOfflineLib) {
            await injectScript(offlineLibUrl);
          } else {
            try {
              await injectScript(pdfMinUrl);
            } catch (scriptErr) {
              if (offlineLibUrl) {
                await injectScript(offlineLibUrl);
              } else {
                throw scriptErr;
              }
            }
          }
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib || cancelled) return;
        pdfjsLib.GlobalWorkerOptions.workerSrc = offlineWorkerUrl || workerUrl;

        const offlineBuf = await DownloadsManager.getOfflinePdfBuffer(book.id);
        let buf: ArrayBuffer;
        const isNavOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

        if (isNavOffline && offlineBuf) {
          buf = offlineBuf;
        } else {
          try {
            const token = await secureStorage.getAccessToken();
            const res = await fetch(mobileApi.getBookPdfUrl(book.id), {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error('PDF fetch failed');
            buf = await res.arrayBuffer();
          } catch (netErr) {
            if (offlineBuf) {
              buf = offlineBuf;
            } else {
              throw netErr;
            }
          }
        }

        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;

        pdfDocRef.current = doc;
        if (doc.numPages > 0) {
          setTotalPages(doc.numPages);
          try {
            const firstPg = await doc.getPage(1);
            const vp = firstPg.getViewport({ scale: 1 });
            if (vp.width > 0 && vp.height > 0) {
              setPdfAspectRatio(vp.height / vp.width);
            }
          } catch {}
        }
        setPdfReady(true);
      } catch (err: any) {
        if (!cancelled) {
          setHasPdf(false);
          notify.error(
            strings.common.error,
            err?.message || strings.common.unknownError,
          );
        }
      }
    };

    loadPdfDocument();
    return () => {
      cancelled = true;
    };
  }, [hasPdf, book.id]);

  // PDF rendering on Web is handled per-page inside PdfVerticalPageCanvas (Vertical-only)

  const VERTICAL_GAP = 14;
  const vPageWidth = Math.max(220, Math.floor(canvasAreaSize.width - 14));
  const vPageHeight = Math.max(180, Math.round(vPageWidth * pdfAspectRatio));

  const initialScrollOffset = useMemo(
    () => ({
      x: 0,
      y: Math.max(0, (initialRestoredPage - 1) * (vPageHeight + VERTICAL_GAP)),
    }),
    [initialRestoredPage, vPageHeight],
  );

  // Pre-index pages and hotspots into O(1) Map caches to eliminate O(N^2) search overhead on scroll
  const pagesByNumberMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of pages) {
      map.set(Number(p.pageNumber), p);
    }
    return map;
  }, [pages]);

  const hotspotsByPageMap = useMemo(() => {
    const map = new Map<number, Hotspot[]>();
    for (const h of hotspots) {
      const pgNum = Number(h.pageNumber);
      if (!Number.isNaN(pgNum)) {
        let list = map.get(pgNum);
        if (!list) {
          list = [];
          map.set(pgNum, list);
        }
        list.push(h);
      }
    }
    for (const [pgNum, pObj] of pagesByNumberMap.entries()) {
      if (!pObj?.id) continue;
      for (const h of hotspots) {
        if (
          h.pageId === pObj.id ||
          h.pageId === `${book.id}_p${pgNum}` ||
          h.pageId === `page_${pgNum}`
        ) {
          let list = map.get(pgNum);
          if (!list) {
            list = [];
            map.set(pgNum, list);
          }
          if (!list.includes(h)) {
            list.push(h);
          }
        }
      }
    }
    return map;
  }, [hotspots, pagesByNumberMap, book.id]);

  const currentPageObj = useMemo(
    () => pagesByNumberMap.get(currentPage),
    [pagesByNumberMap, currentPage],
  );

  // Active unit subtitle from TOC (real custom units only)
  const pageDisplayInfo = useMemo(
    () => pdfPageToBookDisplay(currentPage, totalPages, contentStartPdfPage),
    [currentPage, totalPages, contentStartPdfPage],
  );
  const contentTotalPages = useMemo(
    () => getBookContentTotalPages(totalPages, contentStartPdfPage),
    [totalPages, contentStartPdfPage],
  );

  const formatPdfPageBadge = useCallback(
    (pdfPage: number) => {
      const info = pdfPageToBookDisplay(pdfPage, totalPages, contentStartPdfPage);
      if (info.isFrontMatter) {
        return `${strings.common.introShort} ${info.frontMatterIndex}`;
      }
      return String(info.bookPage ?? pdfPage);
    },
    [totalPages, contentStartPdfPage, strings.common.introShort],
  );

  const headerPagePillText = pageDisplayInfo.isFrontMatter
    ? `${strings.common.introShort} ${pageDisplayInfo.frontMatterIndex}`
    : `${pageDisplayInfo.bookPage ?? currentPage} / ${contentTotalPages}`;

  const resolveMediaOrImageUrl = useCallback(
    (rawUrl?: string | null): string | undefined => {
      if (!rawUrl) return undefined;
      const offlineUri = DownloadsManager.resolveFromAssetUrlMap(offlineAssetUrlMap, rawUrl);
      if (offlineUri) return offlineUri;
      return mobileApi.resolveAssetUrl(rawUrl);
    },
    [offlineAssetUrlMap],
  );

  // Lightweight prefetch: only surrounding (+2 forward, -1 backward) pages, debounced to keep network free
  useEffect(() => {
    if (!book?.id || totalPages <= 0) return;
    const timer = setTimeout(() => {
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages, currentPage + 2);
      const versionParam = (book as any).pagesVersion || (book as any).version || '';
      const versionQuery = versionParam ? `?v=${versionParam}` : '';

      for (let p = start; p <= end; p++) {
        if (p === currentPage) continue;
        const pgObj = pagesByNumberMap.get(p);
        let rawUrl =
          pgObj?.imageHighUrl ||
          pgObj?.imageNormalUrl ||
          `/content/books/${book.id}/pages/${p}/image`;
        if (versionParam && !rawUrl.includes('?v=')) {
          rawUrl = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}v=${versionParam}`;
        }
        const resolved = resolveMediaOrImageUrl(rawUrl);
        if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
          Image.prefetch(resolved).catch(() => {});
        }
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [currentPage, book.id, totalPages, pagesByNumberMap, resolveMediaOrImageUrl]);

  const activeUnitTitle = useMemo(() => {
    const customToc = [...tocItems]
      .filter((t) => !/^Darslik\s*[—–\-]/i.test(t.title || ''))
      .sort((a, b) => a.pageNumber - b.pageNumber);
    if (customToc.length > 0) {
      const found = customToc.slice().reverse().find((t) => currentPage >= t.pageNumber);
      if (found) return found.title;
    }
    return `${formatGrade(book.gradeId)} • ${headerPagePillText}`;
  }, [tocItems, currentPage, book.gradeId, formatGrade, headerPagePillText]);

  const getHotspotsForPage = useCallback(
    (pageNum: number): Hotspot[] => {
      return hotspotsByPageMap.get(pageNum) || [];
    },
    [hotspotsByPageMap],
  );

  const pageHotspots: Hotspot[] = useMemo(
    () => getHotspotsForPage(currentPage),
    [getHotspotsForPage, currentPage],
  );

  // Prefetch current page answer & transcript images so tapping "Javoblar" or "Transkript" opens instantly
  useEffect(() => {
    if (!pageHotspots || pageHotspots.length === 0) return;
    pageHotspots.forEach((h: any) => {
      const urls: string[] = [];
      if (h.imageUrl) urls.push(h.imageUrl);
      if (Array.isArray(h.answerImages)) urls.push(...h.answerImages);
      if (h.transcriptImageUrl) urls.push(h.transcriptImageUrl);
      if (Array.isArray(h.transcriptImages)) urls.push(...h.transcriptImages);
      urls.forEach((u) => {
        const resolved = resolveMediaOrImageUrl(u);
        if (resolved && (resolved.startsWith('http://') || resolved.startsWith('https://'))) {
          Image.prefetch(resolved).catch(() => {});
        }
      });
    });
  }, [pageHotspots, resolveMediaOrImageUrl]);

  const getAnswersForPage = useCallback(
    (pageNum: number): AnswerItem[] => {
      const combined: AnswerItem[] = [];
      const hsForPage = getHotspotsForPage(pageNum);

      answerMappings
        .filter((m) => Number(m.studentPageNumber) === pageNum)
        .forEach((m) => {
          combined.push({
            id: m.id,
            exerciseLabel: m.studentExerciseLabel || 'Javoblar kaliti',
            teacherPageNumber: m.teacherPageNumber || pageNum,
            solutionText: m.solutionKey || '',
            methodologyNotes: m.notes || undefined,
            imageUrl: m.imageUrl,
          });
        });

      answerKeys
        .filter(
          (k) => Number(k.studentPage) === pageNum || Number(k.studentPageNumber) === pageNum,
        )
        .forEach((k) => {
          combined.push({
            id: k.id,
            exerciseLabel: k.exerciseNumber || k.exerciseLabel || 'Javoblar kaliti',
            teacherPageNumber: k.teacherPage || k.teacherPageNumber || pageNum,
            solutionText: k.solutionKey || k.textAnswer || k.solutionText || '',
            methodologyNotes: k.methodologyNotes,
            imageUrl: k.imageUrl,
          });
        });

      hsForPage
        .filter((h) => h.type === HotspotType.ANSWER_LINK)
        .forEach((h: any, idx: number) => {
          combined.push({
            id: h.id || `hs_ans_${h.pageNumber}_${idx}`,
            exerciseLabel: h.exerciseLabel || h.label || `Javoblar #${idx + 1}`,
            teacherPageNumber: h.targetTeacherPageNumber || h.targetPageNumber || pageNum,
            solutionText: h.solutionText || '',
            methodologyNotes: h.methodologyNotes || undefined,
            imageUrl: h.imageUrl || (h.answerImages && h.answerImages[0]) || undefined,
            answerImages: h.answerImages || (h.imageUrl ? [h.imageUrl] : []),
            transcriptText: h.transcriptText || undefined,
            transcriptImages: h.transcriptImages || [],
            targetMediaId: h.targetMediaId || undefined,
            targetTeacherBookId: h.targetTeacherBookId || undefined,
          });
        });

      return combined;
    },
    [answerMappings, answerKeys, getHotspotsForPage],
  );

  const activeAnswers = useMemo(
    () => getAnswersForPage(activeAnswerPage),
    [getAnswersForPage, activeAnswerPage],
  );

  const isCurrentBookmarked = bookmarks.some((b) => Number(b.pageNumber) === currentPage);

  const scrollVerticalToPage = useCallback(
    (targetPage: number, animated: boolean) => {
      if (!verticalScrollRef.current) return;
      const clamped = clampBookPage(targetPage, totalPagesRef.current);
      programmaticScrollRef.current = true;
      const targetY = Math.max(0, (clamped - 1) * (vPageHeight + VERTICAL_GAP));
      verticalScrollRef.current.scrollTo({ y: targetY, animated });
      if (scrollUnlockTimerRef.current) clearTimeout(scrollUnlockTimerRef.current);
      scrollUnlockTimerRef.current = setTimeout(() => {
        programmaticScrollRef.current = false;
      }, animated ? 450 : 350);
    },
    [vPageHeight],
  );

  const handleVerticalContentSizeChange = useCallback(() => {
    if (initialScrollDoneRef.current) return;
    if (initialRestoredPage > 1) {
      initialScrollDoneRef.current = true;
      scrollVerticalToPage(initialRestoredPage, false);
    }
  }, [initialRestoredPage, scrollVerticalToPage]);

  const goToPage = useCallback(
    (next: number) => {
      const clamped = clampBookPage(next, totalPages);
      pendingVerticalScrollPageRef.current = null;
      currentPageRef.current = clamped;
      setCurrentPage(clamped);
      markPageLoaded(clamped);
      scrollVerticalToPage(clamped, true);
    },
    [totalPages, scrollVerticalToPage, markPageLoaded],
  );

  // Keyboard navigation for external keyboards / tablet / web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToPage(currentPageRef.current + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentPageRef.current - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPage]);

  // Scroll Vertical reader directly to restored page after layout is ready
  useEffect(() => {
    const targetPage = pendingVerticalScrollPageRef.current;
    if (targetPage === null || !verticalScrollRef.current) {
      return;
    }

    pendingVerticalScrollPageRef.current = null;
    scrollVerticalToPage(targetPage, false);
  }, [scrollVerticalToPage]);

  const handleToggleBookmark = async (pageNum: number) => {
    const exists = bookmarks.some((b) => b.pageNumber === pageNum);
    let nextBookmarks: BookmarkEntry[];
    if (exists) {
      nextBookmarks = bookmarks.filter((b) => b.pageNumber !== pageNum);
      setBookmarks(nextBookmarks);
      annotationsStore.saveBookmarks(progressUserKey, book.id, nextBookmarks).catch(() => {});
      DownloadsManager.saveOfflineReaderPatch(book.id, { bookmarks: nextBookmarks });
      try {
        await mobileApi.deleteBookmark(book.id, pageNum);
        notify.info(strings.reader.bookmarkRemoved, formatPdfPageBadge(pageNum));
      } catch (err: any) {
        if (!err?.isNetworkError) {
          notify.warning(strings.common.error, err?.message || strings.common.unknownError);
        }
      }
    } else {
      const title =
        tocItems.find((t) => t.pageNumber === pageNum)?.title ||
        `${book.title} • ${formatPdfPageBadge(pageNum)}`;
      nextBookmarks = [...bookmarks, { pageNumber: pageNum, title }];
      setBookmarks(nextBookmarks);
      annotationsStore.saveBookmarks(progressUserKey, book.id, nextBookmarks).catch(() => {});
      DownloadsManager.saveOfflineReaderPatch(book.id, { bookmarks: nextBookmarks });
      try {
        await mobileApi.addBookmark(book.id, pageNum, title);
        notify.success(strings.reader.bookmarkAdded, formatPdfPageBadge(pageNum));
      } catch (err: any) {
        if (err?.isNetworkError) {
          notify.info(strings.common.offlineMode, strings.reader.bookmarkAdded);
        } else {
          notify.warning(strings.common.error, err?.message || strings.common.unknownError);
        }
      }
    }
  };

  const handleAddNote = async (pageNum: number, text: string) => {
    const optimistic: NoteEntry = { id: `tmp_${Date.now()}`, pageNumber: pageNum, text };
    setNotes((prev) => {
      const updated = [optimistic, ...prev];
      annotationsStore.saveNotes(progressUserKey, book.id, updated).catch(() => {});
      DownloadsManager.saveOfflineReaderPatch(book.id, { notes: updated });
      return updated;
    });
    try {
      const saved = await mobileApi.addNote(book.id, pageNum, text);
      if (saved?.id) {
        setNotes((prev) => {
          const updated = prev.map((n) => (n.id === optimistic.id ? saved : n));
          annotationsStore.saveNotes(progressUserKey, book.id, updated).catch(() => {});
          DownloadsManager.saveOfflineReaderPatch(book.id, { notes: updated });
          return updated;
        });
      }
      notify.success(strings.reader.noteSaved, formatPdfPageBadge(pageNum));
    } catch (err: any) {
      if (err?.isNetworkError) {
        notify.info(strings.common.offlineMode, strings.reader.noteSaved);
      } else {
        notify.warning(strings.common.error, err?.message || strings.common.unknownError);
      }
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== noteId);
      annotationsStore.saveNotes(progressUserKey, book.id, updated).catch(() => {});
      DownloadsManager.saveOfflineReaderPatch(book.id, { notes: updated });
      return updated;
    });
    try {
      await mobileApi.deleteNote(book.id, noteId);
      notify.info(strings.reader.noteDeleted);
    } catch (err: any) {
      if (!err?.isNetworkError) {
        notify.warning(strings.common.error, err?.message || strings.common.unknownError);
      }
    }
  };

  const handleStrokesChangeForPage = useCallback(
    (pageNum: number, nextStrokes: DrawStroke[]) => {
      annotationsStore
        .savePageDrawings(progressUserKey, book.id, pageNum, nextStrokes)
        .catch(() => {});
      setDrawingsMap((prev) => {
        const nextMap = { ...prev, [pageNum]: nextStrokes };
        const serialized = Object.entries(nextMap).map(([pg, strokes]) => ({
          pageNumber: Number(pg),
          strokes,
        }));
        DownloadsManager.saveOfflineReaderPatch(book.id, { drawings: serialized });
        return nextMap;
      });
      mobileApi.saveDrawings(book.id, pageNum, nextStrokes);
    },
    [book.id, progressUserKey],
  );

  const handleCloseDrawTool = useCallback(() => {
    setActiveDrawTool(null);
    notify.success(strings.reader.drawingSaved, strings.reader.offlineMediaReady);
  }, [strings]);

  const selectDrawTool = useCallback((nextTool: DrawTool) => {
    if (nextTool === 'HIGHLIGHTER') {
      setDrawColor((prev) =>
        HIGHLIGHTER_COLORS.some((c) => c.hex === prev) ? prev : HIGHLIGHTER_COLORS[0].hex,
      );
    } else if (nextTool === 'PEN') {
      setDrawColor((prev) =>
        PEN_COLORS.some((c) => c.hex === prev) ? prev : PEN_COLORS[0].hex,
      );
    }
    setActiveDrawTool(nextTool);
  }, []);

  const handleUndoActivePageStroke = useCallback(() => {
    const existing = drawingsMap[currentPage] || [];
    if (existing.length === 0) return;
    handleStrokesChangeForPage(currentPage, existing.slice(0, -1));
  }, [currentPage, drawingsMap, handleStrokesChangeForPage]);

  const handleClearActivePageStrokes = useCallback(() => {
    const existing = drawingsMap[currentPage] || [];
    if (existing.length === 0) return;
    handleStrokesChangeForPage(currentPage, []);
  }, [currentPage, drawingsMap, handleStrokesChangeForPage]);

  const resolveLinkedMedia = (hotspot: any): ExtendedMediaItem | undefined =>
    mediaList.find(
      (m) =>
        m.id === hotspot.targetMediaId ||
        (hotspot.targetFile &&
          (m.filename === hotspot.targetFile || m.title === hotspot.targetFile)),
    );

  const handleHotspotPress = useCallback(
    async (hotspot: Hotspot) => {
      const linkedMedia = resolveLinkedMedia(hotspot);
      const rawTargetUrl = hotspot.targetUrl || linkedMedia?.url;
      const resolvedUrl =
        resolveMediaOrImageUrl(rawTargetUrl) ||
        (await DownloadsManager.resolveOfflineAssetUri(book.id, rawTargetUrl)) ||
        mobileApi.resolveAssetUrl(rawTargetUrl);
      const hsPage = Number((hotspot as any).pageNumber) || currentPage;
      const hsPageLabel = formatPdfPageBadge(hsPage);

      if (hotspot.type === HotspotType.AUDIO) {
        if (!resolvedUrl) {
          notify.warning(strings.common.warning, strings.reader.mediaLoadFailed);
        }
        const rawTranscript =
          (hotspot as any).transcriptImageUrl ||
          (hotspot as any).transcriptImages?.[0] ||
          (linkedMedia as any)?.transcriptImageUrl ||
          (linkedMedia as any)?.transcriptImages?.[0];
        const transcriptUrl = rawTranscript ? resolveMediaOrImageUrl(rawTranscript) || rawTranscript : undefined;
        const rawTranscriptText = (hotspot as any).transcriptText || (linkedMedia as any)?.transcriptText;

        setAudioModal({
          visible: true,
          title: linkedMedia?.title || (hotspot as any).label || hotspot.exerciseLabel || activeUnitTitle,
          subtitle: `${strings.common.page} ${hsPageLabel} • ${strings.reader.playAudio}`,
          url: resolvedUrl,
          transcriptImageUrl: transcriptUrl,
          transcriptText: rawTranscriptText,
        });
      } else if (hotspot.type === HotspotType.VIDEO) {
        if (!resolvedUrl) {
          notify.warning(strings.common.warning, strings.reader.mediaLoadFailed);
        }
        setVideoModal({
          visible: true,
          title: linkedMedia?.title || (hotspot as any).label || hotspot.exerciseLabel || book.title,
          subtitle: `${strings.common.page} ${hsPageLabel} • ${strings.reader.playVideo}`,
          url: resolvedUrl,
          notes: hotspot.methodologyNotes || (hotspot as any).description || undefined,
        });
      } else if (hotspot.type === HotspotType.ANSWER_LINK) {
        const matchingAnswer = answerKeys.find(
          (a) =>
            a.id === hotspot.id ||
            (Number(a.studentPageNumber) === hsPage && a.studentExerciseLabel === hotspot.exerciseLabel) ||
            Number(a.studentPageNumber) === hsPage,
        );
        const rawImg =
          (hotspot as any).imageUrl ||
          (hotspot as any).answerImages?.[0] ||
          matchingAnswer?.imageUrl ||
          matchingAnswer?.answerImages?.[0];
        const answerImgUrl = rawImg ? resolveMediaOrImageUrl(rawImg) || rawImg : null;

        if (answerImgUrl) {
          setFloatingAnswerImage({
            isOpen: true,
            title: hotspot.exerciseLabel || (hotspot as any).label || `${strings.reader.answerKeysTitle} • ${hsPageLabel}`,
            subtitle: `${book.title} • ${strings.common.page} ${hsPageLabel}`,
            imageUrl: answerImgUrl,
          });
        } else {
          setAnswerTab('ANSWERS');
          setActiveAnswerPage(hsPage);
          setSelectedAnswerHotspotId(hotspot.id);
          setAnswerModalVisible(true);
        }

        setAnswerTab('ANSWERS');
        setActiveAnswerPage(hsPage);
        setSelectedAnswerHotspotId(hotspot.id);
      } else if (hotspot.type === HotspotType.INTERNAL_PAGE && hotspot.targetPageNumber) {
        goToPage(hotspot.targetPageNumber);
      } else {
        const hs = hotspot as any;
        setNotePopup({
          visible: true,
          title: hs.tooltipText || hs.label || strings.reader.notes,
          body: hs.noteText || hs.description || hs.methodologyNotes || '',
        });
      }
    },
    [
      mediaList,
      resolveMediaOrImageUrl,
      book.id,
      book.title,
      currentPage,
      formatPdfPageBadge,
      strings,
      activeUnitTitle,
      answerKeys,
      goToPage,
    ],
  );

  const handleQuickAudioBar = async (customTitle?: string) => {
    const pageAudioHs = pageHotspots.find((h) => h.type === HotspotType.AUDIO);
    if (pageAudioHs && !customTitle) {
      await handleHotspotPress(pageAudioHs);
      return;
    }
    const audioItem =
      mediaList.find((m) => m.type === 'AUDIO' && m.pageNumber === currentPage) ||
      mediaList.find((m) => m.type === 'AUDIO');

    if (audioItem) {
      const resolvedUrl =
        resolveMediaOrImageUrl(audioItem.url) ||
        (await DownloadsManager.resolveOfflineAssetUri(book.id, audioItem.url)) ||
        mobileApi.resolveAssetUrl(audioItem.url);
      const rawAudioTranscript =
        (audioItem as any).transcriptImageUrl ||
        (audioItem as any).transcriptImages?.[0];
      const audioTranscriptUrl = rawAudioTranscript
        ? resolveMediaOrImageUrl(rawAudioTranscript) || rawAudioTranscript
        : undefined;
      const audioTranscriptText = (audioItem as any).transcriptText;

      setAudioModal({
        visible: true,
        title: customTitle || audioItem.title,
        subtitle: audioItem.subtitle || strings.reader.audioPlayerTitle,
        url: resolvedUrl,
        transcriptImageUrl: audioTranscriptUrl,
        transcriptText: audioTranscriptText,
      });
    } else {
      setAudioModal({
        visible: true,
        title: customTitle || activeUnitTitle,
        subtitle: `${strings.reader.audioPlayerTitle} (${headerPagePillText})`,
      });
    }
  };

  const handleQuickVideoBar = (customTitle?: string) => {
    const pageVideoHs = pageHotspots.find((h) => h.type === HotspotType.VIDEO);
    if (pageVideoHs && !customTitle) {
      handleHotspotPress(pageVideoHs);
      return;
    }
    const videoItem =
      mediaList.find((m) => m.type === 'VIDEO' && m.pageNumber === currentPage) ||
      mediaList.find((m) => m.type === 'VIDEO');

    if (videoItem) {
      setVideoModal({
        visible: true,
        title: customTitle || videoItem.title,
        subtitle: videoItem.subtitle || book.title,
        url: resolveMediaOrImageUrl(videoItem.url),
      });
    } else {
      setVideoModal({
        visible: true,
        title: customTitle || strings.reader.videoPlayerTitle,
        subtitle: book.title,
      });
    }
  };

  const handlePlayFromLibrary = async (item: MediaLibraryItem) => {
    const resolvedUrl =
      resolveMediaOrImageUrl(item.url) ||
      (await DownloadsManager.resolveOfflineAssetUri(book.id, item.url)) ||
      mobileApi.resolveAssetUrl(item.url);
    if (item.type === 'VIDEO') {
      setVideoModal({
        visible: true,
        title: item.title,
        subtitle: item.subtitle || book.title,
        url: resolvedUrl,
      });
    } else {
      const rawItemTranscript =
        (item as any).transcriptImageUrl ||
        (item as any).transcriptImages?.[0];
      const itemTranscriptUrl = rawItemTranscript
        ? resolveMediaOrImageUrl(rawItemTranscript) || rawItemTranscript
        : undefined;
      const itemTranscriptText = (item as any).transcriptText;

      setAudioModal({
        visible: true,
        title: item.title,
        subtitle: item.subtitle || book.title,
        url: resolvedUrl,
        transcriptImageUrl: itemTranscriptUrl,
        transcriptText: itemTranscriptText,
      });
    }
  };

  const safeTopPad = Platform.OS === 'web' ? 4 : 0;

  const firstAnswer: AnswerItem = activeAnswers[0] || {
    exerciseLabel: strings.reader.answerKeysTitle,
    teacherPageNumber: activeAnswerPage,
    solutionText: '',
    methodologyNotes: strings.reader.noAnswerKeys,
  };

  const renderPageContent = (pageNum: number, explicitSize?: { width: number; height: number }) => {
    const pgObj = pages.find((p) => Number(p.pageNumber) === pageNum) || (pageNum === currentPage ? currentPageObj : undefined);
    const baseImgUrl =
      pgObj?.imageHighUrl ||
      pgObj?.imageNormalUrl ||
      `/content/books/${book.id}/pages/${pageNum}/image`;
    const offlineLocalImg = resolveMediaOrImageUrl(baseImgUrl);
    const isLocalImg = Boolean(
      offlineLocalImg &&
        (offlineLocalImg.startsWith('file://') ||
          offlineLocalImg.startsWith('blob:') ||
          offlineLocalImg.startsWith('data:')),
    );
    const pageImgUrl =
      offlineLocalImg && reloadTick > 0 && !isLocalImg
        ? `${offlineLocalImg}${offlineLocalImg.includes('?') ? '&' : '?'}r=${reloadTick}`
        : offlineLocalImg;
    const layerWidth =
      explicitSize?.width ?? (pageDimensions.width > 50 ? pageDimensions.width : canvasAreaSize.width);
    const layerHeight =
      explicitSize?.height ?? (pageDimensions.height > 50 ? pageDimensions.height : canvasAreaSize.height);
    const pgRatio = resolvePageAspectRatio(pgObj, pageImageRatios[pageNum], pdfAspectRatio);
    const isDocumentVisual = (hasPdf && Platform.OS === 'web') || !!pageImgUrl;
    const fittedPage = isDocumentVisual
      ? computeFittedPageBox(layerWidth, layerHeight, pgRatio)
      : { width: layerWidth, height: layerHeight, left: 0, top: 0 };

    return (
      <View
        style={[
          styles.canvasWrap,
          isDocumentVisual && styles.canvasWrapCentered,
          { backgroundColor: colors.readerBg },
        ]}
        onLayout={(e) => {
          if (explicitSize) return;
          const { width, height } = e.nativeEvent.layout;
          if (width > 50 && height > 50) {
            setPageDimensions({ width, height });
          }
        }}
      >
        {loadingBook ? (
          <View style={[styles.centerState, { width: '100%', alignItems: 'center', backgroundColor: colors.readerBg }]}>
            <ReaderPageSkeleton style={{ width: Math.min(layerWidth, 420), height: Math.min(layerHeight, 600) }} />
          </View>
        ) : offlineMissing ? (
          <View style={[styles.centerState, { backgroundColor: colors.readerBg }]}>
            <Text style={{ fontSize: 38, marginBottom: 10 }}>📡</Text>
            <Text style={[styles.centerStateText, { fontWeight: '800', color: colors.textPrimary }]}>
              {strings.modals.offlineTitle}
            </Text>
            <Text
              style={[
                styles.centerStateText,
                { textAlign: 'center', marginTop: 4, paddingHorizontal: 24, color: colors.textSecondary },
              ]}
            >
              {strings.modals.offlineDesc}
            </Text>
            <TouchableOpacity
              onPress={handleExit}
              style={{
                marginTop: 14,
                backgroundColor: colors.primaryDark,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>
                {strings.common.back}
              </Text>
            </TouchableOpacity>
          </View>
        ) : isDocumentVisual ? (
          <View
            style={[
              styles.fittedPageStage,
              {
                width: fittedPage.width,
                height: fittedPage.height,
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                borderColor: colors.border,
              },
            ]}
          >
            {hasPdf && Platform.OS === 'web' ? (
              <View style={styles.pdfContainer}>
                <View ref={pdfCanvasHostRef} style={styles.pdfHost} />
                {pdfRendering && (
                  <View style={styles.pdfLoadingPill}>
                    <ActivityIndicator size="small" color={DS.colors.primary} />
                  </View>
                )}
              </View>
            ) : (
              <Image
                source={{ uri: pageImgUrl }}
                style={styles.pageImageFull}
                resizeMode="contain"
                fadeDuration={0}
                progressiveRenderingEnabled={true}
                onLoad={(e) => handleImageDimensionLoaded(pageNum, e)}
              />
            )}

            {/* Interactive Hotspots Layer locked 1-to-1 to exact fitted page bounds */}
            <HotspotLayer
              hotspots={getHotspotsForPage(pageNum)}
              pageWidth={fittedPage.width}
              pageHeight={fittedPage.height}
              onHotspotPress={handleHotspotPress}
            />

            {/* Drawing & Highlighter Strokes locked 1-to-1 to exact fitted page bounds */}
            <DrawingHighlighterLayer
              activeTool={activeDrawTool}
              activeColor={drawColor}
              strokeSize={drawSize}
              width={fittedPage.width}
              height={fittedPage.height}
              initialStrokes={drawingsMap[pageNum]}
              onStrokesChange={(next) => handleStrokesChangeForPage(pageNum, next)}
            />
          </View>
        ) : (
          /* 1-to-1 Light-Blue Sky Textbook Layout matching Image 1 */
          <ScrollView
            scrollEnabled={activeDrawTool === null}
            style={[
              styles.textbookBg,
              { backgroundColor: isDark ? colors.background : '#F4F5F2' },
              Platform.OS === 'web'
                ? ({
                    overflowY: activeDrawTool ? 'hidden' : 'auto',
                    touchAction: activeDrawTool ? 'none' : 'pan-y',
                  } as any)
                : null,
            ]}
            contentContainerStyle={styles.textbookInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Subtle decorative sky wave arcs */}
            <View style={[styles.skyOrbTopRight, { backgroundColor: isDark ? 'rgba(91, 147, 250, 0.05)' : 'rgba(255,255,255,0.45)' }]} />
            <View style={[styles.skyOrbBottomLeft, { backgroundColor: isDark ? 'rgba(91, 147, 250, 0.04)' : 'rgba(255,255,255,0.4)' }]} />

            {/* Skills Banner Row */}
            <View style={[styles.skillsRow, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
              <Text style={styles.skillsText}>
                <Text style={[styles.skillsBold, { color: colors.textPrimary }]}>Skills: </Text>
                <Text style={[styles.skillsItalic, { color: colors.primary }]}>Listening and speaking</Text>
              </Text>
              <TouchableOpacity
                style={[styles.skillsAudioPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleQuickAudioBar('Listening & Speaking')}
                activeOpacity={0.8}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 18v-6a9 9 0 0118 0v6"
                    stroke={colors.audio}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                  <Path
                    d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
                    fill={colors.audio}
                  />
                </Svg>
                <View style={styles.miniWaveBars}>
                  <View style={[styles.miniBar, { height: 7, backgroundColor: colors.audio }]} />
                  <View style={[styles.miniBar, { height: 13, backgroundColor: colors.audio }]} />
                  <View style={[styles.miniBar, { height: 9, backgroundColor: colors.audio }]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* "Let's start!" Prompt Row */}
            <View style={styles.letsStartRow}>
              <View style={[styles.letsStartPill, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor }]}>
                <View style={[styles.letsStartTag, { backgroundColor: colors.warningSoft, borderColor: colors.border }]}>
                  <Text style={[styles.letsStartTagText, { color: colors.warning }]}>Let’s start!</Text>
                </View>
                <Text style={[styles.letsStartQuestion, { color: colors.textPrimary }]} numberOfLines={2}>
                  {currentPageObj?.title || 'What can you see at an aquarium?'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.speakerCircleWhite, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor }]}
                onPress={() => handleQuickAudioBar("Let's start • Warm-up Audio")}
              >
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path d="M11 5L6 9H2v6h4l5 4V5z" fill={colors.audio} />
                  <Path
                    d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"
                    stroke={colors.audio}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Exercise 14 Header */}
            <View style={styles.exHeaderRow}>
              <View style={styles.greenNumCircle}>
                <Text style={styles.greenNumText}>{14 + ((pageNum - 1) % 3) * 0}</Text>
              </View>
              <View style={styles.cdOrangeCircle}>
                <Text style={styles.cdTopText}>CD2</Text>
                <Text style={styles.cdBotText}>12</Text>
              </View>
              <Text style={[styles.exHeaderTitle, { color: colors.textPrimary }]}>
                Which animals do they see? Listen and say the letters.
              </Text>
            </View>

            {/* 2x2 Photo Cards Grid (a, b, d, e) */}
            <View style={styles.cardsGrid}>
              {[
                {
                  letter: 'a',
                  variant: 'dolphin' as const,
                  label: 'See our baby dolphins.',
                  mode: 'AUDIO' as const,
                },
                {
                  letter: 'b',
                  variant: 'stingray' as const,
                  label: 'Touch a stingray.',
                  mode: 'VIDEO' as const,
                },
                {
                  letter: 'd',
                  variant: 'octopus' as const,
                  label: 'Meet Otto.',
                  mode: 'AUDIO' as const,
                },
                {
                  letter: 'e',
                  variant: 'shark' as const,
                  label: 'Get close to our sharks.',
                  mode: 'VIDEO' as const,
                },
              ].map((card) => (
                <TouchableOpacity
                  key={card.letter}
                  style={styles.photoCardWrap}
                  activeOpacity={0.86}
                  onPress={() =>
                    card.mode === 'VIDEO'
                      ? handleQuickVideoBar(card.label)
                      : handleQuickAudioBar(card.label)
                  }
                >
                  <View style={[styles.photoFrame, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SceneArtwork variant={card.variant} />
                    <View style={styles.letterBadge}>
                      <Text style={styles.letterBadgeText}>{card.letter}</Text>
                    </View>
                    {card.mode === 'VIDEO' && (
                      <View style={[styles.photoPlayBadge, { backgroundColor: isDark ? 'rgba(30, 34, 42, 0.9)' : 'rgba(255,255,255,0.9)' }]}>
                        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                          <Path d="M8 5l11 7-11 7V5z" fill={colors.textPrimary} />
                        </Svg>
                      </View>
                    )}
                  </View>
                  <View style={[styles.photoCaptionPill, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor }]}>
                    {card.mode === 'VIDEO' ? (
                      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                        <Path d="M8 5l11 7-11 7V5z" fill={colors.video} />
                      </Svg>
                    ) : (
                      <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                        <Path d="M11 5L6 9H2v6h4l5 4V5z" fill={colors.audio} />
                        <Path
                          d="M15.5 8.5a5 5 0 010 7"
                          stroke={colors.audio}
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </Svg>
                    )}
                    <Text style={[styles.photoCaptionText, { color: colors.textPrimary }]} numberOfLines={2}>
                      {card.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Exercise 15 + Purple Audio Circle + Fill-in-the-blank Card */}
            <View style={styles.ex15Row}>
              <View style={styles.greenNumCircle}>
                <Text style={styles.greenNumText}>15</Text>
              </View>
              <View style={styles.cdOrangeCircle}>
                <Text style={styles.cdTopText}>CD2</Text>
                <Text style={styles.cdBotText}>12</Text>
              </View>
              <Text style={[styles.exHeaderTitle, { flex: 1, color: colors.textPrimary }]}>
                Listen again and say the missing words.
              </Text>
              <TouchableOpacity
                style={[styles.inlineAnswerChip, { backgroundColor: colors.answerSoft, borderColor: isDark ? colors.border : '#E6DCFA' }]}
                onPress={() => setAnswerModalVisible(true)}
                activeOpacity={0.82}
              >
                <Text style={[styles.inlineAnswerChipText, { color: colors.answer }]}>💡 Javoblar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.speakerCirclePurple}
                onPress={() => handleQuickAudioBar('Exercise 15 • Missing Words')}
              >
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path d="M11 5L6 9H2v6h4l5 4V5z" fill="#FFFFFF" />
                  <Path
                    d="M15.5 8.5a5 5 0 010 7"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            <View style={[styles.whiteExerciseCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor }]}>
              {currentPageObj?.textContent ? (
                <Text style={[styles.exLineText, { fontSize: 14, color: colors.textPrimary }]}>
                  {currentPageObj.textContent}
                </Text>
              ) : (
                [
                  { n: 1, pre: 'Otto is the', post: 'octopus in the world.' },
                  { n: 2, pre: 'Ava and Paco see', post: 'baby dolphins.' },
                  { n: 3, pre: 'Ava thinks', post: 'are dangerous.' },
                  { n: 4, pre: 'The time is', post: '.' },
                  { n: 5, pre: 'They can feed the', post: 'at a quarter after three.' },
                ].map((line) => (
                  <View key={line.n} style={styles.blankLineRow}>
                    <Text style={[styles.blankNum, { color: colors.textPrimary }]}>{line.n}</Text>
                    <Text style={[styles.exLineText, { fontSize: 13, color: colors.textPrimary }]}>
                      {line.pre}{' '}
                      <Text style={[styles.blankUnderline, { color: colors.textMuted }]}>{'            '}</Text> {line.post}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Exercise 16 Talk Time Speech Bubbles */}
            <View style={[styles.exHeaderRow, { marginTop: 14 }]}>
              <View style={styles.greenNumCircle}>
                <Text style={styles.greenNumText}>16</Text>
              </View>
              <View style={styles.cdOrangeCircle}>
                <Text style={styles.cdTopText}>CD2</Text>
                <Text style={styles.cdBotText}>13</Text>
              </View>
              <View style={styles.talkTimeBadge}>
                <Text style={styles.talkTimeText}>Talk Time</Text>
              </View>
              <Text style={[styles.exHeaderTitle, { color: colors.textPrimary }]}>Plan a trip for this weekend.</Text>
            </View>

            <View style={styles.bubblesGrid}>
              <View style={[styles.speechBubble, { backgroundColor: isDark ? 'rgba(42, 79, 184, 0.20)' : '#EEF4FF', borderColor: colors.border }]}>
                <Text style={styles.bubbleIcon}>🧭</Text>
                <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>Where would you like to go this weekend?</Text>
              </View>
              <View style={[styles.speechBubble, { backgroundColor: isDark ? 'rgba(194, 59, 90, 0.20)' : '#FDF1F4', borderColor: colors.border }]}>
                <Text style={styles.bubbleIcon}>📍</Text>
                <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>I’d like to go to ...</Text>
              </View>
              <View style={[styles.speechBubble, { backgroundColor: isDark ? 'rgba(180, 83, 9, 0.20)' : '#FFFBEB', borderColor: colors.border }]}>
                <Text style={styles.bubbleIcon}>❓</Text>
                <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>How can you get there?</Text>
              </View>
              <View style={[styles.speechBubble, { backgroundColor: isDark ? 'rgba(14, 124, 112, 0.20)' : '#E6F6F4', borderColor: colors.border }]}>
                <Text style={styles.bubbleIcon}>🚗</Text>
                <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>You can go by ...</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Interactive Layers for static illustrated fallback layout */}
        {!isDocumentVisual && !loadingBook && !offlineMissing && (
          <>
            <HotspotLayer
              hotspots={getHotspotsForPage(pageNum)}
              pageWidth={layerWidth}
              pageHeight={layerHeight}
              onHotspotPress={handleHotspotPress}
            />

            <DrawingHighlighterLayer
              activeTool={activeDrawTool}
              activeColor={drawColor}
              strokeSize={drawSize}
              width={layerWidth}
              height={layerHeight}
              initialStrokes={drawingsMap[pageNum]}
              onStrokesChange={(next) => handleStrokesChangeForPage(pageNum, next)}
            />
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: colors.readerBg }]}>
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.readerChrome,
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 8),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={handleExit}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.textPrimary}
              strokeWidth={2.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>
            {isOfflineSession ? `${strings.common.offlineMode} • ${activeUnitTitle}` : activeUnitTitle}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.pageCountPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setTocModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pageCountPillText, { color: colors.textPrimary }]}>
            {headerPagePillText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => handleToggleBookmark(currentPage)}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
              stroke={isCurrentBookmarked ? colors.primary : colors.textPrimary}
              strokeWidth={2}
              fill={isCurrentBookmarked ? colors.primary : 'none'}
            />
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setTopMenuVisible((v) => !v)}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx={5} cy={12} r={1.8} fill={colors.textPrimary} />
            <Circle cx={12} cy={12} r={1.8} fill={colors.textPrimary} />
            <Circle cx={19} cy={12} r={1.8} fill={colors.textPrimary} />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Main Full-Bleed Canvas */}
      <View
        style={styles.canvasArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 50 && height > 50) {
            setCanvasAreaSize({ width, height });
          }
        }}
      >
        {subscriptionLocked ? (
          <View style={styles.centerState}>
            <Text style={{ fontSize: 42, marginBottom: 10 }}>🔒</Text>
            <Text style={[styles.centerStateText, { fontWeight: '800', color: colors.textPrimary, fontSize: 16 }]}>
              {strings.modals.expiredTitle}
            </Text>
            <Text
              style={[
                styles.centerStateText,
                { textAlign: 'center', marginTop: 6, paddingHorizontal: 26, lineHeight: 20, color: colors.textSecondary },
              ]}
            >
              {strings.modals.expiredDesc}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                onPress={handleExit}
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                  {strings.common.back}
                </Text>
              </TouchableOpacity>
              {onRenewSubscription && (
                <TouchableOpacity
                  onPress={() => {
                    persistCurrentProgress();
                    onRenewSubscription();
                  }}
                  style={{
                    backgroundColor: colors.primaryDark,
                    paddingHorizontal: 18,
                    paddingVertical: 11,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>
                    {strings.modals.expiredAction}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <PinchZoomView
            drawMode={activeDrawTool !== null}
            minScale={1.0}
            maxScale={3.2}
            resetKey={`VERTICAL_${canvasAreaSize.width > canvasAreaSize.height ? 'L' : 'P'}`}
            onZoomLockChange={setZoomLocked}
          >
            <ScrollView
              ref={verticalScrollRef}
              scrollEnabled={activeDrawTool === null && !zoomLocked}
              contentOffset={initialScrollOffset}
              onContentSizeChange={handleVerticalContentSizeChange}
              refreshControl={
                <RefreshControl refreshing={refreshingBook} onRefresh={handlePullRefreshBook} />
              }
              style={[
                styles.verticalScroll,
                { backgroundColor: colors.readerBg },
                Platform.OS === 'web'
                  ? ({
                      overflowY: activeDrawTool ? 'hidden' : 'auto',
                      touchAction: activeDrawTool ? 'none' : 'pan-y',
                    } as any)
                  : null,
              ]}
              contentContainerStyle={styles.verticalContent}
              showsVerticalScrollIndicator={activeDrawTool === null}
              scrollEventThrottle={80}
              onScroll={(e) => {
                if (programmaticScrollRef.current) {
                  return;
                }
                const y = e.nativeEvent.contentOffset.y;
                const approxPage = Math.min(
                  totalPages,
                  Math.max(1, Math.round(y / (vPageHeight + VERTICAL_GAP)) + 1),
                );
                currentPageRef.current = approxPage;
                const now = Date.now();
                if (now - lastScrollUpdateRef.current >= 160) {
                  lastScrollUpdateRef.current = now;
                  if (approxPage !== currentPage) {
                    setCurrentPage(approxPage);
                  }
                }
              }}
              onMomentumScrollEnd={(e) => {
                if (programmaticScrollRef.current) return;
                const y = e.nativeEvent.contentOffset.y;
                const approxPage = Math.min(
                  totalPages,
                  Math.max(1, Math.round(y / (vPageHeight + VERTICAL_GAP)) + 1),
                );
                currentPageRef.current = approxPage;
                setCurrentPage(approxPage);
              }}
              onScrollEndDrag={(e) => {
                if (programmaticScrollRef.current) return;
                const y = e.nativeEvent.contentOffset.y;
                const approxPage = Math.min(
                  totalPages,
                  Math.max(1, Math.round(y / (vPageHeight + VERTICAL_GAP)) + 1),
                );
                currentPageRef.current = approxPage;
                setCurrentPage(approxPage);
              }}
            >
              {Array.from({ length: totalPages }, (_, idx) => {
                const pg = idx + 1;
                const inWindow = Math.abs(pg - currentPage) <= 6 || loadedPages.has(pg);
                const pgObj = pagesByNumberMap.get(pg);
                const versionParam = (book as any).pagesVersion || (book as any).version || '';
                let basePgImgUrl =
                  pgObj?.imageHighUrl ||
                  pgObj?.imageNormalUrl ||
                  `/content/books/${book.id}/pages/${pg}/image`;
                if (versionParam && !basePgImgUrl.includes('?v=')) {
                  basePgImgUrl = `${basePgImgUrl}${basePgImgUrl.includes('?') ? '&' : '?'}v=${versionParam}`;
                }
                const pgImgUrl = resolveMediaOrImageUrl(basePgImgUrl);
                const hsList = getHotspotsForPage(pg);
                const pgRatio = resolvePageAspectRatio(pgObj, pageImageRatios[pg], pdfAspectRatio);
                const cardHeight = Math.max(180, Math.round(vPageWidth * pgRatio));
                const pageBadgeText = formatPdfPageBadge(pg);

                return (
                  <ReaderVerticalPageCard
                    key={`vpage_${pg}`}
                    pageNumber={pg}
                    inWindow={inWindow}
                    isLoaded={loadedPages.has(pg)}
                    pageWidth={vPageWidth}
                    cardHeight={cardHeight}
                    pageImgUrl={pgImgUrl}
                    hasPdf={hasPdf}
                    pdfDoc={pdfDocRef.current}
                    hotspots={hsList}
                    activeDrawTool={activeDrawTool}
                    drawColor={drawColor}
                    drawSize={drawSize}
                    pageStrokes={drawingsMap[pg]}
                    pageBadgeText={pageBadgeText}
                    borderColor={colors.border}
                    cardBg={isDark ? colors.surface : '#FFFFFF'}
                    placeholderBg={isDark ? colors.surfaceAlt : colors.backgroundSecondary}
                    onMarkLoaded={markPageLoaded}
                    onImageDimensionLoaded={handleImageDimensionLoaded}
                    onHotspotPress={handleHotspotPress}
                    onStrokesChange={handleStrokesChangeForPage}
                    renderCustomFallback={renderPageContent}
                  />
                );
              })}
            </ScrollView>
          </PinchZoomView>
        )}

        {/* Floating Marker Studio Toolbar */}
        {activeDrawTool !== null ? (
          <MarkerStudioToolbar
            activeTool={activeDrawTool}
            activeColor={drawColor}
            strokeSize={drawSize}
            scrollLocked={true}
            canUndo={(drawingsMap[currentPage]?.length || 0) > 0}
            strokeCount={drawingsMap[currentPage]?.length || 0}
            currentPage={currentPage}
            displayPageLabel={headerPagePillText}
            onChangeTool={(tool) => selectDrawTool(tool)}
            onChangeColor={setDrawColor}
            onChangeSize={setDrawSize}
            onUndo={handleUndoActivePageStroke}
            onClearPage={handleClearActivePageStrokes}
            onSaveAndClose={handleCloseDrawTool}
          />
        ) : (
        <View
          style={[
            styles.floatingDockContainer,
            { bottom: Math.max(insets.bottom, 6) + 6 },
          ]}
        >
          <View
            style={[
              styles.floatingPillDock,
              {
                backgroundColor: colors.dockBg,
                borderColor: colors.border,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.dockItem}
              onPress={() => setTocModalVisible(true)}
            >
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                  stroke={colors.primaryText}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={[styles.dockLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {strings.reader.contents}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockItem}
              onPress={() => setBmModalState({ visible: true, tab: 'BOOKMARKS' })}
            >
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  stroke={colors.primaryText}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.dockLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {strings.reader.bookmark}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dockItem}
              onPress={() => setBmModalState({ visible: true, tab: 'NOTES' })}
            >
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                  stroke={colors.primaryText}
                  strokeWidth={2}
                />
                <Path
                  d="M14 2v6h6M8 13h8M8 17h5"
                  stroke={colors.primaryText}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={[styles.dockLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {strings.reader.notes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel={strings.reader.marker}
              style={[
                styles.dockItem,
                activeDrawTool !== null && { backgroundColor: colors.primarySoft },
              ]}
              onPress={() => {
                if (activeDrawTool !== null) {
                  handleCloseDrawTool();
                } else {
                  selectDrawTool('HIGHLIGHTER');
                }
              }}
            >
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 11l-6 6v3h9l3-3m-6-6l8.5-8.5a2.12 2.12 0 013 3L12 14m-3-3l3 3"
                  stroke={colors.primaryText}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text
                style={[
                  styles.dockLabel,
                  { color: activeDrawTool !== null ? colors.primaryText : colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {strings.reader.marker}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dockItem} onPress={() => setTopMenuVisible(true)}>
              <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                <Circle cx={5} cy={12} r={1.8} fill={colors.primaryText} />
                <Circle cx={12} cy={12} r={1.8} fill={colors.primaryText} />
                <Circle cx={19} cy={12} r={1.8} fill={colors.primaryText} />
              </Svg>
              <Text style={[styles.dockLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {strings.reader.more}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        )}
      </View>

      {/* Bottom Pagination Strip */}
      <View
        style={[
          styles.paginationFooter,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 24 : 18),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavDisabled]}
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.textPrimary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.pageNavText, { color: colors.textPrimary }]}>
            {strings.reader.previous}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.centerPagePill, { backgroundColor: colors.primarySoft }]}
          onPress={() => setTocModalVisible(true)}
        >
          <Text style={[styles.centerPagePillText, { color: colors.textPrimary }]}>
            {headerPagePillText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavDisabled]}
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <Text style={[styles.pageNavText, { color: colors.textPrimary }]}>
            {strings.reader.next}
          </Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 6l6 6-6 6"
              stroke={colors.textPrimary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Top-Right Popover Menu */}
      <Modal
        visible={topMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTopMenuVisible(false)}
      >
        <View style={styles.popoverOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTopMenuVisible(false)} />

          <View
            style={[
              styles.topPopoverCard,
              {
                top: Platform.OS === 'ios' ? 96 : 52,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.popRow}
              onPress={() => {
                setTopMenuVisible(false);
                setBmModalState({ visible: true, tab: 'BOOKMARKS' });
              }}
            >
              <Text style={styles.popIcon}>🔖</Text>
              <Text style={[styles.popText, { color: colors.textPrimary }]}>
                {strings.reader.bookmark}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popRow}
              onPress={() => {
                setTopMenuVisible(false);
                setBmModalState({ visible: true, tab: 'NOTES' });
              }}
            >
              <Text style={styles.popIcon}>📝</Text>
              <Text style={[styles.popText, { color: colors.textPrimary }]}>
                {strings.reader.notes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popRow}
              onPress={() => {
                setTopMenuVisible(false);
                setMediaModalVisible(true);
              }}
            >
              <Text style={styles.popIcon}>🖼️</Text>
              <Text style={[styles.popText, { color: colors.textPrimary }]}>
                {strings.reader.mediaLibrary}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popRow}
              onPress={() => {
                setTopMenuVisible(false);
                setTocModalVisible(true);
              }}
            >
              <Text style={styles.popIcon}>☰</Text>
              <Text style={[styles.popText, { color: colors.textPrimary }]}>
                {strings.reader.contents}
              </Text>
            </TouchableOpacity>

            <View style={[styles.popDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.popRow}
              onPress={() => {
                setTopMenuVisible(false);
                setActiveAnswerPage(currentPage);
                setAnswerModalVisible(true);
              }}
            >
              <Text style={styles.popIcon}>💡</Text>
              <Text style={[styles.popTextBold, { color: colors.primary }]}>
                {strings.reader.answerKeysTitle}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popRow}
              onPress={() => {
                setTopMenuVisible(false);
                if (activeDrawTool) {
                  handleCloseDrawTool();
                } else {
                  selectDrawTool('HIGHLIGHTER');
                }
              }}
            >
              <Text style={styles.popIcon}>🖍</Text>
              <Text style={[styles.popText, { color: colors.textPrimary }]}>
                {activeDrawTool ? strings.common.close : strings.reader.marker}
              </Text>
            </TouchableOpacity>

            <View style={[styles.popDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.popRow}
              onPress={() => {
                setTopMenuVisible(false);
                if (onOpenSettings) {
                  persistCurrentProgress();
                  onOpenSettings();
                } else {
                  handleExit();
                }
              }}
            >
              <Text style={styles.popIcon}>⚙️</Text>
              <Text style={[styles.popText, { color: colors.textPrimary }]}>
                {strings.nav.settings}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AudioPlayerModal
        visible={audioModal.visible}
        onClose={() => setAudioModal((prev) => ({ ...prev, visible: false }))}
        trackTitle={audioModal.title}
        trackSubtitle={audioModal.subtitle}
        trackUrl={audioModal.url}
        hasTranscript={Boolean(
          audioModal.transcriptImageUrl ||
          audioModal.transcriptText ||
          activeAnswers.some((a: any) => a.transcriptText || a.transcriptImages?.length)
        )}
        onOpenTranscript={() => {
          if (audioModal.transcriptImageUrl) {
            setFloatingTranscriptImage({
              isOpen: true,
              title: `Transkript • ${audioModal.title}`,
              subtitle: `${book.title} • ${strings.common.page} ${currentPage}`,
              imageUrl: audioModal.transcriptImageUrl,
            });
          } else {
            setAnswerTab('TRANSCRIPT');
            setActiveAnswerPage(currentPage);
            setAnswerModalVisible(true);
          }
        }}
      />

      {/* Floating Zero-Overlay Draggable Answer Key Popup */}
      {floatingAnswerImage?.isOpen && (
        <FloatingImagePopup
          isOpen={true}
          onClose={() => setFloatingAnswerImage(null)}
          title={floatingAnswerImage.title}
          subtitle={floatingAnswerImage.subtitle}
          badge={strings.reader.answerKeysTitle}
          type="ANSWER"
          imageUrl={floatingAnswerImage.imageUrl}
          initialOffset={{ x: 10, y: 12 }}
        />
      )}

      {/* Floating Zero-Overlay Draggable Audio Transcript Popup */}
      {floatingTranscriptImage?.isOpen && (
        <FloatingImagePopup
          isOpen={true}
          onClose={() => setFloatingTranscriptImage(null)}
          title={floatingTranscriptImage.title}
          subtitle={floatingTranscriptImage.subtitle}
          type="TRANSCRIPT"
          imageUrl={floatingTranscriptImage.imageUrl}
          initialOffset={{ x: 12, y: 40 }}
        />
      )}

      <VideoPlayerModal
        visible={videoModal.visible}
        onClose={() => setVideoModal((prev) => ({ ...prev, visible: false }))}
        videoTitle={videoModal.title}
        videoSubtitle={videoModal.subtitle}
        videoUrl={videoModal.url}
        lessonNotes={videoModal.notes}
      />

      <AnswerKeySheet
        visible={answerModalVisible}
        onClose={() => {
          setAnswerModalVisible(false);
          setSelectedAnswerHotspotId(null);
        }}
        pageNumber={activeAnswerPage}
        totalPages={totalPages}
        contentStartPdfPage={contentStartPdfPage}
        exerciseLabel={firstAnswer.exerciseLabel}
        teacherPageNumber={firstAnswer.teacherPageNumber}
        solutionText={firstAnswer.solutionText}
        methodologyNotes={firstAnswer.methodologyNotes}
        imageUrl={resolveMediaOrImageUrl(firstAnswer.imageUrl)}
        initialTab={answerTab}
        items={activeAnswers.map((a: any) => ({
          ...a,
          imageUrl: resolveMediaOrImageUrl(a.imageUrl),
          answerImages: (a.answerImages || []).map((u: string) => resolveMediaOrImageUrl(u) || u),
          transcriptImages: (a.transcriptImages || []).map((u: string) => resolveMediaOrImageUrl(u) || u),
          targetMediaUrl: resolveMediaOrImageUrl(a.targetMediaUrl),
        }))}
        selectedHotspotId={selectedAnswerHotspotId}
        onSwitchToTeachersBook={(targetPage) => goToPage(targetPage)}
      />

      <TocSearchDrawer
        visible={tocModalVisible}
        onClose={() => setTocModalVisible(false)}
        totalPages={totalPages}
        currentPage={currentPage}
        contentStartPdfPage={contentStartPdfPage}
        onSelectPage={goToPage}
        tocItems={tocItems}
      />

      <BookmarksNotesDrawer
        visible={bmModalState.visible}
        onClose={() => setBmModalState((prev) => ({ ...prev, visible: false }))}
        currentPage={currentPage}
        totalPages={totalPages}
        contentStartPdfPage={contentStartPdfPage}
        bookmarks={bookmarks}
        notes={notes}
        initialTab={bmModalState.tab}
        onSelectPage={goToPage}
        onToggleBookmark={handleToggleBookmark}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />

      <MediaLibraryDrawer
        visible={mediaModalVisible}
        onClose={() => setMediaModalVisible(false)}
        mediaItems={mediaList}
        onPlayMedia={handlePlayFromLibrary}
      />

      <Modal
        visible={notePopup.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotePopup((p) => ({ ...p, visible: false }))}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setNotePopup((p) => ({ ...p, visible: false }))}
          />
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
              📝 {notePopup.title}
            </Text>
            <Text style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 }}>
              {notePopup.body}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primaryDark, borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}
              onPress={() => setNotePopup((p) => ({ ...p, visible: false }))}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '800', fontSize: 13 }}>{strings.common.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  // 1-to-1 Refined Light Header (Image 1)
  topHeader: {
    backgroundColor: 'rgba(248, 251, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.7)',
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 2,
  },
  modeToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  modeToggleBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 0.5,
  },
  pageCountPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pageCountPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
  },
  canvasWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  canvasWrapCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fittedPageStage: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  centerStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pdfContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pdfHost: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfLoadingPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 6,
    borderRadius: 99,
  },
  pageImageFull: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  // 1-to-1 Light-Blue Sky Textbook Layout
  textbookBg: {
    flex: 1,
    backgroundColor: '#E8F2FF',
  },
  textbookInner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 112,
    position: 'relative',
  },
  skyOrbTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  skyOrbBottomLeft: {
    position: 'absolute',
    bottom: 60,
    left: -60,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  skillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(219, 234, 254, 0.72)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  skillsText: {
    fontSize: 16,
  },
  skillsBold: {
    fontWeight: '900',
    color: '#142452',
  },
  skillsItalic: {
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#2A4FB8',
  },
  skillsAudioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#BAD2FF',
  },
  miniWaveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniBar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: '#0E7C70',
  },
  letsStartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  letsStartPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 5,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  letsStartTag: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAD2FF',
  },
  letsStartTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
  letsStartQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  speakerCircleWhite: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAD2FF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  ex15Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    marginBottom: 10,
  },
  greenNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenNumText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cdOrangeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    borderWidth: 1.5,
    borderColor: '#FB923C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cdTopText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#C2410C',
    lineHeight: 8,
  },
  cdBotText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#9A3412',
    lineHeight: 9,
  },
  exHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 14,
  },
  photoCardWrap: {
    width: '48.2%',
    alignItems: 'center',
  },
  photoFrame: {
    width: '100%',
    height: 108,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 3,
  },
  letterBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#2A4FB8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  letterBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  photoPlayBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -17,
    marginLeft: -17,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCaptionPill: {
    marginTop: -12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '92%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  photoCaptionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  speakerCirclePurple: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0E7C70',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E7C70',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  whiteExerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  blankLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  blankNum: {
    width: 14,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  exLineText: {
    flex: 1,
    color: '#1E293B',
    fontWeight: '500',
    lineHeight: 20,
  },
  blankUnderline: {
    textDecorationLine: 'underline',
    color: '#94A3B8',
  },
  inlineAnswerChip: {
    backgroundColor: '#F4F0FD',
    borderWidth: 1,
    borderColor: '#E6DCFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inlineAnswerChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D3FD1',
  },
  talkTimeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  talkTimeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#16A34A',
  },
  bubblesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  speechBubble: {
    width: '48.5%',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  bubbleIcon: {
    fontSize: 15,
  },
  bubbleText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 15,
  },
  // Bottom Floating Action Pill Bar + Bottom Pagination Strip
  floatingDockContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 6,
    zIndex: 20,
  },
  floatingPillDock: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  dockItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dockItemActive: {
    backgroundColor: '#EEF4FF',
  },
  dockLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#5B6672',
  },
  dockLabelActive: {
    color: '#2A4FB8',
  },
  paginationFooter: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pageNavDisabled: {
    opacity: 0.35,
  },
  pageNavText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  centerPagePill: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  centerPagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A4FB8',
  },
  // Top-Right Dropdown Popover (Image 2)
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
  },
  topPopoverCard: {
    position: 'absolute',
    right: 14,
    width: 215,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
    elevation: 10,
  },
  popRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  popIcon: {
    fontSize: 15,
    width: 20,
    textAlign: 'center',
  },
  popText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  popTextBold: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#2A4FB8',
  },
  popDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
    marginHorizontal: 10,
  },
  // Vertical Scrolling Reading Mode
  verticalScroll: {
    flex: 1,
  },
  verticalContent: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 80,
  },
  verticalPageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.7)',
  },
  verticalPageBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 25,
  },
  verticalPageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  verticalPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  verticalPlaceholderNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
  },
});
