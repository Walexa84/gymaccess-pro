import { db } from '../db/database.js';
import { HikConnectClient } from './hikconnectClient.js';

export interface SyncResourcesResult {
  cuentasSincronizadas: number;
  dispositivosImportados: number;
  nivelesImportados: number;
  torniquetesImportados: number;
}

export class HikConnectSyncService {
  /**
   * Sincroniza e importa todos los recursos de una o todas las cuentas de Hik-Connect Teams a la base SQLite local
   */
  public static async syncResourcesToDatabase(targetCuentaId?: number): Promise<SyncResourcesResult> {
    let cuentasToSync: any[] = [];
    if (targetCuentaId) {
      const c = db.prepare('SELECT * FROM cuentas_hct WHERE id = ? AND activa = 1').get(targetCuentaId);
      if (c) cuentasToSync.push(c);
    } else {
      cuentasToSync = db.prepare('SELECT * FROM cuentas_hct WHERE activa = 1').all();
    }

    if (cuentasToSync.length === 0) {
      // Fallback con la cuenta por defecto si aún no está en cuentas_hct
      const def = HikConnectClient.getConfig();
      if (def.appKey && def.secretKey) {
        cuentasToSync.push(def);
      }
    }

    let devCount = 0;
    let lvlCount = 0;
    let torniquetesCount = 0;

    for (const cuenta of cuentasToSync) {
      const cuentaId = cuenta.id || 1;
      const cuentaNombre = cuenta.nombre || 'Cuenta Principal';

      try {
        console.log(`🔄 Iniciando sincronización de cuenta HCT: [${cuentaNombre}] (ID: ${cuentaId})...`);

        // 1. Obtener niveles de acceso primero (para tener el mapeo de associateResList -> puertas/canales)
        let cloudLevels: any[] = [];
        try {
          cloudLevels = await HikConnectClient.getAccessLevels(cuentaId);
        } catch (e: any) {
          console.warn(`⚠️ Error al obtener niveles de cuenta ${cuentaNombre}:`, e.message);
        }

        const doorResourceMap = new Map<string, string>(); // resourceId -> accessLevelId o deviceName

        for (const l of cloudLevels) {
          const levelId = l.accessLevelId || l.id;
          const levelName = l.name || l.accessLevelName || `Nivel Teams ${levelId}`;
          if (!levelId) continue;

          const existingLvl = db.prepare('SELECT id FROM niveles_acceso WHERE cloud_level_id = ?').get(String(levelId)) as any;
          let localLvlId: number;
          if (existingLvl) {
            db.prepare('UPDATE niveles_acceso SET nombre = ?, cuenta_hct_id = ?, activo = 1 WHERE id = ?').run(
              levelName,
              cuentaId,
              existingLvl.id
            );
            localLvlId = existingLvl.id;
          } else {
            const info = db.prepare(`
              INSERT INTO niveles_acceso (nombre, descripcion, cloud_level_id, cuenta_hct_id, activo)
              VALUES (?, 'Nivel Cloud Hik-Connect Teams', ?, ?, 1)
            `).run(levelName, String(levelId), cuentaId);
            localLvlId = Number(info.lastInsertRowid);
          }
          lvlCount++;

          // Mapear recursos asociados a este nivel
          if (Array.isArray(l.associateResList)) {
            for (const res of l.associateResList) {
              if (res.id) {
                doorResourceMap.set(String(res.id), String(res.name || levelName));
              }
            }
          }
        }

        // 2. Obtener y sincronizar dispositivos físicos de esta cuenta
        let cloudDevices: any[] = [];
        try {
          cloudDevices = await HikConnectClient.getDevices(cuentaId);
        } catch (e: any) {
          console.warn(`⚠️ Error al obtener dispositivos de cuenta ${cuentaNombre}:`, e.message);
        }

        for (const d of cloudDevices) {
          const serial = d.deviceSerial || d.serialNo;
          const name = d.deviceName || d.name || `Checador Teams ${serial}`;
          if (!serial) continue;

          const existingDisp = db.prepare('SELECT id FROM dispositivos WHERE cloud_serial = ?').get(String(serial)) as any;
          let localDispId: number;

          if (existingDisp) {
            db.prepare(`
              UPDATE dispositivos 
              SET nombre = ?, driver = 'HIKCONNECT_TEAMS', cuenta_hct_id = ?, firmware_version = ?, estado_conexion = ?, activa = 1, ultimo_ping = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              name,
              cuentaId,
              d.version || null,
              d.onlineStatus === 1 ? 'ONLINE' : 'OFFLINE',
              existingDisp.id
            );
            localDispId = existingDisp.id;
          } else {
            const info = db.prepare(`
              INSERT INTO dispositivos (nombre, driver, cuenta_hct_id, cloud_serial, firmware_version, estado_conexion, activa, ultimo_ping)
              VALUES (?, 'HIKCONNECT_TEAMS', ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            `).run(
              name,
              cuentaId,
              String(serial),
              d.version || null,
              d.onlineStatus === 1 ? 'ONLINE' : 'OFFLINE'
            );
            localDispId = Number(info.lastInsertRowid);
          }
          devCount++;

          // 3. Crear o actualizar torniquete vinculado a este dispositivo
          let matchedResourceId: string | null = null;
          for (const [resId, resName] of doorResourceMap.entries()) {
            if (resName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(resName.toLowerCase())) {
              matchedResourceId = resId;
              break;
            }
          }
          if (!matchedResourceId && doorResourceMap.size > 0) {
            matchedResourceId = Array.from(doorResourceMap.keys())[0];
          }

          const existingTorniquete = db.prepare('SELECT id FROM torniquetes WHERE dispositivo_id = ?').get(localDispId) as any;
          let torniqueteId: number;

          if (existingTorniquete) {
            db.prepare(`
              UPDATE torniquetes 
              SET nombre = ?, cloud_resource_id = COALESCE(?, cloud_resource_id), activo = 1 
              WHERE id = ?
            `).run(name, matchedResourceId, existingTorniquete.id);
            torniqueteId = existingTorniquete.id;
          } else {
            const info = db.prepare(`
              INSERT INTO torniquetes (dispositivo_id, canal_relevador, cloud_resource_id, nombre, direccion, ubicacion_area, activo)
              VALUES (?, 1, ?, ?, 'BIDIRECCIONAL', 'Acceso Teams', 1)
            `).run(localDispId, matchedResourceId, name);
            torniqueteId = Number(info.lastInsertRowid);
          }
          torniquetesCount++;

          // Vincular torniquete con los niveles de esta cuenta
          const nivelesDeCuenta = db.prepare('SELECT id FROM niveles_acceso WHERE cuenta_hct_id = ? AND activo = 1').all(cuentaId) as any[];
          for (const n of nivelesDeCuenta) {
            db.prepare('INSERT OR IGNORE INTO nivel_acceso_torniquetes (nivel_id, torniquete_id) VALUES (?, ?)').run(n.id, torniqueteId);
          }
        }

        // Actualizar marca de último sync en la cuenta (formato estricto ISO 8601 UTC)
        db.prepare('UPDATE cuentas_hct SET ultimo_sync = ? WHERE id = ?').run(new Date().toISOString(), cuentaId);
        console.log(`✅ Cuenta [${cuentaNombre}] sincronizada con éxito.`);
      } catch (err: any) {
        console.error(`❌ Error en sincronización de cuenta [${cuentaNombre}]:`, err.message);
      }
    }

    return {
      cuentasSincronizadas: cuentasToSync.length,
      dispositivosImportados: devCount,
      nivelesImportados: lvlCount,
      torniquetesImportados: torniquetesCount,
    };
  }
}
