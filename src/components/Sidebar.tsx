'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Users,
  FileText,
  CheckCircle2,
  Edit2,
  Calendar,
  Settings,
  BarChart3,
  AlertTriangle,
  Search,
  Plus,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

type SidebarProps = {
  user: {
    name: string;
    role: string;
  };
  onLogout: () => void;
  onNewServer: () => void;
};

export function Sidebar({ user, onLogout, onNewServer }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [monitoringOpen, setMonitoringOpen] = useState(false);

  const menuItems = [
    {
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      path: '/rh',
    },
    {
      label: 'Servidores',
      icon: <Users className="w-5 h-5" />,
      path: '/rh',
    },
    {
      label: 'Folha Ponto V2',
      icon: <FileText className="w-5 h-5" />,
      path: '/rh/relatorios/folha-ponto',
    },
    {
      label: 'Justificativas',
      icon: <CheckCircle2 className="w-5 h-5" />,
      path: '/rh/justificativas',
    },
    {
      label: 'Retificações',
      icon: <Edit2 className="w-5 h-5" />,
      path: '/rh/retificacoes',
    },
    {
      label: 'Jornada Semanal',
      icon: <Calendar className="w-5 h-5" />,
      path: '/rh/jornada',
    },
    {
      label: 'Calendário',
      icon: <Calendar className="w-5 h-5" />,
      path: '/rh/calendario',
    },
    {
      label: 'Configurações',
      icon: <Settings className="w-5 h-5" />,
      path: '/rh/configuracoes',
    },
  ];

  const monitoringItems = [
    {
      label: 'Monitoramento Geral',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/rh/monitoramento',
    },
    {
      label: 'Registros Parciais',
      icon: <AlertTriangle className="w-5 h-5" />,
      path: '/rh/monitoramento-parcial',
    },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl z-40 flex flex-col">
      {/* Logo e Título */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Gestão RH</h1>
            <p className="text-xs text-slate-400">EE Marlene Frattini</p>
          </div>
        </div>
      </div>

      {/* Botão Novo Servidor */}
      <div className="p-4">
        <button
          onClick={onNewServer}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Servidor
        </button>
      </div>

      {/* Menu Principal */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Menu Principal</p>
        </div>
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold border-r-4 border-yellow-400'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {/* Menu de Monitoramento */}
        <div className="px-4 mb-2 mt-6">
          <button
            onClick={() => setMonitoringOpen(!monitoringOpen)}
            className="w-full flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider hover:text-slate-300 transition"
          >
            <span>Monitoramento</span>
            {monitoringOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        {monitoringOpen && (
          <div className="mb-4">
            {monitoringItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold border-r-4 border-yellow-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Footer com Usuário e Logout */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-slate-400">Recursos Humanos</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-2 rounded-lg transition text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
