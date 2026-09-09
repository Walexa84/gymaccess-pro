import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'gym.db');

// Asegurar existencia de carpeta data
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export let db = new DatabaseSync(DB_PATH);

// Configuración de SQLite: WAL Mode y Foreign Keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');

/**
 * Restaura la base de datos atómicamente a partir de un archivo .db de respaldo
 */
export function restoreDatabaseFromBackup(backupFilePath: string): void {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`El archivo de respaldo no existe: ${backupFilePath}`);
  }

  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (e) {
    console.warn('Advertencia en wal_checkpoint:', e);
  }

  // Cerrar conexión activa para liberar handles de archivos en Windows
  db.close();

  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  if (fs.existsSync(walPath)) {
    try { fs.unlinkSync(walPath); } catch {}
  }
  if (fs.existsSync(shmPath)) {
    try { fs.unlinkSync(shmPath); } catch {}
  }

  // Copiar archivo de respaldo sobre la base de datos viva
  fs.copyFileSync(backupFilePath, DB_PATH);

  // Reinstanciar la conexión SQLite con su configuración de resiliencia
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA synchronous = NORMAL;');

  console.log(`✅ Base de datos restaurada atómicamente desde ${backupFilePath}`);
}

// Inicializar esquema y migraciones
export function initDatabase() {
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'src/server/db/schema.sql');
  }
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  try { db.exec(`ALTER TABLE dispositivos ADD COLUMN cuenta_hct_id INTEGER REFERENCES cuentas_hct(id) ON DELETE SET NULL;`); } catch {}
  try { db.exec(`ALTER TABLE torniquetes ADD COLUMN cloud_resource_id TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE niveles_acceso ADD COLUMN cuenta_hct_id INTEGER REFERENCES cuentas_hct(id) ON DELETE SET NULL;`); } catch {}
  try { db.exec(`ALTER TABLE niveles_acceso ADD COLUMN es_staff INTEGER DEFAULT 0;`); } catch {}
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS persona_cuentas_hct (
        persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
        cuenta_hct_id INTEGER NOT NULL REFERENCES cuentas_hct(id) ON DELETE CASCADE,
        cloud_person_id TEXT NOT NULL,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (persona_id, cuenta_hct_id)
      );
    `);
    db.prepare(`
      INSERT OR IGNORE INTO persona_cuentas_hct (persona_id, cuenta_hct_id, cloud_person_id)
      SELECT id, 1, hik_person_id FROM personas WHERE hik_person_id IS NOT NULL AND hik_person_id != ''
    `).run();
  } catch {}

  // Migración segura: hacer telefono opcional en personas si aún tiene NOT NULL
  try {
    const tableInfo = db.prepare("PRAGMA table_info(personas)").all() as Array<{ name: string; notnull: number }>;
    const telCol = tableInfo.find(c => c.name === 'telefono');
    if (telCol && telCol.notnull === 1) {
      console.log('🔄 Aplicando migración SQLite: haciendo personas.telefono opcional...');
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec(`
        CREATE TABLE personas_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT UNIQUE NOT NULL,
          nombre TEXT NOT NULL,
          apellidos TEXT DEFAULT '',
          telefono TEXT,
          email TEXT,
          foto_url TEXT,
          tipo TEXT CHECK(tipo IN ('SOCIO', 'EMPLEADO', 'VISITANTE', 'PROVEEDOR')) DEFAULT 'SOCIO',
          notas TEXT,
          hik_person_id TEXT UNIQUE,
          activo INTEGER DEFAULT 1,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO personas_temp SELECT id, codigo, nombre, apellidos, telefono, email, foto_url, tipo, notas, hik_person_id, activo, creado_en, actualizado_en FROM personas;
        DROP TABLE personas;
        ALTER TABLE personas_temp RENAME TO personas;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_telefono_unique ON personas(telefono) WHERE telefono IS NOT NULL AND telefono != '';
      `);
      db.exec('PRAGMA foreign_keys = ON;');
      console.log('✅ Migración de personas.telefono completada.');
    }
  } catch (mErr) {
    console.warn('Advertencia en migración personas.telefono:', mErr);
  }

  // Inicializar configuración base si no existe
  const initConfig = db.prepare(`
    INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)
  `);
  
  initConfig.run('gym_nombre', 'Mi Gimnasio');
  initConfig.run('gym_timezone', 'America/Mexico_City');
  initConfig.run('hardware_mode', 'HIKVISION_LOCAL_ISAPI');
  initConfig.run('hik_base_url', 'https://ius.hikcentralconnect.com/api');
  initConfig.run('hik_app_key', '');
  initConfig.run('hik_secret_key', '');
  initConfig.run('hik_access_level_id', '');
  initConfig.run('hik_local_ip', '192.168.1.100');
  initConfig.run('hik_local_port', '80');
  initConfig.run('hik_local_user', 'admin');
  initConfig.run('hik_local_pass', '');
  initConfig.run('hik_local_protocol', 'http');
  initConfig.run('hik_pro_base_url', 'https://192.168.1.200:443');
  initConfig.run('hik_pro_app_key', '');
  initConfig.run('hik_pro_secret_key', '');
  initConfig.run('backup_hora', '23:00');
  initConfig.run('backup_ruta', path.resolve(process.cwd(), 'backups'));

  // Migración automática de credenciales HCT únicas hacia cuentas_hct
  const countCuentas = (db.prepare('SELECT COUNT(*) as count FROM cuentas_hct').get() as any)?.count || 0;
  if (countCuentas === 0) {
    const appKey = (db.prepare("SELECT valor FROM configuracion WHERE clave = 'hik_app_key'").get() as any)?.valor || '';
    const secKey = (db.prepare("SELECT valor FROM configuracion WHERE clave = 'hik_secret_key'").get() as any)?.valor || '';
    const baseUrl = (db.prepare("SELECT valor FROM configuracion WHERE clave = 'hik_base_url'").get() as any)?.valor || 'https://ius.hikcentralconnect.com/api';
    if (appKey && secKey) {
      db.prepare(`
        INSERT INTO cuentas_hct (id, nombre, app_key, secret_key, base_url, activa, notas)
        VALUES (1, 'Cuenta Principal - Araucarias', ?, ?, ?, 1, 'Cuenta importada automáticamente de la configuración previa')
      `).run(appKey, secKey, baseUrl);
      console.log('☁️ Cuenta HCT Principal migrada automáticamente a cuentas_hct (ID: 1)');
    }
  }

  // Sanitización de banderas activas en dispositivos y torniquetes
  db.prepare('UPDATE dispositivos SET activa = 1 WHERE activa = 0').run();
  db.prepare('UPDATE torniquetes SET activo = 1 WHERE activo = 0').run();
  db.prepare(`UPDATE dispositivos SET cuenta_hct_id = 1 WHERE driver = 'HIKCONNECT_TEAMS' AND (cuenta_hct_id IS NULL OR cuenta_hct_id = 0)`).run();
  db.prepare(`UPDATE niveles_acceso SET cuenta_hct_id = 1 WHERE cloud_level_id IS NOT NULL AND (cuenta_hct_id IS NULL OR cuenta_hct_id = 0)`).run();

  // Migración de datos heredados (Zero Data Loss)
  migrateLegacyData();

  // Usuarios del sistema por defecto (admin / recepcion)
  const userCheck = db.prepare('SELECT COUNT(*) as count FROM usuarios').get() as { count: number };
  if (userCheck.count === 0) {
    db.prepare(`
      INSERT INTO usuarios (nombre, username, password_hash, rol)
      VALUES (?, ?, ?, ?)
    `).run('Administrador', 'admin', 'admin123', 'ADMIN');

    db.prepare(`
      INSERT INTO usuarios (nombre, username, password_hash, rol)
      VALUES (?, ?, ?, ?)
    `).run('Recepcionista', 'recepcion', 'recepcion123', 'RECEPCION');
  }

  console.log('✅ Base de datos SQLite modular (WAL) inicializada en:', DB_PATH);
}

/**
 * Migración transparente y segura de esquemas heredados hacia los módulos nuevos
 */
function migrateLegacyData() {
  try {
    // 1. Migrar socios -> personas
    const personaCount = (db.prepare('SELECT COUNT(*) as count FROM personas').get() as any)?.count || 0;
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='socios'").get();
    
    if (personaCount === 0 && tableExists) {
      const socios = db.prepare('SELECT * FROM socios').all() as any[];
      if (socios.length > 0) {
        console.log(`📦 Migrando ${socios.length} socios heredados hacia tabla personas (IAM Core)...`);
        const insertPersona = db.prepare(`
          INSERT INTO personas (id, codigo, nombre, apellidos, telefono, email, foto_url, tipo, hik_person_id, activo, creado_en, actualizado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'SOCIO', ?, 1, ?, ?)
        `);
        for (const s of socios) {
          const codigo = `PER-${1000 + Number(s.id)}`;
          insertPersona.run(
            s.id,
            codigo,
            s.nombre || 'Socio Sin Nombre',
            '',
            s.telefono || `${Date.now()}`,
            s.email || null,
            s.foto_path || null,
            s.hik_person_id || null,
            s.fecha_registro || new Date().toISOString(),
            s.actualizado_en || new Date().toISOString()
          );
        }
      }
    }

    // 2. Migrar terminales -> dispositivos y torniquetes
    const dispCount = (db.prepare('SELECT COUNT(*) as count FROM dispositivos').get() as any)?.count || 0;
    const termExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='terminales'").get();

    if (dispCount === 0 && termExists) {
      const terminales = db.prepare('SELECT * FROM terminales').all() as any[];
      if (terminales.length > 0) {
        console.log(`📦 Migrando ${terminales.length} terminales hacia dispositivos y torniquetes...`);
        const insertDisp = db.prepare(`
          INSERT INTO dispositivos (id, nombre, driver, ip, puerto, usuario, password, cloud_serial, activa)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertTorniquete = db.prepare(`
          INSERT INTO torniquetes (dispositivo_id, canal_relevador, nombre, direccion, ubicacion_area, activo)
          VALUES (?, 1, ?, ?, 'Recepción Principal', ?)
        `);

        for (const t of terminales) {
          insertDisp.run(
            t.id,
            t.nombre,
            t.tipo_driver || 'HIKVISION_LOCAL_ISAPI',
            t.ip || '192.168.1.100',
            t.puerto || '80',
            t.usuario || 'admin',
            t.password || '',
            t.cloud_device_serial || null,
            t.activa !== undefined ? t.activa : 1
          );

          insertTorniquete.run(
            t.id,
            t.nombre,
            t.direccion || 'ENTRADA',
            t.activa !== undefined ? t.activa : 1
          );
        }
      }
    }

    // Sincronizar cualquier terminal de Teams huérfana en terminales hacia dispositivos
    if (termExists) {
      const orphanTeamsTerms = db.prepare(`
        SELECT * FROM terminales 
        WHERE cloud_device_serial IS NOT NULL 
          AND cloud_device_serial NOT IN (SELECT cloud_serial FROM dispositivos WHERE cloud_serial IS NOT NULL)
      `).all() as any[];
      for (const ot of orphanTeamsTerms) {
        const info = db.prepare(`
          INSERT INTO dispositivos (nombre, driver, cloud_serial, cuenta_hct_id, activa, estado_conexion)
          VALUES (?, 'HIKCONNECT_TEAMS', ?, 1, 1, 'ONLINE')
        `).run(ot.nombre, ot.cloud_device_serial);
        db.prepare(`
          INSERT INTO torniquetes (dispositivo_id, canal_relevador, nombre, direccion, ubicacion_area, activo)
          VALUES (?, 1, ?, 'BIDIRECCIONAL', 'Acceso Teams', 1)
        `).run(info.lastInsertRowid, ot.nombre);
      }
    }


    // 3. Migrar planes -> gym_planes
    const planCount = (db.prepare('SELECT COUNT(*) as count FROM gym_planes').get() as any)?.count || 0;
    const oldPlanesExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='planes'").get();
    if (planCount === 0 && oldPlanesExists) {
      const planes = db.prepare('SELECT * FROM planes').all() as any[];
      if (planes.length > 0) {
        const insertPlan = db.prepare('INSERT INTO gym_planes (id, nombre, duracion_dias, precio, nivel_acceso_id, activo) VALUES (?, ?, ?, ?, ?, ?)');
        for (const p of planes) {
          insertPlan.run(p.id, p.nombre, p.duracion_dias, p.precio, p.nivel_acceso_id || 1, p.activo || 1);
        }
      }
    }

    // 4. Migrar membresías -> gym_membresias
    const membCount = (db.prepare('SELECT COUNT(*) as count FROM gym_membresias').get() as any)?.count || 0;
    const oldMembExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='membresias'").get();
    if (membCount === 0 && oldMembExists) {
      const membresias = db.prepare('SELECT * FROM membresias').all() as any[];
      if (membresias.length > 0) {
        const insertMemb = db.prepare(`
          INSERT INTO gym_membresias (id, persona_id, plan_id, fecha_inicio, fecha_fin, estatus, activa, creado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of membresias) {
          insertMemb.run(
            m.id,
            m.socio_id,
            m.plan_id,
            m.fecha_inicio,
            m.fecha_fin,
            m.activa ? 'VIGENTE' : 'VENCIDA',
            m.activa || 0,
            m.creado_en || new Date().toISOString()
          );
        }
      }
    }

    // 5. Migrar pagos -> gym_pagos
    const pagosCount = (db.prepare('SELECT COUNT(*) as count FROM gym_pagos').get() as any)?.count || 0;
    const oldPagosExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pagos'").get();
    if (pagosCount === 0 && oldPagosExists) {
      const pagos = db.prepare('SELECT * FROM pagos').all() as any[];
      if (pagos.length > 0) {
        const insertPago = db.prepare(`
          INSERT INTO gym_pagos (id, folio, persona_id, membresia_id, plan_id, monto, metodo_pago, cajero_usuario_id, fecha_pago)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const pg of pagos) {
          insertPago.run(
            pg.id,
            pg.folio,
            pg.socio_id,
            null,
            pg.plan_id,
            pg.monto,
            pg.metodo_pago,
            pg.usuario_id || 1,
            pg.fecha_pago || new Date().toISOString()
          );
        }
      }
    }

    // 6. Migrar accesos_log -> eventos_acceso
    const evCount = (db.prepare('SELECT COUNT(*) as count FROM eventos_acceso').get() as any)?.count || 0;
    const oldLogExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='accesos_log'").get();
    if (evCount === 0 && oldLogExists) {
      const logs = db.prepare('SELECT * FROM accesos_log').all() as any[];
      if (logs.length > 0) {
        const insertEv = db.prepare(`
          INSERT INTO eventos_acceso (persona_id, persona_nombre, persona_foto, tipo_evento, torniquete_id, fecha_hora)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const l of logs) {
          insertEv.run(
            l.socio_id || null,
            l.socio_nombre || 'Desconocido',
            l.foto_url || null,
            l.tipo_evento || 'CONCEDIDO',
            l.terminal_id || null,
            l.fecha_hora || new Date().toISOString()
          );
        }
      }
    }

    // 7. Migración de Sucursales y Agrupación de Accesos
    db.exec(`
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
      CREATE TABLE IF NOT EXISTS gym_plan_niveles (
        plan_id INTEGER NOT NULL REFERENCES gym_planes(id) ON DELETE CASCADE,
        nivel_id INTEGER NOT NULL REFERENCES niveles_acceso(id) ON DELETE CASCADE,
        PRIMARY KEY (plan_id, nivel_id)
      );
      CREATE INDEX IF NOT EXISTS idx_sucursal_disp ON sucursal_dispositivos(sucursal_id);
      CREATE INDEX IF NOT EXISTS idx_plan_sucursal ON gym_plan_sucursales(plan_id);
      CREATE INDEX IF NOT EXISTS idx_plan_niveles ON gym_plan_niveles(plan_id);
    `);

    // Auto-vincular niveles por defecto a los planes si aún no tienen
    const primerNivel = db.prepare('SELECT id FROM niveles_acceso WHERE activo = 1 ORDER BY id ASC LIMIT 1').get() as any;
    if (primerNivel) {
      const planesSinNivel = db.prepare(`
        SELECT id FROM gym_planes 
        WHERE id NOT IN (SELECT DISTINCT plan_id FROM gym_plan_niveles)
      `).all() as any[];
      const insPlanNivel = db.prepare('INSERT OR IGNORE INTO gym_plan_niveles (plan_id, nivel_id) VALUES (?, ?)');
      for (const p of planesSinNivel) {
        insPlanNivel.run(p.id, primerNivel.id);
      }
    }

    // Auto-inicializar sucursal por defecto si no existe ninguna
    const sucursalCount = (db.prepare('SELECT COUNT(*) as count FROM sucursales').get() as any)?.count || 0;
    if (sucursalCount === 0) {
      const s = db.prepare(`
        INSERT INTO sucursales (nombre, direccion, telefono, activa)
        VALUES ('Sucursal Araucarias', 'Av. Araucarias', '', 1)
      `).run();
      const sucursalId = Number(s.lastInsertRowid);

      const devs = db.prepare('SELECT id FROM dispositivos WHERE activa = 1').all() as any[];
      for (const d of devs) {
        db.prepare('INSERT OR IGNORE INTO sucursal_dispositivos (sucursal_id, dispositivo_id) VALUES (?, ?)').run(sucursalId, d.id);
      }

      const planes = db.prepare('SELECT id FROM gym_planes WHERE activo = 1').all() as any[];
      for (const p of planes) {
        db.prepare('INSERT OR IGNORE INTO gym_plan_sucursales (plan_id, sucursal_id) VALUES (?, ?)').run(p.id, sucursalId);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Nota de migración:', err.message);
  }
}
