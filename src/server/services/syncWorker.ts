import cron from 'node-cron';
import { db } from '../db/database.js';
import { HardwareManager } from './hardwareManager.js';
import { HikConnectService } from './hikconnect.js';
import { AccessService } from '../modules/access/access.service.js';
import { SseManager } from '../modules/access/sse.manager.js';

export class SyncWorker {
  private static isRunning = false;

  /**
   * Audita todas las personas con membresías vencidas:
   * 1. Detecta personas cuya fecha de membresía expiró.
   * 2. Se asegura de revocar el acceso en el hardware o marcar la vigencia como terminada.
   * 3. Registra el evento en eventos_acceso.
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
      const hoy = new Date().toISOString().split('T')[0];

      // Personas con membresía activa vencida
      const vencidos = db.prepare(`
        SELECT p.id, p.nombre, p.telefono, p.hik_person_id, m.id as membresia_id, m.fecha_fin
        FROM personas p
        JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
        WHERE m.fecha_fin < ?
      `).all(hoy) as any[];

      if (vencidos.length > 0) {
        console.log(`🔍 Auditoría: detectadas ${vencidos.length} membresías vencidas a desactivar.`);
      }

      for (const item of vencidos) {
        try {
          db.exec('BEGIN');
          db.prepare(`UPDATE gym_membresias SET activa = 0, estatus = 'VENCIDA' WHERE id = ?`).run(item.membresia_id);
          db.prepare(`
            INSERT INTO eventos_acceso (persona_id, persona_nombre, tipo_evento, metodo_autenticacion)
            VALUES (?, ?, 'DENEGADO_VENCIDO', 'REMOTO_SOFTWARE')
          `).run(item.id, item.nombre);
          db.exec('COMMIT');

          revocados++;
          console.log(`🚫 Membresía expirada desactivada en BD: ${item.nombre} (Venció el ${item.fecha_fin})`);

          // Sincronización desacoplada con hardware (no bloquea el estado local de BD)
          const empId = item.hik_person_id || (item.telefono ? item.telefono.replace(/\D/g, '').slice(-10) : null) || String(item.id);
          if (empId) {
            try {
              await HardwareManager.setPersonAccess(empId, false);
            } catch (hwErr: any) {
              console.warn(`⚠️ Aviso al revocar acceso en hardware a ${item.nombre}:`, hwErr.message);
            }
          }
        } catch (err: any) {
          try { db.exec('ROLLBACK'); } catch {}
          errores++;
          console.error(`❌ Error procesando vencimiento de ${item.nombre}:`, err.message);
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
   * Monitor de estado y presencia de dispositivos físicos en vivo.
   * Consulta periódicamente el estado de conexión real de los equipos en la nube/red
   * y transmite los cambios por SSE para actualizar los LEDs del Navbar y CuentasHct.
   */
  public static async pollHardwareHealth(): Promise<void> {
    try {
      const dispositivos = db.prepare('SELECT * FROM dispositivos WHERE activa = 1').all() as any[];
      if (dispositivos.length === 0) {
        const summary = AccessService.getHardwareHealthSummary();
        SseManager.broadcastStatus(summary);
        return;
      }

      // Agrupar dispositivos HIKCONNECT_TEAMS por cuenta_hct_id
      const cuentasMap = new Map<number, any[]>();
      for (const d of dispositivos) {
        if (d.driver === 'HIKCONNECT_TEAMS') {
          const cuentaId = d.cuenta_hct_id || 0;
          if (!cuentasMap.has(cuentaId)) {
            cuentasMap.set(cuentaId, []);
          }
          cuentasMap.get(cuentaId)!.push(d);
        }
      }

      for (const [cuentaId, devs] of cuentasMap.entries()) {
        try {
          const cloudDevices = await HikConnectService.getDevices(cuentaId || undefined);
          for (const d of devs) {
            const match = cloudDevices.find((cd: any) => (cd.serialNo === d.cloud_serial || cd.deviceSerial === d.cloud_serial));
            const isOnline = match ? (match.onlineStatus === 1) : false;
            const nuevoEstado = isOnline ? 'ONLINE' : 'OFFLINE';

            if (d.estado_conexion !== nuevoEstado) {
              db.prepare('UPDATE dispositivos SET estado_conexion = ?, ultimo_ping = CURRENT_TIMESTAMP WHERE id = ?').run(
                nuevoEstado,
                d.id
              );
              console.log(`📡 [Heartbeat] Dispositivo "${d.nombre}" (${d.cloud_serial}) cambió a: ${nuevoEstado}`);
            } else {
              db.prepare('UPDATE dispositivos SET ultimo_ping = CURRENT_TIMESTAMP WHERE id = ?').run(d.id);
            }
          }
        } catch (err: any) {
          console.warn(`⚠️ [Heartbeat] Fallo consultando dispositivos de cuenta ${cuentaId}:`, err.message);
        }
      }

      // Transmitir resumen de salud por SSE a todos los clientes web
      const summary = AccessService.getHardwareHealthSummary();
      SseManager.broadcastStatus(summary);
    } catch (err: any) {
      console.error('❌ Error en sondeo de hardware health:', err.message);
    }
  }

  /**
   * Demonio de fondo con Startup Catch-up, tarea horaria, sondeo de hardware y tarea nocturna
   */
  public static startDaemon() {
    console.log('⏰ Iniciando demonio de auditoría, sincronización de vigencias y latidos de hardware...');
    
    // 1. Startup Catch-up de vigencias (3 segundos tras arranque)
    setTimeout(() => {
      this.auditVigencias().catch(err => console.error('Error en Startup Catch-up:', err));
    }, 3000);

    // 2. Primer sondeo de salud de hardware (4 segundos tras arranque)
    setTimeout(() => {
      this.pollHardwareHealth().catch(err => console.error('Error en sondeo inicial de hardware:', err));
    }, 4000);

    // 3. Sondeo periódico de presencia de hardware (cada 45 segundos)
    setInterval(() => {
      this.pollHardwareHealth().catch(err => console.error('Error en sondeo periódico de hardware:', err));
    }, 45000);

    // 4. Tarea horaria de auditoría de vigencias
    cron.schedule('0 * * * *', () => {
      this.auditVigencias().catch(err => console.error('Error en auditoría horaria:', err));
    });

    // 5. Tarea estricta de medianoche (00:00:05)
    cron.schedule('5 0 0 * * *', () => {
      console.log('🌙 Disparando auditoría nocturna de medianoche...');
      this.auditVigencias().catch(err => console.error('Error en auditoría nocturna:', err));
    });
  }
}
