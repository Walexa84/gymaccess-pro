-- Esquema Relacional de GymAccess Pro
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT CHECK(rol IN ('ADMIN', 'RECEPCION')) NOT NULL,
  activo INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================
-- TOPOLOGÍA DE CONTROL DE ACCESO (ÁREAS, TERMINALES, HORARIOS)
-- =======================================================

CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS terminales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  ip TEXT,
  puerto TEXT DEFAULT '80',
  usuario TEXT DEFAULT 'admin',
  password TEXT,
  direccion TEXT CHECK(direccion IN ('ENTRADA', 'SALIDA', 'BIDIRECCIONAL')) DEFAULT 'ENTRADA',
  tipo_driver TEXT DEFAULT 'HIKVISION_LOCAL_ISAPI',
  cloud_device_serial TEXT,
  activa INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS horarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  hora_inicio TEXT DEFAULT '06:00',
  hora_fin TEXT DEFAULT '23:00',
  dias_semana TEXT DEFAULT 'L,M,X,J,V,S,D',
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS niveles_acceso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  cloud_level_id TEXT,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS nivel_acceso_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nivel_id INTEGER NOT NULL REFERENCES niveles_acceso(id) ON DELETE CASCADE,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  horario_id INTEGER REFERENCES horarios(id) ON DELETE SET NULL
);

-- =======================================================
-- MEMBRESÍAS, SOCIOS Y COBROS
-- =======================================================

CREATE TABLE IF NOT EXISTS planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  duracion_dias INTEGER NOT NULL,
  precio REAL NOT NULL,
  nivel_acceso_id INTEGER REFERENCES niveles_acceso(id) ON DELETE SET NULL,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS socios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT UNIQUE NOT NULL,
  email TEXT,
  foto_path TEXT,
  hik_person_id TEXT UNIQUE,
  estatus TEXT CHECK(estatus IN ('VIGENTE', 'VENCIDO', 'INACTIVO')) DEFAULT 'VENCIDO',
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membresias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES planes(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activa INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,
  socio_id INTEGER NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES planes(id),
  monto REAL NOT NULL,
  metodo_pago TEXT CHECK(metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')) NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accesos_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  socio_id INTEGER REFERENCES socios(id) ON DELETE SET NULL,
  socio_nombre TEXT,
  foto_url TEXT,
  tipo_evento TEXT NOT NULL, -- 'CONCEDIDO', 'DENEGADO_VENCIDO', 'ERROR'
  terminal_id INTEGER REFERENCES terminales(id) ON DELETE SET NULL,
  terminal_nombre TEXT,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas ultra rápidas en recepción
CREATE INDEX IF NOT EXISTS idx_socios_telefono ON socios(telefono);
CREATE INDEX IF NOT EXISTS idx_socios_estatus ON socios(estatus);
CREATE INDEX IF NOT EXISTS idx_membresias_vigencia ON membresias(socio_id, activa, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_accesos_log_fecha ON accesos_log(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_terminales_area ON terminales(area_id);
CREATE INDEX IF NOT EXISTS idx_nivel_areas ON nivel_acceso_areas(nivel_id, area_id);
