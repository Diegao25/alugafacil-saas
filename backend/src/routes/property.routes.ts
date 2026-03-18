import { Router } from 'express';
import { createProperty, getProperties, getPropertyById, updateProperty, deleteProperty } from '../controllers/property.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkTrial } from '../middleware/trial.middleware';

const router = Router();

// Todas as rotas de imóveis exigem autenticação
router.use(authenticate);
router.use(checkTrial);

router.post('/', createProperty);
router.get('/', getProperties);
router.get('/:id', getPropertyById);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);

export default router;
