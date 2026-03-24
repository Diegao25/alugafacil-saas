import type { CookieOptions } from 'express';
import type { Request } from 'express';

export const AUTH_COOKIE_NAME = 'gestaolocacoes.session';
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required.');
  }

  return secret;
}

export function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.WEB_BASE_URL,
    process.env.BACKEND_URL
  ].filter((origin): origin is string => Boolean(origin));

  const developmentOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  // Suporte a múltiplas URLs separadas por vírgula em uma única variável
  const splitOrigins = configuredOrigins.flatMap(origin => 
    origin.split(',').map(s => s.trim().replace(/\/+$/, ''))
  );

  const allowedOrigins = Array.from(
    new Set(
      process.env.NODE_ENV === 'production'
        ? splitOrigins
        : (splitOrigins.length > 0 ? [...splitOrigins, ...developmentOrigins] : developmentOrigins)
    )
  );

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('FRONTEND_URL or WEB_BASE_URL must be configured in production.');
  }

  // Em desenvolvimento, também permitimos qualquer origem que comece com 192.168 (IP local comum)
  // ou 10.0 (outro comum), ou 172. (docker/local)
  return allowedOrigins;
}

/**
 * Função utilitária para verificar se uma origem deve ser permitida via CORS.
 * Útil para permitir IPs dinâmicos na rede local em desenvolvimento.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return true;

  // Em desenvolvimento, permitimos acessos via IP na rede local
  if (process.env.NODE_ENV !== 'production') {
    const isLocalIp = /^http:\/\/(192\.168\.|127\.0\.|10\.|172\.|localhost)/.test(origin);
    if (isLocalIp) return true;
  }

  return false;
}

export function getAuthCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    // In production the frontend and API can live on different domains, so
    // SameSite=None keeps the authenticated requests working with credentials.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: SEVEN_DAYS_IN_MS,
    path: '/'
  };
}

export function parseCookieValue(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

export function getPublicApiBaseUrl(req?: Request) {
  const configuredBaseUrl =
    process.env.API_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined);

  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const forwardedHost = req?.get('x-forwarded-host');
  const host = forwardedHost || req?.get('host');

  if (host) {
    const protocol = req?.get('x-forwarded-proto') || req?.protocol || 'https';
    return `${protocol}://${normalizeBaseUrl(host)}`;
  }

  return `http://localhost:${process.env.PORT || '3333'}`;
}
