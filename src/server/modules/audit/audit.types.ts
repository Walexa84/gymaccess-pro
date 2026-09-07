export type ModuloAuditoria = 
  | 'ACCESO' 
  | 'POS' 
  | 'MEMBRESIA' 
  | 'IAM' 
  | 'HARDWARE' 
  | 'SEGURIDAD' 
  | 'SISTEMA';

export type AccionAuditoria =
  | 'ACCESO_CONCEDIDO'
  | 'ACCESO_DENEGADO_VENCIDO'
  | 'ACCESO_DENEGADO_DESCONOCIDO'
  | 'ACCESO_DENEGADO_HORARIO'
  | 'APERTURA_MANUAL'
  | 'EMISION_CORTESIA'
  | 'COBRO_MEMBRESIA'
  | 'APERTURA_TURNO'
  | 'CIERRE_TURNO'
  | 'ALTA_PERSONA'
  | 'BAJA_PERSONA'
  | 'SINCRONIZACION_TEAMS'
  | 'CONFIGURACION_MODIFICADA';

export interface AuditEventInput {
  modulo: ModuloAuditoria;
  accion: AccionAuditoria;
  usuarioId?: number;
  usuarioNombre?: string;
  personaId?: number;
  personaNombre?: string;
  recursoId?: string | number;
  detalles?: string;
  resultado?: 'EXITO' | 'FALLO' | 'ADVERTENCIA';
  ip?: string;
  metadata?: Record<string, any>;
}

export interface FiltrosAuditoria {
  modulo?: string;
  accion?: string;
  resultado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  busqueda?: string;
  limit?: number;
  offset?: number;
}
