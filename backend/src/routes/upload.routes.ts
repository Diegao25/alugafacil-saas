import { Router } from 'express';
import { uploadPhoto, uploadMiddleware } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';

const uploadRouter = Router();

// Rota protegida: Apenas usuários autenticados podem subir fotos de imóveis. 🛡️🏗️
uploadRouter.post('/', authenticate, uploadMiddleware.single('file'), uploadPhoto);

export default uploadRouter;
