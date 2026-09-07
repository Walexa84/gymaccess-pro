import { Router, Request, Response } from 'express';
import { AuditService } from './audit.service.js';

export const auditRouter = Router();

// 1. Eventos de Auditoría General / Operaciones del Sistema
auditRouter.get('/eventos', (req: Request, res: Response) => {
  try {
    const { modulo, accion, resultado, fechaInicio, fechaFin, busqueda, limit, offset } = req.query;
    const resultadoData = AuditService.getEventosAuditoria({
      modulo: modulo ? String(modulo) : undefined,
      accion: accion ? String(accion) : undefined,
      resultado: resultado ? String(resultado) : undefined,
      fechaInicio: fechaInicio ? String(fechaInicio) : undefined,
      fechaFin: fechaFin ? String(fechaFin) : undefined,
      busqueda: busqueda ? String(busqueda) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ success: true, ...resultadoData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Eventos de Cruce Físico de Torniquetes y Puertas
auditRouter.get('/accesos', (req: Request, res: Response) => {
  try {
    const { tipoEvento, busqueda, limit, offset } = req.query;
    const resultadoData = AuditService.getEventosAcceso({
      tipoEvento: tipoEvento ? String(tipoEvento) : undefined,
      busqueda: busqueda ? String(busqueda) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ success: true, ...resultadoData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Métricas de Resumen del Día
auditRouter.get('/metricas', (_req: Request, res: Response) => {
  try {
    const metricas = AuditService.getMetricasHoy();
    res.json({ success: true, data: metricas });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
