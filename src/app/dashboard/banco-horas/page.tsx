'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ClockIcon,
  Loader2
} from 'lucide-react';
import { formatDateBR } from '@/lib/timezone';

type BankEntry = {
  id: number;
  entryDate: string;
  scheduledHours: number;
  workedHours: number;
  balance: number;
  accumulatedBalance: number;
  type: 'credit' | 'debt' | 'neutral';
  notes: string | null;
};

type BankSummary = {
  totalBalance: number;
  totalCredits: number;
  totalDebts: number;
  daysFromBalance: number;
  status: 'credit' | 'debt' | 'balanced';
};

function MyBankOfHoursContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchMyBankOfHours();
    }
  }, [user]);

  async function fetchMyBankOfHours() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/bank-of-hours?userId=${user!.userId}&startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function formatHours(hours: number): string {
    const sign = hours >= 0 ? '+' : '';
    const absHours = Math.abs(hours);
    const h = Math.floor(absHours);
    const m = Math.round((absHours - h) * 60);
    return `${sign}${h}h${m.toString().padStart(2, '0')}min`;
  }

  function getBalanceColor(balance: number): string {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  function getBalanceIcon(balance: number) {
    if (balance > 0) return <TrendingUp className="w-8 h-8 text-green-500" />;
    if (balance < 0) return <TrendingDown className="w-8 h-8 text-red-500" />;
    return <ClockIcon className="w-8 h-8 text-gray-500" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white font-bold text-2xl sm:text-3xl">
                💰 Meu Banco de Horas
              </h1>
              <p className="text-blue-200 text-sm sm:text-base mt-1">
                Acompanhe suas horas extras e saldo de horas
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtro de Período */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Selecionar Período</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={fetchMyBankOfHours}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4" />
            Consultar Período
          </button>
        </div>

        {/* Resumo */}
        {summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                summary.totalBalance > 0 ? 'border-green-500' : 
                summary.totalBalance < 0 ? 'border-red-500' : 'border-gray-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Meu Saldo Total</p>
                    <p className={`text-2xl font-bold ${getBalanceColor(summary.totalBalance)}`}>
                      {formatHours(summary.totalBalance)}
                    </p>
                  </div>
                  {getBalanceIcon(summary.totalBalance)}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Créditos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatHours(summary.totalCredits)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Débitos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatHours(summary.totalDebts)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Dias de Folga</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {summary.daysFromBalance.toFixed(2)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Alertas */}
            {summary.totalBalance < 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <div>
                    <p className="font-semibold text-red-800">Atenção: Déficit de Horas</p>
                    <p className="text-sm text-red-700">
                      Você possui um déficit de {formatHours(summary.totalBalance)}. 
                      É necessário compensar essas horas ou justificar as ausências junto ao RH.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {summary.totalBalance > 0 && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
                  <div>
                    <p className="font-semibold text-green-800">Saldo Positivo</p>
                    <p className="text-sm text-green-700">
                      Você tem {formatHours(summary.totalBalance)} de horas extras disponíveis.
                      Isso equivale a aproximadamente {summary.daysFromBalance.toFixed(2)} dias de folga.
                      Entre em contato com o RH para verificar a conversão em folgas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico */}
            {entries.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Meu Histórico Diário</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Data</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Programado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Trabalhado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Saldo Dia</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Acumulado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">
                            {formatDateBR(entry.entryDate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {entry.scheduledHours.toFixed(2)}h
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {entry.workedHours.toFixed(2)}h
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(entry.balance)}`}>
                            {formatHours(entry.balance)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${getBalanceColor(entry.accumulatedBalance)}`}>
                            {formatHours(entry.accumulatedBalance)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {entry.type === 'credit' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Crédito
                              </span>
                            )}
                            {entry.type === 'debt' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3" />
                                Débito
                              </span>
                            )}
                            {entry.type === 'neutral' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <Clock className="w-3 h-3" />
                                Neutro
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function MyBankOfHoursPage() {
  return (
    <AuthProvider>
      <MyBankOfHoursContent />
    </AuthProvider>
  );
}
