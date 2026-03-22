'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import Link from 'next/link';

export default function ContractViewPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    let objectUrl: string | null = null;

    async function loadPdf() {
      try {
        const response = await api.get(`/contracts/${contractId}`, { responseType: 'blob' });
        objectUrl = window.URL.createObjectURL(
          new Blob([response.data], { type: 'application/pdf' })
        );
        setPdfUrl(objectUrl);
      } catch (error) {
        toast.error('Não foi possível carregar o contrato.');
        router.push('/dashboard/contracts');
      } finally {
        setLoading(false);
      }
    }

    if (contractId) {
      void loadPdf();
    }

    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [contractId, router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Visualizar Contrato</h1>
          <p className="text-sm text-slate-500">Pré-visualização do PDF gerado para esta reserva.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/contracts"
            className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Voltar
          </Link>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Abrir em nova aba
            </a>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="Visualização do contrato"
            className="h-[75vh] w-full"
          />
        ) : (
          <div className="flex h-[50vh] items-center justify-center px-6 text-center text-slate-500">
            Não foi possível exibir o contrato.
          </div>
        )}
      </div>
    </div>
  );
}
