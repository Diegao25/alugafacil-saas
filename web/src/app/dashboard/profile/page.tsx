'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { maskCep, fetchAddressByCep, isValidCpfCnpj, isValidPhone, maskCpfCnpj, maskPhone, parseAddressComponents, PHONE_POLICY_MESSAGE, unmask } from '@/lib/utils';
import { User, Phone, MapPin, CreditCard, Save, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, syncUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [showOwnerProfileLabel, setShowOwnerProfileLabel] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [readOnly, setReadOnly] = useState(false);

  const [address, setAddress] = useState({
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: ''
  });

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf_cnpj: '',
    telefone: ''
  });

  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      try {
        if (!user?.id) return;

        const response = await api.get('/auth/me');
        const currentUser = response.data;
        const canEditOwnerProfile = Boolean(currentUser.can_manage_users);
        let profileData = response.data;

        if (!canEditOwnerProfile) {
          try {
            const ownerResponse = await api.get('/auth/owner');
            profileData = ownerResponse.data;
          } catch (error) {
            profileData = response.data;
            toast.warn('Não foi possível carregar o perfil do locador. Exibindo seus dados.');
          }
        }
        setShowOwnerProfileLabel(!canEditOwnerProfile);
        setReadOnly(!canEditOwnerProfile);

        const endereco = profileData.endereco || '';

        setFormData({
          nome: profileData.nome || '',
          email: profileData.email || '',
          cpf_cnpj: profileData.cpf_cnpj || '',
          telefone: profileData.telefone || ''
        });

        const parsed = parseAddressComponents(endereco);
        setCep(parsed.cep ? maskCep(parsed.cep) : '');
        setAddress({
          logradouro: parsed.logradouro || '',
          numero: parsed.numero || '',
          bairro: parsed.bairro || '',
          cidade: parsed.cidade || '',
          uf: parsed.uf || ''
        });
      } catch (error) {
        toast.error('Erro ao carregar seu perfil');
      } finally {
        setFetching(false);
      }
    }
    loadProfile();
  }, [user?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (readOnly) {
      return;
    }

    setLoading(true);

    try {
      if (!formData.cpf_cnpj.trim()) {
        setDocumentError('CPF ou CNPJ é obrigatório.');
        toast.error('CPF ou CNPJ é obrigatório.');
        setLoading(false);
        return;
      }

      if (!isValidCpfCnpj(formData.cpf_cnpj)) {
        setDocumentError('Informe um CPF ou CNPJ válido.');
        toast.error('Informe um CPF ou CNPJ válido.');
        setLoading(false);
        return;
      }

      if (formData.telefone && !isValidPhone(formData.telefone)) {
        setPhoneError(PHONE_POLICY_MESSAGE);
        toast.error(PHONE_POLICY_MESSAGE);
        setLoading(false);
        return;
      }

      const enderecoSegment = [
        [address.logradouro, address.numero].filter(Boolean).join(', '),
        address.bairro
      ]
        .filter(Boolean)
        .join(', ');

      const cidadeUf = [address.cidade, address.uf].filter(Boolean).join(' / ');
      const formattedEndereco = [
        enderecoSegment,
        cidadeUf,
        cep ? `CEP ${cep}` : undefined
      ]
        .filter(Boolean)
        .join(' - ');

      if (!address.numero) {
        toast.error('Por favor informe o número do endereço.');
        setLoading(false);
        return;
      }

      await api.put('/auth/profile', {
        nome: formData.nome,
        cpf_cnpj: unmask(formData.cpf_cnpj),
        telefone: formData.telefone ? unmask(formData.telefone) : null,
        endereco: formattedEndereco
      });
      
      // Sincroniza o usuário localmente para refletir as mudanças no dashboard imediatamente
      if (syncUser) {
        await syncUser();
      }

      toast.success('Perfil atualizado com sucesso!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  }


  async function handleCepBlur() {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setCepLoading(true);
    const addressData = await fetchAddressByCep(digits);
    setCepLoading(false);

    if (!addressData) {
      toast.error('CEP não encontrado');
      return;
    }

    setAddress((prev) => ({
      ...prev,
      logradouro: addressData.logradouro || prev.logradouro,
      bairro: addressData.bairro || prev.bairro,
      cidade: addressData.localidade || prev.cidade,
      uf: addressData.uf || prev.uf
    }));

    toast.success('Endereço preenchido a partir do CEP');
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          {showOwnerProfileLabel ? 'Perfil do Locador' : 'Meu Perfil de Locador'}
        </h1>
        <p className="text-slate-500 mt-2">
          {showOwnerProfileLabel
            ? 'Visualize os dados do locador que serão exibidos nos contratos de locação.'
            : 'Gerencie suas informações pessoais que serão exibidas nos contratos de locação.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-full">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    disabled={readOnly}
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    required
                    disabled={readOnly}
                    value={formData.cpf_cnpj}
                    onChange={(e) => {
                      const nextValue = maskCpfCnpj(e.target.value);
                      setFormData({ ...formData, cpf_cnpj: nextValue });
                      if (documentError) {
                        setDocumentError('');
                      }
                    }}
                    onBlur={() => {
                      if (!formData.cpf_cnpj.trim()) {
                        setDocumentError('CPF ou CNPJ é obrigatório.');
                        return;
                      }
                      if (!isValidCpfCnpj(formData.cpf_cnpj)) {
                        setDocumentError('Informe um CPF ou CNPJ válido.');
                        return;
                      }
                      setDocumentError('');
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                  {documentError && (
                    <p className="text-sm font-medium text-rose-600">{documentError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    required
                    disabled={readOnly}
                    value={formData.telefone}
                    onChange={(e) => {
                      setFormData({ ...formData, telefone: maskPhone(e.target.value) });
                      if (phoneError) setPhoneError('');
                    }}
                    onBlur={() => {
                      if (formData.telefone && !isValidPhone(formData.telefone)) {
                        setPhoneError(PHONE_POLICY_MESSAGE);
                      } else {
                        setPhoneError('');
                      }
                    }}
                    className={`w-full rounded-xl border ${phoneError ? 'border-rose-500' : 'border-slate-200'} px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                  {phoneError && (
                    <p className="text-sm font-medium text-rose-600">{phoneError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    CEP
                  </label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    required
                    value={cep}
                    onChange={(e) => setCep(maskCep(e.target.value))}
                    onBlur={handleCepBlur}
                    disabled={cepLoading || readOnly}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Logradouro
                  </label>
                  <input
                    type="text"
                    placeholder="Logradouro"
                    required
                    disabled={readOnly}
                    value={address.logradouro}
                    onChange={(e) => setAddress({ ...address, logradouro: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Número</label>
                  <input
                    type="text"
                    placeholder="Número"
                    required
                    disabled={readOnly}
                    value={address.numero}
                    onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    required
                    disabled={readOnly}
                    value={address.bairro}
                    onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cidade</label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    required
                    disabled={readOnly}
                    value={address.cidade}
                    onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">UF</label>
                  <input
                    type="text"
                    placeholder="UF"
                    maxLength={2}
                    required
                    disabled={readOnly}
                    value={address.uf}
                    onChange={(e) => setAddress({ ...address, uf: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 outline-none transition-all bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  disabled={loading}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                >
                  <LogOut className="h-5 w-5" />
                  Sair
                </button>

                {!readOnly && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                  >
                    <Save className="h-5 w-5" />
                    {loading ? 'Salvando...' : 'Salvar e Sair'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-lg font-bold mb-4">Resumo do Locador</h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400 block mb-1">E-mail de Login</span>
                <p className="font-medium text-slate-200">{formData.email}</p>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  "Esses dados serão utilizados no cabeçalho e rodapé dos contratos de locação gerados automaticamente."
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
            <h4 className="text-emerald-900 font-bold mb-2 flex items-center gap-2">
              💡 Dica Pro
            </h4>
            <p className="text-sm text-emerald-800 leading-relaxed">
              Mantenha seu endereço e CPF atualizados para que os contratos tenham validade jurídica correta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
