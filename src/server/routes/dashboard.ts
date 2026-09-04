import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', (_req: Request, res: Response) => {
  const totalSocios = (db.prepare(`SELECT COUNT(*) as count FROM socios`).get() as any).count;
  const sociosVigentes = (db.prepare(`SELECT COUNT(*) as count FROM socios WHERE estatus = 'VIGENTE'`).get() as any).count;
  const sociosVencidos = (db.prepare(`SELECT COUNT(*) as count FROM socios WHERE estatus = 'VENCIDO'`).get() as any).count;

  const hoyStr = new Date().toISOString().split('T')[0];
  const ingresosHoy = (db.prepare(`
    SELECT COALESCE(SUM(monto), 0) as total FROM pagos WHERE DATE(fecha_pago) = ?
  `).get(hoyStr) as any).total;

  const ultimosAccesos = db.prepare(`
    SELECT a.*, s.foto_path
    FROM accesos_log a
    LEFT JOIN socios s ON s.id = a.socio_id
    ORDER BY a.fecha_hora DESC
    LIMIT 8
  `).all();

  const vencenPronto = db.prepare(`
    SELECT s.id, s.nombre, s.telefono, m.fecha_fin
    FROM socios s
    JOIN membresias m ON m.socio_id = s.id AND m.activa = 1
    WHERE s.estatus = 'VIGENTE' 
      AND m.fecha_fin >= DATE('now') 
      AND m.fecha_fin <= DATE('now', '+3 days')
    ORDER BY m.fecha_fin ASC
    LIMIT 5
  `).all();

  res.json({
    totalSocios,
    sociosVigentes,
    sociosVencidos,
    ingresosHoy,
    ultimosAccesos,
    vencenPronto,
  });
});
