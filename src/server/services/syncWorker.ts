import cron from 'node-cron';
import { db } from '../db/database.js';
import { HikConnectService } from './hikconnect.js';

export class SyncWorker {
  private static isRunning = false;

  /**
   * Audita todos los socios:
   * 1. Detecta socios con membresía vencida que aún tengan estatus VIGENTE.
   * 2. Remueve su nivel de acceso en HikCentral Connect.
   * 3. Actualiza el estatus local a VENCIDO.
   * 4. Registra el evento en logs.
   */
  public static async auditVigencias(): Promise<{ revocados: number; errores: number }> {
    if (this.isRunning) {
      console.log('⏳ Auditoría de vigencias ya en ejecución. Omitiendo ciclo.');
      return { revocados: 0, errores: 0 };
    }

    this.isRunning = true;
    let revocados = 0;
    let errores = 0;

    try {
      // Fecha actual en formato YYYY-MM-DD
      const hoy = new Date().toISOString().split('T')[0];

      // Buscar socios que figuran como VIGENTES pero cuya fecha_fin ya pasó
      const sociosVencidos = db.prepare(`
        SELECT s.id, s.nombre, s.hik_person_id, m.fecha_fin
        FROM socios s
        JOIN membresias m ON m.socio_id = s.id AND m.activa = 1
        WHERE s.estatus = 'VIGENTE' AND m.fecha_fin < ?
      `).all(hoy) as { id: number; nombre: string; hik_person_id: string; fecha_fin: string }[];

      if (sociosVencidos.length > 0) {
        console.log(`🔍 Auditoría: detectados ${sociosVencidos.length} socios vencidos a revocar.`);
      }

      for (const socio of sociosVencidos) {
        try {
          if (socio.hik_person_id) {
            // Revocar nivel de acceso en la terminal facial
            await HikConnectService.setPersonAccess(socio.hik_person_id, false);
          }

          // Actualizar estatus local en transacción
          try {
            db.exec('BEGIN');
            db.prepare(`UPDATE socios SET estatus = 'VENCIDO', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`).run(socio.id);
            db.prepare(`UPDATE membresias SET activa = 0 WHERE socio_id = ?`).run(socio.id);
            db.prepare(`
              INSERT INTO accesos_log (socio_id, socio_nombre, tipo_evento)
              VALUES (?, ?, 'DENEGADO_VENCIDO')
            `).run(socio.id, socio.nombre);
            db.exec('COMMIT');
          } catch (tErr) {
            db.exec('ROLLBACK');
            throw tErr;
          }

          revocados++;
          console.log(`🚫 Acceso revocado a: ${socio.nombre} (Venció el ${socio.fecha_fin})`);
        } catch (err: any) {
          errores++;
          console.error(`❌ Error revocando acceso a ${socio.nombre}:`, err.message);
        }
      }

      // Reconciliación inversa: si hay un socio marcado VENCIDO pero que tiene membresía futura vigente, corregir
      const sociosConMembresiaFutura = db.prepare(`
        SELECT s.id, s.nombre, s.hik_person_id, m.fecha_fin
        FROM socios s
        JOIN membresias m ON m.socio_id = s.id AND m.activa = 1
        WHERE s.estatus != 'VIGENTE' AND m.fecha_fin >= ?
      `).all(hoy) as { id: number; nombre: string; hik_person_id: string; fecha_fin: string }[];

      for (const socio of sociosConMembresiaFutura) {
        try {
          if (socio.hik_person_id) {
            await HikConnectService.setPersonAccess(socio.hik_person_id, true);
          }
          db.prepare(`UPDATE socios SET estatus = 'VIGENTE', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`).run(socio.id);
          console.log(`✅ Acceso reactivado en reconciliación para: ${socio.nombre}`);
        } catch (err: any) {
          console.error(`❌ Error reactivando socio ${socio.nombre}:`, err.message);
        }
      }

    } catch (globalErr: any) {
      console.error('❌ Error en ciclo de auditoría:', globalErr.message);
    } finally {
      this.isRunning = false;
    }

    return { revocados, errores };
  }

  /**
   * Inicia el demonio de fondo:
   * - Corre inmediatamente al arrancar la aplicación (Startup Catch-up)
   * - Corre cada hora en el minuto 0
   * - Corre a la medianoche (00:00:05)
   */
  public static startDaemon() {
    console.log('⏰ Iniciando demonio de auditoría de vigencias...');
    
    // 1. Startup Catch-up inmediato
    setTimeout(() => {
      this.auditVigencias().catch(err => console.error('Error en Startup Catch-up:', err));
    }, 3000);

    // 2. Tarea cada hora
    cron.schedule('0 * * * *', () => {
      this.auditVigencias().catch(err => console.error('Error en auditoría horaria:', err));
    });

    // 3. Tarea estricta de medianoche (tolerancia cero a las 00:00:05)
    cron.schedule('5 0 0 * * *', () => {
      console.log('🌙 Disparando auditoría nocturna de medianoche (Tolerancia Cero)...');
      this.auditVigencias().catch(err => console.error('Error en auditoría de medianoche:', err));
    });
  }
}
