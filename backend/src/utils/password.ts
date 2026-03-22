export const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter pelo menos 8 caracteres e conter letras e números.';

export function isStrongPassword(password: string) {
  const normalized = String(password || '');
  return normalized.length >= 8 && /[A-Za-z]/.test(normalized) && /\d/.test(normalized);
}
