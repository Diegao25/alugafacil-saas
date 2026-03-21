import { NextFunction, Request, Response } from 'express';

type RateLimitConfig = {
  windowMs: number;
  max: number;
  message: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRequestKey(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0];

  return forwardedIp?.trim() || req.ip || 'unknown';
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const storeKey = `${req.path}:${getRequestKey(req)}`;
    const current = rateLimitStore.get(storeKey);

    if (!current || current.resetAt <= now) {
      rateLimitStore.set(storeKey, {
        count: 1,
        resetAt: now + config.windowMs
      });
      next();
      return;
    }

    if (current.count >= config.max) {
      res.status(429).json({ error: config.message });
      return;
    }

    current.count += 1;
    rateLimitStore.set(storeKey, current);
    next();
  };
}
