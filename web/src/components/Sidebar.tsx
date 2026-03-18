'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building, Users, Calendar, DollarSign, FileText, User, Megaphone, CreditCard } from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { signOut, user } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Imóveis', href: '/dashboard/properties', icon: Building },
    { name: 'Locatários', href: '/dashboard/tenants', icon: Users },
    { name: 'Reservas', href: '/dashboard/reservations', icon: Calendar },
    { name: 'Pagamentos', href: '/dashboard/payments', icon: DollarSign },
    { name: 'Contratos', href: '/dashboard/contracts', icon: FileText },
    { name: 'Planos', href: '/dashboard/plans', icon: CreditCard },
    { name: 'Mala Direta', href: '/dashboard/campaigns', icon: Megaphone },
    ...(user?.is_admin ? [{ name: 'Usuários', href: '/dashboard/users', icon: User }] : []),
    {
      name: user?.is_admin ? 'Meu Perfil' : 'Perfil do Locador',
      href: '/dashboard/profile',
      icon: User
    },
  ];

  return (
    <div className="sticky top-0 h-screen w-64 flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300">
      <div className="flex h-20 items-center justify-center p-6 border-b border-slate-100">
        <Logo href="/dashboard" size="medium" />
      </div>

      <nav className="flex-1 space-y-2 p-4 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
          const isTrialExpired = user?.subscription_status === 'trial_expired';
          
          if (isTrialExpired) {
            return (
              <div
                key={item.name}
                className={`flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium opacity-50 cursor-not-allowed ${
                  isActive ? 'bg-slate-100 text-slate-400' : 'text-slate-400'
                }`}
                title="Assine um plano para liberar o acesso"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>


    </div>
  );
}
