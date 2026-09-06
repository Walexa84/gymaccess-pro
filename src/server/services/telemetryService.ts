import { db } from '../db/database.js';

export interface TelemetriaEntry {
  cuenta_id?: number;
  cuenta_nombre?: string;
  tipo_accion: 'APERTURA_PUERTA' | 'PING_CONEXION' | 'SYNC_RECURSOS' | 'LOGIN_TOKEN' | 'GESTION_PERSONAS';
  recurso_id?: string;
  recurso_nombre?: string;
  latencia_ms: number;
  http_status?: number;
  hct_error_code?: string;
  hct_message?: string;
  exito: boolean;
}

export class TelemetryService {
  /**
   * Registra un evento de telemetría de hardware en la base de datos local SQLite
   */
  public static log(entry: TelemetriaEntry) {
    try {
      db.prepare(`
        INSERT INTO telemetria_hardware (
          fecha_hora, cuenta_id, cuenta_nombre, tipo_accion, recurso_id, recurso_nombre,
          latencia_ms, http_status, hct_error_code, hct_message, exito
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        new Date().toISOString(),
        entry.cuenta_id || null,
        entry.cuenta_nombre || null,
        entry.tipo_accion,
        entry.recurso_id || null,
        entry.recurso_nombre || null,
        entry.latencia_ms,
        entry.http_status || null,
        entry.hct_error_code || null,
        entry.hct_message || null,
        entry.exito ? 1 : 0
      );
    } catch (err: any) {
      console.warn('⚠️ Error registrando telemetría:', err.message);
    }
  }

  /**
   * Obtiene los últimos eventos de telemetría registrados
   */
  public static getRecientes(limit = 40) {
    return db.prepare(`
      SELECT * FROM telemetria_hardware
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Limpia el historial de telemetría
   */
  public static clearLogs() {
    db.prepare('DELETE FROM telemetria_hardware').run();
    return { success: true, message: 'Bitácora de telemetría vaciada' };
  }
}
