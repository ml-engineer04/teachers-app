import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  FolderPlus,
  BookOpen,
  Headphones,
  Video,
  Lightbulb,
  CheckCircle,
  Clock,
  Smartphone,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export function SimpleAdminStudio() {
  const [activeSubTab, setActiveSubTab] = useState<'PAYMENTS' | 'GRADES' | 'BOOKS' | 'PAGE_CONTENT' | 'MOBILE'>(
    'PAYMENTS'
  );

  // ==========================================
  // STATE: Orders / Payments
  // ==========================================
  const [orders, setOrders] = useState([
    {
      id: 'REQ-101',
      teacherName: 'Nodira Karimova',
      phoneNumber: '+998 90 123 45 67',
      grade: 11,
      subject: 'Ingliz tili',
      plan: '1 Oylik (30 kun)',
      priceUzs: '119,000',
      status: 'APPROVED',
      createdAt: '2026-11-08 14:30',
    },
    {
      id: 'REQ-102',
      teacherName: 'Alisher Qosimov',
      phoneNumber: '+998 93 987 65 43',
      grade: 10,
      subject: 'Matematika',
      plan: '3 Oylik (90 kun)',
      priceUzs: '249,000',
      status: 'PENDING',
      createdAt: '2026-11-08 15:10',
    },
  ]);

  // Form: New Order
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newOrderGrade, setNewOrderGrade] = useState(11);
  const [newOrderSubject, setNewOrderSubject] = useState('Ingliz tili');
  const [newOrderPlan, setNewOrderPlan] = useState('1 Oylik (30 kun)');
  const [newOrderPrice, setNewOrderPrice] = useState('119,000');

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newPhoneNumber) return;
    const newReq = {
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      teacherName: newTeacherName,
      phoneNumber: newPhoneNumber,
      grade: newOrderGrade,
      subject: newOrderSubject,
      plan: newOrderPlan,
      priceUzs: newOrderPrice,
      status: 'PENDING',
      createdAt: new Date().toLocaleString(),
    };
    setOrders([newReq, ...orders]);
    setNewTeacherName('');
    setNewPhoneNumber('');
    alert("Yangi so‘rov qabul qilindi! Endi 'Ruxsat Berish' tugmasi bilan darslikni faollashtiring.");
  };

  const handleApproveOrder = (id: string) => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o))
    );
    alert("O‘qituvchiga ruxsat berildi! Darslik o‘qituvchi telefonida shu zahoti faollashdi.");
  };

  // ==========================================
  // STATE: Grades & Subjects
  // ==========================================
  const [gradesList, setGradesList] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const [subjectsList, setSubjectsList] = useState([
    { id: 'sub_1', name: 'Ingliz tili', code: 'ENG', icon: '🇬🇧' },
    { id: 'sub_2', name: 'Matematika', code: 'MATH', icon: '📐' },
    { id: 'sub_3', name: 'Fizika', code: 'PHYS', icon: '⚛️' },
    { id: 'sub_4', name: 'Kimyo', code: 'CHEM', icon: '🧪' },
    { id: 'sub_5', name: 'Biologiya', code: 'BIO', icon: '🧬' },
  ]);

  const [inputGradeNumber, setInputGradeNumber] = useState('');
  const [inputSubjectName, setInputSubjectName] = useState('');
  const [inputSubjectIcon, setInputSubjectIcon] = useState('📚');

  const handleAddGrade = () => {
    const g = parseInt(inputGradeNumber, 10);
    if (!g || g < 1 || g > 11) {
      alert("Iltimos, 1 dan 11 gacha bo‘lgan sinf raqamini kiriting.");
      return;
    }
    if (!gradesList.includes(g)) {
      setGradesList([...gradesList, g].sort((a, b) => a - b));
      setInputGradeNumber('');
      alert(`${g}-sinf muvaffaqiyatli qo‘shildi!`);
    } else {
      alert(`${g}-sinf allaqachon mavjud.`);
    }
  };

  const handleAddSubject = () => {
    if (!inputSubjectName) return;
    const newSub = {
      id: `sub_${Date.now()}`,
      name: inputSubjectName,
      code: inputSubjectName.substring(0, 4).toUpperCase(),
      icon: inputSubjectIcon || '📚',
    };
    setSubjectsList([...subjectsList, newSub]);
    setInputSubjectName('');
    alert(`"${inputSubjectName}" fani qo‘shildi!`);
  };

  // ==========================================
  // STATE: Books & Textbooks
  // ==========================================
  const [booksList, setBooksList] = useState([
    {
      id: 'bk_1',
      grade: 11,
      subject: 'Ingliz tili',
      type: "Student's Book (Darslik)",
      pages: 142,
      audioCount: 24,
      videoCount: 12,
    },
    {
      id: 'bk_2',
      grade: 11,
      subject: 'Ingliz tili',
      type: "Teacher's Book (Javoblar kaliti)",
      pages: 180,
      audioCount: 0,
      videoCount: 0,
    },
    {
      id: 'bk_3',
      grade: 11,
      subject: 'Ingliz tili',
      type: 'Workbook (Mashq daftari)',
      pages: 110,
      audioCount: 12,
      videoCount: 0,
    },
  ]);

  const [newBookGrade, setNewBookGrade] = useState(11);
  const [newBookSubject, setNewBookSubject] = useState('Ingliz tili');
  const [newBookType, setNewBookType] = useState("Student's Book (Darslik)");
  const [newBookPages, setNewBookPages] = useState('142');

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    const pages = parseInt(newBookPages, 10) || 100;
    const newBk = {
      id: `bk_${Date.now()}`,
      grade: newBookGrade,
      subject: newBookSubject,
      type: newBookType,
      pages,
      audioCount: 0,
      videoCount: 0,
    };
    setBooksList([...booksList, newBk]);
    alert(`${newBookGrade}-sinf uchun ${newBookType} yaratildi!`);
  };

  // ==========================================
  // STATE: Attach Audio, Video, Answers to EXACT Page
  // ==========================================
  const [pageAttachments, setPageAttachments] = useState([
    {
      id: 'att_1',
      grade: 11,
      bookType: "Student's Book",
      pageNumber: 2,
      contentType: 'AUDIO',
      title: 'Unit 1: Track 1 — Listening & Vocabulary',
      fileOrUrl: 'audio/grade11_unit1_track1.mp3',
      details: 'Davomiyligi: 2 daqiqa 30 soniya',
    },
    {
      id: 'att_2',
      grade: 11,
      bookType: "Student's Book",
      pageNumber: 2,
      contentType: 'ANSWER_KEY',
      title: 'Task 2.1 Mashq Javoblari',
      fileOrUrl: "Teacher's Book 14-sahifasi",
      details: '1. True  2. False  3. Not Given  4. Practice promotes confidence.',
    },
    {
      id: 'att_3',
      grade: 11,
      bookType: "Student's Book",
      pageNumber: 4,
      contentType: 'VIDEO',
      title: 'Conditionals Type 3 Video Dars',
      fileOrUrl: 'video/unit2_grammar_conditionals.mp4',
      details: '720p HD Video darslik',
    },
  ]);

  const [attGrade, setAttGrade] = useState(11);
  const [attBookType, setAttBookType] = useState("Student's Book");
  const [attPageNumber, setAttPageNumber] = useState('2');
  const [attType, setAttType] = useState<'AUDIO' | 'VIDEO' | 'ANSWER_KEY'>('AUDIO');
  const [attTitle, setAttTitle] = useState('');
  const [attFileOrUrl, setAttFileOrUrl] = useState('');
  const [attDetails, setAttDetails] = useState('');

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attTitle) {
      alert("Iltimos, sarlavha yoki mashq nomini kiriting.");
      return;
    }
    const pageNum = parseInt(attPageNumber, 10) || 1;
    const newAtt = {
      id: `att_${Date.now()}`,
      grade: attGrade,
      bookType: attBookType,
      pageNumber: pageNum,
      contentType: attType,
      title: attTitle,
      fileOrUrl: attFileOrUrl || (attType === 'AUDIO' ? 'audio_track.mp3' : attType === 'VIDEO' ? 'video.mp4' : 'TB javoblar'),
      details: attDetails || (attType === 'ANSWER_KEY' ? 'To‘g‘ri javoblar va metodik tushuntirish' : 'Media fayl'),
    };
    setPageAttachments([newAtt, ...pageAttachments]);
    setAttTitle('');
    setAttFileOrUrl('');
    setAttDetails('');
    alert(`${attGrade}-sinf darsligining ${pageNum}-sahifasiga ${attType} muvaffaqiyatli biriktirildi!`);
  };

  // ==========================================
  // PURGE ALL DATA (Toza holat)
  // ==========================================
  const handlePurgeAllData = () => {
    if (confirm("Diqqat! Hamma test ma'lumotlarni o‘chirib, tizimni toza holatga keltirmoqchimisiz? O‘zingiz yangidan ma'lumot kiritishingiz mumkin.")) {
      setOrders([]);
      setBooksList([]);
      setPageAttachments([]);
      alert("Hamma test ma'lumotlar o‘chirildi! Tizim toza holatda.");
    }
  };

  const handleResetDemoData = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Clean / Purge Data Button */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Oson & Tushunarli Boshqaruv
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mt-1">
            SmartTeacherBook Darslik & To‘lov Boshqaruvi
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            O‘qituvchilar to‘lovlarini qabul qiling, sinflar qo‘shing va darslikning aynan xohlagan sahifasiga audio, video yoki javoblarni biriktiring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePurgeAllData}
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all flex items-center space-x-1.5"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Hamma Datani O‘chirish (Toza Holat)</span>
          </button>

          <button
            onClick={handleResetDemoData}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Demoni Qaytarish</span>
          </button>
        </div>
      </div>

      {/* Modern Horizontal Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveSubTab('PAYMENTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
            activeSubTab === 'PAYMENTS'
              ? 'bg-school-blue-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>1. To‘lovlar & Obunalar ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('GRADES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
            activeSubTab === 'GRADES'
              ? 'bg-school-blue-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>2. Sinflar & Fanlar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('BOOKS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
            activeSubTab === 'BOOKS'
              ? 'bg-school-blue-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>3. Darsliklar ({booksList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PAGE_CONTENT')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
            activeSubTab === 'PAGE_CONTENT'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>4. Sahifaga Audio/Video/Javob Biriktirish ({pageAttachments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('MOBILE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 ${
            activeSubTab === 'MOBILE'
              ? 'bg-purple-700 text-white shadow-md'
              : 'text-purple-800 hover:bg-purple-50'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>📱 Mobil Ilova Ko‘rinishi</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PAYMENTS & ORDERS */}
      {/* ========================================================================= */}
      {activeSubTab === 'PAYMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Left Form: Add New Payment / Request */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Yangi O‘qituvchi To‘lovini Kiritish</span>
            </h3>

            <form onSubmit={handleAddOrder} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">O‘qituvchi Ismi & Familiyasi</label>
                <input
                  type="text"
                  placeholder="Masalan: Nodira Karimova"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Telefon Raqami</label>
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Sinf</label>
                  <select
                    value={newOrderGrade}
                    onChange={(e) => setNewOrderGrade(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                  >
                    {gradesList.map((g) => (
                      <option key={g} value={g}>{g}-sinf</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Fan</label>
                  <select
                    value={newOrderSubject}
                    onChange={(e) => setNewOrderSubject(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                  >
                    {subjectsList.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Obuna Rejasi</label>
                <select
                  value={newOrderPlan}
                  onChange={(e) => {
                    setNewOrderPlan(e.target.value);
                    if (e.target.value.includes('1 Oylik')) setNewOrderPrice('119,000');
                    else if (e.target.value.includes('3 Oylik')) setNewOrderPrice('249,000');
                    else setNewOrderPrice('799,000');
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="1 Oylik (30 kun)">1 Oylik (30 kun)</option>
                  <option value="3 Oylik (90 kun)">3 Oylik (90 kun) — Tejamkor</option>
                  <option value="1 Yillik (365 kun)">1 Yillik (365 kun)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">To‘lov Summasi (UZS)</label>
                <input
                  type="text"
                  value={newOrderPrice}
                  onChange={(e) => setNewOrderPrice(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-black text-emerald-700 bg-emerald-50/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-school-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>To‘lov So‘rovini Qo‘shish</span>
              </button>
            </form>
          </div>

          {/* Right Table: Orders List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">
                O‘qituvchilar Arizalari & To‘lovlar ({orders.length})
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                "Ruxsat berish" bosilganda darslik telefonda ochiladi
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-xs font-bold">Hozircha hech qanday so‘rov yo‘q.</p>
                <p className="text-slate-400 text-[11px] mt-1">Chapdagi forma orqali yangi to‘lov kiriting yoki mobil ilovadan so‘rov qoldiring.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                      <th className="p-3">O‘qituvchi</th>
                      <th className="p-3">Sinf & Fan</th>
                      <th className="p-3">Tarif & Summa</th>
                      <th className="p-3">Holat</th>
                      <th className="p-3 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">{order.teacherName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{order.phoneNumber}</p>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
                            {order.grade}-sinf
                          </span>
                          <p className="text-[11px] text-slate-600 mt-0.5">{order.subject}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{order.plan}</p>
                          <p className="text-[11px] font-black text-emerald-700">{order.priceUzs} UZS</p>
                        </td>
                        <td className="p-3">
                          {order.status === 'APPROVED' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>FAOL (OCHILGAN)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>KUTILMOQDA</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {order.status === 'PENDING' ? (
                            <button
                              onClick={() => handleApproveOrder(order.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                            >
                              Ruxsat Berish ✓
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium text-xs">Tasdiqlangan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: GRADES & SUBJECTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'GRADES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Grades Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <span>Sinflar (1–11 Sinflar)</span>
              </h3>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {gradesList.length} ta sinf
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="11"
                placeholder="Sinf raqami (masalan 12)"
                value={inputGradeNumber}
                onChange={(e) => setInputGradeNumber(e.target.value)}
                className="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
              />
              <button
                onClick={handleAddGrade}
                className="px-4 py-2.5 bg-school-blue-900 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-all"
              >
                + Sinf Qo‘shish
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
              {gradesList.map((g) => (
                <div
                  key={g}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center hover:border-blue-400 transition-colors"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sinf</p>
                  <p className="text-lg font-black text-slate-800">{g}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Subjects Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Fanlar</span>
              </h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {subjectsList.length} ta fan
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Fan nomi (masalan: Tarix)"
                value={inputSubjectName}
                onChange={(e) => setInputSubjectName(e.target.value)}
                className="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
              />
              <input
                type="text"
                placeholder="Emoji (🏛️)"
                value={inputSubjectIcon}
                onChange={(e) => setInputSubjectIcon(e.target.value)}
                className="w-16 p-2.5 border border-slate-200 rounded-xl text-xs text-center font-medium"
              />
              <button
                onClick={handleAddSubject}
                className="px-4 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-all"
              >
                + Fan Qo‘shish
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {subjectsList.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-white transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{sub.icon}</span>
                    <div>
                      <p className="text-xs font-black text-slate-800">{sub.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Kodi: {sub.code}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSubjectsList(subjectsList.filter((s) => s.id !== sub.id))}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="O‘chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: BOOKS & TEXTBOOKS */}
      {/* ========================================================================= */}
      {activeSubTab === 'BOOKS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Left Form: Add New Book */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Yangi Darslik Qo‘shish</span>
            </h3>

            <form onSubmit={handleAddBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Sinf</label>
                <select
                  value={newBookGrade}
                  onChange={(e) => setNewBookGrade(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                >
                  {gradesList.map((g) => (
                    <option key={g} value={g}>{g}-sinf</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Fan</label>
                <select
                  value={newBookSubject}
                  onChange={(e) => setNewBookSubject(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                >
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Kitob Turi</label>
                <select
                  value={newBookType}
                  onChange={(e) => setNewBookType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="Student's Book (Darslik)">Student's Book (O‘quvchi Darsligi)</option>
                  <option value="Teacher's Book (Javoblar kaliti)">Teacher's Book (O‘qituvchi Kitobi / Javoblar)</option>
                  <option value="Workbook (Mashq daftari)">Workbook (Mashq Daftari)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Sahifalar Soni</label>
                <input
                  type="number"
                  value={newBookPages}
                  onChange={(e) => setNewBookPages(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-school-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Darslikni Saqlash</span>
              </button>
            </form>
          </div>

          {/* Right Cards: Books List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-800">
              Mavjud Darsliklar ({booksList.length})
            </h3>

            {booksList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-xs font-bold">Hozircha darsliklar yo‘q.</p>
                <p className="text-slate-400 text-[11px] mt-1">Chapdagi forma orqali birinchi darslikni qo‘shing.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {booksList.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800 font-black text-xs">
                          {bk.grade}
                        </span>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">{bk.type}</h4>
                          <p className="text-[11px] text-slate-500">{bk.subject} • {bk.grade}-sinf</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setBooksList(booksList.filter((b) => b.id !== bk.id))}
                        className="text-slate-400 hover:text-rose-600"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                      <span>📄 {bk.pages} bet</span>
                      <span>🎧 {bk.audioCount} audio</span>
                      <span>🎬 {bk.videoCount} video</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: ATTACH AUDIO / VIDEO / ANSWERS TO EXACT PAGE */}
      {/* ========================================================================= */}
      {activeSubTab === 'PAGE_CONTENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Form: Add Media or Answer Key */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Sahifaga Media & Javob Biriktirish</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Aynan siz belgilagan sahifada tugma (hotspot) paydo bo‘ladi
              </p>
            </div>

            <form onSubmit={handleAddAttachment} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Sinf</label>
                  <select
                    value={attGrade}
                    onChange={(e) => setAttGrade(parseInt(e.target.value, 10))}
                    className="w-full p-2 border border-slate-200 rounded-xl font-medium"
                  >
                    {gradesList.map((g) => (
                      <option key={g} value={g}>{g}-sinf</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-600 mb-1">Darslik</label>
                  <select
                    value={attBookType}
                    onChange={(e) => setAttBookType(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="Student's Book">Student's Book</option>
                    <option value="Teacher's Book">Teacher's Book</option>
                    <option value="Workbook">Workbook</option>
                  </select>
                </div>
              </div>

              {/* Exact Page Number */}
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  🎯 QAYSI SAHIFAGA? (Sahifa Raqami)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={attPageNumber}
                  onChange={(e) => setAttPageNumber(e.target.value)}
                  required
                  placeholder="Masalan: 2"
                  className="w-full p-2.5 border-2 border-amber-300 bg-amber-50/50 rounded-xl font-black text-slate-800 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Choose Content Type */}
              <div>
                <label className="block font-bold text-slate-600 mb-1">Biriktirish Turi</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAttType('AUDIO')}
                    className={`py-2 px-1 rounded-xl font-extrabold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all ${
                      attType === 'AUDIO'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    <span>🎧 Audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttType('VIDEO')}
                    className={`py-2 px-1 rounded-xl font-extrabold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all ${
                      attType === 'VIDEO'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>🎬 Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttType('ANSWER_KEY')}
                    className={`py-2 px-1 rounded-xl font-extrabold text-[11px] flex flex-col items-center justify-center space-y-1 transition-all ${
                      attType === 'ANSWER_KEY'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>💡 Javoblar</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  {attType === 'AUDIO' && 'Audio Nomi (Track Title)'}
                  {attType === 'VIDEO' && 'Video Dars Nomi (Lesson Title)'}
                  {attType === 'ANSWER_KEY' && 'Mashq Nomi (Ex. Task 2.1)'}
                </label>
                <input
                  type="text"
                  placeholder={
                    attType === 'AUDIO'
                      ? 'Masalan: Unit 1 Track 1 Listening'
                      : attType === 'VIDEO'
                      ? 'Masalan: Conditionals Grammar Video'
                      : 'Masalan: Task 2.1 Vocabulary Answers'
                  }
                  value={attTitle}
                  onChange={(e) => setAttTitle(e.target.value)}
                  required
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  {attType === 'ANSWER_KEY' ? "Teacher's Book Dagi Sahifa" : 'Fayl Nomi yoki Havola (URL)'}
                </label>
                <input
                  type="text"
                  placeholder={
                    attType === 'AUDIO'
                      ? 'audio/unit1_track1.mp3 yoki https://...'
                      : attType === 'VIDEO'
                      ? 'video/unit1_lesson.mp4 yoki https://...'
                      : "Teacher's Book 14-sahifasi"
                  }
                  value={attFileOrUrl}
                  onChange={(e) => setAttFileOrUrl(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  {attType === 'ANSWER_KEY' ? "Mashqning To'liq Javoblari & Metodik Izoh" : "Qo'shimcha Ma'lumot"}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    attType === 'ANSWER_KEY'
                      ? '1. True  2. False  3. Not Given\nIzoh: O‘quvchilar passiv zamonda xato qilishlari mumkin.'
                      : 'Davomiyligi, mavzu tafsilotlari...'
                  }
                  value={attDetails}
                  onChange={(e) => setAttDetails(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Sahifaga Saqlash va Biriktirish</span>
              </button>
            </form>
          </div>

          {/* Right Table: Page Content List */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">
                Sahifalarga Biriktirilgan Kontentlar ({pageAttachments.length})
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Kitobxon (Reader)da ushbu bet ochilganda chiqadi
              </span>
            </div>

            {pageAttachments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-xs font-bold">Hozircha birorta sahifaga media biriktirilmagan.</p>
                <p className="text-slate-400 text-[11px] mt-1">Chapdagi formadan sahifa raqamini tanlab, birinchi audio yoki javobni biriktiring.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pageAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between hover:bg-white hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          att.contentType === 'AUDIO'
                            ? 'bg-blue-100 text-blue-800'
                            : att.contentType === 'VIDEO'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {att.contentType === 'AUDIO' && <Headphones className="w-5 h-5" />}
                        {att.contentType === 'VIDEO' && <Video className="w-5 h-5" />}
                        {att.contentType === 'ANSWER_KEY' && <Lightbulb className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300">
                            SAHIFA {att.pageNumber}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {att.grade}-sinf • {att.bookType}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900">{att.title}</h4>
                        <p className="text-[11px] text-slate-600 font-mono">{att.fileOrUrl}</p>
                        {att.details && (
                          <p className="text-[11px] text-slate-500 italic bg-white/80 p-1.5 rounded-lg border border-slate-100">
                            {att.details}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setPageAttachments(pageAttachments.filter((a) => a.id !== att.id))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: LIVE MOBILE APP PREVIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'MOBILE' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Jonli Mobil Ilova Sinovi (Android Simulyatori)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Admin panelda kiritgan har bir ma'lumot shu zahoti ushbu simulyatorda aks etadi
              </p>
            </div>
            <a
              href="http://localhost:8081"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs hover:bg-purple-200 transition-all flex items-center space-x-1"
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
    </div>
  );
}
