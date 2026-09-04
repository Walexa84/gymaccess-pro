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

export const db = new DatabaseSync(DB_PATH);

// Configuración de SQLite: WAL Mode y Foreign Keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');

// Inicializar esquema
export function initDatabase() {
  let schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'src/server/db/schema.sql');
  }
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Inicializar configuración base si no existe
  const initConfig = db.prepare(`
    INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)
  `);
  
  initConfig.run('gym_nombre', 'Mi Gimnasio');
  initConfig.run('gym_timezone', 'America/Mexico_City');
  initConfig.run('hardware_mode', 'HIKCONNECT_TEAMS');
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

  // Migraciones seguras para bases de datos existentes
  try { db.exec('ALTER TABLE planes ADD COLUMN nivel_acceso_id INTEGER REFERENCES niveles_acceso(id) ON DELETE SET NULL;'); } catch { /* ya existe */ }
  try { db.exec('ALTER TABLE accesos_log ADD COLUMN terminal_id INTEGER REFERENCES terminales(id) ON DELETE SET NULL;'); } catch { /* ya existe */ }
  try { db.exec('ALTER TABLE accesos_log ADD COLUMN terminal_nombre TEXT;'); } catch { /* ya existe */ }

  // Inicializar áreas por defecto si no existen
  const areaCheck = db.prepare('SELECT COUNT(*) as count FROM areas').get() as { count: number };
  if (areaCheck.count === 0) {
    db.prepare(`INSERT INTO areas (id, nombre, descripcion) VALUES (1, 'Entrada Principal', 'Batería de torniquetes de acceso al gimnasio')`).run();
    db.prepare(`INSERT INTO areas (id, nombre, descripcion) VALUES (2, 'Torniquetes Salida', 'Torniquetes de evacuación y salida')`).run();
    db.prepare(`INSERT INTO areas (id, nombre, descripcion) VALUES (3, 'Zona VIP / Crossfit', 'Acceso a área especializada de alto rendimiento')`).run();
  }

  // Inicializar horarios por defecto si no existen
  const horarioCheck = db.prepare('SELECT COUNT(*) as count FROM horarios').get() as { count: number };
  if (horarioCheck.count === 0) {
    db.prepare(`INSERT INTO horarios (id, nombre, hora_inicio, hora_fin, dias_semana) VALUES (1, 'Acceso Total 24/7', '06:00', '23:00', 'L,M,X,J,V,S,D')`).run();
    db.prepare(`INSERT INTO horarios (id, nombre, hora_inicio, hora_fin, dias_semana) VALUES (2, 'Turno Matutino', '06:00', '12:00', 'L,M,X,J,V')`).run();
    db.prepare(`INSERT INTO horarios (id, nombre, hora_inicio, hora_fin, dias_semana) VALUES (3, 'Turno Estudiante / Vespertino', '12:00', '18:00', 'L,M,X,J,V')`).run();
  }

  // Inicializar niveles de acceso por defecto si no existen
  const nivelCheck = db.prepare('SELECT COUNT(*) as count FROM niveles_acceso').get() as { count: number };
  if (nivelCheck.count === 0) {
    db.prepare(`INSERT INTO niveles_acceso (id, nombre, descripcion) VALUES (1, 'Acceso General Total', 'Acceso ilimitado a entrada y salida en horario completo')`).run();
    db.prepare(`INSERT INTO niveles_acceso (id, nombre, descripcion) VALUES (2, 'Plan Matutino', 'Permiso únicamente en horario matutino de 6am a 12pm')`).run();
    db.prepare(`INSERT INTO niveles_acceso (id, nombre, descripcion) VALUES (3, 'Acceso VIP Completo', 'Acceso a entrada, salida y zona especializada VIP')`).run();

    // Vincular áreas y horarios a los niveles base
    const link = db.prepare(`INSERT INTO nivel_acceso_areas (nivel_id, area_id, horario_id) VALUES (?, ?, ?)`);
    link.run(1, 1, 1); // General -> Entrada (Total)
    link.run(1, 2, 1); // General -> Salida (Total)
    link.run(2, 1, 2); // Matutino -> Entrada (Matutino)
    link.run(2, 2, 2); // Matutino -> Salida (Matutino)
    link.run(3, 1, 1); // VIP -> Entrada
    link.run(3, 2, 1); // VIP -> Salida
    link.run(3, 3, 1); // VIP -> Zona VIP
  }

  // Inicializar terminales por defecto si no existen
  const terminalCheck = db.prepare('SELECT COUNT(*) as count FROM terminales').get() as { count: number };
  if (terminalCheck.count === 0) {
    db.prepare(`
      INSERT INTO terminales (area_id, nombre, ip, puerto, usuario, password, direccion, tipo_driver)
      VALUES (1, 'Torniquete Entrada 1 (Facial)', '192.168.1.100', '80', 'admin', '', 'ENTRADA', 'HIKVISION_LOCAL_ISAPI')
    `).run();
    db.prepare(`
      INSERT INTO terminales (area_id, nombre, ip, puerto, usuario, password, direccion, tipo_driver)
      VALUES (2, 'Torniquete Salida 1', '192.168.1.101', '80', 'admin', '', 'SALIDA', 'HIKVISION_LOCAL_ISAPI')
    `).run();
  }

  // Inicializar usuario administrador por defecto (admin / admin123)
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

  // Inicializar planes base si no existen
  const planCheck = db.prepare('SELECT COUNT(*) as count FROM planes').get() as { count: number };
  if (planCheck.count === 0) {
    const insertPlan = db.prepare('INSERT INTO planes (nombre, duracion_dias, precio, nivel_acceso_id) VALUES (?, ?, ?, ?)');
    insertPlan.run('Visita / Pase Diario', 1, 50.0, 1);
    insertPlan.run('Semana', 7, 200.0, 1);
    insertPlan.run('Mensualidad Regular', 30, 500.0, 1);
    insertPlan.run('Mensualidad Matutina (Económica)', 30, 350.0, 2);
    insertPlan.run('Trimestre VIP', 90, 1500.0, 3);
    insertPlan.run('Anualidad Total', 365, 4800.0, 1);
  }

  console.log('✅ Base de datos SQLite nativa inicializada en modo WAL:', DB_PATH);
}
