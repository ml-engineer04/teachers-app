import React, { useState, useEffect } from 'react';
import {
  Users,
  Smartphone,
  Trash2,
  Lock,
  Unlock,
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/apiClient';

export function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers(search || undefined);
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDisconnectDevice = async (userId: string, deviceId: string) => {
    if (!confirm('Ushbu qurilmani akkauntdan uzmoqchimisiz? O‘qituvchi boshqa yangi qurilmada kirishi mumkin bo‘ladi.')) return;
    try {
      await api.disconnectDevice(userId, deviceId);
      await loadUsers();
    } catch (err: any) {
      alert(`Xatolik: ${err.message}`);
    }
  };

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    try {
      await api.toggleUserBlock(userId, !currentBlocked);
      await loadUsers();
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
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
            <span className="text-xs font-bold text-violet-800 uppercase tracking-wider">
              Spec §7: Teacher Accounts & 2-Device Limit Enforcer
            </span>
          </div>
          <h2 className="text-2xl font-black text-school-blue-900 mt-1">
            O‘qituvchilar & Qurilmalar Boshqaruvi
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Har bir akkauntga maksimal 2 ta Android qurilma (masalan: telefon va planshet) ruxsat etiladi. Eski qurilmalarni masofadan uzish mumkin.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Ism yoki email bo‘yicha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white w-52 focus:w-64 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center space-x-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* Users Cards */}
      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="glass-panel p-6 rounded-3xl border border-white/80 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100'}
                  alt={user.fullName || user.email}
                  className="w-12 h-12 rounded-2xl object-cover border border-white shadow-sm"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-school-blue-900 flex items-center space-x-2">
                    <span>{user.fullName || user.email}</span>
                    {user.isBlocked && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Bloklangan
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
                  📱 {user.devices?.length || 0} / 2 Qurilma band
                </span>
                <button
                  onClick={() => handleToggleBlock(user.id, user.isBlocked)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                    user.isBlocked
                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                      : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                  }`}
                >
                  {user.isBlocked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Blokdan chiqarish</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Akkauntni bloklash</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Enrolled hardware devices */}
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Ulangan Qurilmalar:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.devices?.map((dev: any) => (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-school-blue-900">
                          {dev.deviceModel}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {dev.osVersion} • STB v{dev.appVersion}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDisconnectDevice(user.id, dev.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Qurilmani uzish (2 qurilma limitini bo‘shatish)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
