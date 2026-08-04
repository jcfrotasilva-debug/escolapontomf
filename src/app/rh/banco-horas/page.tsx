'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calendar,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

export default function RHBancoHorasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bankData, setBankData] = useState<any>(null);

  useEffect(() => {
    // Data inicial: 30 dias atrás
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);

    if (user) {
      fetchServers();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchServers();
    }
  }, [user]);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/users?role=server');
      const data = await res.json();
      setServers(data.users || []);
    } catch (error) {
      console.error('Erro ao buscar servidores:', error);
    }
  };

  const fetchBankData = async () => {
    if (!selectedServer || !startDate || !endDate) {
      alert('Selecione um servidor e o período');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/bank-of-hours?userId=${selectedServer}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      setBankData(data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      alert('Erro ao buscar dados do banco de horas');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!bankData || bankData.summary.totalBalance <= 0) {
      alert('Servidor não possui saldo positivo para converter');
      return;
    }

    const hoursToConvert = prompt(
      `Quantas horas deseja converter?\n\nSaldo disponível: ${formatHours(bankData.summary.totalBalance)}`
    );

    if (!hoursToConvert) return;

    const hours = parseFloat(hoursToConvert);
    if (isNaN(hours) || hours <= 0) {
      alert('Valor inválido');
      return;
    }

    if (hours > bankData.summary.totalBalance) {
      alert(`Saldo insuficiente. Saldo disponível: ${formatHours(bankData.summary.totalBalance)}`);
      return;
    }

    try {
      const res = await fetch(
        `/api/bank-of-hours/convert?userId=${selectedServer}&hours=${hours}`,
        { method: 'POST' }
      );
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchBankData();
      } else {
        alert(data.error || 'Erro ao converter horas');
      }
    } catch (error) {
      console.error('Erro ao converter:', error);
      alert('Erro ao converter horas');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            💰 Banco de Horas - RH
          </h1>
          <p className="text-slate-600">
            Gerencie o banco de horas dos servidores
          </p>
        </div>

        {/* Seleção e Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Consulta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Servidor
              </label>
              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um servidor</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={fetchBankData}
            disabled={loading || !selectedServer}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DollarSign className="w-4 h-4" />
            )}
            Consultar Banco de Horas
          </button>
        </div>

        {/* Resultados */}
        {bankData && (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className={`bg-white rounded-xl shadow-sm border-l-4 p-6 ${
                bankData.summary.totalBalance > 0 ? 'border-l-green-500' :
                bankData.summary.totalBalance < 0 ? 'border-l-red-500' : 'border-l-gray-500'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Saldo Total</p>
                    <p className={`text-2xl font-bold ${
                      bankData.summary.totalBalance > 0 ? 'text-green-600' :
                      bankData.summary.totalBalance < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatHours(bankData.summary.totalBalance)}
                    </p>
                  </div>
                  {bankData.summary.totalBalance > 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  ) : bankData.summary.totalBalance < 0 ? (
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  ) : (
                    <Clock className="w-8 h-8 text-gray-500" />
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-green-500 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Créditos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatHours(bankData.summary.totalCredits)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-red-500 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Débitos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatHours(bankData.summary.totalDebts)}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Dias de Folga</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {bankData.summary.daysFromBalance.toFixed(2)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Botão Converter */}
            {bankData.summary.totalBalance > 0 && (
              <div className="bg-green-50 border-l-4 border-l-green-500 p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">
                      Converter Horas em Folga
                    </h3>
                    <p className="text-green-700 mb-4">
                      Saldo disponível: <strong>{formatHours(bankData.summary.totalBalance)}</strong>
                      {' '}= <strong>{bankData.summary.daysFromBalance.toFixed(2)} dias de folga</strong>
                    </p>
                  </div>
                  <button
                    onClick={handleConvert}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Converter em Folga
                  </button>
                </div>
              </div>
            )}

            {/* Alertas */}
            {bankData.summary.totalBalance < 0 && (
              <div className="bg-red-50 border-l-4 border-l-red-500 p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">
                      Atenção: Déficit de Horas
                    </h3>
                    <p className="text-red-700">
                      O servidor possui um déficit de {formatHours(bankData.summary.totalBalance)}.
                      É necessário compensar essas horas ou justificar as ausências.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Histórico Diário
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Data
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        Programado
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        Trabalhado
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        Saldo
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        Acumulado
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bankData.entries.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {formatDateBR(entry.entryDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-900">
                          {entry.scheduledHours.toFixed(2)}h
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-900">
                          {entry.workedHours.toFixed(2)}h
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${
                          entry.balance > 0 ? 'text-green-600' :
                          entry.balance < 0 ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {formatHours(entry.balance)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${
                          entry.accumulatedBalance > 0 ? 'text-green-600' :
                          entry.accumulatedBalance < 0 ? 'text-red-600' : 'text-slate-600'
                        }`}>
                          {formatHours(entry.accumulatedBalance)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            entry.type === 'credit' ? 'bg-green-100 text-green-800' :
                            entry.type === 'debt' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {entry.type === 'credit' && <CheckCircle2 className="w-3 h-3" />}
                            {entry.type === 'debt' && <XCircle className="w-3 h-3" />}
                            {entry.type === 'credit' ? 'Crédito' :
                             entry.type === 'debt' ? 'Débito' : 'Neutro'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatHours(hours: number): string {
  const sign = hours >= 0 ? '+' : '';
  const absHours = Math.abs(hours);
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  return `${sign}${h}h${m.toString().padStart(2, '0')}`;
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
