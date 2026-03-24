import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import PDFDocument from 'pdfkit';
import { formatPhone } from '../utils/formatters';
import jwt from 'jsonwebtoken';
import { addDays } from 'date-fns';
import { resolveOwnerId } from '../utils/owner';
import { getJwtSecret, getPublicApiBaseUrl } from '../utils/security';

type ReservationWithRelations = {
  id: string;
  data_checkin: Date;
  data_checkout: Date;
  hora_checkin?: string | null;
  hora_checkout?: string | null;
  valor_total?: number | null;
  contrato?: { content: string } | null;
  locatario: {
    id: string;
    nome: string;
    cpf?: string | null;
    telefone?: string | null;
    endereco?: string | null;
    observacoes?: string | null;
  };
  imovel: {
    id: string;
    nome: string;
    endereco?: string | null;
    usuario_id: string;
    user: {
      id: string;
      nome: string;
      cpf_cnpj?: string | null;
      telefone?: string | null;
      email?: string | null;
      endereco?: string | null;
    };
  };
  pagamentos: Array<{
    tipo: string;
    valor: number;
    status: string;
    data_pagamento?: Date | null;
    meio_pagamento?: string | null;
  }>;
};

export const generateContractPDF = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reserva_id = req.params.id as string;
    const usuario_id = req.user?.id;
    const ownerId = await resolveOwnerId(usuario_id);

    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const reservation = await fetchReservation(reserva_id);

    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    if (reservation.imovel.usuario_id !== (ownerId || usuario_id)) {
      res.status(403).json({ error: 'Você não tem permissão para gerar este contrato' });
      return;
    }

    streamContract(reservation, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao gerar o contrato em PDF' });
    }
  }
};

export const getContractDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reserva_id = req.params.id as string;
    const usuario_id = req.user?.id;
    const ownerId = await resolveOwnerId(usuario_id);

    if (!ownerId) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const reservation = await fetchReservation(reserva_id);
    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    if (reservation.imovel.usuario_id !== (ownerId || usuario_id)) {
      res.status(403).json({ error: 'Você não tem permissão para acessar este contrato' });
      return;
    }

    if (!reservation.contrato) {
      res.status(404).json({ error: 'Rascunho não encontrado' });
      return;
    }

    res.json(reservation.contrato);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar rascunho do contrato' });
  }
};

export const saveContractDraft = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reserva_id = req.params.id as string;
    const usuario_id = req.user?.id;
    const { content } = req.body;
    const ownerId = await resolveOwnerId(usuario_id);

    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    if (!content || !String(content).trim()) {
      res.status(400).json({ error: 'Conteúdo do contrato é obrigatório' });
      return;
    }

    const reservation = await fetchReservation(reserva_id);
    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    if (reservation.imovel.usuario_id !== (ownerId || usuario_id)) {
      res.status(403).json({ error: 'Você não tem permissão para editar este contrato' });
      return;
    }

    const saved = await prisma.contractDraft.upsert({
      where: { reserva_id },
      create: { reserva_id, content },
      update: { content }
    });

    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar rascunho do contrato' });
  }
};

export const shareContractLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contractId = req.params.id as string;
    const usuario_id = req.user?.id;
    const ownerId = await resolveOwnerId(usuario_id);

    if (!ownerId) {
      res.status(401).json({ error: 'NÃ£o autorizado' });
      return;
    }

    const reservation = await fetchReservation(contractId);

    if (!reservation) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }

    if (reservation.imovel.usuario_id !== (ownerId || usuario_id)) {
      res.status(403).json({ error: 'Você não tem permissão para compartilhar este contrato' });
      return;
    }

    const secret = getJwtSecret();
    const token = jwt.sign({ contractId: reservation.id }, secret, { expiresIn: '4h' });

    const apiBase = getPublicApiBaseUrl(req);
    const link = `${apiBase}/api/public/contracts/share?token=${token}`;

    res.json({ link, expiresIn: 4 * 60 * 60 });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar link compartilhável', details: error });
  }
};

export const serveSharedContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const secret = getJwtSecret();

    if (!token) {
      res.status(400).json({ error: 'Token inválido' });
      return;
    }

    const payload = jwt.verify(token, secret) as { contractId: string };

    if (!payload.contractId) {
      res.status(400).json({ error: 'Token inválido' });
      return;
    }

    const reservation = await fetchReservation(payload.contractId);

    if (!reservation) {
      res.status(404).json({ error: 'Contrato não encontrado' });
      return;
    }

    streamContract(reservation, res);
  } catch (error) {
    res.status(401).json({ error: 'Token expirado ou inválido' });
  }
};

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function findPaymentValue(payments: any[] | undefined, keywords: string[]): number {
  if (!payments) return 0;
  const lowered = payments.map((payment) => ({
    payment,
    type: String(payment.tipo || '').toLowerCase()
  }));
  for (const keyword of keywords) {
    const match = lowered.find((item) => item.type.includes(keyword));
    if (match) return match.payment.valor ?? 0;
  }
  return 0;
}

function clampPayment(value: number, fallback: number, max: number): number {
  const candidate = value > 0 ? value : fallback;
  if (!Number.isFinite(max) || max <= 0) return candidate;
  return Math.min(candidate, max);
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
  
  // Dividir por traços, barras ou vírgulas e procurar onde está a UF (exato 2 letras maiúsculas)
  const parts = address.split(/[,\-/–]/).map(p => p.trim());
  
  // Procurar o primeiro segmento que seja exatamente um código de estado (UF)
  const ufIndex = parts.findIndex(p => /^[A-Z]{2}$/.test(p));
  
  if (ufIndex > 0) {
    // A cidade geralmente é o segmento imediatamente anterior à UF
    return `${parts[ufIndex - 1]} – ${parts[ufIndex]}`;
  }
  
  // Fallback regex se o split falhar (caso o endereço não tenha separadores padrão)
  const match = address.match(/([^,\-/–]+)\s*[–\/-]\s*([A-Z]{2})(\s|$)/);
  if (match) {
    return `${match[1].trim()} – ${match[2]}`;
  }

  return '';
}

function extractCity(address?: string): string {
  const cityUf = extractCityUf(address);
  if (cityUf) {
    const parts = cityUf.split(/[–-]/);
    return parts[0]?.trim() || '';
  }

  // Segundo fallback: Pegar o penúltimo segmento se houver muitas vírgulas
  const parts = address?.split(',') || [];
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].trim();
    // Se o último campo for UF ou CEP, o anterior provavelmente é a cidade
    if (lastPart.length <= 3 || /\d{5}/.test(lastPart)) {
      return parts[parts.length - 2].trim();
    }
  }

  return '';
}

function extractCep(address?: string): string {
  if (!address) return '';
  const match = address.match(/(\d{5}-?\d{3})/);
  if (!match) return '';
  const digits = match[1].replace(/\D/g, '');
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatFullDate(value?: string | Date): string {
  if (!value) return '__/__/____';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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

function formatShortDate(value?: string | Date | null): string {
  if (!value) return '__/__/____';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '__/__/____';
  return date.toLocaleDateString('pt-BR');
}

function capitalize(value: string): string {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}

async function fetchReservation(id: string): Promise<ReservationWithRelations | null> {
  return (await prisma.reservation.findUnique({
    where: { id },
    include: {
      imovel: {
        include: {
          user: true
        }
      },
      locatario: true,
      pagamentos: true,
      contrato: true
    }
  })) as ReservationWithRelations | null;
}

function streamContract(reservation: ReservationWithRelations, res: Response) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=contrato_locacao_${reservation.id}.pdf`);
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  renderContractDocument(doc, reservation);
  doc.end();
}

function renderContractDocument(doc: InstanceType<typeof PDFDocument>, reservation: ReservationWithRelations) {
  if (reservation.contrato?.content) {
    doc.font('Helvetica').fontSize(10).text(reservation.contrato.content, { align: 'left' });
    return;
  }

  const owner = reservation.imovel.user;
  const tenant = reservation.locatario;

  const propertyAddress = reservation.imovel.endereco || 'Rua das Palmeiras, nº 745';
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

  const ownerPhone = owner.telefone ? formatPhone(owner.telefone) : '(12) 99999-0000';
  const tenantPhone = tenant.telefone ? formatPhone(tenant.telefone) : '(11) 98888-0000';
  const tenantHomePhone = tenant.telefone ? formatPhone(tenant.telefone) : '(11) 3000-0000';

  const checkinDate = formatFullDate(reservation.data_checkin);
  const checkoutDate = formatFullDate(reservation.data_checkout);
  const checkinTime = reservation.hora_checkin || '18h00';
  const checkoutTime = reservation.hora_checkout || '08h00';

  const totalValue = reservation.valor_total || 3600;
  const reservaPayment = clampPayment(
    findPaymentValue(reservation.pagamentos, ['sinal', 'reserva']),
    totalValue * 0.25,
    totalValue
  );
  const secondPayment = clampPayment(
    findPaymentValue(reservation.pagamentos, ['parcela 2', 'parcela', 'segunda']),
    reservaPayment,
    Math.max(totalValue - reservaPayment, totalValue)
  );
  let entryPayment = totalValue - reservaPayment - secondPayment;
  if (entryPayment <= 0) {
    entryPayment = Math.max(totalValue - reservaPayment, totalValue * 0.5);
  }

  const totalLabel = formatCurrency(totalValue);
  const reserveLabel = formatCurrency(reservaPayment);
  const secondLabel = formatCurrency(secondPayment);
  const entryLabel = formatCurrency(entryPayment);
  const contractDate = new Date();
  const signatureDateLabel = formatSignatureDate(contractDate);
  const ownerAddress = owner.endereco || propertyAddress;
  const ownerCity = extractCity(ownerAddress) || extractCity(propertyAddress) || 'São Paulo';
  const tenantCity = extractCity(tenantAddress) || 'São Paulo';

  doc.fontSize(16).text('CONTRATO DE LOCAÇÃO TEMPORÁRIA DE IMÓVEL', { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(10);

  doc.font('Helvetica-Bold').text('1. OBJETO DO CONTRATO');
  doc.font('Helvetica').text(
    'O presente contrato tem por objeto a locação temporária de imóvel residencial urbano, destinado exclusivamente para fins de lazer e hospedagem temporária, ficando o LOCATÁRIO responsável pela conservação do imóvel durante todo o período da locação.'
  );
  doc.moveDown();

  doc.font('Helvetica-Bold').text('2. DADOS DO IMÓVEL');
  doc.font('Helvetica').text('Imóvel residencial localizado em:');
  doc.text(propertyAddress);
  doc.text(`Bairro ${propertyNeighborhood}`);
  doc.text(`Cidade: ${propertyCityUf}`);
  doc.text(`CEP: ${propertyCep}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('3. DADOS DO LOCADOR');
  doc.font('Helvetica').text(`Nome: ${owner.nome}`);
  doc.text(`CPF: ${ownerCpf}`);
  doc.text(`Telefone / WhatsApp: ${ownerPhone}`);
  doc.text(`E-mail: ${owner.email || 'joaocarlos@email.com'}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('4. DADOS DO LOCATÁRIO');
  doc.font('Helvetica').text(`Nome: ${tenant.nome}`);
  doc.text(`RG: ${tenantRg}`);
  doc.text(`CPF: ${tenantCpf}`);
  doc.text('Endereço:');
  doc.text(tenantAddress);
  doc.text(`Bairro ${tenantNeighborhood}`);
  doc.text(`Cidade: ${tenantCityUf}`);
  doc.text(`CEP: ${tenantCep}`);
  doc.text(`Telefone residencial: ${tenantHomePhone}`);
  doc.text(`Celular / WhatsApp: ${tenantPhone}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('5. PRAZO DA LOCAÇÃO');
  doc.font('Helvetica').text('A locação terá prazo determinado, conforme abaixo:');
  doc.text(`Check-in: ${checkinDate}, a partir das ${checkinTime}`);
  doc.text(`Check-out: ${checkoutDate}, até às ${checkoutTime}`);
  doc.text(
    'O LOCATÁRIO compromete-se a devolver o imóvel completamente desocupado até o horário estipulado, considerando a possibilidade de novos hóspedes após o término da locação.'
  );
  doc.moveDown();

  doc.font('Helvetica-Bold').text('6. REGRAS DE UTILIZAÇÃO');
  doc.font('Helvetica').text('Não é permitida a permanência de animais no imóvel.');
  doc.text('O imóvel não fornece:');
  doc.text('- Lençóis');
  doc.text('- Travesseiros');
  doc.text('- Toalhas de banho');
  doc.text('O LOCATÁRIO compromete-se a:');
  doc.text('- Não realizar barulhos excessivos ou eventos que perturbem vizinhos.');
  doc.text('- Cumprir as normas previstas no Art. 42 da Lei nº 3.688/41 (Lei de Contravenções Penais).');
  doc.text('- Respeitar os limites de ruído estabelecidos pela NBR 10.151 da ABNT e demais legislações ambientais aplicáveis.');
  doc.text('- Cumprir a legislação municipal referente à emissão de ruídos.');
  doc.text(
    'O LOCATÁRIO será responsável por qualquer multa, sanção administrativa ou processo decorrente do descumprimento dessas normas.'
  );
  doc.moveDown();

  doc.font('Helvetica-Bold').text('7. LIMITE DE OCUPAÇÃO');
  doc.font('Helvetica').text('Número máximo permitido de hóspedes:');
  doc.text('15 pessoas (entre adultos e crianças).');
  doc.text('O LOCATÁRIO declara ciência e responsabilidade pelo cumprimento desta regra.');
  doc.moveDown();

  doc.font('Helvetica-Bold').text('8. CONSERVAÇÃO DO IMÓVEL');
  doc.font('Helvetica').text('Ao término da locação, o LOCATÁRIO deverá:');
  doc.text('- Entregar o imóvel limpo');
  doc.text('- Manter móveis e utensílios em perfeito estado');
  doc.text('- Devolver todas as chaves');
  doc.text(
    'Caso seja constatado dano, quebra ou inutilização de qualquer item do imóvel, o LOCATÁRIO deverá ressarcir o LOCADOR conforme valor de mercado do bem danificado.'
  );
  doc.moveDown();

  doc.font('Helvetica-Bold').text('9. VALOR E CONDIÇÕES DE PAGAMENTO');
  doc.font('Helvetica').text('O valor total da locação é de:');
  doc.text(totalLabel);
  doc.text('Forma de pagamento:');

  const payments = reservation.pagamentos || [];
  const totalPayment = payments.find((payment) => /total/i.test(payment.tipo));
  const sinalPayment = payments.find((payment) => /sinal/i.test(payment.tipo));
  const parcelPayments = payments.filter(
    (payment) => /parcela/i.test(payment.tipo) || /restante/i.test(payment.tipo)
  );
  const orderedParcelPayments = [...parcelPayments].sort((a, b) => {
    const matchA = String(a.tipo || '').match(/parcela\s*(\d+)/i);
    const matchB = String(b.tipo || '').match(/parcela\s*(\d+)/i);
    const numA = matchA ? Number(matchA[1]) : 0;
    const numB = matchB ? Number(matchB[1]) : 0;
    return numA - numB;
  });
  const baseInstallmentDate =
    sinalPayment?.data_pagamento ?? reservation.data_checkin ?? new Date();

  if (totalPayment) {
    doc.text(
      `- Pagamento total: ${formatCurrency(totalPayment.valor)} | ${formatShortDate(
        totalPayment.data_pagamento ?? reservation.data_checkin
      )} | ${totalPayment.meio_pagamento ?? 'Forma não informada'}`
    );
  } else {
    if (sinalPayment) {
      doc.text(
        `- Sinal: ${formatCurrency(sinalPayment.valor)} | ${formatShortDate(
          sinalPayment.data_pagamento ?? reservation.data_checkin
        )} | ${sinalPayment.meio_pagamento ?? 'Forma não informada'}`
      );
    }

    orderedParcelPayments.forEach((payment) => {
      const match = String(payment.tipo || '').match(/parcela\s*(\d+)/i);
      const installmentNumber = match ? Number(match[1]) : 1;
      const dueDate = addDays(baseInstallmentDate, 30 * installmentNumber);
      doc.text(`- ${payment.tipo}: ${formatCurrency(payment.valor)} | ${formatShortDate(dueDate)}`);
    });
  }

  doc.moveDown();

  doc.font('Helvetica-Bold').text('10. POLÍTICA DE CANCELAMENTO');
  doc.font('Helvetica').text(
    'Em caso de desistência por parte do LOCATÁRIO, os valores pagos não serão devolvidos, considerando que o imóvel permaneceu reservado e indisponível para outros interessados durante o período.'
  );
  doc.moveDown();

  doc.font('Helvetica-Bold').text('11. DADOS PARA PAGAMENTO');
  doc.font('Helvetica').text(`Titular da conta: ${owner.nome}`);
  doc.text('Banco: Banco Exemplo');
  doc.text('Agência: 0001');
  doc.text('Conta corrente: 12345678-9');
  doc.text('Chave PIX: 12999990000');
  doc.moveDown();

  doc.font('Helvetica-Bold').text('12. ASSINATURAS');
  doc.text('Para maior clareza e validade jurídica, as partes assinam o presente contrato.');
  doc.moveDown(2);
  const columnGap = 40;
  const columnWidth =
    (doc.page.width - doc.page.margins.left - doc.page.margins.right - columnGap) / 2;
  const leftX = doc.page.margins.left;
  const rightX = leftX + columnWidth + columnGap;
  const lineY = doc.y + 30;

  doc.moveTo(leftX, lineY).lineTo(leftX + columnWidth, lineY).stroke();
  doc.moveTo(rightX, lineY).lineTo(rightX + columnWidth, lineY).stroke();

  doc.text(`Locador: ${owner.nome}`, leftX, lineY + 6, {
    width: columnWidth,
    align: 'center'
  });
  doc.text(`Locatário: ${tenant.nome}`, rightX, lineY + 6, {
    width: columnWidth,
    align: 'center'
  });
  doc.text(`${ownerCity}, ${signatureDateLabel}.`, leftX, lineY + 20, {
    width: columnWidth,
    align: 'center'
  });
  doc.text(`${tenantCity}, ${signatureDateLabel}.`, rightX, lineY + 20, {
    width: columnWidth,
    align: 'center'
  });
  doc.moveDown(4);

  doc.x = doc.page.margins.left;
  doc.font('Helvetica-Bold').text('13. ASSINATURA DIGITAL');
  doc.font('Helvetica').text(
    'Este contrato poderá ser assinado de forma digital conforme legislação vigente, utilizando plataformas oficiais de assinatura eletrônica.'
  );
  doc.text('Exemplo:');
  doc.text('https://www.gov.br/governodigital/pt-br/assinatura-eletronica');
}
