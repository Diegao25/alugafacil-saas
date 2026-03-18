'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Download, FileText, Eye, Pencil, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

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

  async function handlePreviewContract(id: string) {
    try {
      const response = await api.get(`/contracts/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Erro ao pré-visualizar contrato');
    }
  }

  function handleEditContract(id: string) {
    router.push(`/dashboard/contracts/${id}/edit`);
  }

  async function handleSendWhatsApp(reserva: any) {
    const phone = reserva.locatario.telefone;
    if (!phone) {
      toast.warning('Telefone do locatário não disponível');
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
      const message = `Olá ${reserva.locatario.nome}, segue o contrato do imóvel para sua revisão: ${link}`;
      const waLink = `https://api.whatsapp.com/send?phone=55${digits.replace(/^55/, '')}&text=${encodeURIComponent(message)}`;
      window.open(waLink, '_blank');
      toast.success('Link do contrato copiado para o WhatsApp');
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
                reservations.map((reserva) => (
                  <tr key={reserva.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">Contrato PDF</div>
                          <div className="text-xs text-slate-500">Auto-gerado</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(new Date(reserva.data_checkin), 'dd/MM/yyyy')} a {format(new Date(reserva.data_checkout), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-800">{reserva.imovel.nome}</div>
                      <div className="text-xs text-slate-500">{reserva.locatario.nome}</div>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handlePreviewContract(reserva.id)}
                      className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-blue-600 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                      title="Pré-visualizar PDF"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(reserva)}
                      className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-green-600 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                      title="Enviar pelo WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>

                    <button 
                      onClick={() => handleDownloadContract(reserva.id, reserva.locatario.nome)}
                      className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-rose-600 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                      title="Baixar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditContract(reserva.id)}
                      className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-white bg-slate-100 hover:bg-amber-500 rounded-lg transition-colors border border-transparent shadow-sm hover:shadow-md"
                      title="Editar contrato"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
