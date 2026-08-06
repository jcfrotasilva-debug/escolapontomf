'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Search,
  UserCheck,
  UserX,
  BadgeCheck,
  IdCard,
  Building2,
  Phone,
  Loader2,
} from 'lucide-react';
import { formatDateBR } from '@/lib/timezone';

type ServerUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  position: string | null;
  registration: string | null;
  rg: string | null;
  workHours: number | null;
  regime: string | null;
  isStudentSchedule: boolean | null;
  department: string | null;
  admissionDate: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string | null;
};

function ServersContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [servers, setServers] = useState<ServerUser[]>([]);
  const [filteredServers, setFilteredServers] = useState<ServerUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerUser | null>(null);

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
    const term = searchTerm.toLowerCase();
    const filtered = servers
      .filter((s) => s.role === 'server')
      .filter((s) => {
        if (filterStatus === 'active') return s.active;
        if (filterStatus === 'inactive') return !s.active;
        return true;
      })
      .filter((s) => {
        if (!term) return true;
        return (
          s.name.toLowerCase().includes(term) ||
          (s.email || '').toLowerCase().includes(term) ||
          (s.registration || '').toLowerCase().includes(term) ||
          (s.position || '').toLowerCase().includes(term)
        );
      });
    setFilteredServers(filtered);
  }, [servers, searchTerm, filterStatus]);

  async function fetchServers() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setServers(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleActive(server: ServerUser) {
    if (!confirm(
      server.active
        ? `Deseja realmente DESATIVAR o servidor ${server.name}? Ele não poderá mais acessar o sistema.`
        : `Deseja ATIVAR o servidor ${server.name}?`
    )) return;

    try {
      const res = await fetch(`/api/employees/${server.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !server.active }),
      });
      if (res.ok) {
        await fetchServers();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteServer(server: ServerUser) {
    if (!confirm(`ATENÇÃO! Deseja realmente EXCLUIR permanentemente o servidor ${server.name} e todos os seus dados? Esta ação não pode ser desfeita!`)) return;

    try {
      const res = await fetch(`/api/employees/${server.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchServers();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (authLoading || !user || user.role !== 'hr') {
    return null;
  }

  return (
    <div className="p-6">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Servidores</h1>
        <p className="text-slate-500 mt-1">Gerenciamento completo de servidores</p>
      </div>

      {/* Barra de busca e filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar servidor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filterStatus === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filterStatus === 'active' ? 'bg-white shadow text-green-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filterStatus === 'inactive' ? 'bg-white shadow text-red-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inativos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Servidores */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lista de Servidores</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {filteredServers.length} servidor(es) encontrado(s)
            </p>
          </div>
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
                className="p-4 flex items-center gap-4 hover:bg-slate-50 transition"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                  server.active
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                }`}>
                  {server.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate">{server.name}</p>
                    {server.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                        <UserCheck className="w-3 h-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                        <UserX className="w-3 h-3" />
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                    {server.position && (
                      <span className="flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" />
                        {server.position}
                      </span>
                    )}
                    {server.registration && (
                      <span className="flex items-center gap-1">
                        <IdCard className="w-3 h-3" />
                        {server.registration}
                      </span>
                    )}
                    {server.department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {server.department}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => router.push(`/rh/servidor/${server.id}`)}
                    title="Ver detalhes"
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingServer(server)}
                    title="Editar"
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(server)}
                    title={server.active ? 'Desativar' : 'Ativar'}
                    className={`p-2 rounded-lg transition ${
                      server.active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                        : 'bg-green-50 hover:bg-green-100 text-green-700'
                    }`}
                  >
                    {server.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteServer(server)}
                    title="Excluir"
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

      {/* Modais */}
      {showCreateModal && (
        <ServerFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={async () => {
            setShowCreateModal(false);
            await fetchServers();
          }}
        />
      )}

      {editingServer && (
        <ServerFormModal
          server={editingServer}
          onClose={() => setEditingServer(null)}
          onSaved={async () => {
            setEditingServer(null);
            await fetchServers();
          }}
        />
      )}
    </div>
  );
}

function ServerFormModal({
  server,
  onClose,
  onSaved,
}: {
  server?: ServerUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: server?.name || '',
    email: server?.email || '',
    password: '',
    confirmPassword: '',
    position: server?.position || '',
    registration: server?.registration || '',
    rg: server?.rg || '',
    workHours: server?.workHours || 40,
    regime: server?.regime || '',
    isStudentSchedule: server?.isStudentSchedule || false,
    department: server?.department || '',
    phone: server?.phone || '',
    admissionDate: server?.admissionDate || '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email) {
      setError('Nome e email são obrigatórios');
      return;
    }

    if (!server && !form.password) {
      setError('Senha é obrigatória para novos servidores');
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const url = server ? `/api/employees/${server.id}` : '/api/employees';
      const method = server ? 'PUT' : 'POST';
      
      // Garantir que workHours seja sempre um número
      const body = {
        ...form,
        workHours: form.workHours ? Number(form.workHours) : 40,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSaved();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao salvar');
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
          <h3 className="text-xl font-bold text-slate-900">
            {server ? 'Editar Servidor' : 'Novo Servidor'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome Completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Institucional *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {server ? 'Nova Senha (deixe vazio para manter)' : 'Senha Inicial *'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar Senha</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">RG</label>
              <input
                type="text"
                value={form.rg}
                onChange={(e) => setForm({ ...form, rg: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Matrícula</label>
              <input
                type="text"
                value={form.registration}
                onChange={(e) => setForm({ ...form, registration: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cargo/Função</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jornada Semanal (horas)</label>
              <input
                type="number"
                value={form.workHours}
                onChange={(e) => setForm({ ...form, workHours: parseInt(e.target.value) || 40 })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Regime de Trabalho</label>
              <select
                value={form.regime}
                onChange={(e) => setForm({ ...form, regime: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="Normal">Normal</option>
                <option value="Plantão">Plantão</option>
                <option value="Tempo Parcial">Tempo Parcial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Departamento/Setor</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data de Admissão</label>
              <input
                type="date"
                value={form.admissionDate}
                onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isStudentSchedule"
                checked={form.isStudentSchedule}
                onChange={(e) => setForm({ ...form, isStudentSchedule: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isStudentSchedule" className="text-sm font-semibold text-slate-700">
                Horário de Estudante
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
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {server ? 'Salvar Alterações' : 'Cadastrar Servidor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServersPage() {
  return (
    <AuthProvider>
      <ServersContent />
    </AuthProvider>
  );
}
