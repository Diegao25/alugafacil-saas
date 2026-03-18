import { Router } from 'express';
import {
  generateContractPDF,
  getContractDraft,
  saveContractDraft,
  shareContractLink
} from '../controllers/contract.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkTrial } from '../middleware/trial.middleware';

const router = Router();

router.use(authenticate);
router.use(checkTrial);

router.get('/:id/draft', getContractDraft);
router.put('/:id/draft', saveContractDraft);
router.get('/:id', generateContractPDF);
router.post('/:id/share', shareContractLink);

export default router;
