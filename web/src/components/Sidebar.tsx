'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building, Users, Calendar, DollarSign, FileText, User, Megaphone, CreditCard } from 'lucide-react';
import Logo from './Logo';
import packageJson from '../../package.json';
import { plansAccessEnabled, trialEnforcementEnabled } from '@/lib/features';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { signOut, user } = useAuth();
  const pathname = usePathname();
  const productVersion = `v${packageJson.version}`;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Imóveis', href: '/dashboard/properties', icon: Building },
    { name: 'Locatários', href: '/dashboard/tenants', icon: Users },
    { name: 'Reservas', href: '/dashboard/reservations', icon: Calendar },
    { name: 'Pagamentos', href: '/dashboard/payments', icon: DollarSign },
    { name: 'Contratos', href: '/dashboard/contracts', icon: FileText },
    ...(plansAccessEnabled ? [{ name: 'Planos', href: '/dashboard/plans', icon: CreditCard }] : []),
    ...(user?.plan_name === 'Plano Completo' || user?.subscription_status === 'trial_active' ? [
      { name: 'Mala Direta', href: '/dashboard/campaigns', icon: Megaphone }
    ] : []),
    ...(user?.can_manage_users && (user?.plan_name === 'Plano Completo' || user?.subscription_status === 'trial_active') ? [{ name: 'Usuários', href: '/dashboard/users', icon: User }] : []),
    {
      name: user?.is_admin ? 'Meu Perfil' : 'Perfil do Locador',
      href: '/dashboard/profile',
      icon: User
    },
  ];

  return (
    <div className="sticky top-0 h-screen w-64 flex flex-col bg-[#1e293b] border-r border-slate-800 shadow-xl transition-all duration-300">
      <div className="flex h-20 items-center justify-center p-6 border-b border-slate-700/50">
        <Logo href="/dashboard" size="medium" textColor="text-white" />
      </div>

      <nav className="flex-1 space-y-2 p-4 mt-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
          const isTrialExpired =
            user?.subscription_status === 'trial_expired' && trialEnforcementEnabled;
          const isProfileItem = item.href === '/dashboard/profile';
          
          if (isTrialExpired) {
            return (
              <div key={item.name}>
                <div
                  className={`flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium opacity-40 cursor-not-allowed ${
                    isActive ? 'bg-white/5 text-slate-500' : 'text-slate-500'
                  }`}
                  title="Assine um plano para liberar o acesso"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </div>
                {isProfileItem && (
                  <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Versão {productVersion}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={item.name}>
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} />
                <span>{item.name}</span>
              </Link>
              {isProfileItem && (
                <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Versão {productVersion}
                </p>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
