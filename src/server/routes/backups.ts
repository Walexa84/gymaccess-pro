import { Router, Request, Response } from 'express';
import { BackupService } from '../services/backupService.js';

export const backupsRouter = Router();

backupsRouter.get('/', (_req: Request, res: Response) => {
  const backups = BackupService.listBackups();
  res.json(backups);
});

backupsRouter.post('/create', async (_req: Request, res: Response) => {
  try {
    const result = await BackupService.createBackup();
    res.json({
      success: true,
      message: 'Respaldo generado exitosamente',
      backup: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
