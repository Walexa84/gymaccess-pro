import { IHardwareDriver, HardwareTestResult, HardwareTimeResult } from './hardwareDriver.js';
import { HikConnectService } from './hikconnect.js';

export class HikConnectTeamsDriver implements IHardwareDriver {
  public readonly modeId = 'HIKCONNECT_TEAMS';

  public getModeName(): string {
    return 'Hik-Connect Teams (Cloud OpenAPI)';
  }

  public async testConnection(): Promise<HardwareTestResult> {
    try {
      await HikConnectService.getAccessToken(undefined, true);
      const devices = await HikConnectService.getDevices();
      const levels = await HikConnectService.getAccessLevels();

      return {
        success: true,
        message: 'Conexión exitosa con HikCentral Connect / Teams Cloud',
        dispositivosEncontrados: devices.length,
        nivelesAcceso: levels,
        dispositivos: devices,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message,
        error: err.message,
      };
    }
  }

  public async addPerson(nombre: string, telefono: string): Promise<string> {
    return HikConnectService.addPerson(nombre, telefono);
  }

  public async uploadPersonPhoto(personId: string, base64Photo: string): Promise<boolean> {
    return HikConnectService.uploadPersonPhoto(personId, base64Photo);
  }

  public async setPersonAccess(personId: string, grantAccess: boolean, specificLevelId?: string, _validEndTime?: string): Promise<boolean> {
    return HikConnectService.setPersonAccess(personId, grantAccess, specificLevelId);
  }

  public async getHardwareTime(): Promise<HardwareTimeResult> {
    // Cloud Teams sincroniza con servidores NTP mundiales
    const now = new Date();
    return {
      localTime: now.toISOString(),
      timeZone: 'UTC',
      epochMs: now.getTime(),
    };
  }

  public async setHardwareTime(_isoTime: string, _timeZone: string): Promise<boolean> {
    // En nube, el tiempo es gobernado por los servidores de Hikvision Cloud
    return true;
  }

  public async remoteControlDoor(doorId: string, controlType: 'open' | 'close' = 'open'): Promise<boolean> {
    const res = await HikConnectService.remoteControlDoor(doorId, controlType === 'open' ? 1 : 2);
    return res.success;
  }

  public async getDevices(): Promise<any[]> {
    return HikConnectService.getDevices();
  }

  public async getAccessLevels(): Promise<any[]> {
    return HikConnectService.getAccessLevels();
  }
}
