/**
 * Interfaz común para abstraer la interacción con hardware de control de acceso y biometría.
 */

export interface HardwareTestResult {
  success: boolean;
  message: string;
  dispositivosEncontrados?: number;
  nivelesAcceso?: any[];
  dispositivos?: any[];
  error?: string;
  modo?: string;
  details?: any;
}

export interface HardwareTimeResult {
  localTime: string;
  timeZone: string;
  epochMs: number;
}

export interface IHardwareDriver {
  readonly modeId: string;
  getModeName(): string;
  testConnection(): Promise<HardwareTestResult>;
  addPerson(nombre: string, telefono: string): Promise<string>;
  uploadPersonPhoto(personId: string, base64Photo: string): Promise<boolean>;
  setPersonAccess(personId: string, grantAccess: boolean, specificLevelId?: string, validEndTime?: string): Promise<boolean>;
  getHardwareTime?(): Promise<HardwareTimeResult>;
  setHardwareTime?(isoTime: string, timeZone: string): Promise<boolean>;
  remoteControlDoor?(doorId?: string, controlType?: 'open' | 'close'): Promise<boolean>;
  getDevices?(): Promise<any[]>;
  getAccessLevels?(): Promise<any[]>;
  syncAccessLevel?(levelId: string, name: string, doors: any[]): Promise<boolean>;
}
