'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Plus, MapPin, Users, DollarSign, Trash2, Edit, MessageCircle, Instagram, Facebook, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import CopyLinkButton from '@/components/CopyLinkButton';
import { formatCurrencyBR, unmask } from '@/lib/utils';

interface Property {
  id: string;
  nome: string;
  endereco: string;
  valor_diaria: number;
  capacidade_maxima: number;
  redes_sociais_url?: string | null;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [shareDialog, setShareDialog] = useState<Property | null>(null);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchTenants();
  }, []);

  async function fetchProperties() {
    try {
      const response = await api.get('/properties');
      setProperties(response.data);
    } catch (error) {
      toast.error('Erro ao carregar imóveis');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTenants() {
    setLoadingTenants(true);
    try {
      const response = await api.get('/tenants');
      setTenants(response.data);
    } catch (error) {
      toast.error('Erro ao carregar locatários');
    } finally {
      setLoadingTenants(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja excluir este imóvel?')) {
      try {
        await api.delete(`/properties/${id}`);
        setProperties(properties.filter((p) => p.id !== id));
        toast.success('Imóvel excluído!');
      } catch (error) {
        toast.error('Erro ao excluir imóvel');
      }
    }
  }

  function buildWhatsappNumber(phone?: string) {
    if (!phone) return '';
    const digits = unmask(phone);
    if (!digits) return '';
    // Retorna apenas os dígitos sem o 55 inicial se já houver, 
    // pois adicionaremos o 55 de forma fixa no link
    return digits.replace(/^55/, '');
  }

  function handleShareAgenda() {
    if (!shareDialog) return;
    const tenant = tenants.find((t) => t.id === selectedTenant);
    if (!tenant) {
      toast.error('Selecione um locatário');
      return;
    }
    const phone = buildWhatsappNumber(tenant.telefone);
    if (!phone) {
      toast.error('Locatário sem telefone cadastrado');
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const agendaUrl = `${origin}/properties/${shareDialog.id}/agenda`;
    const message = `Olá ${tenant.nome}!\nSegue a agenda do imóvel ${shareDialog.nome}: ${agendaUrl}`;
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setShareDialog(null);
    setSelectedTenant('');
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Imóveis</h1>
        <Link 
          href="/dashboard/properties/new" 
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Imóvel</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
            Nenhum imóvel cadastrado ainda.
          </div>
        ) : (
          properties.map((property) => {
            const origin =
              typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
            const agendaUrl = `${origin}/properties/${property.id}/agenda`;
            const agendaPath = `/properties/${property.id}/agenda`;
            return (
            <div key={property.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-800">{property.nome}</h3>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/dashboard/properties/${property.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors">
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button onClick={() => handleDelete(property.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                <div className="flex items-start text-sm text-slate-600">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-2">{property.endereco}</span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Users className="h-4 w-4 mr-2 text-slate-400 shrink-0" />
                  <span>Até {property.capacidade_maxima} pessoas</span>
                </div>
                <div className="flex items-center text-sm font-medium text-slate-800 bg-slate-50 p-2 rounded-lg mt-4 border border-slate-100">
                  <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                  <span>R$ {formatCurrencyBR(property.valor_diaria)} <span className="text-slate-500 text-xs font-normal">/ diária</span></span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {property.redes_sociais_url && (
                    <Link
                      target="_blank"
                      rel="noreferrer"
                      href={property.redes_sociais_url}
                      className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-indigo-700 transition hover:bg-indigo-100 hover:border-indigo-200 gap-2 shadow-sm"
                    >
                      {property.redes_sociais_url.includes('instagram.com') ? (
                        <Instagram className="h-3.5 w-3.5" />
                      ) : property.redes_sociais_url.includes('facebook.com') ? (
                        <Facebook className="h-3.5 w-3.5" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      REDE SOCIAL
                    </Link>
                  )}
                  <CopyLinkButton
                    url={agendaUrl}
                    label="Copiar Link"
                    copiedLabel="Copiado!"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShareDialog(property);
                      setSelectedTenant('');
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-200 shadow-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Compartilhar
                  </button>
                  <Link
                    target="_blank"
                    rel="noreferrer"
                    href={agendaPath}
                    className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-700 transition hover:bg-blue-100 hover:border-blue-200 shadow-sm"
                  >
                    Ver agenda
                  </Link>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {shareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShareDialog(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compartilhar agenda</p>
                <p className="text-lg font-semibold text-slate-800">{shareDialog.nome}</p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShareDialog(null)}
              >
                Fechar
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Locatário</label>
              <select
                value={selectedTenant}
                onChange={(event) => setSelectedTenant(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              >
                <option value="">Selecione o locatário...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.nome} {tenant.telefone ? `(${tenant.telefone})` : ''}
                  </option>
                ))}
              </select>
              {loadingTenants && <p className="text-xs text-slate-400">Carregando locatários...</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShareDialog(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-semibold shadow-sm transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleShareAgenda}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold shadow-sm transition-all"
              >
                Compartilhar no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
