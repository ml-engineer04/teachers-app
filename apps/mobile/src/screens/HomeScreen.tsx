import React, { useState, useEffect, useCallback } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Image,
  RefreshControl,
  Keyboard,
} from 'react-native';
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
import { notify } from '../services/notifications/notificationService';
import { UserAvatar } from '../components/common/UserAvatar';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import { matchesBookSearch, matchesGradeSearch } from '../utils/searchMatch';

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
  const [refreshing, setRefreshing] = useState(false);

  const [allAccess, setAllAccess] = useState<GradeAccessInfo[]>([]);
  const [availableGrades, setAvailableGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [liveBooks, setLiveBooks] = useState<Book[]>([]);
  const [progressList, setProgressList] = useState<any[]>([]);

  const [expiredModalVisible, setExpiredModalVisible] = useState(false);
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
      const localProgress = await readingProgressStore.getAllProgress(userEmail).catch(() => []);
      if (localProgress.length > 0) {
        setProgressList((prev) => (prev.length > 0 ? prev : localProgress));
      }

      await DownloadsManager.init().catch(() => {});
      const online = await mobileApi.checkConnectivity();
      if (!online) {
        const [accessData, cachedGrades, cachedSubjects, cachedBooks, cachedProgress] =
          await Promise.all([
            SubscriptionManager.getAllActiveAccess(),
            offlineCatalogCache.getGrades(),
            offlineCatalogCache.getSubjects(),
            offlineCatalogCache.getBooks(),
            offlineCatalogCache.getProgress(),
          ]);
        const downloaded = DownloadsManager.listDownloadedBundles();
        setAllAccess(accessData);
        if (cachedGrades?.length) {
          setAvailableGrades([...cachedGrades].sort((a, b) => a.gradeNumber - b.gradeNumber));
        } else if (downloaded.length > 0) {
          const grades = Array.from(new Set(downloaded.map((d) => d.gradeId)))
            .sort((a, b) => a - b)
            .map((n) => ({ id: n, gradeNumber: n, label: `${n}`, isActive: true } as any));
          setAvailableGrades(grades);
        }
        if (cachedSubjects?.length) setSubjects(cachedSubjects);
        setLiveBooks(offlineCatalogCache.mergeBooksWithDownloads(cachedBooks, downloaded));
        const mergedOfflineProgress = await readingProgressStore.mergeRemoteAndLocal(
          userEmail,
          cachedProgress || [],
        );
        setProgressList(mergedOfflineProgress);
        if (downloaded.length > 0) {
          notify.info(
            strings.common.offlineMode,
            t('settings.offlineSummary', { count: downloaded.length, size: `${DownloadsManager.getTotalStorageUsedMb()} MB` }),
          );
        } else {
          notify.warning(strings.modals.offlineTitle, strings.modals.offlineDesc);
        }
        return;
      }

      const [accessData, gradesData, subjData, booksData, progData] = await Promise.all([
        SubscriptionManager.getAllActiveAccess(),
        mobileApi.getGrades(),
        mobileApi.getSubjects(),
        mobileApi.getAllBooks(),
        mobileApi.getReadingProgress(),
      ]);
      setAllAccess(accessData);
      if (Array.isArray(gradesData)) {
        const sorted = [...gradesData].sort((a, b) => a.gradeNumber - b.gradeNumber);
        setAvailableGrades(sorted);
        offlineCatalogCache.saveGrades(sorted);
      }
      if (Array.isArray(subjData)) {
        setSubjects(subjData);
        offlineCatalogCache.saveSubjects(subjData);
      }
      if (Array.isArray(booksData)) {
        setLiveBooks(booksData);
        offlineCatalogCache.saveBooks(booksData);
      }
      const mergedOnlineProgress = await readingProgressStore.mergeRemoteAndLocal(
        userEmail,
        Array.isArray(progData) ? progData : [],
      );
      setProgressList(mergedOnlineProgress);
      offlineCatalogCache.saveProgress(mergedOnlineProgress);
    } catch (err: any) {
      notify.warning(strings.common.error, err?.message || strings.common.unknownError);
    }
  }, [userEmail, strings.common.offlineMode, strings.modals.offlineTitle, strings.modals.offlineDesc, strings.common.error, strings.common.unknownError, t]);

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
  const resolvedUserName = (userName || strings.common.userFallback).trim();
  const firstName = resolvedUserName.split(' ')[0];

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
    await DownloadsManager.init().catch(() => {});
    const { allowed, access } = await SubscriptionManager.checkBookAccess({
      bookId: book.id,
      gradeId: book.gradeId || 11,
      subjectId: book.subjectId,
    });
    if (allowed) {
      onOpenReader(book);
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

  const trimmedSearch = searchQuery.trim();

  const subscribedSearchResults = trimmedSearch
    ? liveBooks.filter((b) => hasBookSubscription(b) && matchesBookSearch(b, trimmedSearch, subjects))
    : [];
  const lockedSearchResults = trimmedSearch
    ? liveBooks.filter((b) => !hasBookSubscription(b) && matchesBookSearch(b, trimmedSearch, subjects))
    : [];
  const totalSearchMatches = subscribedSearchResults.length + lockedSearchResults.length;

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

  const matchingGradesSearch = trimmedSearch
    ? searchableGradeNums.filter((gradeNum) => {
        const gradeSubIds = [
          ...activeSubs.filter((a) => a.gradeId === gradeNum).map((s) => s.subjectId),
          ...liveBooks.filter((b) => Number(b.gradeId) === gradeNum).map((b) => b.subjectId),
        ];
        return matchesGradeSearch(gradeNum, trimmedSearch, gradeSubIds, subjects);
      })
    : [];

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
            {onOpenMenu && (
              <TouchableOpacity
                style={[
                  styles.menuIconBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={onOpenMenu}
                activeOpacity={0.7}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4 7h16M4 12h12M4 17h16"
                    stroke={colors.textPrimary}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.greetingName, { color: colors.textPrimary }]} numberOfLines={1}>
                {t('home.greeting', { name: firstName })} 👋
              </Text>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]} numberOfLines={1}>
                {strings.home.subtitle}
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
            { backgroundColor: colors.inputBg, borderColor: colors.border },
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
                {matchingGradesSearch.map((gradeNum) => {
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
                {subscribedSearchResults.map((b) => {
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
                          {strings.common.pages}
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

                {lockedSearchResults.map((b) => (
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

        {/* HERO CARD */}
        {primarySub ? (
          <TouchableOpacity
            style={[
              styles.heroActiveCard,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            activeOpacity={0.9}
            onPress={() => onOpenGradeDetail(primarySub.gradeId, primarySub.subjectId || undefined)}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.heroOverline}>{strings.home.activePlanBadge}</Text>
                <Text style={styles.heroMainTitle}>
                  {formatGrade(primarySub.gradeId)} — {resolveSubjectName(primarySub.subjectId)}
                </Text>
              </View>
              <View style={[styles.faolPill, { backgroundColor: colors.accent }]}>
                <Text style={styles.faolPillText}>{strings.common.active}</Text>
              </View>
            </View>

            <View style={styles.heroFooter}>
              <View style={{ flex: 1, marginRight: 14 }}>
                <View style={styles.heroProgressBg}>
                  <View
                    style={[
                      styles.heroProgressFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(12, Math.round((primarySub.daysRemaining / 30) * 100)),
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.heroDaysLeft}>
                  {primarySub.daysRemaining} d.
                </Text>
              </View>

              <Svg width={44} height={44} viewBox="0 0 48 48" fill="none">
                <Rect x="6" y="14" width="22" height="28" rx="4" fill="rgba(255,255,255,0.28)" />
                <Rect x="16" y="8" width="24" height="32" rx="4" fill="#E0E7FF" />
                <Rect x="20" y="14" width="16" height="4" rx="2" fill={colors.primaryDark} />
              </Svg>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.heroInactiveCard,
              {
                backgroundColor: isDark ? '#17224B' : DS.colors.navyMid,
                borderWidth: isDark ? 1 : 0,
                borderColor: colors.borderStrong,
              },
            ]}
            activeOpacity={0.9}
            onPress={() => onOpenRequests(fallbackDefaultGrade)}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroOverline}>{strings.home.freePlanBadge}</Text>
                <Text style={styles.heroMainTitle}>{strings.home.upgradeBannerTitle}</Text>
                <Text style={styles.heroSubDesc}>{strings.home.upgradeBannerDesc}</Text>
              </View>
              <View style={[styles.activatePill, { backgroundColor: DS.colors.gold }]}>
                <Text style={styles.activatePillText}>{strings.home.upgradeBannerBtn}</Text>
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
              <Text style={[styles.seeAllText, { color: colors.primaryText }]}>
                {strings.home.seeAll} ›
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {continueItem ? (
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
              <View style={[styles.miniProgressTrack, { backgroundColor: colors.primarySoft }]}>
                <View
                  style={[
                    styles.miniProgressFill,
                    {
                      backgroundColor: colors.primary,
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

            <View style={[styles.playCircle, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.playChevron, { color: colors.primary }]}>›</Text>
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

        {displayedGrades.length === 0 ? (
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
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                  onPress={() => onOpenGradeDetail(g)}
                  activeOpacity={0.82}
                >
                  <View style={styles.gradeTileTop}>
                    <View
                      style={[
                        styles.gradeNumberBadge,
                        { backgroundColor: isActive ? colors.primary : colors.surfaceAlt },
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradeNumberText,
                          { color: isActive ? colors.onPrimary : colors.textPrimary },
                        ]}
                      >
                        {g}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.gradeStatusDot,
                        { backgroundColor: isActive ? colors.accent : colors.textMuted },
                      ]}
                    />
                  </View>

                  <Text style={[styles.gradeTileTitle, { color: colors.textPrimary }]}>
                    {formatGrade(g)}
                  </Text>
                  <Text style={[styles.gradeTileSub, { color: colors.textSecondary }]}>
                    {booksCount > 0
                      ? t('grades.booksCountLabel', { count: booksCount })
                      : isActive
                      ? strings.home.activePlanBadge
                      : strings.grades.headerTitle}
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
  heroActiveCard: {
    borderRadius: DS.radius.xl,
    padding: 20,
    marginBottom: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  heroInactiveCard: {
    borderRadius: DS.radius.xl,
    padding: 20,
    marginBottom: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroOverline: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C7D2FE',
    marginBottom: 4,
  },
  heroMainTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubDesc: {
    fontSize: 12,
    color: '#CBD5E1',
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
    color: '#E0E7FF',
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
    borderRadius: DS.radius.lg,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
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
    borderRadius: DS.radius.lg,
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
    borderRadius: DS.radius.lg,
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
