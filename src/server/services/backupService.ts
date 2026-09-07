import path from 'path';
import fs from 'fs';
import { db, restoreDatabaseFromBackup } from '../db/database.js';

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

  /**
   * Obtiene la ruta física y valida que el archivo exista sin riesgos de path traversal
   */
  public static getBackupFilePath(filename: string): string {
    if (!/^gym_backup_[\w\-]+\.db$/.test(filename)) {
      throw new Error('Nombre de archivo de respaldo no válido o sospechoso.');
    }

    const row = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get('backup_ruta') as { valor: string } | undefined;
    const backupDir = row?.valor ? row.valor : path.resolve(process.cwd(), 'backups');
    const fullPath = path.join(backupDir, filename);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`El archivo de respaldo ${filename} no fue encontrado en el disco.`);
    }

    return fullPath;
  }

  /**
   * Restaura la base de datos a partir de una copia específica
   */
  public static async restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
    const fullPath = this.getBackupFilePath(filename);
    restoreDatabaseFromBackup(fullPath);
    return {
      success: true,
      message: `Base de datos restaurada exitosamente con la copia ${filename}`,
    };
  }
}
