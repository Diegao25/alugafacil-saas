/**
 * Formata uma string de números para o padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskPhone(value: string): string {
  if (!value) return "";
  
  // Remove tudo que não for dígito
  const digits = value.replace(/\D/g, "");
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limited = digits.slice(0, 11);
  
  if (limited.length <= 2) {
    return limited.length > 0 ? `(${limited}` : "";
  }
  
  if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }
  
  if (limited.length <= 10) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

/**
 * Remove todos os caracteres não numéricos de uma string
 */
export function unmask(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCpfCnpj(value: string): string {
  const digits = unmask(value);

  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);
    return [part1, part2, part3]
      .filter(Boolean)
      .join('.') + (part4 ? `-${part4}` : '');
  }

  // CNPJ: 00.000.000/0000-00
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  const part4 = digits.slice(8, 12);
  const part5 = digits.slice(12, 14);
  return [part1, part2, part3]
    .filter(Boolean)
    .join('.') + (part4 ? `/${part4}` : '') + (part5 ? `-${part5}` : '');
}

export function maskCep(value: string): string {
  // Formato esperado: 00000-000
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export interface CepAddress {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  // Verificar se estamos no navegador
  if (typeof window === 'undefined') return null;

  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;

    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || ''
    };
  } catch {
    return null;
  }
}

export interface AddressComponents {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

/**
 * Extrai componentes do endereço de uma string completa
 * Tenta identificar logradouro, número, bairro, cidade, UF e CEP
 */
export function parseAddressComponents(endereco: string): AddressComponents {
  if (!endereco) {
    return {
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: ''
    };
  }

  let logradouro = '';
  let numero = '';
  let bairro = '';
  let cidade = '';
  let uf = '';
  let cep = '';

  // Copiar endereço para manipulação
  let enderecoLimpo = endereco.trim();

  // 1. Extrair CEP (mais flexível - procurar em qualquer posição)
  // Padrões possíveis: 00000-000, 00000000, 00000 000, etc.
  const cepPatterns = [
    /\b(\d{5}-?\d{3})\b/,  // 00000-000
    /\b(\d{5}\s?\d{3})\b/, // 00000 000 ou 00000000
    /(\d{5}-?\d{3})\s*$/,  // CEP no final
    /(\d{5}\s?\d{3})\s*$/, // CEP sem hífen no final
  ];

  for (const pattern of cepPatterns) {
    const cepMatch = enderecoLimpo.match(pattern);
    if (cepMatch) {
      cep = cepMatch[1].replace(/\s/, '-'); // Normalizar para formato com hífen
      enderecoLimpo = enderecoLimpo.replace(cepMatch[0], '').trim();
      break;
    }
  }

  if (cep) {
    enderecoLimpo = enderecoLimpo.replace(/\bCEP\b/gi, '').trim();
    enderecoLimpo = enderecoLimpo.replace(/[-–—]\s*$/, '').trim();
  }

  // 2. Extrair UF (2 letras maiúsculas no final)
  const ufMatch = enderecoLimpo.match(/([A-Z]{2})\s*$/);
  if (ufMatch) {
    uf = ufMatch[1];
    enderecoLimpo = enderecoLimpo.replace(ufMatch[0], '').trim();
    enderecoLimpo = enderecoLimpo.replace(/\/\s*$/, '').trim();
  }

  // 3. Dividir por vírgulas e traços, removendo separadores vazios
  const parts = enderecoLimpo.split(/[,–-]/).map(p => p.trim()).filter(p => p && p !== '-');

  // 4. Processar componentes de trás para frente (mais confiável)
  if (parts.length > 0) {
    // Último componente geralmente é a cidade (se temos UF)
    if (uf && parts.length > 0) {
      cidade = parts.pop() || '';
      cidade = cidade.replace(/\/$/, '').trim();
    }

    // Se ainda temos componentes, o último pode ser bairro
    if (parts.length > 1) {
      const possibleBairro = parts[parts.length - 1];

      // Verificar se parece bairro (não é número, tem tamanho razoável)
      if (possibleBairro && !/^\d/.test(possibleBairro) && possibleBairro.length > 2) {
        // Verificar se contém palavras de bairro
        const bairroKeywords = ['bairro', 'jd', 'jardim', 'vl', 'vila', 'parque', 'loteamento', 'conjunto', 'residencial', 'centro', 'nova', 'velha'];
        const hasBairroKeyword = bairroKeywords.some(keyword =>
          possibleBairro.toLowerCase().includes(keyword.toLowerCase())
        );

        // Ou se é o penúltimo componente (padrão comum)
        if (hasBairroKeyword || parts.length >= 3) {
          bairro = possibleBairro;
          parts.pop();
        }
      }
    }

    // O que sobrar é logradouro e número
    if (parts.length > 0) {
      const remaining = parts.join(', ');

      // Tentar extrair número
      const numeroMatch = remaining.match(/\b(\d+[A-Za-z]?|S\/?N|S\.N\.|SN)\b/i);
      if (numeroMatch) {
        numero = numeroMatch[1];
        logradouro = remaining.replace(numeroMatch[0], '').trim();
        logradouro = logradouro.replace(/^[,.\s]+|[,.\s]+$/g, '');
      } else {
        logradouro = remaining;
      }
    }
  }

  return {
    logradouro: logradouro || '',
    numero: numero || '',
    bairro: bairro || '',
    cidade: cidade || '',
    uf: uf || '',
    cep: cep || ''
  };
}

export function getPrimaryAddressSegment(value?: string): string {
  if (!value) {
    return '';
  }
  const segments = value
    .split(/[,–—-]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.length > 0 ? segments[0] : value.trim();
}

export function formatCurrencyBR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0,00';
  }
  const numeric =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numeric)) {
    return '0,00';
  }
  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseCurrencyBR(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const normalized = String(value).replace(/\./g, '').replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatCurrencyInput(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numeric = Number(digits) / 100;
  return formatCurrencyBR(numeric);
}
