import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Music,
  Video,
  CheckCircle,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/apiClient';

export function IngestionStudioTab() {
  const [selectedBookId, setSelectedBookId] = useState<string>('book_grade11_english_sb');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [showManifestModal, setShowManifestModal] = useState<boolean>(false);

  const loadValidationReport = async () => {
    setLoading(true);
    try {
      const data = await api.getValidationReport(selectedBookId);
      setReport(data);
    } catch (err) {
      console.error('Error loading validation report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidationReport();
  }, [selectedBookId]);

  const handleRunPipeline = async () => {
    setIngesting(true);
    try {
      const data = await api.triggerIngestion(selectedBookId, [
        { filename: 'unit1_track1.mp3', sizeBytes: 3200000 },
        { filename: 'unit1_grammar.mp4', sizeBytes: 15400000 },
        { filename: 'unit1_extra_dialogue.mp3', sizeBytes: 2100000 },
      ]);
      setReport(data);
      alert('✅ Ingestion Pipeline muvaffaqiyatli yakunlandi! WebP tasvirlar, matn indeksi va hotspotlar shakllantirildi.');
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleTogglePublish = async () => {
    const nextState = !isPublished;
    try {
      await api.togglePublishBook(selectedBookId, nextState);
      setIsPublished(nextState);
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              Spec §3 & §5: Ingestion Pipeline & Hotspot Matching
            </span>
          </div>
          <h2 className="text-2xl font-black text-school-blue-900 mt-1">
            Darsliklarni Qayta Ishlash & Hotspot Studiyasi
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            PDF sahifalarini WebP (1x/2x) ga aylantirish, audio/video annotatsiyalarni aniqlash va validatsiya hisoboti.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadValidationReport}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>
          <button
            onClick={handleRunPipeline}
            disabled={ingesting}
            className="pill-button-accent px-5 py-2.5 text-xs font-bold flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{ingesting ? 'Qayta ishlanmoqda...' : 'Pipelineni Ishga Tushirish'}</span>
          </button>
        </div>
      </div>

      {/* Book Picker & Status Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-white/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Tanlangan Darslik:
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-school-blue-900 shadow-sm"
              >
                <option value="book_grade11_english_sb">11-sinf: English Student's Book (Asosiy darslik)</option>
                <option value="book_grade11_english_tb">11-sinf: English Teacher's Book (Javoblar kaliti)</option>
                <option value="book_grade11_english_wb">11-sinf: English Workbook (Mashq daftari)</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {isPublished ? 'PUBLISHED (Ochiq)' : 'DRAFT (Qoralama)'}
              </span>
              <button
                onClick={handleTogglePublish}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all"
              >
                {isPublished ? 'Qoralamaga olish' : 'Nashr qilish'}
              </button>
            </div>
          </div>

          {/* Pipeline Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
              <p className="text-[11px] font-bold text-blue-800 uppercase">Sahifalar (WebP)</p>
              <p className="text-2xl font-black text-blue-950 mt-1">
                {report?.totalPages ?? 6} <span className="text-xs font-semibold text-blue-600">sahifa</span>
              </p>
              <p className="text-[11px] text-blue-700 mt-1">Normal (1x) + High (2x Zoom)</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <p className="text-[11px] font-bold text-emerald-800 uppercase">Bog‘langan Media</p>
              <p className="text-2xl font-black text-emerald-950 mt-1">
                {report?.matchedMediaCount ?? 2} <span className="text-xs font-semibold text-emerald-600">fayl</span>
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">Audio MP3 + Video MP4</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
              <p className="text-[11px] font-bold text-amber-800 uppercase">Topilgan Hotspotlar</p>
              <p className="text-2xl font-black text-amber-950 mt-1">
                {report?.extractedHotspotsCount ?? 4} <span className="text-xs font-semibold text-amber-600">nuqta</span>
              </p>
              <p className="text-[11px] text-amber-700 mt-1">Audio / Video / Javoblar</p>
            </div>
          </div>

          {/* Validation Warnings (Spec §3 Step 4) */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Validatsiya Xatoliklari & Ogohlantirishlar (Validation Report)</span>
            </h4>

            {/* Unmatched links */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>⚠️ Bog‘lanmagan PDF havolalari (Fayli topilmagan):</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px]">
                  {report?.unmatchedLinks?.length ?? 0} ta
                </span>
              </div>
              {report?.unmatchedLinks?.length > 0 ? (
                <div className="space-y-1 text-xs">
                  {report.unmatchedLinks.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{item.pageNumber}-sahifa:</span>{' '}
                        <code className="text-[11px] text-rose-600 bg-rose-50 px-1 py-0.5 rounded">{item.rawTarget}</code>
                      </div>
                      <span className="text-[10px] text-amber-800 font-semibold">Qayta yuklash kerak</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Barcha havolalar fayllar bilan to‘liq mos kelgan.</p>
              )}
            </div>

            {/* Unreferenced media files */}
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span>ℹ️ Sahifada ishlatilmagan media fayllar (Unreferenced Media):</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px]">
                  {report?.unreferencedMedia?.length ?? 0} ta
                </span>
              </div>
              {report?.unreferencedMedia?.length > 0 ? (
                <div className="space-y-1 text-xs">
                  {report.unreferencedMedia.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-blue-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Music className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-bold text-slate-800">{item.filename}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{(item.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Ortiqcha yuklangan media fayl yo‘q.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Upload Box & Manifest Viewer */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-white/80 space-y-6">
          <h3 className="text-base font-extrabold text-school-blue-900 flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-school-blue-900" />
            <span>Yangi Fayllar Yuklash</span>
          </h3>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-slate-100/60 transition-all cursor-pointer">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Darslik PDF faylini tashlang</p>
            <p className="text-[10px] text-slate-400 mt-1">Maksimal hajm: 250 MB</p>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-slate-100/60 transition-all cursor-pointer">
            <Music className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Audio (.mp3) va Video (.mp4) fayllar</p>
            <p className="text-[10px] text-slate-400 mt-1">Bir vaqtning o‘zida bir nechta fayl</p>
          </div>

          <button
            onClick={() => setShowManifestModal(true)}
            className="w-full py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all"
          >
            <Code className="w-4 h-4 text-slate-600" />
            <span>Bundle Manifest JSON ko‘rish</span>
          </button>
        </div>
      </div>

      {/* Manifest Modal */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-extrabold text-school-blue-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Oflayn Darslik Manifesti (AES-256-GCM)</span>
              </h3>
              <button
                onClick={() => setShowManifestModal(false)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                Yopish
              </button>
            </div>
            <div className="overflow-auto mt-4 p-4 rounded-2xl bg-slate-900 text-green-400 font-mono text-xs">
              <pre>{JSON.stringify(report?.manifest || { status: 'loading' }, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
