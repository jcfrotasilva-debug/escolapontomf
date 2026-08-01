'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { HrLayout } from '@/components/HrLayout';

function HrLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <HrLayout
      user={user}
      onLogout={logout}
      onNewServer={() => {
        // Implementar modal de novo servidor
        window.location.href = '/rh';
      }}
    >
      {children}
    </HrLayout>
  );
}

export default function RhLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HrLayoutWrapper>{children}</HrLayoutWrapper>
    </AuthProvider>
  );
}
