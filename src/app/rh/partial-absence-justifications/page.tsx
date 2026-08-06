'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Shield,
  Loader2,
  X,
} from 'lucide-react';
import { formatDateBR } from '@/lib/timezone';

type PartialAbsenceJustification = {
  id: number;
  timeEntryId: number;
  userId: number;
  entryDate: string;
  missingHours: string;
  justificationType: string;
  justificationDescription: string;
  documentRef: string | null;
  justifiedById: number | null;
  justifiedDate: string;
  isNonDiscountable: boolean;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userRegistration: string | null;
};

type ServerUser = {
  id: number;
  name: string;
  role: string;
};

function PartialAbsenceJustificationsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [justifications, setJustifications] = useState<PartialAbsenceJustification[]>([]);
  const [servers, setServers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchJustifications();
      fetchServers();
    }
  }, [user, month]);

  async function fetchJustifications() {
    setLoading(true);
    try {
      const res = await fetch(`/api/partial-absence-justifications?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setJustifications(data.justifications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchServers() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setServers(data.users.filter((u: ServerUser) => u.role === 'server'));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteJustification(id: number) {
    if (!confirm('Deseja realmente remover esta justificativa?')) return;

    try {
      const res = await fetch(`/api/partial-absence-justifications?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchJustifications();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const justificationTypeLabels: Record<string, string> = {
    medical: '🏥 Médica',
    personal: '👤 Pessoal',
    family: '👨‍👩‍👧 Familiar',
    other: '📝 Outro',
  };

  return (
    <div className="p-6">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Justificativas de Ausências Parciais</h1>
        <p className="text-slate-500 mt-1">Justifique horas faltantes para não serem descontadas do pagamento</p>
      </div>

      {/* Botão Nova Justificativa */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Justificativa
        </button>
      </div>

      {/* Lista de Justificativas */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Justificativas Registradas</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {justifications.length} justificativa(s) encontrada(s)
            </p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {justifications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma justificativa registrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {justifications.map((just) => (
              <div key={just.id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-semibold text-slate-900">{just.userName}</p>
                      {just.userRegistration && (
                        <span className="text-xs text-slate-500">({just.userRegistration})</span>
                      )}
                      {just.isNonDiscountable && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                          <Shield className="w-3 h-3" />
                          Não Descontável
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-xs text-slate-500">Data</p>
                        <p className="font-semibold text-slate-900">{formatDateBR(just.entryDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Horas Faltantes</p>
                        <p className="font-semibold text-red-700">{just.missingHours}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Tipo</p>
                        <p className="font-semibold text-slate-900">
                          {justificationTypeLabels[just.justificationType] || just.justificationType}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Documento</p>
                        <p className="font-semibold text-slate-900">{just.documentRef || '—'}</p>
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="text-xs text-slate-500 mb-1">Descrição:</p>
                      <p className="text-slate-700">{just.justificationDescription}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteJustification(just.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      {showCreateModal && (
        <CreateJustificationModal
          servers={servers}
          onClose={() => setShowCreateModal(false)}
          onSaved={async () => {
            setShowCreateModal(false);
            await fetchJustifications();
          }}
        />
      )}
    </div>
  );
}

function CreateJustificationModal({
  servers,
  onClose,
  onSaved,
}: {
  servers: ServerUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    userId: '',
    entryDate: '',
    missingHours: '',
    justificationType: 'medical',
    justificationDescription: '',
    documentRef: '',
    isNonDiscountable: true,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.userId || !form.entryDate || !form.missingHours || !form.justificationDescription) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/partial-absence-justifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(form.userId, 10),
          entryDate: form.entryDate,
          missingHours: form.missingHours,
          justificationType: form.justificationType,
          justificationDescription: form.justificationDescription,
          documentRef: form.documentRef,
          isNonDiscountable: form.isNonDiscountable,
        }),
      });

      if (res.ok) {
        onSaved();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao criar justificativa');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Nova Justificativa de Ausência Parcial</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Servidor *</label>
              <select
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data da Ausência *</label>
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Horas Faltantes *</label>
              <input
                type="text"
                value={form.missingHours}
                onChange={(e) => setForm({ ...form, missingHours: e.target.value })}
                placeholder="Ex: 2h, 1h30min"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Justificativa *</label>
              <select
                value={form.justificationType}
                onChange={(e) => setForm({ ...form, justificationType: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="medical">🏥 Médica</option>
                <option value="personal">👤 Pessoal</option>
                <option value="family">👨‍👩‍👧 Familiar</option>
                <option value="other">📝 Outro</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição Detalhada *</label>
              <textarea
                value={form.justificationDescription}
                onChange={(e) => setForm({ ...form, justificationDescription: e.target.value })}
                rows={4}
                placeholder="Descreva detalhadamente o motivo da ausência parcial..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número do Documento/Atestado</label>
              <input
                type="text"
                value={form.documentRef}
                onChange={(e) => setForm({ ...form, documentRef: e.target.value })}
                placeholder="Ex: Atestado 123/2026"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isNonDiscountable"
                checked={form.isNonDiscountable}
                onChange={(e) => setForm({ ...form, isNonDiscountable: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isNonDiscountable" className="text-sm font-semibold text-slate-700">
                <Shield className="w-4 h-4 inline mr-1" />
                Não descontar do pagamento
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Criar Justificativa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PartialAbsenceJustificationsPage() {
  return (
    <AuthProvider>
      <PartialAbsenceJustificationsContent />
    </AuthProvider>
  );
}
