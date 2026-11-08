import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { DownloadsManager } from '../services/storage/downloadsManager';
import { SubscriptionManager, GradeAccessInfo } from '../services/subscription/subscriptionManager';
import { ExpiredAccessModal } from '../components/ExpiredAccessModal';
import { mobileApi } from '../services/api/mobileApi';
import { Book } from '@smartteacherbook/shared';
import { UserAvatar } from '../components/common/UserAvatar';

interface HomeScreenProps {
  userEmail: string;
  userName?: string;
  onOpenMenu?: () => void;
  onOpenReader: (grade: number, subjectCode: string, bookType: string) => void;
  onOpenGradeDetail: (grade: number, subjectCode: string) => void;
  onOpenRequests: () => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  userEmail = '',
  userName = 'O‘qituvchi',
  onOpenMenu,
  onOpenReader,
  onOpenGradeDetail,
  onOpenRequests,
  onOpenSettings,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<number>(11);
  const [selectedSubject, setSelectedSubject] = useState<string>('ENG');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [expiredModalVisible, setExpiredModalVisible] = useState<boolean>(false);

  const [gradeAccess, setGradeAccess] = useState<GradeAccessInfo>({
    gradeId: 11,
    status: 'ACTIVE',
    daysRemaining: 25,
  });

  const [liveBooks, setLiveBooks] = useState<Book[]>([]);

  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const [subjects, setSubjects] = useState<any[]>([
    { code: 'ENG', name: 'Ingliz tili', icon: '🇬🇧', color: '#2563EB', bg: '#EFF6FF' },
    { code: 'MATH', name: 'Matematika', icon: '📐', color: '#059669', bg: '#ECFDF5' },
    { code: 'PHYS', name: 'Fizika', icon: '⚛️', color: '#7C3AED', bg: '#F5F3FF' },
    { code: 'CHEM', name: 'Kimyo', icon: '🧪', color: '#DB2777', bg: '#FDF2F8' },
    { code: 'BIO', name: 'Biologiya', icon: '🧬', color: '#0D9488', bg: '#F0FDFA' },
    { code: 'UZB', name: 'Ona tili', icon: '📖', color: '#EA580C', bg: '#FFF7ED' },
  ]);

  const currentSubjectObj = subjects.find((s) => s.code === selectedSubject) || subjects[0] || {
    code: 'ENG',
    name: 'Ingliz tili',
    icon: '🇬🇧',
    color: '#2563EB',
    bg: '#EFF6FF',
  };

  useEffect(() => {
    // Load dynamic subjects from API
    mobileApi.getSubjects().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setSubjects(
          data.map((s) => ({
            code: s.code,
            name: s.name,
            icon: s.icon || '📚',
            color: s.color || '#2563EB',
            bg: `${s.color || '#2563EB'}15`,
          }))
        );
      }
    }).catch(() => {});

    // Check download state for selected grade & subject
    setIsDownloaded(DownloadsManager.isBundleDownloaded(selectedGrade, selectedSubject));

    // Check subscription access state
    SubscriptionManager.getGradeAccess(selectedGrade).then((access) => {
      setGradeAccess(access);
    });

    // Fetch real books from backend API
    mobileApi
      .getAllBooks()
      .then((data) => {
        if (Array.isArray(data)) setLiveBooks(data);
      })
      .catch(() => {});
  }, [selectedGrade, selectedSubject]);

  const handleOpenBook = (bookType: string) => {
    if (SubscriptionManager.isAccessValid(gradeAccess)) {
      onOpenReader(selectedGrade, selectedSubject, bookType);
    } else {
      setExpiredModalVisible(true);
    }
  };

  const handleDownloadBundle = async () => {
    setDownloadProgress(5);
    try {
      await DownloadsManager.downloadBundle(selectedGrade, selectedSubject, (percent) => {
        setDownloadProgress(percent);
      });
      setIsDownloaded(true);
      setDownloadProgress(null);
      Alert.alert(
        'Yuklandi! 📥',
        `${selectedGrade}-sinf ${currentSubjectObj.name} to‘liq darsliklar to‘plami yuklandi va offline rejimga tayyorlandi!`,
      );
    } catch {
      setDownloadProgress(null);
      Alert.alert('Xatolik', 'Yuklab olishda xatolik yuz berdi. Internetni tekshiring.');
    }
  };

  // Real books matching current grade and subject
  const matchingLive = liveBooks.filter((b) => {
    const bGrade = b.gradeId || (b as any).grade?.gradeNumber;
    const matchesGrade = !bGrade || Number(bGrade) === selectedGrade;
    const subjCode = selectedSubject.toLowerCase();
    const bSubj = (b.subjectId || '').toLowerCase();
    const matchesSubj =
      !b.subjectId ||
      (subjCode === 'eng' && (bSubj.includes('eng') || bSubj.includes('ingliz'))) ||
      (subjCode === 'math' && (bSubj.includes('math') || bSubj.includes('matem'))) ||
      (subjCode === 'phys' && (bSubj.includes('phys') || bSubj.includes('fizik'))) ||
      (subjCode === 'chem' && (bSubj.includes('chem') || bSubj.includes('kimyo'))) ||
      (subjCode === 'bio' && (bSubj.includes('bio') || bSubj.includes('biolog'))) ||
      (subjCode === 'uzb' && (bSubj.includes('uzb') || bSubj.includes('ona')));
    return matchesGrade && matchesSubj;
  });

  const defaultBooks = [
    {
      id: 'sb',
      type: 'STUDENT_BOOK',
      title: `${selectedGrade}-sinf ${currentSubjectObj.name} (Student's Book)`,
      subtitle: 'Interaktiv audio & video topshiriqlar, 142 bet',
      badge: 'Asosiy darslik',
      badgeBg: '#EFF6FF',
      badgeColor: '#1D4ED8',
      icon: '📘',
      coverImageUrl: null as string | null,
      actionText: 'Darslikni ochish →',
      isPrimary: true,
    },
    {
      id: 'tb',
      type: 'TEACHER_BOOK',
      title: `${selectedGrade}-sinf ${currentSubjectObj.name} (Teacher's Book)`,
      subtitle: 'Barcha mashqlar va testlarning to‘liq javoblar kaliti',
      badge: 'Javoblar kaliti 💡',
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309',
      icon: '💡',
      coverImageUrl: null as string | null,
      actionText: 'Javoblarni ko‘rish →',
      isPrimary: false,
    },
    {
      id: 'wb',
      type: 'WORKBOOK',
      title: `${selectedGrade}-sinf ${currentSubjectObj.name} (Workbook)`,
      subtitle: 'Mustaqil ishlash uchun amaliy mashqlar va topshiriqlar',
      badge: 'Amaliy mashqlar',
      badgeBg: '#F3E8FF',
      badgeColor: '#7E22CE',
      icon: '📝',
      coverImageUrl: null as string | null,
      actionText: 'Ochish →',
      isPrimary: false,
    },
    {
      id: 'audio',
      type: 'AUDIO_LIB',
      title: 'Audio Kutubxona (Listening)',
      subtitle: '24 ta original audio trek • Darslik bo‘yicha',
      badge: '24 MP3 Trek 🎧',
      badgeBg: '#E0F2FE',
      badgeColor: '#0369A1',
      icon: '🎧',
      coverImageUrl: null as string | null,
      actionText: 'Tinglash →',
      isPrimary: false,
    },
    {
      id: 'video',
      type: 'VIDEO_LIB',
      title: 'Video Darslar (Grammar & Rules)',
      subtitle: '12 ta video qo‘llanma • Mavzular tushuntirishi',
      badge: '12 Video Dars 🎬',
      badgeBg: '#FDF2F8',
      badgeColor: '#BE185D',
      icon: '🎬',
      coverImageUrl: null as string | null,
      actionText: 'Tomosha qilish →',
      isPrimary: false,
    },
  ];

  const liveCards = matchingLive.map((b) => ({
    id: b.id,
    type: b.type || 'STUDENT_BOOK',
    title: b.title,
    subtitle: `${b.totalPages || 120} bet • ${b.status === 'PUBLISHED' ? '✓ Nashr etilgan' : 'Qoralama'}`,
    badge:
      b.type === 'TEACHER_BOOK'
        ? 'Javoblar kaliti 💡'
        : b.type === 'WORKBOOK'
        ? 'Ish daftari'
        : 'Asosiy darslik',
    badgeBg: b.type === 'TEACHER_BOOK' ? '#FEF3C7' : b.type === 'WORKBOOK' ? '#F3E8FF' : '#EFF6FF',
    badgeColor: b.type === 'TEACHER_BOOK' ? '#B45309' : b.type === 'WORKBOOK' ? '#7E22CE' : '#1D4ED8',
    icon: b.type === 'TEACHER_BOOK' ? '💡' : b.type === 'WORKBOOK' ? '📝' : '📘',
    coverImageUrl: b.coverImageUrl || null,
    actionText: b.type === 'TEACHER_BOOK' ? 'Javoblarni ko‘rish →' : 'Darslikni ochish →',
    isPrimary: b.type === 'STUDENT_BOOK',
  }));

  const books = liveCards.length > 0 ? [...liveCards, ...defaultBooks.slice(3)] : defaultBooks;

  const filteredBooks = searchQuery.trim()
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : books;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* TOP BAR: USER GREETING & PROFILE                                          */}
        {/* ========================================================================= */}
        <View style={styles.topHeader}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingHello}>Assalomu alaykum 👋</Text>
            <Text style={styles.greetingName}>{userName}</Text>
          </View>

          <TouchableOpacity style={styles.avatarButton} onPress={onOpenSettings} activeOpacity={0.7}>
            <UserAvatar name={userName} email={userEmail} size={42} />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* QUICK SEARCH INPUT                                                        */}
        {/* ========================================================================= */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Darslik, mavzu yoki topshiriqni qidirish..."
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ========================================================================= */}
        {/* SUBSCRIPTION STATUS WIDGET                                                */}
        {/* ========================================================================= */}
        {gradeAccess.status === 'ACTIVE' ? (
          <View style={styles.statusCardActive}>
            <View style={styles.statusBadgeIcon}>
              <Text style={styles.statusIconText}>👑</Text>
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitleActive}>
                {selectedGrade}-sinf: Faol Obuna
              </Text>
              <Text style={styles.statusSubActive}>
                {gradeAccess.daysRemaining} kun qoldi • Barcha darslik va javoblar ochiq
              </Text>
            </View>
            <TouchableOpacity onPress={onOpenRequests} style={styles.extendBtn}>
              <Text style={styles.extendBtnText}>Uzaytirish</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.statusCardLocked}
            onPress={() => setExpiredModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.statusBadgeIconLocked}>
              <Text style={styles.statusIconText}>🔒</Text>
            </View>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitleLocked}>
                {selectedGrade}-sinf darsliklariga obuna bo‘ling
              </Text>
              <Text style={styles.statusSubLocked}>
                Metodik javoblar va audio materiallarga to‘liq ruxsat olish ›
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ========================================================================= */}
        {/* 1. GRADE SELECTOR CAROUSEL (1-sinfdan 11-sinfgacha)                       */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>1. Sinfni tanlang</Text>
          <Text style={styles.sectionCount}>{selectedGrade}-sinf tanlangan</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradeScroll}
        >
          {grades.map((grade) => {
            const isSelected = grade === selectedGrade;
            return (
              <TouchableOpacity
                key={grade}
                style={[styles.gradePill, isSelected && styles.gradePillActive]}
                onPress={() => setSelectedGrade(grade)}
                activeOpacity={0.75}
              >
                <Text style={[styles.gradeText, isSelected && styles.gradeTextActive]}>
                  {grade}-sinf
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ========================================================================= */}
        {/* 2. SUBJECT SELECTOR (Fanlar)                                              */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>2. Fanni tanlang</Text>
          <Text style={styles.sectionCount}>{currentSubjectObj.name}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectScroll}
        >
          {subjects.map((sub) => {
            const isSelected = sub.code === selectedSubject;
            return (
              <TouchableOpacity
                key={sub.code}
                style={[
                  styles.subjectChip,
                  isSelected && styles.subjectChipActive,
                ]}
                onPress={() => setSelectedSubject(sub.code)}
                activeOpacity={0.75}
              >
                <Text style={styles.subjectIcon}>{sub.icon}</Text>
                <Text style={[styles.subjectName, isSelected && styles.subjectNameActive]}>
                  {sub.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ========================================================================= */}
        {/* OFFLINE DOWNLOAD HELPER WIDGET                                            */}
        {/* ========================================================================= */}
        <View style={styles.offlineBox}>
          <View style={styles.offlineInfo}>
            <Text style={styles.offlineTitle}>
              {isDownloaded ? '✅ Oflayn rejimda tayyor' : '📥 Internetisiz ishlatish'}
            </Text>
            <Text style={styles.offlineSubtitle}>
              {isDownloaded
                ? `${selectedGrade}-sinf ${currentSubjectObj.name} xotiraga yuklangan (Internet shart emas)`
                : `Sinfxonada internetsiz o‘qish uchun darsliklarni yuklab oling`}
            </Text>
          </View>

          {downloadProgress !== null ? (
            <View style={styles.progressWrap}>
              <ActivityIndicator size="small" color="#0F2942" />
              <Text style={styles.progressPercent}>{downloadProgress}%</Text>
            </View>
          ) : isDownloaded ? (
            <View style={styles.downloadedBadge}>
              <Text style={styles.downloadedBadgeText}>Yuklangan ✓</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownloadBundle}
              activeOpacity={0.8}
            >
              <Text style={styles.downloadBtnText}>Yuklab olish</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ========================================================================= */}
        {/* 3. TEXTBOOKS & TEACHER MATERIALS (Darsliklar va Javoblar)                */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            3. Darsliklar va Materiallar ({filteredBooks.length})
          </Text>
        </View>

        <View style={styles.booksGrid}>
          {filteredBooks.map((book) => (
            <TouchableOpacity
              key={book.id}
              style={[styles.bookCard, book.isPrimary && styles.bookCardPrimary]}
              onPress={() => handleOpenBook(book.type)}
              activeOpacity={0.82}
            >
              <View style={styles.bookHeaderRow}>
                {book.coverImageUrl ? (
                  <Image
                    source={{ uri: book.coverImageUrl }}
                    style={styles.bookCoverThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.bookIconBadge}>
                    <Text style={styles.bookEmoji}>{book.icon}</Text>
                  </View>
                )}
                <View style={[styles.typeBadge, { backgroundColor: book.badgeBg }]}>
                  <Text style={[styles.typeBadgeText, { color: book.badgeColor }]}>
                    {book.badge}
                  </Text>
                </View>
              </View>

              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookSubtitle}>{book.subtitle}</Text>

              <View style={styles.bookFooterRow}>
                <Text style={styles.bookGradeTag}>
                  {selectedGrade}-sinf • {currentSubjectObj.name}
                </Text>
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>{book.actionText}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Expired Access / Locked Modal */}
      <ExpiredAccessModal
        visible={expiredModalVisible}
        gradeNumber={selectedGrade}
        subjectName={currentSubjectObj.name}
        isExpired={gradeAccess.status === 'EXPIRED'}
        onClose={() => setExpiredModalVisible(false)}
        onRequestAccess={onOpenRequests}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  greetingWrap: {
    flex: 1,
  },
  greetingHello: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F2942',
    letterSpacing: -0.3,
  },
  avatarButton: {
    marginLeft: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F2942',
  },
  searchClear: {
    fontSize: 14,
    color: '#94A3B8',
    paddingHorizontal: 6,
    fontWeight: 'bold',
  },
  statusCardActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  statusCardLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  statusBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusBadgeIconLocked: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusIconText: {
    fontSize: 18,
  },
  statusContent: {
    flex: 1,
  },
  statusTitleActive: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  statusSubActive: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  statusTitleLocked: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  statusSubLocked: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  extendBtn: {
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  extendBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F2942',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  gradeScroll: {
    gap: 8,
    paddingBottom: 6,
    marginBottom: 14,
  },
  gradePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  gradePillActive: {
    backgroundColor: '#0F2942',
    borderColor: '#0F2942',
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  gradeTextActive: {
    color: '#FFFFFF',
  },
  subjectScroll: {
    gap: 8,
    paddingBottom: 6,
    marginBottom: 16,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  subjectChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  subjectIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  subjectNameActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  offlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  offlineInfo: {
    flex: 1,
    marginRight: 10,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2942',
  },
  offlineSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  downloadBtn: {
    backgroundColor: '#0F2942',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  downloadedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  downloadedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F2942',
  },
  booksGrid: {
    gap: 12,
  },
  bookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bookCardPrimary: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFF',
  },
  bookHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCoverThumb: {
    width: 44,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bookEmoji: {
    fontSize: 22,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F2942',
    marginBottom: 4,
  },
  bookSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  bookFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bookGradeTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  actionPill: {
    backgroundColor: '#0F2942',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
