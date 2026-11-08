import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  RefreshCw,
  Search,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/apiClient';

export function AnswerMappingTab() {
  const [gradeId, setGradeId] = useState<number>(11);
  const [subjectId, setSubjectId] = useState<string>('sub_eng_11');
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New row form state
  const [exerciseLabel, setExerciseLabel] = useState('');
  const [studentPageNumber, setStudentPageNumber] = useState<number>(2);
  const [teacherPageNumber, setTeacherPageNumber] = useState<number>(14);
  const [teacherExerciseLabel, setTeacherExerciseLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState(
    'exerciseLabel,studentPageNumber,teacherPageNumber,teacherExerciseLabel,notes\n"Ex. 5 Reading",8,20,"Unit 1 Reading answers","Full text translations"\n"Ex. 6 Vocab",9,21,"Vocabulary keys","Word definitions"',
  );

  const loadMappings = async () => {
    setLoading(true);
    try {
      const data = await api.getAnswerMappings(gradeId, subjectId);
      setMappings(data);
    } catch (err) {
      console.error('Error fetching mappings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, [gradeId, subjectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseLabel) {
      alert('Mashq nomini kiriting (masalan: "Ex. 3")');
      return;
    }

    setAddLoading(true);
    try {
      await api.createAnswerMapping({
        gradeId,
        subjectId,
        studentExerciseLabel: exerciseLabel,
        studentPageNumber: Number(studentPageNumber),
        teacherPageNumber: Number(teacherPageNumber),
        teacherExerciseLabel: teacherExerciseLabel || undefined,
        notes: notes || undefined,
      });
      setExerciseLabel('');
      setNotes('');
      await loadMappings();
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ushbu bog‘lanmani o‘chirmoqchimisiz?')) return;
    try {
      await api.deleteAnswerMapping(id);
      await loadMappings();
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportAnswerMappingsCsv(gradeId, subjectId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `answer_mappings_grade${gradeId}_${subjectId}.csv`;
      a.click();
    } catch (err: any) {
      alert(`Export xatoligi: ${err.message}`);
    }
  };

  const handleImportCsv = async () => {
    try {
      const res = await api.importAnswerMappingsCsv(gradeId, subjectId, csvText);
      alert(`✅ Muvaffaqiyatli import qilindi: ${res.importedCount} ta mashq bog‘landi!`);
      setShowCsvModal(false);
      await loadMappings();
    } catch (err: any) {
      alert(`Import xatoligi: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Spec §3: Teacher's Book Answers ↔ Student's Book Exercises
            </span>
          </div>
          <h2 className="text-2xl font-black text-school-blue-900 mt-1">
            Javoblar Bog‘lanmasi (Answer Mappings)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            O‘quvchi kitobidagi mashq tugmasi bosilganda o‘qituvchi kitobidagi mos sahifa darhol pastki/yon panelda ochiladi.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>CSV Yuklab Olish</span>
          </button>
          <button
            onClick={() => setShowCsvModal(true)}
            className="pill-button-accent px-5 py-2.5 text-xs font-bold flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>CSV Import Qilish</span>
          </button>
        </div>
      </div>

      {/* Grade and Subject Selector */}
      <div className="glass-panel p-4 rounded-2xl border border-white/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mr-2">Sinf:</label>
            <select
              value={gradeId}
              onChange={(e) => setGradeId(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
            >
              {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  {g}-sinf
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mr-2">Fan:</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800"
            >
              <option value="sub_eng_11">English (Ingliz tili)</option>
              <option value="sub_math_11">Algebra & Geometriya</option>
              <option value="sub_phys_11">Fizika</option>
            </select>
          </div>
        </div>

        <button
          onClick={loadMappings}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* Main Grid: Add New Mapping + Mappings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add Form */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-white/80 space-y-4">
          <h3 className="text-base font-extrabold text-school-blue-900 flex items-center space-x-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>Yangi Bog‘lanma Qo‘shish</span>
          </h3>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mashq Nomi (Masalan: "Ex. 3 Listening")
              </label>
              <input
                type="text"
                placeholder="Ex. 1 Vocab"
                value={exerciseLabel}
                onChange={(e) => setExerciseLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  O‘quvchi Kitobi Sahifasi
                </label>
                <input
                  type="number"
                  min="1"
                  value={studentPageNumber}
                  onChange={(e) => setStudentPageNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  O‘qituvchi Kitobi Sahifasi
                </label>
                <input
                  type="number"
                  min="1"
                  value={teacherPageNumber}
                  onChange={(e) => setTeacherPageNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                O‘qituvchi Kitobidagi Bo‘lim Nomi (Ixtiyoriy)
              </label>
              <input
                type="text"
                placeholder="Unit 1 Answers Key"
                value={teacherExerciseLabel}
                onChange={(e) => setTeacherExerciseLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Izoh / Metodika eslatmasi
              </label>
              <textarea
                placeholder="Grammar tushuntirishlari mavjud..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={addLoading}
              className="w-full py-2.5 rounded-xl bg-school-blue-900 hover:bg-blue-950 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{addLoading ? 'Qo‘shilmoqda...' : 'Bog‘lanmani Saqlash'}</span>
            </button>
          </form>
        </div>

        {/* Right: Mappings Table */}
        <div className="lg:col-span-8 glass-panel rounded-3xl border border-white/80 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Mavjud Bog‘lanmalar ({mappings.length} ta)
            </h3>
            <span className="text-xs text-slate-400">
              {gradeId}-sinf • {subjectId}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                  <th className="py-3 px-5">Mashq Nomi</th>
                  <th className="py-3 px-5">O‘quvchi Sahifasi</th>
                  <th className="py-3 px-5">O‘qituvchi Sahifasi</th>
                  <th className="py-3 px-5">Metodika / Izoh</th>
                  <th className="py-3 px-5 text-right">O‘chirish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Bog‘langan mashqlar mavjud emas
                    </td>
                  </tr>
                ) : (
                  mappings.map((m) => (
                    <tr key={m.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-school-blue-900">
                        {m.studentExerciseLabel}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-extrabold">
                          {m.studentPageNumber}-sahifa
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-extrabold">
                          {m.teacherPageNumber}-sahifa
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate">
                        {m.notes || m.teacherExerciseLabel || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full flex flex-col shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-school-blue-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>CSV orqali Ommaviy Import</span>
              </h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                Yopish
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Quyidagi formatda CSV matnini joylashtiring:
              <br />
              <code className="text-blue-700 font-mono text-[11px]">exerciseLabel,studentPageNumber,teacherPageNumber,teacherExerciseLabel,notes</code>
            </p>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="w-full p-3 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 bg-slate-50"
            />

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleImportCsv}
                className="pill-button-accent px-5 py-2 text-xs font-bold flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Importni Boshlash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
