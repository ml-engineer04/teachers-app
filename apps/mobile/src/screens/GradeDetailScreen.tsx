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
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Book, Grade, getBookContentTotalPages } from '@smartteacherbook/shared';
import { DownloadsManager } from '../services/storage/downloadsManager';
import { offlineCatalogCache } from '../services/storage/offlineCatalogCache';
import { SubscriptionManager, GradeAccessInfo } from '../services/subscription/subscriptionManager';
import { ExpiredAccessModal } from '../components/ExpiredAccessModal';
import { mobileApi } from '../services/api/mobileApi';
import { notify } from '../services/notifications/notificationService';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import { matchesBookSearch } from '../utils/searchMatch';

interface GradeDetailScreenProps {
  grade: number;
  userName?: string;
  initialSubjectCode?: string;
  onBack: () => void;
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
  onRequestAccess: (grade: number, subjectCode: string, plan: string) => void;
}

export const GradeDetailScreen: React.FC<GradeDetailScreenProps> = ({
  grade: initialGrade,
  initialSubjectCode = 'ALL',
  onBack,
  onOpenReader,
  onRequestAccess,
}) => {
  const { colors, isDark } = useTheme();
  const { strings, t, formatGrade, formatSubject, formatBookType } = useI18n();

  const [selectedGrade, setSelectedGrade] = useState<number>(initialGrade || 4);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectCode || 'ALL');
  const [viewMode, setViewMode] = useState<'CATALOG' | 'PLANS'>('CATALOG');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'THREE_MONTHS' | 'YEARLY'>('THREE_MONTHS');
  const [selectedBookTypeTab, setSelectedBookTypeTab] = useState<'STUDENT_BOOK' | 'TEACHER_BOOK' | 'WORKBOOK'>('STUDENT_BOOK');

  const [availableGrades, setAvailableGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [liveBooks, setLiveBooks] = useState<Book[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([
    { id: 'MONTHLY', durationDays: 30, priceUzs: 119000, badge: '' },
    { id: 'THREE_MONTHS', durationDays: 90, priceUzs: 299000, badge: '★' },
    { id: 'YEARLY', durationDays: 365, priceUzs: 890000, badge: '' },
  ]);
  const [gradeAccess, setGradeAccess] = useState<GradeAccessInfo>({
    gradeId: selectedGrade,
    status: 'LOCKED',
    daysRemaining: 0,
  });

  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [downloadedTick, setDownloadedTick] = useState(0);
  const [offlineCovers, setOfflineCovers] = useState<Record<string, string>>({});
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [expiredModalVisible, setExpiredModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (expiredModalVisible) {
        setExpiredModalVisible(false);
        return true;
      }
      if (searchOpen) {
        setSearchOpen(false);
        return true;
      }
      if (viewMode === 'PLANS') {
        setViewMode('CATALOG');
        return true;
      }
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [expiredModalVisible, searchOpen, viewMode, onBack]);

  const selectedSubjectObj = subjects.find(
    (s) => s.code === selectedSubject || s.id === selectedSubject,
  );
  const pricingSubjectId =
    selectedSubject === 'ALL'
      ? subjects[0]?.id
      : selectedSubjectObj?.id || selectedSubject;

  const hydrateOfflineCatalog = useCallback(async () => {
    await DownloadsManager.init();
    const downloaded = DownloadsManager.listDownloadedBundles();
    const [cachedGrades, cachedSubjects, cachedBooks, access] = await Promise.all([
      offlineCatalogCache.getGrades(),
      offlineCatalogCache.getSubjects(),
      offlineCatalogCache.getBooks(),
      SubscriptionManager.getGradeAccess(selectedGrade),
    ]);

    const booksList = offlineCatalogCache.mergeBooksWithDownloads(cachedBooks, downloaded);
    if (booksList.length > 0) setLiveBooks(booksList);

    if (cachedGrades && cachedGrades.length > 0) {
      const sorted = [...cachedGrades].sort((a, b) => a.gradeNumber - b.gradeNumber);
      setAvailableGrades(sorted);
    } else if (downloaded.length > 0) {
      const dlGrades = Array.from(new Set(downloaded.map((d) => d.gradeId))).sort((a, b) => a - b);
      setAvailableGrades(
        dlGrades.map((n) => ({ id: n, gradeNumber: n, label: `${n}`, isActive: true } as any)),
      );
    }
    if (cachedSubjects && cachedSubjects.length > 0) setSubjects(cachedSubjects);
    setGradeAccess(access);
    setDownloadedTick((t) => t + 1);

    const coverMap: Record<string, string> = {};
    for (const dl of downloaded) {
      const uri = await DownloadsManager.resolveOfflineAssetUri(dl.bookId, dl.coverImageUrl);
      if (uri) coverMap[dl.bookId] = uri;
    }
    setOfflineCovers(coverMap);
  }, [selectedGrade]);

  const loadCatalogData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        await DownloadsManager.init();
        const online = await mobileApi.checkConnectivity();
        if (!online) {
          setIsOfflineMode(true);
          await hydrateOfflineCatalog();
          notify.info(strings.common.offlineMode, strings.drawer.offlineNotice);
          return;
        }

        setIsOfflineMode(false);
        await SubscriptionManager.syncFromBackend().catch(() => {});
        const [gradesData, subjs, books, access] = await Promise.all([
          mobileApi.getGrades(),
          mobileApi.getSubjects(),
          mobileApi.getAllBooks(),
          SubscriptionManager.getGradeAccess(selectedGrade),
        ]);
        if (Array.isArray(gradesData)) {
          const sortedGrades = [...gradesData].sort((a, b) => a.gradeNumber - b.gradeNumber);
          setAvailableGrades(sortedGrades);
          offlineCatalogCache.saveGrades(sortedGrades);
          if (sortedGrades.length > 0 && !sortedGrades.some((g) => g.gradeNumber === selectedGrade)) {
            setSelectedGrade(sortedGrades[0].gradeNumber);
          }
        }
        if (Array.isArray(subjs)) {
          setSubjects(subjs);
          offlineCatalogCache.saveSubjects(subjs);
        }
        if (Array.isArray(books)) {
          setLiveBooks(books);
          offlineCatalogCache.saveBooks(books);
        }
        setGradeAccess(access);
        setDownloadedTick((t) => t + 1);
      } catch (err: any) {
        setIsOfflineMode(true);
        await hydrateOfflineCatalog();
        notify.warning(strings.common.warning, err?.message || strings.drawer.offlineNotice);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      selectedGrade,
      hydrateOfflineCatalog,
      strings.common.offlineMode,
      strings.drawer.offlineNotice,
      strings.common.warning,
    ],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCatalogData(true);
    mobileApi
      .getPricingPlans(selectedGrade, pricingSubjectId)
      .then((plans) => {
        if (Array.isArray(plans) && plans.length > 0) setPricingPlans(plans);
      })
      .catch(() => {});
    setRefreshing(false);
  }, [loadCatalogData, selectedGrade, pricingSubjectId]);

  useEffect(() => {
    if (initialGrade) {
      setSelectedGrade(initialGrade);
    }
  }, [initialGrade]);

  useEffect(() => {
    loadCatalogData();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        loadCatalogData();
      }
    });
    return () => sub.remove();
  }, [loadCatalogData]);

  useEffect(() => {
    mobileApi
      .getPricingPlans(selectedGrade, pricingSubjectId)
      .then((plans) => {
        if (Array.isArray(plans) && plans.length > 0) setPricingPlans(plans);
      })
      .catch(() => {});
  }, [selectedGrade, pricingSubjectId]);

  const currentSubjectObj =
    subjects.find((s) => s.code === selectedSubject || s.id === selectedSubject) || subjects[0];

  const resolveSubjectName = useCallback(
    (subjectId?: string | null) => {
      if (!subjectId) return formatSubject(undefined, 'sub_eng');
      const found = subjects.find(
        (s) =>
          s.id === subjectId ||
          s.code.toLowerCase() === subjectId.toLowerCase() ||
          subjectId.toLowerCase().includes(s.code.toLowerCase()),
      );
      return formatSubject(found?.name, found?.id || subjectId);
    },
    [subjects, formatSubject],
  );

  const filteredBooks = liveBooks.filter((b) => {
    if (Number(b.gradeId) !== selectedGrade) return false;
    if (selectedSubject !== 'ALL') {
      const sObj = subjects.find((s) => s.code === selectedSubject || s.id === selectedSubject);
      const bSubj = (b.subjectId || '').toLowerCase();
      const sCode = (sObj?.code || selectedSubject).toLowerCase();
      const sId = (sObj?.id || '').toLowerCase();
      const sName = (sObj?.name || '').toLowerCase();
      const match =
        (sId && bSubj === sId) ||
        bSubj.includes(sCode) ||
        (sName && bSubj.includes(sName.slice(0, 4)));
      if (!match) return false;
    }
    if (searchQuery.trim()) {
      return matchesBookSearch(b, searchQuery, subjects);
    }
    return true;
  });

  const isGradeActive = SubscriptionManager.isAccessValid(gradeAccess);

  const handleDownloadBook = async (book: Book) => {
    if (downloadingBookId) {
      notify.info(strings.common.info, strings.grades.downloadStarted);
      return;
    }
    setDownloadingBookId(book.id);
    setDownloadPercent(4);
    notify.info(strings.common.info, strings.grades.downloadStarted);
    try {
      const item = await DownloadsManager.downloadBundle(
        selectedGrade,
        selectedSubject === 'ALL' ? book.subjectId || 'ENG' : selectedSubject,
        (pct) => setDownloadPercent(pct),
        book.id,
        book.title,
      );
      setDownloadingBookId(null);
      setDownloadedTick((t) => t + 1);
      const localCover = await DownloadsManager.resolveOfflineAssetUri(book.id, book.coverImageUrl);
      if (localCover) {
        setOfflineCovers((prev) => ({ ...prev, [book.id]: localCover }));
      }
      const mbText = `${Math.max(0.1, Number((item.sizeBytes / (1024 * 1024)).toFixed(1)))} MB`;
      notify.success(
        strings.grades.downloadedBadge,
        `${t('grades.downloadDone', { title: book.title })} (${mbText})`,
      );
    } catch (err: any) {
      setDownloadingBookId(null);
      notify.error(
        strings.common.error,
        t('grades.downloadError', { msg: err?.message || strings.common.unknownError }),
      );
    }
  };

  const handleBookOpenPress = async (book: Book) => {
    const isDl = DownloadsManager.isBundleDownloaded(
      book.gradeId || selectedGrade,
      book.subjectId,
      book.id,
    );
    const { allowed, access } = await SubscriptionManager.checkBookAccess({
      bookId: book.id,
      gradeId: book.gradeId || selectedGrade,
      subjectId: book.subjectId,
    });
    setGradeAccess(access);
    if (allowed || (isOfflineMode && isDl && access.status !== 'EXPIRED')) {
      onOpenReader({
        id: book.id,
        title: book.title,
        gradeId: book.gradeId,
        subjectId: book.subjectId,
        totalPages: book.totalPages || 6,
        contentStartPdfPage: (book as any).contentStartPdfPage,
        type: book.type,
      });
    } else {
      notify.warning(
        access.status === 'EXPIRED' ? strings.modals.expiredTitle : strings.grades.lockedBadge,
        strings.modals.expiredDesc,
      );
      setExpiredModalVisible(true);
    }
  };

  const formatSizeMb = (bytes?: number) => {
    if (!bytes) return '— MB';
    return `${Math.max(1, (bytes / (1024 * 1024)).toFixed(1) as any)} MB`;
  };

  const getPlanLabel = (plan: any) => {
    if (plan.id === 'MONTHLY') return t('common.months', { n: 1 });
    if (plan.id === 'THREE_MONTHS') return t('common.months', { n: 3 });
    if (plan.id === 'YEARLY') return t('common.months', { n: 12 });
    return plan.name || plan.id;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.backPillBtn,
            { backgroundColor: colors.primarySoft, borderColor: colors.primary + '44' },
          ]}
          onPress={viewMode === 'PLANS' ? () => setViewMode('CATALOG') : onBack}
          activeOpacity={0.75}
          accessibilityLabel={strings.common.back}
        >
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.primaryText}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.backPillText, { color: colors.primaryText }]}>{strings.common.back}</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {viewMode === 'CATALOG'
            ? strings.grades.headerTitle
            : `${formatGrade(selectedGrade)} • ${strings.nav.requests}`}
        </Text>
        <View style={styles.topRightActions}>
          {viewMode === 'CATALOG' ? (
            <TouchableOpacity
              style={[
                styles.searchToggleBtn,
                {
                  backgroundColor: searchOpen ? colors.primarySoft : colors.surface,
                  borderColor: searchOpen ? colors.primary + '55' : colors.border,
                },
              ]}
              onPress={() =>
                setSearchOpen((prev) => {
                  if (prev) setSearchQuery('');
                  return !prev;
                })
              }
              activeOpacity={0.7}
            >
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Circle
                  cx={11}
                  cy={11}
                  r={7}
                  stroke={searchOpen ? colors.primaryText : colors.textPrimary}
                  strokeWidth={2}
                />
                <Path
                  d="M20 20l-3.5-3.5"
                  stroke={searchOpen ? colors.primaryText : colors.textPrimary}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>
      </View>

      {searchOpen && viewMode === 'CATALOG' && (
        <View
          style={[
            styles.searchBarWrap,
            { backgroundColor: colors.inputBg, borderColor: colors.primary + '55' },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
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
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={strings.home.clearSearch}
            >
              <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* GRADE PILL STRIP */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradeStrip}
        >
          {(availableGrades.length > 0
            ? availableGrades.map((g) => g.gradeNumber)
            : loading
            ? [selectedGrade]
            : []
          ).map((g) => {
            const active = g === selectedGrade;
            return (
              <TouchableOpacity
                key={g}
                style={[
                  styles.gradeNumPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedGrade(g)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.gradeNumText,
                    { color: active ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* SUBJECT CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectStrip}
        >
          <TouchableOpacity
            style={[
              styles.subjectChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedSubject === 'ALL' && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedSubject('ALL')}
          >
            <Text
              style={[
                styles.subjectChipText,
                { color: selectedSubject === 'ALL' ? colors.onPrimary : colors.textSecondary },
              ]}
            >
              {strings.common.all}
            </Text>
          </TouchableOpacity>

          {subjects.map((sub) => {
            const active = selectedSubject === sub.code || selectedSubject === sub.id;
            return (
              <TouchableOpacity
                key={sub.id || sub.code}
                style={[
                  styles.subjectChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedSubject(sub.code)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13, marginRight: 5 }}>{sub.icon || '📚'}</Text>
                <Text
                  style={[
                    styles.subjectChipText,
                    { color: active ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  {formatSubject(sub.name, sub.id)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {viewMode === 'CATALOG' ? (
          <View style={styles.booksListWrap}>
            {loading && liveBooks.length === 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
            ) : filteredBooks.length === 0 ? (
              searchQuery.trim().length > 0 ? (
                <View
                  style={[
                    styles.emptyCatalogCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.emptyEmoji}>🔎</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {strings.home.searchEmptyTitle}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {t('home.searchEmptyDesc', { query: searchQuery.trim() })}
                  </Text>
                  <TouchableOpacity
                    style={[styles.subscribePromptBtn, { backgroundColor: colors.primarySoft }]}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={[styles.subscribePromptText, { color: colors.primary }]}>
                      {strings.common.clear}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyCatalogCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.emptyEmoji}>📘</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {strings.grades.emptyGradeTitle}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {strings.grades.emptyGradeDesc}
                  </Text>
                  <TouchableOpacity
                    style={[styles.subscribePromptBtn, { backgroundColor: colors.primarySoft }]}
                    onPress={() => setViewMode('PLANS')}
                  >
                    <Text style={[styles.subscribePromptText, { color: colors.primary }]}>
                      {strings.home.upgradeBannerBtn}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              filteredBooks.map((book) => {
                const isDl =
                  DownloadsManager.isBundleDownloaded(selectedGrade, selectedSubject, book.id) ||
                  downloadedTick < 0;
                const isDownloadingThis = downloadingBookId === book.id;
                const contentTotal = getBookContentTotalPages(
                  book.totalPages || 96,
                  (book as any).contentStartPdfPage,
                );
                const canOpenBook = isGradeActive || (isDl && gradeAccess.status !== 'EXPIRED');

                return (
                  <View
                    key={book.id}
                    style={[
                      styles.catalogBookCard,
                      {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        shadowColor: colors.shadowColor,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.catalogCardMain}
                      activeOpacity={0.8}
                      onPress={() => handleBookOpenPress(book)}
                    >
                      {offlineCovers[book.id] || book.coverImageUrl ? (
                        <Image
                          source={{ uri: (offlineCovers[book.id] || book.coverImageUrl) ?? undefined }}
                          style={[styles.bookThumbImg, { backgroundColor: colors.primarySoft }]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.bookThumbPlaceholder,
                            { backgroundColor: colors.primarySoft },
                          ]}
                        >
                          <Text style={styles.bookThumbEmoji}>
                            {book.type === 'TEACHER_BOOK'
                              ? '💡'
                              : book.type === 'WORKBOOK'
                              ? '✏️'
                              : '📘'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.bookCardMeta}>
                        <Text
                          style={[styles.bookCardTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {book.title || formatBookType(book.type)}
                        </Text>
                        <Text style={[styles.bookCardSub, { color: colors.textSecondary }]}>
                          {formatGrade(book.gradeId)} • {resolveSubjectName(book.subjectId)}
                        </Text>
                        <Text style={[styles.bookCardStats, { color: colors.textMuted }]}>
                          {contentTotal} {strings.common.pages} • {formatSizeMb(book.totalSizeBytes)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.catalogRightCol}>
                      <TouchableOpacity
                        style={[
                          styles.openBookBtn,
                          {
                            backgroundColor: canOpenBook ? colors.primarySoft : colors.surfaceAlt,
                          },
                        ]}
                        onPress={() => handleBookOpenPress(book)}
                      >
                        <Text
                          style={[
                            styles.openBookBtnText,
                            { color: canOpenBook ? colors.primaryText : colors.textSecondary },
                          ]}
                        >
                          {canOpenBook
                            ? isOfflineMode && isDl
                              ? strings.grades.openOffline
                              : strings.grades.openReader
                            : strings.grades.unlockAction}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dlMiniBtn}
                        onPress={() => handleDownloadBook(book)}
                        disabled={isDownloadingThis}
                      >
                        <Text
                          style={[
                            styles.dlMiniText,
                            { color: isDl ? colors.accent : colors.primaryText },
                          ]}
                        >
                          {isDownloadingThis
                            ? t('grades.downloadingPct', { pct: downloadPercent })
                            : isDl
                            ? `${strings.grades.downloadedBadge} ✓`
                            : strings.grades.downloadOffline}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {!isGradeActive && (
              <TouchableOpacity
                style={[
                  styles.bannerUnlock,
                  {
                    backgroundColor: isDark ? '#17224B' : DS.colors.navyDeep,
                    borderWidth: isDark ? 1 : 0,
                    borderColor: colors.borderStrong,
                  },
                ]}
                activeOpacity={0.88}
                onPress={() => setViewMode('PLANS')}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>
                    {formatGrade(selectedGrade)} • {strings.nav.requests}
                  </Text>
                  <Text style={styles.bannerSub}>{strings.requests.headerSubtitle}</Text>
                </View>
                <View style={[styles.bannerArrow, { backgroundColor: colors.primary }]}>
                  <Text style={styles.bannerArrowText}>→</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View>
            <View
              style={[
                styles.gradeHeroCard,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
            >
              <View style={styles.gradeHeroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gradeHeroTitle}>
                    {formatGrade(selectedGrade)}
                    {'\n'}
                    {formatSubject(currentSubjectObj?.name, currentSubjectObj?.id)}
                  </Text>
                  <View
                    style={[
                      styles.heroStatusPill,
                      isGradeActive
                        ? { backgroundColor: colors.accent }
                        : styles.heroStatusLocked,
                    ]}
                  >
                    <Text style={styles.heroStatusText}>
                      {isGradeActive
                        ? `✓ ${strings.home.activePlanBadge} (${gradeAccess.daysRemaining})`
                        : `🔒 ${strings.grades.lockedBadge}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroEmblemBox}>
                  <Text style={{ fontSize: 42 }}>{currentSubjectObj?.icon || '🎓'}</Text>
                </View>
              </View>
            </View>

            {/* Book Type Tabs */}
            <View
              style={[
                styles.bookTypeTabs,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {(['STUDENT_BOOK', 'TEACHER_BOOK', 'WORKBOOK'] as const).map((tabId) => {
                const active = selectedBookTypeTab === tabId;
                return (
                  <TouchableOpacity
                    key={tabId}
                    style={[
                      styles.typeTabBtn,
                      active && { backgroundColor: colors.primarySoft },
                    ]}
                    onPress={() => setSelectedBookTypeTab(tabId)}
                  >
                    <Text
                      style={[
                        styles.typeTabText,
                        { color: active ? colors.primary : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {formatBookType(tabId)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredBooks
              .filter((b) => b.type === selectedBookTypeTab)
              .slice(0, 1)
              .map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.quickTypeCard,
                    { backgroundColor: colors.surface, borderColor: colors.primary + '55' },
                  ]}
                  onPress={() => handleBookOpenPress(b)}
                >
                  <Text style={[styles.quickTypeTitle, { color: colors.textPrimary }]}>
                    {b.title}
                  </Text>
                  <Text style={[styles.quickTypeAction, { color: colors.primary }]}>
                    {isGradeActive ? `${strings.grades.openReader} →` : `🔒 ${strings.grades.lockedBadge}`}
                  </Text>
                </TouchableOpacity>
              ))}

            {/* Tariffs Section */}
            <Text style={[styles.tariffsHeading, { color: colors.textPrimary }]}>
              {strings.nav.requests} • {formatGrade(selectedGrade)} (
              {formatSubject(currentSubjectObj?.name, currentSubjectObj?.id)})
            </Text>
            <View style={styles.tariffsList}>
              {pricingPlans.map((plan) => {
                const planKey = (plan.id || 'MONTHLY') as 'MONTHLY' | 'THREE_MONTHS' | 'YEARLY';
                const selected = selectedPlan === planKey;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.tariffRowCard,
                      {
                        backgroundColor: selected ? colors.primarySoft : colors.cardBg,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedPlan(planKey)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tariffLeft}>
                      <View style={styles.tariffNameRow}>
                        <Text style={[styles.tariffName, { color: colors.textPrimary }]}>
                          {getPlanLabel(plan)}
                        </Text>
                      </View>
                      <Text style={[styles.tariffSub, { color: colors.textSecondary }]}>
                        {(plan.priceUzs || 0).toLocaleString()} {strings.common.currencySom}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: selected ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {selected && (
                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.requestCtaBtn,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
              onPress={() =>
                onRequestAccess(
                  selectedGrade,
                  selectedSubject === 'ALL' ? currentSubjectObj?.code || 'ENG' : selectedSubject,
                  selectedPlan,
                )
              }
              activeOpacity={0.85}
            >
              <Text style={[styles.requestCtaText, { color: colors.onPrimary }]}>
                {strings.requests.submitBtn}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <ExpiredAccessModal
        visible={expiredModalVisible}
        gradeNumber={selectedGrade}
        subjectId={pricingSubjectId}
        subjectName={resolveSubjectName(selectedSubject === 'ALL' ? '' : selectedSubject)}
        isExpired={gradeAccess.status === 'EXPIRED'}
        onClose={() => setExpiredModalVisible(false)}
        onRequestAccess={() =>
          onRequestAccess(
            selectedGrade,
            selectedSubject === 'ALL' ? currentSubjectObj?.code || 'ENG' : selectedSubject,
            selectedPlan,
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  backPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  backPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchToggleBtn: {
    width: 38,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16.5,
    fontWeight: '800',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 10,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingVertical: 0,
    fontSize: 13.5,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clearBtn: {
    fontSize: 14,
    paddingLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  gradeStrip: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  gradeNumPill: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeNumText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subjectStrip: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 14,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  booksListWrap: {
    gap: 12,
  },
  catalogBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.radius.lg,
    padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  catalogCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookThumbImg: {
    width: 54,
    height: 70,
    borderRadius: 10,
  },
  bookThumbPlaceholder: {
    width: 54,
    height: 70,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookThumbEmoji: {
    fontSize: 24,
  },
  bookCardMeta: {
    flex: 1,
    marginHorizontal: 12,
  },
  bookCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bookCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  bookCardStats: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  catalogRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  openBookBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DS.radius.pill,
  },
  openBookBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  dlMiniBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dlMiniText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCatalogCard: {
    borderRadius: DS.radius.xl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  emptyEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  subscribePromptBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: DS.radius.pill,
  },
  subscribePromptText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerUnlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DS.radius.lg,
    padding: 16,
    marginTop: 8,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bannerSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
  bannerArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bannerArrowText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  gradeHeroCard: {
    borderRadius: DS.radius.xl,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  gradeHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeHeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 12,
  },
  heroStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: DS.radius.pill,
  },
  heroStatusActive: {
    backgroundColor: DS.colors.success,
  },
  heroStatusLocked: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  heroEmblemBox: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  bookTypeTabs: {
    flexDirection: 'row',
    borderRadius: DS.radius.md,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
  },
  typeTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: DS.radius.sm,
    alignItems: 'center',
  },
  typeTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickTypeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: DS.radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  quickTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  quickTypeAction: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  tariffsHeading: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  tariffsList: {
    gap: 10,
    marginBottom: 18,
  },
  tariffRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: DS.radius.md,
    padding: 15,
    borderWidth: 1.5,
  },
  tariffLeft: {
    flex: 1,
  },
  tariffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tariffName: {
    fontSize: 15,
    fontWeight: '800',
  },
  tariffSub: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  requestCtaBtn: {
    borderRadius: DS.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  requestCtaText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
