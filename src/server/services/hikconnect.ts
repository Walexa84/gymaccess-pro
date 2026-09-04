import { db } from '../db/database.js';

interface TokenCache {
  accessToken: string;
  expireTime: number; // timestamp en ms
}

let cachedToken: TokenCache | null = null;

export class HikConnectService {
  /**
   * Obtiene la configuración actual de hardware desde la BD local
   */
  private static getConfig() {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all() as { clave: string; valor: string }[];
    const configMap = new Map(rows.map(r => [r.clave, r.valor]));

    return {
      baseUrl: configMap.get('hik_base_url') || 'https://ius.hikcentralconnect.com/api',
      appKey: configMap.get('hik_app_key') || '',
      secretKey: configMap.get('hik_secret_key') || '',
      defaultAccessLevelId: configMap.get('hik_access_level_id') || '',
    };
  }

  /**
   * Obtiene o refresca el token de acceso con vigencia de 7 días
   * Cumple con la cabecera personalizada: Token: <accessToken> (NO Bearer)
   */
  public static async getAccessToken(forceNew = false): Promise<string> {
    const { baseUrl, appKey, secretKey } = this.getConfig();

    if (!appKey || !secretKey) {
      throw new Error('Credenciales AK/SK de HikCentral Connect no configuradas');
    }

    const now = Date.now();
    // Reutilizar token si le quedan más de 12 horas de vida
    if (!forceNew && cachedToken && cachedToken.expireTime - now > 12 * 3600 * 1000) {
      return cachedToken.accessToken;
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

    cachedToken = {
      accessToken: result.data.accessToken,
      expireTime: expireTimestamp,
    };

    console.log('🔑 Nuevo AccessToken obtenido de HikCentral Connect');
    return cachedToken.accessToken;
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

    const levelId = specificLevelId || defaultAccessLevelId;
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
  public static async remoteControlDoor(doorId: string, controlType: 'open' | 'close' = 'open'): Promise<boolean> {
    const { baseUrl } = this.getConfig();
    const token = await this.getAccessToken();

    const response = await fetch(`${baseUrl}/hccgw/acs/v1/remote/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({
        doorId,
        controlType,
      }),
    });

    const result = await response.json();
    return result.errorCode === '0';
  }

  /**
   * Consultar lista de terminales y torniquetes
   * POST /api/hccgw/resource/v1/devices/get
   */
  public static async getDevices(): Promise<any[]> {
    const { baseUrl } = this.getConfig();
    const token = await this.getAccessToken();

    const response = await fetch(`${baseUrl}/hccgw/resource/v1/devices/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({
        pageIndex: 1,
        pageSize: 50,
      }),
    });

    const result = await response.json();
    if (result.errorCode !== '0') {
      throw new Error(`Fallo al listar dispositivos (${result.errorCode}): ${result.message}`);
    }

    return result.data?.device || result.data?.list || [];
  }

  /**
   * Consultar niveles de acceso disponibles
   * POST /api/hccgw/acspm/v1/accesslevel/list
   */
  public static async getAccessLevels(): Promise<any[]> {
    const { baseUrl } = this.getConfig();
    const token = await this.getAccessToken();

    const response = await fetch(`${baseUrl}/hccgw/acspm/v1/accesslevel/list`, {
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
      throw new Error(`Fallo al listar niveles de acceso (${result.errorCode}): ${result.message}`);
    }

    return result.data?.accessLevelResponse?.accessLevelList || result.data?.list || [];
  }
}
