import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Hotspot, HotspotType, PageTurnStyle } from '@smartteacherbook/shared';
import { PageCurlEngine } from '../components/reader/PageCurlEngine';
import { HotspotLayer } from '../components/reader/HotspotLayer';
import { WatermarkOverlay } from '../components/reader/WatermarkOverlay';
import { AudioPlayerModal } from '../components/reader/AudioPlayerModal';
import { VideoPlayerModal } from '../components/reader/VideoPlayerModal';
import { AnswerKeySheet } from '../components/reader/AnswerKeySheet';
import { TocSearchDrawer } from '../components/reader/TocSearchDrawer';
import { BookmarksNotesDrawer } from '../components/reader/BookmarksNotesDrawer';
import { MediaLibraryDrawer } from '../components/reader/MediaLibraryDrawer';
import { DrawingHighlighterLayer, DrawingTool } from '../components/reader/DrawingHighlighterLayer';

interface ReaderScreenProps {
  userEmail: string;
  onExit: () => void;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({ userEmail, onExit }) => {
  const [currentPage, setCurrentPage] = useState<number>(2);
  const [turnStyle, setTurnStyle] = useState<PageTurnStyle>(PageTurnStyle.CURL);
  const [isTabletSpread, setIsTabletSpread] = useState<boolean>(false);

  // Modals & Drawers
  const [audioModalVisible, setAudioModalVisible] = useState<boolean>(false);
  const [activeAudioTrack, setActiveAudioTrack] = useState<{ title: string; unit: string }>({
    title: 'Unit 1: Track 1 — Listening',
    unit: 'Unit 1',
  });

  const [videoModalVisible, setVideoModalVisible] = useState<boolean>(false);
  const [activeVideoLesson, setActiveVideoLesson] = useState<{ title: string; unit: string }>({
    title: 'Unit 1: Conditionals Grammar Focus',
    unit: 'Unit 1',
  });

  const [answerSheetVisible, setAnswerSheetVisible] = useState<boolean>(false);
  const [activeAnswerData, setActiveAnswerData] = useState<{
    exerciseLabel: string;
    studentPage: number;
    teacherPage: number;
    answerContent: string;
    notes?: string;
    imageUrl?: string;
  }>({
    exerciseLabel: 'Ex. 1 Vocab & Reading',
    studentPage: 2,
    teacherPage: 14,
    answerContent:
      '1. True — Artificial intelligence transforms interactive language lessons.\n2. False — Teachers maintain vital mentorship and communication roles.\n3. Not Given — Specific curriculum budget not stated.\n4. Paired dialogue practice promotes student confidence.',
    notes:
      'Ushbu mashqda o‘quvchilar ko‘pincha passiv va aktiv zamon qo‘llanishida xatolikka yo‘l qo‘yadilar. 3-savol bo‘yicha sinfda juftlik muhokamasini o‘tkazish tavsiya etiladi.',
  });

  const [tocDrawerVisible, setTocDrawerVisible] = useState<boolean>(false);
  const [bookmarksDrawerVisible, setBookmarksDrawerVisible] = useState<boolean>(false);
  const [mediaDrawerVisible, setMediaDrawerVisible] = useState<boolean>(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>('OFF');
  const [liveHotspots, setLiveHotspots] = useState<any[]>([]);
  const [liveAnswerMappings, setLiveAnswerMappings] = useState<any[]>([]);

  // Phase 5: Fetch published hotspots and answer mappings from backend with offline fallback
  useEffect(() => {
    fetch('http://localhost:4000/api/v1/content/books/book_grade11_english_sb/hotspots')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveHotspots(data);
        }
      })
      .catch(() => {
        // Fallback silently in offline mode
      });

    fetch('http://localhost:4000/api/v1/answer-mappings')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveAnswerMappings(data);
        }
      })
      .catch(() => {});
  }, []);

  // Hotspots for Student's Book (dynamic from Visual Editor API and Answer Mappings)
  const getPageHotspots = (page: number): Hotspot[] => {
    const dynamicHotspots: Hotspot[] = [];

    if (liveHotspots.length > 0) {
      liveHotspots
        .filter((h) => h.pageNumber === page)
        .forEach((h) => {
          dynamicHotspots.push({
            id: h.id,
            pageId: `p${page}`,
            type:
              h.type === 'AUDIO'
                ? HotspotType.AUDIO
                : h.type === 'VIDEO'
                ? HotspotType.VIDEO
                : HotspotType.ANSWER_LINK,
            rect: h.rect,
            targetMediaId: h.targetFile,
            exerciseLabel: h.exerciseLabel || h.label,
            targetPageNumber: h.targetPageNumber,
            solutionText: h.solutionText,
            methodologyNotes: h.methodologyNotes,
            multiAnswers: h.multiAnswers,
            imageUrl: h.imageUrl,
          });
        });
    }

    if (liveAnswerMappings.length > 0) {
      liveAnswerMappings
        .filter((m) => m.studentPageNumber === page)
        .forEach((ans, idx) => {
          dynamicHotspots.push({
            id: `map-${ans.id}`,
            pageId: `p${page}`,
            type: HotspotType.ANSWER_LINK,
            rect: { x: 0.52, y: 0.82 - idx * 0.1, w: 0.44, h: 0.08 },
            exerciseLabel: ans.studentExerciseLabel || 'Javoblar kaliti',
            targetPageNumber: ans.teacherPageNumber || page + 12,
            solutionText: ans.solutionKey || ans.notes,
            methodologyNotes: ans.notes,
            imageUrl: ans.imageUrl || undefined,
          });
        });
    }

    if (dynamicHotspots.length > 0) {
      return dynamicHotspots;
    }

    // Default seed fallback
    if (page === 2) {
      return [
        {
          id: 'h-audio-1',
          pageId: 'p2',
          type: HotspotType.AUDIO,
          rect: { x: 0.1, y: 0.82, w: 0.38, h: 0.08 },
          targetMediaId: 'unit1_track1.mp3',
        },
        {
          id: 'h-answer-1',
          pageId: 'p2',
          type: HotspotType.ANSWER_LINK,
          rect: { x: 0.54, y: 0.82, w: 0.38, h: 0.08 },
          exerciseLabel: 'Task 2.1 Answers (p. 14)',
          targetPageNumber: 14,
          solutionText:
            '1. Digital Classrooms — C (Interactive learning spaces)\n2. AI Tutors — A (Adaptive automated support)\n3. Pedagogy — D (Art and science of teaching)\n4. Active Speaking — B (Participatory oral practice)',
          methodologyNotes:
            'Tavsiya: O‘quvchilarga avval 3 daqiqa mustaqil ishlashga ruxsat bering. So‘ngra juftliklarda tekshirtirib, dars audio yozuvi orqali javoblarni tasdiqlang.',
        },
      ];
    }
    if (page === 4) {
      return [
        {
          id: 'h-video-1',
          pageId: 'p4',
          type: HotspotType.VIDEO,
          rect: { x: 0.25, y: 0.82, w: 0.5, h: 0.08 },
          targetMediaId: 'unit2_grammar.mp4',
        },
      ];
    }
    return [];
  };

  const handleHotspotPress = (hotspot: any) => {
    if (hotspot.type === HotspotType.AUDIO) {
      setActiveAudioTrack({
        title: hotspot.exerciseLabel || `Unit ${Math.ceil(currentPage / 2)}: Track ${currentPage} — Listening`,
        unit: `Unit ${Math.ceil(currentPage / 2)}`,
      });
      setAudioModalVisible(true);
    } else if (hotspot.type === HotspotType.VIDEO) {
      setActiveVideoLesson({
        title: hotspot.exerciseLabel || `Unit ${Math.ceil(currentPage / 2)}: Video Lesson`,
        unit: `Unit ${Math.ceil(currentPage / 2)}`,
      });
      setVideoModalVisible(true);
    } else if (hotspot.type === HotspotType.ANSWER_LINK) {
      let content = hotspot.solutionText;
      if (!content && hotspot.multiAnswers && hotspot.multiAnswers.length > 0) {
        content = hotspot.multiAnswers
          .map((m: any) => `${m.exerciseNumber}: ${m.solutionKey}`)
          .join('\n\n');
      }
      if (!content) {
        content =
          '1. True — Artificial intelligence transforms interactive language lessons.\n2. False — Teachers maintain vital mentorship and communication roles.\n3. Not Given — Specific curriculum budget not stated.\n4. Paired dialogue practice promotes student confidence.';
      }

      setActiveAnswerData({
        exerciseLabel: hotspot.exerciseLabel || 'Task 2.1 Vocabulary & Key',
        studentPage: currentPage,
        teacherPage: hotspot.targetPageNumber || currentPage + 12,
        answerContent: content,
        notes:
          hotspot.methodologyNotes ||
          'Metodik eslatma: Ushbu mashq bo‘yicha o‘quvchilar juftlikda 5 daqiqa gaplashib, keyin javoblar kalitini tekshirishi tavsiya etiladi.',
        imageUrl: hotspot.imageUrl,
      });
      setAnswerSheetVisible(true);
    }
  };

  const renderPage = (pageNumber: number, isZoomed: boolean) => {
    const hotspots = getPageHotspots(pageNumber);

    return (
      <View style={styles.pageContent}>
        {/* Top Unit & Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>
            English 11 • Unit {Math.ceil(pageNumber / 2)}: Digital Future
          </Text>
          <Text style={styles.pageHeaderNumber}>{pageNumber}</Text>
        </View>

        {/* Content Body (Simulating high-res WebP page image rendering) */}
        <View style={styles.pageBody}>
          <Text style={styles.pageLessonTitle}>
            {pageNumber === 1 && 'Welcome to Grade 11 Secondary Curriculum'}
            {pageNumber === 2 && '1.2 Digital Classrooms, AI Tutors & Pedagogy'}
            {pageNumber === 3 && 'Unit 1: Vocabulary in Context & Idioms'}
            {pageNumber === 4 && 'Unit 2: Grammar Focus — Conditionals Type 3'}
            {pageNumber === 5 && 'Unit 3: Global Ecosystems & Biodiversity'}
            {pageNumber === 6 && 'Unit 3: Speaking Masterclass & Fluency'}
          </Text>

          <Text style={styles.paragraphText}>
            In today's digital age, modern educators integrate multimedia educational tools, listening exercises, and active speaking tasks. This digital textbook gives teachers instantaneous access to verified classroom audio, lesson videos, and official Teacher's Book answer keys directly attached to the text.
          </Text>

          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>Task {pageNumber}.1: Interactive Vocabulary</Text>
            <Text style={styles.taskDesc}>
              Listen to the audio recording below and match the key terms with their definitions.
            </Text>
          </View>
        </View>

        {/* Drawing & Highlighter Layer */}
        <DrawingHighlighterLayer
          pageNumber={pageNumber}
          activeTool={activeDrawingTool}
          onCloseTool={() => setActiveDrawingTool('OFF')}
        />

        {/* Hotspot Touch Layer */}
        <HotspotLayer
          hotspots={hotspots}
          pageWidth={320}
          pageHeight={460}
          onHotspotPress={handleHotspotPress}
        />

        {/* Anti-piracy Watermark Overlay (Spec §7) */}
        <WatermarkOverlay userEmail={userEmail} deviceId="sec_dev_keystore_api35" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Professional Reader Toolbar with Safe Camera Cutout Clearance */}
      <View style={styles.topToolbar}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backLabel}>Chiqish</Text>
        </TouchableOpacity>

        <View style={styles.titleCenter}>
          <Text style={styles.bookTitle} numberOfLines={1} ellipsizeMode="tail">
            11-sinf English Student's Book
          </Text>
        </View>

        <TouchableOpacity
          style={styles.stylePill}
          onPress={() =>
            setTurnStyle(turnStyle === PageTurnStyle.CURL ? PageTurnStyle.SLIDE : PageTurnStyle.CURL)
          }
          activeOpacity={0.7}
        >
          <Text style={styles.stylePillText}>
            {turnStyle === PageTurnStyle.CURL ? '3D' : 'Slide'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Full-Bleed Page Canvas Container */}
      <View style={styles.readerCanvas}>
        <PageCurlEngine
          totalPages={6}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          turnStyle={turnStyle}
          isTabletSpread={isTabletSpread}
          renderPageContent={renderPage}
        />

        {/* Floating Bottom Ergonomic Reader Action Dock (Immune to Camera Notch & Dock) */}
        <View style={styles.floatingBottomDock}>
          {/* Previous page button */}
          <TouchableOpacity
            onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={[styles.floatingNavBtn, currentPage <= 1 && styles.floatingNavBtnDisabled]}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingNavIcon}>‹</Text>
          </TouchableOpacity>

          {/* Page Indicator Pill */}
          <View style={styles.floatingPagePill}>
            <Text style={styles.floatingPageText}>
              {currentPage} / 6
            </Text>
          </View>

          {/* Quick Tool: Audio */}
          <TouchableOpacity
            style={styles.floatingToolBtn}
            onPress={() => {
              setActiveAudioTrack({
                title: `Unit ${Math.ceil(currentPage / 2)}: Track ${currentPage} — Listening`,
                unit: `Unit ${Math.ceil(currentPage / 2)}`,
              });
              setAudioModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingToolIcon}>🎧</Text>
            <Text style={styles.floatingToolLabel}>Audio</Text>
          </TouchableOpacity>

          {/* Quick Tool: Teacher's Answer Key */}
          <TouchableOpacity
            style={styles.floatingToolBtn}
            onPress={() => {
              setActiveAnswerData({
                exerciseLabel: `Task ${currentPage}.1 Answers (p. ${currentPage + 12})`,
                studentPage: currentPage,
                teacherPage: currentPage + 12,
                answerContent:
                  '1. True — Artificial intelligence transforms interactive language lessons.\n2. False — Teachers maintain vital mentorship and communication roles.\n3. Not Given — Specific curriculum budget not stated.\n4. Paired dialogue practice promotes student confidence.',
                notes:
                  'Metodik eslatma: Ushbu mashq bo‘yicha o‘quvchilar juftlikda 5 daqiqa gaplashib, keyin javoblar kalitini tekshirishi tavsiya etiladi.',
              });
              setAnswerSheetVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingToolIcon}>💡</Text>
            <Text style={styles.floatingToolLabel}>Kalit</Text>
          </TouchableOpacity>

          {/* Quick Tool: Highlighter */}
          <TouchableOpacity
            style={[styles.floatingToolBtn, activeDrawingTool !== 'OFF' && styles.floatingToolBtnActive]}
            onPress={() =>
              setActiveDrawingTool(activeDrawingTool === 'OFF' ? 'HIGHLIGHTER' : 'OFF')
            }
            activeOpacity={0.7}
          >
            <Text style={styles.floatingToolIcon}>✏️</Text>
            <Text style={styles.floatingToolLabel}>Chizish</Text>
          </TouchableOpacity>

          {/* Quick Tool: Table of Contents */}
          <TouchableOpacity
            style={styles.floatingToolBtn}
            onPress={() => setTocDrawerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingToolIcon}>📑</Text>
            <Text style={styles.floatingToolLabel}>Mundarija</Text>
          </TouchableOpacity>

          {/* Next page button */}
          <TouchableOpacity
            onPress={() => currentPage < 6 && setCurrentPage(currentPage + 1)}
            disabled={currentPage >= 6}
            style={[styles.floatingNavBtnAccent, currentPage >= 6 && styles.floatingNavBtnDisabled]}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingNavIconAccent}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Audio Player Sheet */}
      <AudioPlayerModal
        visible={audioModalVisible}
        trackTitle={activeAudioTrack.title}
        unitLabel={activeAudioTrack.unit}
        durationSeconds={150}
        onClose={() => setAudioModalVisible(false)}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={videoModalVisible}
        videoTitle={activeVideoLesson.title}
        unitLabel={activeVideoLesson.unit}
        durationSeconds={310}
        onClose={() => setVideoModalVisible(false)}
      />

      {/* Answer Key Modal */}
      <AnswerKeySheet
        visible={answerSheetVisible}
        exerciseLabel={activeAnswerData.exerciseLabel}
        studentPageNumber={activeAnswerData.studentPage}
        teacherPageNumber={activeAnswerData.teacherPage}
        answerContent={activeAnswerData.answerContent}
        notes={activeAnswerData.notes}
        imageUrl={activeAnswerData.imageUrl}
        onClose={() => setAnswerSheetVisible(false)}
      />

      {/* TOC & Search Drawer */}
      <TocSearchDrawer
        visible={tocDrawerVisible}
        currentPage={currentPage}
        onClose={() => setTocDrawerVisible(false)}
        onSelectPage={setCurrentPage}
      />

      {/* Bookmarks & Notes Drawer */}
      <BookmarksNotesDrawer
        visible={bookmarksDrawerVisible}
        currentPage={currentPage}
        onClose={() => setBookmarksDrawerVisible(false)}
        onSelectPage={setCurrentPage}
      />

      {/* Media Library Drawer */}
      <MediaLibraryDrawer
        visible={mediaDrawerVisible}
        onClose={() => setMediaDrawerVisible(false)}
        onPlayMedia={(item) => {
          if (item.type === 'AUDIO') {
            setActiveAudioTrack({ title: item.title, unit: item.unit });
            setAudioModalVisible(true);
          } else {
            setActiveVideoLesson({ title: item.title, unit: item.unit });
            setVideoModalVisible(true);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    width: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 48 : Platform.OS === 'android' ? 42 : 36,
    paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    zIndex: 30,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 4,
  },
  backLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  bookTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  stylePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stylePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  readerCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    padding: 0,
    margin: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  pageContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 76,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  pageHeaderTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  pageHeaderNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageBody: {
    flex: 1,
    paddingVertical: 14,
  },
  pageLessonTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  paragraphText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  taskCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  taskTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  taskDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  floatingBottomDock: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 50,
  },
  floatingNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingNavBtnAccent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingNavBtnDisabled: {
    opacity: 0.2,
  },
  floatingNavIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -2,
  },
  floatingNavIconAccent: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -2,
  },
  floatingPagePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  floatingPageText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  floatingToolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  floatingToolBtnActive: {
    backgroundColor: '#2563EB',
  },
  floatingToolIcon: {
    fontSize: 14,
  },
  floatingToolLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 1,
  },
});
