'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { fetchAddressByCep, maskCep, getPrimaryAddressSegment, formatCurrencyInput, parseCurrencyBR } from '@/lib/utils';
import { LogOut, Save } from 'lucide-react';

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    cep: '',
    endereco: '',
    descricao: '',
    valor_diaria: '',
    capacidade_maxima: '',
    redes_sociais_url: ''
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
        redes_sociais_url: formData.redes_sociais_url
      };
      await api.post('/properties', payload);
      toast.success('Imóvel criado com sucesso!');
      router.push('/dashboard/properties');
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

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Nome do Imóvel</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="Ex: Chácara Recanto Feliz"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">CEP</label>
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
                      setFormData({ ...formData, endereco: '' });
                    } else {
                      setCepError(null);
                      setLogradouro(getPrimaryAddressSegment(data.logradouro || ''));
                      setBairro(data.bairro || '');
                      setCidade(data.localidade || '');
                      setUf(data.uf || '');

                      const endereco = `${data.logradouro || ''}${data.bairro ? ', ' + data.bairro : ''}${data.localidade ? ', ' + data.localidade : ''}${data.uf ? ' - ' + data.uf : ''}`;
                      setFormData({ ...formData, endereco, cep: masked });
                    }
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
              {cepError && <p className="text-sm text-red-600">{cepError}</p>}
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Logradouro</label>
              <input
                type="text"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Número</label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Bairro</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">UF</label>
              <input
                type="text"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                maxLength={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Descrição (Opcional)</label>
              <textarea
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="Descreva as características do imóvel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Valor da Diária (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={formData.valor_diaria}
                onChange={(e) => setFormData({ ...formData, valor_diaria: formatCurrencyInput(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="250,00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Capacidade máxima</label>
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

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Link Rede Social (Ex: Instagram, Facebook)</label>
              <input
                type="url"
                value={formData.redes_sociais_url}
                onChange={(e) => setFormData({ ...formData, redes_sociais_url: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="https://www.instagram.com/seuimovel"
              />
              <p className="text-xs text-slate-500 italic">Opcional: Cole aqui o link direto da postagem ou do seu perfil.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Link
              href="/dashboard/properties"
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="h-5 w-5" />
              Sair
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Salvando...' : 'Salvar e Sair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
