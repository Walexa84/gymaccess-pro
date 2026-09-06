import { db } from '../../db/database.js';
import { HikConnectService } from '../../services/hikconnect.js';

export interface SucursalData {
  id?: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activa?: number;
  dispositivoIds?: number[];
}

export class SucursalesService {
  /**
   * Obtener todas las sucursales con sus dispositivos asociados y cuentas Teams
   */
  public static getSucursales() {
    const sucursales = db.prepare(`
      SELECT id, nombre, direccion, telefono, activa, creado_en
      FROM sucursales
      WHERE activa = 1
      ORDER BY id ASC
    `).all() as any[];

    // Obtener relaciones con dispositivos
    const rels = db.prepare(`
      SELECT sd.sucursal_id, d.id as dispositivo_id, d.nombre as dispositivo_nombre,
             d.driver, d.cloud_serial, d.estado_conexion, d.cuenta_hct_id,
             c.nombre as cuenta_nombre
      FROM sucursal_dispositivos sd
      JOIN dispositivos d ON d.id = sd.dispositivo_id
      LEFT JOIN cuentas_hct c ON c.id = d.cuenta_hct_id
      WHERE d.activa = 1
      ORDER BY d.id ASC
    `).all() as any[];

    return sucursales.map((s) => {
      const disp = rels.filter((r) => r.sucursal_id === s.id);
      return {
        ...s,
        dispositivos: disp,
        total_dispositivos: disp.length,
      };
    });
  }

  /**
   * Crear nueva sucursal y opcionalmente vincular sus dispositivos
   */
  public static createSucursal(data: SucursalData) {
    if (!data.nombre || !data.nombre.trim()) {
      throw new Error('El nombre de la sucursal es obligatorio');
    }

    db.exec('BEGIN');
    try {
      const stmt = db.prepare(`
        INSERT INTO sucursales (nombre, direccion, telefono, activa)
        VALUES (?, ?, ?, 1)
      `);
      const info = stmt.run(data.nombre.trim(), data.direccion || '', data.telefono || '');
      const sucursalId = Number(info.lastInsertRowid);

      if (Array.isArray(data.dispositivoIds) && data.dispositivoIds.length > 0) {
        const insRel = db.prepare(`
          INSERT OR IGNORE INTO sucursal_dispositivos (sucursal_id, dispositivo_id)
          VALUES (?, ?)
        `);
        for (const dispId of data.dispositivoIds) {
          insRel.run(sucursalId, Number(dispId));
        }
      }

      db.exec('COMMIT');
      return this.getSucursales().find((s) => s.id === sucursalId);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Actualizar datos de sucursal y sincronizar dispositivos asignados
   */
  public static updateSucursal(id: number, data: Partial<SucursalData>) {
    const sucursal = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(id);
    if (!sucursal) throw new Error('Sucursal no encontrada');

    db.exec('BEGIN');
    try {
      if (data.nombre !== undefined) {
        db.prepare(`
          UPDATE sucursales 
          SET nombre = ?, direccion = COALESCE(?, direccion), telefono = COALESCE(?, telefono)
          WHERE id = ?
        `).run(data.nombre.trim(), data.direccion ?? null, data.telefono ?? null, id);
      }

      // Si se envía el array de dispositivos, actualizar tabla intermedia
      if (Array.isArray(data.dispositivoIds)) {
        db.prepare('DELETE FROM sucursal_dispositivos WHERE sucursal_id = ?').run(id);
        const insRel = db.prepare(`
          INSERT OR IGNORE INTO sucursal_dispositivos (sucursal_id, dispositivo_id)
          VALUES (?, ?)
        `);
        for (const dispId of data.dispositivoIds) {
          insRel.run(id, Number(dispId));
        }
      }

      db.exec('COMMIT');
      return this.getSucursales().find((s) => s.id === id);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Eliminar (desactivar) sucursal
   */
  public static deleteSucursal(id: number) {
    db.prepare('UPDATE sucursales SET activa = 0 WHERE id = ?').run(id);
    return { success: true, message: 'Sucursal desactivada' };
  }

  /**
   * Renombrar dispositivo localmente y en Hik-Connect Teams OpenAPI
   */
  public static async renameDispositivo(dispId: number, nuevoNombre: string) {
    if (!nuevoNombre || !nuevoNombre.trim()) {
      throw new Error('El nuevo nombre no puede estar vacío');
    }
    const cleanNombre = nuevoNombre.trim();

    const disp = db.prepare('SELECT * FROM dispositivos WHERE id = ?').get(dispId) as any;
    if (!disp) throw new Error('Dispositivo no encontrado');

    let teamsResult: { success: boolean; message: string } | null = null;

    // Si es un equipo de Teams, enviar renombrado a la nube
    if (disp.driver === 'HIKCONNECT_TEAMS' && disp.cuenta_hct_id) {
      try {
        const cloudDevices = await HikConnectService.getDevices(disp.cuenta_hct_id);
        const match = cloudDevices.find((cd: any) => (cd.serialNo === disp.cloud_serial || cd.deviceSerial === disp.cloud_serial));
        const cloudId = match ? (match.id || match.deviceId) : disp.cloud_serial;

        if (cloudId) {
          teamsResult = await HikConnectService.updateDevice(String(cloudId), cleanNombre, disp.cuenta_hct_id);
        }
      } catch (err: any) {
        console.warn('⚠️ No se pudo enviar el cambio de nombre a Teams:', err.message);
      }
    }

    // Actualizar nombre en SQLite
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE dispositivos SET nombre = ? WHERE id = ?').run(cleanNombre, dispId);
      db.prepare('UPDATE torniquetes SET nombre = ? WHERE dispositivo_id = ?').run(cleanNombre, dispId);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return {
      success: true,
      message: teamsResult?.message || 'Nombre actualizado localmente',
      nuevoNombre: cleanNombre,
      teamsSynced: teamsResult?.success ?? false,
    };
  }
}
