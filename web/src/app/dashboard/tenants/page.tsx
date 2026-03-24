'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Plus, Trash2, Edit, Phone, Mail, IdCard, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { maskPhone, maskCpfCnpj, unmask } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface Tenant {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const response = await api.get('/tenants');
      setTenants(response.data);
    } catch (error) {
      toast.error('Erro ao carregar locatários');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/tenants/${id}`);
      setTenants(tenants.filter((t) => t.id !== id));
      toast.success('Locatário excluído!');
    } catch (error: any) {
      let message = 'Erro desconhecido ao excluir locatário';
      
      if (error.response?.status === 401) {
        message = 'Sua sessão expirou. Por favor, faça login novamente.';
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.message) {
        message = `Erro: ${error.message}`;
      }
      
      toast.error(message);
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Locatários</h1>
        <Link 
          href="/dashboard/tenants/new" 
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Locatário</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Contato</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">CPF/CNPJ</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Nenhum locatário cadastrado.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{tenant.nome}</div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center text-sm text-slate-600 gap-2">
                        <div className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-2 text-slate-400" />
                          {tenant.telefone ? maskPhone(tenant.telefone) : '-'}
                        </div>
                        {tenant.telefone && (
                          <a
                            href={`https://api.whatsapp.com/send?phone=55${unmask(tenant.telefone).replace(/^55/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Mail className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        {tenant.email || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <IdCard className="h-4 w-4 mr-2 text-slate-400" />
                        {tenant.cpf ? maskCpfCnpj(tenant.cpf) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/dashboard/tenants/${tenant.id}`} className="p-2 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button onClick={() => setTenantToDelete(tenant.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition-all shadow-sm">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        isOpen={!!tenantToDelete}
        onClose={() => setTenantToDelete(null)}
        onConfirm={() => tenantToDelete && handleDelete(tenantToDelete)}
        title="Excluir Locatário"
        message="Tem certeza que deseja excluir este locatário? O histórico de reservas vinculado a ele poderá ser impactado."
        confirmText="Excluir"
        cancelText="Manter Locatário"
      />
    </div>
  );
}
