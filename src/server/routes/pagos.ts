import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { HikConnectService } from '../services/hikconnect.js';

export const pagosRouter = Router();

// Registrar cobro y reactivar acceso inmediato
pagosRouter.post('/', async (req: Request, res: Response) => {
  const { socioId, planId, metodoPago, usuarioId } = req.body;

  if (!socioId || !planId || !metodoPago) {
    return res.status(400).json({ error: 'socioId, planId y metodoPago son obligatorios' });
  }

  const socio = db.prepare('SELECT * FROM socios WHERE id = ?').get(socioId) as any;
  if (!socio) {
    return res.status(404).json({ error: 'Socio no encontrado' });
  }

  const plan = db.prepare('SELECT * FROM planes WHERE id = ?').get(planId) as any;
  if (!plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  // Calcular fechas de vigencia
  // Si el socio ya tiene membresía vigente activa, extender a partir de la fecha_fin actual
  const membresiaActual = db.prepare(`
    SELECT fecha_fin FROM membresias WHERE socio_id = ? AND activa = 1 AND fecha_fin >= DATE('now')
    ORDER BY fecha_fin DESC LIMIT 1
  `).get(socioId) as { fecha_fin: string } | undefined;

  const hoy = new Date();
  let baseDate = hoy;

  if (membresiaActual) {
    baseDate = new Date(membresiaActual.fecha_fin);
    baseDate.setDate(baseDate.getDate() + 1); // Empezar al día siguiente
  }

  const fechaInicioStr = (membresiaActual ? baseDate : hoy).toISOString().split('T')[0];

  const fechaFinDate = new Date(baseDate);
  fechaFinDate.setDate(fechaFinDate.getDate() + plan.duracion_dias);
  const fechaFinStr = fechaFinDate.toISOString().split('T')[0];

  const folio = `TK-${Date.now().toString().slice(-6)}`;

  // Transacción ACID en base de datos local
  try {
    db.exec('BEGIN');
    // 1. Desactivar membresías previas
    db.prepare('UPDATE membresias SET activa = 0 WHERE socio_id = ?').run(socioId);

    // 2. Crear nueva membresía activa
    db.prepare(`
      INSERT INTO membresias (socio_id, plan_id, fecha_inicio, fecha_fin, activa)
      VALUES (?, ?, ?, ?, 1)
    `).run(socioId, planId, fechaInicioStr, fechaFinStr);

    // 3. Registrar pago
    db.prepare(`
      INSERT INTO pagos (folio, socio_id, plan_id, monto, metodo_pago, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(folio, socioId, planId, plan.precio, metodoPago, usuarioId || 1);

    // 4. Actualizar estatus del socio a VIGENTE
    db.prepare(`
      UPDATE socios SET estatus = 'VIGENTE', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?
    `).run(socioId);

    db.exec('COMMIT');
  } catch (tErr) {
    db.exec('ROLLBACK');
    throw tErr;
  }

  // 5. Inmediatamente activar nivel de acceso en terminal facial Hikvision
  let hikOk = false;
  let hikError = null;

  if (socio.hik_person_id) {
    try {
      await HikConnectService.setPersonAccess(socio.hik_person_id, true);
      hikOk = true;
      console.log(`🔓 Acceso facial activado en HikCentral para socio: ${socio.nombre}`);
    } catch (err: any) {
      hikError = err.message;
      console.error(`⚠️ No se pudo conceder acceso en HikCentral:`, err.message);
    }
  }

  res.json({
    success: true,
    folio,
    socio: socio.nombre,
    plan: plan.nombre,
    monto: plan.precio,
    vigenciaDesde: fechaInicioStr,
    vigenciaHasta: fechaFinStr,
    accesoFacialActivo: hikOk,
    advertenciaHik: hikError,
  });
});
