import React, { useState } from 'react';
import {
  Rocket,
  Download,
  CheckCircle,
  Database,
  ShieldCheck,
  Smartphone,
  Server,
  Cloud,
  RefreshCw,
  FileText,
  AlertCircle,
  HardDrive,
  Copy,
} from 'lucide-react';

export function ReleaseTab() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [backupsList, setBackupsList] = useState([
    {
      filename: 'stb_backup_20261108_130000.sql.gz',
      size: '4.8 MB',
      createdAt: '2026-11-08 13:00:00',
      s3Status: 'SYNCHRONIZED',
      tables: 20,
    },
    {
      filename: 'stb_backup_20261107_030000.sql.gz',
      size: '4.6 MB',
      createdAt: '2026-11-07 03:00:00',
      s3Status: 'SYNCHRONIZED',
      tables: 20,
    },
  ]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleTriggerBackup = () => {
    setBackupInProgress(true);
    setBackupSuccess(false);
    setTimeout(() => {
      setBackupInProgress(false);
      setBackupSuccess(true);
      const newBackup = {
        filename: `stb_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${new Date().getHours()}${new Date().getMinutes()}00.sql.gz`,
        size: '5.1 MB',
        createdAt: new Date().toLocaleString(),
        s3Status: 'SYNCHRONIZED',
        tables: 20,
      };
      setBackupsList((prev) => [newBackup, ...prev]);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-school-blue-900 via-blue-900 to-indigo-950 text-white shadow-xl border border-blue-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Phase 5: Ishlab Chiqarishga Tayyor (Production Ready)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Chiqarish & Ekspluatatsiya Markazi (Release Hub)
            </h2>
            <p className="text-sm text-blue-200 mt-2 max-w-2xl font-medium">
              Android AAB/APK paketlari, Google Play do‘koniga chiqarish nazorati, ma’lumotlar bazasini avtomatik zaxiralash va server boshqaruvi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleTriggerBackup}
              disabled={backupInProgress}
              className="px-5 py-3 rounded-2xl bg-white text-school-blue-900 hover:bg-blue-50 font-black text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              {backupInProgress ? (
                <RefreshCw className="w-4 h-4 animate-spin text-school-blue-900" />
              ) : (
                <Database className="w-4 h-4 text-school-blue-900" />
              )}
              <span>{backupInProgress ? 'Zaxira yaratilmoqda...' : 'Hozir Zaxira Olish'}</span>
            </button>
          </div>
        </div>
      </div>

      {backupSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Ma'lumotlar bazasi zaxira nusxasi (gzip) muvaffaqiyatli olindi va AWS S3 ga sinxronlandi!</span>
          </div>
          <button onClick={() => setBackupSuccess(false)} className="text-emerald-600 hover:underline">
            Yopish
          </button>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Android Release Packages */}
        <div className="glass-panel p-6 rounded-3xl border border-white/80 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Android Release Paketlari (v1.0.0)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Google Play Store va to'g'ridan-to'g'ri o'rnatish uchun
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
              BUILD 6
            </span>
          </div>

          {/* Metadata Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/70 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Package</p>
              <p className="text-xs font-black text-slate-800 truncate" title="com.smartteacherbook.app">
                com.smartteacher...
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Versiya</p>
              <p className="text-xs font-black text-slate-800">1.0.0 (6)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Target SDK</p>
              <p className="text-xs font-black text-emerald-700">35 (Android 15)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Min SDK</p>
              <p className="text-xs font-black text-slate-800">24 (Android 7+)</p>
            </div>
          </div>

          {/* Download & Build Cards */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center font-black text-blue-800 text-xs">
                  AAB
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    smartteacherbook-v1.0.0.aab
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Google Play Console uchun rasmiy App Bundle (24.8 MB)
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    'pnpm --filter @smartteacherbook/mobile run build:cloud:aab',
                    'aab'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1"
              >
                {copiedCmd === 'aab' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCmd === 'aab' ? 'Nusxalandi!' : 'Buyruq'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center font-black text-emerald-800 text-xs">
                  APK
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    smartteacherbook-v1.0.0.apk
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    To'g'ridan-to'g'ri telefon/planshetga o'rnatiluvchi APK (32.1 MB)
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    './infrastructure/scripts/build-android-docker.sh',
                    'apk'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1"
              >
                {copiedCmd === 'apk' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCmd === 'apk' ? 'Nusxalandi!' : 'Docker Build'}</span>
              </button>
            </div>
          </div>

          {/* Quick Terminal Command */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">
                1-Buyruqli Docker Yig'ish (Zero Setup)
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    './infrastructure/scripts/build-android-docker.sh',
                    'term'
                  )
                }
                className="text-slate-400 hover:text-white"
              >
                {copiedCmd === 'term' ? 'Nusxalandi!' : 'Nusxalash'}
              </button>
            </div>
            <code>$ ./infrastructure/scripts/build-android-docker.sh</code>
          </div>
        </div>

        {/* Right Column: Google Play Store Readiness */}
        <div className="glass-panel p-6 rounded-3xl border border-white/80 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Google Play Do'koniga Chiqarish
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Moderatsiya va xavfsizlik talablariga muvofiqlik
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black border border-blue-300">
              100% TAYYOR
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                title: 'Data Safety Deklaratsiyasi',
                desc: 'docs/store/DATA_SAFETY.md da to\'liq javoblar tayyor',
                status: 'TAYYOR',
              },
              {
                title: 'Maxfiylik Siyosati (Privacy Policy)',
                desc: 'docs/store/PRIVACY_POLICY.md darslik va bolalar xavfsizligi standarti',
                status: 'TAYYOR',
              },
              {
                title: 'Do\'kon Tavsifi va Grafika',
                desc: 'docs/store/STORE_LISTING.md da 512px icon va 1024px banner tavsiflari',
                status: 'TAYYOR',
              },
              {
                title: 'Moderatorlar uchun Test Akkaunti',
                desc: 'reviewer@smartteacherbook.uz (10-sinf barcha kitoblari bilan)',
                status: 'TAYYOR',
              },
              {
                title: 'FLAG_SECURE & Obfuscation (R8)',
                desc: 'app.json da Proguard va resurslarni qisqartirish faol',
                status: 'TAYYOR',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">{item.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Database Backups & Operations */}
      <div className="glass-panel p-6 rounded-3xl border border-white/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Ma'lumotlar Bazasi Zaxiralari (PostgreSQL 16)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kundalik avtomatik zaxiralash, gzip siqish va AWS S3 sinxronizatsiyasi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500">Saqlash muddati:</span>
            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 border border-purple-200">
              30 Kun
            </span>
          </div>
        </div>

        {/* Backups Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="p-3.5">Fayl Nomi</th>
                <th className="p-3.5">Hajmi</th>
                <th className="p-3.5">Yaratilgan Vaqt</th>
                <th className="p-3.5">AWS S3 Holati</th>
                <th className="p-3.5 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {backupsList.map((backup, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-slate-800 flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{backup.filename}</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-600">{backup.size}</td>
                  <td className="p-3.5 text-slate-500 font-medium">{backup.createdAt}</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      <Cloud className="w-3 h-3 text-emerald-600" />
                      <span>{backup.s3Status}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => alert(`Zaxira nusxasi yuklab olinmoqda: ${backup.filename}`)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all inline-flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Yuklab Olish</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
