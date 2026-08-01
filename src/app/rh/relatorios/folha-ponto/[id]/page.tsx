'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Printer,
  Loader2,
} from 'lucide-react';
import { formatTimeInBrazil, formatDateBR, calculateWorkedHours, getCurrentBrazilDate } from '@/lib/timezone';

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type ReportData = {
  user: {
    id: number;
    name: string;
    position: string | null;
    registration: string | null;
    rg: string | null;
    workHours: number | null;
    regime: string | null;
    isStudentSchedule: boolean | null;
    department: string | null;
    admissionDate: string | null;
  };
  brasaoUrl: string | null;
  month: {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  entries: Array<{
    id: number;
    entryDate: string;
    checkIn: string | null;
    lunchOut: string | null;
    lunchIn: string | null;
    checkOut: string | null;
  }>;
  justifications: Array<{
    id: number;
    justificationDate: string;
    reason: string;
    status: string;
    reviewNotes: string | null;
    createdAt: string;
  }>;
  occurrences: Array<{
    id: number;
    occurrenceDate: string;
    type: string;
    name: string;
    scope: string;
  }>;
  absences: Array<{
    id: number;
    type: string;
    startDate: string;
    endDate: string;
    reason: string | null;
    documentRef: string | null;
  }>;
  schedules: Array<{
    id: number;
    weekday: number;
    checkInTime: string | null;
    lunchOutTime: string | null;
    lunchInTime: string | null;
    checkOutTime: string | null;
    isWorkday: boolean;
  }>;
  adjustments: Array<{
    id: number;
    entryDate: string;
    fieldAltered: string;
    newValue: string;
    reason: string;
    adjustmentType: string;
    adjustmentDate: string;
  }>;
  partialAbsenceJustifications: Array<{
    id: number;
    entryDate: string;
    missingHours: string;
    justificationType: string;
    justificationDescription: string;
    documentRef: string | null;
    isNonDiscountable: boolean;
  }>;
  days: Array<{
    date: string;
    weekday: number;
    weekdayName: string;
    entry: {
      id: number;
      entryDate: string;
      checkIn: string | null;
      lunchOut: string | null;
      lunchIn: string | null;
      checkOut: string | null;
    } | null;
    hasJustification: boolean;
    justification: {
      id: number;
      justificationDate: string;
      reason: string;
      status: string;
      reviewNotes: string | null;
      createdAt: string;
    } | null;
    occurrence: {
      id: number;
      occurrenceDate: string;
      type: string;
      name: string;
      scope: string;
    } | null;
    absence: {
      type: string;
      name: string;
      startDate: string;
      endDate: string;
    } | null;
  }>;
};

function DocumentHeader({ brasaoUrl }: { brasaoUrl: string | null }) {
  return (
    <div className="border-b-2 border-double border-slate-900 pb-2 mb-2">
      <div className="flex items-center">
        {/* Logo/Brasão à esquerda */}
        <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
          {brasaoUrl ? (
            <img src={brasaoUrl} alt="Brasão" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-full h-full border-2 border-slate-900 rounded flex items-center justify-center bg-slate-50">
              <div className="text-center px-1">
                <div className="text-[7px] font-bold text-slate-700 leading-tight">BRASÃO<br />DA<br />ESCOLA</div>
              </div>
            </div>
          )}
        </div>

        {/* Textos centralizados */}
        <div className="flex-1 text-center">
          <p className="text-[10px] text-slate-800 font-bold uppercase tracking-wider leading-tight">
            GOVERNO DO ESTADO DE SÃO PAULO
          </p>
          <p className="text-[10px] text-slate-800 font-bold uppercase tracking-wider leading-tight">
            SECRETARIA DE ESTADO DA EDUCAÇÃO
          </p>
          <div className="my-1 w-24 h-[1.5px] bg-slate-900 mx-auto"></div>
          <h1 className="text-[12px] font-bold text-slate-900 uppercase tracking-wider leading-tight">
            EE PROFA. MARLENE FRATTINI
          </h1>
        </div>

        {/* Espaço vazio à direita para balancear visualmente */}
        <div className="w-20 h-20 flex-shrink-0"></div>
      </div>
    </div>
  );
}

function FolhaPontoContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Valores ESTÁVEIS - calculados uma única vez
  const serverId = Number(params.id);
  const initialMonth = searchParams.get('month') || 
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(initialMonth);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  // Efeito simples para autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user]);

  // Resetar flag quando o mês mudar
  useEffect(() => {
    setHasFetched(false);
  }, [month]);

  // Efeito simples para buscar dados
  useEffect(() => {
    if (hasFetched || !user || !serverId || !month) return;
    
    setHasFetched(true);
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/reports/monthly?userId=${serverId}&month=${month}`);
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        } else {
          console.error('Erro ao carregar relatório:', res.status);
        }
      } catch (e) {
        console.error('Erro ao buscar relatório:', e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, serverId, month, hasFetched]);

  function handlePrint() {
    window.print();
  }

  if (loading || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calcular totais
  const totalEntries = report.entries.length;
  let totalWorkedMinutes = 0;
  report.entries.forEach((e) => {
    if (!e.checkIn || !e.checkOut) return;
    const toMin = (iso: string) => {
      const d = new Date(iso);
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(d);
      const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
      const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
      return h * 60 + m;
    };
    let mins = toMin(e.checkOut) - toMin(e.checkIn);
    if (e.lunchOut && e.lunchIn) {
      mins -= (toMin(e.lunchIn) - toMin(e.lunchOut));
    }
    if (mins > 0) totalWorkedMinutes += mins;
  });
  const totalHours = Math.floor(totalWorkedMinutes / 60);
  const totalMins = totalWorkedMinutes % 60;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Barra de controle (não imprime) */}
      <div className="bg-white border-b border-slate-200 shadow-sm print:hidden sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePrint}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* ====== FRENTE: Folha Ponto ====== */}
      <div className="max-w-5xl mx-auto p-1 print:p-0">
        <div className="bg-white shadow-lg print:shadow-none print-page print:pb-0">
          {/* Cabeçalho */}
          <DocumentHeader brasaoUrl={report.brasaoUrl} />

          {/* Título do documento */}
          <div className="text-center mb-0.5">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Folha de Ponto Mensal</h2>
            <p className="text-[8px] text-slate-600">
              Referência: <strong className="text-slate-900">{MONTH_NAMES[report.month.month - 1]} de {report.month.year}</strong>
            </p>
          </div>

          {/* Dados do servidor */}
          <div className="border border-slate-900 rounded p-1.5 mb-1.5">
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
              <div>
                <span className="font-bold text-slate-900">SERVIDOR:</span>{' '}
                <span className="text-slate-700">{report.user.name}</span>
                {report.user.registration && <span className="ml-2 text-slate-600">RG: {report.user.registration}</span>}
              </div>
              <div>
                <span className="font-bold text-slate-900">CARGO/FUNÇÃO:</span>{' '}
                <span className="text-slate-700">{report.user.position || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">JORNADA DE TRABALHO:</span>{' '}
                <span className="text-slate-700">{report.user.workHours || 40}:00 Horas</span>
                <span className="ml-2 font-bold text-slate-900">REGIME:</span>{' '}
                <span className="text-slate-700">{report.user.regime || '—'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">HORÁRIO DE ESTUDANTE:</span>{' '}
                <span className="text-slate-700">{report.user.isStudentSchedule ? 'Sim' : 'Não'}</span>
              </div>
            </div>
          </div>

          {/* Horário de trabalho */}
          <div className="border border-slate-900 rounded p-1.5 mb-1.5 bg-slate-50">
            <h3 className="text-[9px] font-bold text-slate-800 uppercase tracking-wider mb-1">HORÁRIO DE TRABALHO</h3>
            <div className="text-[9px] text-slate-700">
              {(() => {
                const schedules = report.schedules || [];
                const workingDays = schedules.filter((s: any) => s.isWorkday);
                if (workingDays.length === 0) {
                  return 'Nenhum horário cadastrado';
                }
                
                // Função para formatar horário no formato HH:MM:SS ou HH:MM
                const formatTimeValue = (time: string | null): string => {
                  if (!time) return '--:--';
                  // Extrair HH:MM de "HH:MM:SS" ou "HH:MM"
                  const parts = time.split(':');
                  if (parts.length >= 2) {
                    return `${parts[0]}:${parts[1]}`;
                  }
                  return time;
                };
                
                // Agrupar por horário
                const timeGroups: Record<string, number[]> = {};
                workingDays.forEach((s: any) => {
                  const timeKey = `${formatTimeValue(s.checkInTime)} às ${formatTimeValue(s.checkOutTime)}`;
                  if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
                  timeGroups[timeKey].push(s.weekday);
                });
                
                const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                const scheduleText = Object.entries(timeGroups).map(([time, days]) => {
                  const dayList = days.map((d: number) => dayNames[d]).join(', ');
                  return `${dayList} (${time})`;
                }).join(' / ');
                
                // Adicionar horário de almoço se houver
                const lunchGroups: Record<string, number[]> = {};
                workingDays
                  .filter((s: any) => s.lunchOutTime && s.lunchInTime)
                  .forEach((s: any) => {
                    const lunchTime = `${formatTimeValue(s.lunchOutTime)} às ${formatTimeValue(s.lunchInTime)}`;
                    if (!lunchGroups[lunchTime]) lunchGroups[lunchTime] = [];
                    lunchGroups[lunchTime].push(s.weekday);
                  });
                
                const lunchText = Object.entries(lunchGroups).map(([time, days]) => {
                  const dayList = days.map((d: number) => dayNames[d]).join(', ');
                  return `${dayList} (${time})`;
                }).join(' / ');
                
                let result = scheduleText;
                if (lunchText.length > 0) {
                  result += `\nINTERVALO DE ALMOÇO: ${lunchText}`;
                }
                
                return result;
              })()}
            </div>
            <div className="text-[8px] text-slate-600 mt-1">
              <span className="font-bold">PERÍODO:</span>{' '}
              {formatDateBR(report.month.startDate)} a {formatDateBR(report.month.endDate)}
            </div>
          </div>

          {/* Tabela de registros */}
          <div className="mb-1">
            <h3 className="text-[7px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
              Registros Diários de Ponto
            </h3>
            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-700 px-1 py-0.5 text-center font-semibold min-w-[20px]">Dia</th>
                  <th className="border border-slate-700 px-1 py-0.5 text-center font-semibold min-w-[30px]">D.S.</th>
                  <th className="border border-slate-700 px-1 py-0.5 text-center font-semibold min-w-[50px]">Entrada</th>
                  <th className="border border-slate-700 px-1 py-0.5 text-center font-semibold min-w-[50px]">S.Almoço</th>
                  <th className="border border-slate-700 px-1 py-0.5 text-center font-semibold min-w-[50px]">Retorno</th>
                  <th className="border border-slate-700 px-1 py-0.5 text-center font-semibold min-w-[50px]">Saída</th>
                  <th className="border border-slate-700 px-1 py-0.5 text-center font-semibold">OBSERVAÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((day, idx) => {
                  const isWeekend = day.weekday === 0 || day.weekday === 6;
                  const hasEntry = !!day.entry;
                  const hasJustif = !!day.justification;
                  const hasOccurrence = !!day.occurrence;
                  const hasAbsence = !!day.absence;
                  const dayAdjustments = (report.adjustments || []).filter((adj: any) => adj.entryDate === day.date);
                  const hasAdjustment = dayAdjustments.length > 0;
                  const rowBg = hasOccurrence ? 'bg-orange-50' : hasAbsence ? 'bg-purple-50' : hasAdjustment ? 'bg-cyan-50' : isWeekend ? 'bg-slate-50' : hasEntry ? '' : hasJustif ? 'bg-yellow-50' : 'bg-red-50';

                  let obs = '';
                  if (hasOccurrence) {
                    const occName = day.occurrence?.type === 'holiday' ? '🎉 Feriado' : day.occurrence?.type === 'optional_point' ? '⚠️ Ponto Facultativo' : '🏫 Dia sem Aula';
                    obs = `${occName}: ${day.occurrence?.name}`;
                  } else if (hasAbsence) {
                    obs = `🚫 ${day.absence?.name}`;
                  } else if (hasAdjustment) {
                    const fields = dayAdjustments.map((adj: any) => {
                      const labels: Record<string, string> = {
                        checkIn: 'E',
                        lunchOut: 'SA',
                        lunchIn: 'RA',
                        checkOut: 'S',
                      };
                      return labels[adj.fieldAltered] || adj.fieldAltered;
                    });
                    obs = `📝 Retificado: ${fields.join(', ')}`;
                  } else if (isWeekend) {
                    obs = 'Fim de semana';
                  } else if (hasJustif) {
                    const statusTxt = day.justification?.status === 'approved' ? 'Aprovada' : day.justification?.status === 'rejected' ? 'Rejeitada' : 'Pendente';
                    const requestedAt = day.justification?.createdAt
                      ? new Date(day.justification!.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
                      : '';
                    obs = `Justif. ${statusTxt}${requestedAt ? ` (solic. ${requestedAt})` : ''}`;
                  } else if (!hasEntry) {
                    obs = 'Sem registro';
                  }

                  return (
                    <tr key={day.date} className={rowBg}>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-semibold text-[8px]">{day.date.slice(8, 10)}</td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center text-[8px]">{WEEKDAY_SHORT[day.weekday]}</td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[8px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.checkIn) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[8px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.lunchOut) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[8px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.lunchIn) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[8px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.checkOut) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-[7px]">
                        {obs}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={7} className="border border-slate-700 px-2 py-1 text-right text-[8px]">
                    TOTAL DIAS: {totalEntries} · HORAS: {totalHours}h{String(totalMins).padStart(2, '0')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Resumo de ocorrências */}
          <div className="grid grid-cols-4 gap-0.5 mb-1 text-[8px]">
            <div className="border border-slate-300 rounded p-0.5 text-center">
              <p className="text-slate-500 font-medium">Trabalhados</p>
              <p className="text-xs font-bold text-green-700">{totalEntries}</p>
            </div>
            <div className="border border-slate-300 rounded p-0.5 text-center">
              <p className="text-slate-500 font-medium">Feriados</p>
              <p className="text-xs font-bold text-orange-700">{report.occurrences?.length || 0}</p>
            </div>
            <div className="border border-slate-300 rounded p-0.5 text-center">
              <p className="text-slate-500 font-medium">Afastado</p>
              <p className="text-xs font-bold text-purple-700">{report.days.filter(d => d.absence).length}</p>
            </div>
            <div className="border border-slate-300 rounded p-0.5 text-center">
              <p className="text-slate-500 font-medium">Justificativas</p>
              <p className="text-xs font-bold text-amber-700">{report.justifications.length}</p>
            </div>
          </div>

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="text-center">
              <div className="border-t border-slate-900 pt-1">
                <p className="text-[10px] font-bold text-slate-900">{report.user.name}</p>
                <p className="text-[9px] text-slate-600">{report.user.position || 'Servidor(a)'} · Matrícula: {report.user.registration || '—'}</p>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">Servidor(a)</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-900 pt-1">
                <p className="text-[10px] font-bold text-slate-900">____________________________________</p>
                <p className="text-[9px] text-slate-600">Diretor de Escola</p>
                <p className="text-[9px] text-slate-600">EE Profa. Marlene Frattini</p>
              </div>
            </div>
          </div>

          <div className="mt-1.5 text-center text-[8px] text-slate-500 border-t border-slate-200 pt-1">
            Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Sistema de Ponto Eletrônico EE Profa. Marlene Frattini
          </div>
        </div>

        {/* ====== VERSO: Justificativas e Ocorrências ====== */}
        <div className="bg-white shadow-lg print:shadow-none print-page mt-0 print:mt-0">
            {/* Cabeçalho */}
            <DocumentHeader brasaoUrl={report.brasaoUrl} />

            <div className="text-center mb-1.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                {report.justifications.length > 0 ? 'Justificativas de Ausência' : 'Registro de Ocorrências'}
              </h2>
              <p className="text-[8px] text-slate-600">
                Anexo à Folha de Ponto · {MONTH_NAMES[report.month.month - 1]} de {report.month.year}
              </p>
            </div>

            <div className="border border-slate-900 rounded p-1.5 mb-2">
              <h3 className="text-[7px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">Servidor</h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px]">
                <div>
                  <span className="text-slate-600 font-medium">Nome: </span>
                  <span className="font-bold text-slate-900">{report.user.name}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Matrícula: </span>
                  <span className="font-bold text-slate-900">{report.user.registration || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Cargo: </span>
                  <span className="font-bold text-slate-900">{report.user.position || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Justificativas: </span>
                  <span className="font-bold text-slate-900">{report.justifications.length}</span>
                </div>
              </div>
            </div>

            {/* Todas as ocorrências do período */}
            <div className="space-y-2">
              {/* Retificações aprovadas */}
              {(report.adjustments || []).length > 0 && (
                <div className="border-2 border-cyan-300 rounded-lg p-2">
                  <h3 className="text-[8px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    📝 Retificações Aprovadas no Período
                  </h3>
                  <ul className="space-y-1 text-[9px]">
                    {(report.adjustments || []).map((adj: any) => (
                      <li key={adj.id} className="flex items-start gap-1.5 pb-1 border-b border-cyan-100 last:border-b-0 last:pb-0">
                        <span className="font-bold">{formatDateBR(adj.entryDate)}</span>
                        <span className="text-slate-500">—</span>
                        <span>
                          {adj.fieldAltered === 'checkIn' && '🟢 Entrada'}
                          {adj.fieldAltered === 'lunchOut' && '🟡 Saída Almoço'}
                          {adj.fieldAltered === 'lunchIn' && '🟠 Retorno Almoço'}
                          {adj.fieldAltered === 'checkOut' && '🔴 Saída'}
                        </span>
                        <span>para</span>
                        <span className="font-mono font-semibold">{formatTimeInBrazil(adj.newValue)}</span>
                        {adj.adjustmentType === 'hr_direct' && (
                          <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded">RH</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ausências Parciais */}
              {report.entries.some((e: any) => e.partialAbsence) && (
                <div className="border-2 border-pink-300 rounded-lg p-2 mb-2">
                  <h3 className="text-[8px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ⚕️ Ausências Parciais no Período
                  </h3>
                  <ul className="space-y-1 text-[9px]">
                    {report.entries
                      .filter((e: any) => e.partialAbsence)
                      .map((e: any) => (
                        <li key={e.id} className="flex items-start gap-1 pb-1 border-b border-pink-100 last:border-b-0 last:pb-0">
                          <span className="font-bold">{formatDateBR(e.entryDate)}</span>
                          <span className="text-slate-500">—</span>
                          <span>{e.partialAbsenceType || 'Ausência'}</span>
                          <span className="text-slate-500">({e.partialAbsenceDuration})</span>
                          <span className="text-slate-500">— {e.partialAbsencePeriod}</span>
                          {e.partialAbsenceDescription && (
                            <span className="text-slate-500">: {e.partialAbsenceDescription}</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Justificativas de Ausências Parciais (RH) */}
              {(report.partialAbsenceJustifications || []).length > 0 && (
                <div className="border-2 border-green-300 rounded-lg p-2 mb-2">
                  <h3 className="text-[8px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ✅ Justificativas de Ausências Parciais (Não Descontáveis)
                  </h3>
                  <ul className="space-y-1 text-[9px]">
                    {(report.partialAbsenceJustifications || []).map((just: any) => (
                      <li key={just.id} className="flex items-start gap-1 pb-1 border-b border-green-100 last:border-b-0 last:pb-0">
                        <span className="font-bold">{formatDateBR(just.entryDate)}</span>
                        <span className="text-slate-500">—</span>
                        <span>{just.missingHours} faltantes</span>
                        <span className="text-slate-500">—</span>
                        <span>{just.justificationType === 'medical' ? '🏥 Médica' : just.justificationType === 'personal' ? '👤 Pessoal' : just.justificationType === 'family' ? '👨‍👩‍👧 Familiar' : '📝 Outro'}</span>
                        {just.isNonDiscountable && (
                          <span className="text-green-700 font-bold">— Não Descontável</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Justificativas */}
              {report.justifications.length > 0 && (
                <div className="space-y-2">
                  {report.justifications.map((j, idx) => {
                    const absenceDate = new Date(`${j.justificationDate}T12:00:00-03:00`);
                    const createdAtDate = new Date(j.createdAt);
                    return (
                      <div key={j.id} className="border-2 border-slate-300 rounded-lg p-2">
                        <div className="flex items-start justify-between mb-1.5 pb-1.5 border-b border-slate-200">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-slate-900 text-xs mb-0.5">
                                Ausência no dia {formatDateBR(j.justificationDate)} ({WEEKDAY_FULL[absenceDate.getDay()]})
                              </p>
                              <div className="grid grid-cols-2 gap-1 text-[8px]">
                                <div className="bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
                                  <p className="text-amber-700 font-semibold">📅 Data AUSÊNCIA</p>
                                  <p className="text-amber-900 font-bold">
                                    {formatDateBR(j.justificationDate)} (ontem)
                                  </p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded px-1 py-0.5">
                                  <p className="text-blue-700 font-semibold">✍️ Data SOLICITAÇÃO</p>
                                  <p className="text-blue-900 font-bold">
                                    {createdAtDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })} (hoje)
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                            j.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300'
                            : j.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}>
                            {j.status === 'approved' ? '✓ APROVADA' : j.status === 'rejected' ? '✗ REJEITADA' : '⧗ EM ANÁLISE'}
                          </span>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-900 leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-200">
                            {j.reason}
                          </p>
                        </div>
                        {j.reviewNotes && (
                          <div className="mt-1.5">
                            <p className="text-[8px] font-bold text-slate-600 uppercase mb-0.5">Obs. RH:</p>
                            <p className="text-[9px] text-slate-900 leading-relaxed bg-blue-50 p-1.5 rounded border border-blue-200">
                              {j.reviewNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Feriados e Ocorrências */}
              {report.occurrences.length > 0 && (
                <div className="border-2 border-orange-300 rounded-lg p-2">
                  <h3 className="text-[8px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    🎉 Feriados e Ocorrências
                  </h3>
                  <ul className="space-y-0.5 text-[9px]">
                    {report.occurrences.map((o) => (
                      <li key={o.id} className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold">{formatDateBR(o.occurrenceDate)}</span>
                        <span className="text-slate-500">—</span>
                        <span>{o.type === 'holiday' ? '🎉 Feriado' : o.type === 'optional_point' ? '⚠️ Ponto Facultativo' : '🏫 Dia sem Aula'}</span>
                        <span className="font-semibold">: {o.name}</span>
                        <span className="text-[8px] text-slate-500">({o.scope === 'national' ? 'Nacional' : o.scope === 'state' ? 'Estadual' : o.scope === 'municipal' ? 'Municipal' : 'Escolar'})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Afastamentos */}
              {report.absences.length > 0 && (
                <div className="border-2 border-purple-300 rounded-lg p-2">
                  <h3 className="text-[8px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    🚫 Afastamentos (impedido de registrar ponto)
                  </h3>
                  <ul className="space-y-0.5 text-[9px]">
                    {report.absences.map((a) => {
                      const nameMap: Record<string, string> = {
                        vacation: 'Férias',
                        medical_leave: 'Licença Médica',
                        maternity_leave: 'Licença Maternidade',
                        paternity_leave: 'Licença Paternidade',
                        bereavement_leave: 'Licença Nojo',
                        marriage_leave: 'Licença Casamento',
                        technical_orientation: 'Orientação Técnica',
                        school_recess: 'Recesso Escolar',
                        bank_withdrawal: 'Retirada Bancária',
                        other: 'Afastamento',
                      };
                      return (
                        <li key={a.id} className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold">🚫 {nameMap[a.type] || 'Afastamento'}</span>
                          <span>{formatDateBR(a.startDate)} a {formatDateBR(a.endDate)}</span>
                          {a.documentRef && <span className="text-[8px] text-slate-500">(Doc: {a.documentRef})</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Assinaturas - apenas quando há justificativas */}
            {report.justifications.length > 0 && (
              <div className="grid grid-cols-2 gap-6 mt-4 pt-3">
                <div className="text-center">
                  <div className="border-t border-slate-900 pt-1">
                    <p className="text-[10px] font-bold text-slate-900">____________________________________</p>
                    <p className="text-[9px] text-slate-600">Diretor de Escola</p>
                    <p className="text-[9px] text-slate-600">EE Profa. Marlene Frattini</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-900 pt-1">
                    <p className="text-[10px] font-bold text-slate-900">____________________________________</p>
                    <p className="text-[9px] text-slate-600">Responsável pelo RH</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 text-center text-[8px] text-slate-500 border-t border-slate-200 pt-1.5">
              Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Sistema de Ponto Eletrônico EE Profa. Marlene Frattini
            </div>
        </div>
      </div>

      {/* CSS de impressão */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default function FolhaPontoPage() {
  return (
    <AuthProvider>
      <FolhaPontoContent />
    </AuthProvider>
  );
}
