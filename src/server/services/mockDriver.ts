import { IHardwareDriver, HardwareTestResult, HardwareTimeResult } from './hardwareDriver.js';

export class MockHardwareDriver implements IHardwareDriver {
  public readonly modeId = 'SIMULADO';
  private simulatedOffsetSeconds = 2; // Ligero desfase inicial para realismo
  private simulatedTimeZone = 'CST+6:00:00';

  public getModeName(): string {
    return 'Modo Simulado / Demostración (Sin Hardware Físico)';
  }

  public async testConnection(): Promise<HardwareTestResult> {
    return {
      success: true,
      message: 'Simulador de hardware activo y respondiendo correctamente (Modo Virtual)',
      dispositivosEncontrados: 2,
      dispositivos: [
        { deviceName: 'Torniquete Virtual Entrada (MinMoe Face)', ip: '127.0.0.1', port: 80, serialNo: 'SIM-FACE-01', status: 'online' },
        { deviceName: 'Torniquete Virtual Salida', ip: '127.0.0.1', port: 80, serialNo: 'SIM-FACE-02', status: 'online' },
      ],
      nivelesAcceso: [
        { id: 'sim_lvl_1', name: 'Acceso Total Torniquetes (Virtual)' },
        { id: 'sim_lvl_2', name: 'Acceso Área VIP (Virtual)' },
      ],
    };
  }

  public async addPerson(_nombre: string, telefono: string): Promise<string> {
    return `sim_${telefono.replace(/\D/g, '').slice(-8) || Date.now().toString().slice(-8)}`;
  }

  public async uploadPersonPhoto(_personId: string, _base64Photo: string): Promise<boolean> {
    return true;
  }

  public async setPersonAccess(personId: string, grantAccess: boolean, specificLevelId?: string, validEndTime?: string): Promise<boolean> {
    console.log(`[Hardware Simulado] Acceso para ${personId}: ${grantAccess ? 'PERMITIDO 🔓' : 'BLOQUEADO 🚫'} | Nivel: ${specificLevelId || 'Default'} | Vence: ${validEndTime || 'Indefinido'}`);
    return true;
  }

  public async getHardwareTime(): Promise<HardwareTimeResult> {
    const now = new Date(Date.now() + this.simulatedOffsetSeconds * 1000);
    return {
      localTime: now.toISOString(),
      timeZone: this.simulatedTimeZone,
      epochMs: now.getTime(),
    };
  }

  public async setHardwareTime(_isoTime: string, timeZone: string = 'CST+6:00:00'): Promise<boolean> {
    this.simulatedOffsetSeconds = 0; // Al sincronizar el desfase cae a 0
    this.simulatedTimeZone = timeZone;
    console.log(`[Hardware Simulado] Reloj sincronizado a 0 segundos de desfase | Zona: ${timeZone}`);
    return true;
  }

  public async remoteControlDoor(doorId: string = '1', controlType: 'open' | 'close' = 'open'): Promise<boolean> {
    console.log(`[Hardware Simulado] Torniquete ${doorId} comando: ${controlType.toUpperCase()}`);
    return true;
  }

  public async getDevices(): Promise<any[]> {
    const test = await this.testConnection();
    return test.dispositivos || [];
  }

  public async getAccessLevels(): Promise<any[]> {
    const test = await this.testConnection();
    return test.nivelesAcceso || [];
  }
}
