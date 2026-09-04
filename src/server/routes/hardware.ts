import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { HikConnectService } from '../services/hikconnect.js';
import { SyncWorker } from '../services/syncWorker.js';

export const hardwareRouter = Router();

// Obtener configuración de hardware actual
hardwareRouter.get('/config', (_req: Request, res: Response) => {
  const rows = db.prepare(`SELECT clave, valor FROM configuracion WHERE clave LIKE 'hik_%'`).all() as any[];
  const config = Object.fromEntries(rows.map(r => [r.clave, r.valor]));
  res.json(config);
});

// Guardar configuración de hardware
hardwareRouter.post('/config', (req: Request, res: Response) => {
  const { baseUrl, appKey, secretKey, accessLevelId } = req.body;

  try {
    db.exec('BEGIN');
    if (baseUrl) db.prepare(`INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('hik_base_url', ?)`).run(baseUrl);
    if (appKey !== undefined) db.prepare(`INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('hik_app_key', ?)`).run(appKey);
    if (secretKey !== undefined) db.prepare(`INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('hik_secret_key', ?)`).run(secretKey);
    if (accessLevelId !== undefined) db.prepare(`INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('hik_access_level_id', ?)`).run(accessLevelId);
    db.exec('COMMIT');
  } catch (tErr) {
    db.exec('ROLLBACK');
    throw tErr;
  }

  res.json({ success: true, message: 'Configuración actualizada' });
});

// Probar conexión y credenciales AK/SK
hardwareRouter.post('/test', async (_req: Request, res: Response) => {
  try {
    const token = await HikConnectService.getAccessToken(true);
    const devices = await HikConnectService.getDevices();
    const levels = await HikConnectService.getAccessLevels();

    res.json({
      success: true,
      message: 'Conexión exitosa con HikCentral Connect',
      dispositivosEncontrados: devices.length,
      nivelesAcceso: levels,
      dispositivos: devices,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// Sincronización manual forzada de todos los socios
hardwareRouter.post('/sync', async (_req: Request, res: Response) => {
  try {
    const result = await SyncWorker.auditVigencias();
    res.json({
      success: true,
      revocados: result.revocados,
      errores: result.errores,
      message: 'Auditoría y sincronización ejecutadas correctamente',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
