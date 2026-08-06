'use client';

import { AuthProvider } from '@/components/AuthProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @media print {
          header, footer, nav, aside {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          div[class*="ml-64"] {
            margin-left: 0 !important;
            width: 100% !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
      <AuthProvider>{children}</AuthProvider>
    </>
  );
}
