'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { formatDateBR } from '@/lib/timezone';

type ServerJourney = {
  userId: number;
  userName: string;
  userRegistration: string | null;
  userPosition: string | null;
  weekly: {
    expectedHours: number;
    workedHours: number;
    balance: number;
    completed: boolean;
  };
  daily: {
    expectedHours: number;
  };
  dailyBreakdown: Array<{
    date: string;
    weekday: number;
    weekdayName: string;
    hoursWorked: number;
    expectedHours: number;
    completed: boolean;
    hasEntry: boolean;
  }>;
};

function JourneyContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [serversJourney, setServersJourney] = useState<ServerJourney[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchAllServersJourney();
    }
  }, [user]);

  async function fetchAllServersJourney() {
    setLoading(true);
    try {
      // Buscar todos os servidores
      const serversRes = await fetch('/api/employees');
      if (!serversRes.ok) throw new Error('Erro ao buscar servidores');
      const serversData = await serversRes.json();
      const activeServers = serversData.users.filter((s: any) => s.role === 'server' && s.active);

      // Buscar jornada de cada servidor
      const journeys: ServerJourney[] = [];
      for (const server of activeServers) {
        const journeyRes = await fetch(`/api/journey?userId=${server.id}`);
        if (journeyRes.ok) {
          const journeyData = await journeyRes.json();
          journeys.push({
            userId: server.id,
            userName: server.name,
            userRegistration: server.registration,
            userPosition: server.position,
            weekly: journeyData.weekly,
            daily: journeyData.daily,
            dailyBreakdown: journeyData.dailyBreakdown,
          });
        }
      }

      setServersJourney(journeys);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Estatísticas gerais
  const totalServers = serversJourney.length;
  const completedWeekly = serversJourney.filter((s) => s.weekly.completed).length;
  const pendingWeekly = totalServers - completedWeekly;
  const totalExpectedHours = serversJourney.reduce((sum, s) => sum + s.weekly.expectedHours, 0);
  const totalWorkedHours = serversJourney.reduce((sum, s) => sum + s.weekly.workedHours, 0);
  const totalBalance = Math.round((totalWorkedHours - totalExpectedHours) * 100) / 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/rh')}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl">Jornada Semanal - Todos os Servidores</h1>
              <p className="text-slate-400 text-xs sm:text-sm">Acompanhamento de cumprimento de jornada</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
              <span className="text-xs text-slate-500">Jornada Cumprida</span>
            </div>
            <p className="text-3xl font-bold text-green-700">{completedWeekly}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Jornada Pendente</span>
            </div>
            <p className="text-3xl font-bold text-red-700">{pendingWeekly}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">Horas Trabalhadas</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{Math.round(totalWorkedHours)}h</p>
            <p className="text-xs text-slate-500">de {totalExpectedHours}h esperadas</p>
          </div>

          <div className={`rounded-2xl shadow-sm border p-5 ${
            totalBalance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                totalBalance >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-600">Saldo Geral</span>
            </div>
            <p className={`text-2xl font-bold ${
              totalBalance >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {totalBalance > 0 ? '+' : ''}{totalBalance}h
            </p>
          </div>
        </div>

        {/* Lista de Servidores */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Detalhamento por Servidor</h2>
          <div className="space-y-3">
            {serversJourney.map((journey) => (
              <div
                key={journey.userId}
                className={`border-2 rounded-xl p-4 ${
                  journey.weekly.completed
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{journey.userName}</p>
                    <p className="text-xs text-slate-500">
                      {journey.userPosition} {journey.userRegistration && `· ${journey.userRegistration}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {journey.weekly.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Esperado</p>
                    <p className="font-semibold text-slate-900">{journey.weekly.expectedHours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Trabalhado</p>
                    <p className="font-semibold text-slate-900">{journey.weekly.workedHours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Saldo</p>
                    <p className={`font-semibold ${
                      journey.weekly.balance >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {journey.weekly.balance > 0 ? '+' : ''}{journey.weekly.balance}h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p className={`font-semibold ${
                      journey.weekly.completed ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {journey.weekly.completed ? '✓ Cumprido' : '✗ Pendente'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function JourneyPage() {
  return (
    <AuthProvider>
      <JourneyContent />
    </AuthProvider>
  );
}
