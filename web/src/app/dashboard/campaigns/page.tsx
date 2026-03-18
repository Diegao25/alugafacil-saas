'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { 
  Megaphone, 
  Search, 
  CheckCircle2, 
  MessageCircle, 
  ChevronRight, 
  ChevronLeft,
  Building,
  Users,
  MessageSquare,
  Send
} from 'lucide-react';
import { formatCurrencyBR, unmask } from '@/lib/utils';

interface Property {
  id: string;
  nome: string;
  valor_diaria: number;
  redes_sociais_url?: string | null;
}

interface Tenant {
  id: string;
  nome: string;
  telefone: string;
  selected?: boolean;
  sent?: boolean;
}

interface CampaignHistory {
  id: string;
  data_envio: string;
  mensagem: string;
  imovel: { nome: string };
  locatario: { nome: string };
}

export default function CampaignsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'campaign' | 'history'>('campaign');
  const [step, setStep] = useState(1);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [history, setHistory] = useState<CampaignHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Olá [NOME]! Esperamos que esteja bem.\n\nEstamos com uma oportunidade especial para o imóvel [IMOVEL]. O valor da diária está apenas [VALOR]!\n\nConfira as fotos e rede social: [REDE_SOCIAL]\n\nDatas disponíveis aqui: [LINK]\n\nVamos reservar?');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [propsRes, tenantsRes] = await Promise.all([
        api.get('/properties'),
        api.get('/tenants')
      ]);
      setProperties(propsRes.data);
      setTenants(tenantsRes.data.map((t: any) => ({ ...t, selected: true, sent: false })));
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const response = await api.get('/campaigns');
      setHistory(response.data);
    } catch (error) {
           // Silently fail if listing is not critical, or show toast
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const filteredTenants = tenants.filter(t => 
    t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.telefone.includes(searchTerm)
  );

  const toggleTenant = (id: string) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const toggleAll = (selected: boolean) => {
    setTenants(prev => prev.map(t => ({ ...t, selected })));
  };

  const currentProperty = properties.find(p => p.id === selectedPropertyId);

  function generateMessage(tenant: Tenant) {
    if (!currentProperty) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const agendaUrl = `${origin}/properties/${currentProperty.id}/agenda`;
    
    return messageTemplate
      .replace(/\[NOME\]/g, tenant.nome)
      .replace(/\[IMOVEL\]/g, currentProperty.nome)
      .replace(/\[VALOR\]/g, `R$ ${formatCurrencyBR(currentProperty.valor_diaria)}`)
      .replace(/\[LINK\]/g, agendaUrl)
      .replace(/\[REDE_SOCIAL\]/g, currentProperty.redes_sociais_url || '(Rede social não cadastrada)');
  }

  async function handleSend(tenant: Tenant) {
    const text = generateMessage(tenant);
    const phone = unmask(tenant.telefone);
    const url = `https://api.whatsapp.com/send?phone=55${phone.replace(/^55/, '')}&text=${encodeURIComponent(text)}`;
    
    // Registrar no backend
    try {
      await api.post('/campaigns', {
        imovel_id: selectedPropertyId,
        locatario_id: tenant.id,
        mensagem: text
      });
      
      window.open(url, '_blank');
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, sent: true } : t));
    } catch (error) {
      toast.error(`Erro ao registrar envio para ${tenant.nome}`);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
            <Megaphone size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mala Direta WhatsApp</h1>
            <p className="text-slate-500">Transforme locatários antigos em novas reservas</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('campaign')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'campaign' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Nova Campanha
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {activeTab === 'campaign' ? (
        <>
          {/* Progress Steps */}
          <div className="flex items-center justify-between px-4">
            {[
              { icon: Building, label: 'Imóvel' },
              { icon: Users, label: 'Público' },
              { icon: MessageSquare, label: 'Mensagem' },
              { icon: Send, label: 'Envio' }
            ].map((s, i) => (
              <div key={i} className="flex items-center group">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  step === i + 1 ? 'bg-blue-600 text-white shadow-md scale-105' : 
                  step > i + 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  <s.icon size={18} />
                  <span className="text-sm font-bold truncate hidden sm:inline">{s.label}</span>
                  {step > i + 1 && <CheckCircle2 size={14} />}
                </div>
                {i < 3 && <div className={`w-8 h-0.5 mx-2 bg-slate-100 ${step > i + 1 ? 'bg-emerald-200' : ''}`} />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
            
            {/* Step 1: Property Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-800">Qual imóvel deseja promover?</h2>
                  <p className="text-slate-500 italic">Selecione o imóvel que será o destaque da sua campanha</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar pt-4">
                  {properties.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPropertyId(p.id)}
                      className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                        selectedPropertyId === p.id ? 
                        'border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-50' : 
                        'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {selectedPropertyId === p.id && (
                        <div className="absolute top-3 right-3 text-blue-600">
                          <CheckCircle2 size={24} />
                        </div>
                      )}
                      <Building size={32} className={`mb-4 ${selectedPropertyId === p.id ? 'text-blue-600' : 'text-slate-400'}`} />
                      <h3 className="font-bold text-slate-800 leading-tight mb-1">{p.nome}</h3>
                      <p className="text-sm text-slate-500">R$ {formatCurrencyBR(p.valor_diaria)} / dia</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Recipient Selection */}
            {step === 2 && (
              <div className="space-y-6 flex-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Para quem vamos enviar?</h2>
                      <p className="text-slate-500">Selecione os locatários da lista</p>
                    </div>
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar nome ou telefone..."
                        className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 w-full md:w-64 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                </div>

                <div className="flex items-center justify-between py-2 px-4 bg-slate-50 rounded-xl">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {filteredTenants.filter(t => t.selected).length} selecionados
                    </span>
                    <div className="flex gap-4">
                      <button onClick={() => toggleAll(true)} className="text-xs font-bold text-blue-600 hover:underline">Selecionar Todos</button>
                      <button onClick={() => toggleAll(false)} className="text-xs font-bold text-slate-500 hover:underline">Desmarcar Todos</button>
                    </div>
                </div>

                <div className="h-[350px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {filteredTenants.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => toggleTenant(t.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                          t.selected ? 'border-blue-100 bg-blue-50/30' : 'border-slate-50 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          t.selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'
                        }`}>
                          {t.selected && <CheckCircle2 size={16} />}
                        </div>
                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                          {t.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{t.nome}</p>
                          <p className="text-sm text-slate-500">{t.telefone}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Step 3: Message Editing */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-800">Personalize sua mensagem</h2>
                  <p className="text-slate-500 italic">Use as variáveis entre colchetes para personalizar automaticamente</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Editor Template</label>
                    <textarea 
                      className="w-full h-64 p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none font-medium leading-relaxed"
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2 text-xs">
                      {['[NOME]', '[IMOVEL]', '[VALOR]', '[LINK]', '[REDE_SOCIAL]'].map(tag => (
                        <button 
                          key={tag}
                          onClick={() => setMessageTemplate(prev => prev + ' ' + tag)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Prévia (Exemplo)</label>
                    <div className="w-full h-64 p-6 rounded-2xl bg-[#E9FED8] border border-[#d5edc4] relative overflow-hidden flex flex-col">
                      {/* Whatsapp UI Mockup */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-[#075e54]"></div>
                      <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800 pt-4 font-sans">
                        {generateMessage(filteredTenants[0] || { id: '1', nome: 'Cliente Exemplo', telefone: '11999999999' })}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <span className="text-[10px] text-slate-400">13:22 ✔️✔️</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 text-center italic">Cada cliente receberá uma mensagem personalizada com seus próprios dados.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Sending Dashboard */}
            {step === 4 && (
              <div className="space-y-6 flex-1">
                <div className="text-center space-y-2 border-b border-slate-100 pb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Pronto para o envio!</h2>
                    <p className="text-slate-500">Cliqure no botão de cada contato para abrir o WhatsApp Web</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar pt-4">
                    {tenants.filter(t => t.selected).map(t => (
                      <div 
                        key={t.id} 
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          t.sent ? 'bg-emerald-50 border-emerald-100 grayscale-[0.5]' : 'bg-white border-slate-100 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            t.sent ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                              {t.sent ? <CheckCircle2 size={14} /> : t.nome.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                              <p className="font-bold text-slate-800 truncate text-sm">{t.nome}</p>
                              <p className="text-xs text-slate-500">{t.telefone}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleSend(t)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            t.sent ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md active:scale-95'
                          }`}
                        >
                          <MessageCircle size={14} />
                          {t.sent ? 'ENVIADO' : 'ENVIAR'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-auto pt-8 border-t border-slate-100">
              <button
                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                disabled={step === 1}
                className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-black transition-all text-lg shadow-lg active:scale-95 ${
                  step === 1 ? 'opacity-0 pointer-events-none' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:-translate-y-1 hover:shadow-xl shadow-slate-200/50'
                }`}
              >
                <ChevronLeft size={20} /> Anterior
              </button>
              
              {step < 4 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !selectedPropertyId) {
                      toast.warning('Selecione um imóvel antes de prosseguir');
                      return;
                    }
                    if (step === 2 && filteredTenants.filter(t => t.selected).length === 0) {
                      toast.warning('Selecione pelo menos um locatário');
                      return;
                    }
                    setStep(prev => Math.min(4, prev + 1));
                  }}
                  className="flex items-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/30 active:scale-95 transition-all text-lg"
                >
                  Próximo Passo <ChevronRight size={20} />
                </button>
              ) : (
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-black/20 hover:bg-slate-800 hover:-translate-y-1 active:scale-95 transition-all text-lg"
                >
                  Finalizar Campanha
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        /* History View */
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Histórico de Envios</h2>
            <p className="text-sm text-slate-500">{history.length} mensagens enviadas</p>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
               <Megaphone className="mx-auto h-12 w-12 text-slate-300 mb-4" />
               <p className="text-slate-500 font-medium">Nenhuma campanha realizada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 font-bold text-xs uppercase tracking-widest text-slate-400">Data de Envio</th>
                    <th className="pb-4 font-bold text-xs uppercase tracking-widest text-slate-400">Locatário</th>
                    <th className="pb-4 font-bold text-xs uppercase tracking-widest text-slate-400">Imóvel Promovido</th>
                    <th className="pb-4 font-bold text-xs uppercase tracking-widest text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-sm font-medium text-slate-600">
                        {new Date(item.data_envio).toLocaleDateString('pt-BR')} às {new Date(item.data_envio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {item.locatario.nome.charAt(0)}
                           </div>
                           <span className="font-bold text-slate-800">{item.locatario.nome}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                           <Building size={14} className="text-slate-400" />
                           <span className="text-sm">{item.imovel.nome}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                           <CheckCircle2 size={12} /> Enviado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
