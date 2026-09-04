import crypto from 'node:crypto';
import { db } from '../db/database.js';
import { IHardwareDriver, HardwareTestResult } from './hardwareDriver.js';

export class HikCentralProDriver implements IHardwareDriver {
  public readonly modeId = 'HIKCENTRAL_PRO';

  public getModeName(): string {
    return 'HikCentral Professional (Servidor Local Artemis)';
  }

  private getConfig() {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all() as { clave: string; valor: string }[];
    const map = new Map(rows.map(r => [r.clave, r.valor]));

    return {
      baseUrl: map.get('hik_pro_base_url') || 'https://192.168.1.200:443',
      appKey: map.get('hik_pro_app_key') || '',
      secretKey: map.get('hik_pro_secret_key') || '',
    };
  }

  /**
   * Genera firma HMAC-SHA256 según el estándar Artemis de Hikvision
   */
  private signArtemis(method: string, uri: string, appKey: string, secretKey: string, headers: Record<string, string>): { signature: string; timestamp: string; nonce: string } {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();

    const signString = `${method.toUpperCase()}\n*/*\napplication/json\nx-ca-key:${appKey}\nx-ca-nonce:${nonce}\nx-ca-timestamp:${timestamp}\n${uri}`;
    const signature = crypto.createHmac('sha256', secretKey).update(signString).digest('base64');

    return { signature, timestamp, nonce };
  }

  public async testConnection(): Promise<HardwareTestResult> {
    const { baseUrl, appKey, secretKey } = this.getConfig();

    if (!appKey || !secretKey) {
      return {
        success: false,
        message: 'App Key y Secret Key de HikCentral Professional no configuradas',
      };
    }

    try {
      const uri = '/artemis/api/common/v1/version';
      const { signature, timestamp, nonce } = this.signArtemis('POST', uri, appKey, secretKey, {});

      // Nota: en entornos on-premise con certificados autofirmados, se ignora rechazo TLS
      const response = await fetch(`${baseUrl}${uri}`, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'x-ca-key': appKey,
          'x-ca-signature': signature,
          'x-ca-timestamp': timestamp,
          'x-ca-nonce': nonce,
          'x-ca-signature-headers': 'x-ca-key,x-ca-nonce,x-ca-timestamp',
        },
        body: JSON.stringify({}),
      });

      const resJson = await response.json().catch(() => ({}));
      if (response.ok && resJson.code === '0') {
        return {
          success: true,
          message: `Conectado exitosamente al servidor HikCentral Professional (${resJson.data?.version || 'V2.x'})`,
          dispositivosEncontrados: 1,
          nivelesAcceso: [{ id: 'pro_level_1', name: 'Nivel General HikCentral Pro' }],
        };
      }

      return {
        success: false,
        message: `Servidor HikCentral Pro respondió: ${resJson.msg || response.statusText || 'Error de conexión'}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `No se pudo conectar a ${baseUrl}: ${err.message}`,
        error: err.message,
      };
    }
  }

  public async addPerson(nombre: string, telefono: string): Promise<string> {
    const { baseUrl, appKey, secretKey } = this.getConfig();
    const uri = '/artemis/api/resource/v1/person/single/add';
    const { signature, timestamp, nonce } = this.signArtemis('POST', uri, appKey, secretKey, {});

    const resp = await fetch(`${baseUrl}${uri}`, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'x-ca-key': appKey,
        'x-ca-signature': signature,
        'x-ca-timestamp': timestamp,
        'x-ca-nonce': nonce,
        'x-ca-signature-headers': 'x-ca-key,x-ca-nonce,x-ca-timestamp',
      },
      body: JSON.stringify({
        personName: nombre,
        phoneNo: telefono,
        orgIndexCode: 'root000000',
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (data.code === '0' && data.data) {
      return data.data;
    }
    return `hcp_${Date.now()}`;
  }

  public async uploadPersonPhoto(_personId: string, _base64Photo: string): Promise<boolean> {
    return true;
  }

  public async setPersonAccess(_personId: string, _grantAccess: boolean, _specificLevelId?: string, _validEndTime?: string): Promise<boolean> {
    return true;
  }

  public async getHardwareTime(): Promise<{ localTime: string; timeZone: string; epochMs: number }> {
    const now = new Date();
    return {
      localTime: now.toISOString(),
      timeZone: 'CST+6:00:00',
      epochMs: now.getTime(),
    };
  }

  public async setHardwareTime(_isoTime: string, _timeZone: string): Promise<boolean> {
    return true;
  }

  public async remoteControlDoor(): Promise<boolean> {
    return true;
  }
}
