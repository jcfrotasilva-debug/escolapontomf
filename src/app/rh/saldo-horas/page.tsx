'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  User,
  Calendar,
  Clock,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { formatDateBR } from '@/lib/timezone';

type ServerUser = {
  id: number;
  name: string;
  role: string;
  position: string | null;
  registration: string | null;
  department: string | null;
  active: boolean;
};

type HoursBalance = {
  userId: number;
  userName: string;
  userRegistration: string | null;
  userPosition: string | null;
  summary: {
    workingDays: number;
    workedDays: number;
    absenceDays: number;
    holidayDays: number;
    weekendDays: number;
    expectedMinutes: number;
    actualMinutes: number;
    balanceMinutes: number;
    balanceFormatted: string;
    balanceType: 'superavit' | 'deficit' | 'neutro';
  };
};

function formatMinutes(mins: number): string {
  const absMins = Math.abs(mins);
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function HoursBalanceContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [servers, setServers] = useState<ServerUser[]>([]);
  const [balances, setBalances] = useState<HoursBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedServer, setSelectedServer] = useState<ServerUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'superavit' | 'deficit' | 'neutro'>('all');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchServers();
    }
  }, [user]);

  useEffect(() => {
    if (servers.length > 0) {
      fetchAllBalances();
    }
  }, [servers, month]);

  async function fetchServers() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setServers(data.users.filter((s: ServerUser) => s.role === 'server' && s.active));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAllBalances() {
    setLoading(true);
    const results: HoursBalance[] = [];
    for (const server of servers) {
      try {
        const res = await fetch(`/api/reports/hours-balance?userId=${server.id}&month=${month}`);
        if (res.ok) {
          const data = await res.json();
          results.push({
            userId: server.id,
            userName: server.name,
            userRegistration: server.registration,
            userPosition: server.position,
            summary: data.summary,
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    setBalances(results);
    setLoading(false);
  }

  if (loading && balances.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Estatísticas gerais
  const totalSuperavit = balances.filter(b => b.summary.balanceType === 'superavit').length;
  const totalDeficit = balances.filter(b => b.summary.balanceType === 'deficit').length;
  const totalNeutro = balances.filter(b => b.summary.balanceType === 'neutro').length;
  const totalExpectedMinutes = balances.reduce((sum, b) => sum + b.summary.expectedMinutes, 0);
  const totalActualMinutes = balances.reduce((sum, b) => sum + b.summary.actualMinutes, 0);
  const totalBalance = totalActualMinutes - totalExpectedMinutes;

  const filteredBalances = balances.filter(b => {
    if (filter === 'all') return true;
    return b.summary.balanceType === filter;
  });

  const sortedBalances = [...filteredBalances].sort((a, b) => a.summary.balanceMinutes - b.summary.balanceMinutes);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/rh')}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-white font-bold text-lg sm:text-xl">Saldo de Horas</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Análise de superávit e déficit por servidor</p>
              </div>
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                <User className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500">Servidores</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{balances.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500">Superávit</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{totalSuperavit}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center text-white">
                <TrendingDown className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500">Déficit</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{totalDeficit}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center text-white">
                <Minus className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500">Neutro</span>
            </div>
            <p className="text-2xl font-bold text-slate-700">{totalNeutro}</p>
          </div>
          <div className={`rounded-2xl shadow-sm border p-4 ${
            totalBalance >= 0 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                totalBalance >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-600">Saldo Total</span>
            </div>
            <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatMinutes(totalBalance)}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-3 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({balances.length})
          </button>
          <button
            onClick={() => setFilter('superavit')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-1 ${
              filter === 'superavit' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Superávit ({totalSuperavit})
          </button>
          <button
            onClick={() => setFilter('deficit')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-1 ${
              filter === 'deficit' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Déficit ({totalDeficit})
          </button>
          <button
            onClick={() => setFilter('neutro')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-1 ${
              filter === 'neutro' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Minus className="w-4 h-4" />
            Neutro ({totalNeutro})
          </button>
        </div>

        {/* Lista de servidores */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Ranking de Servidores por Saldo de Horas</h2>
            <p className="text-xs text-slate-500 mt-1">
              Ordenado do maior déficit ao maior superávit
            </p>
          </div>

          {sortedBalances.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum servidor encontrado para este período</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedBalances.map((b, idx) => (
                <div
                  key={b.userId}
                  className="p-4 hover:bg-slate-50 transition flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                    b.summary.balanceType === 'superavit' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                    b.summary.balanceType === 'deficit' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                    'bg-gradient-to-br from-slate-500 to-slate-600'
                  }`}>
                    {b.userName.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{b.userName}</p>
                      {b.userRegistration && (
                        <span className="text-xs text-slate-500 font-mono">{b.userRegistration}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {b.userPosition || 'Servidor'} · {b.summary.workedDays} de {b.summary.workingDays} dias trabalhados
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-medium">
                        Esperado
                      </div>
                      <div className="text-sm font-mono text-slate-700">
                        {formatMinutes(b.summary.expectedMinutes)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-medium">
                        Efetivo
                      </div>
                      <div className="text-sm font-mono text-slate-700">
                        {formatMinutes(b.summary.actualMinutes)}
                      </div>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <div className={`text-[10px] uppercase font-medium flex items-center gap-1 justify-end ${
                        b.summary.balanceType === 'superavit' ? 'text-green-600' :
                        b.summary.balanceType === 'deficit' ? 'text-red-600' :
                        'text-slate-600'
                      }`}>
                        {b.summary.balanceType === 'superavit' && <TrendingUp className="w-3 h-3" />}
                        {b.summary.balanceType === 'deficit' && <TrendingDown className="w-3 h-3" />}
                        {b.summary.balanceType === 'neutro' && <Minus className="w-3 h-3" />}
                        Saldo
                      </div>
                      <div className={`text-lg font-bold font-mono ${
                        b.summary.balanceType === 'superavit' ? 'text-green-700' :
                        b.summary.balanceType === 'deficit' ? 'text-red-700' :
                        'text-slate-700'
                      }`}>
                        {b.summary.balanceFormatted}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de RH */}
        {totalDeficit > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900">Atenção do RH</h3>
                <p className="text-sm text-amber-800 mt-1">
                  {totalDeficit} servidor(es) com déficit de horas neste mês. 
                  Recomenda-se análise individual para verificar possíveis atrasos recorrentes ou problemas de jornada.
                </p>
              </div>
            </div>
          </div>
        )}

        {totalSuperavit > 0 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-green-900">Destaque Positivo</h3>
                <p className="text-sm text-green-800 mt-1">
                  {totalSuperavit} servidor(es) com superávit de horas neste mês. 
                  Esses servidores podem ser candidatos a horas extras ou banco de horas positivo.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function HoursBalancePage() {
  return (
    <AuthProvider>
      <HoursBalanceContent />
    </AuthProvider>
  );
}
