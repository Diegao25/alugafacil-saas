/**
 * Valida se o telefone tem 10 (fixo) ou 11 (celular) dígitos. 🛡️🏗️
 */
export function isValidPhone(value: string | null | undefined): boolean {
  if (!value) return true; // Não obrigatório
  
  // Remove tudo que não for dígito
  const digits = String(value).replace(/\D/g, "");
  
  // Rejeita sequências óbvias de teste (0000..., 1111..., etc)
  if (/^(\d)\1+$/.test(digits)) return false;
  
  // No Brasil: DDD (2) + Número (8 ou 9)
  return digits.length === 10 || digits.length === 11;
}
