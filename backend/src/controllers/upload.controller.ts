import { Request, Response } from 'express';
import { cloudinary } from '../config/cloudinary';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth.middleware';

// Configuração do Multer (Armazenamento em memória para repasse imediato ao Cloudinary)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB por foto
});

export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      return;
    }

    // Transformação: Estamos sendo inteligentes aqui. 🕵️‍♂️🏛️
    // Redimensionamos a foto para o padrão de vitrine (Max 1280px) e otimizamos a qualidade.
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'aluga-facil/properties',
        transformation: [
          { width: 1280, height: 720, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]', error);
          return res.status(500).json({ error: 'Falha no upload para nuvem.' });
        }
        
        // Retornamos a URL segura para o Frontend salvar no Imóvel
        res.json({ 
          url: result?.secure_url,
          public_id: result?.public_id 
        });
      }
    );

    // Escrevemos o buffer do arquivo no stream do Cloudinary
    uploadStream.end(req.file.buffer);

  } catch (error: any) {
    console.error('[Upload Controller Error]', error);
    res.status(500).json({ error: 'Erro interno no processamento do upload.' });
  }
};
