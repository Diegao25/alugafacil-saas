/**
 * Formata uma string de números para o padrão (XX) XXXXX-XXXX
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "___________";
  
  const digits = value.replace(/\D/g, "");
  
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  return value; // Retorna original se não bater o padrão esperado
}
