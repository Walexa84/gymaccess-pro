import { db } from '../../db/database.js';
import { AuditService } from '../audit/audit.service.js';
import { TeamsPersonService } from './teamsPerson.service.js';

export class CortesiasService {
  /**
   * Obtiene o inicializa el plan especial de Cortesía en la base de datos
   */
  public static getPlanCortesiaId(): number {
    let plan = db.prepare(`SELECT id FROM gym_planes WHERE nombre LIKE '%Cortesía%' LIMIT 1`).get() as any;
    if (!plan) {
      const ins = db.prepare(`
        INSERT INTO gym_planes (nombre, duracion_dias, precio, activo)
        VALUES ('Cortesía (Prueba Gratuita)', 1, 0, 1)
      `).run();
      return Number(ins.lastInsertRowid);
    }
    return plan.id;
  }

  /**
   * Cuenta cuántas cortesías históricas ha recibido un cliente por su persona_id
   */
  public static contarCortesias(personaId: number): number {
    const row = db.prepare(`
      SELECT COUNT(*) as total
      FROM gym_membresias m
      JOIN gym_planes p ON p.id = m.plan_id
      WHERE m.persona_id = ? AND (p.nombre LIKE '%Cortesía%' OR p.precio = 0)
    `).get(personaId) as any;
    return row?.total || 0;
  }

  /**
   * Cuenta cuántas cortesías históricas ha recibido un cliente por su número de teléfono
   */
  public static contarCortesiasPorTelefono(telefono: string): number {
    if (!telefono || !telefono.trim()) return 0;
    const row = db.prepare(`
      SELECT COUNT(*) as total
      FROM gym_membresias m
      JOIN personas p ON p.id = m.persona_id
      JOIN gym_planes pl ON pl.id = m.plan_id
      WHERE p.telefono = ? AND (pl.nombre LIKE '%Cortesía%' OR pl.precio = 0)
    `).get(telefono.trim()) as any;
    return row?.total || 0;
  }

  /**
   * Otorga una cortesía de 1 día natural (vence hoy a las 23:59:59) a un cliente registrado por su ID.
   * Aplica la regla estricta de máximo 3 cortesías vitalicias.
   */
  public static async otorgarCortesia(personaId: number, options?: { usuarioId?: number; usuarioNombre?: string; ip?: string }) {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId) as any;
    if (!persona) {
      throw new Error(`No se encontró a la persona con ID #${personaId}`);
    }

    const usadas = this.contarCortesias(personaId);
    if (usadas >= 3) {
      throw new Error(`Esta persona (ID #${personaId} - ${persona.nombre} ${persona.apellidos || ''}) ya ha alcanzado el límite máximo de 3 pases de cortesía permitidos. Para ingresar debe adquirir una membresía o pase diario pagado.`);
    }

    if (persona.telefono && persona.telefono.trim()) {
      const usadasTel = this.contarCortesiasPorTelefono(persona.telefono.trim());
      if (usadasTel >= 3) {
        throw new Error(`El teléfono ${persona.telefono} ya cuenta con 3 pases de cortesía registrados. Para ingresar debe adquirir una membresía o pase diario.`);
      }
    }

    const planId = this.getPlanCortesiaId();
    const hoyStr = new Date().toISOString().split('T')[0];

    // 1. Desactivar membresías previas de la persona
    db.prepare('UPDATE gym_membresias SET activa = 0 WHERE persona_id = ?').run(personaId);

    // 2. Insertar nueva membresía de cortesía con vigencia de 1 día (hoy)
    const ins = db.prepare(`
      INSERT INTO gym_membresias (persona_id, plan_id, fecha_inicio, fecha_fin, estatus, activa)
      VALUES (?, ?, ?, ?, 'VIGENTE', 1)
    `).run(personaId, planId, hoyStr, hoyStr);

    const membresiaId = Number(ins.lastInsertRowid);

    // 3. Sincronizar vigencia con el hardware (Hikvision Teams o local) si ya tiene credencial
    let hardwareSynced = false;
    let hardwareError = null;
    try {
      await TeamsPersonService.updatePersonVigencia(personaId, hoyStr);
      hardwareSynced = true;
    } catch (hErr: any) {
      hardwareError = hErr.message;
      console.warn(`⚠️ [CortesiasService] Advertencia sincronizando con checador:`, hErr.message);
    }

    // 4. Registrar en la bitácora independiente de auditoría
    AuditService.registrarEvento({
      modulo: 'MEMBRESIA',
      accion: 'EMISION_CORTESIA',
      usuarioId: options?.usuarioId,
      usuarioNombre: options?.usuarioNombre || 'Recepción',
      personaId: persona.id,
      personaNombre: `${persona.nombre} ${persona.apellidos || ''}`.trim(),
      recursoId: membresiaId,
      detalles: `Cortesía #${usadas + 1} de 3 otorgada por 1 día (Vence hoy 23:59:59). Hardware: ${hardwareSynced ? 'Sincronizado' : 'Pendiente'}`,
      resultado: 'EXITO',
      ip: options?.ip,
      metadata: {
        cortesiasPrevias: usadas,
        cortesiasRestantes: 3 - (usadas + 1),
        fechaFin: hoyStr,
        hardwareSynced,
        hardwareError,
      },
    });

    return {
      success: true,
      personaId,
      nombre: persona.nombre,
      membresiaId,
      cortesiasUsadas: usadas + 1,
      cortesiasRestantes: 3 - (usadas + 1),
      vigenciaFin: hoyStr,
      hardwareSynced,
    };
  }

  /**
   * Busca si ya existen personas registradas con nombre y apellidos similares
   * para evitar que el recepcionista cree registros duplicados para burlar el límite.
   */
  public static buscarPosiblesDuplicados(nombre: string, apellidos?: string) {
    if (!nombre || nombre.trim().length < 2) return [];

    const normNombre = `%${nombre.trim()}%`;
    const normApellidos = apellidos && apellidos.trim() ? `%${apellidos.trim()}%` : '%';

    const personas = db.prepare(`
      SELECT p.id, p.codigo, p.nombre, p.apellidos, p.telefono, p.foto_url, p.tipo, p.activo
      FROM personas p
      WHERE (p.nombre LIKE ? AND (p.apellidos LIKE ? OR p.apellidos IS NULL))
         OR (p.apellidos LIKE ? AND p.apellidos IS NOT NULL)
      LIMIT 10
    `).all(normNombre, normApellidos, normNombre) as any[];

    return personas.map((p) => ({
      ...p,
      cortesiasUsadas: this.contarCortesias(p.id),
      puedeRecibirCortesia: this.contarCortesias(p.id) < 3,
    }));
  }
}
