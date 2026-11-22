import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import {
  Book,
  Grade,
  getBookContentTotalPages,
  pdfPageToBookDisplay,
} from '@smartteacherbook/shared';
import { SubscriptionManager, GradeAccessInfo } from '../services/subscription/subscriptionManager';
import { ExpiredAccessModal } from '../components/ExpiredAccessModal';
import { mobileApi } from '../services/api/mobileApi';
import { DownloadsManager } from '../services/storage/downloadsManager';
import { offlineCatalogCache } from '../services/storage/offlineCatalogCache';
import { readingProgressStore } from '../services/storage/readingProgressStore';
import { readerBenchmark } from '../utils/readerBenchmark';
import { notify } from '../services/notifications/notificationService';
import { UserAvatar } from '../components/common/UserAvatar';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import { matchesBookSearch, matchesGradeSearch } from '../utils/searchMatch';
import {
  HeroBannerSkeleton,
  ContinueReadingSkeleton,
  GradesRowSkeleton,
  BookCardSkeleton,
} from '../components/common/Skeleton';

interface HomeScreenProps {
  userEmail: string;
  userName?: string;
  photoUrl?: string;
  onOpenMenu?: () => void;
  onOpenReader: (book: {
    id: string;
    title: string;
    gradeId: number;
    subjectId: string;
    totalPages: number;
    contentStartPdfPage?: number;
    type?: string;
    initialPage?: number;
  }) => void;
  onOpenGradeDetail: (grade: number, subjectCode?: string) => void;
  onOpenRequests: (grade?: number, subjectCode?: string) => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userEmail = '',
  userName,
  photoUrl,
  onOpenMenu,
  onOpenReader,
  onOpenGradeDetail,
  onOpenRequests,
  onOpenSettings,
}) => {
  const { colors, isDark } = useTheme();
  const { strings, t, formatGrade, formatSubject, formatBookType } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [loading, setLoading] = useState<boolean>(() => !offlineCatalogCache.getGradesSync()?.length);
  const [refreshing, setRefreshing] = useState(false);

  const [allAccess, setAllAccess] = useState<GradeAccessInfo[]>([]);
  const [availableGrades, setAvailableGrades] = useState<Grade[]>(() => offlineCatalogCache.getGradesSync() || []);
  const [subjects, setSubjects] = useState<any[]>(() => offlineCatalogCache.getSubjectsSync() || []);
  const [liveBooks, setLiveBooks] = useState<Book[]>(() => offlineCatalogCache.getBooksSync() || []);
  const [progressList, setProgressList] = useState<any[]>(() => offlineCatalogCache.getProgressSync() || []);

  const [expiredModalVisible, setExpiredModalVisible] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [lockedTarget, setLockedTarget] = useState<{
    grade: number;
    subjectId?: string;
    subjectName: string;
    isExpired: boolean;
  }>({
    grade: 11,
    subjectId: undefined,
    subjectName: strings.common.book,
    isExpired: false,
  });

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (expiredModalVisible) {
        setExpiredModalVisible(false);
        return true;
      }
      if (searchQuery.trim().length > 0) {
        setSearchQuery('');
        Keyboard.dismiss();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [expiredModalVisible, searchQuery]);

  const loadHomeData = useCallback(async () => {
    try {
      // 1. Instant Cache Hydration (stale-while-revalidate for frame-0 render)
      const [cachedGrades, cachedSubjects, cachedBooks, cachedProgress, localAccess] =
        await Promise.all([
          offlineCatalogCache.getGrades(),
          offlineCatalogCache.getSubjects(),
          offlineCatalogCache.getBooks(),
          offlineCatalogCache.getProgress(),
          SubscriptionManager.getAllActiveAccess(),
        ]);
      const downloaded = DownloadsManager.listDownloadedBundles();
      if (localAccess && localAccess.length > 0) setAllAccess(localAccess);
      if (cachedGrades && cachedGrades.length > 0) {
        setAvailableGrades([...cachedGrades].sort((a, b) => a.gradeNumber - b.gradeNumber));
      } else if (downloaded.length > 0) {
        const grades = Array.from(new Set(downloaded.map((d) => d.gradeId)))
          .sort((a, b) => a - b)
          .map((n) => ({ id: n, gradeNumber: n, label: `${n}`, isActive: true } as any));
        setAvailableGrades(grades);
      }
      if (cachedSubjects && cachedSubjects.length > 0) setSubjects(cachedSubjects);
      if ((cachedBooks && cachedBooks.length > 0) || downloaded.length > 0) {
        setLiveBooks(offlineCatalogCache.mergeBooksWithDownloads(cachedBooks, downloaded));
      }
      if (cachedProgress && cachedProgress.length > 0) {
        setProgressList(cachedProgress);
      }
      if (cachedGrades?.length || cachedBooks?.length) {
        setLoading(false);
      }

      // 2. Parallel network refresh with zero blocking ping
      try {
        const [accessData, gradesData, subjData, booksData, progData] = await Promise.all([
          SubscriptionManager.syncFromBackend().catch(() => SubscriptionManager.getAllActiveAccess()),
          mobileApi.getGrades(),
          mobileApi.getSubjects(),
          mobileApi.getAllBooks(),
          mobileApi.getReadingProgress(),
        ]);
        setIsOfflineMode(false);
        if (accessData) setAllAccess(accessData);
        if (Array.isArray(gradesData) && gradesData.length > 0) {
          const sorted = [...gradesData].sort((a, b) => a.gradeNumber - b.gradeNumber);
          setAvailableGrades(sorted);
          offlineCatalogCache.saveGrades(sorted);
        }
        if (Array.isArray(subjData) && subjData.length > 0) {
          setSubjects(subjData);
          offlineCatalogCache.saveSubjects(subjData);
        }
        if (Array.isArray(booksData) && booksData.length > 0) {
          setLiveBooks(booksData);
          offlineCatalogCache.saveBooks(booksData);
        }
        const mergedOnlineProgress = await readingProgressStore.mergeRemoteAndLocal(
          userEmail,
          Array.isArray(progData) ? progData : [],
        );
        setProgressList(mergedOnlineProgress);
        offlineCatalogCache.saveProgress(mergedOnlineProgress);
      } catch {
        setIsOfflineMode(true);
      }
    } catch (err: any) {
      notify.warning(strings.common.error, err?.message || strings.common.unknownError);
    } finally {
      setLoading(false);
    }
  }, [userEmail, strings.common.error, strings.common.unknownError]);

  useEffect(() => {
    loadHomeData();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadHomeData();
      }
    });
    return () => sub.remove();
  }, [loadHomeData]);

  const activeSubs = allAccess.filter((a) => SubscriptionManager.isAccessValid(a));
  const primarySub = activeSubs[0] || null;
  const expiringSub = activeSubs.find(
    (s) => typeof s.daysRemaining === 'number' && s.daysRemaining <= 3 && s.daysRemaining >= 0,
  );
  const resolvedUserName = (userName || strings.common.userFallback).trim();
  const firstName = useMemo(() => {
    // 1. If explicit multi-word name is provided
    if (userName && userName.trim()) {
      const parts = userName.trim().split(/\s+/);
      if (parts.length > 1) {
        if (/(ov|ova|ev|eva|iy|zoda)$/i.test(parts[0])) {
          return parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
        }
        if (/(ov|ova|ev|eva|iy|zoda)$/i.test(parts[1])) {
          return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        }
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
      }
    }

    // 2. Extract from email or concatenated username
    const sourceString = (userEmail ? userEmail.split('@')[0] : (userName || '')).toLowerCase();
    if (sourceString) {
      // Check for dot/underscore/hyphen separation (e.g. qosimov.rahmonjon)
      const segments = sourceString.split(/[._\-]/).filter((s) => s.length >= 2);
      if (segments.length > 1) {
        if (/(ov|ova|ev|eva|iy|zoda)$/i.test(segments[0])) {
          const clean = segments[1].replace(/[0-9]/g, '');
          if (clean.length >= 2) return clean.charAt(0).toUpperCase() + clean.slice(1);
        }
        const clean = segments[0].replace(/[0-9]/g, '');
        if (clean.length >= 2) return clean.charAt(0).toUpperCase() + clean.slice(1);
      }

      // Check for concatenated surname + firstname (e.g. qosimovrahmonjon0927 -> qosimov + rahmonjon)
      const compoundMatch = sourceString.match(/^(?:.*?(?:ov|ova|ev|eva|iy|zoda))([a-z]{2,})/i);
      if (compoundMatch && compoundMatch[1]) {
        const clean = compoundMatch[1].replace(/[0-9]/g, '');
        if (clean.length >= 2) {
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        }
      }

      // If userName is a single word surname and email has the rest
      if (userName && userName.trim() && userEmail) {
        const uLower = userName.trim().toLowerCase();
        if (sourceString.startsWith(uLower)) {
          const rest = sourceString.slice(uLower.length).replace(/[0-9_\-.]/g, '');
          if (rest.length >= 2) {
            return rest.charAt(0).toUpperCase() + rest.slice(1);
          }
        }
      }

      // Fallback clean alphabetic letters
      const cleanLetters = sourceString.replace(/[0-9_\-.]/g, '');
      if (cleanLetters.length >= 2) {
        return cleanLetters.charAt(0).toUpperCase() + cleanLetters.slice(1);
      }
    }

    if (userName && userName.trim()) {
      const clean = userName.trim().split(/\s+/)[0].replace(/[0-9_\-.]/g, '');
      if (clean.length >= 2) return clean.charAt(0).toUpperCase() + clean.slice(1);
      return userName.trim();
    }

    return resolvedUserName.split(' ')[0];
  }, [userName, userEmail, resolvedUserName]);

  const onRefresh = async () => {
    setRefreshing(true);
    await SubscriptionManager.syncFromBackend().catch(() => {});
    await loadHomeData();
    setRefreshing(false);
  };

  const resolveSubjectName = useCallback(
    (subjectId?: string | null) => {
      if (!subjectId) return strings.common.allSubjects;
      const found = subjects.find(
        (s) =>
          s.id === subjectId ||
          s.code.toLowerCase() === subjectId.toLowerCase() ||
          subjectId.toLowerCase().includes(s.code.toLowerCase()),
      );
      return formatSubject(found?.name, found?.id || subjectId);
    },
    [subjects, formatSubject, strings.common.allSubjects],
  );

  const getBookDisplaySizeMb = (book: any) => {
    const dlItem = DownloadsManager.listDownloadedBundles().find((d) => d.bookId === book.id);
    if (dlItem?.sizeBytes && dlItem.sizeBytes > 0) {
      return `${(dlItem.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    const rawBytes = book.totalSizeBytes || book.sizeBytes || book.fileSizeBytes;
    if (rawBytes && rawBytes > 0) {
      return `${(rawBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    const pages = Number(book.totalPages || 40);
    const estimated = Math.max(12, Math.round((pages * 380 * 1024) / (1024 * 1024)));
    return `~${estimated} MB`;
  };

  const handleOpenBookCard = async (book: {
    id: string;
    title: string;
    gradeId: number;
    subjectId: string;
    totalPages: number;
    contentStartPdfPage?: number;
    type?: string;
    initialPage?: number;
  }) => {
    readerBenchmark.markT0(book.id);
    await DownloadsManager.init().catch(() => {});
    const isDl = DownloadsManager.isBundleDownloaded(book.gradeId, book.subjectId, book.id);
    const online = !isOfflineMode;

    const savedProgress = readingProgressStore.getBookProgressSync(userEmail, book.id);
    const resolvedInitialPage = book.initialPage || savedProgress?.lastPageNumber || 1;

    if (!online && !isDl) {
      notify.warning(
        strings.modals.offlineTitle || 'Oflayn rejim',
        'Bu kitob qurilmaga yuklanmagan. Oflayn rejimda faqat yuklab olingan darsliklarni öqişingiz mumkin.',
      );
      return;
    }

    // Optimistic Instant Open: if access is already valid in memory, open reader immediately (<15ms)
    const cachedAccess = SubscriptionManager.getCachedGradeAccess(book.gradeId || 11);
    const hasCachedAccess =
      cachedAccess &&
      (SubscriptionManager.isAccessValid(cachedAccess) || (isDl && cachedAccess.status !== 'EXPIRED'));
    if (hasCachedAccess) {
      readerBenchmark.markT1();
      onOpenReader({
        ...book,
        initialPage: resolvedInitialPage,
      });

      // Background re-validation (non-blocking)
      SubscriptionManager.checkBookAccess({
        bookId: book.id,
        gradeId: book.gradeId || 11,
        subjectId: book.subjectId,
      }).catch(() => {});
      return;
    }

    const { allowed, access } = await SubscriptionManager.checkBookAccess({
      bookId: book.id,
      gradeId: book.gradeId || 11,
      subjectId: book.subjectId,
    });
    readerBenchmark.markT1();
    if (allowed || (!online && isDl && access.status !== 'EXPIRED')) {
      onOpenReader({
        ...book,
        initialPage: resolvedInitialPage,
      });
      return;
    }
    notify.warning(
      access.status === 'EXPIRED' ? strings.modals.expiredTitle : strings.grades.lockedBadge,
      strings.modals.expiredDesc,
    );
    setLockedTarget({
      grade: book.gradeId || availableGrades[0]?.gradeNumber || 1,
      subjectId: book.subjectId,
      subjectName: resolveSubjectName(book.subjectId),
      isExpired: access.status === 'EXPIRED',
    });
    setExpiredModalVisible(true);
  };

  const hasBookSubscription = useCallback(
    (book: { gradeId?: number; subjectId?: string | null }) =>
      activeSubs.some((sub) => {
        if (sub.gradeId !== Number(book.gradeId)) return false;
        if (!sub.subjectId || !book.subjectId) return true;
        const norm = (v: string) => v.trim().toLowerCase().replace(/^sub_/, '');
        return norm(sub.subjectId) === norm(book.subjectId);
      }),
    [activeSubs],
  );

  const subscribedBooks = activeSubs.length > 0 ? liveBooks.filter((b) => hasBookSubscription(b)) : [];

  const subscribedProgress = progressList.filter((p) => {
    const matched = subscribedBooks.find((b) => b.id === p.bookId);
    if (matched) return true;
    return activeSubs.some((s) => s.gradeId === p.gradeId);
  });
  const latestProgress = subscribedProgress[0];
  const fallbackSubscribedBook = subscribedBooks[0];
  const progressBook = latestProgress
    ? subscribedBooks.find((b) => b.id === latestProgress.bookId) || fallbackSubscribedBook
    : fallbackSubscribedBook;
  const continueItem =
    activeSubs.length === 0
      ? null
      : latestProgress
      ? {
          id: latestProgress.bookId,
          title: progressBook?.title || latestProgress.bookTitle || strings.common.book,
          gradeId: progressBook?.gradeId || latestProgress.gradeId || activeSubs[0].gradeId,
          subjectId: progressBook?.subjectId || latestProgress.subjectId || 'sub_eng',
          totalPages: progressBook?.totalPages || latestProgress.totalPages || 96,
          contentStartPdfPage: (progressBook as any)?.contentStartPdfPage,
          lastPage: latestProgress.lastPageNumber || 1,
          coverImageUrl: progressBook?.coverImageUrl || latestProgress.coverImageUrl || null,
        }
      : fallbackSubscribedBook
      ? {
          id: fallbackSubscribedBook.id,
          title: fallbackSubscribedBook.title,
          gradeId: fallbackSubscribedBook.gradeId || activeSubs[0].gradeId,
          subjectId: fallbackSubscribedBook.subjectId || 'sub_eng',
          totalPages: fallbackSubscribedBook.totalPages || 96,
          contentStartPdfPage: (fallbackSubscribedBook as any).contentStartPdfPage,
          lastPage: 1,
          coverImageUrl: fallbackSubscribedBook.coverImageUrl || null,
        }
      : null;

  // Instant Pre-fetch: pre-fetches the active reading page in the background while user browses Home
  useEffect(() => {
    if (continueItem?.id && continueItem?.lastPage) {
      const pageNum = continueItem.lastPage;
      const url = `${mobileApi.API_BASE}/content/books/${continueItem.id}/pages/${pageNum}/image`;
      Image.prefetch(url).catch(() => {});
      if (pageNum < (continueItem.totalPages || 96)) {
        Image.prefetch(`${mobileApi.API_BASE}/content/books/${continueItem.id}/pages/${pageNum + 1}/image`).catch(() => {});
      }
    }
  }, [continueItem?.id, continueItem?.lastPage, continueItem?.totalPages]);

  const trimmedSearch = debouncedSearch.trim();

  const {
    subscribedSearchResults,
    lockedSearchResults,
    totalSearchMatches,
  } = useMemo<{
    subscribedSearchResults: Book[];
    lockedSearchResults: Book[];
    totalSearchMatches: number;
  }>(() => {
    if (!trimmedSearch) {
      return { subscribedSearchResults: [], lockedSearchResults: [], totalSearchMatches: 0 };
    }
    const sub = liveBooks.filter((b: Book) => hasBookSubscription(b) && matchesBookSearch(b, trimmedSearch, subjects));
    const locked = liveBooks.filter((b: Book) => !hasBookSubscription(b) && matchesBookSearch(b, trimmedSearch, subjects));
    return {
      subscribedSearchResults: sub,
      lockedSearchResults: locked,
      totalSearchMatches: sub.length + locked.length,
    };
  }, [trimmedSearch, liveBooks, hasBookSubscription, subjects]);

  const findSavedPageForBook = (bookId: string): number | undefined => {
    const found = progressList.find((p) => p.bookId === bookId);
    return found?.lastPageNumber > 1 ? found.lastPageNumber : undefined;
  };

  const existingGradeNums = availableGrades.map((g) => g.gradeNumber).sort((a, b) => a - b);
  const existingGradeSet = new Set(existingGradeNums);
  const fallbackDefaultGrade = activeSubs[0]?.gradeId || existingGradeNums[0] || 1;

  const myGradesList = Array.from(new Set(activeSubs.map((a) => a.gradeId)))
    .filter((g) => (existingGradeNums.length > 0 ? existingGradeSet.has(g) : true))
    .sort((a, b) => a - b);

  const searchableGradeNums = Array.from(new Set([...existingGradeNums, ...myGradesList])).sort(
    (a, b) => a - b,
  );

  const matchingGradesSearch = useMemo<number[]>(() => {
    if (!trimmedSearch) return [];
    return searchableGradeNums.filter((gradeNum: number) => {
      const gradeSubIds = [
        ...activeSubs.filter((a) => a.gradeId === gradeNum).map((s) => s.subjectId),
        ...liveBooks.filter((b) => Number(b.gradeId) === gradeNum).map((b) => b.subjectId),
      ];
      return matchesGradeSearch(gradeNum, trimmedSearch, gradeSubIds, subjects);
    });
  }, [trimmedSearch, searchableGradeNums, activeSubs, liveBooks, subjects]);

  const displayedGrades = myGradesList.slice(0, 6);

  const formatPageProgressText = (pdfPage: number, totalPdfPages: number, startPage?: number) => {
    const mapped = pdfPageToBookDisplay(pdfPage, totalPdfPages, startPage);
    const totalContent = getBookContentTotalPages(totalPdfPages, startPage);
    if (mapped.isFrontMatter) {
      return `${t('reader.introLabel', { n: mapped.frontMatterIndex })} (${totalContent} ${strings.common.pages})`;
    }
    return t('home.lastPageInfo', { page: mapped.bookPage ?? pdfPage, total: totalContent });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* TOP HEADER */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]} numberOfLines={1}>
                {strings.home.subtitle}
              </Text>
              <Text style={[styles.greetingName, { color: colors.textPrimary }]} numberOfLines={1}>
                {`Salom, ${firstName}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onOpenSettings} activeOpacity={0.75}>
            <UserAvatar name={resolvedUserName} email={userEmail} photoUrl={photoUrl} size={46} />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 9 }}>
            <Circle cx={11} cy={11} r={7} stroke={colors.placeholder} strokeWidth={2} />
            <Path d="M20 20l-3.5-3.5" stroke={colors.placeholder} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={strings.home.searchPlaceholder}
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => Keyboard.dismiss()}
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={[styles.clearSearchBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={strings.home.clearSearch}
            >
              <Text style={[styles.clearSearch, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SEARCH RESULTS */}
        {trimmedSearch.length > 0 && (
          <View style={styles.searchResultsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 10 }]}>
              {t('home.searchResultsTitle', {
                count: totalSearchMatches + matchingGradesSearch.length,
              })}
            </Text>

            {matchingGradesSearch.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ marginBottom: 10 }}
              >
                {matchingGradesSearch.map((gradeNum: number) => {
                  const isSubscribedGrade = myGradesList.includes(gradeNum);
                  return (
                    <TouchableOpacity
                      key={`sgrade_${gradeNum}`}
                      style={[
                        styles.searchGradeChip,
                        {
                          backgroundColor: isSubscribedGrade ? colors.primarySoft : colors.surface,
                          borderColor: isSubscribedGrade ? colors.primary + '44' : colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        Keyboard.dismiss();
                        onOpenGradeDetail(gradeNum);
                      }}
                    >
                      <Text
                        style={[
                          styles.searchGradeChipText,
                          { color: isSubscribedGrade ? colors.primaryText : colors.textPrimary },
                        ]}
                      >
                        {isSubscribedGrade ? '📚' : '🔒'} {formatGrade(gradeNum)} ›
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {totalSearchMatches === 0 && matchingGradesSearch.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emptyEmoji}>🔎</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {strings.home.searchEmptyTitle}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {t('home.searchEmptyDesc', { query: searchQuery.trim() })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.searchResetPill, { backgroundColor: colors.surfaceAlt }]}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={[styles.searchResetText, { color: colors.textSecondary }]}>
                    {strings.common.clear}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {subscribedSearchResults.map((b: Book) => {
                  const savedPg = findSavedPageForBook(b.id);
                  const totalContent = getBookContentTotalPages(
                    b.totalPages || 96,
                    (b as any).contentStartPdfPage,
                  );
                  const isDl = DownloadsManager.isBundleDownloaded(b.gradeId, b.subjectId, b.id);
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.continueCard,
                        { backgroundColor: colors.cardBg, borderColor: colors.border },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleOpenBookCard({
                          id: b.id,
                          title: b.title,
                          gradeId: b.gradeId,
                          subjectId: b.subjectId,
                          totalPages: b.totalPages || 96,
                          contentStartPdfPage: (b as any).contentStartPdfPage,
                          type: b.type,
                          initialPage: savedPg,
                        });
                      }}
                    >
                      {b.coverImageUrl ? (
                        <Image
                          source={{ uri: b.coverImageUrl }}
                          style={[styles.miniCoverImg, { backgroundColor: colors.primarySoft }]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.miniCoverBox, { backgroundColor: colors.primarySoft }]}>
                          <Text style={styles.miniCoverEmoji}>
                            {b.type === 'TEACHER_BOOK' ? '💡' : b.type === 'WORKBOOK' ? '✏️' : '📘'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.continueInfo}>
                        <Text
                          style={[styles.continueTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {b.title}
                        </Text>
                        <Text style={[styles.continueSub, { color: colors.textSecondary }]}>
                          {formatGrade(b.gradeId)} • {resolveSubjectName(b.subjectId)} • {totalContent}{' '}
                          {strings.common.pages} • {getBookDisplaySizeMb(b)}
                          {isDl ? ` • ${strings.home.offlineReadyBadge}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.searchOpenBadge, { backgroundColor: colors.primarySoft }]}>
                        <Text style={[styles.searchOpenBadgeText, { color: colors.primaryText }]}>
                          {strings.home.openBook}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {lockedSearchResults.map((b: Book) => (
                  <TouchableOpacity
                    key={`locked_${b.id}`}
                    style={[
                      styles.continueCard,
                      {
                        opacity: 0.9,
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleOpenBookCard({
                        id: b.id,
                        title: b.title,
                        gradeId: b.gradeId,
                        subjectId: b.subjectId,
                        totalPages: b.totalPages || 96,
                        contentStartPdfPage: (b as any).contentStartPdfPage,
                        type: b.type,
                      });
                    }}
                  >
                    <View style={[styles.miniCoverBox, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={styles.miniCoverEmoji}>🔒</Text>
                    </View>
                    <View style={styles.continueInfo}>
                      <Text
                        style={[styles.continueTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {b.title}
                      </Text>
                      <Text style={[styles.continueSub, { color: colors.textSecondary }]}>
                        {formatGrade(b.gradeId)} • {resolveSubjectName(b.subjectId)} •{' '}
                        {strings.grades.lockedBadge}
                      </Text>
                    </View>
                    <Text style={[styles.chevronRight, { color: colors.textMuted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        {/* EXPIRING SUBSCRIPTION BANNER (<= 3 days remaining) */}
        {expiringSub && (
          <View
            style={[
              styles.expiringBanner,
              {
                backgroundColor: isDark ? 'rgba(180, 83, 9, 0.22)' : '#FFFBEB',
                borderColor: isDark ? 'rgba(180, 83, 9, 0.40)' : 'rgba(180, 83, 9, 0.25)',
              },
            ]}
          >
            <View style={styles.expiringBannerLeft}>
              <Text style={styles.expiringAlertIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.expiringBannerTitle,
                    { color: isDark ? '#FBBF24' : '#B45309' },
                  ]}
                >
                  {t('dashboard.expiringWarning')}
                </Text>
                <Text
                  style={[
                    styles.expiringBannerDesc,
                    { color: isDark ? '#FBBF24' : '#92400E' },
                  ]}
                >
                  {t('dashboard.expiringDesc', {
                    grade: formatGrade(expiringSub.gradeId),
                    days:
                      expiringSub.daysRemaining <= 0
                        ? t('dashboard.todayLastDay')
                        : t('dashboard.daysRemaining', { n: expiringSub.daysRemaining }),
                  })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.expiringBannerBtn, { backgroundColor: isDark ? '#FBBF24' : '#B45309' }]}
              onPress={() => onOpenRequests(expiringSub.gradeId, expiringSub.subjectId || undefined)}
              activeOpacity={0.8}
            >
              <Text style={styles.expiringBannerBtnText}>
                {t('dashboard.extendSubscriptionBtn') || 'Uzaytirish'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HERO CARD */}
        {loading ? (
          <HeroBannerSkeleton />
        ) : primarySub ? (
          <TouchableOpacity
            style={[
              styles.heroActiveCard,
              {
                backgroundColor: colors.subscriptionCard,
                borderColor: colors.accentSoftBorder,
                borderWidth: 1,
                shadowColor: colors.shadowColor,
              },
            ]}
            activeOpacity={0.9}
            onPress={() => onOpenGradeDetail(primarySub.gradeId, primarySub.subjectId || undefined)}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.heroOverline, { color: isDark ? colors.accentText : colors.accentSoftText }]}>
                  {strings.home.activePlanBadge}
                </Text>
                <Text style={[styles.heroMainTitle, { color: isDark ? colors.textPrimary : colors.accentSoftText }]}>
                  {formatGrade(primarySub.gradeId)}, {resolveSubjectName(primarySub.subjectId)}
                </Text>
              </View>
              <View style={[styles.faolPill, { backgroundColor: colors.successSoft }]}>
                <Text style={[styles.faolPillText, { color: colors.successText }]}>{strings.common.active}</Text>
              </View>
            </View>

            <View style={styles.heroFooter}>
              <View style={{ flex: 1, marginRight: 14 }}>
                <View style={[styles.heroProgressBg, { backgroundColor: colors.progressTrack }]}>
                  <View
                    style={[
                      styles.heroProgressFill,
                      {
                        backgroundColor: colors.progressFill,
                        width: `${Math.min(
                          100,
                          Math.max(12, Math.round((primarySub.daysRemaining / 30) * 100)),
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.heroDaysLeft, { color: colors.textSecondary }]}>
                    {t('dashboard.daysRemaining', { n: primarySub.daysRemaining }) || `${primarySub.daysRemaining} kun qoldi`}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentText }}>
                    {t('dashboard.extendSubscriptionBtn') || 'Uzaytirish'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.heroInactiveCard,
              {
                backgroundColor: colors.subscriptionCard,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.9}
            onPress={() => onOpenRequests(fallbackDefaultGrade)}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroOverline, { color: isDark ? colors.accentText : colors.accentSoftText }]}>
                  {strings.home.freePlanBadge}
                </Text>
                <Text style={[styles.heroMainTitle, { color: isDark ? colors.textPrimary : colors.accentSoftText }]}>
                  {strings.home.upgradeBannerTitle}
                </Text>
                <Text style={[styles.heroSubDesc, { color: colors.textSecondary }]}>{strings.home.upgradeBannerDesc}</Text>
              </View>
              <View style={[styles.activatePill, { backgroundColor: colors.primary }]}>
                <Text style={[styles.activatePillText, { color: colors.onPrimary }]}>{strings.home.upgradeBannerBtn}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* CONTINUE READING SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {strings.home.continueReading}
          </Text>
          {activeSubs.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                onOpenGradeDetail(
                  primarySub?.gradeId || fallbackDefaultGrade,
                  primarySub?.subjectId || undefined,
                )
              }
            >
              <Text style={[styles.seeAllText, { color: colors.accentText }]}>
                {strings.home.seeAll} ›
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ContinueReadingSkeleton />
        ) : continueItem ? (
          <TouchableOpacity
            style={[
              styles.continueCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.border,
                shadowColor: colors.shadowColor,
              },
            ]}
            activeOpacity={0.85}
            onPress={() =>
              handleOpenBookCard({
                id: continueItem.id,
                title: continueItem.title,
                gradeId: continueItem.gradeId,
                subjectId: continueItem.subjectId,
                totalPages: continueItem.totalPages,
                contentStartPdfPage: continueItem.contentStartPdfPage,
                initialPage: continueItem.lastPage,
              })
            }
          >
            {continueItem.coverImageUrl ? (
              <Image
                source={{ uri: continueItem.coverImageUrl }}
                style={[styles.continueCoverImg, { backgroundColor: colors.primarySoft }]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[styles.continueCoverPlaceholder, { backgroundColor: colors.primarySoft }]}
              >
                <Text style={styles.continueCoverEmoji}>🏫</Text>
              </View>
            )}

            <View style={styles.continueInfo}>
              <Text style={[styles.continueTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {continueItem.title}
              </Text>
              <Text style={[styles.continueSub, { color: colors.textSecondary }]}>
                {formatGrade(continueItem.gradeId)} •{' '}
                {formatPageProgressText(
                  continueItem.lastPage,
                  continueItem.totalPages,
                  continueItem.contentStartPdfPage,
                )}
              </Text>
              <View style={[styles.miniProgressTrack, { backgroundColor: colors.progressTrack }]}>
                <View
                  style={[
                    styles.miniProgressFill,
                    {
                      backgroundColor: colors.progressFill,
                      width: `${Math.min(
                        100,
                        Math.max(
                          8,
                          Math.round(
                            (continueItem.lastPage / Math.max(1, continueItem.totalPages)) * 100,
                          ),
                        ),
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.playCircle, { backgroundColor: colors.primary }]}>
              <Text style={[styles.playChevron, { color: colors.onPrimary }]}>›</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.emptyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            activeOpacity={0.8}
            onPress={() => onOpenRequests(fallbackDefaultGrade)}
          >
            <Text style={styles.emptyEmoji}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {strings.requests.noActiveSubscriptions}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {strings.home.upgradeBannerDesc}
              </Text>
            </View>
            <Text style={[styles.chevronRight, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        )}

        {/* MY GRADES SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {strings.home.gradesSection}
          </Text>
          <TouchableOpacity
            style={[styles.addGradeCircle, { backgroundColor: colors.primarySoft }]}
            onPress={() => onOpenRequests()}
            activeOpacity={0.75}
          >
            <Text style={[styles.addGradePlus, { color: colors.primaryText }]}>+</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ marginTop: 8 }}>
            <GradesRowSkeleton count={5} />
            <View style={{ height: 12 }} />
            <BookCardSkeleton />
            <BookCardSkeleton />
          </View>
        ) : displayedGrades.length === 0 ? (
          <TouchableOpacity
            style={[
              styles.emptyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            activeOpacity={0.85}
            onPress={() => onOpenRequests(fallbackDefaultGrade)}
          >
            <Text style={styles.emptyEmoji}>📚</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {strings.requests.noActiveSubscriptions}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {strings.home.noBooksYet}
              </Text>
            </View>
            <Text style={[styles.chevronRight, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.myGradesGrid}>
            {displayedGrades.map((g) => {
              const access = allAccess.find((a) => a.gradeId === g);
              const isActive = access ? SubscriptionManager.isAccessValid(access) : false;
              const booksCount = subscribedBooks.filter((b) => Number(b.gradeId) === g).length;

              return (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.gradeTileCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isActive ? colors.primary : colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => onOpenGradeDetail(g)}
                  activeOpacity={0.82}
                >
                  <View style={styles.gradeTileTop}>
                    <View
                      style={[
                        styles.gradeNumberBadge,
                        { backgroundColor: isActive ? colors.primary : colors.disabledChip },
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradeNumberText,
                          { color: isActive ? colors.onPrimary : colors.textMuted },
                        ]}
                      >
                        {g}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.gradeStatusDot,
                        { backgroundColor: isActive ? colors.successText : 'transparent' },
                      ]}
                    />
                  </View>

                  <Text style={[styles.gradeTileTitle, { color: colors.textPrimary }]}>
                    {formatGrade(g)}
                  </Text>
                  <Text style={[styles.gradeTileSub, { color: isActive ? colors.textSecondary : colors.textMuted }]}>
                    {booksCount > 0
                      ? t('grades.booksCountLabel', { count: booksCount })
                      : isActive
                      ? strings.home.activePlanBadge
                      : strings.grades.lockedBadge}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <ExpiredAccessModal
        visible={expiredModalVisible}
        gradeNumber={lockedTarget.grade}
        subjectId={lockedTarget.subjectId}
        subjectName={lockedTarget.subjectName}
        isExpired={lockedTarget.isExpired}
        onClose={() => setExpiredModalVisible(false)}
        onRequestAccess={() => onOpenRequests(lockedTarget.grade, lockedTarget.subjectId)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 96,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  menuIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingVertical: 0,
    fontSize: 13.5,
    fontWeight: '500',
    includeFontPadding: false,
  },
  clearSearchBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearSearch: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultsSection: {
    marginBottom: 18,
  },
  searchGradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  searchGradeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchOpenBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  searchOpenBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  searchResetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  searchResetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expiringBanner: {
    borderRadius: DS.radius.lg,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    flexDirection: 'column',
    gap: 10,
  },
  expiringBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expiringAlertIcon: {
    fontSize: 22,
  },
  expiringBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  expiringBannerDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  expiringBannerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DS.radius.pill,
  },
  expiringBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  heroActiveCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroInactiveCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroOverline: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BAD2FF',
    marginBottom: 4,
  },
  heroMainTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubDesc: {
    fontSize: 12,
    color: '#9AA3B0',
    marginTop: 6,
    lineHeight: 17,
  },
  faolPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: DS.radius.pill,
  },
  faolPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  activatePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DS.radius.pill,
    marginLeft: 10,
  },
  activatePillText: {
    color: DS.colors.navyDeep,
    fontSize: 12,
    fontWeight: '800',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 18,
  },
  heroProgressBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  heroDaysLeft: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EEF4FF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  continueCoverImg: {
    width: 54,
    height: 64,
    borderRadius: 12,
  },
  continueCoverPlaceholder: {
    width: 54,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueCoverEmoji: {
    fontSize: 26,
  },
  miniCoverImg: {
    width: 44,
    height: 54,
    borderRadius: 10,
  },
  miniCoverBox: {
    width: 44,
    height: 54,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCoverEmoji: {
    fontSize: 22,
  },
  continueInfo: {
    flex: 1,
    marginHorizontal: 14,
  },
  continueTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  continueSub: {
    fontSize: 12,
    marginTop: 3,
    marginBottom: 8,
  },
  miniProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playChevron: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: -2,
  },
  chevronRight: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    marginTop: 2,
  },
  addGradeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addGradePlus: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: -2,
  },
  myGradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gradeTileCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  gradeTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gradeNumberBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeNumberText: {
    fontSize: 15,
    fontWeight: '800',
  },
  gradeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gradeTileTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  gradeTileSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
