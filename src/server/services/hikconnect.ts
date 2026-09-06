import { db } from '../db/database.js';
import { TelemetryService } from './telemetryService.js';

interface TokenCache {
  accessToken: string;
  expireTime: number; // timestamp en ms
}

export class HikConnectService {
  private static tokenCache = new Map<number, TokenCache>();

  public static sanitizeUrl(url?: string): string {
    if (!url) return 'https://ius.hikcentralconnect.com/api';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/1us\.hikcentralconnect\.com/gi, 'ius.hikcentralconnect.com');
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    if (cleaned.endsWith('hikcentralconnect.com')) {
      cleaned = cleaned + '/api';
    }
    return cleaned;
  }

  /**
   * Obtiene la configuración de una cuenta HCT específica o la principal
   */
  public static getConfig(cuentaId?: number) {
    if (cuentaId) {
      const cuenta = db.prepare('SELECT * FROM cuentas_hct WHERE id = ? AND activa = 1').get(cuentaId) as any;
      if (cuenta) {
        return {
          id: cuenta.id,
          nombre: cuenta.nombre,
          baseUrl: this.sanitizeUrl(cuenta.base_url),
          appKey: cuenta.app_key,
          secretKey: cuenta.secret_key,
          defaultAccessLevelId: '',
        };
      }
    }

    // Si no se especificó o no se encontró, tomar la primera cuenta activa en cuentas_hct
    const primeraCuenta = db.prepare('SELECT * FROM cuentas_hct WHERE activa = 1 ORDER BY id ASC LIMIT 1').get() as any;
    if (primeraCuenta) {
      return {
        id: primeraCuenta.id,
        nombre: primeraCuenta.nombre,
        baseUrl: primeraCuenta.base_url || 'https://ius.hikcentralconnect.com/api',
        appKey: primeraCuenta.app_key,
        secretKey: primeraCuenta.secret_key,
        defaultAccessLevelId: '',
      };
    }

    // Fallback a tabla configuracion por compatibilidad
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all() as { clave: string; valor: string }[];
    const configMap = new Map(rows.map(r => [r.clave, r.valor]));

    return {
      id: 1,
      nombre: 'Cuenta Predeterminada',
      baseUrl: configMap.get('hik_base_url') || 'https://ius.hikcentralconnect.com/api',
      appKey: configMap.get('hik_app_key') || '',
      secretKey: configMap.get('hik_secret_key') || '',
      defaultAccessLevelId: configMap.get('hik_access_level_id') || '',
    };
  }

  /**
   * Obtiene o refresca el token de acceso con vigencia de 7 días para la cuenta especificada
   */
  public static async getAccessToken(cuentaId?: number, forceNew = false): Promise<string> {
    const config = this.getConfig(cuentaId);
    const { id, baseUrl, appKey, secretKey } = config;

    if (!appKey || !secretKey) {
      throw new Error(`Credenciales AK/SK no configuradas para la cuenta HCT [${config.nombre}]`);
    }

    const now = Date.now();
    const cached = this.tokenCache.get(id);

    // Reutilizar token si le quedan más de 12 horas de vida
    if (!forceNew && cached && cached.expireTime - now > 12 * 3600 * 1000) {
      return cached.accessToken;
    }

    const url = `${baseUrl}/hccgw/platform/v1/token/get`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appKey, secretKey }),
    });

    const result = await response.json();
    if (result.errorCode !== '0' || !result.data?.accessToken) {
      throw new Error(`Error obteniendo token de HikCentral (${result.errorCode}): ${result.message}`);
    }

    const expireTimestamp = result.data.expireTime
      ? new Date(result.data.expireTime).getTime()
      : now + 7 * 24 * 3600 * 1000;

    this.tokenCache.set(id, {
      accessToken: result.data.accessToken,
      expireTime: expireTimestamp,
    });

    console.log(`🔑 Nuevo AccessToken obtenido para cuenta HCT [${config.nombre}] (ID: ${id})`);
    return result.data.accessToken;
  }

  /**
   * Alta de socio en HikCentral Connect
   * POST /api/hccgw/person/v1/persons/add
   */
  public static async addPerson(personName: string, phoneNo: string): Promise<string> {
    const { baseUrl } = this.getConfig();
    const token = await this.getAccessToken();

    const response = await fetch(`${baseUrl}/hccgw/person/v1/persons/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({
        personName,
        phoneNo,
      }),
    });

    const result = await response.json();
    if (result.errorCode !== '0' || !result.data?.personId) {
      throw new Error(`Fallo al registrar persona en HikCentral (${result.errorCode}): ${result.message}`);
    }

    return result.data.personId;
  }

  /**
   * Carga de fotografía biométrica facial
   * POST /api/hccgw/person/v1/persons/photo
   */
  public static async uploadPersonPhoto(personId: string, base64Photo: string): Promise<boolean> {
    const { baseUrl } = this.getConfig();
    const token = await this.getAccessToken();

    // Limpiar prefijo data:image/... si viene de la webcam
    const cleanBase64 = base64Photo.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch(`${baseUrl}/hccgw/person/v1/persons/photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({
        personId,
        picData: cleanBase64,
      }),
    });

    const result = await response.json();
    if (result.errorCode !== '0') {
      throw new Error(`Fallo al subir foto facial a HikCentral (${result.errorCode}): ${result.message}`);
    }

    return true;
  }

  /**
   * Asignar o revocar nivel de acceso al torniquete
   * POST /api/hccgw/acspm/v1/personaccess/assign
   * Para conceder: accessLevelIds = [accessLevelId]
   * Para revocar: accessLevelIds = []
   */
  public static async setPersonAccess(personId: string, grantAccess: boolean, specificLevelId?: string): Promise<boolean> {
    const { baseUrl, defaultAccessLevelId } = this.getConfig();
    const token = await this.getAccessToken();

    let resolvedLevelId = specificLevelId;
    if (specificLevelId) {
      try {
        const row = db.prepare('SELECT cloud_level_id FROM niveles_acceso WHERE id = ?').get(specificLevelId) as { cloud_level_id: string } | undefined;
        if (row?.cloud_level_id) {
          resolvedLevelId = row.cloud_level_id;
        }
      } catch {
        // Ignorar si no está inicializado o tabla no disponible
      }
    }

    const levelId = resolvedLevelId || defaultAccessLevelId;
    const accessLevelIds = grantAccess && levelId ? [levelId] : [];

    const response = await fetch(`${baseUrl}/hccgw/acspm/v1/personaccess/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({
        personId,
        accessLevelIds,
      }),
    });

    const result = await response.json();
    if (result.errorCode !== '0') {
      throw new Error(`Fallo al actualizar acceso en HikCentral (${result.errorCode}): ${result.message}`);
    }

    return true;
  }

  /**
   * Apertura remota de emergencia / prueba
   * POST /api/hccgw/acs/v1/remote/control
   */
  public static async remoteControlDoor(
    doorOrResourceId: string,
    actionType: 1 | 2 = 1,
    cuentaId?: number
  ): Promise<{ success: boolean; latencyMs: number; errorCode: string; message: string; httpStatus: number }> {
    const config = this.getConfig(cuentaId);
    const start = performance.now();
    let httpStatus = 0;
    let errorCode = 'UNKNOWN';
    let message = '';
    let success = false;

    try {
      const token = await this.getAccessToken(config.id);

      const response = await fetch(`${config.baseUrl}/hccgw/acs/v1/remote/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': token,
        },
        body: JSON.stringify({
          remoteControl: {
            actionType,
            elementlist: [doorOrResourceId],
          },
        }),
        signal: AbortSignal.timeout(7000),
      });

      httpStatus = response.status;
      const result = await response.json();
      errorCode = String(result.errorCode ?? 'UNKNOWN');
      message = result.message || (errorCode === '0' ? 'Operación exitosa' : 'Fallo en controlador Teams');
      success = errorCode === '0';
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
        errorCode = 'TIMEOUT_7S';
        message = 'Tiempo de espera excedido (7s) hacia la nube de Hikvision Teams';
      } else {
        errorCode = 'NETWORK_ERROR';
        message = err.message || 'Error de comunicación de red';
      }
      success = false;
    }

    const latencyMs = Math.round(performance.now() - start);

    TelemetryService.log({
      cuenta_id: config.id,
      cuenta_nombre: config.nombre,
      tipo_accion: 'APERTURA_PUERTA',
      recurso_id: doorOrResourceId,
      recurso_nombre: `Puerta ${doorOrResourceId}`,
      latencia_ms: latencyMs,
      http_status: httpStatus,
      hct_error_code: errorCode,
      hct_message: message,
      exito: success,
    });

    return { success, latencyMs, errorCode, message, httpStatus };
  }

  /**
   * Renombrar dispositivo en Hik-Connect Teams OpenAPI
   * POST /api/hccgw/resource/v1/devices/update
   */
  public static async updateDevice(
    deviceId: string,
    deviceName: string,
    cuentaId?: number
  ): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig(cuentaId);
    try {
      const token = await this.getAccessToken(config.id);
      const res = await fetch(`${config.baseUrl}/hccgw/resource/v1/devices/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Token': token },
        body: JSON.stringify({ deviceId, deviceName }),
        signal: AbortSignal.timeout(7000),
      });
      const data = await res.json();
      const ok = data.errorCode === '0';
      return { success: ok, message: ok ? 'Nombre actualizado en Teams con éxito' : (data.message || `Error Teams: ${data.errorCode}`) };
    } catch (err: any) {
      return { success: false, message: `Error comunicando con Teams: ${err.message}` };
    }
  }

  /**
   * Consultar lista de terminales y torniquetes
   * POST /api/hccgw/resource/v1/devices/get
   */
  public static async getDevices(cuentaId?: number): Promise<any[]> {
    const config = this.getConfig(cuentaId);
    const token = await this.getAccessToken(config.id);
    const start = performance.now();

    try {
      const response = await fetch(`${config.baseUrl}/hccgw/resource/v1/devices/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': token,
        },
        body: JSON.stringify({
          pageIndex: 1,
          pageSize: 50,
        }),
        signal: AbortSignal.timeout(7000),
      });

      const latencyMs = Math.round(performance.now() - start);
      const result = await response.json();
      const ok = result.errorCode === '0';

      TelemetryService.log({
        cuenta_id: config.id,
        cuenta_nombre: config.nombre,
        tipo_accion: 'PING_CONEXION',
        recurso_id: `cuenta_${config.id}`,
        recurso_nombre: config.nombre,
        latencia_ms: latencyMs,
        http_status: response.status,
        hct_error_code: String(result.errorCode || 'UNKNOWN'),
        hct_message: result.message || (ok ? 'Dispositivos consultados con éxito' : 'Error en consulta'),
        exito: ok,
      });

      if (!ok) {
        throw new Error(`Fallo al listar dispositivos de cuenta [${config.nombre}] (${result.errorCode}): ${result.message}`);
      }

      return result.data?.device || result.data?.list || [];
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      TelemetryService.log({
        cuenta_id: config.id,
        cuenta_nombre: config.nombre,
        tipo_accion: 'PING_CONEXION',
        recurso_id: `cuenta_${config.id}`,
        recurso_nombre: config.nombre,
        latencia_ms: latencyMs,
        hct_error_code: err.name === 'TimeoutError' ? 'TIMEOUT_7S' : 'ERROR',
        hct_message: err.message,
        exito: false,
      });
      throw err;
    }
  }

  /**
   * Consultar niveles de acceso disponibles
   * POST /api/hccgw/acspm/v1/accesslevel/list
   */
  public static async getAccessLevels(cuentaId?: number): Promise<any[]> {
    const config = this.getConfig(cuentaId);
    const token = await this.getAccessToken(config.id);

    const response = await fetch(`${config.baseUrl}/hccgw/acspm/v1/accesslevel/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({
        accessLevelSearchRequest: {
          pageIndex: 1,
          pageSize: 50,
        },
      }),
    });

    const result = await response.json();
    if (result.errorCode !== '0') {
      throw new Error(`Fallo al listar niveles de cuenta [${config.nombre}] (${result.errorCode}): ${result.message}`);
    }

    return result.data?.accessLevelResponse?.accessLevelList || result.data?.list || [];
  }

  /**
   * Consultar lista de áreas físicas en Teams
   * POST /api/hccgw/resource/v1/areas/get
   */
  public static async getAreas(cuentaId?: number): Promise<any[]> {
    const config = this.getConfig(cuentaId);
    const token = await this.getAccessToken(config.id);

    const response = await fetch(`${config.baseUrl}/hccgw/resource/v1/areas/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    if (result.errorCode !== '0') {
      throw new Error(`Fallo al listar áreas (${result.errorCode}): ${result.message}`);
    }

    return result.data?.list || result.data?.areaList || [];
  }

  /**
   * Sincroniza e importa todos los recursos de una o todas las cuentas de Hik-Connect Teams a la base SQLite local
   */
  public static async syncResourcesToDatabase(targetCuentaId?: number): Promise<{
    cuentasSincronizadas: number;
    dispositivosImportados: number;
    nivelesImportados: number;
    torniquetesImportados: number;
  }> {
    let cuentasToSync: any[] = [];
    if (targetCuentaId) {
      const c = db.prepare('SELECT * FROM cuentas_hct WHERE id = ? AND activa = 1').get(targetCuentaId);
      if (c) cuentasToSync.push(c);
    } else {
      cuentasToSync = db.prepare('SELECT * FROM cuentas_hct WHERE activa = 1').all();
    }

    if (cuentasToSync.length === 0) {
      // Fallback con la cuenta por defecto si aún no está en cuentas_hct
      const def = this.getConfig();
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
          cloudLevels = await this.getAccessLevels(cuentaId);
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
          cloudDevices = await this.getDevices(cuentaId);
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
          // Buscar si hay un resourceId correspondiente a este dispositivo en doorResourceMap
          let matchedResourceId: string | null = null;
          for (const [resId, resName] of doorResourceMap.entries()) {
            if (resName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(resName.toLowerCase())) {
              matchedResourceId = resId;
              break;
            }
          }
          // Si no coincidió por nombre, usar el primer resourceId disponible o el del dispositivo
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

  // ==========================================================================
  // GESTIÓN CRUD DE CUENTAS HCT
  // ==========================================================================
  public static getCuentasHct() {
    const cuentas = db.prepare(`
      SELECT * FROM cuentas_hct WHERE activa = 1 ORDER BY id ASC
    `).all() as any[];

    return cuentas.map(c => {
      // Equipos vinculados a esta cuenta
      const equipos = db.prepare(`
        SELECT d.id, d.nombre, d.driver, d.cloud_serial, d.firmware_version, 
               d.estado_conexion, d.ultimo_ping, d.creado_en
        FROM dispositivos d
        WHERE d.cuenta_hct_id = ? AND d.activa = 1
        ORDER BY d.id ASC
      `).all(c.id) as any[];

      // Accesos / Puertas de cada equipo
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
    const baseUrl = this.sanitizeUrl(data.base_url);
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

    // Sincronizar de inmediato los recursos (equipos y accesos de Teams)
    try {
      await this.syncResourcesToDatabase(newId);
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
    // Invalidar token en caché para forzar nuevo con las nuevas credenciales
    this.tokenCache.delete(id);
    return db.prepare('SELECT * FROM cuentas_hct WHERE id = ?').get(id);
  }

  public static deleteCuentaHct(id: number) {
    db.prepare('UPDATE cuentas_hct SET activa = 0 WHERE id = ?').run(id);
    this.tokenCache.delete(id);
    return { success: true, message: 'Cuenta HCT desactivada' };
  }
}

