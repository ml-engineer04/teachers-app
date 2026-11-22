import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ImageStyle,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Audio } from 'expo-av';
import { pdfPageToBookDisplay } from '@smartteacherbook/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export interface AnswerItem {
  id?: string;
  exerciseLabel: string;
  teacherPageNumber: number;
  solutionText: string;
  methodologyNotes?: string;
  imageUrl?: string;
  answerImages?: string[];
  transcriptText?: string;
  transcriptImages?: string[];
  targetMediaId?: string;
  targetMediaTitle?: string;
  targetMediaUrl?: string;
  targetTeacherBookId?: string;
}

interface AnswerKeySheetProps {
  visible: boolean;
  onClose: () => void;
  pageNumber: number;
  totalPages?: number;
  contentStartPdfPage?: number;
  exerciseLabel: string;
  teacherPageNumber: number;
  solutionText: string;
  methodologyNotes?: string;
  imageUrl?: string;
  items?: AnswerItem[];
  selectedHotspotId?: string | null;
  initialTab?: 'ANSWERS' | 'TRANSCRIPT';
  onSwitchToTeachersBook?: (teacherPage: number) => void;
}

/* ========================================================================= */
/* Clean Vector SVG Icons matching Web (lucide)                              */
/* ========================================================================= */

const KeyRoundIcon = ({ size = 18, color = '#6D3FD1' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2.586 17.414A2 2 0 002 18.828V21a1 1 0 001 1h3a1 1 0 001-1v-1a1 1 0 011-1h1a1 1 0 001-1v-1a1 1 0 011-1h.172a2 2 0 001.414-.586l.814-.814a6.5 6.5 0 10-4-4z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16.5 7.5a.5.5 0 110-1 .5.5 0 010 1z"
      fill={color}
      stroke={color}
      strokeWidth={1}
    />
  </Svg>
);

const FileTextIcon = ({ size = 18, color = '#0369A1' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = ({ size = 16, color = '#5B6672' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BookOpenIcon = ({ size = 16, color = '#4338CA' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HeadphonesIcon = ({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 18v-6a9 9 0 0118 0v6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ZoomInIcon = ({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
    <Path d="M21 21l-4.35-4.35M11 8v6M8 11h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const HelpCircleIcon = ({ size = 36, color = '#6D3FD1' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path
      d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlayMiniIcon = ({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3l14 9-14 9V3z" fill={color} />
  </Svg>
);

const PauseMiniIcon = ({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill={color} />
  </Svg>
);

/* ========================================================================= */
/* Helper to parse solution pills matching Web logic                         */
/* ========================================================================= */

const parseSolutionPills = (text?: string | null): Array<{ num: string; ans: string }> => {
  if (!text) return [];
  const raw = text.trim();
  if (!raw) return [];
  const tokens: Array<{ num: string; ans: string }> = [];
  const parts = raw.split(/[\n,;|]+/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*[.):\-–]\s*(.+)$/);
    if (m && m[2].length <= 36) {
      tokens.push({ num: m[1], ans: m[2].trim() });
    }
  }
  return tokens.length >= 1 ? tokens : [];
};

export const AnswerKeySheet: React.FC<AnswerKeySheetProps> = ({
  visible,
  onClose,
  pageNumber,
  totalPages = 100,
  contentStartPdfPage = 1,
  exerciseLabel,
  teacherPageNumber,
  solutionText,
  methodologyNotes,
  imageUrl,
  items = [],
  selectedHotspotId,
  initialTab = 'ANSWERS',
  onSwitchToTeachersBook,
}) => {
  const { isDark } = useTheme();
  const { strings, language } = useI18n();

  // Active Tab: Answers vs Listening Transcript
  const [activeTab, setActiveTab] = useState<'ANSWERS' | 'TRANSCRIPT'>(initialTab);

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    if (selectedHotspotId && items.length > 0) {
      const idx = items.findIndex((it) => it.id === selectedHotspotId);
      if (idx !== -1) return idx;
    }
    return 0;
  });

  useEffect(() => {
    if (selectedHotspotId && items.length > 0) {
      const idx = items.findIndex((it) => it.id === selectedHotspotId);
      if (idx !== -1) {
        setSelectedIndex(idx);
        return;
      }
    }
    setSelectedIndex((prev) => (prev < items.length ? prev : 0));
  }, [selectedHotspotId, items, visible]);

  // Transcript font size scaler (A- / A+)
  const [transcriptFontSize, setTranscriptFontSize] = useState<number>(15);

  // Fullscreen Zoom image modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Mini embedded audio player
  const [isMiniAudioPlaying, setIsMiniAudioPlaying] = useState(false);
  const [miniAudioLoading, setMiniAudioLoading] = useState(false);
  const miniSoundRef = useRef<Audio.Sound | null>(null);

  const stopMiniAudio = useCallback(async () => {
    if (miniSoundRef.current) {
      try {
        await miniSoundRef.current.unloadAsync();
      } catch {}
      miniSoundRef.current = null;
    }
    setIsMiniAudioPlaying(false);
    setMiniAudioLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      stopMiniAudio();
    }
    return () => {
      stopMiniAudio();
    };
  }, [visible, stopMiniAudio]);

  const pageDisplayInfo = pdfPageToBookDisplay(pageNumber, totalPages, contentStartPdfPage);
  const displayPageLabel = pageDisplayInfo.isFrontMatter
    ? `${strings.common.introShort} ${pageDisplayInfo.frontMatterIndex}`
    : `${strings.common.page} ${pageDisplayInfo.bookPage ?? pageNumber}`;

  const currentItem: AnswerItem =
    items.length > 0 && items[selectedIndex]
      ? items[selectedIndex]
      : {
          exerciseLabel,
          teacherPageNumber,
          solutionText,
          methodologyNotes,
          imageUrl,
          answerImages: imageUrl ? [imageUrl] : [],
        };

  const parsedPills = useMemo(() => {
    return parseSolutionPills(currentItem.solutionText);
  }, [currentItem.solutionText]);

  // Combined answer images
  const answerImagesList = useMemo(() => {
    if (currentItem.answerImages && currentItem.answerImages.length > 0) {
      return currentItem.answerImages;
    }
    return currentItem.imageUrl ? [currentItem.imageUrl] : [];
  }, [currentItem.answerImages, currentItem.imageUrl]);

  const transcriptImagesList = currentItem.transcriptImages || [];

  const hasTranscriptContent = Boolean(
    currentItem.transcriptText || transcriptImagesList.length > 0,
  );

  // Trilingual localized strings (UZ in Yangi O'zbek Lotin Alifbosi, RU, EN)
  const i18nTexts = useMemo(() => {
    if (language === 'ru') {
      return {
        subtitle: `${displayPageLabel} • Аудио и Ответы`,
        exercise: 'Упражнение',
        answersTab: 'Ключи ответов',
        transcriptTab: 'Аудио транскрипт',
        correctAnswersPills: 'ПРАВИЛЬНЫЕ ОТВЕТЫ (ЯЧЕЙКИ):',
        solutionExplanation: 'РЕШЕНИЕ И ОБЪЯСНЕНИЕ:',
        answerScreenshots: (count: number) => `СКРИНШОТЫ ОТВЕТОВ (${count}):`,
        zoomTap: 'Увеличить',
        methodologyNotes: 'МЕТОДИЧЕСКИЙ КОММЕНТАРИЙ:',
        noAnswersTitle: 'Для этой страницы ответы не добавлены',
        noAnswersSub: 'К этому уроку или упражнению ключи ответов не прикреплены.',
        transcriptHeader: 'Текст аудио транскрипта',
        noTranscriptText: 'Для этого упражнения транскрипт диалога не добавлен.',
        transcriptScreenshots: (count: number) => `СКРИНШОТЫ ТРАНСКРИПТА (${count}):`,
        audioExerciseSub: 'Аудио упражнение',
        teacherBookJump: (page: number) => `Перейти к стр. #${page} Teacher's Book`,
        close: strings.common?.close || 'Закрыть',
      };
    }
    if (language === 'en') {
      return {
        subtitle: `${displayPageLabel} • Listening & Answers`,
        exercise: 'Exercise',
        answersTab: 'Answer Keys',
        transcriptTab: 'Audio Transcript',
        correctAnswersPills: 'CORRECT ANSWERS (CELLS):',
        solutionExplanation: 'SOLUTION & EXPLANATION:',
        answerScreenshots: (count: number) => `ANSWER SCREENSHOTS (${count}):`,
        zoomTap: 'Enlarge',
        methodologyNotes: 'METHODOLOGY NOTES:',
        noAnswersTitle: 'No answer keys entered for this page',
        noAnswersSub: 'No answer keys are attached to this lesson or exercise.',
        transcriptHeader: 'Listening Transcript Text',
        noTranscriptText: 'No dialogue transcript entered for this exercise.',
        transcriptScreenshots: (count: number) => `TRANSCRIPT SCREENSHOTS (${count}):`,
        audioExerciseSub: 'Audio Exercise',
        teacherBookJump: (page: number) => `Jump to Teacher’s Book p. #${page}`,
        close: strings.common?.close || 'Close',
      };
    }
    // Default: 'uz' (Yangi O'zbek lotin alifbosi: töğri, öqituvçi, yeçim, tuşuntiriş, etc.)
    return {
      subtitle: `${displayPageLabel} • Tinglaş va Javoblar`,
      exercise: 'Maşq',
      answersTab: 'Javoblar kaliti',
      transcriptTab: 'Audio transkript',
      correctAnswersPills: 'TÖĞRI JAVOBLAR (KATAKÇALAR):',
      solutionExplanation: 'YEÇIM VA TUŞUNTIRIŞ:',
      answerScreenshots: (count: number) => `JAVOB SKRINŞOTLARI (${count} ta):`,
      zoomTap: 'Kattalaştiriş',
      methodologyNotes: 'METODIK IZOH:',
      noAnswersTitle: 'Uşbu sahifa uçun javoblar kiritilmagan',
      noAnswersSub: 'Uşbu dars yoki maşqqa javoblar kaliti biriktirilmagan.',
      transcriptHeader: 'Listening transkript matni',
      noTranscriptText: 'Uşbu maşq uçun dialog transkripti kiritilmagan.',
      transcriptScreenshots: (count: number) => `TRANSKRIPT SKRINŞOTLARI (${count} ta):`,
      audioExerciseSub: 'Audio maşq',
      teacherBookJump: (page: number) => `Teacher’s Book #${page}-betga ötiş`,
      close: strings.common?.close || 'Yopiş',
    };
  }, [language, displayPageLabel, strings.common?.close]);

  const toggleMiniAudio = async () => {
    if (!currentItem.targetMediaUrl) return;

    if (isMiniAudioPlaying && miniSoundRef.current) {
      await miniSoundRef.current.pauseAsync().catch(() => {});
      setIsMiniAudioPlaying(false);
      return;
    }

    if (miniSoundRef.current) {
      await miniSoundRef.current.playAsync().catch(() => {});
      setIsMiniAudioPlaying(true);
      return;
    }

    try {
      setMiniAudioLoading(true);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      }).catch(() => {});

      const { sound } = await Audio.Sound.createAsync(
        { uri: currentItem.targetMediaUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setIsMiniAudioPlaying(false);
          }
        },
      );
      miniSoundRef.current = sound;
      setIsMiniAudioPlaying(true);
    } catch {
      setIsMiniAudioPlaying(false);
    } finally {
      setMiniAudioLoading(false);
    }
  };

  // Web Theme Colors
  const themeCardBg = isDark ? '#1E222A' : '#FBFBF9';
  const themeBorder = isDark ? '#353B47' : '#D9DCD5';
  const themeTextPrimary = isDark ? '#E6E8EC' : '#142452';
  const themeTextSecondary = isDark ? '#9AA3B0' : '#5B6672';
  const themeAltBg = isDark ? '#272C36' : '#ECEEEA';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: themeCardBg,
              borderColor: themeBorder,
            },
          ]}
        >
          {/* ============================================================= */}
          {/* Header matching Web AnswerKeyDrawer                           */}
          {/* ============================================================= */}
          <View style={[styles.header, { borderBottomColor: themeBorder }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerInfoLeft}>
                {/* Clean squircle icon container */}
                <View
                  style={[
                    styles.iconSquircle,
                    {
                      backgroundColor: isDark ? 'rgba(109, 63, 209, 0.25)' : '#F4F0FD',
                      borderColor: isDark ? 'rgba(109, 63, 209, 0.4)' : '#E6DCFA',
                    },
                  ]}
                >
                  <KeyRoundIcon size={20} color={isDark ? '#B69CFF' : '#6D3FD1'} />
                </View>

                <View style={styles.titleCol}>
                  <Text style={[styles.headerTitle, { color: themeTextPrimary }]} numberOfLines={1}>
                    {currentItem.exerciseLabel || strings.reader.answerKeysTitle}
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: themeTextSecondary }]}>
                    {i18nTexts.subtitle}
                  </Text>
                </View>
              </View>

              {/* Clean Close (X) button */}
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: themeAltBg }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <CloseIcon size={16} color={themeTextSecondary} />
              </TouchableOpacity>
            </View>

            {/* Multiple Exercise Switcher Chips (if more than 1 exercise) */}
            {items.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.exChipsRow}
              >
                {items.map((item, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <TouchableOpacity
                      key={item.id || idx}
                      style={[
                        styles.exChip,
                        {
                          backgroundColor: isSelected ? '#6D3FD1' : themeAltBg,
                          borderColor: isSelected ? '#6D3FD1' : themeBorder,
                        },
                      ]}
                      onPress={() => {
                        stopMiniAudio();
                        setSelectedIndex(idx);
                      }}
                      activeOpacity={0.8}
                    >
                      <KeyRoundIcon size={13} color={isSelected ? '#FFFFFF' : themeTextSecondary} />
                      <Text
                        style={[
                          styles.exChipText,
                          { color: isSelected ? '#FFFFFF' : themeTextSecondary },
                        ]}
                      >
                        {item.exerciseLabel || `${i18nTexts.exercise} #${idx + 1}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Segmented Dual Tabs: [ 🔑 Javoblar Kaliti ] and [ 📜 Audio Transkript ] */}
            <View
              style={[
                styles.segmentContainer,
                { backgroundColor: themeAltBg, borderColor: themeBorder },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'ANSWERS' && [
                    styles.segmentBtnActive,
                    { backgroundColor: themeCardBg },
                  ],
                ]}
                onPress={() => setActiveTab('ANSWERS')}
                activeOpacity={0.8}
              >
                <KeyRoundIcon size={15} color={activeTab === 'ANSWERS' ? (isDark ? '#B69CFF' : '#6D3FD1') : themeTextSecondary} />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        activeTab === 'ANSWERS'
                          ? isDark
                            ? '#B69CFF'
                            : '#6D3FD1'
                          : themeTextSecondary,
                    },
                  ]}
                >
                  {i18nTexts.answersTab}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'TRANSCRIPT' && [
                    styles.segmentBtnActive,
                    { backgroundColor: themeCardBg },
                  ],
                ]}
                onPress={() => setActiveTab('TRANSCRIPT')}
                activeOpacity={0.8}
              >
                <FileTextIcon size={15} color={activeTab === 'TRANSCRIPT' ? (isDark ? '#7DD3FC' : '#0369A1') : themeTextSecondary} />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color:
                        activeTab === 'TRANSCRIPT'
                          ? isDark
                            ? '#7DD3FC'
                            : '#0369A1'
                          : themeTextSecondary,
                    },
                  ]}
                >
                  {i18nTexts.transcriptTab}
                </Text>
                {hasTranscriptContent && (
                  <View style={[styles.transcriptDot, { backgroundColor: isDark ? '#7DD3FC' : '#0369A1' }]} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================================= */}
          {/* Scrollable Main Content                                       */}
          {/* ============================================================= */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* =========================================================== */}
            {/* TAB 1: ANSWERS                                              */}
            {/* =========================================================== */}
            {activeTab === 'ANSWERS' && (
              <View style={styles.tabContent}>
                {/* 1. Smart Pills Badges (Katakchalar) */}
                {parsedPills.length > 0 && (
                  <View
                    style={[
                      styles.pillsCard,
                      {
                        backgroundColor: isDark ? 'rgba(109, 63, 209, 0.2)' : '#F4F0FD',
                        borderColor: isDark ? 'rgba(109, 63, 209, 0.4)' : '#E6DCFA',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionHeaderLabel,
                        { color: isDark ? '#B69CFF' : '#6D3FD1' },
                      ]}
                    >
                      {i18nTexts.correctAnswersPills}
                    </Text>
                    <View style={styles.pillsRow}>
                      {parsedPills.map((pill, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.smartPillBadge,
                            {
                              backgroundColor: themeCardBg,
                              borderColor: isDark ? 'rgba(109, 63, 209, 0.5)' : '#E6DCFA',
                            },
                          ]}
                        >
                          <Text style={styles.pillNumText}>{pill.num}. </Text>
                          <Text
                            style={[
                              styles.pillAnsText,
                              { color: isDark ? '#B69CFF' : '#6D3FD1' },
                            ]}
                          >
                            {pill.ans}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 2. Free-form Solution Text (Yechim va tushuntirish) */}
                {!!currentItem.solutionText && (
                  <View
                    style={[
                      styles.solutionCard,
                      {
                        backgroundColor: isDark ? '#15181E' : '#F4F5F2',
                        borderColor: themeBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.sectionHeaderLabel, { color: themeTextSecondary }]}>
                      {i18nTexts.solutionExplanation}
                    </Text>
                    <Text style={[styles.solutionText, { color: themeTextPrimary }]}>
                      {currentItem.solutionText}
                    </Text>
                  </View>
                )}

                {/* 3. Answer Images Gallery */}
                {answerImagesList.length > 0 && (
                  <View style={styles.gallerySection}>
                    <Text style={[styles.sectionHeaderLabel, { color: themeTextSecondary }]}>
                      {i18nTexts.answerScreenshots(answerImagesList.length)}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                      {answerImagesList.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.galleryCard,
                            { borderColor: themeBorder, backgroundColor: '#020617' },
                          ]}
                          onPress={() => setZoomImageUrl(uri)}
                          activeOpacity={0.88}
                        >
                          <Image source={{ uri }} style={styles.galleryImage} resizeMode="contain" />
                          <View style={styles.galleryIndexBadge}>
                            <Text style={styles.galleryIndexText}>#{idx + 1}</Text>
                          </View>
                          <View style={styles.zoomTapBadge}>
                            <ZoomInIcon size={12} color="#FFFFFF" />
                            <Text style={styles.zoomTapText}>{i18nTexts.zoomTap}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* 4. Methodology Notes (Metodik Izoh) */}
                {!!currentItem.methodologyNotes && (
                  <View
                    style={[
                      styles.methodologyCard,
                      {
                        backgroundColor: isDark ? 'rgba(120, 53, 15, 0.35)' : 'rgba(254, 243, 199, 0.7)',
                        borderColor: isDark ? '#92400E' : '#FDE68A',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sectionHeaderLabel,
                        { color: isDark ? '#FCD34D' : '#92400E', marginBottom: 4 },
                      ]}
                    >
                      {i18nTexts.methodologyNotes}
                    </Text>
                    <Text
                      style={[
                        styles.methodologyText,
                        { color: isDark ? '#FDE68A' : '#78350F' },
                      ]}
                    >
                      {currentItem.methodologyNotes}
                    </Text>
                  </View>
                )}

                {/* Empty State */}
                {parsedPills.length === 0 &&
                  !currentItem.solutionText &&
                  answerImagesList.length === 0 &&
                  !currentItem.methodologyNotes && (
                    <View style={styles.emptyWrap}>
                      <HelpCircleIcon size={36} color={isDark ? '#B69CFF' : '#6D3FD1'} />
                      <Text style={[styles.emptyTitle, { color: themeTextPrimary }]}>
                        {i18nTexts.noAnswersTitle}
                      </Text>
                      <Text style={[styles.emptySubtitle, { color: themeTextSecondary }]}>
                        {i18nTexts.noAnswersSub}
                      </Text>
                    </View>
                  )}
              </View>
            )}

            {/* =========================================================== */}
            {/* TAB 2: TRANSCRIPT                                           */}
            {/* =========================================================== */}
            {activeTab === 'TRANSCRIPT' && (
              <View style={styles.tabContent}>
                {/* 1. Font Size Scaler Bar matching Web */}
                <View
                  style={[
                    styles.transcriptHeaderBar,
                    {
                      backgroundColor: isDark ? 'rgba(12, 74, 110, 0.4)' : '#F0F9FF',
                      borderColor: isDark ? 'rgba(3, 105, 161, 0.5)' : '#BAE6FD',
                    },
                  ]}
                >
                  <View style={styles.transcriptHeaderLeft}>
                    <FileTextIcon size={16} color={isDark ? '#7DD3FC' : '#0369A1'} />
                    <Text
                      style={[
                        styles.transcriptHeaderTitle,
                        { color: isDark ? '#7DD3FC' : '#0369A1' },
                      ]}
                    >
                      {i18nTexts.transcriptHeader}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.fontPillContainer,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#BAE6FD',
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => setTranscriptFontSize((s) => Math.max(12, s - 2))}
                      style={styles.fontPillBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[styles.fontBtnText, { color: themeTextSecondary }]}>A-</Text>
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.fontSizeIndicator,
                        { color: isDark ? '#7DD3FC' : '#0369A1' },
                      ]}
                    >
                      {transcriptFontSize}px
                    </Text>

                    <TouchableOpacity
                      onPress={() => setTranscriptFontSize((s) => Math.min(26, s + 2))}
                      style={styles.fontPillBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[styles.fontBtnText, { color: themeTextSecondary }]}>A+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Dialogue Text with Dynamic Font Size */}
                {!!currentItem.transcriptText ? (
                  <View
                    style={[
                      styles.dialogueCard,
                      {
                        backgroundColor: isDark ? '#151D2C' : '#F8FAFC',
                        borderColor: isDark ? '#232F46' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dialogueBody,
                        {
                          fontSize: transcriptFontSize,
                          lineHeight: Math.round(transcriptFontSize * 1.55),
                          color: isDark ? '#F1F5F9' : '#0F172A',
                        },
                      ]}
                    >
                      {currentItem.transcriptText}
                    </Text>
                  </View>
                ) : transcriptImagesList.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptySubtitle, { color: themeTextSecondary }]}>
                      {i18nTexts.noTranscriptText}
                    </Text>
                  </View>
                ) : null}

                {/* 3. Transcript Images Gallery */}
                {transcriptImagesList.length > 0 && (
                  <View style={styles.gallerySection}>
                    <Text style={[styles.sectionHeaderLabel, { color: themeTextSecondary }]}>
                      {i18nTexts.transcriptScreenshots(transcriptImagesList.length)}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                      {transcriptImagesList.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.galleryCard,
                            { borderColor: themeBorder, backgroundColor: '#020617' },
                          ]}
                          onPress={() => setZoomImageUrl(uri)}
                          activeOpacity={0.88}
                        >
                          <Image source={{ uri }} style={styles.galleryImage} resizeMode="contain" />
                          <View style={styles.galleryIndexBadge}>
                            <Text style={styles.galleryIndexText}>#{idx + 1}</Text>
                          </View>
                          <View style={styles.zoomTapBadge}>
                            <ZoomInIcon size={12} color="#FFFFFF" />
                            <Text style={styles.zoomTapText}>{i18nTexts.zoomTap}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* ============================================================= */}
          {/* Footer Bar matching Web: Audio Player, Teacher Jump, Close    */}
          {/* ============================================================= */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: themeBorder,
                backgroundColor: isDark ? 'rgba(18, 26, 45, 0.8)' : 'rgba(244, 245, 242, 0.8)',
              },
            ]}
          >
            {/* Embedded Audio Player Track */}
            {!!currentItem.targetMediaUrl && (
              <View style={styles.embeddedAudioRow}>
                <View style={styles.embeddedAudioInfo}>
                  <View style={styles.embeddedAudioIconBox}>
                    <HeadphonesIcon size={15} color="#FFFFFF" />
                  </View>
                  <View style={styles.embeddedAudioTextWrap}>
                    <Text style={styles.embeddedAudioTitle} numberOfLines={1}>
                      {currentItem.targetMediaTitle || 'Listening Track'}
                    </Text>
                    <Text style={styles.embeddedAudioSub}>{i18nTexts.audioExerciseSub}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.miniPlayBtn}
                  onPress={toggleMiniAudio}
                  activeOpacity={0.8}
                >
                  {miniAudioLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : isMiniAudioPlaying ? (
                    <PauseMiniIcon size={12} color="#FFFFFF" />
                  ) : (
                    <PlayMiniIcon size={12} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Jump to Teacher's Book Page Button */}
            {!!currentItem.teacherPageNumber && !!onSwitchToTeachersBook && (
              <TouchableOpacity
                style={[
                  styles.teacherJumpBtn,
                  {
                    backgroundColor: isDark ? 'rgba(49, 46, 129, 0.5)' : '#EEF2FF',
                    borderColor: isDark ? '#4338CA' : '#C7D2FE',
                  },
                ]}
                onPress={() => {
                  stopMiniAudio();
                  onClose();
                  onSwitchToTeachersBook(currentItem.teacherPageNumber);
                }}
                activeOpacity={0.8}
              >
                <BookOpenIcon size={16} color={isDark ? '#A5B4FC' : '#4338CA'} />
                <Text
                  style={[
                    styles.teacherJumpBtnText,
                    { color: isDark ? '#A5B4FC' : '#4338CA' },
                  ]}
                >
                  {i18nTexts.teacherBookJump(currentItem.teacherPageNumber)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Clean Close Button */}
            <TouchableOpacity
              style={[styles.closeFooterBtn, { backgroundColor: themeAltBg }]}
              onPress={() => {
                stopMiniAudio();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.closeFooterBtnText, { color: themeTextPrimary }]}>
                {i18nTexts.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ================================================================= */}
      {/* Fullscreen Ultra-Zoom Lightbox Modal                              */}
      {/* ================================================================= */}
      {!!zoomImageUrl && (
        <Modal
          visible={!!zoomImageUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomImageUrl(null)}
        >
          <View style={styles.zoomOverlay}>
            <TouchableOpacity
              style={styles.zoomClosePill}
              onPress={() => setZoomImageUrl(null)}
              activeOpacity={0.8}
            >
              <CloseIcon size={14} color="#FFFFFF" />
              <Text style={styles.zoomCloseText}>{i18nTexts.close}</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: zoomImageUrl }}
              style={styles.zoomFullImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 450,
    maxHeight: '86%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconSquircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exChipsRow: {
    gap: 6,
    marginTop: 10,
    paddingBottom: 2,
  },
  exChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
  },
  exChipText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 3.5,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  transcriptDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 2,
  },
  bodyScroll: {
    flexGrow: 0,
    maxHeight: 380,
  },
  bodyScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  tabContent: {
    gap: 12,
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pillsCard: {
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  smartPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pillNumText: {
    color: '#8557E6',
    fontWeight: '700',
    fontSize: 13,
  },
  pillAnsText: {
    fontWeight: '800',
    fontSize: 13,
  },
  solutionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  solutionText: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 21,
  },
  gallerySection: {
    marginTop: 2,
  },
  galleryScroll: {
    flexDirection: 'row',
  },
  galleryCard: {
    width: 230,
    height: 140,
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  galleryIndexBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  galleryIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  zoomTapBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  zoomTapText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  methodologyCard: {
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  methodologyText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  transcriptHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  transcriptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  transcriptHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  fontPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  fontPillBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fontBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  fontSizeIndicator: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
  },
  dialogueCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dialogueBody: {
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  embeddedAudioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#0F172A',
  },
  embeddedAudioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  embeddedAudioIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  embeddedAudioTextWrap: {
    flex: 1,
  },
  embeddedAudioTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  embeddedAudioSub: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  miniPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherJumpBtn: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  teacherJumpBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  closeFooterBtn: {
    width: '100%',
    paddingVertical: 10.5,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFooterBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zoomClosePill: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
  },
  zoomCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  zoomFullImage: {
    width: '100%',
    height: '84%',
  } as ImageStyle,
});
