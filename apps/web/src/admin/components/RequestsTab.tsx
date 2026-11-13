import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  User,
  ShieldCheck,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/apiClient';

export function RequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        gradeId: selectedGrade ? Number(selectedGrade) : undefined,
        search: searchQuery || undefined,
      });
      setRequests(data);
    } catch (err) {
      console.error('Error fetching requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter, selectedGrade]);

  const handleMarkContacted = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await api.markContacted(requestId, 'Qo‘ng‘iroq qilindi, to‘lov kutilmoqda');
      await loadRequests();
    } catch (err) {
      alert('Xatolik yuz berdi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGrantAccess = async (requestId: string, durationDays: number) => {
    const note = prompt(`O‘qituvchiga ${durationDays} kunlik litsenziya berishni tasdiqlaysizmi? Izoh:`, 'To‘lov cheki tasdiqlandi');
    if (note === null) return;

    setActionLoadingId(requestId);
    try {
      const res = await api.grantAccess(requestId, durationDays, note);
      alert(`✅ Litsenziya muvaffaqiyatli berildi! ${durationDays} kunlik RSA imzoli token faollashtirildi.`);
      await loadRequests();
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Rad etish sababini kiriting:', 'Noto‘g‘ri telefon raqami yoki to‘lov amalga oshirilmadi');
    if (!reason) return;

    setActionLoadingId(requestId);
    try {
      await api.rejectAccess(requestId, reason);
      await loadRequests();
    } catch (err) {
      alert('Xatolik yuz berdi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Kutilmoqda (Yangi)</span>
          </span>
        );
      case 'AWAITING_PAYMENT':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5" />
            <span>Qo‘ng‘iroq qilindi / To‘lov kutilmoqda</span>
          </span>
        );
      case 'PAID_APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>To‘lov Tasdiqlangan (Faol)</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rad etilgan</span>
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const getPlanBadge = (plan: string) => {
    if (plan === 'MONTHLY') {
      return <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">1 Oylik (30 kun)</span>;
    }
    if (plan === 'THREE_MONTHS') {
      return <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">3 Oylik (90 kun)</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">1 Yillik (365 kun)</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Spec §8: Telephone Sales Desk
            </span>
          </div>
          <h2 className="text-2xl font-black text-school-blue-900 mt-1">
            Telefon Orqali Savdo & Litsenziya Berish
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            O‘qituvchi ilovada telefon raqamini kiritib so‘rov qoldiradi. Operator qo‘ng‘iroq qilib to‘lovni qabul qilgach, ruxsat beradi.
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-2 shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/80 flex flex-wrap items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'Barchasi' },
            { id: 'PENDING', label: 'Kutilayotgan (Yangi)' },
            { id: 'AWAITING_PAYMENT', label: 'To‘lov kutilmoqda' },
            { id: 'PAID_APPROVED', label: 'Tasdiqlangan' },
            { id: 'REJECTED', label: 'Rad etilgan' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-school-blue-900 text-white shadow-sm'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grade & Search */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700"
          >
            <option value="">Barcha Sinflar (1–11)</option>
            {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                {g}-sinf
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Email, telefon yoki fan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadRequests()}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white w-48 focus:w-64 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="glass-panel rounded-3xl border border-white/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">O‘qituvchi / Telefon</th>
                <th className="py-3.5 px-6">Sinf & Fan</th>
                <th className="py-3.5 px-6">Reja & Narx</th>
                <th className="py-3.5 px-6">Holat</th>
                <th className="py-3.5 px-6">Izoh / Sana</th>
                <th className="py-3.5 px-6 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Hech qanday so‘rov topilmadi
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* User info */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-school-blue-900 text-sm">
                        {req.phoneNumber}
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center space-x-1 mt-0.5">
                        <User className="w-3 h-3" />
                        <span>{req.userEmail}</span>
                      </div>
                    </td>

                    {/* Grade & Subject */}
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-800">
                        {req.gradeNumber}-sinf
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {req.subjectName || 'Barcha fanlar'}
                      </div>
                    </td>

                    {/* Plan & Price */}
                    <td className="py-4 px-6">
                      <div>{getPlanBadge(req.plan)}</div>
                      <div className="font-extrabold text-emerald-800 mt-1">
                        {(req.priceUzs || 0).toLocaleString()} UZS
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6">{getStatusBadge(req.status)}</td>

                    {/* Note & Date */}
                    <td className="py-4 px-6">
                      <div className="text-slate-700 italic">
                        {req.internalNote || '—'}
                      </div>
                      <div className="text-slate-400 text-[10px] mt-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkContacted(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xs flex items-center space-x-1 transition-all"
                            title="Qo‘ng‘iroq qilingan deb belgilash"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Qo‘ng‘iroq qilindi</span>
                          </button>
                        )}

                        {req.status !== 'PAID_APPROVED' && (
                          <div className="relative inline-block text-left group">
                            <button
                              disabled={actionLoadingId === req.id}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Ruxsat berish ▼</span>
                            </button>
                            <div className="hidden group-hover:block absolute right-0 mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1 z-20 text-left">
                              <button
                                onClick={() => handleGrantAccess(req.id, 30)}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 text-left"
                              >
                                30 kunlik (1 oy)
                              </button>
                              <button
                                onClick={() => handleGrantAccess(req.id, 90)}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 text-left"
                              >
                                90 kunlik (3 oy)
                              </button>
                              <button
                                onClick={() => handleGrantAccess(req.id, 365)}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 text-left"
                              >
                                365 kunlik (1 yil)
                              </button>
                            </div>
                          </div>
                        )}

                        {req.status !== 'REJECTED' && req.status !== 'PAID_APPROVED' && (
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition-all"
                            title="Rad etish"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
