'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calculator,
  Download,
  ArrowLeft,
  DollarSign,
  ClockIcon,
  Loader2
} from 'lucide-react';
import { formatDateBR } from '@/lib/timezone';

type BankEntry = {
  id: number;
  userId: number;
  entryDate: string;
  scheduledHours: number;
  workedHours: number;
  balance: number;
  accumulatedBalance: number;
  type: 'credit' | 'debt' | 'neutral';
  notes: string | null;
};

type Conversion = {
  id: number;
  userId: number;
  conversionDate: string;
  hoursConverted: number;
  daysEarned: number;
  type: string;
  notes: string | null;
};

type BankSummary = {
  totalBalance: number;
  totalCredits: number;
  totalDebts: number;
  daysFromBalance: number;
  daysEarned: number;
  totalHoursConverted: number;
  status: 'credit' | 'debt' | 'balanced';
};

function BankOfHoursContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [servers, setServers] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedServer, setSelectedServer] = useState<number | null>(null);
  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [summary, setSummary] = useState<BankSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  async function fetchServers() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setServers(data.users.filter((u: any) => u.role === 'server'));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchBankOfHours() {
    if (!selectedServer) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/bank-of-hours?userId=${selectedServer}&startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setConversions(data.conversions);
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function calculateBankOfHours() {
    if (!selectedServer) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/bank-of-hours?userId=${selectedServer}`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchBankOfHours();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function convertHoursToDays() {
    if (!selectedServer || !summary || summary.totalBalance <= 0) return;

    const hoursToConvert = prompt(
      `Quantas horas deseja converter em dias de folga?\n\nSaldo atual: ${summary.totalBalance.toFixed(2)}h\n(8h = 1 dia)`
    );

    if (!hoursToConvert) return;

    const hours = parseFloat(hoursToConvert);
    if (isNaN(hours) || hours <= 0) {
      alert('Valor inválido');
      return;
    }

    if (hours > summary.totalBalance) {
      alert(`Saldo insuficiente. Saldo atual: ${summary.totalBalance.toFixed(2)}h`);
      return;
    }

    const notes = prompt('Observações (opcional):') || '';

    setLoading(true);
    try {
      const res = await fetch(
        `/api/bank-of-hours?userId=${selectedServer}&hours=${hours}&notes=${encodeURIComponent(notes)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        await fetchBankOfHours();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao converter horas');
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
    if (balance > 0) return <TrendingUp className="w-4 h-4" />;
    if (balance < 0) return <TrendingDown className="w-4 h-4" />;
    return <ClockIcon className="w-4 h-4" />;
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
                <h1 className="text-white font-bold text-lg sm:text-xl">Banco de Horas</h1>
                <p className="text-slate-400 text-xs sm:text-sm">
                  Controle de horas extras e compensação
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seleção de Servidor */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Selecionar Servidor</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servidor
              </label>
              <select
                value={selectedServer || ''}
                onChange={(e) => setSelectedServer(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um servidor</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={fetchBankOfHours}
              disabled={!selectedServer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calendar className="w-4 h-4" />
              Consultar
            </button>
            <button
              onClick={calculateBankOfHours}
              disabled={!selectedServer}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calculator className="w-4 h-4" />
              Calcular Banco de Horas
            </button>
          </div>
        </div>

        {/* Resumo */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              summary.totalBalance > 0 ? 'border-green-500' : 
              summary.totalBalance < 0 ? 'border-red-500' : 'border-gray-500'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Saldo Total</p>
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
        )}

        {/* Ações */}
        {summary && summary.totalBalance > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Converter Horas em Folga</h3>
                <p className="text-sm text-gray-600">
                  Saldo disponível: <span className="font-bold text-green-600">{formatHours(summary.totalBalance)}</span>
                  {' '}= <span className="font-bold text-blue-600">{summary.daysFromBalance.toFixed(2)} dias</span>
                </p>
              </div>
              <button
                onClick={convertHoursToDays}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Download className="w-5 h-5" />
                Converter em Folga
              </button>
            </div>
          </div>
        )}

        {/* Alertas */}
        {summary && summary.totalBalance < 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <p className="font-semibold text-red-800">Atenção: Déficit de Horas</p>
                <p className="text-sm text-red-700">
                  O servidor possui um déficit de {formatHours(summary.totalBalance)}. 
                  É necessário compensar essas horas ou justificar as ausências.
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
              <h2 className="text-lg font-semibold">Histórico Diário</h2>
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

        {/* Conversões */}
        {conversions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Conversões em Dias de Folga</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Data</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Horas</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Dias</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {conversions.map((conv) => (
                    <tr key={conv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">
                        {formatDateBR(conv.conversionDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {conv.hoursConverted.toFixed(2)}h
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                        {conv.daysEarned.toFixed(2)} dias
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {conv.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!selectedServer && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Selecione um servidor para visualizar o banco de horas
            </h3>
            <p className="text-sm text-slate-500">
              Escolha um servidor no seletor acima para consultar o histórico e saldo de horas
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BankOfHoursPage() {
  return (
    <AuthProvider>
      <BankOfHoursContent />
    </AuthProvider>
  );
}
