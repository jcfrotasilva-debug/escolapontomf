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
} from 'lucide-react';
import { getCurrentBrazilDate, getCurrentBrazilTime, formatTimeInBrazil } from '@/lib/timezone';

type ServerStatus = {
  id: number;
  name: string;
  position: string | null;
  registration: string | null;
  department: string | null;
  registered: boolean;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
};

function MonitoringContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getCurrentBrazilTime());
  const [currentDate, setCurrentDate] = useState(getCurrentBrazilDate());
  const [filter, setFilter] = useState<'all' | 'registered' | 'not_registered'>('all');

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

  // Atualizar relógio a cada segundo
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

      const serverStatus: ServerStatus[] = data.monitoring.map((m: any) => ({
        id: m.id,
        name: m.name,
        position: m.position,
        registration: m.registration,
        department: m.department,
        registered: m.hasAnyRecord,
        checkIn: m.checkIn,
        lunchOut: m.lunchOut,
        lunchIn: m.lunchIn,
        checkOut: m.checkOut,
      }));

      setServers(serverStatus);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredServers = servers.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'registered') return s.registered;
    if (filter === 'not_registered') return !s.registered;
    return true;
  });

  const totalServers = servers.length;
  const registeredCount = servers.filter((s) => s.registered).length;
  const notRegisteredCount = servers.filter((s) => !s.registered).length;
  const percentage = totalServers > 0 ? Math.round((registeredCount / totalServers) * 100) : 0;

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
                <h1 className="text-white font-bold text-lg sm:text-xl">Monitoramento de Registros</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Acompanhamento em tempo real dos registros de ponto</p>
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
              <div className="font-mono text-5xl font-bold bg-gradient-to-br from-blue-700 to-indigo-800 bg-clip-text text-transparent tracking-tight">
                {currentTime}
              </div>
              <p className="text-xs text-slate-400 mt-1">Horário oficial do Brasil</p>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <span className="text-xs text-slate-500">Registraram Ponto</span>
            </div>
            <p className="text-3xl font-bold text-green-700">{registeredCount}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white">
                <XCircle className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Não Registraram</span>
            </div>
            <p className="text-3xl font-bold text-red-700">{notRegisteredCount}</p>
          </div>

          <div className={`rounded-2xl shadow-sm border p-5 ${
            percentage >= 80 ? 'bg-green-50 border-green-200' :
            percentage >= 50 ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                percentage >= 80 ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                percentage >= 50 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-600">Taxa de Registro</span>
            </div>
            <p className={`text-3xl font-bold ${
              percentage >= 80 ? 'text-green-700' :
              percentage >= 50 ? 'text-yellow-700' :
              'text-red-700'
            }`}>
              {percentage}%
            </p>
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
            onClick={() => setFilter('registered')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
              filter === 'registered' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Registraram ({registeredCount})
          </button>
          <button
            onClick={() => setFilter('not_registered')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2 ${
              filter === 'not_registered' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Não Registraram ({notRegisteredCount})
          </button>
        </div>

        {/* Lista de Servidores */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Status dos Servidores</h2>
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
                    !server.registered ? 'bg-red-50' : ''
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    server.registered
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                      : 'bg-gradient-to-br from-red-500 to-rose-600'
                  }`}>
                    {server.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{server.name}</p>
                      {server.registered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">
                          <CheckCircle2 className="w-3 h-3" />
                          REGISTROU
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 animate-pulse">
                          <XCircle className="w-3 h-3" />
                          NÃO REGISTROU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {server.position} {server.registration && `· Matrícula: ${server.registration}`}
                    </p>
                    {server.registered && (
                      <div className="flex gap-3 mt-2 text-[10px] text-slate-600">
                        <span>E: {formatTimeInBrazil(server.checkIn)}</span>
                        <span>SA: {formatTimeInBrazil(server.lunchOut)}</span>
                        <span>RA: {formatTimeInBrazil(server.lunchIn)}</span>
                        <span>S: {formatTimeInBrazil(server.checkOut)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerta */}
        {notRegisteredCount > 0 && (
          <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-1">Atenção!</h3>
                <p className="text-sm text-red-800">
                  {notRegisteredCount} servidor(es) ainda não registraram ponto hoje. 
                  Entre em contato para verificar o motivo.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <AuthProvider>
      <MonitoringContent />
    </AuthProvider>
  );
}
