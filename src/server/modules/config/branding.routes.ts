import { Router, Request, Response } from 'express';
import { BrandingService } from './branding.service.js';

export const brandingRouter = Router();

// Obtener configuración de marca
brandingRouter.get('/', (_req: Request, res: Response) => {
  try {
    const config = BrandingService.getBranding();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar configuración de marca
brandingRouter.put('/', (req: Request, res: Response) => {
  try {
    const updated = BrandingService.updateBranding(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Subir nuevo logotipo en base64
brandingRouter.post('/logo', (req: Request, res: Response) => {
  try {
    const { logoBase64 } = req.body;
    if (!logoBase64) {
      return res.status(400).json({ error: 'El campo logoBase64 es obligatorio' });
    }
    const logoUrl = BrandingService.saveLogo(logoBase64);
    res.json({ success: true, logoUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar logotipo personalizado
brandingRouter.delete('/logo', (_req: Request, res: Response) => {
  try {
    BrandingService.removeLogo();
    res.json({ success: true, message: 'Logotipo restaurado al predeterminado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
