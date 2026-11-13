import React, { useState, useEffect, useRef } from 'react';
import { BrandLogo } from './BrandLogo';
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  PlusCircle,
  Library,
  Music,
  Video,
  Layers,
  MapPin,
  Users,
  Crown,
  BarChart2,
  FileText,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plus,
  Play,
  Pause,
  Volume2,
  Maximize2,
  CheckCircle,
  Clock,
  Trash2,
  RotateCcw,
  UploadCloud,
  Check,
  Save,
  Eye,
  MoreVertical,
  Sliders,
  Sparkles,
  Smartphone,
  LogOut,
  Download,
  AlertCircle,
  FileSpreadsheet,
  X,
  FileCode,
  FileAudio,
  FileVideo,
  Edit3,
  HelpCircle,
  ShieldCheck,
  SmartphoneNfc,
  Camera,
  Image as ImageIcon,
  GraduationCap,
  Tag,
  CreditCard,
} from 'lucide-react';
import { VisualPdfEditor } from './VisualPdfEditor';
import { api } from '../services/apiClient';

export type AdminPortalNav =
  | 'dashboard'
  | 'add_book'
  | 'my_books'
  | 'audio_video'
  | 'manage_content'
  | 'grades'
  | 'subjects'
  | 'page_editor'
  | 'users'
  | 'admins'
  | 'subscriptions'
  | 'pricing'
  | 'analytics'
  | 'system_logs'
  | 'settings'
  | 'mobile_sim';

interface ModernAdminPortalProps {
  onLogout: () => void;
}

export function ModernAdminPortal({ onLogout }: ModernAdminPortalProps) {
  const [adminSession] = useState<{ email: string; name: string }>(() => {
    try {
      const saved = localStorage.getItem('stb_admin_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          email: parsed.email || 'mlrahmonjon@gmail.com',
          name: parsed.name || 'Super Admin',
        };
      }
    } catch {}
    return { email: 'mlrahmonjon@gmail.com', name: 'Super Admin' };
  });

  const [activeNav, setActiveNav] = useState<AdminPortalNav>('dashboard');
  const [contentManagerOpen, setContentManagerOpen] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');

  // ==========================================
  // STATE: Real Books Catalog from Backend
  // ==========================================
  const [books, setBooks] = useState<any[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [selectedBookFilter, setSelectedBookFilter] = useState<'All' | "Student's Book" | "Teacher's Book" | 'Workbook'>('All');
  const [selectedBookIdForEditor, setSelectedBookIdForEditor] = useState<string>('');

  // ==========================================
  // STATE: Add Book Form
  // ==========================================
  const [newBookGrade, setNewBookGrade] = useState('7');
  const [newBookSubject, setNewBookSubject] = useState('Ingliz tili');
  const [newBookType, setNewBookType] = useState<"Student's Book" | "Teacher's Book" | 'Workbook'>("Student's Book");
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [newBookPages, setNewBookPages] = useState('120');
  const [newBookStartPdfPage, setNewBookStartPdfPage] = useState('1');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [attachedAudioFile, setAttachedAudioFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetBookIdForCover, setTargetBookIdForCover] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // ==========================================
  // STATE: Real Media Library (Audio & Video)
  // ==========================================
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<'ALL' | 'AUDIO' | 'VIDEO'>('ALL');
  const [selectedMediaBookFilter, setSelectedMediaBookFilter] = useState<string>('ALL');
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');

  // Media Upload State
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaFileTitle, setMediaFileTitle] = useState('');
  const [mediaFileType, setMediaFileType] = useState<'AUDIO' | 'VIDEO'>('AUDIO');
  const [mediaFileUnit, setMediaFileUnit] = useState('Unit 1');
  const [mediaFileDuration, setMediaFileDuration] = useState('120');
  const [mediaTargetBookId, setMediaTargetBookId] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Real Audio Player State
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // ==========================================
  // STATE: Real Answer Mappings (Teacher ↔ Student)
  // ==========================================
  const [answerMappings, setAnswerMappings] = useState<any[]>([]);
  const [isAddAnswerModalOpen, setIsAddAnswerModalOpen] = useState(false);
  const [answerFormat, setAnswerFormat] = useState<'TEXT' | 'IMAGE' | 'BOTH'>('IMAGE');
  const [answerScreenshotFile, setAnswerScreenshotFile] = useState<File | null>(null);
  const [answerScreenshotPreview, setAnswerScreenshotPreview] = useState<string | null>(null);
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);
  const [answerGrade, setAnswerGrade] = useState<number>(7);
  const [answerSubject, setAnswerSubject] = useState('Ingliz tili');
  const [answerStudentPage, setAnswerStudentPage] = useState<number>(1);
  const [answerTeacherPage, setAnswerTeacherPage] = useState<number>(1);
  const [answerExercise, setAnswerExercise] = useState('');
  const [answerSolutionKey, setAnswerSolutionKey] = useState('');
  const [answerNotes, setAnswerNotes] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [answerSearchQuery, setAnswerSearchQuery] = useState('');
  const [csvImportContent, setCsvImportContent] = useState('');
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  // ==========================================
  // STATE: Real Requests, Users & Subscriptions
  // ==========================================
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [reqStatusFilter, setReqStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID_APPROVED' | 'REJECTED'>('ALL');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isManualSubscriptionModalOpen, setIsManualSubscriptionModalOpen] = useState(false);
  const [manualTeacherName, setManualTeacherName] = useState('');
  const [manualTeacherPhone, setManualTeacherPhone] = useState('+998 ');
  const [manualGrade, setManualGrade] = useState<number>(7);
  const [manualSubject, setManualSubject] = useState('Ingliz tili');
  const [manualDurationDays, setManualDurationDays] = useState(30);

  // ==========================================
  // STATE: Dynamic Grades Management (Sinflar)
  // ==========================================
  const [gradesList, setGradesList] = useState<any[]>([]);
  const [isAddGradeModalOpen, setIsAddGradeModalOpen] = useState(false);
  const [newGradeNumber, setNewGradeNumber] = useState<string>('1');
  const [newGradeTitle, setNewGradeTitle] = useState<string>('');
  const [newGradeDesc, setNewGradeDesc] = useState<string>('');
  const [newGradeMonthly, setNewGradeMonthly] = useState<number>(99000);
  const [newGradeQuarterly, setNewGradeQuarterly] = useState<number>(249000);
  const [newGradeYearly, setNewGradeYearly] = useState<number>(790000);
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // ==========================================
  // STATE: Dynamic Subjects Management
  // ==========================================
  const [subjectsList, setSubjectsList] = useState<any[]>([
    { id: 'sub_eng', name: 'Ingliz tili', code: 'ENG', icon: '🇬🇧', color: '#2563EB' },
    { id: 'sub_uzb', name: 'Ona tili', code: 'UZB', icon: '📖', color: '#EA580C' },
    { id: 'sub_math', name: 'Matematika', code: 'MATH', icon: '📐', color: '#059669' },
    { id: 'sub_phys', name: 'Fizika', code: 'PHYS', icon: '⚛️', color: '#7C3AED' },
    { id: 'sub_chem', name: 'Kimyo', code: 'CHEM', icon: '🧪', color: '#DB2777' },
    { id: 'sub_bio', name: 'Biologiya', code: 'BIO', icon: '🧬', color: '#0D9488' },
  ]);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjIcon, setNewSubjIcon] = useState('📚');
  const [newSubjColor, setNewSubjColor] = useState('#2563EB');

  // ==========================================
  // STATE: Pricing & Tariffs Management
  // ==========================================
  const [pricingPlans, setPricingPlans] = useState<any[]>([
    { id: 'MONTHLY', name: '1 Oylik Obuna', durationDays: 30, priceUzs: 119000, badge: '' },
    { id: 'THREE_MONTHS', name: '3 Oylik Obuna', durationDays: 90, priceUzs: 299000, badge: 'TEJAMKOR' },
    { id: 'YEARLY', name: '1 Yillik Obuna', durationDays: 365, priceUzs: 890000, badge: 'ENG FOYDALI' },
  ]);
  const [pricingMatrixMap, setPricingMatrixMap] = useState<
    Record<
      string,
      {
        gradeId: number;
        subjectId: string;
        priceMonthlyUzs: number;
        priceQuarterlyUzs: number;
        priceYearlyUzs: number;
        isActive?: boolean;
      }
    >
  >({});
  const [pricingViewMode, setPricingViewMode] = useState<'BY_SUBJECT' | 'BY_GRADE'>('BY_SUBJECT');
  const [pricingSelectedSubjectId, setPricingSelectedSubjectId] = useState<string>('sub_eng');
  const [pricingSelectedGradeId, setPricingSelectedGradeId] = useState<number>(1);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // ==========================================
  // STATE: Super Admin & Admin Team Management
  // ==========================================
  const [adminsList, setAdminsList] = useState<any[]>([
    {
      id: 'admin_super_mlrahmonjon',
      email: 'mlrahmonjon@gmail.com',
      fullName: 'Rahmonjon (Super Admin)',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: '2026-01-01',
    },
  ]);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  // Database Reset Modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ==========================================
  // DATA LOADERS
  // ==========================================
  const loadCatalogBooks = async (loadedSubjects?: any[]) => {
    setIsLoadingBooks(true);
    try {
      const [data, subs] = await Promise.all([
        api.getAllBooks(),
        loadedSubjects ? Promise.resolve(loadedSubjects) : api.getSubjects().catch(() => subjectsList),
      ]);
      const effectiveSubjects = Array.isArray(subs) && subs.length > 0 ? subs : subjectsList;
      if (Array.isArray(data)) {
        const mapped = data.map((b: any) => {
          const matchedSub = effectiveSubjects.find(
            (s: any) =>
              s.id === b.subjectId ||
              (b.subjectId && s.code && b.subjectId.toLowerCase().includes(s.code.toLowerCase())),
          );
          const resolvedSubjectName =
            matchedSub?.name ||
            (b.subjectId?.includes('math')
              ? 'Matematika'
              : b.subjectId?.includes('phys')
              ? 'Fizika'
              : b.subjectId?.includes('chem')
              ? 'Kimyo'
              : b.subjectId?.includes('bio')
              ? 'Biologiya'
              : b.subjectId?.includes('uzb')
              ? 'Ona tili'
              : 'Ingliz tili');
          return {
            id: b.id,
            title: b.title,
            grade: b.gradeId || b.grade?.gradeNumber || 7,
            subject: resolvedSubjectName,
            version: `v${b.version || 1}.0`,
            type:
              b.type === 'STUDENT_BOOK'
                ? "Student's Book"
                : b.type === 'TEACHER_BOOK'
                ? "Teacher's Book"
                : 'Workbook',
            status:
              b.status === 'PUBLISHED'
                ? 'Published'
                : b.status === 'INGESTING'
                ? 'Processing'
                : 'Draft',
            pages: b.totalPages || 0,
            contentStartPdfPage: b.contentStartPdfPage || 1,
            size: b.totalSizeBytes ? `${(b.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'PDF',
            date: new Date(b.createdAt || Date.now()).toLocaleDateString('ru-RU'),
            coverColor: (b.gradeId || 7) >= 10 ? 'from-indigo-600 to-blue-800' : 'from-blue-600 to-indigo-700',
            iconEmoji: b.type === 'TEACHER_BOOK' ? '💡' : b.type === 'WORKBOOK' ? '📝' : '📘',
            coverImageUrl: b.coverImageUrl || null,
          };
        });
        setBooks(mapped);
      }
    } catch (err) {
      console.warn('Backend books load error:', err);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const loadMedia = async () => {
    try {
      const data = await api.getMedia();
      if (Array.isArray(data)) setMediaList(data);
    } catch (err) {
      console.warn('Load media error:', err);
    }
  };

  const loadAnswerMappings = async () => {
    try {
      const data = await api.getAnswerMappings();
      if (Array.isArray(data)) setAnswerMappings(data);
    } catch (err) {
      console.warn('Load answer mappings error:', err);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await api.getRequests();
      if (Array.isArray(data)) setRequestsList(data);
    } catch (err) {
      console.warn('Load requests error:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      if (Array.isArray(data)) setUsersList(data);
    } catch (err) {
      console.warn('Load users error:', err);
    }
  };

  const loadGrades = async () => {
    try {
      const data = await api.getGrades(false);
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => a.gradeNumber - b.gradeNumber);
        setGradesList(sorted);
        const active = sorted.filter((g) => g.isActive !== false);
        const firstNum = active[0]?.gradeNumber ?? sorted[0]?.gradeNumber;
        if (firstNum) {
          setNewBookGrade((prev) =>
            active.some((g) => String(g.gradeNumber) === prev) ? prev : String(firstNum),
          );
          setAnswerGrade((prev) => (active.some((g) => g.gradeNumber === prev) ? prev : firstNum));
          setManualGrade((prev) => (active.some((g) => g.gradeNumber === prev) ? prev : firstNum));
          setPricingSelectedGradeId((prev) =>
            sorted.some((g) => g.gradeNumber === prev) ? prev : firstNum,
          );
        }
      }
    } catch (err) {
      console.warn('Load grades error:', err);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await api.getSubjects();
      if (Array.isArray(data) && data.length > 0) {
        setSubjectsList(data);
        setPricingSelectedSubjectId((prev) =>
          data.some((s: any) => s.id === prev) ? prev : data[0].id,
        );
      }
    } catch {}
  };

  const loadPricingPlans = async () => {
    try {
      const data = await api.getPricingPlans();
      if (Array.isArray(data) && data.length > 0) setPricingPlans(data);
    } catch {}
  };

  const loadPricingMatrix = async () => {
    try {
      const res = await api.getPricingMatrix();
      if (res && Array.isArray(res.matrix)) {
        const map: Record<string, any> = {};
        for (const item of res.matrix) {
          map[`${item.gradeId}::${item.subjectId}`] = {
            gradeId: Number(item.gradeId),
            subjectId: String(item.subjectId),
            priceMonthlyUzs: Number(item.priceMonthlyUzs || 0),
            priceQuarterlyUzs: Number(item.priceQuarterlyUzs || 0),
            priceYearlyUzs: Number(item.priceYearlyUzs || 0),
            isActive: item.isActive !== false,
          };
        }
        setPricingMatrixMap(map);
      }
    } catch (err) {
      console.warn('Load pricing matrix error:', err);
    }
  };

  const loadAdmins = async () => {
    try {
      const data = await api.getAdmins();
      if (Array.isArray(data) && data.length > 0) setAdminsList(data);
    } catch {}
  };

  const loadAllPortalData = async () => {
    await Promise.all([
      loadCatalogBooks(),
      loadMedia(),
      loadAnswerMappings(),
      loadRequests(),
      loadUsers(),
      loadGrades(),
      loadSubjects(),
      loadPricingPlans(),
      loadPricingMatrix(),
      loadAdmins(),
    ]);
  };

  useEffect(() => {
    loadAllPortalData();
  }, []);

  // Update default book title when Grade, Subject, or Type changes
  useEffect(() => {
    if (!newBookTitle || newBookTitle.includes('-sinf')) {
      setNewBookTitle(`${newBookSubject} ${newBookGrade}-sinf (${newBookType})`);
    }
  }, [newBookGrade, newBookSubject, newBookType]);

  // Audio metadata detector when user selects audio file
  const handleSelectMediaFile = (file: File) => {
    setSelectedMediaFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setMediaFileTitle(cleanName);

    const isVideo = file.type.startsWith('video') || Boolean(file.name.match(/\.(mp4|mov|webm|avi)$/i));
    setMediaFileType(isVideo ? 'VIDEO' : 'AUDIO');

    // Auto-detect duration
    if (!isVideo) {
      try {
        const tempAudio = new Audio(URL.createObjectURL(file));
        tempAudio.onloadedmetadata = () => {
          if (tempAudio.duration && !isNaN(tempAudio.duration)) {
            setMediaFileDuration(Math.round(tempAudio.duration).toString());
          }
        };
      } catch {}
    }
  };

  // ==========================================
  // HANDLERS: Direct Book Save (PDF or Draft)
  // ==========================================
  const handleDirectSaveBook = async () => {
    const numGrade = parseInt(newBookGrade) || 7;
    const titleToSave = newBookTitle.trim() || `${newBookSubject} ${numGrade}-sinf (${newBookType})`;

    setIsUploadingPdf(true);
    try {
      let createdBookId = '';
      const matchingSubject = subjectsList.find(
        (s) => s.name?.toLowerCase() === newBookSubject.toLowerCase()
      );
      const resolvedSubjectId = matchingSubject
        ? matchingSubject.id
        : `sub_${newBookSubject.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10)}_${numGrade}`;

      const startPdfPage = Math.max(1, parseInt(newBookStartPdfPage, 10) || 1);

      if (selectedPdfFile) {
        const res = await api.uploadBookPdf(selectedPdfFile, {
          title: titleToSave,
          gradeId: numGrade,
          subjectId: resolvedSubjectId,
          bookType:
            newBookType === "Teacher's Book"
              ? 'TEACHER_BOOK'
              : newBookType === 'Workbook'
              ? 'WORKBOOK'
              : 'STUDENT_BOOK',
          contentStartPdfPage: startPdfPage,
        });
        createdBookId = res.book?.id;
        showToast(`🎉 Darslik muvaffaqiyatli saqlandi! (${res.book?.totalPages || 'Ko‘p'} ta sahifa)`);
      } else {
        const res = await api.createBook({
          title: titleToSave,
          gradeId: numGrade,
          subjectId: resolvedSubjectId,
          type:
            newBookType === "Teacher's Book"
              ? 'TEACHER_BOOK'
              : newBookType === 'Workbook'
              ? 'WORKBOOK'
              : 'STUDENT_BOOK',
          totalPages: parseInt(newBookPages) || 120,
          contentStartPdfPage: startPdfPage,
          description: newBookDesc,
        });
        createdBookId = res?.id;
        showToast(`🎉 Yangi darslik yaratildi va katalogga qo‘shildi!`);
      }

      // If user also attached a cover image, upload it
      if (selectedCoverFile && createdBookId) {
        try {
          await api.uploadBookCover(createdBookId, selectedCoverFile);
        } catch (err: any) {
          console.warn('Cover upload warning:', err);
        }
      }

      // If user also attached an audio file right here, upload it automatically
      if (attachedAudioFile && createdBookId) {
        try {
          await api.uploadMediaFile(attachedAudioFile, {
            title: `${titleToSave} - Listening Track 01`,
            type: 'AUDIO',
            bookId: createdBookId,
            unitLabel: 'Unit 1',
          });
          await loadMedia();
        } catch {}
      }

      await loadCatalogBooks();
      setSelectedPdfFile(null);
      setSelectedCoverFile(null);
      setCoverImagePreview(null);
      setAttachedAudioFile(null);
      setNewBookStartPdfPage('1');
      setActiveNav('my_books');
    } catch (err: any) {
      alert('Kitobni saqlashda xatolik yuz berdi: ' + err.message);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleUploadBookCoverDirect = async (bookId: string, file: File) => {
    try {
      await api.uploadBookCover(bookId, file);
      await loadCatalogBooks();
      showToast('📸 Muqova rasmi muvaffaqiyatli yangilandi!');
    } catch (err: any) {
      alert('Muqovani yuklashda xatolik: ' + err.message);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!window.confirm("Haqiqatan ham ushbu darslikni va barcha sahifalarini o'chirib tashlamoqchimisiz?")) {
      return;
    }
    try {
      await api.deleteBook(bookId);
      await loadCatalogBooks();
      showToast("Darslik bazadan to'liq o'chirildi!");
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  const handleTogglePublishBook = async (book: any) => {
    const newStatus = book.status === 'Published' ? 'DRAFT' : 'PUBLISHED';
    try {
      await api.updateBook(book.id, { status: newStatus });
      await loadCatalogBooks();
      showToast(newStatus === 'PUBLISHED' ? '✅ Kitob nashr qilindi (faol)' : 'Kitob qoralama holatiga o‘tkazildi');
    } catch (err: any) {
      alert('Holatni o‘zgartirishda xatolik: ' + err.message);
    }
  };

  // ==========================================
  // HANDLERS: Real Media File Upload (Audio/Video)
  // ==========================================
  const handleUploadRealMediaFile = async () => {
    if (!selectedMediaFile) {
      alert('Iltimos, avval audio yoki video faylni tanlang!');
      return;
    }
    if (!mediaFileTitle.trim()) {
      alert('Iltimos, media fayl nomini kiriting!');
      return;
    }

    setIsUploadingMedia(true);
    try {
      await api.uploadMediaFile(selectedMediaFile, {
        title: mediaFileTitle.trim(),
        type: mediaFileType,
        bookId: mediaTargetBookId || undefined,
        unitLabel: mediaFileUnit.trim() || 'Unit 1',
        durationSeconds: parseInt(mediaFileDuration) || 120,
      });
      await loadMedia();
      setSelectedMediaFile(null);
      setMediaFileTitle('');
      showToast('🎉 Yangi audio/video fayl muvaffaqiyatli yuklandi va saqlandi!');
    } catch (err: any) {
      alert('Media yuklashda xatolik: ' + err.message);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm("Haqiqatan ham ushbu media faylni o'chirmoqchimisiz?")) return;
    try {
      await api.deleteMedia(id);
      if (playingAudioId === id) {
        audioPlayerRef.current?.pause();
        setPlayingAudioId(null);
      }
      await loadMedia();
      showToast("Media fayl o'chirildi!");
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  const handleTogglePlayAudio = (url: string, id: string) => {
    if (!audioPlayerRef.current) return;

    if (playingAudioId === id) {
      audioPlayerRef.current.pause();
      setPlayingAudioId(null);
    } else {
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play().catch((err) => {
        console.warn('Audio play error:', err);
      });
      setPlayingAudioId(id);
      setPlayingAudioUrl(url);
    }
  };

  // ==========================================
  // HANDLERS: Answer Mappings
  // ==========================================
  const handleSaveNewAnswerMapping = async () => {
    if (!answerExercise.trim()) {
      alert('Iltimos, mashq nomini kiriting!');
      return;
    }
    if (answerFormat === 'TEXT' && !answerSolutionKey.trim()) {
      alert('Iltimos, matnli yechimni kiriting!');
      return;
    }
    if (answerFormat === 'IMAGE' && !answerScreenshotFile) {
      alert('Iltimos, javoblar skrinshot fotosuratini yuklang!');
      return;
    }

    setIsSavingAnswer(true);
    try {
      const solutionText =
        answerSolutionKey.trim() ||
        (answerScreenshotFile ? 'Ko‘rish uchun skrinshot fotosurati biriktirilgan' : 'Yechim');

      const matchedSub = subjectsList.find(
        (s: any) =>
          s.name?.toLowerCase() === answerSubject.toLowerCase() ||
          s.code?.toLowerCase() === answerSubject.toLowerCase(),
      );
      await api.uploadAnswerKeyWithImage(answerScreenshotFile || undefined, {
        gradeId: Number(answerGrade),
        subjectId:
          matchedSub?.id ||
          (answerSubject.toLowerCase().includes('mat')
            ? `sub_math_${answerGrade}`
            : `sub_eng_${answerGrade}`),
        studentExerciseLabel: answerExercise.trim(),
        studentPageNumber: Number(answerStudentPage) || 1,
        teacherPageNumber: Number(answerTeacherPage) || 1,
        teacherExerciseLabel: `${answerExercise.trim()} (Javoblar Kaliti)`,
        solutionKey: solutionText,
        notes: answerNotes.trim() || solutionText,
        format: answerFormat,
      });

      await loadAnswerMappings();
      setIsAddAnswerModalOpen(false);
      setAnswerExercise('');
      setAnswerSolutionKey('');
      setAnswerNotes('');
      setAnswerScreenshotFile(null);
      setAnswerScreenshotPreview(null);
      showToast("🎉 Javoblar kaliti muvaffaqiyatli bog'landi!");
    } catch (err: any) {
      alert('Javob saqlashda xatolik: ' + err.message);
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleDeleteAnswerMapping = async (id: string) => {
    if (!window.confirm("Haqiqatan ham ushbu javoblar kalitini o'chirmoqchimisiz?")) return;
    try {
      await api.deleteAnswerMapping(id);
      await loadAnswerMappings();
      showToast("Javoblar kaliti o'chirildi!");
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  const handleImportCsv = async () => {
    if (!csvImportContent.trim()) {
      alert('Iltimos, CSV matnini kiriting!');
      return;
    }
    try {
      await api.importAnswerMappingsCsv(Number(answerGrade), 'sub_eng_7', csvImportContent);
      await loadAnswerMappings();
      setIsCsvImportModalOpen(false);
      setCsvImportContent('');
      showToast('🎉 CSV fayldagi barcha javoblar muvaffaqiyatli yuklandi!');
    } catch (err: any) {
      alert('CSV import xatolik: ' + err.message);
    }
  };

  // ==========================================
  // HANDLERS: Subscriptions & Requests
  // ==========================================
  const handleApproveRequest = async (requestId: string) => {
    try {
      const targetReq = requestsList.find((r: any) => r.id === requestId);
      const durationDays =
        targetReq?.plan === 'YEARLY' ? 365 : targetReq?.plan === 'THREE_MONTHS' ? 90 : 30;
      await api.grantAccess(requestId, durationDays, "Admin tomonidan to'lov tasdiqlandi");
      setRequestsList((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'PAID_APPROVED' } : r)),
      );
      await Promise.all([loadRequests(), loadUsers()]);
      showToast(`✅ So‘rov qabul qilindi va ${durationDays} kunlik obuna faollashtirildi!`);
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt('Rad etish sababini kiriting:', "To'lov cheki yaroqsiz");
    if (!reason) return;
    try {
      await api.rejectAccess(requestId, reason);
      setRequestsList((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'REJECTED' } : r)),
      );
      await loadRequests();
      showToast("So'rov rad etildi.");
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleCreateManualSubscription = async () => {
    if (!manualTeacherName.trim()) {
      alert("Iltimos, o'qituvchi ismi yoki emailini kiriting!");
      return;
    }
    try {
      const matchedSub = subjectsList.find(
        (s: any) =>
          s.name?.toLowerCase() === manualSubject.toLowerCase() ||
          s.code?.toLowerCase() === manualSubject.toLowerCase(),
      );
      await api.grantManualSubscription({
        teacherNameOrEmail: manualTeacherName.trim(),
        phoneNumber: manualTeacherPhone.trim() || undefined,
        gradeId: Number(manualGrade),
        subjectId: matchedSub?.id || 'sub_eng',
        durationDays: Number(manualDurationDays),
      });
      await Promise.all([loadRequests(), loadUsers()]);
      showToast(`✅ ${manualTeacherName} uchun ${manualDurationDays} kunlik litsenziya faollashtirildi!`);
      setIsManualSubscriptionModalOpen(false);
      setManualTeacherName('');
      setManualTeacherPhone('+998 ');
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleDisconnectDevice = async (userId: string, deviceId: string) => {
    if (!window.confirm("Haqiqatan ham ushbu qurilmani uzib, slotni bo'shatmoqchimisiz?")) return;
    try {
      await api.disconnectDevice(userId, deviceId);
      await loadUsers();
      showToast('Qurilma uzildi, slot bo‘shatildi!');
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Handlers: Subjects Management
  const handleSaveSubject = async () => {
    if (!newSubjName.trim() || !newSubjCode.trim()) {
      alert('Iltimos, fan nomi va kodini kiriting!');
      return;
    }
    try {
      await api.createSubject({
        name: newSubjName.trim(),
        code: newSubjCode.trim().toUpperCase(),
        icon: newSubjIcon,
        color: newSubjColor,
      });
      await loadSubjects();
      setIsAddSubjectModalOpen(false);
      setNewSubjName('');
      setNewSubjCode('');
      showToast('🎉 Yangi fan muvaffaqiyatli qo‘shildi!');
    } catch (err: any) {
      alert('Fanni qo‘shishda xatolik: ' + err.message);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm("Haqiqatan ham ushbu fanni o'chirmoqchimisiz?")) return;
    try {
      await api.deleteSubject(id);
      await loadSubjects();
      showToast('Fan o‘chirildi!');
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  // Handlers: Grades Management (Sinflar)
  const handleCreateGrade = async () => {
    const gradeNum = Number(newGradeNumber);
    if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 12) {
      alert('Iltimos, 1 dan 12 gacha sinf raqamini kiriting!');
      return;
    }
    setIsSavingGrade(true);
    try {
      await api.createGrade({
        gradeNumber: gradeNum,
        title: newGradeTitle.trim() || `${gradeNum}-sinf`,
        description: newGradeDesc.trim() || undefined,
        priceMonthlyUzs: Number(newGradeMonthly) || 99000,
        priceQuarterlyUzs: Number(newGradeQuarterly) || 249000,
        priceYearlyUzs: Number(newGradeYearly) || 790000,
        isActive: true,
      });
      await Promise.all([loadGrades(), loadPricingMatrix()]);
      setIsAddGradeModalOpen(false);
      setNewGradeTitle('');
      setNewGradeDesc('');
      showToast(`✅ ${gradeNum}-sinf muvaffaqiyatli qo‘shildi!`);
    } catch (err: any) {
      alert('Sinf qo‘shishda xatolik: ' + err.message);
    } finally {
      setIsSavingGrade(false);
    }
  };

  const handleToggleGradeActive = async (grade: any) => {
    try {
      const nextActive = grade.isActive === false;
      await api.updateGradePricing(grade.gradeNumber, { isActive: nextActive });
      await Promise.all([loadGrades(), loadPricingMatrix()]);
      showToast(`${grade.gradeNumber}-sinf ${nextActive ? 'faollashtirildi' : 'nofaol qilindi'}`);
    } catch (err: any) {
      alert('Sinf holatini yangilashda xatolik: ' + err.message);
    }
  };

  const handleDeleteGrade = async (gradeNumber: number) => {
    if (!window.confirm(`${gradeNumber}-sinfni o‘chirmoqchimisiz? Mobil ilovada ushbu sinf ko‘rinmaydi.`)) {
      return;
    }
    try {
      await api.deleteGrade(gradeNumber);
      await Promise.all([loadGrades(), loadPricingMatrix()]);
      showToast(`${gradeNumber}-sinf o‘chirildi!`);
    } catch (err: any) {
      alert('Sinfni o‘chirishda xatolik: ' + err.message);
    }
  };

  // Handlers: Pricing Management (Global + Grade × Subject Matrix)
  const getMatrixEntry = (gradeId: number, subjectId: string) => {
    const key = `${gradeId}::${subjectId}`;
    if (pricingMatrixMap[key]) return pricingMatrixMap[key];
    const gradeObj = gradesList.find((g) => g.gradeNumber === gradeId);
    const pMonthly =
      gradeObj?.priceMonthlyUzs ||
      pricingPlans.find((p) => p.id === 'MONTHLY')?.priceUzs ||
      119000;
    const pQuarterly =
      gradeObj?.priceQuarterlyUzs ||
      pricingPlans.find((p) => p.id === 'THREE_MONTHS')?.priceUzs ||
      299000;
    const pYearly =
      gradeObj?.priceYearlyUzs ||
      pricingPlans.find((p) => p.id === 'YEARLY')?.priceUzs ||
      890000;
    return {
      gradeId,
      subjectId,
      priceMonthlyUzs: Number(pMonthly),
      priceQuarterlyUzs: Number(pQuarterly),
      priceYearlyUzs: Number(pYearly),
      isActive: true,
    };
  };

  const updateMatrixEntryField = (
    gradeId: number,
    subjectId: string,
    field: 'priceMonthlyUzs' | 'priceQuarterlyUzs' | 'priceYearlyUzs',
    val: number,
  ) => {
    const key = `${gradeId}::${subjectId}`;
    setPricingMatrixMap((prev) => {
      const current = prev[key] || getMatrixEntry(gradeId, subjectId);
      return {
        ...prev,
        [key]: {
          ...current,
          gradeId,
          subjectId,
          [field]: Math.max(0, Number(val) || 0),
          isActive: true,
        },
      };
    });
  };

  const handleSavePricing = async () => {
    setIsSavingPricing(true);
    try {
      const matrixEntries = Object.values(pricingMatrixMap).map((item) => ({
        gradeId: Number(item.gradeId),
        subjectId: String(item.subjectId),
        priceMonthlyUzs: Number(item.priceMonthlyUzs || 0),
        priceQuarterlyUzs: Number(item.priceQuarterlyUzs || 0),
        priceYearlyUzs: Number(item.priceYearlyUzs || 0),
        isActive: item.isActive !== false,
      }));
      await Promise.all([
        api.updatePricingPlans(pricingPlans),
        matrixEntries.length > 0 ? api.upsertPricingMatrix(matrixEntries) : Promise.resolve(),
      ]);
      await Promise.all([loadPricingPlans(), loadPricingMatrix()]);
      showToast('✅ Global tariflar va barcha sinf×fan narxlari saqlandi!');
    } catch (err: any) {
      alert('Narxlarni saqlashda xatolik: ' + err.message);
    } finally {
      setIsSavingPricing(false);
    }
  };

  // Handlers: Admin Management
  const handleSaveAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
      alert('Iltimos, admin email va parolini kiriting!');
      return;
    }
    setIsSavingAdmin(true);
    try {
      await api.createAdmin({
        fullName: newAdminFullName.trim() || 'Administrator',
        email: newAdminEmail.trim(),
        password: newAdminPassword.trim(),
        role: newAdminRole,
      });
      await loadAdmins();
      setIsAddAdminModalOpen(false);
      setNewAdminFullName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      showToast('🎉 Yangi administrator muvaffaqiyatli yaratildi!');
    } catch (err: any) {
      alert('Admin yaratishda xatolik: ' + err.message);
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (id === 'admin_super_mlrahmonjon') {
      alert('Asosiy Super Admin hisobini o‘chirib bo‘lmaydi!');
      return;
    }
    if (!window.confirm("Haqiqatan ham ushbu administratorni o'chirmoqchimisiz?")) return;
    try {
      await api.deleteAdmin(id);
      await loadAdmins();
      showToast('Administrator hisobi o‘chirildi!');
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  // ==========================================
  // HANDLERS: Reset Entire Database
  // ==========================================
  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await api.resetDatabase();
      await loadAllPortalData();
      setIsResetConfirmOpen(false);
      showToast("🎉 Barcha ma'lumotlar bazasi to'liq tozalandi!");
      setActiveNav('my_books');
    } catch (err: any) {
      alert('Tozalashda xatolik: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Filtered books
  const filteredBooks = books.filter((b) => {
    if (selectedBookFilter !== 'All' && b.type !== selectedBookFilter) return false;
    if (globalSearch.trim()) {
      const q = globalSearch.trim().toLowerCase();
      const subj = subjectsList.find(
        (s: any) => s.id === b.subjectId || s.code?.toLowerCase() === (b.subjectId || '').toLowerCase(),
      );
      const haystack = `${b.title || ''} ${b.gradeId || ''} ${b.gradeId}-sinf ${b.subjectId || ''} ${subj?.name || ''} ${b.type || ''}`.toLowerCase();
      if (!q.split(/\s+/).every((tok) => haystack.includes(tok))) return false;
    }
    return true;
  });

  // Filtered media
  const filteredMedia = mediaList.filter((m) => {
    if (activeMediaTab !== 'ALL' && m.type !== activeMediaTab) return false;
    if (selectedMediaBookFilter !== 'ALL' && m.bookId !== selectedMediaBookFilter) return false;
    if (mediaSearchQuery && !m.title.toLowerCase().includes(mediaSearchQuery.toLowerCase())) return false;
    return true;
  });

  const activeGradesList = gradesList.filter((g) => g.isActive !== false);
  const pendingRequestsCount = requestsList.filter(
    (r) => r.status === 'PENDING' || r.status === 'AWAITING_PAYMENT',
  ).length;
  const filteredRequestsList = requestsList.filter((r) => {
    if (reqStatusFilter === 'ALL') return true;
    if (reqStatusFilter === 'PAID_APPROVED') {
      return r.status === 'PAID_APPROVED' || r.status === 'APPROVED';
    }
    if (reqStatusFilter === 'PENDING') {
      return r.status === 'PENDING' || r.status === 'AWAITING_PAYMENT';
    }
    return r.status === reqStatusFilter;
  });

  return (
    <div className="flex h-screen bg-[#F5F7FF] text-slate-800 font-sans overflow-hidden">
      {/* Real HTML5 Audio Player */}
      <audio
        ref={audioPlayerRef}
        onTimeUpdate={() => {
          if (audioPlayerRef.current) {
            setAudioCurrentTime(audioPlayerRef.current.currentTime);
            setAudioDuration(audioPlayerRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          setPlayingAudioId(null);
          setAudioCurrentTime(0);
        }}
        onError={() => setPlayingAudioId(null)}
        className="hidden"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 animate-slideUp">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR                                           */}
      {/* ========================================================= */}
      <aside className="w-64 bg-white text-slate-700 flex flex-col justify-between shrink-0 border-r border-slate-200/80 shadow-[4px_0_24px_-16px_rgba(30,41,59,0.12)] select-none z-30">
        <div className="flex flex-col h-full">
          {/* Logo Brand Header — ilmçi Brand */}
          <div className="p-5 pb-5 border-b border-slate-100">
            <div className="cursor-pointer" onClick={() => setActiveNav('dashboard')}>
              <BrandLogo size={32} subtitle="BOSHQARUV PORTALI" darkSurface={false} />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
            <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Asosiy
            </p>

            {/* Nav: Dashboard */}
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Nav: Content Manager (Group Dropdown) */}
            <div className="pt-1">
              <button
                onClick={() => setContentManagerOpen(!contentManagerOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNav === 'add_book' ||
                  activeNav === 'my_books' ||
                  activeNav === 'audio_video' ||
                  activeNav === 'manage_content' ||
                  activeNav === 'grades' ||
                  activeNav === 'subjects' ||
                  activeNav === 'page_editor'
                    ? 'text-indigo-700 bg-indigo-50/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 shrink-0 text-indigo-600" />
                  <span>Darsliklar & Kontent</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    contentManagerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {contentManagerOpen && (
                <div className="pl-3 pr-1 pt-1 pb-1 space-y-0.5 ml-3 border-l border-indigo-100">
                  <button
                    onClick={() => setActiveNav('add_book')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2.5 ${
                      activeNav === 'add_book'
                        ? 'text-indigo-700 bg-indigo-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Kitob Qo‘shish</span>
                  </button>

                  <button
                    onClick={() => setActiveNav('my_books')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'my_books'
                        ? 'text-indigo-700 bg-indigo-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <Library className="w-3.5 h-3.5 shrink-0" />
                      <span>Mening Kitoblarim</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">
                      {books.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('audio_video')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'audio_video'
                        ? 'text-indigo-700 bg-indigo-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <Music className="w-3.5 h-3.5 shrink-0" />
                      <span>Audio & Video</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold">
                      {mediaList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('manage_content')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'manage_content'
                        ? 'text-indigo-700 bg-indigo-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Javoblar Kaliti</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                      {answerMappings.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('grades')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'grades'
                        ? 'text-indigo-700 bg-indigo-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>Sinflar Boshqaruvi</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-bold">
                      {activeGradesList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('subjects')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'subjects'
                        ? 'text-indigo-700 bg-indigo-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      <span>Fanlar Boshqaruvi</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">
                      {subjectsList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('page_editor')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2.5 ${
                      activeNav === 'page_editor'
                        ? 'text-indigo-700 bg-indigo-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>Visual Hotspot Editor</span>
                  </button>
                </div>
              )}
            </div>

            <p className="px-3 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Obuna va Foydalanuvchilar
            </p>

            {/* Nav: Users */}
            <button
              onClick={() => setActiveNav('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'users'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className={`w-4 h-4 shrink-0 ${activeNav === 'users' ? 'text-white' : 'text-emerald-600'}`} />
                <span>O‘qituvchilar</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeNav === 'users' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {usersList.length}
              </span>
            </button>

            {/* Nav: Admins Management */}
            <button
              onClick={() => setActiveNav('admins')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'admins'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck className={`w-4 h-4 shrink-0 ${activeNav === 'admins' ? 'text-white' : 'text-violet-600'}`} />
                <span>Adminlar</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeNav === 'admins' ? 'bg-white/20 text-white' : 'bg-violet-50 text-violet-700'
                }`}
              >
                {adminsList.length}
              </span>
            </button>

            {/* Nav: Subscriptions */}
            <button
              onClick={() => setActiveNav('subscriptions')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'subscriptions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Crown className={`w-4 h-4 shrink-0 ${activeNav === 'subscriptions' ? 'text-white' : 'text-amber-500'}`} />
                <span>Obunalar & To‘lovlar</span>
              </div>
              {pendingRequestsCount > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse">
                  {pendingRequestsCount} yangi
                </span>
              ) : (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeNav === 'subscriptions' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {requestsList.length}
                </span>
              )}
            </button>

            {/* Nav: Pricing & Tariffs */}
            <button
              onClick={() => setActiveNav('pricing')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'pricing'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CreditCard className={`w-4 h-4 shrink-0 ${activeNav === 'pricing' ? 'text-white' : 'text-indigo-600'}`} />
              <span>Tariflar & Narxlar</span>
            </button>

            <p className="px-3 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Tizim
            </p>

            {/* Nav: Analytics */}
            <button
              onClick={() => setActiveNav('analytics')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className={`w-4 h-4 shrink-0 ${activeNav === 'analytics' ? 'text-white' : 'text-indigo-500'}`} />
              <span>Statistika</span>
            </button>

            {/* Nav: System Logs */}
            <button
              onClick={() => setActiveNav('system_logs')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'system_logs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className={`w-4 h-4 shrink-0 ${activeNav === 'system_logs' ? 'text-white' : 'text-slate-500'}`} />
              <span>Audit Jurnali</span>
            </button>

            {/* Nav: Settings */}
            <button
              onClick={() => setActiveNav('settings')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className={`w-4 h-4 shrink-0 ${activeNav === 'settings' ? 'text-white' : 'text-slate-500'}`} />
              <span>Sozlamalar</span>
            </button>

            <div className="pt-2 border-t border-slate-100 mt-2">
              <button
                onClick={() => setActiveNav('mobile_sim')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNav === 'mobile_sim'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Mobil Ilova Preview</span>
              </button>
            </div>
          </div>

          {/* User Profile Footer Card */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center space-x-3 mb-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0">
                {(adminSession.name || 'SA')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-slate-900 leading-none truncate">
                  {adminSession.name}
                </p>
                <p className="text-[10px] text-indigo-600 font-medium truncate mt-1">
                  {adminSession.email}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all flex items-center justify-center space-x-2 border border-slate-200 hover:border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Tizimdan chiqish</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT AREA                                      */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F5F7FF]">
        {/* Top Header Bar (Hidden in full-bleed Hotspot Editor to match 1-to-1 workspace) */}
        {activeNav !== 'page_editor' && (
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 z-20">
          {/* Search Box */}
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Darsliklar, media, o'qituvchilarni qidirish..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-[#F5F7FF] border border-slate-200/90 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl + K
            </span>
          </div>

          {/* Right Header Icons & Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Quick Upload Button */}
            <button
              onClick={() => setActiveNav('audio_video')}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center space-x-1.5"
            >
              <Music className="w-3.5 h-3.5 text-indigo-600" />
              <span>Audio/Video</span>
            </button>

            {/* Master Database Clean Button */}
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              title="Barcha ma'lumotlarni tozalab, 0 dan kiritish"
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-all flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Bazani Tozalash</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => {
                loadAllPortalData();
                showToast('Ma‘lumotlar yangilandi!');
              }}
              title="Barcha ma'lumotlarni yangilash"
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-200 transition-all flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Yangilash</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveNav('subscriptions')}
              className="relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all"
            >
              <Bell className="w-4 h-4" />
              {pendingRequestsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black text-xs ring-2 ring-indigo-50 shadow-sm">
                {(adminSession.name || 'SA')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-extrabold text-slate-800 leading-none">
                  {adminSession.name}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{adminSession.email}</p>
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Scrollable View Container */}
        <main
          className={`flex-1 ${
            activeNav === 'page_editor' ? 'overflow-hidden p-0' : 'overflow-y-auto p-8 custom-scrollbar'
          }`}
        >
          {/* =================================================================== */}
          {/* VIEW 1: DASHBOARD                                                   */}
          {/* =================================================================== */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Mobile-Matched Royal Indigo Hero Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-[#4F46E5] via-[#3730A3] to-[#1E3A8A] p-7 text-white shadow-xl shadow-indigo-900/15 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold tracking-wide text-indigo-100 mb-3">
                    Boshqaruv Markazi • {activeGradesList.length} ta faol sinf • {subjectsList.length} ta fan
                  </span>
                  <h2 className="text-2xl font-black tracking-tight">
                    Xush kelibsiz, {adminSession.name}
                  </h2>
                  <p className="text-xs text-indigo-100/90 font-medium mt-1 max-w-xl">
                    Darsliklar, sinflar, har bir fan va sinf kesimidagi narxlar hamda o‘qituvchilar obuna so‘rovlarini yagona paneldan boshqaring.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setActiveNav('add_book')}
                    className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-extrabold shadow-md flex items-center space-x-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yangi Kitob Qo‘shish</span>
                  </button>
                  <button
                    onClick={() => setActiveNav('pricing')}
                    className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold flex items-center space-x-1.5 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Tariflar Matritsasi</span>
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div
                  onClick={() => setActiveNav('my_books')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-500">Mavjud Kitoblar</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{books.length} ta</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-2">
                      Katalogda faol
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveNav('grades')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-400 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-500">Faol Sinflar & Fanlar</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {activeGradesList.length} / {subjectsList.length}
                    </p>
                    <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-2">
                      Mobil ilovada ko‘rinadi
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveNav('manage_content')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-500">Media & Javoblar</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {mediaList.length} / {answerMappings.length}
                    </p>
                    <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-2">
                      Audio/Video va kalitlar
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Music className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveNav('subscriptions')}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-400 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-500">Obuna So‘rovlari</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{requestsList.length} ta</p>
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md mt-2 ${
                        pendingRequestsCount > 0
                          ? 'text-rose-600 bg-rose-50'
                          : 'text-emerald-600 bg-emerald-50'
                      }`}
                    >
                      {pendingRequestsCount > 0 ? `${pendingRequestsCount} ta kutilmoqda` : 'Barchasi ko‘rilgan'}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Crown className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Jump 3-Box Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  onClick={() => setActiveNav('grades')}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Sinflar va Fanlar</h4>
                    <p className="text-xs text-slate-500 mt-1">Qaysi sinflar ilovada chiqishini boshqarish</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveNav('pricing')}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Sinf × Fan Narxlari</h4>
                    <p className="text-xs text-slate-500 mt-1">Har bir sinf va fan uchun alohida tarif belgilash</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveNav('subscriptions')}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-amber-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">To‘lov So‘rovlari</h4>
                    <p className="text-xs text-slate-500 mt-1">O‘qituvchilar so‘rovini qabul qilish va ruxsat berish</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 2: ADD BOOK                                                    */}
          {/* =================================================================== */}
          {activeNav === 'add_book' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1">
                  <span className="hover:text-slate-600 cursor-pointer" onClick={() => setActiveNav('my_books')}>
                    Darsliklar Katalogi
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-blue-600 font-bold">Yangi Kitob Qo‘shish</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Yangi Darslik Qo‘shish</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Sinf, fan, darslik turini tanlang va PDF faylni yuklang. Sahifalar soni avtomatik aniqlanadi.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Input Form (7 cols) */}
                <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  {/* 1. Sinf (Grade) Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-extrabold text-slate-700">
                        1. Sinfni tanlang (Grade) <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddGradeModalOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Yangi sinf qo‘shish</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                      {activeGradesList.map((gradeItem) => {
                        const gradeNum = gradeItem.gradeNumber;
                        return (
                          <button
                            key={gradeNum}
                            type="button"
                            onClick={() => setNewBookGrade(gradeNum.toString())}
                            className={`py-2 text-xs font-bold rounded-xl transition-all ${
                              newBookGrade === gradeNum.toString()
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-300'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {gradeNum}
                          </button>
                        );
                      })}
                      {activeGradesList.length === 0 && (
                        <p className="col-span-full text-xs text-slate-400 py-1">
                          Hozircha faol sinflar yo‘q — avval sinf qo‘shing.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2. Fan (Subject) Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-extrabold text-slate-700">
                        2. Fanni tanlang <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddSubjectModalOpen(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Yangi fan qo‘shish</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {subjectsList.map((subj) => (
                        <button
                          key={subj.id || subj.code}
                          type="button"
                          onClick={() => setNewBookSubject(subj.name)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center space-x-2 ${
                            newBookSubject === subj.name
                              ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base">{subj.icon || '📚'}</span>
                          <span className="truncate">{subj.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Kitob turi (Book Type) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">
                      3. Kitob turini tanlang <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Student's Book", "Teacher's Book", 'Workbook'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewBookType(type)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border ${
                            newBookType === type
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Darslik Nomi (Title) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      4. Darslik nomi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      placeholder="masalan: Ingliz tili 7-sinf (Student's Book)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* 4.2 Kitob 1-sahifasi qaysi PDF betidan boshlanadi */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                    <label className="block text-xs font-extrabold text-slate-800 mb-1">
                      Kitobning 1-sahifasi qaysi PDF betidan boshlanadi?
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={newBookStartPdfPage}
                        onChange={(e) => setNewBookStartPdfPage(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-extrabold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Agar PDF dagi dastlabki 3–5 bet muqova/mundarija bo‘lsa va kitobning <b>1-beti</b> masalan PDF ning <b>4-betidan</b> boshlansa, bu yerga <b>4</b> kiriting.
                      </p>
                    </div>
                  </div>

                  {/* 4.5. Kitob Muqovasi Rasmi (Custom Cover Image) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Kitob Muqovasi Rasmi (Cover Image)</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                        Ixtiyoriy (.jpg, .png, .webp)
                      </span>
                    </label>
                    <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-4 text-center cursor-pointer transition-all relative">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedCoverFile(file);
                            setCoverImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {coverImagePreview ? (
                        <div className="flex items-center justify-center space-x-4">
                          <img
                            src={coverImagePreview}
                            alt="Cover preview"
                            className="w-14 h-20 rounded-xl object-cover shadow-md border-2 border-indigo-400"
                          />
                          <div className="text-left">
                            <p className="text-xs font-black text-slate-800">{selectedCoverFile?.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {((selectedCoverFile?.size || 0) / 1024).toFixed(0)} KB • Muqova yuklandi
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCoverFile(null);
                                setCoverImagePreview(null);
                              }}
                              className="mt-1 text-xs text-rose-600 font-bold hover:underline"
                            >
                              Muqovani bekor qilish
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center mb-1.5 shadow-sm">
                            <Camera className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            Muqova rasmini tanlash uchun bosing yoki bu yerga tashlang
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Darslikning haqiqiy muqova fotosurati mobil ilovada ham aynan shu rasmda chiqadi
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. PDF Fayl Yuklash */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      5. PDF Darslik Fayli (Haqiqiy PDF yuklash)
                    </label>
                    <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all relative">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSelectedPdfFile(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-2">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedPdfFile ? selectedPdfFile.name : 'PDF faylni tanlash uchun bosing yoki bu yerga tashlang'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedPdfFile
                          ? `Hajmi: ${(selectedPdfFile.size / (1024 * 1024)).toFixed(2)} MB • Sahifalar avtomatik chiqariladi`
                          : 'Ixtiyoriy: Agar PDF bo‘lmasa, darslik qoralama sifatida saqlanadi'}
                      </p>
                    </div>

                    {selectedPdfFile && (
                      <div className="mt-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-emerald-900 truncate">
                            {selectedPdfFile.name} (Yuklashga tayyor)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPdfFile(null)}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Bekor qilish
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 6. Optional Audio Attachment directly during creation */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      🎧 Ushbu kitob uchun audio fayl biriktirish (Ixtiyoriy)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Kitob yaratish bilan birga uning birinchi audio trekini (MP3) ham yuklashingiz mumkin:
                    </p>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setAttachedAudioFile(file);
                      }}
                      className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {attachedAudioFile && (
                      <p className="text-xs font-bold text-emerald-700">
                        ✓ Tanlandi: {attachedAudioFile.name} ({(attachedAudioFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveNav('my_books')}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingPdf}
                      onClick={handleDirectSaveBook}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
                    >
                      {isUploadingPdf ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin" />
                          <span>PDF yuklanmoqda va sahifalar chiqarilmoqda...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>🚀 Darslikni Saqlash va Katalogga Qo‘shish</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right: 3D Book Preview Card (5 cols) */}
                <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                      Jonli Muqova Ko‘rinishi
                    </span>
                  </div>

                  <div className="relative my-6 transform hover:scale-105 transition-transform duration-300">
                    {coverImagePreview ? (
                      <div className="relative group">
                        <img
                          src={coverImagePreview}
                          alt="Book cover preview"
                          className="w-56 h-72 rounded-2xl object-cover shadow-2xl border-l-[6px] border-indigo-500 ring-4 ring-indigo-500/20"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                          <p className="text-white text-xs font-black truncate drop-shadow">{newBookTitle}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-56 h-72 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-5 text-white shadow-2xl border-l-[6px] border-blue-400 relative flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-mono tracking-widest uppercase opacity-75">
                              {newBookGrade}-sinf
                            </span>
                            <span className="text-xl">📘</span>
                          </div>
                          <h3 className="text-2xl font-black mt-3 leading-tight tracking-tight">
                            {newBookSubject}
                          </h3>
                          <p className="text-3xl font-black text-amber-400 mt-1">
                            {newBookGrade}
                          </p>
                        </div>

                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                          <p className="text-[11px] font-extrabold truncate">{newBookType}</p>
                          <p className="text-[9px] opacity-75">
                            {selectedPdfFile ? `${(selectedPdfFile.size / (1024 * 1024)).toFixed(1)} MB PDF` : 'PDF tanlanmagan'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-800">{newBookTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Saqlangandan so‘ng ushbu kitob mobil ilovada ham avtomatik ko‘rinadi
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 3: MY BOOKS                                                    */}
          {/* =================================================================== */}
          {activeNav === 'my_books' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mening Kitoblarim</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Yuklangan darsliklar, ularning sahifalari va interaktiv sozlamalari
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setActiveNav('add_book')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Yangi Kitob Qo‘shish</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                {[
                  { id: 'All', label: `Barchasi (${books.length})` },
                  {
                    id: "Student's Book",
                    label: `Student's Book (${books.filter((b) => b.type === "Student's Book").length})`,
                  },
                  {
                    id: "Teacher's Book",
                    label: `Teacher's Book (${books.filter((b) => b.type === "Teacher's Book").length})`,
                  },
                  {
                    id: 'Workbook',
                    label: `Workbook (${books.filter((b) => b.type === 'Workbook').length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedBookFilter(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedBookFilter === tab.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Books List Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredBooks.map((book) => (
                    <div
                      key={book.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Left Book Info */}
                      <div className="flex items-center space-x-4 min-w-0">
                        {book.coverImageUrl ? (
                          <div className="relative group shrink-0">
                            <img
                              src={book.coverImageUrl}
                              alt={book.title}
                              className="w-12 h-16 rounded-xl object-cover shrink-0 shadow-md border border-slate-200"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Camera className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`w-12 h-14 rounded-xl bg-gradient-to-br ${book.coverColor} text-white flex flex-col items-center justify-center shrink-0 shadow-md`}
                          >
                            <span className="text-base">{book.iconEmoji}</span>
                            <span className="text-[9px] font-black">{book.grade}-sinf</span>
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">{book.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {book.grade}-sinf • {book.subject} • {book.type}
                          </p>
                        </div>
                      </div>

                      {/* Middle Attributes */}
                      <div className="flex items-center space-x-4 text-xs text-slate-600">
                        <button
                          onClick={() => handleTogglePublishBook(book)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                            book.status === 'Published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {book.status === 'Published' ? '✓ Nashr etilgan' : 'Qoralama'}
                        </button>

                        <span className="flex items-center space-x-1.5 font-medium text-slate-500">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>
                            {book.pages} bet
                            {(book.contentStartPdfPage || 1) > 1
                              ? ` (1-bet = PDF #${book.contentStartPdfPage})`
                              : ''}
                          </span>
                        </span>

                        <span className="flex items-center space-x-1.5 font-medium text-slate-500">
                          <Download className="w-3.5 h-3.5" />
                          <span>{book.size}</span>
                        </span>
                      </div>

                      {/* Right Action Menu */}
                      <div className="flex items-center space-x-2">
                        {/* Change / Upload Cover Button */}
                        <button
                          onClick={() => {
                            setTargetBookIdForCover(book.id);
                            coverFileInputRef.current?.click();
                          }}
                          title="Darslik muqovasini yuklash yoki almashtirish"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center space-x-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Muqova</span>
                        </button>

                        {/* Audio/Video Button for this book */}
                        <button
                          onClick={() => {
                            setSelectedMediaBookFilter(book.id);
                            setActiveNav('audio_video');
                          }}
                          title="Ushbu darslikka tegishli audio/videolarni ko'rish"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center space-x-1"
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>Media ({mediaList.filter((m) => m.bookId === book.id).length})</span>
                        </button>

                        {/* Visual Editor */}
                        <button
                          onClick={() => {
                            setSelectedBookIdForEditor(book.id);
                            setActiveNav('page_editor');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center space-x-1"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Visual Editor</span>
                        </button>

                        {/* View PDF */}
                        <a
                          href={`http://localhost:4000/api/v1/content/books/${book.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
                          title="PDF ni ko'rish"
                        >
                          <Eye className="w-4 h-4" />
                        </a>

                        {/* Delete Book */}
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                          title="Darslikni o‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Hidden cover input for quick book cover change */}
                  <input
                    type="file"
                    ref={coverFileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && targetBookIdForCover) {
                        handleUploadBookCoverDirect(targetBookIdForCover, file);
                        e.target.value = '';
                      }
                    }}
                  />

                  {filteredBooks.length === 0 && (
                    <div className="p-12 text-center text-slate-400 space-y-3">
                      <BookOpen className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                      <p className="text-sm font-bold text-slate-600">Hozircha hech qanday kitob mavjud emas</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Baza tozalangan. Yangi kitob qo‘shish uchun quyidagi tugmani bosing.
                      </p>
                      <button
                        onClick={() => setActiveNav('add_book')}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                      >
                        + Birinchi Kitobni Qo‘shish
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 4: AUDIO & VIDEO (Real MP3 & MP4 File Upload Center)           */}
          {/* =================================================================== */}
          {activeNav === 'audio_video' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Audio & Video Kutubxonasi</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Darslik sahifalari uchun tinglash (listening) audiolari va video lavhalarni kompyuterdan yuklash va tinglash
                  </p>
                </div>
              </div>

              {/* 1. Real Audio/Video File Upload Dropzone Card */}
              <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Kompyuterdan Yangi Audio yoki Video Faylni Yuklash
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        MP3, WAV, M4A audio treklari yoki MP4 video fayllarni bevosita ushbu oynaga tashlang
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Dropzone Box */}
                  <div className="lg:col-span-6">
                    <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 rounded-2xl p-7 text-center cursor-pointer transition-all relative">
                      <input
                        type="file"
                        accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSelectMediaFile(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-2">
                        {mediaFileType === 'VIDEO' ? <Video className="w-6 h-6" /> : <Music className="w-6 h-6" />}
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedMediaFile
                          ? selectedMediaFile.name
                          : 'Audio (.mp3) yoki Video (.mp4) faylni tanlash uchun bosing'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {selectedMediaFile
                          ? `Hajmi: ${(selectedMediaFile.size / (1024 * 1024)).toFixed(2)} MB • Turi: ${mediaFileType}`
                          : 'Kompyuteringizdagi istalgan audio yoki video dars faylini yuklashingiz mumkin'}
                      </p>
                    </div>
                  </div>

                  {/* Form Details */}
                  <div className="lg:col-span-6 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Media Nomi / Qo‘shiq nomi <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={mediaFileTitle}
                        onChange={(e) => setMediaFileTitle(e.target.value)}
                        placeholder="masalan: Track 01 - Unit 1: School Life"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Qaysi darslikka tegishli?</label>
                        <select
                          value={mediaTargetBookId}
                          onChange={(e) => setMediaTargetBookId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                        >
                          <option value="">Umumiy media kutubxona</option>
                          {books.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title} ({b.grade}-sinf)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Bo‘lim</label>
                        <input
                          type="text"
                          value={mediaFileUnit}
                          onChange={(e) => setMediaFileUnit(e.target.value)}
                          placeholder="Unit 1"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-slate-500">
                        Davomiyligi: <span className="font-mono font-bold text-slate-800">{mediaFileDuration} soniya</span>
                      </span>

                      <button
                        type="button"
                        disabled={isUploadingMedia || !selectedMediaFile}
                        onClick={handleUploadRealMediaFile}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center space-x-1.5 ${
                          selectedMediaFile
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isUploadingMedia ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>Serverga yuklanmoqda...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>🚀 Faylni Yuklash va Saqlash</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Media Playlist & Audio Player Area */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveMediaTab('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeMediaTab === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Barchasi ({mediaList.length})
                    </button>
                    <button
                      onClick={() => setActiveMediaTab('AUDIO')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeMediaTab === 'AUDIO' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      🎧 Audiolar ({mediaList.filter((m) => m.type === 'AUDIO').length})
                    </button>
                    <button
                      onClick={() => setActiveMediaTab('VIDEO')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeMediaTab === 'VIDEO' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      🎬 Videolar ({mediaList.filter((m) => m.type === 'VIDEO').length})
                    </button>
                  </div>

                  {/* Search Media */}
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Mavzu yoki trek nomi..."
                      value={mediaSearchQuery}
                      onChange={(e) => setMediaSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
                    />
                  </div>
                </div>

                {/* Media Cards List */}
                <div className="space-y-2.5">
                  {filteredMedia.map((item) => {
                    const isPlaying = playingAudioId === item.id;
                    const book = books.find((b) => b.id === item.bookId);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isPlaying
                            ? 'bg-blue-50/80 border-blue-300 shadow-sm ring-1 ring-blue-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          {/* Play/Pause Button for Audio */}
                          {item.type === 'AUDIO' ? (
                            <button
                              onClick={() => handleTogglePlayAudio(item.url, item.id)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                isPlaying
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <Video className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">{item.title}</h4>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium mt-0.5">
                              <span className="font-bold text-slate-600">{item.unitLabel || 'Unit 1'}</span>
                              <span>•</span>
                              <span>{item.filename || 'media.mp3'}</span>
                              {book && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600 font-bold">{book.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Player / Scrubber / Actions */}
                        <div className="flex items-center space-x-4 shrink-0">
                          {isPlaying && (
                            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-blue-600">
                              <span>
                                {Math.floor(audioCurrentTime / 60)}:
                                {String(Math.floor(audioCurrentTime % 60)).padStart(2, '0')}
                              </span>
                              <span>/</span>
                              <span>
                                {Math.floor(audioDuration / 60)}:
                                {String(Math.floor(audioDuration % 60)).padStart(2, '0')}
                              </span>
                            </div>
                          )}

                          <span className="text-xs font-mono font-bold text-slate-500">
                            {Math.floor((item.durationSeconds || 120) / 60)}:
                            {String((item.durationSeconds || 120) % 60).padStart(2, '0')}
                          </span>

                          {/* Direct Listen / Download link */}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
                            title="Faylni brauzerda ochish"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          {/* Delete Media */}
                          <button
                            onClick={() => handleDeleteMedia(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                            title="Media faylni o‘chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredMedia.length === 0 && (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                      <Music className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                      <p className="text-sm font-bold text-slate-600">Hozircha hech qanday media fayl yuklanmagan</p>
                      <p className="text-xs text-slate-400">
                        Yuqoridagi maydonga kompyuteringizdan audio yoki video faylni tanlang va yuklang.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 5: JAVOBLAR KALITI (Answer Key Mapping & Methodology)          */}
          {/* =================================================================== */}
          {activeNav === 'manage_content' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Javoblar Kaliti va Metodika (Answer Keys)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    O‘qituvchi kitobidagi mashq yechimlarini o‘quvchi darsligining sahifalariga bog‘lash
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsCsvImportModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Excel / CSV Import</span>
                  </button>
                  <button
                    onClick={() => setIsAddAnswerModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Yangi Javob Bog‘lash</span>
                  </button>
                </div>
              </div>

              {/* Mappings Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {answerMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {mapping.imageUrl ? (
                          <div
                            onClick={() => setPreviewImageModalUrl(mapping.imageUrl)}
                            className="relative group cursor-pointer shrink-0"
                            title="Skrinshotni to‘liq hajmda ko‘rish"
                          >
                            <img
                              src={mapping.imageUrl}
                              alt="Screenshot preview"
                              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-300 shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                            {mapping.gradeId}-sinf
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {mapping.studentExerciseLabel || 'Mashq'}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                              O‘quvchi: {mapping.studentPageNumber}-bet
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                              O‘qituvchi: {mapping.teacherPageNumber}-bet
                            </span>
                            {mapping.imageUrl ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center space-x-1">
                                <Camera className="w-3 h-3" />
                                <span>Skrinshotli</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                Matnli
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-1">
                            <span className="font-bold text-slate-800">Kalit / Izoh:</span> {mapping.notes || mapping.solutionKey}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {mapping.imageUrl && (
                          <button
                            onClick={() => setPreviewImageModalUrl(mapping.imageUrl)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Rasmni Ko‘rish</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAnswerMapping(mapping.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                          title="Javobni o‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {answerMappings.length === 0 && (
                    <div className="p-12 text-center text-slate-400 space-y-3">
                      <CheckCircle className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                      <p className="text-sm font-bold text-slate-600">Hozircha javoblar kaliti bog‘lanmagan</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        O‘qituvchi kitobidagi mashq yechimlarini o‘quvchi betiga bog‘lash uchun quyidagi tugmani bosing.
                      </p>
                      <button
                        onClick={() => setIsAddAnswerModalOpen(true)}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                      >
                        + Birinchi Javobni Bog‘lash
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Answer Modal */}
              {isAddAnswerModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-900">Yangi Javoblar Kalitini Bog‘lash</h3>
                      <button
                        onClick={() => setIsAddAnswerModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {/* Format Selector Pills */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Javoblar Shakli (Format)
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setAnswerFormat('IMAGE')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                              answerFormat === 'IMAGE'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            📸 Skrinshot Rasm
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnswerFormat('TEXT')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                              answerFormat === 'TEXT'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            📝 Matnli Yechim
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnswerFormat('BOTH')}
                            className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                              answerFormat === 'BOTH'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            ⚡ Ikkalasi ham
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Sinf</label>
                          <select
                            value={answerGrade}
                            onChange={(e) => setAnswerGrade(Number(e.target.value))}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          >
                            {activeGradesList.map((g) => (
                              <option key={g.gradeNumber} value={g.gradeNumber}>
                                {g.title || `${g.gradeNumber}-sinf`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Fan</label>
                          <select
                            value={answerSubject}
                            onChange={(e) => setAnswerSubject(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          >
                            {subjectsList.map((s) => (
                              <option key={s.id || s.code} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">O‘quvchi beti</label>
                          <input
                            type="number"
                            value={answerStudentPage}
                            onChange={(e) => setAnswerStudentPage(Number(e.target.value))}
                            placeholder="1"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">O‘qituvchi kitobi beti</label>
                          <input
                            type="number"
                            value={answerTeacherPage}
                            onChange={(e) => setAnswerTeacherPage(Number(e.target.value))}
                            placeholder="1"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mashq / Topshiriq Nomi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={answerExercise}
                          onChange={(e) => setAnswerExercise(e.target.value)}
                          placeholder="masalan: Unit 1, Exercise 4 - Reading"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                        />
                      </div>

                      {/* Screenshot Image Upload (If IMAGE or BOTH) */}
                      {(answerFormat === 'IMAGE' || answerFormat === 'BOTH') && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                            <span className="flex items-center space-x-1.5">
                              <Camera className="w-3.5 h-3.5 text-amber-600" />
                              <span>Javoblar Skrinshot Fotosurati</span>
                            </span>
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                              JPG, PNG, WebP
                            </span>
                          </label>
                          <div className="border-2 border-dashed border-amber-200 hover:border-amber-400 bg-amber-50/30 rounded-2xl p-4 text-center cursor-pointer transition-all relative">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/jpg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setAnswerScreenshotFile(file);
                                  setAnswerScreenshotPreview(URL.createObjectURL(file));
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {answerScreenshotPreview ? (
                              <div className="flex items-center justify-center space-x-3">
                                <img
                                  src={answerScreenshotPreview}
                                  alt="Screenshot"
                                  className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400 shadow-sm"
                                />
                                <div className="text-left">
                                  <p className="text-xs font-black text-slate-800">{answerScreenshotFile?.name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {((answerScreenshotFile?.size || 0) / 1024).toFixed(0)} KB • Skrinshot tanlandi
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAnswerScreenshotFile(null);
                                      setAnswerScreenshotPreview(null);
                                    }}
                                    className="text-xs text-rose-600 font-bold hover:underline"
                                  >
                                    Bekor qilish
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="py-2">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center mb-1">
                                  <Camera className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800">
                                  O‘qituvchi kitobi javoblar fotosuratini yuklang
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Telefon kamerasidan yoki skanerdan olingan skrinshot
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Text Solution (If TEXT or BOTH) */}
                      {(answerFormat === 'TEXT' || answerFormat === 'BOTH') && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            To‘g‘ri Javoblar Kaliti (Matn ko‘rinishida)
                          </label>
                          <textarea
                            rows={2}
                            value={answerSolutionKey}
                            onChange={(e) => setAnswerSolutionKey(e.target.value)}
                            placeholder="masalan: 1. B, 2. C, 3. A, 4. D"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Metodik Tavsiya (Ixtiyoriy)
                        </label>
                        <textarea
                          rows={2}
                          value={answerNotes}
                          onChange={(e) => setAnswerNotes(e.target.value)}
                          placeholder="O‘quvchilarga qoidani tushuntirish bo‘yicha ko‘rsatma..."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddAnswerModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAnswer}
                        onClick={handleSaveNewAnswerMapping}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1"
                      >
                        {isSavingAnswer ? <span>Saqlanmoqda...</span> : <span>💾 Saqlash</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CSV Import Modal */}
              {isCsvImportModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-900">Excel / CSV orqali Ommaviy Yuklash</h3>
                      <button
                        onClick={() => setIsCsvImportModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <p className="text-slate-500">
                        Quyidagi formatda CSV matnini joylang (studentPage,teacherPage,studentExercise,solutionKey):
                      </p>
                      <textarea
                        rows={6}
                        value={csvImportContent}
                        onChange={(e) => setCsvImportContent(e.target.value)}
                        placeholder={`studentPage,teacherPage,studentExercise,solutionKey\n10,18,Unit 1 Ex 1,1. A 2. B 3. C\n11,19,Unit 1 Ex 2,1. True 2. False`}
                        className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsCsvImportModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="button"
                        onClick={handleImportCsv}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
                      >
                        📥 CSV Yuklash
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 6: VISUAL HOTSPOT EDITOR                                       */}
          {/* =================================================================== */}
          {activeNav === 'page_editor' && (
            <div className="h-full w-full">
              <VisualPdfEditor
                initialBookId={selectedBookIdForEditor || books[0]?.id || ''}
                onSelectBookId={(id) => setSelectedBookIdForEditor(id)}
                activeGrades={activeGradesList.map((g) => g.gradeNumber)}
                onBackToBooks={() => setActiveNav('my_books')}
                onOpenMobilePreview={() => setActiveNav('mobile_sim')}
              />
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 7: SUBSCRIPTIONS & REQUESTS                                    */}
          {/* =================================================================== */}
          {activeNav === 'subscriptions' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Obuna So‘rovlari va To‘lovlar
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    O‘qituvchilarning darsliklarga obuna so‘rovlarini tasdiqlash va litsenziya ochish
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsManualSubscriptionModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Qo‘lda Litsenziya Berish</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'ALL', label: `Barchasi (${requestsList.length})` },
                    { id: 'PENDING', label: `Kutilmoqda (${pendingRequestsCount})` },
                    {
                      id: 'PAID_APPROVED',
                      label: `Qabul qilindi (${
                        requestsList.filter(
                          (r) => r.status === 'PAID_APPROVED' || r.status === 'APPROVED',
                        ).length
                      })`,
                    },
                    {
                      id: 'REJECTED',
                      label: `Rad etilgan (${
                        requestsList.filter((r) => r.status === 'REJECTED').length
                      })`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReqStatusFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                      reqStatusFilter === tab.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Requests List */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredRequestsList.map((req) => {
                    const isApproved =
                      req.status === 'PAID_APPROVED' || req.status === 'APPROVED';
                    const matchedSubj = subjectsList.find(
                      (s: any) =>
                        s.id === req.subjectId ||
                        s.code?.toLowerCase() === String(req.subjectId || '').toLowerCase(),
                    );
                    const subjectLabel = req.subjectName || matchedSubj?.name || req.subjectId || 'Darsliklar';
                    const planDuration =
                      req.plan === 'YEARLY' ? 365 : req.plan === 'THREE_MONTHS' ? 90 : 30;
                    const planLabel =
                      req.plan === 'YEARLY'
                        ? '1 yillik (365 kun)'
                        : req.plan === 'THREE_MONTHS'
                          ? '3 oylik (90 kun)'
                          : '1 oylik (30 kun)';

                    return (
                      <div
                        key={req.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-indigo-50/30 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-black text-xs flex items-center justify-center shrink-0">
                            {req.gradeId ? `${req.gradeId}-sinf` : 'Sinf'}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900">
                                {req.fullName || req.teacherName || req.userEmail || 'O‘qituvchi'}
                              </h4>
                              <span className="text-xs font-mono text-slate-500">
                                ({req.phoneNumber || '+998'})
                              </span>
                              {req.userEmail && (
                                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {req.userEmail}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {subjectLabel} • Tarif: <strong className="text-slate-700">{planLabel}</strong>
                              {Number(req.priceUzs) > 0 && (
                                <span className="ml-2 text-emerald-700 font-extrabold">
                                  • {Number(req.priceUzs).toLocaleString('uz-UZ')} so‘m
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-xs font-mono text-slate-400">
                            {new Date(req.createdAt || Date.now()).toLocaleDateString('uz-UZ')}
                          </span>

                          {isApproved ? (
                            <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold flex items-center space-x-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span>Qabul qilindi</span>
                            </span>
                          ) : req.status === 'REJECTED' ? (
                            <span className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold">
                              Rad etildi
                            </span>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleApproveRequest(req.id)}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Qabul qilish ({planDuration} kun)</span>
                              </button>
                              <button
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition-all"
                              >
                                Rad etish
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredRequestsList.length === 0 && (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                      <Crown className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                      <p className="text-sm font-bold text-slate-600">
                        Ushbu bo‘limda obuna so‘rovlari topilmadi
                      </p>
                      <p className="text-xs text-slate-400">
                        O‘qituvchilar mobil ilovada ruxsat so‘rashganda bu yerda paydo bo‘ladi
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Subscription Modal */}
              {isManualSubscriptionModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-900">Qo‘lda Litsenziya / Obuna Ochish</h3>
                      <button
                        onClick={() => setIsManualSubscriptionModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">O‘qituvchi Ismi yoki Email</label>
                        <input
                          type="text"
                          value={manualTeacherName}
                          onChange={(e) => setManualTeacherName(e.target.value)}
                          placeholder="masalan: rahmonjon@gmail.com yoki Nodira Karimova"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Fan</label>
                        <select
                          value={manualSubject}
                          onChange={(e) => setManualSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                        >
                          {subjectsList.map((s: any) => (
                            <option key={s.id} value={s.name}>
                              {s.icon || '📚'} {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Telefon Raqami</label>
                        <input
                          type="text"
                          value={manualTeacherPhone}
                          onChange={(e) => setManualTeacherPhone(e.target.value)}
                          placeholder="+998 90 123 45 67"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Sinf</label>
                          <select
                            value={manualGrade}
                            onChange={(e) => setManualGrade(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          >
                            {activeGradesList.map((g) => (
                              <option key={g.gradeNumber} value={g.gradeNumber}>
                                {g.title || `${g.gradeNumber}-sinf`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Muddat</label>
                          <select
                            value={manualDurationDays}
                            onChange={(e) => setManualDurationDays(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          >
                            <option value={30}>30 kun (Oylik)</option>
                            <option value={90}>90 kun (Choraklik)</option>
                            <option value={365}>365 kun (Yillik)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsManualSubscriptionModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateManualSubscription}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
                      >
                        ✓ Litsenziyani Faollashtirish
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 8: ANALYTICS                                                   */}
          {/* =================================================================== */}
          {activeNav === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Statistika va Hisobotlar</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Haqiqiy darsliklar, media fayllar va ro‘yxatdan o‘tgan pedagoglar tahlili
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400">Jami Kitoblar</p>
                  <p className="text-3xl font-black text-slate-900">{books.length} ta</p>
                  <p className="text-xs text-emerald-600 font-semibold">Katalogda faol</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400">Media Resurslar</p>
                  <p className="text-3xl font-black text-slate-900">{mediaList.length} ta</p>
                  <p className="text-xs text-blue-600 font-semibold">Audio & Video</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400">Javoblar Kaliti</p>
                  <p className="text-3xl font-black text-slate-900">{answerMappings.length} ta</p>
                  <p className="text-xs text-amber-600 font-semibold">Bog‘langan yechimlar</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400">O‘qituvchilar</p>
                  <p className="text-3xl font-black text-slate-900">{usersList.length} ta</p>
                  <p className="text-xs text-purple-600 font-semibold">Ro‘yxatdan o‘tgan</p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 9: USERS                                                       */}
          {/* =================================================================== */}
          {activeNav === 'users' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">O‘qituvchilar (Users)</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Tizimda ro‘yxatdan o‘tgan pedagoglar va ularning qurilmalari (Android Keystore max 2 ta)
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200">
                  Jami: {usersList.length} o‘qituvchi
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                {usersList.map((user, idx) => (
                  <div key={user.id || idx} className="p-5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        👩‍🏫
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{user.fullName || user.email}</h4>
                        <p className="text-[11px] text-slate-400">
                          {user.email} • {user.phoneNumber || 'Tel biriktirilmagan'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-xs font-semibold">
                      <span className="text-slate-500">📱 {user.devices?.length || 0} / 2 qurilma</span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                        {user.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </div>
                  </div>
                ))}

                {usersList.length === 0 && (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <Users className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                    <p className="text-sm font-bold text-slate-600">Hozircha foydalanuvchilar yo‘q (Baza toza)</p>
                    <p className="text-xs text-slate-400">
                      O‘qituvchilar mobil ilovadan Gmail OTP orqali kirganlarida avtomatik ushbu ro‘yxatga qo‘shiladi
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW: SINFLAR BOSHQARUVI (Dynamic Grades Management)                */}
          {/* =================================================================== */}
          {activeNav === 'grades' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Sinflar Boshqaruvi
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Mobil ilovada va kitob yuklashda faqat shu yerdagi faol sinflar ko‘rinadi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddGradeModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center space-x-2 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yangi Sinf Qo‘shish</span>
                </button>
              </div>

              {/* Grid of grades */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gradesList.map((gradeItem) => {
                  const isActive = gradeItem.isActive !== false;
                  const booksInGrade = books.filter(
                    (b) => Number(b.grade) === Number(gradeItem.gradeNumber),
                  ).length;
                  return (
                    <div
                      key={gradeItem.id || gradeItem.gradeNumber}
                      className={`bg-white p-5 rounded-3xl border shadow-sm transition-all space-y-4 ${
                        isActive ? 'border-slate-200/80 hover:border-indigo-300' : 'border-slate-200/60 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3.5">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {gradeItem.gradeNumber}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900">
                              {gradeItem.title || `${gradeItem.gradeNumber}-sinf`}
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {booksInGrade} ta darslik biriktirilgan
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleGradeActive(gradeItem)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {isActive ? 'Faol' : 'Nofaol'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGrade(gradeItem.gradeNumber)}
                            title="Sinfni o‘chirish"
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                        <div className="bg-[#F5F7FF] rounded-xl p-2">
                          <p className="text-[10px] font-bold text-slate-400">1 oylik</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">
                            {Number(gradeItem.priceMonthlyUzs || 0).toLocaleString('uz-UZ')}
                          </p>
                        </div>
                        <div className="bg-[#F5F7FF] rounded-xl p-2">
                          <p className="text-[10px] font-bold text-slate-400">3 oylik</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">
                            {Number(gradeItem.priceQuarterlyUzs || 0).toLocaleString('uz-UZ')}
                          </p>
                        </div>
                        <div className="bg-[#F5F7FF] rounded-xl p-2">
                          <p className="text-[10px] font-bold text-slate-400">1 yillik</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">
                            {Number(gradeItem.priceYearlyUzs || 0).toLocaleString('uz-UZ')}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPricingSelectedGradeId(gradeItem.gradeNumber);
                          setPricingViewMode('BY_GRADE');
                          setActiveNav('pricing');
                        }}
                        className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all"
                      >
                        Fanlar bo‘yicha narxini sozlash →
                      </button>
                    </div>
                  );
                })}
              </div>

              {gradesList.length === 0 && (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-2">
                  <GraduationCap className="w-12 h-12 mx-auto text-indigo-300" />
                  <p className="text-sm font-bold text-slate-700">Hozircha sinflar kiritilmagan</p>
                  <p className="text-xs text-slate-400">
                    Yuqoridagi tugma orqali kerakli sinflarni qo‘shing
                  </p>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW: FANLAR BOSHQARUVI (Dynamic Subjects Management)               */}
          {/* =================================================================== */}
          {activeNav === 'subjects' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Fanlar Boshqaruvi
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Ona tili, Matematika, Ingliz tili, Kimyo va boshqa barcha fanlarni erkin qo‘shish va boshqarish
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center space-x-2 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yangi Fan Qo‘shish</span>
                </button>
              </div>

              {/* Grid of subjects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectsList.map((subj) => (
                  <div
                    key={subj.id || subj.code}
                    className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
                        style={{ backgroundColor: `${subj.color || '#4F46E5'}15` }}
                      >
                        {subj.icon || '📚'}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{subj.name}</h3>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {subj.code}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: subj.color || '#4F46E5' }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(subj.id)}
                      title="Fanni o‘chirish"
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick helper notice */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-800 flex items-center space-x-3">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <p>
                  Bu yerda qo‘shilgan har bir fan avtomatik tarzda <strong>«Kitob Qo‘shish»</strong>, <strong>«Tariflar Matritsasi»</strong> va <strong>mobil ilovada</strong> aks etadi.
                </p>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW: TARIFLAR VA NARXLAR (Global + Grade × Subject Matrix)         */}
          {/* =================================================================== */}
          {activeNav === 'pricing' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Tariflar & Sinf × Fan Narxlari
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Har bir sinf va har bir fan uchun alohida obuna narxlarini (masalan, 1-sinf Matematika vs 11-sinf Kimyo) belgilang
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSavePricing}
                  disabled={isSavingPricing}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center space-x-2 transition-all shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingPricing ? 'Saqlanmoqda...' : 'Barcha Narxlarni Saqlash'}</span>
                </button>
              </div>

              {/* Global Default Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {pricingPlans.map((plan, idx) => (
                  <div
                    key={plan.id || idx}
                    className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 hover:border-indigo-300 transition-all relative overflow-hidden"
                  >
                    {plan.badge && (
                      <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold uppercase">
                        {plan.badge}
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Bazaviy tarif • {plan.durationDays} kun
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-0.5">{plan.name}</h3>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        value={plan.priceUzs}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setPricingPlans((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, priceUzs: val } : p)),
                          );
                        }}
                        className="w-full pl-3.5 pr-14 py-2 rounded-xl border border-slate-200 text-slate-900 font-black text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-[#F5F7FF]/60"
                      />
                      <span className="absolute right-3.5 top-2.5 text-[11px] font-bold text-slate-400">
                        UZS
                      </span>
                    </div>

                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPricingPlans((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, name: val } : p)),
                        );
                      }}
                      placeholder="Tarif nomi"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Per-(Grade × Subject) Individual Pricing Matrix */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Sinf va Fan Kesimida Narxlar Matritsasi
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Istalgan fan yoki sinfni tanlab 1 oylik, 3 oylik va 1 yillik narxlarni alohida kiriting
                    </p>
                  </div>

                  {/* Mode Switcher: Fan bo'yicha vs Sinf bo'yicha */}
                  <div className="inline-flex p-1 rounded-xl bg-[#F5F7FF] border border-slate-200/80 self-start">
                    <button
                      type="button"
                      onClick={() => setPricingViewMode('BY_SUBJECT')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        pricingViewMode === 'BY_SUBJECT'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Fan bo‘yicha ko‘rish
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingViewMode('BY_GRADE')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        pricingViewMode === 'BY_GRADE'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sinf bo‘yicha ko‘rish
                    </button>
                  </div>
                </div>

                {/* Filter Pills Bar */}
                <div className="px-6 py-3.5 bg-[#F5F7FF]/70 border-b border-slate-100 flex flex-wrap items-center gap-2">
                  {pricingViewMode === 'BY_SUBJECT'
                    ? subjectsList.map((subj) => {
                        const active = pricingSelectedSubjectId === subj.id;
                        return (
                          <button
                            key={subj.id}
                            type="button"
                            onClick={() => setPricingSelectedSubjectId(subj.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border ${
                              active
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <span>{subj.icon || '📚'}</span>
                            <span>{subj.name}</span>
                          </button>
                        );
                      })
                    : activeGradesList.map((gradeItem) => {
                        const active = pricingSelectedGradeId === gradeItem.gradeNumber;
                        return (
                          <button
                            key={gradeItem.gradeNumber}
                            type="button"
                            onClick={() => setPricingSelectedGradeId(gradeItem.gradeNumber)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              active
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            {gradeItem.title || `${gradeItem.gradeNumber}-sinf`}
                          </button>
                        );
                      })}
                </div>

                {/* Matrix Rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">
                          {pricingViewMode === 'BY_SUBJECT' ? 'Sinf' : 'Fan'}
                        </th>
                        <th className="py-3.5 px-4">1 Oylik (UZS)</th>
                        <th className="py-3.5 px-4">3 Oylik (UZS)</th>
                        <th className="py-3.5 px-4">1 Yillik (UZS)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(pricingViewMode === 'BY_SUBJECT'
                        ? activeGradesList.map((g) => ({
                            key: `${g.gradeNumber}::${pricingSelectedSubjectId}`,
                            gradeId: g.gradeNumber,
                            subjectId: pricingSelectedSubjectId,
                            label: g.title || `${g.gradeNumber}-sinf`,
                            subLabel:
                              subjectsList.find((s) => s.id === pricingSelectedSubjectId)?.name || '',
                          }))
                        : subjectsList.map((s) => ({
                            key: `${pricingSelectedGradeId}::${s.id}`,
                            gradeId: pricingSelectedGradeId,
                            subjectId: s.id,
                            label: `${s.icon || '📚'} ${s.name}`,
                            subLabel: `${pricingSelectedGradeId}-sinf • ${s.code}`,
                          }))
                      ).map((row) => {
                        const entry = getMatrixEntry(row.gradeId, row.subjectId);
                        const hasOverride = Boolean(pricingMatrixMap[row.key]);
                        return (
                          <tr key={row.key} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="py-3.5 px-6">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-extrabold text-slate-900">
                                  {row.label}
                                </span>
                                {hasOverride && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Moslashtirilgan
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{row.subLabel}</p>
                            </td>
                            {(
                              [
                                'priceMonthlyUzs',
                                'priceQuarterlyUzs',
                                'priceYearlyUzs',
                              ] as const
                            ).map((field) => (
                              <td key={field} className="py-3 px-4">
                                <div className="relative max-w-[170px]">
                                  <input
                                    type="number"
                                    value={entry[field]}
                                    onChange={(e) =>
                                      updateMatrixEntryField(
                                        row.gradeId,
                                        row.subjectId,
                                        field,
                                        parseInt(e.target.value, 10) || 0,
                                      )
                                    }
                                    className="w-full pl-3 pr-11 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white"
                                  />
                                  <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">
                                    so‘m
                                  </span>
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notice */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-800 flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <p>
                  Kiritilgan har bir (Sinf × Fan) narxi «Barcha Narxlarni Saqlash» tugmasi bosilishi bilan mobil ilovaning tariflar va so‘rov yuborish ekranida darhol aks etadi.
                </p>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW: ADMINLAR BOSHQARUVI (Super Admin & Team)                      */}
          {/* =================================================================== */}
          {activeNav === 'admins' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    👑 Administratorlar Boshqaruvi
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Platformaga yangi adminlarni biriktirish, ularning parollarini belgilash va nazorat qilish
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center space-x-2 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yangi Admin Qo‘shish</span>
                </button>
              </div>

              {/* Admins Table / List */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                {adminsList.map((admin) => (
                  <div key={admin.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-all">
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-inner ${
                          admin.role === 'SUPER_ADMIN'
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {admin.role === 'SUPER_ADMIN' ? '👑' : '🛡️'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-extrabold text-slate-900">{admin.fullName}</h4>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              admin.role === 'SUPER_ADMIN'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {admin.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{admin.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="text-[11px] font-bold text-slate-500">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('uz-UZ') : 'Bugun'}
                      </span>
                      {admin.email !== 'mlrahmonjon@gmail.com' ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-all"
                          title="Adminni o‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[11px] font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                          Asosiy Super Admin
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 10: AUDIT LOGS & SETTINGS                                      */}
          {/* =================================================================== */}
          {(activeNav === 'system_logs' || activeNav === 'settings') && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeNav === 'system_logs' ? 'Tizim Xavfsizlik Jurnali' : 'Platforma Sozlamalari'}
              </h2>
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-emerald-600 font-bold">[AUTH]</span> OTP Code xizmati (Gmail SMTP & Fast PIN) faol
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-blue-600 font-bold">[SECURITY]</span> Android Keystore hardware AES-256-GCM envelope key himoyasi faol
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-purple-600 font-bold">[CLOCK]</span> Monotonic anchor vaqt sinxronizatsiyasi 100% himoyalangan
                </div>
              </div>

              {/* Danger Zone: Database Reset */}
              <div className="bg-red-50/70 p-6 rounded-3xl border border-red-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-red-900 flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>Ma‘lumotlar Bazasini Tozalash (0 dan boshlash)</span>
                    </h3>
                    <p className="text-xs text-red-700 mt-1 max-w-xl">
                      Barcha yuklangan kitoblar, sahifalar, media fayllar, foydalanuvchilar va so‘rovlar bazadan butunlay o‘chiriladi. Admin hisobingiz saqlanib qoladi va kitoblarni noldan yuklashingiz mumkin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all flex items-center space-x-1.5 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Bazani Tozalash</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Master Reset Database Confirmation Modal */}
          {isResetConfirmOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-black text-slate-900">Bazasini Tozalashni Tasdiqlaysizmi?</h3>
                  <p className="text-xs text-slate-500">
                    Barcha kitoblar, sahifalar, audio/video fayllar va so‘rovlar to‘liq o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.
                  </p>
                </div>
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={handleResetDatabase}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all flex items-center justify-center space-x-1"
                  >
                    {isResetting ? (
                      <span>Tozalanmoqda...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Ha, butunlay tozalash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 11: LIVE MOBILE APP SIMULATOR (Port 8081)                      */}
          {/* =================================================================== */}
          {activeNav === 'mobile_sim' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Jonli Mobil Ilova Sinovi (Android Simulyatori)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Admin panelda kiritilgan har bir darslik va audio shu zahoti ushbu simulyatorda aks etadi
                  </p>
                </div>
                <a
                  href="http://localhost:8081"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-100 text-blue-800 text-xs font-bold hover:bg-blue-200 transition-all flex items-center space-x-1.5"
                >
                  <span>Alohida Oynada Ochish</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex justify-center">
                <div className="relative w-[380px] h-[780px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-[4px] border-slate-700/80">
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" />
                  </div>

                  <div className="w-full h-full rounded-[42px] overflow-hidden bg-slate-900 relative">
                    <iframe
                      src="http://localhost:8081"
                      title="SmartTeacherBook Mobile App"
                      className="w-full h-full border-0 select-none block"
                    />
                  </div>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* Add Grade Modal */}
          {isAddGradeModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    <span>Yangi Sinf Qo‘shish</span>
                  </h3>
                  <button
                    onClick={() => setIsAddGradeModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sinf Raqami (1–12) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={newGradeNumber}
                        onChange={(e) => {
                          setNewGradeNumber(e.target.value);
                          if (!newGradeTitle || newGradeTitle.endsWith('-sinf')) {
                            setNewGradeTitle(`${e.target.value}-sinf`);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sinf Nomi</label>
                      <input
                        type="text"
                        value={newGradeTitle}
                        onChange={(e) => setNewGradeTitle(e.target.value)}
                        placeholder={`${newGradeNumber}-sinf`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Standart Oylik / 3 Oylik / Yillik (UZS)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={newGradeMonthly}
                        onChange={(e) => setNewGradeMonthly(Number(e.target.value) || 0)}
                        placeholder="1 oylik"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                      />
                      <input
                        type="number"
                        value={newGradeQuarterly}
                        onChange={(e) => setNewGradeQuarterly(Number(e.target.value) || 0)}
                        placeholder="3 oylik"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                      />
                      <input
                        type="number"
                        value={newGradeYearly}
                        onChange={(e) => setNewGradeYearly(Number(e.target.value) || 0)}
                        placeholder="1 yillik"
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Izoh (ixtiyoriy)</label>
                    <input
                      type="text"
                      value={newGradeDesc}
                      onChange={(e) => setNewGradeDesc(e.target.value)}
                      placeholder="Boshlang‘ich yoki yuqori sinf darsliklari"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddGradeModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={isSavingGrade}
                    onClick={handleCreateGrade}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                  >
                    {isSavingGrade ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Subject Modal */}
          {isAddSubjectModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <span className="text-xl">🏷️</span>
                    <span>Yangi Fan Qo‘shish</span>
                  </h3>
                  <button
                    onClick={() => setIsAddSubjectModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fan Nomi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Masalan: Ona tili, Tarix, Geografiya"
                      value={newSubjName}
                      onChange={(e) => setNewSubjName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fan Kodi (qisqartma) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="UZB, HIST, GEO, MATH..."
                      value={newSubjCode}
                      onChange={(e) => setNewSubjCode(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Belgisi (Emoji)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['🇬🇧', '📖', '📐', '⚛️', '🧪', '🧬', '💻', '🏛️', '🌍', '🎨', '🎵', '⚽', '🌿', '📚'].map(
                        (emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setNewSubjIcon(emoji)}
                            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                              newSubjIcon === emoji
                                ? 'bg-blue-100 border-2 border-blue-600 scale-105'
                                : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                    <input
                      type="text"
                      value={newSubjIcon}
                      onChange={(e) => setNewSubjIcon(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Rang tanlang
                    </label>
                    <div className="flex items-center space-x-2">
                      {[
                        '#2563EB',
                        '#EA580C',
                        '#059669',
                        '#7C3AED',
                        '#DB2777',
                        '#0D9488',
                        '#D97706',
                        '#475569',
                      ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewSubjColor(c)}
                          className={`w-7 h-7 rounded-full transition-all ${
                            newSubjColor === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddSubjectModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSubject}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
                  >
                    Qo‘shish
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Admin Modal */}
          {isAddAdminModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <span className="text-xl">👑</span>
                    <span>Yangi Administrator Qo‘shish</span>
                  </h3>
                  <button
                    onClick={() => setIsAddAdminModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      To‘liq Ismi
                    </label>
                    <input
                      type="text"
                      placeholder="Masalan: Sardor Aliyev"
                      value={newAdminFullName}
                      onChange={(e) => setNewAdminFullName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email (Login uchun) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="admin@smartteacher.uz"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Parol <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Kamida 6 ta belgi"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ruxsat darajasi (Rol)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAdminRole('ADMIN')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          newAdminRole === 'ADMIN'
                            ? 'bg-purple-50 border-purple-500 text-purple-900 ring-1 ring-purple-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-xs font-black">🛡️ Admin</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Kitoblar va audiolarni boshqarish</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewAdminRole('SUPER_ADMIN')}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          newAdminRole === 'SUPER_ADMIN'
                            ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-xs font-black">👑 Super Admin</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">To‘liq ruxsat (baza, narx, adminlar)</p>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddAdminModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={isSavingAdmin}
                    onClick={handleSaveAdmin}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
                  >
                    {isSavingAdmin ? 'Saqlanmoqda...' : 'Admin Yaratish'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full Screen Answer Key Screenshot Modal */}
          {previewImageModalUrl && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setPreviewImageModalUrl(null)}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl p-2 animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700">📸 O‘qituvchi kitobi javoblar skrinshoti</span>
                  <button
                    onClick={() => setPreviewImageModalUrl(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center bg-slate-900/5 rounded-2xl">
                  <img
                    src={previewImageModalUrl}
                    alt="Javoblar skrinshoti"
                    className="w-auto h-auto max-h-[75vh] max-w-full object-contain rounded-xl shadow"
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
