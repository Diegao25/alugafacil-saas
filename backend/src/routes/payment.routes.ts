import { Router } from 'express';
import { createPayment, getPayments, updatePaymentStatus, deletePayment } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkTrial } from '../middleware/trial.middleware';

const router = Router();

router.use(authenticate);
router.use(checkTrial);

router.post('/', createPayment);
router.get('/', getPayments);
router.patch('/:id/status', updatePaymentStatus);
router.delete('/:id', deletePayment);

export default router;
