import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { VisualPdfEditor } from './VisualPdfEditor';
import { api } from '../services/apiClient';

export type AdminPortalNav =
  | 'dashboard'
  | 'add_book'
  | 'my_books'
  | 'audio_video'
  | 'manage_content'
  | 'page_editor'
  | 'users'
  | 'subscriptions'
  | 'analytics'
  | 'system_logs'
  | 'settings'
  | 'mobile_sim';

interface ModernAdminPortalProps {
  onLogout: () => void;
}

export function ModernAdminPortal({ onLogout }: ModernAdminPortalProps) {
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
  // STATE: Add Book Form (Simplified 1-step form)
  // ==========================================
  const [newBookGrade, setNewBookGrade] = useState('7');
  const [newBookSubject, setNewBookSubject] = useState('English');
  const [newBookType, setNewBookType] = useState<"Student's Book" | "Teacher's Book" | 'Workbook'>("Student's Book");
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [newBookPages, setNewBookPages] = useState('120');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // ==========================================
  // STATE: Real Media Library (Audio & Video)
  // ==========================================
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<'AUDIO' | 'VIDEO'>('AUDIO');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isAddMediaModalOpen, setIsAddMediaModalOpen] = useState(false);
  const [newMediaType, setNewMediaType] = useState<'AUDIO' | 'VIDEO'>('AUDIO');
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaUnit, setNewMediaUnit] = useState('Unit 1');
  const [newMediaDuration, setNewMediaDuration] = useState('120');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaBookId, setNewMediaBookId] = useState('');
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // ==========================================
  // STATE: Real Answer Mappings (Teacher ↔ Student)
  // ==========================================
  const [answerMappings, setAnswerMappings] = useState<any[]>([]);
  const [isAddAnswerModalOpen, setIsAddAnswerModalOpen] = useState(false);
  const [answerGrade, setAnswerGrade] = useState<number>(7);
  const [answerSubject, setAnswerSubject] = useState('English');
  const [answerStudentPage, setAnswerStudentPage] = useState<number>(1);
  const [answerTeacherPage, setAnswerTeacherPage] = useState<number>(1);
  const [answerExercise, setAnswerExercise] = useState('');
  const [answerSolutionKey, setAnswerSolutionKey] = useState('');
  const [answerNotes, setAnswerNotes] = useState('');
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  // ==========================================
  // STATE: Real Requests & Users
  // ==========================================
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Database Reset Modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // ==========================================
  // DATA LOADERS
  // ==========================================
  const loadCatalogBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const data = await api.getAllBooks();
      if (Array.isArray(data)) {
        const mapped = data.map((b: any) => ({
          id: b.id,
          title: b.title,
          grade: b.gradeId || b.grade?.gradeNumber || 7,
          subject: b.subjectId?.includes('math') ? 'Mathematics' : b.subjectId?.includes('phys') ? 'Physics' : 'English',
          version: `v${b.version || 1}.0`,
          type: b.type === 'STUDENT_BOOK' ? "Student's Book" : b.type === 'TEACHER_BOOK' ? "Teacher's Book" : 'Workbook',
          status: b.status === 'PUBLISHED' ? 'Published' : b.status === 'INGESTING' ? 'Processing' : 'Draft',
          pages: b.totalPages || 0,
          size: b.totalSizeBytes ? `${(b.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'PDF',
          date: new Date(b.createdAt || Date.now()).toLocaleDateString('ru-RU'),
          coverColor: (b.gradeId || 7) >= 10 ? 'from-indigo-600 to-blue-800' : 'from-blue-600 to-indigo-700',
          iconEmoji: b.type === 'TEACHER_BOOK' ? '💡' : '📘',
        }));
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

  const loadDashboardStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setDashboardStats(data);
    } catch (err) {
      console.warn('Load dashboard stats error:', err);
    }
  };

  const loadAllPortalData = async () => {
    await Promise.all([
      loadCatalogBooks(),
      loadMedia(),
      loadAnswerMappings(),
      loadRequests(),
      loadUsers(),
      loadDashboardStats(),
    ]);
  };

  useEffect(() => {
    loadAllPortalData();
  }, []);

  // Update default book title when Grade, Subject, or Type changes
  useEffect(() => {
    if (!newBookTitle || newBookTitle.includes('-sinf')) {
      const subjectNameUz =
        newBookSubject === 'English'
          ? 'Ingliz tili'
          : newBookSubject === 'Mathematics'
          ? 'Matematika'
          : newBookSubject === 'Physics'
          ? 'Fizika'
          : newBookSubject === 'Chemistry'
          ? 'Kimyo'
          : newBookSubject === 'Biology'
          ? 'Biologiya'
          : newBookSubject;
      setNewBookTitle(`${subjectNameUz} ${newBookGrade}-sinf (${newBookType})`);
    }
  }, [newBookGrade, newBookSubject, newBookType]);

  // ==========================================
  // HANDLERS: Direct Book Save (PDF or Draft)
  // ==========================================
  const handleDirectSaveBook = async () => {
    const numGrade = parseInt(newBookGrade) || 7;
    const titleToSave = newBookTitle.trim() || `${newBookSubject} ${numGrade}-sinf (${newBookType})`;

    setIsUploadingPdf(true);
    try {
      if (selectedPdfFile) {
        const res = await api.uploadBookPdf(selectedPdfFile, {
          title: titleToSave,
          gradeId: numGrade,
          subjectId: newBookSubject.toLowerCase().includes('math')
            ? `sub_math_${numGrade}`
            : `sub_eng_${numGrade}`,
          bookType:
            newBookType === "Teacher's Book"
              ? 'TEACHER_BOOK'
              : newBookType === 'Workbook'
              ? 'WORKBOOK'
              : 'STUDENT_BOOK',
        });
        await loadCatalogBooks();
        setSelectedPdfFile(null);
        alert(`🎉 Darslik muvaffaqiyatli saqlandi! (${res.book?.totalPages || 'Ko‘p'} ta sahifa aniqlandi)`);
        setActiveNav('my_books');
      } else {
        await api.createBook({
          title: titleToSave,
          gradeId: numGrade,
          subjectId: newBookSubject.toLowerCase().includes('math')
            ? `sub_math_${numGrade}`
            : `sub_eng_${numGrade}`,
          type:
            newBookType === "Teacher's Book"
              ? 'TEACHER_BOOK'
              : newBookType === 'Workbook'
              ? 'WORKBOOK'
              : 'STUDENT_BOOK',
          totalPages: parseInt(newBookPages) || 120,
          description: newBookDesc,
        });
        await loadCatalogBooks();
        alert(`🎉 Yangi darslik muvaffaqiyatli yaratildi va katalogga qo‘shildi!`);
        setActiveNav('my_books');
      }
    } catch (err: any) {
      alert('Kitobni saqlashda xatolik yuz berdi: ' + err.message);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!window.confirm("Haqiqatan ham ushbu darslikni o'chirib tashlamoqchimisiz?")) {
      return;
    }
    try {
      await api.deleteBook(bookId);
      await loadCatalogBooks();
      alert("Darslik bazadan to'liq o'chirildi!");
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  // ==========================================
  // HANDLERS: Media (Audio & Video)
  // ==========================================
  const handleSaveNewMedia = async () => {
    if (!newMediaTitle.trim()) {
      alert('Iltimos, audio/video nomini kiriting!');
      return;
    }
    setIsSavingMedia(true);
    try {
      await api.createMedia({
        type: newMediaType,
        title: newMediaTitle.trim(),
        filename: newMediaType === 'AUDIO' ? 'track.mp3' : 'video.mp4',
        unitLabel: newMediaUnit.trim() || 'Unit 1',
        durationSeconds: parseInt(newMediaDuration) || 120,
        url:
          newMediaUrl.trim() ||
          (newMediaType === 'AUDIO'
            ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'),
        bookId: newMediaBookId || undefined,
      });
      await loadMedia();
      setIsAddMediaModalOpen(false);
      setNewMediaTitle('');
      setNewMediaUrl('');
      alert('🎉 Yangi media fayl muvaffaqiyatli saqlandi!');
    } catch (err: any) {
      alert('Media saqlashda xatolik: ' + err.message);
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm("Haqiqatan ham ushbu media faylni o'chirmoqchimisiz?")) return;
    try {
      await api.deleteMedia(id);
      await loadMedia();
      alert("Media fayl o'chirildi!");
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  const handleTogglePlayAudio = (url: string, id: string) => {
    if (playingAudioId === id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play().catch((err) => {
          console.warn('Audio play error:', err);
        });
      }
      setPlayingAudioId(id);
    }
  };

  // ==========================================
  // HANDLERS: Answer Mappings
  // ==========================================
  const handleSaveNewAnswerMapping = async () => {
    if (!answerExercise.trim() || !answerSolutionKey.trim()) {
      alert('Iltimos, mashq nomi va javoblar kalitini kiriting!');
      return;
    }
    setIsSavingAnswer(true);
    try {
      await api.createAnswerMapping({
        gradeId: Number(answerGrade),
        subjectId: answerSubject.toLowerCase().includes('math')
          ? `sub_math_${answerGrade}`
          : `sub_eng_${answerGrade}`,
        studentExerciseLabel: answerExercise.trim(),
        studentPageNumber: Number(answerStudentPage) || 1,
        teacherPageNumber: Number(answerTeacherPage) || 1,
        teacherExerciseLabel: `${answerExercise.trim()} (Javoblar Kaliti)`,
        notes: answerNotes.trim() || answerSolutionKey.trim(),
      });
      await loadAnswerMappings();
      setIsAddAnswerModalOpen(false);
      setAnswerExercise('');
      setAnswerSolutionKey('');
      setAnswerNotes('');
      alert("🎉 Javoblar kaliti muvaffaqiyatli bog'landi!");
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
      alert("Javoblar kaliti o'chirildi!");
    } catch (err: any) {
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  // ==========================================
  // HANDLERS: Subscriptions & Requests
  // ==========================================
  const handleApproveRequest = async (requestId: string) => {
    try {
      await api.grantAccess(requestId, 30, "Admin tomonidan to'lov tasdiqlandi");
      await loadRequests();
      alert("✅ To'lov tasdiqlandi va 30 kunlik litsenziya ochildi!");
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = prompt('Rad etish sababini kiriting:', "To'lov cheki yaroqsiz");
    if (!reason) return;
    try {
      await api.rejectAccess(requestId, reason);
      await loadRequests();
      alert("So'rov rad etildi.");
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
      alert("🎉 Barcha ma'lumotlar bazasi muvaffaqiyatli tozalandi (0 dan yangi yuklash uchun tayyor)!");
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
    if (globalSearch && !b.title.toLowerCase().includes(globalSearch.toLowerCase())) return false;
    return true;
  });

  const pendingRequestsCount = requestsList.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="flex h-screen bg-[#F4F7FC] text-slate-800 font-sans overflow-hidden">
      {/* Hidden Audio Player instance for real audio preview */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingAudioId(null)}
        onError={() => setPlayingAudioId(null)}
        className="hidden"
      />

      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR                                           */}
      {/* ========================================================= */}
      <aside className="w-64 bg-[#0B1528] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800/80 shadow-2xl select-none z-30">
        <div className="flex flex-col h-full">
          {/* Logo Brand Header */}
          <div className="p-5 pb-6 border-b border-slate-800/60">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveNav('dashboard')}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-blue-600 p-0.5 shadow-lg flex items-center justify-center">
                <div className="w-full h-full bg-[#0B1528] rounded-[14px] flex items-center justify-center">
                  <span className="text-xl">🔥</span>
                </div>
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                  SmartTeacherBook
                </h1>
                <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
                  TEACH • INSPIRE • GROW
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
            {/* Nav: Dashboard */}
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Nav: Content Manager (Group Dropdown) */}
            <div>
              <button
                onClick={() => setContentManagerOpen(!contentManagerOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNav === 'add_book' ||
                  activeNav === 'my_books' ||
                  activeNav === 'audio_video' ||
                  activeNav === 'manage_content' ||
                  activeNav === 'page_editor'
                    ? 'text-white bg-slate-800/80'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>Darsliklar & Kontent</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    contentManagerOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {contentManagerOpen && (
                <div className="pl-9 pr-1 pt-1 pb-1 space-y-1">
                  <button
                    onClick={() => setActiveNav('add_book')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'add_book'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    <span>➕ Kitob Qo‘shish</span>
                  </button>

                  <button
                    onClick={() => setActiveNav('my_books')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'my_books'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    <span>📚 Mening Kitoblarim</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 font-mono">
                      {books.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('audio_video')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'audio_video'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    <span>🎧 Audio & Video</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-mono">
                      {mediaList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('manage_content')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'manage_content'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    <span>💡 Javoblar Kaliti</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                      {answerMappings.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('page_editor')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeNav === 'page_editor'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    <span>📍 Visual Hotspot Editor</span>
                  </button>
                </div>
              )}
            </div>

            {/* Nav: Users */}
            <button
              onClick={() => setActiveNav('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'users'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>O‘qituvchilar (Users)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-mono">
                {usersList.length}
              </span>
            </button>

            {/* Nav: Subscriptions */}
            <button
              onClick={() => setActiveNav('subscriptions')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'subscriptions'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Crown className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Obunalar & To‘lovlar</span>
              </div>
              {pendingRequestsCount > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black animate-pulse">
                  {pendingRequestsCount} ta yangi
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {requestsList.length}
                </span>
              )}
            </button>

            {/* Nav: Analytics */}
            <button
              onClick={() => setActiveNav('analytics')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'analytics'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0 text-purple-400" />
              <span>Statistika</span>
            </button>

            {/* Nav: System Logs */}
            <button
              onClick={() => setActiveNav('system_logs')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'system_logs'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>Audit Jurnali</span>
            </button>

            {/* Nav: Settings */}
            <button
              onClick={() => setActiveNav('settings')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 text-slate-400" />
              <span>Sozlamalar</span>
            </button>

            <div className="pt-2 border-t border-slate-800/60 mt-2">
              {/* Nav: Mobile App Simulator */}
              <button
                onClick={() => setActiveNav('mobile_sim')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeNav === 'mobile_sim'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-emerald-400 hover:text-white hover:bg-emerald-950/40'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>📱 Mobil Ilova (Live Metro)</span>
              </button>
            </div>
          </div>

          {/* User Profile Footer Card */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 p-0.5 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white leading-none truncate">Super Admin</p>
                <p className="text-[10px] text-slate-400 truncate mt-1">admin@smartteacherbook.uz</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 text-xs font-bold transition-all flex items-center justify-center space-x-2 border border-slate-700/60"
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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F4F7FC]">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 z-20">
          {/* Search Box */}
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Darsliklar, media, foydalanuvchilarni qidirish..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-300/60">
              Ctrl + K
            </span>
          </div>

          {/* Right Header Icons & Actions */}
          <div className="flex items-center space-x-3">
            {/* Master Database Clean Button */}
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              title="Barcha ma'lumotlarni tozalab, 0 dan kiritish"
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Bazani Tozalash (0 dan)</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadAllPortalData()}
              title="Barcha ma'lumotlarni yangilash"
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-200 transition-all flex items-center space-x-1"
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
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm">
                👨‍💼
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none">Super Admin</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">admin@smartteacherbook.uz</p>
              </div>
            </div>
          </div>
        </header>

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
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Dashboard</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    SmartTeacherBook tizimi umumiy statistikasi va tezkor amallar
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveNav('add_book')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yangi Kitob Qo‘shish</span>
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Mavjud Kitoblar</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{books.length} ta</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-2">
                      Katalogda faol
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Audio & Video Fayllar</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{mediaList.length} ta</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md mt-2">
                      Media kutubxona
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Music className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Javoblar Kaliti</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{answerMappings.length} ta</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md mt-2">
                      Metodik yechimlar
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Kutilayotgan So‘rovlar</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{pendingRequestsCount} ta</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md mt-2">
                      {pendingRequestsCount > 0 ? 'Tasdiqlash kerak' : 'Barchasi ko‘rib chiqilgan'}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                    <Crown className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Jump Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  onClick={() => setActiveNav('add_book')}
                  className="p-5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white cursor-pointer shadow-lg shadow-blue-600/20 hover:scale-[1.01] transition-transform flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm">Yangi Kitob Qo‘shish</h4>
                    <p className="text-xs text-blue-100 mt-1">Sinf, fan va PDF faylni 1 bosishda saqlash</p>
                  </div>
                  <PlusCircle className="w-8 h-8 text-blue-200" />
                </div>

                <div
                  onClick={() => setActiveNav('audio_video')}
                  className="p-5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white cursor-pointer shadow-lg shadow-emerald-600/20 hover:scale-[1.01] transition-transform flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm">Audio & Video Boshqarish</h4>
                    <p className="text-xs text-emerald-100 mt-1">Tinglash treklari va video dars lavhalari</p>
                  </div>
                  <Music className="w-8 h-8 text-emerald-200" />
                </div>

                <div
                  onClick={() => setActiveNav('manage_content')}
                  className="p-5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white cursor-pointer shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-transform flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm">Javoblar Kaliti (Answer Keys)</h4>
                    <p className="text-xs text-amber-100 mt-1">O‘qituvchi kitobi yechimlarini sahifalarga bog‘lash</p>
                  </div>
                  <Crown className="w-8 h-8 text-amber-100" />
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 2: ADD BOOK (The user's #1 reported issue - Made Ultra Simple!) */}
          {/* =================================================================== */}
          {activeNav === 'add_book' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
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

              {/* Main 2-Column Form Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left: Input Form (7 cols) */}
                <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  {/* 1. Sinf (Grade) Selection */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">
                      1. Sinfni tanlang (Grade) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((gradeNum) => (
                        <button
                          key={gradeNum}
                          type="button"
                          onClick={() => setNewBookGrade(gradeNum.toString())}
                          className={`py-2 text-xs font-bold rounded-xl transition-all ${
                            newBookGrade === gradeNum.toString()
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {gradeNum}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Fan (Subject) Selection */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">
                      2. Fanni tanlang (Subject) <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'English', label: '🇬🇧 Ingliz tili' },
                        { id: 'Mathematics', label: '📐 Matematika' },
                        { id: 'Physics', label: '⚡ Fizika' },
                        { id: 'Chemistry', label: '🧪 Kimyo' },
                        { id: 'Biology', label: '🧬 Biologiya' },
                        { id: 'Science', label: '🌿 Tabiiy fanlar' },
                      ].map((subj) => (
                        <button
                          key={subj.id}
                          type="button"
                          onClick={() => setNewBookSubject(subj.id)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border ${
                            newBookSubject === subj.id
                              ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {subj.label}
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

                  {/* 5. PDF Fayl Yuklash (Drag & Drop or Picker) */}
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
                          if (file) {
                            setSelectedPdfFile(file);
                          }
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
                          : 'Ixtiyoriy: Agar PDF bo‘lmasa, pastdagi tugma orqali qoralama yaratishingiz mumkin'}
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

                  {/* 6. Description (Optional) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      6. Qisqacha tavsif (Ixtiyoriy)
                    </label>
                    <textarea
                      rows={2}
                      value={newBookDesc}
                      onChange={(e) => setNewBookDesc(e.target.value)}
                      placeholder="Ushbu darslik haqida o‘qituvchilar uchun qisqacha ma'lumot..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
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

                  {/* 3D Tilted Textbook Mockup */}
                  <div className="relative my-6 transform hover:scale-105 transition-transform duration-300">
                    <div className="w-56 h-72 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-5 text-white shadow-2xl border-l-[6px] border-blue-400 relative flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono tracking-widest uppercase opacity-75">
                            {newBookGrade}-sinf
                          </span>
                          <span className="text-xl">
                            {newBookSubject === 'English' ? '🇬🇧' : newBookSubject === 'Mathematics' ? '📐' : '📘'}
                          </span>
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
                          {selectedPdfFile ? `${(selectedPdfFile.size / (1024 * 1024)).toFixed(1)} MB PDF` : 'PDF yuklanmagan'}
                        </p>
                      </div>
                    </div>
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
          {/* VIEW 3: MY BOOKS (Real Catalog from Backend)                         */}
          {/* =================================================================== */}
          {activeNav === 'my_books' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mening Kitoblarim</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Yuklangan barcha darsliklar va ularning interaktiv sahifalari
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
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Left Book Info */}
                      <div className="flex items-center space-x-4 min-w-0">
                        <div
                          className={`w-12 h-14 rounded-xl bg-gradient-to-br ${book.coverColor} text-white flex flex-col items-center justify-center shrink-0 shadow-md`}
                        >
                          <span className="text-base">{book.iconEmoji}</span>
                          <span className="text-[9px] font-black">{book.grade}-sinf</span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">{book.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {book.grade}-sinf • {book.subject} • {book.type}
                          </p>
                        </div>
                      </div>

                      {/* Middle Attributes */}
                      <div className="hidden md:flex items-center space-x-6 text-xs text-slate-600">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            book.status === 'Published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {book.status}
                        </span>

                        <span className="flex items-center space-x-1.5 font-medium text-slate-500">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{book.pages} bet</span>
                        </span>

                        <span className="flex items-center space-x-1.5 font-medium text-slate-500">
                          <Download className="w-3.5 h-3.5" />
                          <span>{book.size}</span>
                        </span>

                        <span className="flex items-center space-x-1.5 font-medium text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{book.date}</span>
                        </span>
                      </div>

                      {/* Right Action Menu */}
                      <div className="flex items-center space-x-2">
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
          {/* VIEW 4: AUDIO & VIDEO (Real Media Library from Backend)             */}
          {/* =================================================================== */}
          {activeNav === 'audio_video' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Audio & Video Kutubxonasi</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Darslik sahifalaridagi tinglash (listening) audiolari va videolarni boshqarish
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 bg-slate-200/60 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveMediaTab('AUDIO')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeMediaTab === 'AUDIO' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Audio ({mediaList.filter((m) => m.type === 'AUDIO').length})
                    </button>
                    <button
                      onClick={() => setActiveMediaTab('VIDEO')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeMediaTab === 'VIDEO' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Video ({mediaList.filter((m) => m.type === 'VIDEO').length})
                    </button>
                  </div>
                  <button
                    onClick={() => setIsAddMediaModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Yangi Media Qo‘shish</span>
                  </button>
                </div>
              </div>

              {/* Media List */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">
                  {activeMediaTab === 'AUDIO' ? 'Audio Treklari Ro‘yxati' : 'Video Lavhalari Ro‘yxati'}
                </h3>

                <div className="space-y-2">
                  {mediaList
                    .filter((m) => m.type === activeMediaTab)
                    .map((item) => {
                      const isPlaying = playingAudioId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                            isPlaying
                              ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5">
                            {/* Play/Pause Button for Audio */}
                            {item.type === 'AUDIO' ? (
                              <button
                                onClick={() => handleTogglePlayAudio(item.url, item.id)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                  isPlaying
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                                <Video className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900">{item.title}</h4>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                {item.unitLabel || 'Unit 1'} • {item.filename || 'media'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span className="text-xs font-mono font-bold text-slate-500">
                              {Math.floor((item.durationSeconds || 120) / 60)}:
                              {String((item.durationSeconds || 120) % 60).padStart(2, '0')}
                            </span>
                            <button
                              onClick={() => handleDeleteMedia(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                              title="O‘chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {mediaList.filter((m) => m.type === activeMediaTab).length === 0 && (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <Music className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                      <p className="text-xs font-bold text-slate-600">
                        Hozircha {activeMediaTab === 'AUDIO' ? 'audio' : 'video'} fayllar qo‘shilmagan
                      </p>
                      <button
                        onClick={() => {
                          setNewMediaType(activeMediaTab);
                          setIsAddMediaModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                      >
                        + Yangi {activeMediaTab === 'AUDIO' ? 'Audio' : 'Video'} Qo‘shish
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Media Modal */}
              {isAddMediaModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-900">Yangi Audio / Video Qo‘shish</h3>
                      <button
                        onClick={() => setIsAddMediaModalOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Media Turi</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewMediaType('AUDIO')}
                            className={`py-2 text-xs font-bold rounded-xl border ${
                              newMediaType === 'AUDIO'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            🎧 Audio Trek
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewMediaType('VIDEO')}
                            className={`py-2 text-xs font-bold rounded-xl border ${
                              newMediaType === 'VIDEO'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            🎬 Video Darslik
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Media Nomi <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newMediaTitle}
                          onChange={(e) => setNewMediaTitle(e.target.value)}
                          placeholder="masalan: Track 01 - Unit 1: School Life"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Bo‘lim</label>
                          <input
                            type="text"
                            value={newMediaUnit}
                            onChange={(e) => setNewMediaUnit(e.target.value)}
                            placeholder="Unit 1"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Davomiyligi (soniya)</label>
                          <input
                            type="number"
                            value={newMediaDuration}
                            onChange={(e) => setNewMediaDuration(e.target.value)}
                            placeholder="120"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Audio/Video Fayl URL (yoki demo manzil)
                        </label>
                        <input
                          type="text"
                          value={newMediaUrl}
                          onChange={(e) => setNewMediaUrl(e.target.value)}
                          placeholder="Ixtiyoriy: https://.../track.mp3 yoki bo‘sh qoldiring"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddMediaModalOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="button"
                        disabled={isSavingMedia}
                        onClick={handleSaveNewMedia}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1"
                      >
                        {isSavingMedia ? <span>Saqlanmoqda...</span> : <span>💾 Saqlash</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 5: JAVOBLAR KALITI (Answer Key Mapping)                        */}
          {/* =================================================================== */}
          {activeNav === 'manage_content' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Javoblar Kaliti va Metodika (Answer Keys)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    O‘qituvchi kitobidagi javoblarni o‘quvchi darsligining mashqlariga to‘g‘ridan-to‘g‘ri bog‘lash
                  </p>
                </div>
                <div className="flex items-center space-x-3">
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
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                          {mapping.gradeId}-sinf
                        </div>
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
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-1">
                            <span className="font-bold text-slate-800">Kalit:</span> {mapping.notes}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
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
                        O‘qituvchi kitobi mashqlar javoblarini o‘quvchi sahifasiga bog‘lash uchun quyidagi tugmani bosing.
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

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Sinf</label>
                          <select
                            value={answerGrade}
                            onChange={(e) => setAnswerGrade(Number(e.target.value))}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                              <option key={g} value={g}>
                                {g}-sinf
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
                            <option value="English">Ingliz tili</option>
                            <option value="Mathematics">Matematika</option>
                            <option value="Physics">Fizika</option>
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

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          To‘g‘ri Javoblar Kaliti <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={answerSolutionKey}
                          onChange={(e) => setAnswerSolutionKey(e.target.value)}
                          placeholder="masalan: 1. B, 2. C, 3. A, 4. D"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50"
                        />
                      </div>

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
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 6: VISUAL HOTSPOT EDITOR                                       */}
          {/* =================================================================== */}
          {activeNav === 'page_editor' && (
            <div className="h-full w-full">
              <VisualPdfEditor
                initialBookId={selectedBookIdForEditor || books[0]?.id || ''}
                onOpenMobilePreview={() => setActiveNav('mobile_sim')}
              />
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 7: SUBSCRIPTIONS & REQUESTS (Real Backend Data)                */}
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
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Kutilayotgan so‘rovlar: {pendingRequestsCount} ta</span>
                </div>
              </div>

              {/* Requests List */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {requestsList.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">
                          {req.gradeId || 'Sinf'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {req.fullName || req.teacherName || 'O‘qituvchi'}
                            </h4>
                            <span className="text-xs font-mono text-slate-400">
                              ({req.phoneNumber || '+998'})
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {req.subjectId || 'Fan'} • Plan: {req.plan || '30 kunlik'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(req.createdAt || Date.now()).toLocaleDateString('ru-RU')}
                        </span>

                        {req.status === 'APPROVED' ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Ruxsat Berilgan</span>
                          </span>
                        ) : req.status === 'REJECTED' ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold">
                            Bekor qilingan
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Ruxsat Berish (30 kun)</span>
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
                  ))}

                  {requestsList.length === 0 && (
                    <div className="p-12 text-center text-slate-400 space-y-2">
                      <Crown className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                      <p className="text-sm font-bold text-slate-600">Hozircha obuna so‘rovlari mavjud emas</p>
                      <p className="text-xs text-slate-400">
                        O‘qituvchilar mobil ilova orqali darslikka obuna bo‘lishganda bu yerda paydo bo‘ladi
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
                    Darsliklar yuklanishi, faol o‘qituvchilar va obunalar statistikasi
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400">Jami Kitoblar</p>
                  <p className="text-3xl font-black text-slate-900">{books.length} ta</p>
                  <p className="text-xs text-emerald-600 font-semibold">100% litsenziyalangan</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400">Media Fayllar</p>
                  <p className="text-3xl font-black text-slate-900">{mediaList.length} ta</p>
                  <p className="text-xs text-blue-600 font-semibold">Audio va Video resurslar</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <p className="text-xs font-bold text-slate-400">Javoblar Kaliti</p>
                  <p className="text-3xl font-black text-slate-900">{answerMappings.length} ta</p>
                  <p className="text-xs text-purple-600 font-semibold">Bog‘langan yechimlar</p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 9: USERS (Registered Teachers from Backend)                    */}
          {/* =================================================================== */}
          {activeNav === 'users' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">O‘qituvchilar (Users)</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Tizimda ro‘yxatdan o‘tgan o‘qituvchilar va ularning qurilmalari (Android Keystore limit 2)
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
          {/* VIEW 10: AUDIT LOGS & SETTINGS                                      */}
          {/* =================================================================== */}
          {(activeNav === 'system_logs' || activeNav === 'settings') && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeNav === 'system_logs' ? 'Tizim Xavfsizlik Jurnali' : 'Platforma Sozlamalari'}
              </h2>
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-emerald-600 font-bold">[AUTH]</span> OTP Code xizmati (Gmail SMTP & Fast PIN)
                  faol
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-blue-600 font-bold">[SECURITY]</span> Android Keystore hardware AES-256-GCM
                  envelope key himoyasi faol
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-purple-600 font-bold">[CLOCK]</span> Monotonic anchor vaqt sinxronizatsiyasi
                  100% himoyalangan
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
                      Barcha yuklangan kitoblar, sahifalar, media fayllar, foydalanuvchilar va so‘rovlar bazadan
                      butunlay o‘chiriladi. Admin hisobingiz saqlanib qoladi va kitoblarni noldan yuklashingiz mumkin.
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
                    Barcha kitoblar, sahifalar, audio/video fayllar va so‘rovlar to‘liq o‘chiriladi. Bu amalni qaytarib
                    bo‘lmaydi.
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
                    Admin panelda kiritilgan har bir o‘zgarish shu zahoti ushbu simulyatorda aks etadi
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
        </main>
      </div>
    </div>
  );
}
