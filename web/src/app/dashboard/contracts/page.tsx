'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Download, FileText, Eye, Pencil, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { openWhatsAppLink } from '@/lib/whatsapp';

export default function ContractsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  async function fetchReservations() {
    try {
      const response = await api.get('/reservations');
      setReservations(response.data);
    } catch (error) {
      toast.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadContract(id: string, name: string) {
    try {
      const response = await api.get(`/contracts/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Contrato_${name}.pdf`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      toast.success('Contrato gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar contrato');
    }
  }

  function handlePreviewContract(id: string) {
    router.push(`/dashboard/contracts/${id}/view`);
  }

  function handleEditContract(id: string) {
    router.push(`/dashboard/contracts/${id}/edit`);
  }

  async function handleSendWhatsApp(reserva: any) {
    const phone = reserva.locatario?.telefone;
    if (!phone) {
      toast.warning('O locatário não possui telefone cadastrado. Por favor, complete o cadastro do locatário com um número de WhatsApp.');
      return;
    }
    try {
      const response = await api.post(`/contracts/${reserva.id}/share`);
      const link = response.data?.link;
      if (!link) {
        throw new Error('Link não disponível');
      }
      const digits = phone.replace(/\D/g, '');
      if (!digits) {
        toast.warning('Telefone do locatário inválido');
        return;
      }
      const message = `Olá ${reserva.locatario?.nome || 'Cliente'}, segue o contrato do imóvel para sua revisão: ${link}`;
      const waLink = `https://wa.me/55${digits.replace(/^55/, '')}?text=${encodeURIComponent(message)}`;
      openWhatsAppLink(waLink);
      toast.success('Abrindo conversa no WhatsApp...');
    } catch (error) {
      toast.error('Erro ao gerar link do contrato para o WhatsApp');
    }
  }

  if (loading) return <div>Carregando contratos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Contratos Gerados</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Documento</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Período</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Imóvel & Locatário</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma reserva encontrada para gerar contrato.
                  </td>
                </tr>
              ) : (
                reservations.map((reserva) => {
                  const isExternal = !!reserva.provider || !reserva.locatario;
                  return (
                    <tr key={reserva.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${isExternal ? 'bg-slate-100 text-slate-400' : 'p-2 bg-rose-50 text-rose-600'}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className={`font-medium ${isExternal ? 'text-slate-400' : 'text-slate-800'}`}>
                              Contrato PDF
                            </div>
                            <div className="text-xs text-slate-500">
                              {isExternal ? `Sincronizado (${reserva.provider})` : 'Auto-gerado'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(reserva.data_checkin), 'dd/MM/yyyy')} a {format(new Date(reserva.data_checkout), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-medium ${isExternal ? 'text-slate-400' : 'text-slate-800'}`}>
                          {reserva.imovel.nome}
                        </div>
                        <div className="text-xs text-slate-500">
                          {reserva.locatario?.nome || (reserva.provider ? `Reserva ${reserva.provider}` : 'Reserva Externa')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          disabled={isExternal}
                          onClick={() => handlePreviewContract(reserva.id)}
                          className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                          title={isExternal ? 'Indisponível para reserva externa' : 'Pré-visualizar PDF'}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          disabled={isExternal}
                          onClick={() => handleSendWhatsApp(reserva)}
                          className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-green-600 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                          title={isExternal ? 'Indisponível para reserva externa' : 'Enviar pelo WhatsApp'}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>

                        <button 
                          disabled={isExternal}
                          onClick={() => handleDownloadContract(reserva.id, reserva.locatario?.nome || 'Externa')}
                          className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-rose-600 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                          title={isExternal ? 'Indisponível para reserva externa' : 'Baixar PDF'}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          disabled={isExternal}
                          onClick={() => handleEditContract(reserva.id)}
                          className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-amber-500 disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-600 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                          title={isExternal ? 'Indisponível para reserva externa' : 'Editar contrato'}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
