import { db } from '../db/database.js';
import { HikConnectClient } from './hikconnectClient.js';
import type { HikConfig, TokenCache } from './hikconnectClient.js';
import { HikConnectSyncService } from './hikconnectSync.js';
import type { SyncResourcesResult } from './hikconnectSync.js';

export { HikConnectClient, HikConnectSyncService };
export type { HikConfig, TokenCache, SyncResourcesResult };

/**
 * Fachada unificada de Hik-Connect Teams (AccessCore)
 * Mantiene compatibilidad total hacia atrás mientras delega la lógica de red a HikConnectClient
 * y la persistencia a HikConnectSyncService.
 */
export class HikConnectService {
  // ==========================================================================
  // DELEGACIÓN A CLIENTE HTTP HIKCONNECT
  // ==========================================================================
  public static sanitizeUrl(url?: string): string {
    return HikConnectClient.sanitizeUrl(url);
  }

  public static getConfig(cuentaId?: number): HikConfig {
    return HikConnectClient.getConfig(cuentaId);
  }

  public static async getAccessToken(cuentaId?: number, forceNew = false): Promise<string> {
    return HikConnectClient.getAccessToken(cuentaId, forceNew);
  }

  public static async addPerson(personName: string, phoneNo: string): Promise<string> {
    return HikConnectClient.addPerson(personName, phoneNo);
  }

  public static async uploadPersonPhoto(personId: string, base64Photo: string): Promise<boolean> {
    return HikConnectClient.uploadPersonPhoto(personId, base64Photo);
  }

  public static async setPersonAccess(personId: string, grantAccess: boolean, specificLevelId?: string): Promise<boolean> {
    return HikConnectClient.setPersonAccess(personId, grantAccess, specificLevelId);
  }

  public static async remoteControlDoor(doorOrResourceId: string, actionType: 1 | 2 = 1, cuentaId?: number) {
    return HikConnectClient.remoteControlDoor(doorOrResourceId, actionType, cuentaId);
  }

  public static async updateDevice(deviceId: string, deviceName: string, cuentaId?: number) {
    return HikConnectClient.updateDevice(deviceId, deviceName, cuentaId);
  }

  public static async getDevices(cuentaId?: number) {
    return HikConnectClient.getDevices(cuentaId);
  }

  public static async getAccessLevels(cuentaId?: number) {
    return HikConnectClient.getAccessLevels(cuentaId);
  }

  public static async getAreas(cuentaId?: number) {
    return HikConnectClient.getAreas(cuentaId);
  }

  // ==========================================================================
  // DELEGACIÓN A SINCRONIZADOR DE RECURSOS
  // ==========================================================================
  public static async syncResourcesToDatabase(targetCuentaId?: number): Promise<SyncResourcesResult> {
    return HikConnectSyncService.syncResourcesToDatabase(targetCuentaId);
  }

  // ==========================================================================
  // GESTIÓN CRUD DE CUENTAS HCT (MULTI-ORGANIZACIÓN)
  // ==========================================================================
  public static getCuentasHct() {
    const cuentas = db.prepare(`
      SELECT * FROM cuentas_hct WHERE activa = 1 ORDER BY id ASC
    `).all() as any[];

    return cuentas.map(c => {
      const equipos = db.prepare(`
        SELECT d.id, d.nombre, d.driver, d.cloud_serial, d.firmware_version, 
               d.estado_conexion, d.ultimo_ping, d.creado_en
        FROM dispositivos d
        WHERE d.cuenta_hct_id = ? AND d.activa = 1
        ORDER BY d.id ASC
      `).all(c.id) as any[];

      const equiposConAccesos = equipos.map(e => {
        const accesos = db.prepare(`
          SELECT id, nombre, canal_relevador, direccion, cloud_resource_id, activo
          FROM torniquetes
          WHERE dispositivo_id = ? AND activo = 1
        `).all(e.id);
        return {
          ...e,
          accesos,
        };
      });

      return {
        ...c,
        app_key_masked: c.app_key ? `${c.app_key.substring(0, 8)}...${c.app_key.substring(c.app_key.length - 4)}` : '',
        equipos: equiposConAccesos,
        total_dispositivos: equiposConAccesos.length,
        total_accesos: equiposConAccesos.reduce((acc, eq) => acc + (eq.accesos?.length || 0), 0),
      };
    });
  }

  public static async createCuentaHct(data: { nombre: string; app_key: string; secret_key: string; base_url?: string; notas?: string }) {
    const baseUrl = HikConnectClient.sanitizeUrl(data.base_url);
    const stmt = db.prepare(`
      INSERT INTO cuentas_hct (nombre, app_key, secret_key, base_url, notas, activa)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const info = stmt.run(
      data.nombre.trim(),
      data.app_key.trim(),
      data.secret_key.trim(),
      baseUrl,
      data.notas?.trim() || null
    );
    const newId = Number(info.lastInsertRowid);

    try {
      await HikConnectSyncService.syncResourcesToDatabase(newId);
    } catch (err: any) {
      console.warn(`⚠️ Error al sincronizar cuenta recién creada (ID ${newId}):`, err.message);
    }

    const cuentas = this.getCuentasHct();
    return cuentas.find((c: any) => c.id === newId) || db.prepare('SELECT * FROM cuentas_hct WHERE id = ?').get(newId);
  }

  public static updateCuentaHct(id: number, data: Partial<{ nombre: string; app_key: string; secret_key: string; base_url: string; notas: string }>) {
    db.prepare(`
      UPDATE cuentas_hct
      SET nombre = COALESCE(?, nombre),
          app_key = COALESCE(?, app_key),
          secret_key = COALESCE(?, secret_key),
          base_url = COALESCE(?, base_url),
          notas = COALESCE(?, notas)
      WHERE id = ?
    `).run(
      data.nombre || null,
      data.app_key || null,
      data.secret_key || null,
      data.base_url || null,
      data.notas || null,
      id
    );
    HikConnectClient.invalidateToken(id);
    return db.prepare('SELECT * FROM cuentas_hct WHERE id = ?').get(id);
  }

  public static deleteCuentaHct(id: number) {
    db.prepare('UPDATE cuentas_hct SET activa = 0 WHERE id = ?').run(id);
    HikConnectClient.invalidateToken(id);
    return { success: true, message: 'Cuenta HCT desactivada' };
  }
}
