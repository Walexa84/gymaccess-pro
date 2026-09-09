import { db } from '../db/database.js';
import { TelemetryService } from './telemetryService.js';

export interface TokenCache {
  accessToken: string;
  expireTime: number; // timestamp en ms
}

export interface HikConfig {
  id: number;
  nombre: string;
  baseUrl: string;
  appKey: string;
  secretKey: string;
  defaultAccessLevelId: string;
}

export class HikConnectClient {
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
   * Invalida el token en caché para una cuenta (o todas si no se especifica)
   */
  public static invalidateToken(cuentaId?: number) {
    if (cuentaId) {
      this.tokenCache.delete(cuentaId);
    } else {
      this.tokenCache.clear();
    }
  }

  /**
   * Obtiene la configuración de una cuenta HCT específica o la principal
   */
  public static getConfig(cuentaId?: number): HikConfig {
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
}
