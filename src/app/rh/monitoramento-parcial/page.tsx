'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { getCurrentBrazilDate, getCurrentBrazilTime, formatTimeInBrazil, formatDateBR } from '@/lib/timezone';

type ServerStatus = {
  id: number;
  name: string;
  position: string | null;
  registration: string | null;
  department: string | null;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
  complete: boolean; // Todos os 4 registros
  partial: boolean; // Pelo menos 1 registro
  missing: string[]; // Registros faltantes
  isAbsent: boolean; // Está em afastamento
  absenceType: string | null; // Tipo de afastamento
  absenceStartDate: string | null;
  absenceEndDate: string | null;
};

function PartialMonitoringContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getCurrentBrazilTime());
  const [currentDate, setCurrentDate] = useState(getCurrentBrazilDate());
  const [filter, setFilter] = useState<'all' | 'complete' | 'partial' | 'none' | 'absent'>('all');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchStatus();
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentBrazilTime());
      setCurrentDate(getCurrentBrazilDate());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/monitoring');
      if (!res.ok) throw new Error('Erro ao buscar monitoramento');
      const data = await res.json();

      const serverStatus: ServerStatus[] = data.monitoring.map((m: any) => {
        const checkIn = m.checkIn || null;
        const lunchOut = m.lunchOut || null;
        const lunchIn = m.lunchIn || null;
        const checkOut = m.checkOut || null;
        
        const complete = !!(checkIn && lunchOut && lunchIn && checkOut);
        const partial = !!(checkIn || lunchOut || lunchIn || checkOut);
        
        const missing = [];
        if (!checkIn) missing.push('Entrada');
        if (!lunchOut) missing.push('Saída Almoço');
        if (!lunchIn) missing.push('Retorno Almoço');
        if (!checkOut) missing.push('Saída');
        
        return {
          id: m.id,
          name: m.name,
          position: m.position,
          registration: m.registration,
          department: m.department,
          checkIn,
          lunchOut,
          lunchIn,
          checkOut,
          complete,
          partial,
          missing,
          isAbsent: m.isAbsent || false,
          absenceType: m.absenceType || null,
          absenceStartDate: m.absenceStartDate || null,
          absenceEndDate: m.absenceEndDate || null,
        };
      });

      setServers(serverStatus);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredServers = servers.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'complete') return s.complete;
    if (filter === 'partial') return s.partial && !s.complete && !s.isAbsent;
    if (filter === 'none') return !s.partial && !s.isAbsent;
    if (filter === 'absent') return s.isAbsent;
    return true;
  });

  const totalServers = servers.length;
  const completeCount = servers.filter((s) => s.complete).length;
  const partialCount = servers.filter((s) => s.partial && !s.complete && !s.isAbsent).length;
  const absentCount = servers.filter((s) => s.isAbsent).length;
  const noneCount = servers.filter((s) => !s.partial && !s.isAbsent).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 shadow-xl border-b border-slate-700">
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
                <h1 className="text-white font-bold text-lg sm:text-xl">Monitoramento de Registros Parciais</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Acompanhamento detalhado dos registros incompletos</p>
              </div>
            </div>
            <button
              onClick={fetchStatus}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Data e Hora */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase mb-1">
                Data e Horário Atual
              </p>
              <p className="text-slate-800 text-sm capitalize">
                {new Date(`${currentDate}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="text-center">
              <div className="font-mono text-5xl font-bold bg-gradient-to-br from-purple-700 to-indigo-800 bg-clip-text text-transparent tracking-tight">
                {currentTime}
              </div>
              <p className="text-xs text-slate-400 mt-1">Horário oficial do Brasil</p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Total de Servidores</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalServers}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Registro Completo</span>
            </div>
            <p className="text-3xl font-bold text-green-700">{completeCount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Todos os 4 horários</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Em Afastamento</span>
            </div>
            <p className="text-3xl font-bold text-purple-700">{absentCount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Legalmente ausentes</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center text-white">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Registro Parcial</span>
            </div>
            <p className="text-3xl font-bold text-yellow-700">{partialCount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Alguns horários registrados</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white">
                <XCircle className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Sem Registro</span>
            </div>
            <p className="text-3xl font-bold text-red-700">{noneCount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Nenhum horário registrado</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalServers})
          </button>
          <button
            onClick={() => setFilter('complete')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
              filter === 'complete' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Completo ({completeCount})
          </button>
          <button
            onClick={() => setFilter('partial')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
              filter === 'partial' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Parcial ({partialCount})
          </button>
          <button
            onClick={() => setFilter('absent')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
              filter === 'absent' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Em Afastamento ({absentCount})
          </button>
          <button
            onClick={() => setFilter('none')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
              filter === 'none' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Nenhum ({noneCount})
          </button>
        </div>

        {/* Lista de Servidores */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Status Detalhado dos Servidores</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {filteredServers.length} servidor(es) encontrado(s)
            </p>
          </div>

          {filteredServers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum servidor encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredServers.map((server) => (
                <div
                  key={server.id}
                  className={`p-4 flex items-center gap-4 ${
                    server.isAbsent ? 'bg-purple-50/30' :
                    server.complete ? 'bg-green-50/30' :
                    server.partial ? 'bg-yellow-50/30' :
                    'bg-red-50/30'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    server.isAbsent
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                      : server.complete
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                      : server.partial
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                      : 'bg-gradient-to-br from-red-500 to-rose-600'
                  }`}>
                    {server.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{server.name}</p>
                      {server.isAbsent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                          <Users className="w-3 h-3" />
                          EM AFASTAMENTO: {server.absenceType}
                        </span>
                      ) : server.complete ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">
                          <CheckCircle2 className="w-3 h-3" />
                          COMPLETO
                        </span>
                      ) : server.partial ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                          <AlertCircle className="w-3 h-3" />
                          PARCIAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 animate-pulse">
                          <XCircle className="w-3 h-3" />
                          SEM REGISTRO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {server.position} {server.registration && `· Matrícula: ${server.registration}`}
                    </p>
                    
                    {/* Informações de afastamento */}
                    {server.isAbsent && (
                      <p className="text-[10px] text-purple-600 mt-1 font-medium">
                        Período: {formatDateBR(server.absenceStartDate)} a {formatDateBR(server.absenceEndDate)}
                      </p>
                    )}
                    
                    {/* Horários registrados */}
                    {!server.isAbsent && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        <div className={`text-center p-2 rounded-lg border ${
                          server.checkIn ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-[9px] font-bold text-slate-600">ENTRADA</p>
                          <p className={`text-sm font-mono font-bold ${
                            server.checkIn ? 'text-green-700' : 'text-slate-400'
                          }`}>
                            {server.checkIn ? formatTimeInBrazil(server.checkIn) : '—'}
                          </p>
                        </div>
                        <div className={`text-center p-2 rounded-lg border ${
                          server.lunchOut ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-[9px] font-bold text-slate-600">SAÍDA ALMOÇO</p>
                          <p className={`text-sm font-mono font-bold ${
                            server.lunchOut ? 'text-green-700' : 'text-slate-400'
                          }`}>
                            {server.lunchOut ? formatTimeInBrazil(server.lunchOut) : '—'}
                          </p>
                        </div>
                        <div className={`text-center p-2 rounded-lg border ${
                          server.lunchIn ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-[9px] font-bold text-slate-600">RETORNO</p>
                          <p className={`text-sm font-mono font-bold ${
                            server.lunchIn ? 'text-green-700' : 'text-slate-400'
                          }`}>
                            {server.lunchIn ? formatTimeInBrazil(server.lunchIn) : '—'}
                          </p>
                        </div>
                        <div className={`text-center p-2 rounded-lg border ${
                          server.checkOut ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="text-[9px] font-bold text-slate-600">SAÍDA</p>
                          <p className={`text-sm font-mono font-bold ${
                            server.checkOut ? 'text-green-700' : 'text-slate-400'
                          }`}>
                            {server.checkOut ? formatTimeInBrazil(server.checkOut) : '—'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Faltantes */}
                    {server.partial && !server.isAbsent && server.missing.length > 0 && (
                      <div className="mt-2 text-[10px] text-yellow-700 font-medium">
                        ⚠️ Faltando: {server.missing.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerta */}
        {(partialCount > 0 || noneCount > 0) && (
          <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">Atenção!</h3>
                <p className="text-sm text-yellow-800">
                  {partialCount > 0 && (
                    <>{partialCount} servidor(es) com registro parcial (presente, mas com horários faltantes). </>
                  )}
                  {noneCount > 0 && (
                    <>{noneCount} servidor(es) sem nenhum registro. </>
                  )}
                  Entre em contato para verificar o motivo e solicitar retificação se necessário.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PartialMonitoringPage() {
  return (
    <AuthProvider>
      <PartialMonitoringContent />
    </AuthProvider>
  );
}
