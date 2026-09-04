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
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Inicializar configuración base si no existe
  const initConfig = db.prepare(`
    INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)
  `);
  
  initConfig.run('gym_nombre', 'Mi Gimnasio');
  initConfig.run('hik_base_url', 'https://ius.hikcentralconnect.com/api');
  initConfig.run('hik_app_key', '');
  initConfig.run('hik_secret_key', '');
  initConfig.run('hik_access_level_id', '');
  initConfig.run('backup_hora', '23:00');
  initConfig.run('backup_ruta', path.resolve(process.cwd(), 'backups'));

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
    const insertPlan = db.prepare('INSERT INTO planes (nombre, duracion_dias, precio) VALUES (?, ?, ?)');
    insertPlan.run('Visita / Pase Diario', 1, 50.0);
    insertPlan.run('Semana', 7, 200.0);
    insertPlan.run('Mensualidad Regular', 30, 500.0);
    insertPlan.run('Trimestre', 90, 1350.0);
    insertPlan.run('Anualidad', 365, 4800.0);
  }

  console.log('✅ Base de datos SQLite nativa inicializada en modo WAL:', DB_PATH);
}
