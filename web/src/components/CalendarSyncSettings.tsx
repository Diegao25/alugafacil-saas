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

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
      toast.error('Erro ao copiar link. Tente selecionar e copiar manualmente.');
    }
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

  const handleDeleteClick = (e: React.MouseEvent, syncId: string) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleSyncNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
          Copie este link e cole no seu <strong>Airbnb / Booking.com</strong> para que eles saibam quando você tem reservas diretas.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-500 font-mono truncate">
            {exportUrl}
          </div>
          <button
            type="button"
            onClick={(e) => handleCopy(e)}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="text-sm font-bold">Copiar</span>
          </button>
        </div>
        
         <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl shadow-sm">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-800 leading-tight">
              <strong className="font-bold uppercase tracking-wide">DICA</strong>: Vá na aba &quot;Anúncio &rarr; Preços e Disponibilidade &rarr; Sincronização de Calendário&quot; no seu <strong>Airbnb</strong> e selecione &quot;Importar Calendário&quot; para colar este link.
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
             <p className="text-xs text-slate-500 mt-1">Bloqueie datas automaticamente no Aluga Fácil vindas do Airbnb/Booking.</p>
           </div>
           
           {configs.length > 0 && (
             <button
               type="button"
               onClick={(e) => handleSyncNow(e)}
               disabled={syncing}
               className="flex items-center gap-2 bg-[#ecfdf5] text-[#065f46] border border-[#d1fae5] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#d1fae5] transition-all disabled:opacity-50 shadow-sm"
             >
               <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
               {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
             </button>
           )}
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl space-y-4 mb-8">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ADICIONAR NOVO LINK</p>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white font-medium"
            >
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking.com</option>
              <option value="custom">Outro (iCal)</option>
            </select>
            <input
              type="url"
              placeholder={`Cole aqui a URL .ics do ${newProvider === 'airbnb' ? 'Airbnb' : newProvider === 'booking' ? 'Booking' : 'Calendário'}`}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd(e as any);
                }
              }}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="bg-[#1e293b] text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-900 transition-all disabled:opacity-50 shadow-sm"
            >
              {adding ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
 
        {configs.length > 0 ? (
          <div className="grid gap-3">
            {configs.map(config => (
              <div key={config.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#f1f5f9] rounded-full flex items-center justify-center font-bold text-[#64748b] text-lg border border-[#e2e8f0]">
                    {config.provider[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{config.provider === 'airbnb' ? 'AIRBNB' : config.provider === 'booking' ? 'BOOKING' : config.provider.toUpperCase()}</span>
                    <p className="text-[11px] text-slate-400 font-medium">Última sync: {config.last_sync ? new Date(config.last_sync).toLocaleString() : 'Nunca sincronizado'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, config.id)}
                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Remover"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <LinkIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Nenhum calendário externo conectado.</p>
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
