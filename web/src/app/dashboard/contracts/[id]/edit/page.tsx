'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { addDays } from 'date-fns';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { formatCurrencyBR, maskPhone } from '@/lib/utils';
import { openPdfPreviewFromBlob } from '@/lib/pdf';

export default function ContractEditPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params?.id;

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!reservationId) return;

    (async () => {
      try {
        const response = await api.get(`/reservations/${reservationId}`);
        const reservation = response.data;
        try {
          const draftResponse = await api.get(`/contracts/${reservationId}/draft`);
          if (draftResponse?.data?.content) {
            setDraft(normalizeSignatureBlock(draftResponse.data.content));
            return;
          }
        } catch (error) {
          // rascunho ainda não existe
        }
        setDraft(normalizeSignatureBlock(buildContractDraft(reservation)));
      } catch (error) {
        toast.error('Não foi possível carregar os dados para edição');
        router.push('/dashboard/contracts');
      } finally {
        setLoading(false);
      }
    })();
  }, [reservationId, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/contracts/${reservationId}/draft`, { content: draft });
      toast.success('Alterações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar alterações do contrato');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!reservationId) return;
    const previewWindow = window.open('', '_blank');

    try {
      const response = await api.get(`/contracts/${reservationId}`, { responseType: 'blob' });
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      await openPdfPreviewFromBlob(pdfBlob, previewWindow);
    } catch (error) {
      previewWindow?.close();
      toast.error('Erro ao gerar visualização do contrato');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Editar Contrato</h1>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">Carregando contrato...</div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-3">
              Edite o texto livremente. As alterações serão usadas como versão final para visualização,
              download e envio do contrato.
            </p>

            <textarea
              rows={14}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all bg-slate-50 font-mono"
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/contracts"
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-2xl font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-semibold shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                onClick={handlePreview}
                className="bg-slate-100 text-slate-700 px-5 py-2 rounded-2xl font-semibold border border-slate-200 hover:border-slate-300 transition-colors"
              >
                Visualizar contrato atual
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              A versão final agora usa o texto salvo aqui, tanto para visualização quanto para download e envio.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function buildContractDraft(reservation: any): string {
  const owner = reservation.imovel?.user || {};
  const tenant = reservation.locatario || {};

  const propertyAddress = reservation.imovel?.endereco || 'Rua das Palmeiras, nº 745';
  const propertyNeighborhood = extractNeighborhood(propertyAddress) || 'Centro';
  const propertyCityUf = extractCityUf(propertyAddress) || 'Ubatuba – SP';
  const propertyCep = extractCep(propertyAddress) || '11680-000';

  const tenantAddress = tenant.endereco || 'Rua das Flores, nº 120';
  const tenantNeighborhood = extractNeighborhood(tenantAddress) || 'Centro';
  const tenantCityUf = extractCityUf(tenantAddress) || 'São Paulo – SP';
  const tenantCep = extractCep(tenantAddress) || '01000-000';

  const ownerCpf = owner.cpf_cnpj || '123.456.789-00';
  const tenantCpf = tenant.cpf || '987.654.321-00';
  const tenantRg = '12.345.678-9';

  const ownerPhone = owner.telefone ? maskPhone(owner.telefone) : '(12) 99999-0000';
  const tenantPhone = tenant.telefone ? maskPhone(tenant.telefone) : '(11) 98888-0000';
  const tenantHomePhone = tenant.telefone ? maskPhone(tenant.telefone) : '(11) 3000-0000';

  const checkinDate = formatFullDate(reservation.data_checkin);
  const checkoutDate = formatFullDate(reservation.data_checkout);
  const checkinTime = reservation.hora_checkin || '18h00';
  const checkoutTime = reservation.hora_checkout || '08h00';

  const totalValue = Number(reservation.valor_total || 3600);

  const payments = reservation.pagamentos || [];
  const totalPayment = payments.find((payment: any) => /total/i.test(payment.tipo));
  const sinalPayment = payments.find((payment: any) => /sinal/i.test(payment.tipo));
  const parcelPayments = payments.filter(
    (payment: any) => /parcela/i.test(payment.tipo) || /restante/i.test(payment.tipo)
  );
  const orderedParcelPayments = [...parcelPayments].sort((a, b) => {
    const matchA = String(a.tipo || '').match(/parcela\s*(\d+)/i);
    const matchB = String(b.tipo || '').match(/parcela\s*(\d+)/i);
    const numA = matchA ? Number(matchA[1]) : 0;
    const numB = matchB ? Number(matchB[1]) : 0;
    return numA - numB;
  });
  const baseInstallmentDate =
    sinalPayment?.data_pagamento ? new Date(sinalPayment.data_pagamento) : new Date(reservation.data_checkin);

  const paymentLines: string[] = [];
  if (totalPayment) {
    paymentLines.push(
      `- Pagamento total: R$ ${formatCurrencyBR(totalPayment.valor)} | ${formatShortDate(
        totalPayment.data_pagamento || reservation.data_checkin
      )} | ${totalPayment.meio_pagamento || 'Forma não informada'}`
    );
  } else {
    if (sinalPayment) {
      paymentLines.push(
        `- Sinal: R$ ${formatCurrencyBR(sinalPayment.valor)} | ${formatShortDate(
          sinalPayment.data_pagamento || reservation.data_checkin
        )} | ${sinalPayment.meio_pagamento || 'Forma não informada'}`
      );
    }

    orderedParcelPayments.forEach((payment: any) => {
      const match = String(payment.tipo || '').match(/parcela\s*(\d+)/i);
      const installmentNumber = match ? Number(match[1]) : 1;
      const dueDate = addDays(baseInstallmentDate, 30 * installmentNumber);
      paymentLines.push(
        `- ${payment.tipo}: R$ ${formatCurrencyBR(payment.valor)} | ${formatShortDate(dueDate)}`
      );
    });
  }

  const signatureDateLabel = formatSignatureDate(new Date());
  const ownerCity = extractCity(owner.endereco || propertyAddress) || extractCity(propertyAddress) || 'São Paulo';
  const tenantCity = extractCity(tenantAddress) || 'São Paulo';

  return [
    'CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL',
    '',
    '1. OBJETO DO CONTRATO',
    'O presente contrato tem por objeto a locação temporária de imóvel residencial urbano, destinado exclusivamente para fins de lazer e hospedagem temporária, ficando o LOCATÁRIO responsável pela conservação do imóvel durante todo o período da locação.',
    '',
    '2. DADOS DO IMÓVEL',
    'Imóvel residencial localizado em:',
    propertyAddress,
    `Bairro ${propertyNeighborhood}`,
    `Cidade: ${propertyCityUf}`,
    `CEP: ${propertyCep}`,
    '',
    '3. DADOS DO LOCADOR',
    `Nome: ${owner.nome || 'Locador não informado'}`,
    `CPF: ${ownerCpf}`,
    `Telefone / WhatsApp: ${ownerPhone}`,
    `E-mail: ${owner.email || 'joaocarlos@email.com'}`,
    '',
    '4. DADOS DO LOCATÁRIO',
    `Nome: ${tenant.nome || 'Locatário não informado'}`,
    `RG: ${tenantRg}`,
    `CPF: ${tenantCpf}`,
    'Endereço:',
    tenantAddress,
    `Bairro ${tenantNeighborhood}`,
    `Cidade: ${tenantCityUf}`,
    `CEP: ${tenantCep}`,
    `Telefone residencial: ${tenantHomePhone}`,
    `Celular / WhatsApp: ${tenantPhone}`,
    '',
    '5. PRAZO DA LOCAÇÃO',
    'A locação terá prazo determinado, conforme abaixo:',
    `Check-in: ${checkinDate}, a partir das ${checkinTime}`,
    `Check-out: ${checkoutDate}, até às ${checkoutTime}`,
    'O LOCATÁRIO compromete-se a devolver o imóvel completamente desocupado até o horário estipulado, considerando a possibilidade de novos hóspedes após o término da locação.',
    '',
    '6. REGRAS DE UTILIZAÇÃO',
    'Não é permitida a permanência de animais no imóvel.',
    'O imóvel não fornece:',
    '- Lençóis',
    '- Travesseiros',
    '- Toalhas de banho',
    'O LOCATÁRIO compromete-se a:',
    '- Não realizar barulhos excessivos ou eventos que perturbem vizinhos.',
    '- Cumprir as normas previstas no Art. 42 da Lei nº 3.688/41 (Lei de Contravenções Penais).',
    '- Respeitar os limites de ruído estabelecidos pela NBR 10.151 da ABNT e demais legislações ambientais aplicáveis.',
    '- Cumprir a legislação municipal referente à emissão de ruídos.',
    'O LOCATÁRIO será responsável por qualquer multa, sanção administrativa ou processo decorrente do descumprimento dessas normas.',
    '',
    '7. LIMITE DE OCUPAÇÃO',
    'Número máximo permitido de hóspedes:',
    '15 pessoas (entre adultos e crianças).',
    'O LOCATÁRIO declara ciência e responsabilidade pelo cumprimento desta regra.',
    '',
    '8. CONSERVAÇÃO DO IMÓVEL',
    'Ao término da locação, o LOCATÁRIO deverá:',
    '- Entregar o imóvel limpo',
    '- Manter móveis e utensílios em perfeito estado',
    '- Devolver todas as chaves',
    'Caso seja constatado dano, quebra ou inutilização de qualquer item do imóvel, o LOCATÁRIO deverá ressarcir o LOCADOR conforme valor de mercado do bem danificado.',
    '',
    '9. VALOR E CONDIÇÕES DE PAGAMENTO',
    'O valor total da locação é de:',
    `R$ ${formatCurrencyBR(totalValue)}`,
    'Forma de pagamento:',
    ...paymentLines,
    '',
    '10. POLÍTICA DE CANCELAMENTO',
    'Em caso de desistência por parte do LOCATÁRIO, os valores pagos não serão devolvidos, considerando que o imóvel permaneceu reservado e indisponível para outros interessados durante o período.',
    '',
    '11. DADOS PARA PAGAMENTO',
    `Titular da conta: ${owner.nome || 'Locador não informado'}`,
    'Banco: Banco Exemplo',
    'Agência: 0001',
    'Conta corrente: 12345678-9',
    'Chave PIX: 12999990000',
    '',
    '12. ASSINATURAS',
    'Para maior clareza e validade jurídica, as partes assinam o presente contrato.',
    '',
    formatSignatureColumns('________________________________________', '________________________________________'),
    formatSignatureColumns(
      `Locador: ${owner.nome || 'Locador não informado'}`,
      `Locatário: ${tenant.nome || 'Locatário não informado'}`
    ),
    formatSignatureColumns(
      `${ownerCity}, ${signatureDateLabel}.`,
      `${tenantCity}, ${signatureDateLabel}.`
    ),
    '',
    '13. ASSINATURA DIGITAL',
    'Este contrato poderá ser assinado de forma digital conforme legislação vigente, utilizando plataformas oficiais de assinatura eletrônica.',
    'Exemplo:',
    'https://www.gov.br/governodigital/pt-br/assinatura-eletronica'
  ].join('\n');
}

function buildContractDraftLegacy(reservation: any): string {
  const propertyAddress = reservation.imovel?.endereco || 'Rua das Palmeiras, nº 745';
  const tenant = reservation.locatario || {};
  const checkin = formatDate(reservation.data_checkin);
  const checkout = formatDate(reservation.data_checkout);

  return [
    'CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL',
    '',
    '1. OBJETO DO CONTRATO',
    `O imóvel “${reservation.imovel?.nome || 'residencial'}” destina-se a lazer e hospedagem temporária.`,
    '',
    '2. DADOS DO IMÓVEL',
    propertyAddress,
    '',
    '3. DADOS DO LOCADOR',
    `${reservation.imovel?.user?.nome || 'Locador não informado'}`,
    '',
    '4. DADOS DO LOCATÁRIO',
    `${tenant.nome || 'Locatário não informado'} | CPF ${tenant.cpf || '___________'}`,
    '',
    '5. PRAZO DA LOCAÇÃO',
    `Entrada: ${checkin} | Saída: ${checkout}`,
    '',
    '6. REGRAS',
    '- Manter silêncio e zelar pelo imóvel',
    '',
    '7. LIMITE DE OCUPAÇÃO',
    '15 pessoas.',
    '',
    '8. CONSERVAÇÃO',
    '- Limpar, conservar móveis e devolver chaves.',
    '',
    '9. VALOR',
    `Valor total: R$ ${formatCurrencyBR(reservation.valor_total ?? 0)}`,
    '',
    '10. CANCELAMENTO',
    '- Valores pagos não são devolvidos.',
    '',
    '11. DADOS PARA PAGAMENTO',
    'Conta: Banco Exemplo – 0001/12345678-9',
    '',
    '12. ASSINATURAS',
    'LOCADOR | LOCATÁRIO',
    '',
    '13. ASSINATURA DIGITAL',
    'https://www.gov.br/governodigital/pt-br/assinatura-eletronica'
  ].join('\n');
}

function formatDate(value?: string): string {
  return formatFullDate(value);
}

function normalizeSignatureBlock(content: string): string {
  if (!content) return content;
  const lines = content.split('\n');
  const signatureIndex = lines.findIndex((line) => line.trim() === '12. ASSINATURAS');
  if (signatureIndex === -1) return content;

  const locadorIndex = lines.findIndex(
    (line, index) => index > signatureIndex && line.trim().startsWith('Locador:')
  );
  const locatarioIndex = lines.findIndex(
    (line, index) => index > signatureIndex && line.trim().startsWith('Locatário:')
  );

  if (locadorIndex === -1 || locatarioIndex === -1) return content;
  if (lines[locadorIndex].includes('|') || lines[locatarioIndex].includes('|')) return content;

  const locadorCityLine = (lines[locadorIndex + 1] || '').trim();
  const locatarioCityLine = (lines[locatarioIndex + 1] || '').trim();

  const replaceStart = Math.max(signatureIndex + 1, locadorIndex - 1);
  const replaceEnd = Math.min(lines.length, locatarioIndex + 2);

  const mergedLines = [
    formatSignatureColumns('________________________________________', '________________________________________'),
    formatSignatureColumns(lines[locadorIndex].trim(), lines[locatarioIndex].trim()),
    formatSignatureColumns(locadorCityLine, locatarioCityLine)
  ];

  const nextLines = [...lines];
  nextLines.splice(replaceStart, replaceEnd - replaceStart, ...mergedLines);

  return nextLines.join('\n');
}

function formatSignatureColumns(left: string, right: string): string {
  const columnWidth = 50;
  const leftText = left.trim();
  const rightText = right.trim();
  const paddedLeft = leftText.padEnd(columnWidth, ' ');
  return `${paddedLeft} | ${rightText}`;
}

function formatFullDate(value?: string): string {
  if (!value) return '__/__/____';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '__/__/____';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatShortDate(value?: string | Date): string {
  if (!value) return '__/__/____';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '__/__/____';
  return date.toLocaleDateString('pt-BR');
}

function formatSignatureDate(value?: string | Date): string {
  if (!value) return '__/__/____';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '__/__/____';
  const formatted = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  return formatted.replace(/de\s+([a-zà-úçãõ]+)/i, (match, month) => {
    const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
    return `de ${capitalized}`;
  });
}

function extractNeighborhood(address?: string): string {
  if (!address) return '';
  const normalized = address.toLowerCase();
  const bairroMatch = normalized.match(/bairro\s+([a-zçãáâàéêíîóôúù\s]+)/i);
  if (bairroMatch) {
    return capitalize(bairroMatch[1]);
  }
  const parts = address.split(',');
  if (parts.length >= 3) {
    return parts[2].trim();
  }
  return '';
}

function extractCityUf(address?: string): string {
  if (!address) return '';
  const matchDash = address.match(/([A-Za-zÀ-ÿ\s]+)[–-]\s*([A-Z]{2})/);
  if (matchDash) {
    return `${matchDash[1].trim()} – ${matchDash[2]}`;
  }
  const matchSlash = address.match(/([A-Za-zÀ-ÿ\s]+)\/\s*([A-Z]{2})/);
  if (matchSlash) {
    return `${matchSlash[1].trim()} – ${matchSlash[2]}`;
  }
  return '';
}

function extractCity(address?: string): string {
  const cityUf = extractCityUf(address);
  if (!cityUf) return '';
  const parts = cityUf.split(/[–-]/);
  return parts[0]?.trim() || '';
}

function extractCep(address?: string): string {
  if (!address) return '';
  const match = address.match(/(\d{5}-?\d{3})/);
  if (!match) return '';
  const digits = match[1].replace(/\D/g, '');
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function capitalize(value: string): string {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}
