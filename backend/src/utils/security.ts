import type { CookieOptions } from 'express';

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
    process.env.WEB_BASE_URL
  ].filter((origin): origin is string => Boolean(origin));

  const developmentOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  const allowedOrigins = Array.from(
    new Set(
      process.env.NODE_ENV === 'production'
        ? configuredOrigins
        : [...configuredOrigins, ...developmentOrigins]
    )
  );

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('FRONTEND_URL or WEB_BASE_URL must be configured in production.');
  }

  return allowedOrigins;
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
