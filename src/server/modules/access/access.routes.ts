import { Router, Request, Response } from 'express';
import { AccessService } from './access.service.js';
import { SucursalesService } from './sucursales.service.js';
import { SseManager } from './sse.manager.js';
import { IsapiListener } from './isapi.listener.js';
import { HikvisionIsapiDriver } from '../../services/hikvisionIsapi.js';
import { HikConnectService } from '../../services/hikconnect.js';
import { TelemetryService } from '../../services/telemetryService.js';
import { db } from '../../db/database.js';
import { HardwareManager } from '../../services/hardwareManager.js';
import { AuditService } from '../audit/audit.service.js';

export const accessRouter = Router();

// ==========================================================================
// 0. CUENTAS HIK-CONNECT TEAMS (MULTI-SUCURSAL / MULTI-ORGANIZACIÓN)
// ==========================================================================
accessRouter.get('/cuentas-hct', (_req: Request, res: Response) => {
  res.json(AccessService.getCuentasHct());
});

accessRouter.post('/cuentas-hct', async (req: Request, res: Response) => {
  try {
    const cuenta = await AccessService.createCuentaHct(req.body);
    res.status(201).json(cuenta);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

accessRouter.post('/cuentas-hct/:id/doors/:doorId/open', async (req: Request, res: Response) => {
  try {
    const cuentaId = Number(req.params.id);
    const doorId = String(req.params.doorId);
    const result = await HikConnectService.remoteControlDoor(doorId, 1, cuentaId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

accessRouter.get('/telemetria', (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 40;
  res.json(TelemetryService.getRecientes(limit));
});

accessRouter.delete('/telemetria', (_req: Request, res: Response) => {
  res.json(TelemetryService.clearLogs());
});

accessRouter.put('/cuentas-hct/:id', (req: Request, res: Response) => {
  try {
    const cuenta = AccessService.updateCuentaHct(Number(req.params.id), req.body);
    res.json(cuenta);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

accessRouter.delete('/cuentas-hct/:id', (req: Request, res: Response) => {
  try {
    res.json(AccessService.deleteCuentaHct(Number(req.params.id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

accessRouter.post('/cuentas-hct/:id/sync', async (req: Request, res: Response) => {
  try {
    const result = await AccessService.syncCuentaHct(Number(req.params.id));
    res.json({
      success: true,
      message: `Sincronización completada: ${result.dispositivosImportados} equipos y ${result.nivelesImportados} niveles.`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

accessRouter.post('/cuentas-hct/sync-all', async (_req: Request, res: Response) => {
  try {
    const result = await AccessService.syncCuentaHct();
    res.json({
      success: true,
      message: `Sincronización total completada: ${result.cuentasSincronizadas} cuentas, ${result.dispositivosImportados} equipos y ${result.nivelesImportados} niveles.`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================================================
// 1. RESUMEN DE SALUD Y ESTADO DE HARDWARE EN VIVO
// ==========================================================================
accessRouter.get('/status', (_req: Request, res: Response) => {
  res.json(AccessService.getHardwareHealthSummary());
});

// ==========================================================================
// 2. DISPOSITIVOS
// ==========================================================================
accessRouter.get('/dispositivos', (_req: Request, res: Response) => {
  res.json(AccessService.getDispositivos());
});

accessRouter.post('/dispositivos', (req: Request, res: Response) => {
  try {
    const disp = AccessService.createDispositivo(req.body);
    res.status(201).json(disp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

accessRouter.delete('/dispositivos/:id', (req: Request, res: Response) => {
  try {
    res.json(AccessService.deleteDispositivo(Number(req.params.id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

accessRouter.post('/dispositivos/:id/test', async (req: Request, res: Response) => {
  try {
    const result = await AccessService.testDispositivo(Number(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

accessRouter.post('/dispositivos/:id/sync-time', async (req: Request, res: Response) => {
  const disp = AccessService.getDispositivos().find((d: any) => d.id === Number(req.params.id)) as any;
  if (!disp) return res.status(404).json({ error: 'Dispositivo no encontrado' });

  const isapi = new HikvisionIsapiDriver();
  const timeZone = req.body.timeZone || 'CST+6:00:00';
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const ok = await isapi.syncTerminalTime(disp, nowIso, timeZone);
  res.json({ success: ok, message: ok ? `Reloj sincronizado en ${disp.nombre}` : `Fallo al sincronizar reloj en ${disp.nombre}` });
});

accessRouter.put('/dispositivos/:id/rename', async (req: Request, res: Response) => {
  try {
    const result = await SucursalesService.renameDispositivo(Number(req.params.id), req.body.nombre);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================================================
// 3. SUCURSALES (AGRUPACIÓN COMERCIAL DE ACCESOS)
// ==========================================================================
accessRouter.get('/sucursales', (_req: Request, res: Response) => {
  res.json(SucursalesService.getSucursales());
});

accessRouter.post('/sucursales', (req: Request, res: Response) => {
  try {
    const sucursal = SucursalesService.createSucursal(req.body);
    res.status(201).json(sucursal);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

accessRouter.put('/sucursales/:id', (req: Request, res: Response) => {
  try {
    const sucursal = SucursalesService.updateSucursal(Number(req.params.id), req.body);
    res.json(sucursal);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

accessRouter.delete('/sucursales/:id', (req: Request, res: Response) => {
  try {
    res.json(SucursalesService.deleteSucursal(Number(req.params.id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 4. TORNIQUETES Y ACCESOS FÍSICOS
// ==========================================================================
accessRouter.get('/torniquetes', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT t.*, d.nombre as dispositivo_nombre, d.driver, d.cuenta_hct_id, d.estado_conexion
    FROM torniquetes t
    JOIN dispositivos d ON d.id = t.dispositivo_id
    WHERE t.activo = 1 AND d.activa = 1
    ORDER BY t.id ASC
  `).all();
  res.json(rows);
});

accessRouter.post('/torniquetes/:id/open', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const torniquete = db.prepare(`
      SELECT t.*, d.driver, d.cuenta_hct_id, d.ip, d.puerto, d.usuario, d.password
      FROM torniquetes t
      JOIN dispositivos d ON d.id = t.dispositivo_id
      WHERE t.id = ?
    `).get(id) as any;

    if (!torniquete) return res.status(404).json({ success: false, error: 'Torniquete no encontrado' });

    let ok = false;
    if (torniquete.driver === 'HIKCONNECT_TEAMS' && torniquete.cloud_resource_id) {
      const result = await HikConnectService.remoteControlDoor(torniquete.cloud_resource_id, 1, torniquete.cuenta_hct_id);
      ok = result.success;
    } else {
      ok = await HardwareManager.remoteControlDoor(String(torniquete.canal_relevador || 1), 'open');
    }

    const usuarioNombre = (req as any).usuario?.nombre || 'Recepción';
    const direccionEvento = (torniquete.direccion === 'SALIDA') ? 'SALIDA' : 'ENTRADA';

    // 1. Guardar en eventos_acceso como APERTURA_MANUAL
    const insEv = db.prepare(`
      INSERT INTO eventos_acceso (
        dispositivo_id, torniquete_id, persona_nombre, tipo_evento, direccion, metodo_autenticacion, fecha_hora
      ) VALUES (?, ?, ?, 'APERTURA_MANUAL', ?, 'REMOTO_SOFTWARE', CURRENT_TIMESTAMP)
    `).run(torniquete.dispositivo_id, torniquete.id, `Apertura Manual (${usuarioNombre})`, direccionEvento);

    // 2. Emitir en tiempo real por SSE para el monitor de recepción
    SseManager.broadcastEvent({
      id: Number(insEv.lastInsertRowid),
      personaNombre: `Apertura Manual (${usuarioNombre})`,
      tipoEvento: 'APERTURA_MANUAL',
      torniqueteId: torniquete.id,
      torniqueteNombre: torniquete.nombre,
      direccion: direccionEvento,
      fechaHora: new Date().toISOString(),
    });

    // 3. Registrar en módulo agnóstico de auditoría
    AuditService.registrarEvento({
      modulo: 'ACCESO',
      accion: 'APERTURA_MANUAL',
      usuarioNombre,
      recursoId: torniquete.id,
      detalles: `Apertura manual enviada al torniquete "${torniquete.nombre}". Resultado: ${ok ? 'Éxito' : 'Fallo'}`,
      resultado: ok ? 'EXITO' : 'FALLO',
      ip: req.ip,
      metadata: { torniqueteId: torniquete.id, driver: torniquete.driver },
    });

    return res.json({ success: ok, message: ok ? 'Apertura enviada' : 'Fallo en apertura' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});



// ==========================================================================
// 4. EVENTOS Y MONITOR EN VIVO (SSE & WEBHOOK)
// ==========================================================================
accessRouter.get('/eventos', (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 25;
  res.json(AccessService.getEventosRecientes(limit));
});

// Canal Server-Sent Events (SSE) para el frontend React
accessRouter.get('/events/stream', (_req: Request, res: Response) => {
  SseManager.addClient(res);
});

// Webhook HTTP listener para notificaciones push de terminales Hikvision
accessRouter.post('/events/isapi-listener', (req: Request, res: Response) => {
  IsapiListener.handleIncomingAlert(req, res);
});
