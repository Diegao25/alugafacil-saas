'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { maskCep, fetchAddressByCep, parseAddressComponents, maskCpfCnpj, maskPhone, unmask, getPrimaryAddressSegment } from '@/lib/utils';
import { LogOut, Save } from 'lucide-react';

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
    observacoes: ''
  });

  const [cepError, setCepError] = useState<string | null>(null);
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  useEffect(() => {
    async function loadTenant() {
      try {
        const response = await api.get(`/tenants/${id}`);
        const { nome, cpf, telefone, email, endereco, observacoes } = response.data;
        setFormData({
          nome,
          cpf: cpf ? maskCpfCnpj(cpf) : '',
          telefone: telefone ? maskPhone(telefone) : '',
          email: email || '',
          cep: '',
          endereco: endereco || '',
          observacoes: observacoes || ''
        });

        // Extrair componentes do endereço
        const components = parseAddressComponents(endereco);
        
        const derivedCep = components.cep || extractCepFromAddress(endereco);
        setFormData(prev => ({ 
          ...prev, 
          cep: derivedCep,
          endereco 
        }));
        
        setLogradouro(getPrimaryAddressSegment(components.logradouro || endereco));
        setNumero(components.numero);
        setBairro(components.bairro);
        setCidade(components.cidade);
        setUf(components.uf);

        // Se temos CEP, tentar buscar dados atualizados do ViaCEP
        if (components.cep) {
          const data = await fetchAddressByCep(components.cep);
          if (data) {
            // Atualizar apenas se os campos estiverem vazios ou se os dados do ViaCEP forem mais completos
            if (!components.logradouro && data.logradouro) setLogradouro(getPrimaryAddressSegment(data.logradouro));
            if (!components.bairro && data.bairro) setBairro(data.bairro);
            if (!components.cidade && data.localidade) setCidade(data.localidade);
            if (!components.uf && data.uf) setUf(data.uf);
          }
        }
      } catch (error) {
        toast.error('Erro ao carregar dados do locatário');
        router.push('/dashboard/tenants');
      } finally {
        setFetching(false);
      }
    }
    loadTenant();
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const enderecoCompleto = `${logradouro}${numero ? ', ' + numero : ''}${bairro ? ', ' + bairro : ''}${cidade ? ', ' + cidade : ''}${uf ? ' - ' + uf : ''}${formData.cep ? ', ' + formData.cep : ''}`.trim();

    setLoading(true);

    try {
      const payload = {
        nome: formData.nome,
        cpf: formData.cpf ? unmask(formData.cpf) : null,
        telefone: formData.telefone ? unmask(formData.telefone) : null,
        email: formData.email || null,
        endereco: enderecoCompleto || null,
        observacoes: formData.observacoes || null
      };
      await api.put(`/tenants/${id}`, payload);
      toast.success('Locatário atualizado com sucesso!');
      router.push('/dashboard/tenants');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao atualizar locatário';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Editar Locatário</h1>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Nome Completo</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">CPF/CNPJ</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: maskCpfCnpj(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
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
                      setLogradouro(data.logradouro || '');
                      setBairro(data.bairro || '');
                      setCidade(data.localidade || '');
                      setUf(data.uf || '');

                      const endereco = `${data.logradouro || ''}${data.bairro ? ', ' + data.bairro : ''}${data.localidade ? ', ' + data.localidade : ''}${data.uf ? ' - ' + data.uf : ''}`;
                      setFormData({ ...formData, endereco, cep: masked });
                    }
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
              {cepError && <p className="text-sm text-red-600">{cepError}</p>}
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Logradouro</label>
              <input
                type="text"
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Número</label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Bairro</label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">UF</label>
              <input
                type="text"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                maxLength={2}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium text-slate-700">Observações</label>
              <textarea
                rows={3}
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Link
              href="/dashboard/tenants"
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

function extractCepFromAddress(endereco?: string): string {
  if (!endereco) return '';
  const match = endereco.match(/(\d{5}-\d{3})/);
  if (match) return match[1];
  const digits = endereco.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return '';
}
