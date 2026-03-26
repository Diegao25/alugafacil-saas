'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { fetchAddressByCep, maskCep, getPrimaryAddressSegment, formatCurrencyInput, parseCurrencyBR } from '@/lib/utils';
import { LogOut, Save, Home, MapPin, DollarSign, Users, Image as ImageIcon } from 'lucide-react';
import CollapsibleSection from '@/components/CollapsibleSection';

export default function NewPropertyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    cep: '',
    endereco: '',
    descricao: '',
    valor_diaria: '',
    capacidade_maxima: '',
    redes_sociais_url: '',
    foto_principal: '',
    comodidades: ''
  });
  const [cepError, setCepError] = useState<string | null>(null);
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [numero, setNumero] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const endereco = `${logradouro}${numero ? `, ${numero}` : ''}${bairro ? `, ${bairro}` : ''}${cidade ? `, ${cidade}` : ''}${uf ? ` - ${uf}` : ''}${formData.cep ? `, ${formData.cep}` : ''}`;

    try {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        endereco,
        valor_diaria: parseCurrencyBR(formData.valor_diaria),
        capacidade_maxima: parseInt(formData.capacidade_maxima, 10),
        redes_sociais_url: formData.redes_sociais_url,
        foto_principal: formData.foto_principal,
        comodidades: formData.comodidades
      };
      await api.post('/properties', payload);
      toast.success('Imóvel criado com sucesso!');
      
      if (searchParams?.get('onboarding') === '1') {
        router.push('/dashboard');
      } else {
        router.push('/dashboard/properties');
      }
    } catch (error) {
      const err = error as any;
      const message = err?.response?.data?.error ?? 'Erro ao criar imóvel';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Novo Imóvel</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seção 1: Informações Básicas */}
        <CollapsibleSection 
          title="Informações Básicas" 
          icon={<Home className="w-5 h-5" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nome do Imóvel</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                placeholder="Ex: Chácara Recanto Feliz"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Descrição (Opcional)</label>
              <textarea
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                placeholder="Descreva as características do imóvel..."
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Seção 2: Localização */}
        <CollapsibleSection 
          title="Localização" 
          icon={<MapPin className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">CEP</label>
              <input
                type="text"
                placeholder="00000-000"
                maxLength={9}
                value={formData.cep}
                onChange={async (e) => {
                  const masked = maskCep(e.target.value);
                  setFormData({ ...formData, cep: masked });
                  setCepError(null);

                  const digits = masked.replace(/\D/g, '');
                  if (digits.length === 8) {
                    const data = await fetchAddressByCep(masked);
                    if (!data) {
                      setCepError('CEP não encontrado');
                      setLogradouro('');
                      setBairro('');
                      setCidade('');
                      setUf('');
                    } else {
                      setCepError(null);
                      setLogradouro(getPrimaryAddressSegment(data.logradouro || ''));
                      setBairro(data.bairro || '');
                      setCidade(data.localidade || '');
                      setUf(data.uf || '');
                    }
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
              />
              {cepError && <p className="text-sm text-red-600">{cepError}</p>}
            </div>

            <div className="space-y-2 col-span-full md:col-span-1">
              <label className="text-sm font-bold text-slate-700">Logradouro</label>
              <input
                type="text"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Número</label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Bairro</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">UF</label>
              <input
                type="text"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                maxLength={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Seção 3: Preço e Capacidade */}
        <CollapsibleSection 
          title="Preço e Capacidade" 
          icon={<DollarSign className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Valor da Diária (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formData.valor_diaria}
                onChange={(e) => setFormData({ ...formData, valor_diaria: formatCurrencyInput(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                placeholder="250,00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Capacidade máxima
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.capacidade_maxima}
                onChange={(e) => setFormData({ ...formData, capacidade_maxima: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="Ex: 10"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Seção 4: Mídia e Vitrine */}
        <CollapsibleSection 
          title="Mídia e Vitrine" 
          icon={<ImageIcon className="w-5 h-5" />}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Link da Foto Principal (Capa)</label>
              <input
                type="url"
                value={formData.foto_principal}
                onChange={(e) => setFormData({ ...formData, foto_principal: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                placeholder="https://sua-imagem.com/foto.jpg"
              />
              <p className="text-[11px] text-slate-500 italic">Dica: Use um link do Instagram, Drive, ou Dropbox (link direto).</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Comodidades (Separadas por vírgula)</label>
              <input
                type="text"
                value={formData.comodidades}
                onChange={(e) => setFormData({ ...formData, comodidades: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                placeholder="Ex: WiFi, Ar Condicionado, Piscina, Churrasqueira"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Link Rede Social (Opcional)</label>
              <input
                type="url"
                value={formData.redes_sociais_url}
                onChange={(e) => setFormData({ ...formData, redes_sociais_url: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                placeholder="https://www.instagram.com/seuimovel"
              />
              <p className="text-[11px] text-slate-500 italic">Cole aqui o link direto da postagem ou do seu perfil.</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Botões de Ação */}
        <div className="pt-8 flex justify-end gap-2">
          <Link
            href="/dashboard/properties"
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Criando Imóvel...' : 'Criar Imóvel'}
          </button>
        </div>
      </form>
    </div>
  );
}
