import { Router } from 'express';
import CampaignController from '../controllers/campaign.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkTrial } from '../middleware/trial.middleware';

const campaignRoutes = Router();

campaignRoutes.use(authenticate);
campaignRoutes.use(checkTrial);

campaignRoutes.get('/', CampaignController.index);
campaignRoutes.post('/', CampaignController.create);

export { campaignRoutes };
