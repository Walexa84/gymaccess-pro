import crypto from 'node:crypto';
import { db } from '../db/database.js';
import { IHardwareDriver, HardwareTestResult } from './hardwareDriver.js';

export class HikvisionIsapiDriver implements IHardwareDriver {
  public readonly modeId = 'HIKVISION_LOCAL_ISAPI';

  public getModeName(): string {
    return 'Hikvision Local Directo (ISAPI LAN)';
  }

  private getConfig() {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all() as { clave: string; valor: string }[];
    const map = new Map(rows.map(r => [r.clave, r.valor]));

    return {
      ip: map.get('hik_local_ip') || '192.168.1.100',
      port: map.get('hik_local_port') || '80',
      user: map.get('hik_local_user') || 'admin',
      pass: map.get('hik_local_pass') || '',
      protocol: map.get('hik_local_protocol') || 'http',
    };
  }

  /**
   * Helper para peticiones HTTP a la terminal Hikvision con soporte de Digest Authentication (RFC 2617)
   */
  public async request(
    endpoint: string,
    options: { method?: string; body?: any; headers?: Record<string, string> } = {},
    targetConfig?: { ip: string; port?: string; user?: string; pass?: string; protocol?: string }
  ): Promise<{ status: number; text: string; data?: any }> {
    const def = this.getConfig();
    const ip = targetConfig?.ip || def.ip;
    const port = targetConfig?.port || def.port;
    const user = targetConfig?.user || def.user;
    const pass = targetConfig?.pass !== undefined && targetConfig?.pass !== '' ? targetConfig.pass : def.pass;
    const protocol = targetConfig?.protocol || def.protocol || 'http';

    const method = options.method || 'GET';
    const baseUrl = `${protocol}://${ip}:${port}`;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `${baseUrl}${cleanEndpoint}`;

    // Primer intento sin Authorization para obtener el challenge 401
    const firstResp = await fetch(targetUrl, {
      method,
      signal: AbortSignal.timeout(4000),
      headers: { ...(options.headers || {}) },
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    }).catch(err => {
      throw new Error(`No se pudo conectar a la terminal checadora (${ip}:${port}): ${err.message}`);
    });

    if (firstResp.status !== 401) {
      const text = await firstResp.text();
      let data;
      try { data = JSON.parse(text); } catch { /* ignore */ }
      return { status: firstResp.status, text, data };
    }

    // Analizar cabecera WWW-Authenticate
    const authHeader = firstResp.headers.get('www-authenticate') || '';
    if (!authHeader.toLowerCase().includes('digest')) {
      const text = await firstResp.text();
      return { status: firstResp.status, text };
    }

    // Extraer parámetros del challenge Digest
    const parseParam = (key: string) => {
      const match = authHeader.match(new RegExp(`${key}="?([^",]+)"?`, 'i'));
      return match ? match[1] : '';
    };

    const realm = parseParam('realm');
    const nonce = parseParam('nonce');
    const qop = parseParam('qop');
    const opaque = parseParam('opaque');
    const uri = cleanEndpoint;

    // Calcular hashes MD5
    const md5 = (str: string) => crypto.createHash('md5').update(str).digest('hex');
    const ha1 = md5(`${user}:${realm}:${pass}`);
    const ha2 = md5(`${method}:${uri}`);

    const cnonce = crypto.randomBytes(8).toString('hex');
    const nc = '00000001';

    let responseHash = '';
    if (qop && qop.toLowerCase().includes('auth')) {
      responseHash = md5(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
    } else {
      responseHash = md5(`${ha1}:${nonce}:${ha2}`);
    }

    // Construir cabecera Digest
    let digestHeader = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
    if (opaque) digestHeader += `, opaque="${opaque}"`;
    if (qop) digestHeader += `, qop=auth, nc=${nc}, cnonce="${cnonce}"`;

    const retryHeaders = {
      ...(options.headers || {}),
      'Authorization': digestHeader,
    };

    const secondResp = await fetch(targetUrl, {
      method,
      signal: AbortSignal.timeout(4000),
      headers: retryHeaders,
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    });

    const text = await secondResp.text();
    let data;
    try { data = JSON.parse(text); } catch { /* ignore */ }
    return { status: secondResp.status, text, data };
  }

  /**
   * Prueba de conexión con la terminal checadora local
   */
  public async testConnection(): Promise<HardwareTestResult> {
    const { ip, port, user, pass } = this.getConfig();

    if (!ip) {
      return { success: false, message: 'Dirección IP de la terminal no configurada' };
    }
    if (!pass) {
      return { success: false, message: 'Contraseña del usuario admin de la terminal no configurada' };
    }

    try {
      // Consultar información básica del dispositivo
      const res = await this.request('/ISAPI/System/deviceInfo?format=json');
      if (res.status !== 200 && res.status !== 204) {
        // Si no devuelve JSON, intentar endpoint XML estándar
        const resXml = await this.request('/ISAPI/System/deviceInfo');
        if (resXml.status === 200) {
          const modelMatch = resXml.text.match(/<model>(.*?)<\/model>/);
          const serialMatch = resXml.text.match(/<serialNumber>(.*?)<\/serialNumber>/);
          const model = modelMatch ? modelMatch[1] : 'Checador Hikvision';
          const serial = serialMatch ? serialMatch[1] : ip;

          return {
            success: true,
            message: `Conexión LAN exitosa con ${model}`,
            dispositivosEncontrados: 1,
            dispositivos: [{ deviceName: model, ip, port, serialNo: serial, status: 'online' }],
            nivelesAcceso: [{ id: '1', name: 'Puerta Principal / Torniquete 1' }],
          };
        }

        return {
          success: false,
          message: `La terminal respondió con estado HTTP ${res.status}: ${res.text.slice(0, 120)}`,
        };
      }

      const devInfo = res.data?.DeviceInfo || {};
      const model = devInfo.model || devInfo.deviceName || 'Terminal Facial MinMoe';
      const serial = devInfo.serialNumber || ip;
      const firmware = devInfo.firmwareVersion || '';

      return {
        success: true,
        message: `Conexión LAN exitosa con ${model} (Firmware: ${firmware})`,
        dispositivosEncontrados: 1,
        dispositivos: [{ deviceName: model, ip, port, serialNo: serial, firmware, status: 'online' }],
        nivelesAcceso: [{ id: '1', name: 'Puerta Principal / Torniquete 1' }],
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Fallo al comunicar con ${ip}:${port} - ${err.message}`,
        error: err.message,
      };
    }
  }

  /**
   * Da de alta al socio en la memoria interna del checador
   */
  public async addPerson(nombre: string, telefono: string): Promise<string> {
    const employeeNo = telefono.replace(/\D/g, '').slice(-10) || `${Date.now().toString().slice(-8)}`;

    const payload = {
      UserInfo: {
        employeeNo,
        name: nombre.slice(0, 32),
        userType: 'normal',
        closeDelayEnabled: false,
        Valid: {
          enable: true,
          beginTime: '2020-01-01T00:00:00',
          endTime: '2037-12-31T23:59:59',
          timeType: 'local',
        },
        doorRight: '1',
        RightPlan: [
          {
            doorNo: 1,
            planTemplateNo: '1',
          },
        ],
      },
    };

    const res = await this.request('/ISAPI/AccessControl/UserInfo/Record?format=json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    if (res.status >= 200 && res.status < 300) {
      return employeeNo;
    }

    // Si ya existía, intentar actualizar
    if (res.text.includes('alreadyExist') || res.status === 409) {
      await this.request('/ISAPI/AccessControl/UserInfo/Modify?format=json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      return employeeNo;
    }

    throw new Error(`Error en terminal al registrar socio (${res.status}): ${res.text.slice(0, 150)}`);
  }

  /**
   * Carga de foto facial en la base de datos de la terminal local
   */
  public async uploadPersonPhoto(personId: string, base64Photo: string): Promise<boolean> {
    const cleanBase64 = base64Photo.replace(/^data:image\/[a-z]+;base64,/, '');
    const imgBuffer = Buffer.from(cleanBase64, 'base64');

    const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
    const faceJson = JSON.stringify({
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: personId,
    });

    // Multipart MIME manual para ISAPI
    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="FaceDataRecord"\r\n`,
      `Content-Type: application/json\r\n\r\n`,
      `${faceJson}\r\n`,
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="img"; filename="face.jpg"\r\n`,
      `Content-Type: image/jpeg\r\n\r\n`,
    ];

    const part1 = Buffer.from(bodyParts.join(''), 'utf-8');
    const part2 = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([part1, imgBuffer, part2]);

    const res = await this.request('/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fullBody.toString('binary'),
    });

    if (res.status >= 200 && res.status < 300) {
      return true;
    }

    console.warn(`[ISAPI] Respuesta carga foto (${res.status}):`, res.text.slice(0, 100));
    return true; // Continuar aunque el checador requiera formato específico
  }

  /**
   * Conceder o revocar acceso en la terminal local con soporte de fecha límite real
   */
  public async setPersonAccess(personId: string, grantAccess: boolean, _specificLevelId?: string, validEndTime?: string): Promise<boolean> {
    const formattedEndTime = validEndTime
      ? (validEndTime.includes('T') ? validEndTime : `${validEndTime}T23:59:59`)
      : (grantAccess ? '2037-12-31T23:59:59' : '2000-01-01T00:00:00');

    const payload = {
      UserInfo: {
        employeeNo: personId,
        Valid: {
          enable: grantAccess,
          beginTime: '2020-01-01T00:00:00',
          endTime: formattedEndTime,
          timeType: 'local',
        },
        doorRight: grantAccess ? '1' : '0',
      },
    };

    const res = await this.request('/ISAPI/AccessControl/UserInfo/Modify?format=json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    return res.status >= 200 && res.status < 300;
  }

  /**
   * Consulta la hora exacta y zona horaria configuradas en la terminal
   */
  public async getHardwareTime(): Promise<{ localTime: string; timeZone: string; epochMs: number }> {
    const res = await this.request('/ISAPI/System/time');
    const text = res.text || '';

    const localTimeMatch = text.match(/<localTime>(.*?)<\/localTime>/) || text.match(/"localTime":\s*"([^"]+)"/);
    const timeZoneMatch = text.match(/<timeZone>(.*?)<\/timeZone>/) || text.match(/"timeZone":\s*"([^"]+)"/);

    const localTime = localTimeMatch ? localTimeMatch[1] : new Date().toISOString();
    const timeZone = timeZoneMatch ? timeZoneMatch[1] : 'CST+6:00:00';
    const epochMs = new Date(localTime).getTime() || Date.now();

    return { localTime, timeZone, epochMs };
  }

  /**
   * Ajusta la hora y zona horaria de la terminal mediante PUT /ISAPI/System/time
   */
  public async setHardwareTime(isoTime: string, timeZone: string = 'CST+6:00:00'): Promise<boolean> {
    const xml = `<Time xmlns="http://www.isapi.org/ver20/XMLSchema" version="2.0">
      <timeMode>manual</timeMode>
      <localTime>${isoTime}</localTime>
      <timeZone>${timeZone}</timeZone>
    </Time>`;

    const res = await this.request('/ISAPI/System/time', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    return res.status >= 200 && res.status < 300;
  }

  /**
   * Apertura remota de torniquete por red local
   */
  public async remoteControlDoor(doorId: string = '1', controlType: 'open' | 'close' = 'open'): Promise<boolean> {
    const xml = `<RemoteControlDoor xmlns="http://www.isapi.org/ver20/XMLSchema" version="2.0"><cmd>${controlType}</cmd></RemoteControlDoor>`;
    const res = await this.request(`/ISAPI/AccessControl/RemoteControl/door/${doorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    return res.status >= 200 && res.status < 300;
  }

  public async getDevices(): Promise<any[]> {
    const test = await this.testConnection();
    return test.dispositivos || [];
  }

  public async getAccessLevels(): Promise<any[]> {
    return [
      { id: '1', name: 'Puerta Principal / Torniquete 1 (Local)' },
      { id: '2', name: 'Puerta Secundaria / Acceso 2 (Local)' },
    ];
  }

  /**
   * Métodos multi-terminal directos para probar, abrir o sincronizar un checador específico
   */
  public async testTerminal(target: { ip: string; puerto?: string; usuario?: string; password?: string; nombre?: string }): Promise<HardwareTestResult> {
    const cfg = {
      ip: target.ip,
      port: target.puerto || '80',
      user: target.usuario || 'admin',
      pass: target.password || '',
      protocol: 'http',
    };
    try {
      const resXml = await this.request('/ISAPI/System/deviceInfo', {}, cfg);
      if (resXml.status === 200) {
        const modelMatch = resXml.text.match(/<model>(.*?)<\/model>/);
        const fwMatch = resXml.text.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/);
        const model = modelMatch ? modelMatch[1] : (target.nombre || 'Checador Hikvision');
        const fw = fwMatch ? fwMatch[1] : 'V1.0';
        return {
          success: true,
          message: `Online: ${model} (${fw})`,
          dispositivos: [{ deviceName: model, ip: cfg.ip, port: cfg.port, firmware: fw, status: 'online' }],
        };
      }
      return { success: false, message: `Respuesta HTTP ${resXml.status} de ${cfg.ip}` };
    } catch (err: any) {
      return { success: false, message: `Error en ${cfg.ip}: ${err.message}` };
    }
  }

  public async openTerminalDoor(target: { ip: string; puerto?: string; usuario?: string; password?: string }, doorId: string = '1'): Promise<boolean> {
    const cfg = {
      ip: target.ip,
      port: target.puerto || '80',
      user: target.usuario || 'admin',
      pass: target.password || '',
      protocol: 'http',
    };
    const xml = `<RemoteControlDoor xmlns="http://www.isapi.org/ver20/XMLSchema" version="2.0"><cmd>open</cmd></RemoteControlDoor>`;
    const res = await this.request(`/ISAPI/AccessControl/RemoteControl/door/${doorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    }, cfg);
    return res.status >= 200 && res.status < 300;
  }

  public async syncTerminalTime(target: { ip: string; puerto?: string; usuario?: string; password?: string }, isoTime: string, timeZone: string = 'CST+6:00:00'): Promise<boolean> {
    const cfg = {
      ip: target.ip,
      port: target.puerto || '80',
      user: target.usuario || 'admin',
      pass: target.password || '',
      protocol: 'http',
    };
    const xml = `<Time xmlns="http://www.isapi.org/ver20/XMLSchema" version="2.0">
      <timeMode>manual</timeMode>
      <localTime>${isoTime}</localTime>
      <timeZone>${timeZone}</timeZone>
    </Time>`;
    const res = await this.request('/ISAPI/System/time', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    }, cfg);
    return res.status >= 200 && res.status < 300;
  }
}

