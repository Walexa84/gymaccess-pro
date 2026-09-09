-- ============================================================================
-- ESQUEMA RELACIONAL MODULAR: GYMACCESS PRO (ACCESSCORE & GYM POS)
-- ============================================================================
PRAGMA foreign_keys = ON;

-- Configuración general del sistema
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- Operadores y administradores
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT CHECK(rol IN ('ADMIN', 'RECEPCION')) NOT NULL,
  activo INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 1. NÚCLEO DE IDENTIDAD (IAM CORE - DIRECTORIO CENTRAL DE PERSONAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL, -- Identificador único legible (ej. PER-1001)
  nombre TEXT NOT NULL,
  apellidos TEXT DEFAULT '',
  telefono TEXT,
  email TEXT,
  foto_url TEXT,
  tipo TEXT CHECK(tipo IN ('SOCIO', 'EMPLEADO', 'VISITANTE', 'PROVEEDOR')) DEFAULT 'SOCIO',
  notas TEXT,
  hik_person_id TEXT UNIQUE, -- Mapeo opcional a Cloud Teams si aplica
  activo INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_telefono_unique ON personas(telefono) WHERE telefono IS NOT NULL AND telefono != '';

CREATE TABLE IF NOT EXISTS credenciales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tipo TEXT CHECK(tipo IN ('FACIAL', 'TARJETA_RFID', 'PIN', 'QR')) NOT NULL,
  valor TEXT NOT NULL,
  activa INTEGER DEFAULT 1,
  fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. MOTOR DE CONTROL DE ACCESO FÍSICO (ACCESSCORE)
-- ============================================================================

-- Cuentas Multi-Sucursal / Organizaciones Hik-Connect Teams (Cloud OpenAPI)
CREATE TABLE IF NOT EXISTS cuentas_hct (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL, -- ej. 'Sucursal Araucarias', 'Sucursal Centro'
  app_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  base_url TEXT DEFAULT 'https://ius.hikcentralconnect.com/api',
  activa INTEGER DEFAULT 1,
  ultimo_sync DATETIME,
  notas TEXT,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispositivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuenta_hct_id INTEGER REFERENCES cuentas_hct(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  driver TEXT CHECK(driver IN ('HIKVISION_LOCAL_ISAPI', 'HIKCONNECT_TEAMS', 'HIKCENTRAL_PRO', 'SIMULADO')) DEFAULT 'HIKVISION_LOCAL_ISAPI',
  ip TEXT,
  puerto TEXT DEFAULT '80',
  usuario TEXT DEFAULT 'admin',
  password TEXT DEFAULT '',
  cloud_serial TEXT,
  firmware_version TEXT,
  estado_conexion TEXT CHECK(estado_conexion IN ('ONLINE', 'OFFLINE', 'ERROR')) DEFAULT 'OFFLINE',
  ultimo_ping DATETIME,
  activa INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS torniquetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo_id INTEGER REFERENCES dispositivos(id) ON DELETE CASCADE,
  canal_relevador INTEGER DEFAULT 1,
  cloud_resource_id TEXT, -- Resource ID en Teams o Canal ISAPI
  nombre TEXT NOT NULL,
  direccion TEXT CHECK(direccion IN ('ENTRADA', 'SALIDA', 'BIDIRECCIONAL')) NOT NULL DEFAULT 'ENTRADA',
  ubicacion_area TEXT DEFAULT 'Recepción Principal',
  tiempo_apertura_seg INTEGER DEFAULT 3,
  activo INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS horarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  isapi_template_no INTEGER DEFAULT 1,
  dias_semana TEXT DEFAULT 'L,M,X,J,V,S,D',
  hora_inicio TEXT DEFAULT '06:00',
  hora_fin TEXT DEFAULT '23:00',
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS niveles_acceso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cuenta_hct_id INTEGER REFERENCES cuentas_hct(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  cloud_level_id TEXT,
  es_staff INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS nivel_acceso_torniquetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nivel_id INTEGER NOT NULL REFERENCES niveles_acceso(id) ON DELETE CASCADE,
  torniquete_id INTEGER NOT NULL REFERENCES torniquetes(id) ON DELETE CASCADE,
  horario_id INTEGER REFERENCES horarios(id) ON DELETE SET NULL,
  UNIQUE(nivel_id, torniquete_id)
);

CREATE TABLE IF NOT EXISTS persona_autorizaciones_acceso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  nivel_id INTEGER NOT NULL REFERENCES niveles_acceso(id) ON DELETE CASCADE,
  fecha_inicio DATETIME NOT NULL,
  fecha_fin DATETIME NOT NULL, -- Fecha límite programada en el checador
  estado_sincronizacion TEXT CHECK(estado_sincronizacion IN ('SINCRONIZADO', 'PENDIENTE', 'ERROR')) DEFAULT 'PENDIENTE',
  ultimo_error TEXT,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(persona_id, nivel_id)
);

CREATE TABLE IF NOT EXISTS persona_cuentas_hct (
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  cuenta_hct_id INTEGER NOT NULL REFERENCES cuentas_hct(id) ON DELETE CASCADE,
  cloud_person_id TEXT NOT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (persona_id, cuenta_hct_id)
);

CREATE TABLE IF NOT EXISTS eventos_acceso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo_id INTEGER REFERENCES dispositivos(id) ON DELETE SET NULL,
  torniquete_id INTEGER REFERENCES torniquetes(id) ON DELETE SET NULL,
  persona_id INTEGER REFERENCES personas(id) ON DELETE SET NULL,
  persona_nombre TEXT,
  persona_foto TEXT,
  tipo_evento TEXT CHECK(tipo_evento IN ('CONCEDIDO', 'DENEGADO_VENCIDO', 'DENEGADO_HORARIO', 'DENEGADO_DESCONOCIDO', 'APERTURA_MANUAL', 'ERROR')) NOT NULL,
  direccion TEXT CHECK(direccion IN ('ENTRADA', 'SALIDA', 'DESCONOCIDA')),
  metodo_autenticacion TEXT CHECK(metodo_autenticacion IN ('FACIAL', 'TARJETA', 'PIN', 'REMOTO_SOFTWARE')) DEFAULT 'FACIAL',
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  foto_evento_url TEXT
);

-- ============================================================================
-- 3. VERTICAL DE NEGOCIO: PUNTO DE VENTA Y GIMNASIO (GYM POS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gym_planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  duracion_dias INTEGER NOT NULL,
  precio REAL NOT NULL,
  nivel_acceso_id INTEGER REFERENCES niveles_acceso(id) ON DELETE SET NULL,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS gym_plan_niveles (
  plan_id INTEGER NOT NULL REFERENCES gym_planes(id) ON DELETE CASCADE,
  nivel_id INTEGER NOT NULL REFERENCES niveles_acceso(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, nivel_id)
);

CREATE TABLE IF NOT EXISTS gym_membresias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES gym_planes(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estatus TEXT CHECK(estatus IN ('VIGENTE', 'VENCIDA', 'CANCELADA')) DEFAULT 'VIGENTE',
  activa INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  membresia_id INTEGER REFERENCES gym_membresias(id) ON DELETE SET NULL,
  plan_id INTEGER NOT NULL REFERENCES gym_planes(id),
  monto REAL NOT NULL,
  metodo_pago TEXT CHECK(metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')) NOT NULL,
  cajero_usuario_id INTEGER REFERENCES usuarios(id),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_caja_turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cajero_usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  fondo_inicial REAL DEFAULT 0,
  total_efectivo_sistema REAL DEFAULT 0,
  total_efectivo_declarado REAL,
  diferencia REAL,
  fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre DATETIME,
  estado TEXT CHECK(estado IN ('ABIERTO', 'CERRADO')) DEFAULT 'ABIERTO'
);

-- ============================================================================
-- ÍNDICES PARA CONSULTAS DE ALTA FRECUENCIA
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_personas_telefono ON personas(telefono);
CREATE INDEX IF NOT EXISTS idx_personas_codigo ON personas(codigo);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos_acceso(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_gym_membresias_vigencia ON gym_membresias(persona_id, activa, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_autorizaciones_sync ON persona_autorizaciones_acceso(estado_sincronizacion);
CREATE INDEX IF NOT EXISTS idx_torniquetes_dispositivo ON torniquetes(dispositivo_id);

-- ============================================================================
-- TELEMETRÍA Y BITÁCORA DE HARDWARE
-- ============================================================================
CREATE TABLE IF NOT EXISTS telemetria_hardware (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_hora TEXT NOT NULL,
  cuenta_id INTEGER,
  cuenta_nombre TEXT,
  tipo_accion TEXT NOT NULL,
  recurso_id TEXT,
  recurso_nombre TEXT,
  latencia_ms INTEGER NOT NULL,
  http_status INTEGER,
  hct_error_code TEXT,
  hct_message TEXT,
  exito INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetria_fecha ON telemetria_hardware(fecha_hora DESC);

-- ============================================================================
-- SUCURSALES Y AGRUPACIÓN DE ACCESOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS sucursales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  activa INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sucursal_dispositivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  dispositivo_id INTEGER NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sucursal_id, dispositivo_id)
);

CREATE TABLE IF NOT EXISTS gym_plan_sucursales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES gym_planes(id) ON DELETE CASCADE,
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  UNIQUE(plan_id, sucursal_id)
);

CREATE INDEX IF NOT EXISTS idx_sucursal_disp ON sucursal_dispositivos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_plan_sucursal ON gym_plan_sucursales(plan_id);

-- ============================================================================
-- BITÁCORA Y AUDITORÍA INDEPENDIENTE DEL SISTEMA (CLEAN ARCHITECTURE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS eventos_auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modulo TEXT NOT NULL,
  accion TEXT NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  persona_id INTEGER REFERENCES personas(id) ON DELETE SET NULL,
  persona_nombre TEXT,
  recurso_id TEXT,
  detalles TEXT,
  resultado TEXT CHECK(resultado IN ('EXITO', 'FALLO', 'ADVERTENCIA')) DEFAULT 'EXITO',
  ip TEXT,
  metadata_json TEXT,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON eventos_auditoria(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON eventos_auditoria(modulo, accion);

