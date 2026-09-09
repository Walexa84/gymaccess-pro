import { db } from '../../db/database.js';
import { AccessService } from '../access/access.service.js';
import { AccessQueueService } from '../../services/accessQueue.service.js';

export interface CobroInput {
  personaId: number;
  planId: number;
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  cajeroUsuarioId?: number;
}

export class PosService {
  // ==========================================================================
  // PLANES DE GIMNASIO
  // ==========================================================================
  public static getPlanes() {
    const planes = db.prepare(`
      SELECT p.*, n.nombre as nivel_acceso_nombre
      FROM gym_planes p
      LEFT JOIN niveles_acceso n ON n.id = p.nivel_acceso_id
      WHERE p.activo = 1
      ORDER BY p.id ASC
    `).all() as any[];

    return planes.map((p) => {
      const niveles = db.prepare(`
        SELECT n.id, n.nombre, n.cloud_level_id, n.cuenta_hct_id, c.nombre as cuenta_nombre
        FROM gym_plan_niveles gpn
        JOIN niveles_acceso n ON n.id = gpn.nivel_id
        LEFT JOIN cuentas_hct c ON c.id = n.cuenta_hct_id
        WHERE gpn.plan_id = ? AND n.activo = 1
      `).all(p.id) as any[];

      return {
        ...p,
        niveles,
        nivel_ids: niveles.map((n) => n.id),
      };
    });
  }

  public static createPlan(data: any) {
    const stmt = db.prepare(`
      INSERT INTO gym_planes (nombre, duracion_dias, precio, nivel_acceso_id)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(data.nombre, Number(data.duracion_dias), Number(data.precio), data.nivel_acceso_id || null);
    const newId = Number(info.lastInsertRowid);

    if (Array.isArray(data.nivelIds) && data.nivelIds.length > 0) {
      const ins = db.prepare('INSERT OR IGNORE INTO gym_plan_niveles (plan_id, nivel_id) VALUES (?, ?)');
      for (const nId of data.nivelIds) {
        ins.run(newId, Number(nId));
      }
    }

    return this.getPlanes().find((p) => p.id === newId) || db.prepare('SELECT * FROM gym_planes WHERE id = ?').get(newId);
  }

  public static updatePlan(id: number, data: any) {
    db.prepare(`
      UPDATE gym_planes
      SET nombre = COALESCE(?, nombre),
          duracion_dias = COALESCE(?, duracion_dias),
          precio = COALESCE(?, precio),
          nivel_acceso_id = COALESCE(?, nivel_acceso_id)
      WHERE id = ?
    `).run(data.nombre || null, data.duracion_dias || null, data.precio || null, data.nivel_acceso_id || null, id);

    let personasImpactadas = 0;
    if (Array.isArray(data.nivelIds)) {
      db.prepare('DELETE FROM gym_plan_niveles WHERE plan_id = ?').run(id);
      const ins = db.prepare('INSERT OR IGNORE INTO gym_plan_niveles (plan_id, nivel_id) VALUES (?, ?)');
      for (const nId of data.nivelIds) {
        ins.run(id, Number(nId));
      }

      // Detectar socios activos con este paquete para propagar los nuevos niveles
      const activeMembers = db.prepare(`
        SELECT DISTINCT m.persona_id, m.fecha_inicio, m.fecha_fin
        FROM gym_membresias m
        JOIN personas p ON p.id = m.persona_id
        WHERE m.plan_id = ? AND m.activa = 1 AND m.fecha_fin >= DATE('now')
      `).all(id) as Array<{ persona_id: number; fecha_inicio: string; fecha_fin: string }>;

      if (activeMembers.length > 0) {
        personasImpactadas = activeMembers.length;
        const delAuth = db.prepare('DELETE FROM persona_autorizaciones_acceso WHERE persona_id = ?');
        const insAuth = db.prepare(`
          INSERT INTO persona_autorizaciones_acceso
          (persona_id, nivel_id, fecha_inicio, fecha_fin, estado_sincronizacion)
          VALUES (?, ?, ?, ?, 'PENDIENTE')
        `);

        db.exec('BEGIN');
        for (const member of activeMembers) {
          delAuth.run(member.persona_id);
          for (const nId of data.nivelIds) {
            insAuth.run(member.persona_id, Number(nId), member.fecha_inicio, member.fecha_fin);
          }
        }
        db.exec('COMMIT');

        // Encolar en segundo plano con limitador de tasa anti-bloqueo para Hik-Connect Teams
        AccessQueueService.enqueuePersonas(activeMembers.map(m => m.persona_id));
        console.log(`[PosService] 📡 Propagación iniciada para plan #${id}: ${personasImpactadas} socios activos encolados.`);
      }
    }

    const planActualizado = this.getPlanes().find((p) => p.id === id) || db.prepare('SELECT * FROM gym_planes WHERE id = ?').get(id);
    return { ...planActualizado, personasImpactadas };
  }

  public static deletePlan(id: number) {
    db.prepare('UPDATE gym_planes SET activo = 0 WHERE id = ?').run(id);
    return { success: true, message: 'Plan desactivado' };
  }

  // ==========================================================================
  // COBRO Y ACTIVACIÓN BIOMÉTRICA INMEDIATA
  // ==========================================================================
  public static async registrarCobro(input: CobroInput) {
    const { personaId, planId, metodoPago, cajeroUsuarioId } = input;

    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId) as any;
    if (!persona) throw new Error('Persona no encontrada');

    const plan = db.prepare('SELECT * FROM gym_planes WHERE id = ?').get(planId) as any;
    if (!plan) throw new Error('Plan no encontrado');

    // Calcular vigencia inteligente (Rollover): si ya tiene membresía activa, sumar a su fecha fin actual
    const membresiaActual = db.prepare(`
      SELECT fecha_fin FROM gym_membresias
      WHERE persona_id = ? AND activa = 1 AND fecha_fin >= DATE('now')
      ORDER BY fecha_fin DESC LIMIT 1
    `).get(personaId) as { fecha_fin: string } | undefined;

    const hoy = new Date();
    let fechaFinDate: Date;

    if (plan.duracion_dias === 1) {
      // Pase Diario: termina hoy al cierre (23:59:59)
      fechaFinDate = new Date(hoy);
      fechaFinDate.setHours(23, 59, 59, 999);
    } else {
      let baseDate = hoy;
      if (membresiaActual?.fecha_fin) {
        const finActual = new Date(membresiaActual.fecha_fin.includes('T') ? membresiaActual.fecha_fin : `${membresiaActual.fecha_fin}T23:59:59`);
        if (finActual.getTime() > hoy.getTime()) {
          baseDate = finActual; // Rollover: sumamos días a la fecha que ya tenía
        }
      }
      fechaFinDate = new Date(baseDate);
      fechaFinDate.setDate(fechaFinDate.getDate() + plan.duracion_dias);
      fechaFinDate.setHours(23, 59, 59, 999);
    }

    const fechaInicioStr = hoy.toISOString().split('T')[0];
    const fechaFinStr = fechaFinDate.toISOString().split('T')[0];

    const pad = (n: number) => String(n).padStart(2, '0');
    const endDateIso = `${fechaFinDate.getFullYear()}-${pad(fechaFinDate.getMonth() + 1)}-${pad(fechaFinDate.getDate())}T23:59:59-06:00`;

    const folio = `TK-${Date.now().toString().slice(-6)}`;

    // Transacción ACID local
    let membresiaId = 0;
    try {
      db.exec('BEGIN');

      // 1. Desactivar membresías previas
      db.prepare('UPDATE gym_membresias SET activa = 0 WHERE persona_id = ?').run(personaId);

      // 2. Insertar nueva membresía
      const mInfo = db.prepare(`
        INSERT INTO gym_membresias (persona_id, plan_id, fecha_inicio, fecha_fin, estatus, activa)
        VALUES (?, ?, ?, ?, 'VIGENTE', 1)
      `).run(personaId, planId, fechaInicioStr, fechaFinStr);
      membresiaId = Number(mInfo.lastInsertRowid);

      // 3. Registrar pago
      db.prepare(`
        INSERT INTO gym_pagos (folio, persona_id, membresia_id, plan_id, monto, metodo_pago, cajero_usuario_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(folio, personaId, membresiaId, planId, plan.precio, metodoPago, cajeroUsuarioId || 1);

      db.exec('COMMIT');
    } catch (tErr) {
      db.exec('ROLLBACK');
      throw tErr;
    }

    // 4. Inyectar inmediatamente en hardware autónomo en Teams con fecha límite real
    let syncOk = false;
    let syncError: string | null = null;

    if (persona.hik_person_id) {
      try {
        const { TeamsPersonService } = await import('../iam/teamsPerson.service.js');
        const vigResult = await TeamsPersonService.updatePersonVigencia(personaId, fechaFinStr);
        syncOk = vigResult.teamsSynced;
      } catch (err: any) {
        syncError = err.message;
      }
    }

    return {
      success: true,
      folio,
      persona: `${persona.nombre} ${persona.apellidos || ''}`.trim(),
      plan: plan.nombre,
      monto: plan.precio,
      metodoPago,
      vigenciaDesde: fechaInicioStr,
      vigenciaHasta: fechaFinStr,
      hardwareSincronizado: syncOk,
      hardwareError: syncError,
    };
  }

  // ==========================================================================
  // MÉTRICAS Y KPIS DE MONITOR DE RECEPCIÓN
  // ==========================================================================
  public static getDashboardStats() {
    const totalPersonas = (db.prepare(`SELECT COUNT(*) as count FROM personas WHERE activo = 1`).get() as any).count;
    const sociosVigentes = (db.prepare(`
      SELECT COUNT(DISTINCT persona_id) as count FROM gym_membresias WHERE activa = 1 AND fecha_fin >= DATE('now')
    `).get() as any).count;

    const sociosVencidos = Math.max(0, totalPersonas - sociosVigentes);

    const hoyStr = new Date().toISOString().split('T')[0];
    const ingresosHoy = (db.prepare(`
      SELECT COALESCE(SUM(monto), 0) as total FROM gym_pagos WHERE DATE(fecha_pago) = ?
    `).get(hoyStr) as any).total;

    // Cálculo de aforo en vivo: Entradas hoy - Salidas hoy (estrictamente socios verificados)
    const entradasHoy = (db.prepare(`
      SELECT COUNT(*) as count FROM eventos_acceso
      WHERE DATE(fecha_hora) = ? AND direccion = 'ENTRADA' AND tipo_evento = 'CONCEDIDO'
    `).get(hoyStr) as any).count;

    const salidasHoy = (db.prepare(`
      SELECT COUNT(*) as count FROM eventos_acceso
      WHERE DATE(fecha_hora) = ? AND direccion = 'SALIDA' AND tipo_evento = 'CONCEDIDO'
    `).get(hoyStr) as any).count;

    const aforoActual = Math.max(0, entradasHoy - salidasHoy);

    // Métrica de auditoría: Aperturas manuales del día y operadores
    const aperturasManualesHoy = (db.prepare(`
      SELECT COUNT(*) as count FROM eventos_acceso
      WHERE DATE(fecha_hora) = ? AND tipo_evento = 'APERTURA_MANUAL'
    `).get(hoyStr) as any).count;

    const opRows = db.prepare(`
      SELECT DISTINCT usuario_nombre FROM eventos_auditoria
      WHERE DATE(fecha_hora) = ? AND accion = 'APERTURA_MANUAL' AND usuario_nombre IS NOT NULL
    `).all() as any[];

    let operadoresAperturaHoy = opRows.map(r => r.usuario_nombre).filter(Boolean).join(', ');
    if (!operadoresAperturaHoy && aperturasManualesHoy > 0) {
      const ev = db.prepare(`
        SELECT persona_nombre FROM eventos_acceso 
        WHERE DATE(fecha_hora) = ? AND tipo_evento = 'APERTURA_MANUAL'
        ORDER BY id DESC LIMIT 1
      `).get(hoyStr) as any;
      if (ev?.persona_nombre) {
        const match = ev.persona_nombre.match(/\((.*?)\)/);
        operadoresAperturaHoy = match ? match[1] : 'Recepción';
      }
    }

    const ultimosAccesos = db.prepare(`
      SELECT e.*, t.nombre as torniquete_nombre, t.direccion as torniquete_direccion
      FROM eventos_acceso e
      LEFT JOIN torniquetes t ON t.id = e.torniquete_id
      ORDER BY e.fecha_hora DESC
      LIMIT 10
    `).all();

    const vencenPronto = db.prepare(`
      SELECT p.id, p.nombre, p.telefono, m.fecha_fin
      FROM personas p
      JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
      WHERE m.fecha_fin >= DATE('now') AND m.fecha_fin <= DATE('now', '+3 days')
      ORDER BY m.fecha_fin ASC
      LIMIT 5
    `).all();

    return {
      totalPersonas,
      sociosVigentes,
      sociosVencidos,
      ingresosHoy,
      entradasHoy,
      salidasHoy,
      aforoActual,
      aperturasManualesHoy,
      operadoresAperturaHoy: operadoresAperturaHoy || 'Recepción',
      ultimosAccesos,
      vencenPronto,
    };
  }
}
