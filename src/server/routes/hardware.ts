import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { HardwareManager } from '../services/hardwareManager.js';
import { SyncWorker } from '../services/syncWorker.js';
import { HikConnectService } from '../services/hikconnect.js';

export const hardwareRouter = Router();

// Obtener configuración de hardware actual completa
hardwareRouter.get('/config', (_req: Request, res: Response) => {
  const rows = db.prepare(`SELECT clave, valor FROM configuracion`).all() as any[];
  const config = Object.fromEntries(rows.map(r => [r.clave, r.valor]));

  res.json({
    hardware_mode: config.hardware_mode || 'HIKCONNECT_TEAMS',
    gym_timezone: config.gym_timezone || 'America/Mexico_City',
    // Cloud Hik-Connect Teams
    hik_base_url: config.hik_base_url || 'https://ius.hikcentralconnect.com/api',
    hik_app_key: config.hik_app_key || '',
    hik_secret_key: config.hik_secret_key || '',
    hik_access_level_id: config.hik_access_level_id || '',
    // Local LAN ISAPI Direct
    hik_local_ip: config.hik_local_ip || '192.168.1.100',
    hik_local_port: config.hik_local_port || '80',
    hik_local_user: config.hik_local_user || 'admin',
    hik_local_pass: config.hik_local_pass || '',
    hik_local_protocol: config.hik_local_protocol || 'http',
    // HikCentral Pro On-Premise
    hik_pro_base_url: config.hik_pro_base_url || 'https://192.168.1.200:443',
    hik_pro_app_key: config.hik_pro_app_key || '',
    hik_pro_secret_key: config.hik_pro_secret_key || '',
  });
});

// Guardar configuración de hardware y cambiar modo en caliente
hardwareRouter.post('/config', (req: Request, res: Response) => {
  const {
    hardware_mode,
    gym_timezone,
    baseUrl, appKey, secretKey, accessLevelId,
    hik_local_ip, hik_local_port, hik_local_user, hik_local_pass, hik_local_protocol,
    hik_pro_base_url, hik_pro_app_key, hik_pro_secret_key,
  } = req.body;

  try {
    db.exec('BEGIN');
    const stmt = db.prepare(`INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)`);

    if (hardware_mode) stmt.run('hardware_mode', hardware_mode);
    if (gym_timezone) stmt.run('gym_timezone', gym_timezone);

    // Hik-Connect Teams Cloud
    if (baseUrl !== undefined) stmt.run('hik_base_url', baseUrl);
    if (appKey !== undefined) stmt.run('hik_app_key', appKey);
    if (secretKey !== undefined) stmt.run('hik_secret_key', secretKey);
    if (accessLevelId !== undefined) stmt.run('hik_access_level_id', accessLevelId);

    // Local ISAPI
    if (hik_local_ip !== undefined) stmt.run('hik_local_ip', hik_local_ip);
    if (hik_local_port !== undefined) stmt.run('hik_local_port', hik_local_port);
    if (hik_local_user !== undefined) stmt.run('hik_local_user', hik_local_user);
    if (hik_local_pass !== undefined) stmt.run('hik_local_pass', hik_local_pass);
    if (hik_local_protocol !== undefined) stmt.run('hik_local_protocol', hik_local_protocol);

    // HikCentral Pro
    if (hik_pro_base_url !== undefined) stmt.run('hik_pro_base_url', hik_pro_base_url);
    if (hik_pro_app_key !== undefined) stmt.run('hik_pro_app_key', hik_pro_app_key);
    if (hik_pro_secret_key !== undefined) stmt.run('hik_pro_secret_key', hik_pro_secret_key);

    db.exec('COMMIT');
  } catch (tErr) {
    db.exec('ROLLBACK');
    throw tErr;
  }

  res.json({ success: true, message: 'Configuración de hardware actualizada exitosamente' });
});

// Telemetría de hora: Servidor vs Checador
hardwareRouter.get('/time', async (_req: Request, res: Response) => {
  try {
    const row = db.prepare(`SELECT valor FROM configuracion WHERE clave = 'gym_timezone'`).get() as { valor: string } | undefined;
    const timeZone = row?.valor || 'America/Mexico_City';

    const hwTime = await HardwareManager.getHardwareTime();
    const serverNow = new Date();

    // Formatear hora de servidor en la zona horaria del gimnasio
    const serverFormatted = new Intl.DateTimeFormat('es-MX', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(serverNow);

    res.json({
      success: true,
      timeZone,
      serverTime: serverNow.toISOString(),
      serverFormatted,
      deviceTime: hwTime.localTime,
      deviceTimeZone: hwTime.timeZone,
      driftSeconds: hwTime.driftSeconds,
      isSynced: hwTime.isSynced,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sincronizar reloj de la terminal con la hora del sistema
hardwareRouter.post('/sync-time', async (req: Request, res: Response) => {
  try {
    const { timeZone } = req.body || {};
    const ok = await HardwareManager.syncHardwareTime(timeZone);
    res.json({ success: ok, message: ok ? 'Reloj del checador sincronizado exitosamente' : 'Fallo al ajustar reloj del checador' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Probar conexión según el modo especificado o el modo activo
hardwareRouter.post('/test', async (req: Request, res: Response) => {
  const { mode } = req.body || {};
  try {
    const result = await HardwareManager.testConnection(mode);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      message: `Error al probar conexión: ${err.message}`,
    });
  }
});

// Apertura remota de emergencia para torniquete / puerta
hardwareRouter.post('/open-door', async (req: Request, res: Response) => {
  const { doorId } = req.body || {};
  try {
    const ok = await HardwareManager.remoteControlDoor(doorId || '1', 'open');
    res.json({ success: ok, message: ok ? 'Comando de apertura enviado a la terminal' : 'La terminal no respondió al comando' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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

// Sincronizar e importar recursos (dispositivos, áreas, niveles) desde Teams Cloud OpenAPI
hardwareRouter.post('/teams/sync-resources', async (_req: Request, res: Response) => {
  try {
    const result = await HikConnectService.syncResourcesToDatabase();
    res.json({
      success: true,
      message: `Sincronización con Teams exitosa: ${result.dispositivosImportados} equipos, ${result.areasImportadas} áreas y ${result.nivelesImportados} niveles de acceso importados.`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Error al sincronizar con Teams: ${err.message}`,
    });
  }
});

