import React, { useState } from 'react';
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
} from 'lucide-react';
import { VisualPdfEditor } from './VisualPdfEditor';

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
  // STATE: Books Catalog
  // ==========================================
  const defaultBooks = [
    {
      id: 'book-1',
      title: 'English for 7th Grade',
      grade: 7,
      subject: 'English',
      version: 'v1.0',
      type: "Student's Book",
      status: 'Published',
      pages: 245,
      size: '128 MB',
      date: '29.10.2025',
      coverColor: 'from-blue-600 to-indigo-700',
      iconEmoji: '🇬🇧',
    },
    {
      id: 'book-2',
      title: 'Mathematics for 8th Grade',
      grade: 8,
      subject: 'Mathematics',
      version: 'v1.0',
      type: "Student's Book",
      status: 'Published',
      pages: 312,
      size: '142 MB',
      date: '24.10.2025',
      coverColor: 'from-amber-500 to-orange-600',
      iconEmoji: '📐',
    },
    {
      id: 'book-3',
      title: 'Science for 9th Grade',
      grade: 9,
      subject: 'Science',
      version: 'v1.0',
      type: "Student's Book",
      status: 'Processing',
      pages: 280,
      size: '120 MB',
      date: '23.10.2025',
      coverColor: 'from-emerald-600 to-teal-700',
      iconEmoji: '🧬',
    },
    {
      id: 'book-4',
      title: 'English 7 Teacher’s Book (Javoblar)',
      grade: 7,
      subject: 'English',
      version: 'v1.0',
      type: "Teacher's Book",
      status: 'Published',
      pages: 180,
      size: '85 MB',
      date: '22.10.2025',
      coverColor: 'from-purple-600 to-violet-800',
      iconEmoji: '💡',
    },
  ];

  const [books, setBooks] = useState(defaultBooks);
  const [selectedBookFilter, setSelectedBookFilter] = useState<'All' | "Student's Book" | "Teacher's Book" | 'Workbook'>('All');

  // ==========================================
  // STATE: Add Book Form Wizard (Step 1-4)
  // ==========================================
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [newBookGrade, setNewBookGrade] = useState('7-sinf');
  const [newBookSubject, setNewBookSubject] = useState('English');
  const [newBookType, setNewBookType] = useState<"Student's Book" | "Teacher's Book" | 'Workbook'>("Student's Book");
  const [newBookTitle, setNewBookTitle] = useState('English for 7th Grade');
  const [newBookDesc, setNewBookDesc] = useState('Modern English textbook for 7th grade students.');
  const [newBookPages, setNewBookPages] = useState('245');

  const handleSaveNewBook = () => {
    const numGrade = parseInt(newBookGrade) || 7;
    const newEntry = {
      id: `book-${Date.now()}`,
      title: newBookTitle || `${newBookSubject} for ${newBookGrade}`,
      grade: numGrade,
      subject: newBookSubject,
      version: 'v1.0',
      type: newBookType,
      status: 'Published',
      pages: parseInt(newBookPages) || 150,
      size: '95 MB',
      date: new Date().toLocaleDateString('ru-RU'),
      coverColor: 'from-blue-600 to-indigo-700',
      iconEmoji: newBookSubject === 'English' ? '🇬🇧' : newBookSubject === 'Mathematics' ? '📐' : '📚',
    };
    setBooks([newEntry, ...books]);
    alert("Yangi kitob muvaffaqiyatli saqlandi va katalogga qo'shildi!");
    setActiveNav('my_books');
  };

  // ==========================================
  // STATE: Audio & Video
  // ==========================================
  const defaultAudioTracks = [
    {
      id: 'a-1',
      title: 'Unit 1 - Listening 1.1',
      meta: 'English • Grade 7 • 3.2 MB',
      duration: '02:15',
      active: true,
      file: 'unit1_track1.mp3',
    },
    {
      id: 'a-2',
      title: 'Unit 1 - Listening 1.2',
      meta: 'English • Grade 7 • 3.5 MB',
      duration: '02:48',
      active: true,
      file: 'unit1_track2.mp3',
    },
    {
      id: 'a-3',
      title: 'Unit 2 - Listening 2.1',
      meta: 'English • Grade 7 • 2.9 MB',
      duration: '02:20',
      active: true,
      file: 'unit2_track1.mp3',
    },
    {
      id: 'a-4',
      title: 'Unit 3 - Vocabulary Drill',
      meta: 'English • Grade 7 • 4.1 MB',
      duration: '03:10',
      active: false,
      file: 'unit3_vocab.mp3',
    },
  ];

  const [audioTracks, setAudioTracks] = useState(defaultAudioTracks);
  const [activeMediaTab, setActiveMediaTab] = useState<'AUDIO' | 'VIDEO'>('AUDIO');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // ==========================================
  // STATE: Subscriptions & Payment Orders
  // ==========================================
  const defaultOrders = [
    {
      id: 'REQ-881',
      teacherName: 'Nodira Karimova',
      phoneNumber: '+998 90 123 45 67',
      grade: 11,
      subject: 'Ingliz tili',
      plan: '1 Oylik (30 kun)',
      priceUzs: '119,000',
      status: 'APPROVED',
      createdAt: 'Bugun, 14:30',
    },
    {
      id: 'REQ-882',
      teacherName: 'Alisher Qosimov',
      phoneNumber: '+998 93 987 65 43',
      grade: 10,
      subject: 'Matematika',
      plan: '3 Oylik (90 kun)',
      priceUzs: '249,000',
      status: 'PENDING',
      createdAt: 'Bugun, 15:10',
    },
    {
      id: 'REQ-883',
      teacherName: 'Malika Ergasheva',
      phoneNumber: '+998 97 555 12 34',
      grade: 7,
      subject: 'Ingliz tili',
      plan: '1 Yillik (365 kun)',
      priceUzs: '690,000',
      status: 'PENDING',
      createdAt: 'Bugun, 16:45',
    },
  ];

  const [orders, setOrders] = useState(defaultOrders);

  const handleApproveOrder = (id: string) => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o))
    );
    alert("To'lov tasdiqlandi! O'qituvchi ilovasida darslik zudlik bilan faollashdi.");
  };

  const handleRejectOrder = (id: string) => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: 'REJECTED' } : o))
    );
  };

  // ==========================================
  // STATE: Page Editor (Hotspot Mapper)
  // ==========================================
  const [editorZoom, setEditorZoom] = useState(100);
  const [editorHotspots, setEditorHotspots] = useState([
    {
      id: 'hs-1',
      type: 'Audio',
      targetFile: 'unit3_track1.mp3',
      x: 0.42,
      y: 0.18,
      w: 0.12,
      h: 0.08,
      label: 'Listen & Repeat',
    },
    {
      id: 'hs-2',
      type: 'Answer',
      targetFile: 'teacher_key_p14.pdf',
      x: 0.55,
      y: 0.65,
      w: 0.38,
      h: 0.07,
      label: 'Ex. 1 Javoblar Kaliti',
    },
  ]);
  const [activeHotspotId, setActiveHotspotId] = useState<string>('hs-1');
  const activeHotspotObj = editorHotspots.find((h) => h.id === activeHotspotId) || editorHotspots[0];

  const handleAddHotspot = (type: string) => {
    const newHs = {
      id: `hs-${Date.now()}`,
      type: type,
      targetFile: type === 'Audio' ? 'audio_sample.mp3' : type === 'Video' ? 'lesson_video.mp4' : 'teacher_answers.pdf',
      x: 0.3,
      y: 0.4,
      w: 0.25,
      h: 0.08,
      label: `Yangi ${type}`,
    };
    setEditorHotspots([...editorHotspots, newHs]);
    setActiveHotspotId(newHs.id);
  };

  // ==========================================
  // DATA RESET / PURGE (Requested by user)
  // ==========================================
  const handlePurgeAllData = () => {
    if (confirm("Rostdan ham barcha namunaviy ma'lumotlarni o'chirib, toza holatga keltirmoqchimisiz?")) {
      setBooks([]);
      setOrders([]);
      setAudioTracks([]);
      setEditorHotspots([]);
      alert("Hamma data tozalandi! Endi o'zingiz yangi darslik, audio va to'lovlarni 0 dan kiritib test qilishingiz mumkin.");
    }
  };

  const handleRestoreDemoData = () => {
    setBooks(defaultBooks);
    setOrders(defaultOrders);
    setAudioTracks(defaultAudioTracks);
    alert("Namunaviy ma'lumotlar qaytarildi!");
  };

  // Filtered books
  const filteredBooks = books.filter((b) => {
    if (selectedBookFilter !== 'All' && b.type !== selectedBookFilter) return false;
    if (globalSearch && !b.title.toLowerCase().includes(globalSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#F4F7FC] text-slate-800 font-sans overflow-hidden">
      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR (Dark Navy, matches uploaded image 100%) */}
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
                  <span>Content Manager</span>
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
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeNav === 'add_book'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    Add Book
                  </button>

                  <button
                    onClick={() => setActiveNav('my_books')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                      activeNav === 'my_books'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    <span>My Books</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {books.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveNav('audio_video')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeNav === 'audio_video'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    Audio & Video
                  </button>

                  <button
                    onClick={() => setActiveNav('manage_content')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeNav === 'manage_content'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    Manage Content
                  </button>

                  <button
                    onClick={() => setActiveNav('page_editor')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeNav === 'page_editor'
                        ? 'text-blue-400 bg-blue-950/60 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                    }`}
                  >
                    Answer Mapping
                  </button>
                </div>
              )}
            </div>

            {/* Nav: Users */}
            <button
              onClick={() => setActiveNav('users')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeNav === 'users'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Users</span>
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
                <span>Subscriptions</span>
              </div>
              {orders.filter((o) => o.status === 'PENDING').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
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
              <span>Analytics</span>
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
              <span>System Logs</span>
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
              <span>Settings</span>
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
                <span>📱 Mobil Ilova (Live)</span>
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
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT AREA (Clean light background + Top Header) */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F4F7FC]">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 z-20">
          {/* Search Box */}
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search books, users, or features..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded border border-slate-300/60">
              Ctrl + K
            </span>
          </div>

          {/* Right Header Icons & Actions */}
          <div className="flex items-center space-x-4">
            {/* Clean state testing buttons (user requested) */}
            <div className="hidden lg:flex items-center space-x-2 mr-2">
              <button
                onClick={handlePurgeAllData}
                title="Barcha ma'lumotlarni tozalab, 0 dan kiritib ko'rish"
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] font-bold hover:bg-rose-100 transition-all flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                <span>Tozalash (0 dan)</span>
              </button>
              <button
                onClick={handleRestoreDemoData}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold hover:bg-slate-200 transition-all flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Demoni Qaytarish</span>
              </button>
            </div>

            {/* Notification Bell */}
            <button className="relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                3
              </span>
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm">
                👨‍💼
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none">Admin</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Super Admin</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
          {/* VIEW 1: DASHBOARD (Exact match to top-left of user image)           */}
          {/* =================================================================== */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Title & Date Range */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Overview of your SmartTeacherBook platform
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-sm text-xs font-bold text-slate-700 flex items-center space-x-2 cursor-pointer hover:bg-slate-50">
                    <span>📅 Last 30 Days</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Stat 1: Total Books */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Total Books</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{books.length * 80 + 5}</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-2">
                      ↑ +12%
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 2: Total Users */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Total Users</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">48,750</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-2">
                      ↑ +18%
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 3: Active Users */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Active Users</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">32,420</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-2">
                      ↑ +22%
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 4: Premium Subscribers */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Premium Subscribers</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">12,580</p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-2">
                      ↑ +27%
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                    <Crown className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Charts Row: Platform Analytics & Subject Popularity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Chart 1: Platform Analytics (Line chart) */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Platform Analytics</h3>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="flex items-center space-x-1 font-semibold text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          <span>Active Users</span>
                        </span>
                        <span className="flex items-center space-x-1 font-semibold text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <span>New Users</span>
                        </span>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                        <span>7 Days</span>
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* SVG Line Chart Canvas */}
                  <div className="h-60 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="90" x2="500" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="140" x2="500" y2="140" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="190" x2="500" y2="190" stroke="#E2E8F0" strokeWidth="1" />

                      {/* Line 1: Active Users (Blue curve) */}
                      <path
                        d="M 0 130 C 50 140, 100 80, 160 85 C 220 90, 270 70, 340 60 C 410 50, 460 70, 500 55"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3"
                      />
                      {/* Active Users dots */}
                      <circle cx="0" cy="130" r="4" fill="#2563EB" />
                      <circle cx="83" cy="140" r="4" fill="#2563EB" />
                      <circle cx="166" cy="85" r="4" fill="#2563EB" />
                      <circle cx="250" cy="90" r="4" fill="#2563EB" />
                      <circle cx="333" cy="70" r="4" fill="#2563EB" />
                      <circle cx="416" cy="65" r="4" fill="#2563EB" />
                      <circle cx="500" cy="55" r="4" fill="#2563EB" />

                      {/* Line 2: New Users (Purple curve) */}
                      <path
                        d="M 0 170 C 60 165, 120 155, 180 150 C 240 145, 300 135, 360 125 C 420 115, 470 120, 500 110"
                        fill="none"
                        stroke="#A855F7"
                        strokeWidth="2.5"
                      />
                      <circle cx="0" cy="170" r="3.5" fill="#A855F7" />
                      <circle cx="166" cy="155" r="3.5" fill="#A855F7" />
                      <circle cx="333" cy="135" r="3.5" fill="#A855F7" />
                      <circle cx="500" cy="110" r="3.5" fill="#A855F7" />
                    </svg>

                    {/* X-Axis Day Labels */}
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-3 pt-1">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>
                </div>

                {/* Chart 2: Subject Popularity (Donut chart) */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-900">Subject Popularity</h3>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                      <span>7 Days</span>
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-center justify-around my-2">
                    {/* Donut SVG */}
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Math (Blue 32%) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="14"
                          strokeDasharray="76.4 238.7"
                          strokeDashoffset="0"
                        />
                        {/* English (Red/Orange 28%) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="14"
                          strokeDasharray="66.8 238.7"
                          strokeDashoffset="-76.4"
                        />
                        {/* Science (Amber 20%) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="14"
                          strokeDasharray="47.7 238.7"
                          strokeDashoffset="-143.2"
                        />
                        {/* History (Emerald 12%) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="14"
                          strokeDasharray="28.6 238.7"
                          strokeDashoffset="-190.9"
                        />
                        {/* Others (Purple 8%) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="14"
                          strokeDasharray="19.1 238.7"
                          strokeDashoffset="-219.5"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-base font-black text-slate-900 leading-none">32.4K</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-1">Active Users</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="font-semibold text-slate-700 w-24">Mathematics</span>
                        <span className="font-bold text-slate-900">32%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="font-semibold text-slate-700 w-24">English</span>
                        <span className="font-bold text-slate-900">28%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-semibold text-slate-700 w-24">Science</span>
                        <span className="font-bold text-slate-900">20%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-700 w-24">History</span>
                        <span className="font-bold text-slate-900">12%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="font-semibold text-slate-700 w-24">Others</span>
                        <span className="font-bold text-slate-900">8%</span>
                      </div>
                    </div>
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
                    <h4 className="font-bold text-sm">Yangi Kitob Qo'shish</h4>
                    <p className="text-xs text-blue-100 mt-1">4-bosqichli yuklash va sahifalarni shifrlash</p>
                  </div>
                  <PlusCircle className="w-8 h-8 text-blue-200" />
                </div>

                <div
                  onClick={() => setActiveNav('page_editor')}
                  className="p-5 rounded-2xl bg-gradient-to-tr from-purple-600 to-violet-800 text-white cursor-pointer shadow-lg shadow-purple-600/20 hover:scale-[1.01] transition-transform flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm">Sahifaga Audio/Javob Biriktirish</h4>
                    <p className="text-xs text-purple-100 mt-1">Interaktiv xarita va koordinatalar nazorati</p>
                  </div>
                  <MapPin className="w-8 h-8 text-purple-200" />
                </div>

                <div
                  onClick={() => setActiveNav('subscriptions')}
                  className="p-5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white cursor-pointer shadow-lg shadow-amber-500/20 hover:scale-[1.01] transition-transform flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm">To'lovlar & Ruxsat Berish</h4>
                    <p className="text-xs text-amber-100 mt-1">O'qituvchilar buyurtmalarini 1-bosishda tasdiqlash</p>
                  </div>
                  <Crown className="w-8 h-8 text-amber-100" />
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 2: ADD BOOK (Exact match to top-right of user image)           */}
          {/* =================================================================== */}
          {activeNav === 'add_book' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Breadcrumb & Header */}
              <div>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1">
                  <span className="hover:text-slate-600 cursor-pointer">Content Manager</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-blue-600 font-bold">Add Book</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add New Book</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Upload and configure a new textbook for teachers
                </p>
              </div>

              {/* 4-Step Stepper Header */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                {[
                  { num: 1, label: 'Book Info' },
                  { num: 2, label: 'Upload Files' },
                  { num: 3, label: 'Content Setup' },
                  { num: 4, label: 'Review & Publish' },
                ].map((step, idx) => (
                  <React.Fragment key={step.num}>
                    <div
                      className="flex items-center space-x-2.5 cursor-pointer"
                      onClick={() => setWizardStep(step.num)}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          wizardStep === step.num
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-100'
                            : wizardStep > step.num
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {wizardStep > step.num ? '✓' : step.num}
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          wizardStep === step.num
                            ? 'text-blue-600'
                            : wizardStep > step.num
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < 3 && <div className="flex-1 h-0.5 bg-slate-100 mx-4" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Form & 3D Book Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Form (7 cols) */}
                <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
                  {/* Grade Dropdown */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newBookGrade}
                      onChange={(e) => setNewBookGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="1-sinf">1-sinf</option>
                      <option value="2-sinf">2-sinf</option>
                      <option value="3-sinf">3-sinf</option>
                      <option value="4-sinf">4-sinf</option>
                      <option value="5-sinf">5-sinf</option>
                      <option value="6-sinf">6-sinf</option>
                      <option value="7-sinf">7-sinf</option>
                      <option value="8-sinf">8-sinf</option>
                      <option value="9-sinf">9-sinf</option>
                      <option value="10-sinf">10-sinf</option>
                      <option value="11-sinf">11-sinf</option>
                    </select>
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newBookSubject}
                      onChange={(e) => setNewBookSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="English">English (Ingliz tili)</option>
                      <option value="Mathematics">Mathematics (Matematika)</option>
                      <option value="Science">Science (Tabiiy fanlar)</option>
                      <option value="Physics">Physics (Fizika)</option>
                      <option value="Chemistry">Chemistry (Kimyo)</option>
                      <option value="Biology">Biology (Biologiya)</option>
                    </select>
                  </div>

                  {/* Book Type Pills */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">
                      Book Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      {(["Student's Book", "Teacher's Book", 'Workbook'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewBookType(type)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            newBookType === type
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      placeholder="e.g. English for 7th Grade"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={newBookDesc}
                      onChange={(e) => setNewBookDesc(e.target.value)}
                      placeholder="Kitob haqida qisqacha ma'lumot..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Page Count */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Umumiy Sahifalar Soni
                    </label>
                    <input
                      type="number"
                      value={newBookPages}
                      onChange={(e) => setNewBookPages(e.target.value)}
                      placeholder="180"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveNav('my_books')}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewBook}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-1.5"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right 3D Book Cover Preview (5 cols, exact match to screenshot) */}
                <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center min-h-[460px] text-center relative overflow-hidden">
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      3D Cover Preview
                    </span>
                  </div>

                  {/* 3D Tilted Textbook Mockup */}
                  <div className="relative my-6 transform hover:rotate-y-6 transition-transform duration-300">
                    <div className="w-56 h-72 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-5 text-white shadow-2xl border-l-[6px] border-blue-400 relative flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono tracking-widest uppercase opacity-75">
                            {newBookGrade}
                          </span>
                          <span className="text-xl">🇬🇧</span>
                        </div>
                        <h3 className="text-2xl font-black mt-3 leading-tight tracking-tight">
                          {newBookSubject}
                        </h3>
                        <p className="text-3xl font-black text-amber-400 mt-1">
                          {newBookGrade.replace('-sinf', '')}
                        </p>
                      </div>

                      {/* Flag Ribbon */}
                      <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                        <p className="text-[11px] font-extrabold truncate">{newBookType}</p>
                        <p className="text-[9px] opacity-75">{newBookPages} Sahifa • Audio Units</p>
                      </div>
                    </div>

                    {/* Floating Upload Cloud Overlay */}
                    <div className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-blue-600 cursor-pointer hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-700">Muqova rasmini yangilash</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG yoki WebP (Tavsiya: 1200x1600)</p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 3: MY BOOKS (Exact match to middle-left of user image)         */}
          {/* =================================================================== */}
          {activeNav === 'my_books' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Books</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Manage your uploaded books and materials
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search books..."
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button
                    onClick={() => setActiveNav('add_book')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Book</span>
                  </button>
                  <button
                    onClick={() => setSelectedBookFilter('All')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View All →
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                {[
                  { id: 'All', label: `All (${books.length})` },
                  { id: "Student's Book", label: "Student's Book (5)" },
                  { id: "Teacher's Book", label: "Teacher's Book (4)" },
                  { id: 'Workbook', label: 'Workbook (3)' },
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

              {/* Books Table / List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredBooks.map((book) => (
                    <div
                      key={book.id}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Left Book Info */}
                      <div className="flex items-center space-x-4 min-w-0">
                        {/* Book Icon Cover */}
                        <div
                          className={`w-12 h-14 rounded-xl bg-gradient-to-br ${book.coverColor} text-white flex flex-col items-center justify-center shrink-0 shadow-md`}
                        >
                          <span className="text-base">{book.iconEmoji}</span>
                          <span className="text-[9px] font-black">{book.grade}</span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">{book.title}</h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Grade {book.grade} • {book.subject} • {book.version}
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
                          <span>{book.pages} pages</span>
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
                          onClick={() => setActiveNav('page_editor')}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all"
                        >
                          Page Editor
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredBooks.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-bold">Hech qanday kitob topilmadi</p>
                      <button
                        onClick={() => setActiveNav('add_book')}
                        className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                      >
                        + Yangi Kitob Qo'shish
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 4: AUDIO & VIDEO (Exact match to middle-right of user image)    */}
          {/* =================================================================== */}
          {activeNav === 'audio_video' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Audio & Video</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Manage audio and video materials for interactive pages
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
                      Audio (48)
                    </button>
                    <button
                      onClick={() => setActiveMediaTab('VIDEO')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeMediaTab === 'VIDEO' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Video (36)
                    </button>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5">
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Left Playlist, Right Video Player */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Audio Playlist (7 cols) */}
                <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <h3 className="text-sm font-extrabold text-slate-900 mb-4">
                    {activeMediaTab === 'AUDIO' ? 'Classroom Audio Tracks' : 'Lesson Video Clips'}
                  </h3>

                  <div className="space-y-2">
                    {audioTracks.map((track) => {
                      const isPlaying = playingAudioId === track.id;
                      return (
                        <div
                          key={track.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                            isPlaying
                              ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5">
                            {/* Play Button */}
                            <button
                              onClick={() => setPlayingAudioId(isPlaying ? null : track.id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                isPlaying
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>

                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900">{track.title}</h4>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{track.meta}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span className="text-xs font-mono font-bold text-slate-500">{track.duration}</span>

                            {/* Active Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={track.active}
                                onChange={() => {
                                  setAudioTracks(
                                    audioTracks.map((t) => (t.id === track.id ? { ...t, active: !t.active } : t))
                                  );
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Video Player Mockup (5 cols, exact match to screenshot) */}
                <div className="lg:col-span-5 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                  <div className="relative aspect-video bg-black flex items-center justify-center group">
                    {/* Simulated Teacher Video Image */}
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80"
                      alt="Teacher Lesson"
                      className="w-full h-full object-cover opacity-85"
                    />

                    {/* Central Play/Pause Overlay */}
                    <button
                      onClick={() => setVideoPlaying(!videoPlaying)}
                      className="absolute w-14 h-14 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm hover:scale-110 transition-transform"
                    >
                      {videoPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                    </button>

                    {/* Video Duration Badge */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono font-bold">
                      HD • 1080p
                    </div>
                  </div>

                  {/* Player Bottom Control Bar */}
                  <div className="p-4 bg-slate-950 text-white space-y-2">
                    {/* Scrubber Track */}
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-1/3 h-full bg-blue-500 rounded-full" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        <button className="hover:text-white">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-[11px]">0:00 / 5:24</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-4 h-4 hover:text-white cursor-pointer" />
                        <Maximize2 className="w-4 h-4 hover:text-white cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 5: MANAGE CONTENT (Exact match to bottom-left of user image)   */}
          {/* =================================================================== */}
          {activeNav === 'manage_content' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Content</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Process and manage textbook content and automated hotspot extraction
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20">
                    Processing Tasks (2)
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600">
                    Completed (28)
                  </span>
                </div>
              </div>

              {/* Task Cards List */}
              <div className="space-y-4">
                {/* Task 1: 75% Processing */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-5">
                    {/* Circular 75% badge */}
                    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blue-600"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeDasharray="75, 100"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-black text-blue-600">75%</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Processing English 7 - Student's Book
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Converting PDF pages and extracting hotspots...
                      </p>
                      {/* Linear progress bar */}
                      <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                        <div className="w-3/4 h-full bg-blue-600 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-bold text-slate-400">ETA: 2 min</span>
                    <button
                      onClick={() => setActiveNav('page_editor')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      View
                    </button>
                  </div>
                </div>

                {/* Task 2: Completed */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-5">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-7 h-7 stroke-[3]" />
                    </div>

                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Processing Mathematics 8</h4>
                      <p className="text-xs text-emerald-600 font-bold mt-0.5">
                        Completed successfully • 312 pages
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-medium text-slate-400">2 min ago</span>
                    <button
                      onClick={() => setActiveNav('my_books')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 6: VISUAL PDF EDITOR & HOTSPOT MANAGER (Phase 1)              */}
          {/* =================================================================== */}
          {activeNav === 'page_editor' && (
            <div className="h-full w-full">
              <VisualPdfEditor
                initialBookId={books[0]?.id || 'book_grade11_english_sb'}
                onOpenMobilePreview={() => setActiveNav('mobile_sim')}
              />
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 7: SUBSCRIPTIONS & PAYMENTS (Crucial user requirement)         */}
          {/* =================================================================== */}
          {activeNav === 'subscriptions' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Subscriptions & To'lovlar
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    O'qituvchilarning darsliklarga obuna so'rovlarini qabul qilish va 1-bosishda ruxsat berish
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Kutilayotgan so'rovlar: {orders.filter((o) => o.status === 'PENDING').length} ta</span>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">
                          {order.grade}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-extrabold text-slate-900">{order.teacherName}</h4>
                            <span className="text-xs font-mono text-slate-400">({order.phoneNumber})</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {order.grade}-sinf • {order.subject} • {order.plan} ({order.priceUzs} so'm)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-slate-400">{order.createdAt}</span>

                        {order.status === 'APPROVED' ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Ruxsat Berilgan</span>
                          </span>
                        ) : order.status === 'REJECTED' ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold">
                            Bekor qilingan
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleApproveOrder(order.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Ruxsat Berish</span>
                            </button>
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition-all"
                            >
                              Rad etish
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {orders.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                      <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-bold">Hozircha obuna so'rovlari mavjud emas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 8: ANALYTICS (Exact match to bottom-right of user image)       */}
          {/* =================================================================== */}
          {activeNav === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Analytics</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Detailed statistics, subscription revenue, and textbook popularity
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center space-x-2">
                    <span>📅 This Month</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Tabs: Overview, Users, Content, Revenue */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                {['Overview', 'Users', 'Content', 'Revenue'].map((tab, idx) => (
                  <button
                    key={tab}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      idx === 0
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Revenue & Top Books Grid (Exact match to user screenshot) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Revenue Card (7 cols) */}
                <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                    <div className="flex items-baseline space-x-3 mt-1">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        8,420,000 so'm
                      </h3>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        ↑ +32%
                      </span>
                    </div>
                  </div>

                  {/* Smooth Area Curve for Revenue */}
                  <div className="h-44 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 100 C 60 90, 120 70, 180 65 C 240 60, 300 40, 350 30 L 400 20 L 400 120 L 0 120 Z"
                        fill="url(#revenueGrad)"
                      />
                      <path
                        d="M 0 100 C 60 90, 120 70, 180 65 C 240 60, 300 40, 350 30 L 400 20"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="3.5"
                      />
                      <circle cx="400" cy="20" r="4" fill="#2563EB" />
                    </svg>
                  </div>
                </div>

                {/* Top Books Card (5 cols, exact match to screenshot) */}
                <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <h4 className="text-sm font-extrabold text-slate-900">Top Books</h4>

                  <div className="space-y-3">
                    {[
                      { rank: 1, title: 'English 7', downloads: '3,240 downloads', icon: '🇬🇧' },
                      { rank: 2, title: 'Mathematics 8', downloads: '2,980 downloads', icon: '📐' },
                      { rank: 3, title: 'Science 9', downloads: '2,120 downloads', icon: '🧬' },
                    ].map((item) => (
                      <div
                        key={item.rank}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-black text-slate-400 w-3">{item.rank}.</span>
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{item.downloads}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 9: USERS (Teachers list)                                       */}
          {/* =================================================================== */}
          {activeNav === 'users' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">O'qituvchilar (Users)</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Tizimga ulangan barcha pedagoglar va ularning qurilmalari (Android Keystore limit 2)
                  </p>
                </div>
                <div className="text-xs font-bold text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200">
                  Jami: 48,750 o'qituvchi
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                {[
                  {
                    name: 'Nodira Karimova',
                    email: 'nodira.karimova@gmail.com',
                    phone: '+998 90 123 45 67',
                    devices: '1 / 2 qurilma',
                    status: 'Faol Obuna (25 kun)',
                  },
                  {
                    name: 'Alisher Qosimov',
                    email: 'alisher.qosimov@gmail.com',
                    phone: '+998 93 987 65 43',
                    devices: '2 / 2 qurilma',
                    status: 'Kutilmoqda',
                  },
                  {
                    name: 'Malika Ergasheva',
                    email: 'malika.ergasheva@gmail.com',
                    phone: '+998 97 555 12 34',
                    devices: '1 / 2 qurilma',
                    status: 'Yillik Obuna',
                  },
                ].map((user, idx) => (
                  <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        👩‍🏫
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{user.name}</h4>
                        <p className="text-[11px] text-slate-400">{user.email} • {user.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 text-xs font-semibold">
                      <span className="text-slate-500">📱 {user.devices}</span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 10: SYSTEM LOGS & SETTINGS                                     */}
          {/* =================================================================== */}
          {(activeNav === 'system_logs' || activeNav === 'settings') && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeNav === 'system_logs' ? 'System Audit Logs' : 'Platform Settings'}
              </h2>
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-emerald-600 font-bold">[AUTH]</span> OTP Code delivered to mlrahmonjon@gmail.com via Google SMTP
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-blue-600 font-bold">[SECURITY]</span> Android Keystore hardware AES-256-GCM envelope key active
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-purple-600 font-bold">[CLOCK]</span> Monotonic anchor synchronized (Tamper protection 100%)
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
                    Admin panelda kiritilgan har bir o'zgarish shu zahoti ushbu simulyatorda aks etadi
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
                  {/* Speaker Notch */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" />
                  </div>

                  {/* Android Screen (iframe pointing to Metro on 8081) */}
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
