import { db } from '../db/database.js';
import { IHardwareDriver, HardwareTestResult } from './hardwareDriver.js';
import { HikConnectTeamsDriver } from './hikconnectDriver.js';
import { HikvisionIsapiDriver } from './hikvisionIsapi.js';
import { HikCentralProDriver } from './hikcentralProDriver.js';

export class HardwareManager {
  private static drivers: Map<string, IHardwareDriver> = new Map<string, IHardwareDriver>([
    ['HIKCONNECT_TEAMS', new HikConnectTeamsDriver()],
    ['HIKVISION_LOCAL_ISAPI', new HikvisionIsapiDriver()],
    ['HIKCENTRAL_PRO', new HikCentralProDriver()],
  ]);

  /**
   * Obtiene el modo de hardware activo configurado en SQLite
   */
  public static getActiveMode(): string {
    try {
      const row = db.prepare(`SELECT valor FROM configuracion WHERE clave = 'hardware_mode'`).get() as { valor: string } | undefined;
      return row?.valor || 'HIKCONNECT_TEAMS';
    } catch {
      return 'HIKCONNECT_TEAMS';
    }
  }

  /**
   * Cambia el modo activo de hardware
   */
  public static setActiveMode(mode: string): void {
    if (!this.drivers.has(mode)) {
      throw new Error(`Modo de hardware no válido: ${mode}`);
    }
    db.prepare(`INSERT OR REPLACE INTO configuracion (clave, valor) VALUES ('hardware_mode', ?)`).run(mode);
    console.log(`🔀 Modo de hardware cambiado a: ${mode}`);
  }

  /**
   * Retorna la instancia del driver activo
   */
  public static getDriver(mode?: string): IHardwareDriver {
    const targetMode = mode || this.getActiveMode();
    const driver = this.drivers.get(targetMode);
    if (!driver) {
      return this.drivers.get('HIKCONNECT_TEAMS')!;
    }
    return driver;
  }

  /**
   * Probar conexión con el driver actual o uno específico
   */
  public static async testConnection(mode?: string): Promise<HardwareTestResult> {
    const driver = this.getDriver(mode);
    const result = await driver.testConnection();
    result.modo = driver.modeId;
    return result;
  }

  public static async addPerson(nombre: string, telefono: string): Promise<string> {
    const driver = this.getDriver();
    return driver.addPerson(nombre, telefono);
  }

  public static async uploadPersonPhoto(personId: string, base64Photo: string): Promise<boolean> {
    const driver = this.getDriver();
    return driver.uploadPersonPhoto(personId, base64Photo);
  }

  public static async setPersonAccess(personId: string, grantAccess: boolean, specificLevelId?: string, validEndTime?: string): Promise<boolean> {
    const driver = this.getDriver();
    return driver.setPersonAccess(personId, grantAccess, specificLevelId, validEndTime);
  }

  /**
   * Consulta la hora del checador y calcula el desfase respecto al servidor
   */
  public static async getHardwareTime(): Promise<{ localTime: string; timeZone: string; epochMs: number; driftSeconds: number; isSynced: boolean }> {
    const driver = this.getDriver();
    if (driver.getHardwareTime) {
      const time = await driver.getHardwareTime();
      const driftSeconds = Math.round(Math.abs(Date.now() - time.epochMs) / 1000);
      return {
        ...time,
        driftSeconds,
        isSynced: driftSeconds < 30,
      };
    }

    const now = Date.now();
    return {
      localTime: new Date(now).toISOString(),
      timeZone: 'CST+6:00:00',
      epochMs: now,
      driftSeconds: 0,
      isSynced: true,
    };
  }

  /**
   * Sincroniza el reloj de la terminal con la hora del sistema
   */
  public static async syncHardwareTime(timeZoneName?: string): Promise<boolean> {
    const driver = this.getDriver();
    if (!driver.setHardwareTime) return true;

    // Obtener zona horaria de SQLite
    const row = db.prepare(`SELECT valor FROM configuracion WHERE clave = 'gym_timezone'`).get() as { valor: string } | undefined;
    const tz = timeZoneName || row?.valor || 'America/Mexico_City';

    // Generar formato ISO en la zona indicada
    const now = new Date();
    const isoString = now.toISOString().replace('Z', '-06:00');
    return driver.setHardwareTime(isoString, 'CST+6:00:00');
  }

  public static async remoteControlDoor(doorId: string = '1', controlType: 'open' | 'close' = 'open'): Promise<boolean> {
    const driver = this.getDriver();
    if (driver.remoteControlDoor) {
      return driver.remoteControlDoor(doorId, controlType);
    }
    return true;
  }

  public static async getDevices(): Promise<any[]> {
    const driver = this.getDriver();
    if (driver.getDevices) {
      return driver.getDevices();
    }
    return [];
  }

  public static async getAccessLevels(): Promise<any[]> {
    const driver = this.getDriver();
    if (driver.getAccessLevels) {
      return driver.getAccessLevels();
    }
    return [];
  }
}
