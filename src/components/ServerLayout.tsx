'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  CheckCircle2,
  Edit2,
  Calendar,
  DollarSign,
  LogOut,
} from 'lucide-react';

type ServerLayoutProps = {
  children: React.ReactNode;
  user: {
    userId: number;
    name: string;
    role: string;
  };
  onLogout: () => void;
};

export function ServerLayout({ children, user, onLogout }: ServerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Meu Ponto',
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard',
    },
    {
      label: 'Minha Folha Ponto',
      icon: <FileText className="w-5 h-5" />,
      path: '/dashboard/folha-ponto',
    },
    {
      label: 'Minhas Justificativas',
      icon: <CheckCircle2 className="w-5 h-5" />,
      path: '/dashboard/justificativas',
    },
    {
      label: 'Minhas Retificações',
      icon: <Edit2 className="w-5 h-5" />,
      path: '/dashboard/retificacoes',
    },
    {
      label: 'Meu Banco de Horas',
      icon: <DollarSign className="w-5 h-5" />,
      path: '/dashboard/banco-horas',
    },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white shadow-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">{user.name.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-blue-200 capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        {children}
      </div>
    </div>
  );
}
