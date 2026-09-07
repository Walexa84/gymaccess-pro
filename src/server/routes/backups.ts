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

backupsRouter.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const filename = String(req.params.filename);
    const filePath = BackupService.getBackupFilePath(filename);
    res.download(filePath, filename);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

backupsRouter.post('/restore/:filename', async (req: Request, res: Response) => {
  try {
    const filename = String(req.params.filename);
    const result = await BackupService.restoreBackup(filename);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
