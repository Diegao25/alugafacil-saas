import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de Manutenção Centralizado
 * Bloqueia o acesso a rotas API quando a variável MAINTENANCE_MODE estiver ativa no .env
 */
export const maintenanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  // Exceções: Rotas que DEVEM continuar funcionando mesmo em manutenção
  // 1. Rota de configuração pública (para o frontend saber que está em manutenção)
  // 2. Webhooks de pagamento (para não perder transações em andamento)
  const isPublicConfig = req.path === '/api/public/config';
  const isStripeWebhook = req.path === '/api/subscriptions/webhook';

  if (isMaintenanceMode && !isPublicConfig && !isStripeWebhook) {
    console.warn(`[Maintenance] Request blocked: ${req.method} ${req.path}`);
    
    return res.status(503).json({
      error: 'maintenance',
      message: 'O sistema está em manutenção programada para melhorias. Por favor, tente novamente em alguns instantes.',
      timestamp: new Date().toISOString()
    });
  }

  next();
};
