import { db } from '../../db/database.js';
import { AuditEventInput, FiltrosAuditoria } from './audit.types.js';

export class AuditService {
  /**
   * Registra un evento de auditoría en la base de datos de manera resiliente (Clean Architecture).
   */
  public static registrarEvento(input: AuditEventInput): number {
    try {
      const stmt = db.prepare(`
        INSERT INTO eventos_auditoria (
          modulo, accion, usuario_id, usuario_nombre, persona_id, persona_nombre,
          recurso_id, detalles, resultado, ip, metadata_json, fecha_hora
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const info = stmt.run(
        input.modulo,
        input.accion,
        input.usuarioId || null,
        input.usuarioNombre || null,
        input.personaId || null,
        input.personaNombre || null,
        input.recursoId ? String(input.recursoId) : null,
        input.detalles || null,
        input.resultado || 'EXITO',
        input.ip || null,
        input.metadata ? JSON.stringify(input.metadata) : null
      );

      return Number(info.lastInsertRowid);
    } catch (err: any) {
      console.error('⚠️ [AuditService] Error registrando auditoría:', err.message);
      return 0;
    }
  }

  /**
   * Consulta los eventos de auditoría del sistema con filtros avanzados.
   */
  public static getEventosAuditoria(filtros: FiltrosAuditoria = {}) {
    const limit = Math.min(filtros.limit || 50, 200);
    const offset = filtros.offset || 0;

    let sql = 'SELECT * FROM eventos_auditoria WHERE 1=1';
    const params: any[] = [];

    if (filtros.modulo) {
      sql += ' AND modulo = ?';
      params.push(filtros.modulo);
    }

    if (filtros.accion) {
      sql += ' AND accion = ?';
      params.push(filtros.accion);
    }

    if (filtros.resultado) {
      sql += ' AND resultado = ?';
      params.push(filtros.resultado);
    }

    if (filtros.fechaInicio) {
      sql += ' AND fecha_hora >= ?';
      params.push(filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      sql += ' AND fecha_hora <= ?';
      params.push(filtros.fechaFin);
    }

    if (filtros.busqueda && filtros.busqueda.trim()) {
      const term = `%${filtros.busqueda.trim()}%`;
      sql += ' AND (detalles LIKE ? OR persona_nombre LIKE ? OR usuario_nombre LIKE ? OR recurso_id LIKE ?)';
      params.push(term, term, term, term);
    }

    // Contar total para paginación
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalRow = db.prepare(countSql).get(...params) as any;
    const total = totalRow?.total || 0;

    sql += ' ORDER BY fecha_hora DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const eventos = db.prepare(sql).all(...params);

    return {
      total,
      limit,
      offset,
      eventos,
    };
  }

  /**
   * Consulta los eventos de acceso físico de torniquetes y checadores.
   */
  public static getEventosAcceso(filtros: { limit?: number; offset?: number; tipoEvento?: string; busqueda?: string } = {}) {
    const limit = Math.min(filtros.limit || 50, 200);
    const offset = filtros.offset || 0;

    let sql = `
      SELECT e.*, t.nombre as torniquete_nombre, t.direccion as torniquete_direccion,
             d.nombre as dispositivo_nombre
      FROM eventos_acceso e
      LEFT JOIN torniquetes t ON t.id = e.torniquete_id
      LEFT JOIN dispositivos d ON d.id = e.dispositivo_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros.tipoEvento && filtros.tipoEvento !== 'TODOS') {
      sql += ' AND e.tipo_evento = ?';
      params.push(filtros.tipoEvento);
    }

    if (filtros.busqueda && filtros.busqueda.trim()) {
      const term = `%${filtros.busqueda.trim()}%`;
      sql += ' AND (e.persona_nombre LIKE ? OR t.nombre LIKE ?)';
      params.push(term, term);
    }

    const countSql = sql.replace(/SELECT e\.\*.*?FROM eventos_acceso e/s, 'SELECT COUNT(*) as total FROM eventos_acceso e');
    const totalRow = db.prepare(countSql).get(...params) as any;
    const total = totalRow?.total || 0;

    sql += ' ORDER BY e.fecha_hora DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const eventos = db.prepare(sql).all(...params);

    return {
      total,
      limit,
      offset,
      eventos,
    };
  }

  /**
   * Resumen de métricas de hoy para la cabecera de la bitácora
   */
  public static getMetricasHoy() {
    const hoy = new Date().toISOString().split('T')[0];

    const accesosConcedidos = (db.prepare(`
      SELECT COUNT(*) as c FROM eventos_acceso 
      WHERE tipo_evento = 'CONCEDIDO' AND fecha_hora >= date('now', 'start of day')
    `).get() as any)?.c || 0;

    const accesosDenegados = (db.prepare(`
      SELECT COUNT(*) as c FROM eventos_acceso 
      WHERE tipo_evento IN ('DENEGADO_VENCIDO', 'DENEGADO_DESCONOCIDO', 'DENEGADO_HORARIO') 
        AND fecha_hora >= date('now', 'start of day')
    `).get() as any)?.c || 0;

    const aperturasManuales = (db.prepare(`
      SELECT COUNT(*) as c FROM eventos_acceso 
      WHERE tipo_evento = 'APERTURA_MANUAL' AND fecha_hora >= date('now', 'start of day')
    `).get() as any)?.c || 0;

    const cortesiasHoy = (db.prepare(`
      SELECT COUNT(*) as c FROM gym_membresias m
      JOIN gym_planes p ON p.id = m.plan_id
      WHERE (p.nombre LIKE '%Cortesía%' OR p.precio = 0) AND m.fecha_inicio = ?
    `).get(hoy) as any)?.c || 0;

    return {
      accesosConcedidos,
      accesosDenegados,
      aperturasManuales,
      cortesiasHoy,
    };
  }
}
