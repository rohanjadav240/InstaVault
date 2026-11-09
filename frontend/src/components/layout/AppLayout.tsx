import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#0c0c12] text-slate-100 antialiased selection:bg-violet-600/30 selection:text-violet-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}

