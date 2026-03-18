import { Router } from 'express';
import { createReservation, getReservations, updateReservationStatus, deleteReservation, updateReservation, getReservationById } from '../controllers/reservation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkTrial } from '../middleware/trial.middleware';

const router = Router();

router.use(authenticate);
router.use(checkTrial);

router.post('/', createReservation);
router.get('/', getReservations);
router.get('/:id', getReservationById);
router.put('/:id', updateReservation);
router.patch('/:id/status', updateReservationStatus);
router.delete('/:id', deleteReservation);

export default router;
