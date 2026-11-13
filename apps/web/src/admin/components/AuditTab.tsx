import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  User,
  Database,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../services/apiClient';

export function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Spec §15: Audit Trail & Security Logs
            </span>
          </div>
          <h2 className="text-2xl font-black text-school-blue-900 mt-1">
            Audit Jurnali & Xavfsizlik Tarixi
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Barcha ma’muriy o‘zgarishlar (litsenziya berish, narxlarni o‘zgartirish, darslik yuklash) qat’iy saqlanadi.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-3xl border border-white/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                <th className="py-3 px-6">Vaqt</th>
                <th className="py-3 px-6">Administrator</th>
                <th className="py-3 px-6">Amal</th>
                <th className="py-3 px-6">Obyekt</th>
                <th className="py-3 px-6">Tafsilotlar (Payload)</th>
                <th className="py-3 px-6">IP Manzil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-6 font-bold text-school-blue-900">
                    {log.adminEmail}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-extrabold text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 font-semibold text-slate-700">
                    {log.entityType} ({log.entityId || 'N/A'})
                  </td>
                  <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                    {JSON.stringify(log.payload || {})}
                  </td>
                  <td className="py-3.5 px-6 text-slate-400 font-mono text-[11px]">
                    {log.ipAddress || '127.0.0.1'}
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
