'use client';

import { useState, useEffect } from 'react';
import { api, getApiBaseUrl } from '@/lib/api';
import { toast } from 'react-toastify';
import { Share2, RefreshCw, Trash2, Calendar, Link as LinkIcon, Info, Check, Copy } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

interface SyncConfig {
  id: string;
  provider: string;
  external_url: string;
  last_sync: string | null;
}

interface CalendarSyncSettingsProps {
  propertyId: string;
}

export default function CalendarSyncSettings({ propertyId }: CalendarSyncSettingsProps) {
  const [configs, setConfigs] = useState<SyncConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [syncIdToDelete, setSyncIdToDelete] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState('');
  const [newProvider, setNewProvider] = useState('airbnb');

  const exportUrl = `${getApiBaseUrl()}/public/calendar/${propertyId}/export.ics`;

  const fetchConfigs = async () => {
    try {
      const response = await api.get(`/properties/${propertyId}/sync`);
      setConfigs(response.data);
    } catch (error) {
      console.error('Erro ao buscar configs de sync:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [propertyId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    setAdding(true);
    try {
      await api.post(`/properties/${propertyId}/sync`, {
        provider: newProvider,
        url: newUrl
      });
      toast.success('Sincronização adicionada!');
      setNewUrl('');
      fetchConfigs();
    } catch (error) {
      toast.error('Erro ao salvar link externo');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClick = (syncId: string) => {
    setSyncIdToDelete(syncId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!syncIdToDelete) return;

    try {
      await api.delete(`/properties/${propertyId}/sync/${syncIdToDelete}`);
      toast.success('Sincronização removida');
      fetchConfigs();
    } catch (error) {
      toast.error('Erro ao remover');
    } finally {
      setDeleteConfirmOpen(false);
      setSyncIdToDelete(null);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const resp = await api.post(`/properties/${propertyId}/sync-now`);
      const { imported = 0, removed = 0, updated = 0 } = resp.data;
      
      if (imported === 0 && removed === 0 && updated === 0) {
        toast.info('Agenda já está atualizada. Nenhuma alteração encontrada.');
      } else {
        const parts = [];
        if (imported > 0) parts.push(`${imported} nova(s) importada(s)`);
        if (removed > 0) parts.push(`${removed} removida(s)`);
        if (updated > 0) parts.push(`${updated} atualizada(s)`);
        
        toast.success(`Sincronização concluída! ${parts.join(', ')}.`);
      }
      fetchConfigs();
    } catch (error) {
      toast.error('Erro ao sincronizar com o Airbnb');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="animate-pulse h-20 bg-slate-100 rounded-xl" />;

  return (
    <div className="space-y-8">
      {/* Seção 1: Exportação (Para o Airbnb ler) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Share2 className="w-5 h-5 text-indigo-600" />
          Exportar Calendário
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Copie este link e cole no seu **Airbnb / Booking.com** para que eles saibam quando você tem reservas diretas.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-500 font-mono truncate">
            {exportUrl}
          </div>
          <button
            onClick={handleCopy}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="text-sm font-bold">Copiar</span>
          </button>
        </div>
        
        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl">
           <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
           <p className="text-[11px] text-amber-800 leading-tight">
             **Dica**: Vá na aba &quot;Anúncio &rarr; Preços e Disponibilidade &rarr; Sincronização de Calendário&quot; no seu Airbnb e selecione &quot;Importar Calendário&quot; para colar este link.
           </p>
        </div>
      </div>

      {/* Seção 2: Importação (Para o Aluga Fácil ler o Airbnb) */}
      <div className="border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
           <div>
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               <Calendar className="w-5 h-5 text-emerald-600" />
               Importar Calendários Externos
             </h3>
             <p className="text-sm text-slate-500">Bloqueie datas automaticamente no Aluga Fácil vindas do Airbnb/Booking.</p>
           </div>
           
           {configs.length > 0 && (
             <button
               onClick={handleSyncNow}
               disabled={syncing}
               className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all disabled:opacity-50"
             >
               <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
               {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
             </button>
           )}
        </div>

        <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl space-y-4 mb-6">
          <p className="text-xs font-bold text-slate-700 uppercase">Adicionar Novo Link</p>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            >
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking.com</option>
              <option value="custom">Outro (iCal)</option>
            </select>
            <input
              type="url"
              placeholder="Cole aqui a URL .ics do Airbnb"
              value={newUrl}
              required
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition-all disabled:opacity-50"
            >
              {adding ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>

        {configs.length > 0 ? (
          <div className="space-y-3">
            {configs.map(config => (
              <div key={config.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">
                    {config.provider[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 uppercase">{config.provider}</span>
                    <p className="text-[11px] text-slate-500">Última sync: {config.last_sync ? new Date(config.last_sync).toLocaleString() : 'Nunca sincronizado'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteClick(config.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remover"
                >  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <LinkIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum calendário externo conectado.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remover Sincronização"
        message="Tem certeza que deseja remover este calendário? A sincronização automática será interrompida."
        confirmText="Remover"
        cancelText="Cancelar"
        isDanger={true}
      />
    </div>
  );
}
