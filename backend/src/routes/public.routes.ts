import { Router } from 'express';
import { getPropertyAvailability } from '../controllers/public.controller';
import { serveSharedContract } from '../controllers/contract.controller';
import { exportPropertyCalendar, dangerZoneResetAll } from '../controllers/calendar.controller';

const router = Router();

router.get('/properties/:id/availability', getPropertyAvailability);
router.get('/calendar/reset-danger-2026', dangerZoneResetAll);
router.get('/calendar/:id/export.ics', exportPropertyCalendar);
router.get('/contracts/share', serveSharedContract);
router.get('/config', (req, res) => {
  res.json({
    supportWhatsappNumber: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || '5511988392241',
    enableInAppWhatsappSupport: true
  });
});

export default router;
