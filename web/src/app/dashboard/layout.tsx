'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import PlanBanner from '@/components/PlanBanner';
import TrialBlockingModal from '@/components/TrialBlockingModal';
import TermsAcceptanceModal from '@/components/TermsAcceptanceModal';
import { Menu, X, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Close sidebar when navigating (detect changes but we can just handle it on link clicks inside Sidebar, 
  // or simple unmount/remount doesn't happen. We'll pass setSidebarOpen to Sidebar)

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform lg:static lg:translate-x-0 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        <PlanBanner />
        <TrialBlockingModal />
        <TermsAcceptanceModal />
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between lg:justify-end px-4 lg:px-8 shadow-sm shrink-0">
          <button 
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-3 pl-4 border-l border-slate-200 ml-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start hidden sm:flex">
              <span className="text-sm font-bold text-slate-700 leading-tight">{user.nome}</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">
                {user.subscription_status === 'active_subscription'
                  ? `Plano ${user.plan_name || 'Profissional'}`
                  : user.subscription_status === 'cancelled'
                    ? 'Assinatura cancelada'
                    : (user.plan_type === 'trial' ? 'Período de Teste' : 'Sem assinatura')}
              </span>
            </div>
            
            <button 
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1"
              title="Sair da conta"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
