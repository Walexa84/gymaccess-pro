import path from 'path';
import fs from 'fs';
import { db } from '../db/database.js';

export class BackupService {
  /**
   * Genera un respaldo atómico de la base de datos en caliente usando VACUUM INTO
   * Es la instrucción estándar de SQLite para copias de seguridad consistentes sin bloqueos.
   */
  public static async createBackup(targetDirectory?: string): Promise<{ filename: string; fullPath: string; sizeBytes: number }> {
    const row = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get('backup_ruta') as { valor: string } | undefined;
    const backupDir = targetDirectory || (row?.valor ? row.valor : path.resolve(process.cwd(), 'backups'));

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gym_backup_${timestamp}.db`;
    const fullPath = path.join(backupDir, filename);

    // Formato con barras diagonales para sintaxis SQL de SQLite
    const normalizedPath = fullPath.replace(/\\/g, '/');
    db.exec(`VACUUM INTO '${normalizedPath}';`);

    const stats = fs.statSync(fullPath);
    console.log(`💾 Respaldo atómico creado: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

    return {
      filename,
      fullPath,
      sizeBytes: stats.size,
    };
  }

  /**
   * Lista todos los archivos de respaldo disponibles
   */
  public static listBackups(): { filename: string; fullPath: string; sizeBytes: number; creadoEn: Date }[] {
    const row = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get('backup_ruta') as { valor: string } | undefined;
    const backupDir = row?.valor ? row.valor : path.resolve(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    return files
      .filter(f => f.startsWith('gym_backup_') && f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          fullPath,
          sizeBytes: stats.size,
          creadoEn: stats.mtime,
        };
      })
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }
}
