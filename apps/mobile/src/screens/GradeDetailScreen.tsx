import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { DownloadsManager } from '../services/storage/downloadsManager';
import { SubscriptionManager, GradeAccessInfo } from '../services/subscription/subscriptionManager';
import { ExpiredAccessModal } from '../components/ExpiredAccessModal';

interface GradeDetailScreenProps {
  grade: number;
  userName?: string;
  initialSubjectCode?: string;
  onBack: () => void;
  onOpenReader: (grade: number, subjectCode: string, bookType: string) => void;
  onRequestAccess: (grade: number, subjectCode: string, plan: string) => void;
}

export const GradeDetailScreen: React.FC<GradeDetailScreenProps> = ({
  grade,
  userName = 'O‘qituvchi',
  initialSubjectCode = 'ENG',
  onBack,
  onOpenReader,
  onRequestAccess,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectCode);
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'THREE_MONTHS' | 'YEARLY'>('MONTHLY');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [gradeAccess, setGradeAccess] = useState<GradeAccessInfo>({
    gradeId: grade,
    status: 'ACTIVE',
    daysRemaining: 25,
  });
  const [expiredModalVisible, setExpiredModalVisible] = useState<boolean>(false);

  const subjects = [
    { code: 'ENG', name: 'Ingliz tili', icon: '🇬🇧', color: '#2563EB' },
    { code: 'MATH', name: 'Matematika', icon: '📐', color: '#059669' },
    { code: 'PHYS', name: 'Fizika', icon: '⚛️', color: '#7C3AED' },
    { code: 'CHEM', name: 'Kimyo', icon: '🧪', color: '#DB2777' },
    { code: 'BIO', name: 'Biologiya', icon: '🧬', color: '#0D9488' },
  ];

  const currentSubject = subjects.find((s) => s.code === selectedSubject) || subjects[0];

  useEffect(() => {
    // Check download state
    setIsDownloaded(DownloadsManager.isBundleDownloaded(grade, selectedSubject));

    // Check subscription access state
    SubscriptionManager.getGradeAccess(grade).then((access) => {
      setGradeAccess(access);
    });
  }, [grade, selectedSubject]);

  const books = [
    {
      id: 'sb',
      type: 'STUDENT_BOOK',
      title: "Student's Book (Darslik)",
      subtitle: '142 bet • 24 Audio & 12 Video Hotspots',
      icon: '📖',
      iconBg: '#FEF3C7',
      status: isDownloaded ? 'Yuklangan' : 'Oflayn tayyor',
      size: '42 MB',
    },
    {
      id: 'tb',
      type: 'TEACHER_BOOK',
      title: "Teacher's Book (Javoblar kaliti)",
      subtitle: '180 bet • Barcha mashqlar javobi bilan',
      icon: '💡',
      iconBg: '#DBEAFE',
      status: isDownloaded ? 'Yuklangan' : 'Oflayn tayyor',
      size: '38 MB',
    },
    {
      id: 'wb',
      type: 'WORKBOOK',
      title: 'Workbook (Ish daftari)',
      subtitle: '96 bet • Mustaqil mashqlar va testlar',
      icon: '✏️',
      iconBg: '#FCE7F3',
      status: isDownloaded ? 'Yuklangan' : 'Oflayn tayyor',
      size: '28 MB',
    },
    {
      id: 'audio',
      type: 'AUDIO_LIB',
      title: 'Audio Kutubxona (Listening)',
      subtitle: '24 ta MP3 trek • Offline o‘ynatish',
      icon: '🎧',
      iconBg: '#E0E7FF',
      status: '24 Trek',
      size: '65 MB',
    },
    {
      id: 'video',
      type: 'VIDEO_LIB',
      title: 'Video Darslar (Grammar Focus)',
      subtitle: '12 ta MP4 video • To‘liq darslik mavzulari',
      icon: '🎬',
      iconBg: '#FEF9C3',
      status: '12 Video',
      size: '140 MB',
    },
  ];

  const handleDownloadAll = async () => {
    setDownloadProgress(5);
    try {
      await DownloadsManager.downloadBundle(grade, selectedSubject, (percent) => {
        setDownloadProgress(percent);
      });
      setIsDownloaded(true);
      setDownloadProgress(null);
      Alert.alert(
        'Yuklandi! 📥',
        `${grade}-sinf ${currentSubject.name} to‘liq to‘plami yuklandi va Android Keystore AES-256-GCM bilan shifrlandi!`,
      );
    } catch {
      setDownloadProgress(null);
    }
  };

  const handleBookTap = (bookType: string) => {
    if (SubscriptionManager.isAccessValid(gradeAccess)) {
      onOpenReader(grade, selectedSubject, bookType);
    } else {
      setExpiredModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{grade}-sinf Darsliklari</Text>
        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <Text style={styles.moreIcon}>•••</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Pink Hero Card (Exact Card from Screen 3) */}
        <View style={styles.heroPinkCard}>
          <View style={styles.timeBadgeRow}>
            <View style={styles.timeBadge}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.timeBadgeText}>
                {gradeAccess.status === 'ACTIVE'
                  ? `Faol Obuna • ${gradeAccess.daysRemaining} kun qoldi`
                  : 'Obuna talab qilinadi'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroLessonTitle}>{currentSubject.name} {grade}</Text>

          {/* Meta Tags Row */}
          <View style={styles.metaTagsRow}>
            <View style={styles.metaTag}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>2025/2026 O‘quv yili</Text>
            </View>
            <View style={styles.metaTag}>
              <Text style={styles.metaIcon}>📋</Text>
              <Text style={styles.metaText}>Davlat standarti</Text>
            </View>
          </View>

          {/* Teacher Profile / Status */}
          <View style={styles.teacherRow}>
            <View style={styles.teacherAvatarCircle}>
              <Text style={styles.teacherAvatarEmoji}>👩‍🏫</Text>
            </View>
            <View style={styles.teacherDetails}>
              <Text style={styles.teacherName}>{userName}</Text>
              <Text style={styles.teacherRole}>Oliy toifali o‘qituvchi</Text>
            </View>
          </View>

          {/* Download Bundle Action Button */}
          <View style={styles.downloadSection}>
            {downloadProgress !== null ? (
              <View style={styles.downloadProgressWrap}>
                <View style={styles.downloadProgressHeader}>
                  <Text style={styles.downloadProgressTitle}>Yuklanmoqda (AES-256 shifrlash)...</Text>
                  <Text style={styles.downloadProgressPercent}>{downloadProgress}%</Text>
                </View>
                <View style={styles.downloadProgressBar}>
                  <View style={[styles.downloadProgressFill, { width: `${downloadProgress}%` }]} />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.downloadButton, isDownloaded && styles.downloadButtonDone]}
                activeOpacity={0.8}
                onPress={handleDownloadAll}
              >
                <Text style={styles.downloadButtonIcon}>{isDownloaded ? '✓' : '📥'}</Text>
                <Text style={styles.downloadButtonText}>
                  {isDownloaded ? 'Oflayn Saqlangan (138 MB)' : 'Barcha Darsliklarni Oflayn Yuklash (138 MB)'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Subjects Switcher */}
        <View style={styles.subjectsSection}>
          <Text style={styles.sectionTitle}>Fan Tanlang</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {subjects.map((s) => {
              const isSelected = s.code === selectedSubject;
              return (
                <TouchableOpacity
                  key={s.code}
                  style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                  onPress={() => setSelectedSubject(s.code)}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{s.icon}</Text>
                  <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Subscription Plans Selection Card */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Obuna Rejalari (Plans)</Text>
          <View style={styles.plansRow}>
            {/* 1 Month */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'MONTHLY' && styles.planCardActive]}
              onPress={() => setSelectedPlan('MONTHLY')}
              activeOpacity={0.8}
            >
              <Text style={styles.planDuration}>1 Oylik</Text>
              <Text style={styles.planDays}>30 kun</Text>
              <Text style={styles.planPrice}>{grade === 11 ? '119,000' : '99,000'} UZS</Text>
            </TouchableOpacity>

            {/* 3 Months */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'THREE_MONTHS' && styles.planCardActive]}
              onPress={() => setSelectedPlan('THREE_MONTHS')}
              activeOpacity={0.8}
            >
              <View style={styles.badgePopular}>
                <Text style={styles.badgePopularText}>TEJAMKOR</Text>
              </View>
              <Text style={styles.planDuration}>3 Oylik</Text>
              <Text style={styles.planDays}>90 kun</Text>
              <Text style={styles.planPrice}>{grade === 11 ? '299,000' : '249,000'} UZS</Text>
            </TouchableOpacity>

            {/* 1 Year */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'YEARLY' && styles.planCardActive]}
              onPress={() => setSelectedPlan('YEARLY')}
              activeOpacity={0.8}
            >
              <Text style={styles.planDuration}>1 Yillik</Text>
              <Text style={styles.planDays}>365 kun</Text>
              <Text style={styles.planPrice}>{grade === 11 ? '890,000' : '799,000'} UZS</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.requestCtaButton}
            onPress={() => onRequestAccess(grade, selectedSubject, selectedPlan)}
            activeOpacity={0.85}
          >
            <Text style={styles.requestCtaText}>
              📞 Ushbu Tarifga Ruxsat So‘rash
            </Text>
          </TouchableOpacity>
        </View>

        {/* Books & Materials List (Screen 3 Bottom: Last Lessons) */}
        <View style={styles.booksSection}>
          <Text style={styles.sectionTitle}>Darsliklar & Materiallar</Text>

          <View style={{ gap: 12 }}>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.bookCard}
                activeOpacity={0.75}
                onPress={() => handleBookTap(book.type)}
              >
                <View style={[styles.bookIconCircle, { backgroundColor: book.iconBg }]}>
                  <Text style={styles.bookEmoji}>{book.icon}</Text>
                </View>

                <View style={styles.bookDetails}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookSubtitle}>{book.subtitle}</Text>
                </View>

                <View style={styles.bookStatusPill}>
                  <Text style={styles.bookStatusText}>{book.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Expired / Locked Access Modal */}
      <ExpiredAccessModal
        visible={expiredModalVisible}
        gradeNumber={grade}
        subjectName={currentSubject.name}
        isExpired={gradeAccess.status === 'EXPIRED'}
        onClose={() => setExpiredModalVisible(false)}
        onRequestAccess={() => {
          onRequestAccess(grade, selectedSubject, selectedPlan);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '800',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIcon: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  heroPinkCard: {
    backgroundColor: '#0F2942',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  checkIcon: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '900',
    marginRight: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  heroLessonTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  metaTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teacherAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  teacherAvatarEmoji: {
    fontSize: 18,
  },
  teacherDetails: {
    flex: 1,
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  teacherRole: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  downloadSection: {
    marginTop: 4,
  },
  downloadButton: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  downloadButtonDone: {
    backgroundColor: '#059669',
  },
  downloadButtonIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 6,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  downloadProgressWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
  },
  downloadProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  downloadProgressTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  downloadProgressPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  downloadProgressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  downloadProgressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  subjectsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subjectChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subjectChipTextActive: {
    color: '#2563EB',
  },
  plansSection: {
    marginBottom: 20,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    position: 'relative',
  },
  planCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  badgePopular: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgePopularText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  planDuration: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  planDays: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 11,
    fontWeight: '900',
    color: '#059669',
    marginTop: 6,
  },
  requestCtaButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  requestCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  booksSection: {
    marginBottom: 20,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookEmoji: {
    fontSize: 22,
  },
  bookDetails: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bookStatusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bookStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
});
