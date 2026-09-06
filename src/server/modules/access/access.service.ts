import path from 'path';
import fs from 'fs';
import { db } from '../../db/database.js';
import { HardwareManager } from '../../services/hardwareManager.js';
import { HikvisionIsapiDriver } from '../../services/hikvisionIsapi.js';
import { HikConnectService } from '../../services/hikconnect.js';
import { SseManager } from './sse.manager.js';

export class AccessService {
  // ==========================================================================
  // CUENTAS HIK-CONNECT TEAMS (MULTI-SUCURSAL / MULTI-ORGANIZACIÓN)
  // ==========================================================================
  public static getCuentasHct() {
    return HikConnectService.getCuentasHct();
  }

  public static async createCuentaHct(data: any) {
    return HikConnectService.createCuentaHct(data);
  }

  public static updateCuentaHct(id: number, data: any) {
    return HikConnectService.updateCuentaHct(id, data);
  }

  public static deleteCuentaHct(id: number) {
    return HikConnectService.deleteCuentaHct(id);
  }

  public static async syncCuentaHct(id?: number) {
    return HikConnectService.syncResourcesToDatabase(id);
  }

  // ==========================================================================
  // DISPOSITIVOS FÍSICOS
  // ==========================================================================
  public static getDispositivos() {
    return db.prepare(`
      SELECT d.id, d.cuenta_hct_id, d.nombre, d.driver, d.ip, d.puerto, d.usuario, 
             d.cloud_serial, d.firmware_version, d.estado_conexion, d.ultimo_ping, d.activa, d.creado_en,
             c.nombre as cuenta_hct_nombre,
             COUNT(t.id) as total_torniquetes
      FROM dispositivos d
      LEFT JOIN cuentas_hct c ON c.id = d.cuenta_hct_id
      LEFT JOIN torniquetes t ON t.dispositivo_id = d.id AND t.activo = 1
      WHERE d.activa = 1
      GROUP BY d.id
      ORDER BY d.id ASC
    `).all();
  }

  public static createDispositivo(data: any) {
    const stmt = db.prepare(`
      INSERT INTO dispositivos (nombre, driver, cuenta_hct_id, ip, puerto, usuario, password, cloud_serial)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.nombre,
      data.driver || 'HIKVISION_LOCAL_ISAPI',
      data.cuenta_hct_id || null,
      data.ip || '192.168.1.100',
      data.puerto || '80',
      data.usuario || 'admin',
      data.password || '',
      data.cloud_serial || null
    );
    const dispId = Number(info.lastInsertRowid);

    // Crear torniquete por defecto asociado a este equipo
    db.prepare(`
      INSERT INTO torniquetes (dispositivo_id, canal_relevador, nombre, direccion, ubicacion_area)
      VALUES (?, 1, ?, 'BIDIRECCIONAL', 'Acceso Principal')
    `).run(dispId, `${data.nombre} - Torniquete 1`);

    return db.prepare(`SELECT * FROM dispositivos WHERE id = ?`).get(dispId);
  }

  public static deleteDispositivo(id: number) {
    db.prepare('UPDATE dispositivos SET activa = 0 WHERE id = ?').run(id);
    return { success: true, message: 'Dispositivo desactivado' };
  }

  public static async testDispositivo(id: number) {
    const disp = db.prepare('SELECT * FROM dispositivos WHERE id = ?').get(id) as any;
    if (!disp) throw new Error('Dispositivo no encontrado');

    if (disp.driver === 'HIKCONNECT_TEAMS') {
      try {
        const devices = await HikConnectService.getDevices(disp.cuenta_hct_id || undefined);
        const match = devices.find((d: any) => (d.serialNo === disp.cloud_serial || d.deviceSerial === disp.cloud_serial));
        const online = match ? (match.onlineStatus === 1) : false;
        
        db.prepare('UPDATE dispositivos SET estado_conexion = ?, ultimo_ping = CURRENT_TIMESTAMP WHERE id = ?').run(
          online ? 'ONLINE' : 'OFFLINE',
          id
        );
        return {
          success: true,
          online,
          message: online ? 'Dispositivo Cloud Hik-Connect Teams conectado y en línea' : 'Dispositivo en Teams pero fuera de línea',
          deviceInfo: match || null,
        };
      } catch (err: any) {
        db.prepare('UPDATE dispositivos SET estado_conexion = "ERROR", ultimo_ping = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return { success: false, online: false, message: `Error conectando con Teams: ${err.message}` };
      }
    } else {
      // Driver ISAPI LAN
      try {
        const isapi = new HikvisionIsapiDriver();
        const result = await isapi.testTerminal(disp);
        const ok = result.success;
        db.prepare('UPDATE dispositivos SET estado_conexion = ?, ultimo_ping = CURRENT_TIMESTAMP WHERE id = ?').run(
          ok ? 'ONLINE' : 'OFFLINE',
          id
        );
        return { success: ok, online: ok, message: ok ? 'Conexión ISAPI LAN exitosa' : (result.message || 'Sin respuesta en la IP configurada') };
      } catch (err: any) {
        db.prepare('UPDATE dispositivos SET estado_conexion = "ERROR", ultimo_ping = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        return { success: false, online: false, message: `Error ISAPI: ${err.message}` };
      }
    }
  }

  public static getHardwareHealthSummary() {
    const dispositivos = db.prepare(`
      SELECT id, nombre, driver, estado_conexion, ultimo_ping, cloud_serial
      FROM dispositivos
      WHERE activa = 1
    `).all() as any[];

    const total = dispositivos.length;
    const onlineCount = dispositivos.filter(d => d.estado_conexion === 'ONLINE').length;
    const allOnline = total > 0 && onlineCount === total;

    return {
      online: allOnline,
      totalDispositivos: total,
      onlineDispositivos: onlineCount,
      dispositivos: dispositivos.map(d => ({
        id: d.id,
        nombre: d.nombre,
        estado: d.estado_conexion,
        ultimoPing: d.ultimo_ping,
      })),
      timestamp: new Date().toISOString()
    };
  }



  // ==========================================================================
  // AUTONOMÍA OFFLINE EN HARDWARE (VIGENCIA POR FECHA)
  // ==========================================================================
  /**
   * Concede acceso y programa la fecha de corte exacta en la memoria física de la terminal
   */
  public static async grantPersonAccess(personaId: number, nivelId: number, fechaFin: string) {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId) as any;
    if (!persona) throw new Error('Persona no encontrada');

    const formattedEndTime = fechaFin.includes('T') ? fechaFin : `${fechaFin}T23:59:59`;
    const employeeNo = persona.telefono.replace(/\D/g, '').slice(-10) || `${persona.id}`;

    let errorHw: string | null = null;
    let syncStatus = 'SINCRONIZADO';

    try {
      // 1. Inyectar usuario y vigencia en la terminal física
      await HardwareManager.addPerson(persona.nombre, persona.telefono);

      // Si tiene fotografía, cargar en la terminal
      if (persona.foto_url) {
        const fullPath = path.resolve(process.cwd(), persona.foto_url.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          const base64 = fs.readFileSync(fullPath, 'base64');
          await HardwareManager.uploadPersonPhoto(employeeNo, base64).catch(e => console.warn('Foto warning:', e.message));
        }
      }

      // Conceder acceso con la fecha exacta de expiración
      await HardwareManager.setPersonAccess(employeeNo, true, String(nivelId), formattedEndTime);
      console.log(`🔓 Acceso otorgado en terminal para ${persona.nombre}. Vigencia hardware hasta: ${formattedEndTime}`);
    } catch (err: any) {
      errorHw = err.message;
      syncStatus = 'ERROR';
      console.error(`⚠️ Fallo comunicando con hardware para ${persona.nombre}:`, err.message);
    }

    // Registrar en tabla de autorizaciones
    db.prepare(`
      INSERT INTO persona_autorizaciones_acceso (persona_id, nivel_id, fecha_inicio, fecha_fin, estado_sincronizacion, ultimo_error)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
      ON CONFLICT(persona_id, nivel_id) DO UPDATE SET
        fecha_fin = excluded.fecha_fin,
        estado_sincronizacion = excluded.estado_sincronizacion,
        ultimo_error = excluded.ultimo_error,
        actualizado_en = CURRENT_TIMESTAMP
    `).run(personaId, nivelId, formattedEndTime, syncStatus, errorHw);

    return { success: syncStatus === 'SINCRONIZADO', error: errorHw };
  }

  /**
   * Revocar acceso en hardware
   */
  public static async revokePersonAccess(personaId: number) {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId) as any;
    if (!persona) return;

    const employeeNo = persona.telefono.replace(/\D/g, '').slice(-10) || `${persona.id}`;
    try {
      await HardwareManager.setPersonAccess(employeeNo, false);
      db.prepare(`
        UPDATE persona_autorizaciones_acceso
        SET estado_sincronizacion = 'SINCRONIZADO', fecha_fin = CURRENT_TIMESTAMP
        WHERE persona_id = ?
      `).run(personaId);
    } catch (err: any) {
      console.error(`Error revocando acceso a ${persona.nombre}:`, err.message);
    }
  }

  // ==========================================================================
  // EVENTOS Y REGISTRO EN VIVO
  // ==========================================================================
  public static getEventosRecientes(limit = 20) {
    return db.prepare(`
      SELECT e.*, t.nombre as torniquete_nombre, t.direccion as torniquete_direccion
      FROM eventos_acceso e
      LEFT JOIN torniquetes t ON t.id = e.torniquete_id
      ORDER BY e.fecha_hora DESC
      LIMIT ?
    `).all(limit);
  }
}
