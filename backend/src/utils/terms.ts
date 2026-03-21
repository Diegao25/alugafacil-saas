import { prisma } from '../prisma';
import { resolveOwnerId } from './owner';

const DEFAULT_TERMS_VERSION = '2026.03';
const DEFAULT_TERMS_TITLE = 'Termos de Uso';
const DEFAULT_TERMS_CONTENT = `TERMOS DE USO - ALUGA FACIL

1. ACEITACAO
Ao acessar e utilizar o sistema Aluga Facil, o usuario declara estar ciente e de acordo com estes Termos de Uso.

2. USO DA PLATAFORMA
O sistema destina-se a gestao de imoveis, reservas, locatarios, pagamentos e contratos. O usuario compromete-se a utilizar a plataforma de forma licita e responsavel.

3. RESPONSABILIDADE SOBRE DADOS
O usuario e responsavel pela veracidade dos dados cadastrados no sistema, incluindo dados de imoveis, locatarios, contratos e cobrancas.

4. DISPONIBILIDADE E EVOLUCAO
O Aluga Facil pode receber atualizacoes, melhorias e ajustes operacionais ao longo do tempo, sempre buscando seguranca, estabilidade e melhor experiencia de uso.

5. PRIVACIDADE
Os dados tratados na plataforma devem ser utilizados exclusivamente para fins operacionais da locacao e conforme a politica de privacidade aplicavel.

6. ACEITE ELETRONICO
O aceite destes Termos possui registro eletronico e podera ser exigido novamente sempre que uma nova versao for publicada.

7. CONTATO
Em caso de duvidas, o usuario podera entrar em contato com os canais oficiais de suporte da plataforma.`;

export type TermsStatus = {
  termsPending: boolean;
  currentTermsVersion: string | null;
  acceptedTermsVersion: string | null;
};

export async function getOrCreateActiveTermsVersion() {
  const activeTerms = await prisma.termsVersion.findFirst({
    where: { is_active: true },
    orderBy: [{ published_at: 'desc' }, { created_at: 'desc' }]
  });

  if (activeTerms) {
    return activeTerms;
  }

  // Bootstraps the first terms version so new environments can enforce
  // acceptance without requiring a manual database seed step.
  return prisma.termsVersion.create({
    data: {
      version: DEFAULT_TERMS_VERSION,
      title: DEFAULT_TERMS_TITLE,
      content: DEFAULT_TERMS_CONTENT,
      is_active: true
    }
  });
}

export async function getTermsStatus(userId: string): Promise<TermsStatus> {
  const activeTerms = await getOrCreateActiveTermsVersion();
  const ownerId = await resolveOwnerId(userId);

  if (!ownerId) {
    return {
      termsPending: false,
      currentTermsVersion: activeTerms.version,
      acceptedTermsVersion: null
    };
  }

  if (ownerId !== userId) {
    const ownerAcceptance = await prisma.userTermsAcceptance.findFirst({
      where: {
        usuario_id: ownerId,
        terms_version_id: activeTerms.id
      },
      include: {
        termsVersion: {
          select: { version: true }
        }
      },
      orderBy: { accepted_at: 'desc' }
    });

    return {
      termsPending: false,
      currentTermsVersion: activeTerms.version,
      acceptedTermsVersion: ownerAcceptance?.termsVersion.version ?? null
    };
  }

  const acceptance = await prisma.userTermsAcceptance.findFirst({
    where: {
      usuario_id: userId,
      terms_version_id: activeTerms.id
    },
    include: {
      termsVersion: {
        select: { version: true }
      }
    },
    orderBy: { accepted_at: 'desc' }
  });

  return {
    termsPending: !acceptance,
    currentTermsVersion: activeTerms.version,
    acceptedTermsVersion: acceptance?.termsVersion.version ?? null
  };
}

export function getRequestIpAddress(forwardedFor: string | string[] | undefined, fallbackIp?: string | null) {
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0];
  }

  return fallbackIp ?? null;
}
