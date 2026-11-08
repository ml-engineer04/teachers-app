import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  DollarSign,
  Save,
  Check,
  RefreshCw,
  BookOpen,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/apiClient';

export function CatalogTab() {
  const [grades, setGrades] = useState<any[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<number>(11);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable price form state
  const [priceMonthly, setPriceMonthly] = useState<number>(119000);
  const [priceQuarterly, setPriceQuarterly] = useState<number>(299000);
  const [priceYearly, setPriceYearly] = useState<number>(890000);
  const [isActive, setIsActive] = useState<boolean>(true);

  const loadGradesAndSubjects = async () => {
    setLoading(true);
    try {
      const [gradesData, subjectsData] = await Promise.all([
        api.getGrades(),
        api.getSubjects(selectedGradeId),
      ]);
      setGrades(gradesData);
      setSubjects(subjectsData);

      const currentGrade = gradesData.find((g: any) => g.id === selectedGradeId);
      if (currentGrade) {
        setPriceMonthly(currentGrade.priceMonthlyUzs || 119000);
        setPriceQuarterly(currentGrade.priceQuarterlyUzs || 299000);
        setPriceYearly(currentGrade.priceYearlyUzs || 890000);
        setIsActive(currentGrade.isActive ?? true);
      }
    } catch (err) {
      console.error('Error loading grades', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGradesAndSubjects();
  }, [selectedGradeId]);

  const handleSavePrice = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      await api.updateGrade(selectedGradeId, {
        priceMonthlyUzs: Number(priceMonthly),
        priceQuarterlyUzs: Number(priceQuarterly),
        priceYearlyUzs: Number(priceYearly),
        isActive,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await loadGradesAndSubjects();
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Spec §4: Educational Hierarchy & Pricing
            </span>
          </div>
          <h2 className="text-2xl font-black text-school-blue-900 mt-1">
            Sinflar (1–11) & Obuna Narxlari Boshqaruvi
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Har bir sinf uchun 1 oylik, 3 oylik va 1 yillik narxlarni sozlang hamda fanlar katalogini boshqaring.
          </p>
        </div>
        <button
          onClick={loadGradesAndSubjects}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-2 shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* Grade Selector Strip */}
      <div className="glass-panel p-3 rounded-2xl border border-white/80 overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => {
            const isSelected = selectedGradeId === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGradeId(g)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-school-blue-900 text-white shadow-md scale-105'
                    : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200/80'
                }`}
              >
                <span>{g}-sinf</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Price Configuration & Subjects List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pricing Config Form */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/80 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-school-yellow-400 text-school-blue-900 flex items-center justify-center font-black">
              {selectedGradeId}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-school-blue-900">
                {selectedGradeId}-sinf Tarif Narxlari
              </h3>
              <p className="text-xs text-slate-500">Ilovada ko‘rinadigan rasmiy narxlar</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1 Oylik Obuna (30 kun) — UZS
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  UZS
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3 Oylik Obuna (90 kun) — UZS
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={priceQuarterly}
                  onChange={(e) => setPriceQuarterly(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  UZS
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1 Yillik Obuna (365 kun) — UZS
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={priceYearly}
                  onChange={(e) => setPriceYearly(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  UZS
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Sinf sotuvga ochiq (Faol):</span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 rounded text-school-blue-900"
              />
            </div>

            <button
              onClick={handleSavePrice}
              disabled={saveLoading}
              className="w-full mt-4 py-3 rounded-2xl bg-school-blue-900 hover:bg-blue-950 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-all"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Narxlar Saqlandi!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saveLoading ? 'Saqlanmoqda...' : 'Tarif Narxlarini Saqlash'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Subjects & Books Breakdown */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-school-blue-900">
                {selectedGradeId}-sinf Fanlar Ro‘yxati
              </h3>
              <p className="text-xs text-slate-500">
                Har bir fan ichida: Student's Book, Teacher's Book, Workbook
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              5 ta Fan
            </span>
          </div>

          <div className="space-y-3">
            {[
              { code: 'ENG', name: 'English (Ingliz tili)', icon: '🇬🇧', color: '#2563EB', booksCount: 3, teacherBookKey: true },
              { code: 'MATH', name: 'Matematika / Algebra', icon: '📐', color: '#059669', booksCount: 3, teacherBookKey: true },
              { code: 'PHYS', name: 'Fizika', icon: '⚛️', color: '#7C3AED', booksCount: 2, teacherBookKey: true },
              { code: 'CHEM', name: 'Kimyo', icon: '🧪', color: '#DB2777', booksCount: 2, teacherBookKey: false },
              { code: 'BIO', name: 'Biologiya', icon: '🧬', color: '#0D9488', booksCount: 2, teacherBookKey: false },
            ].map((sub) => (
              <div
                key={sub.code}
                className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between hover:shadow-sm transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm text-white"
                    style={{ backgroundColor: sub.color }}
                  >
                    {sub.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-school-blue-900 text-xs">
                      {sub.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kod: <strong>{sub.code}</strong> • {sub.booksCount} ta darslik (SB, TB, WB)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                    Oflayn Tayyor
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
