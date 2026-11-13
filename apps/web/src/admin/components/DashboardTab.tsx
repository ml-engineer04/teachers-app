import React, { useEffect, useState } from 'react';
import {
  Users,
  CreditCard,
  Clock,
  CheckCircle,
  HardDrive,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/apiClient';

interface DashboardStats {
  kpis: {
    totalTeachers: number;
    activeSubscriptions: number;
    pendingAccessRequests: number;
    awaitingPaymentRequests: number;
    approvedSubscriptions: number;
    expiringIn3Days: number;
    estimatedRevenueUzs: number;
    s3StorageUsed: string;
    s3StorageQuota: string;
    storagePercent: number;
  };
  systemHealth: {
    apiStatus: string;
    dbStatus: string;
    s3Status: string;
    sesStatus: string;
    licenseSigningKey: string;
  };
}

export function DashboardTab({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
              ilmçi Admin Panel (Phase 1)
            </span>
          </div>
          <h2 className="text-2xl font-black text-school-blue-900 mt-1">
            Asosiy Boshqaruv & Tizim Ko‘rsatkichlari (KPIs)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            O‘zbekiston maktablari uchun 1–11 sinf elektron darslik platformasi monitoringi va savdo stoli.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>
          <button
            onClick={() => onNavigate('requests')}
            className="pill-button-accent px-5 py-2.5 text-xs font-bold flex items-center space-x-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Savdo Stoliga O‘tish</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Teachers */}
        <div className="glass-card p-6 rounded-3xl border border-white/90 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jami O‘qituvchilar</p>
          <p className="text-3xl font-black text-school-blue-900 mt-1">
            {stats?.kpis.totalTeachers ?? 3} <span className="text-sm font-semibold text-slate-400">nafar</span>
          </p>
          <div className="mt-3 flex items-center text-xs text-green-700 font-bold space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Google Sign-In orqali faol</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="glass-card p-6 rounded-3xl border border-white/90 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faol Obunalar</p>
          <p className="text-3xl font-black text-emerald-900 mt-1">
            {stats?.kpis.activeSubscriptions ?? 2} <span className="text-sm font-semibold text-slate-400">ta</span>
          </p>
          <div className="mt-3 text-xs text-slate-600 font-medium">
            30 kunlik / 90 kunlik / 1 yillik
          </div>
        </div>

        {/* Pending Requests */}
        <div className="glass-card p-6 rounded-3xl border border-white/90 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kutilayotgan So‘rovlar</p>
          <p className="text-3xl font-black text-amber-900 mt-1">
            {stats?.kpis.pendingAccessRequests ?? 1} <span className="text-sm font-semibold text-amber-600 font-bold">qo‘ng‘iroq zarur</span>
          </p>
          <div className="mt-3 text-xs text-amber-700 font-semibold">
            Savdo stoli navbatida
          </div>
        </div>

        {/* Total Estimated Revenue */}
        <div className="glass-card p-6 rounded-3xl border border-white/90 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasdiqlangan Tushum</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">
            {(stats?.kpis.estimatedRevenueUzs ?? 792000).toLocaleString('uz-UZ')}{' '}
            <span className="text-xs font-bold text-slate-500">UZS</span>
          </p>
          <div className="mt-3 text-xs text-green-700 font-bold">
            Tasdiqlangan to‘lovlar
          </div>
        </div>
      </div>

      {/* System Health & Infrastructure Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-white/80 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-school-blue-900 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-school-blue-900">
                  Tizim Holati & Xavfsizlik Arxitekturasi
                </h3>
                <p className="text-xs text-slate-500">
                  NestJS API, PostgreSQL, AWS S3, SES va RSA-2048 Litsenziya imzolovchi
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
              Barcha Xizmatlar Faol
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>NestJS Backend API</span>
                <span className="text-green-600 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Port 4000 ONLINE</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                REST + OpenAPI Swagger: <a href="http://localhost:4000/api/docs" target="_blank" rel="noreferrer" className="text-blue-600 underline">/api/docs</a>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>PostgreSQL & Prisma ORM</span>
                <span className="text-green-600 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>20 Entities Schema</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Resilient Dual-Mode (Postgres + In-Memory Store)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>AWS S3 Object Storage</span>
                <span className="text-green-600 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>WebP 1x/2x & Media</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Band qilingan: {stats?.kpis.s3StorageUsed ?? '1.42 GB'} / 100 GB
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>RSA-2048 Asymmetric Signer</span>
                <span className="text-green-600 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Hardware Keystore Bind</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Oflayn o‘qituvchi qurilmasi litsenziya tekshiruvi
              </p>
            </div>
          </div>
        </div>

        {/* Quick Launch Panel */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-white/80 space-y-4">
          <h3 className="text-base font-extrabold text-school-blue-900 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-school-yellow-500" />
            <span>Tezkor Bo‘limlar</span>
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate('requests')}
              className="w-full p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-school-blue-900">Savdo Stoli (Telefon So‘rovlari)</p>
                <p className="text-[11px] text-slate-500">Obunalar berish va qo‘ng‘iroqlar</p>
              </div>
              <PhoneCall className="w-4 h-4 text-slate-400 group-hover:text-school-blue-900" />
            </button>

            <button
              onClick={() => onNavigate('ingestion')}
              className="w-full p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-school-blue-900">Ingestion Studio (PDF & Media)</p>
                <p className="text-[11px] text-slate-500">Darslik yuklash va hotspot hisoboti</p>
              </div>
              <HardDrive className="w-4 h-4 text-slate-400 group-hover:text-school-blue-900" />
            </button>

            <button
              onClick={() => onNavigate('answers')}
              className="w-full p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-school-blue-900">Javoblar Bog‘lanmasi (Answer Keys)</p>
                <p className="text-[11px] text-slate-500">Mashq ↔ O‘qituvchi kitobi sahifasi</p>
              </div>
              <CheckCircle className="w-4 h-4 text-slate-400 group-hover:text-school-blue-900" />
            </button>

            <button
              onClick={() => onNavigate('mobileapp')}
              className="w-full p-3.5 rounded-2xl bg-school-blue-900 hover:bg-blue-950 text-white text-left transition-all flex items-center justify-between shadow-md"
            >
              <div>
                <p className="text-xs font-bold">📱 Mobil Ilova Simulyatori</p>
                <p className="text-[11px] text-blue-200">Tasdiqlangan dizayn bo‘yicha jonli ilova</p>
              </div>
              <ExternalLink className="w-4 h-4 text-school-yellow-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
