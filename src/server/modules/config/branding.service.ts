import path from 'path';
import fs from 'fs';
import { db } from '../../db/database.js';

export interface BrandingConfig {
  gym_nombre: string;
  gym_slogan: string;
  gym_logo_url: string;
  gym_theme_preset: 'cyber' | 'sport' | 'ocean' | 'crimson' | 'clean';
  gym_custom_color: string;
  gym_phone: string;
  gym_address: string;
  gym_rfc: string;
  gym_ticket_footer: string;
  sound_enabled: boolean;
  cortesia_dias: number;
}

export class BrandingService {
  private static readonly DEFAULTS: BrandingConfig = {
    gym_nombre: 'AccessCore Gym',
    gym_slogan: 'Control de Acceso Físico & Punto de Venta',
    gym_logo_url: '',
    gym_theme_preset: 'cyber',
    gym_custom_color: '#ccff00',
    gym_phone: '',
    gym_address: '',
    gym_rfc: '',
    gym_ticket_footer: '¡Gracias por entrenar con nosotros! El uso de toalla es obligatorio.',
    sound_enabled: true,
    cortesia_dias: 1,
  };

  /**
   * Obtiene la configuración de identidad y marca actual
   */
  public static getBranding(): BrandingConfig {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all() as Array<{ clave: string; valor: string }>;
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.clave, r.valor);
    }

    return {
      gym_nombre: map.get('gym_nombre') || this.DEFAULTS.gym_nombre,
      gym_slogan: map.get('gym_slogan') || this.DEFAULTS.gym_slogan,
      gym_logo_url: map.get('gym_logo_url') || this.DEFAULTS.gym_logo_url,
      gym_theme_preset: (map.get('gym_theme_preset') as any) || this.DEFAULTS.gym_theme_preset,
      gym_custom_color: map.get('gym_custom_color') || this.DEFAULTS.gym_custom_color,
      gym_phone: map.get('gym_phone') || this.DEFAULTS.gym_phone,
      gym_address: map.get('gym_address') || this.DEFAULTS.gym_address,
      gym_rfc: map.get('gym_rfc') || this.DEFAULTS.gym_rfc,
      gym_ticket_footer: map.get('gym_ticket_footer') || this.DEFAULTS.gym_ticket_footer,
      sound_enabled: map.has('sound_enabled') ? map.get('sound_enabled') === 'true' : this.DEFAULTS.sound_enabled,
      cortesia_dias: map.has('cortesia_dias') ? Number(map.get('cortesia_dias')) || 1 : this.DEFAULTS.cortesia_dias,
    };
  }

  /**
   * Actualiza los valores de marca de forma transaccional e idempotente
   */
  public static updateBranding(data: Partial<BrandingConfig>): BrandingConfig {
    const stmt = db.prepare(`
      INSERT INTO configuracion (clave, valor) VALUES (?, ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      if (data.gym_nombre !== undefined) stmt.run('gym_nombre', data.gym_nombre.trim());
      if (data.gym_slogan !== undefined) stmt.run('gym_slogan', data.gym_slogan.trim());
      if (data.gym_theme_preset !== undefined) stmt.run('gym_theme_preset', data.gym_theme_preset);
      if (data.gym_custom_color !== undefined) stmt.run('gym_custom_color', data.gym_custom_color);
      if (data.gym_phone !== undefined) stmt.run('gym_phone', data.gym_phone.trim());
      if (data.gym_address !== undefined) stmt.run('gym_address', data.gym_address.trim());
      if (data.gym_rfc !== undefined) stmt.run('gym_rfc', data.gym_rfc.trim());
      if (data.gym_ticket_footer !== undefined) stmt.run('gym_ticket_footer', data.gym_ticket_footer.trim());
      if (data.sound_enabled !== undefined) stmt.run('sound_enabled', data.sound_enabled ? 'true' : 'false');
      if (data.cortesia_dias !== undefined) stmt.run('cortesia_dias', String(data.cortesia_dias));
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    return this.getBranding();
  }

  /**
   * Guarda un logotipo cargado en base64 en uploads/branding/
   */
  public static saveLogo(base64Data: string): string {
    const uploadDir = path.resolve(process.cwd(), 'uploads', 'branding');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Detectar extensión si viene en el data URL
    let ext = 'png';
    if (base64Data.startsWith('data:image/svg+xml')) ext = 'svg';
    else if (base64Data.startsWith('data:image/jpeg') || base64Data.startsWith('data:image/jpg')) ext = 'jpg';
    else if (base64Data.startsWith('data:image/webp')) ext = 'webp';

    const cleanBase64 = base64Data.replace(/^data:image\/[a-z+]+;base64,/, '');
    const filename = `logo_${Date.now()}.${ext}`;
    const fullPath = path.join(uploadDir, filename);

    fs.writeFileSync(fullPath, Buffer.from(cleanBase64, 'base64'));
    const logoUrl = `/uploads/branding/${filename}`;

    db.prepare(`
      INSERT INTO configuracion (clave, valor) VALUES ('gym_logo_url', ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `).run(logoUrl);

    return logoUrl;
  }

  /**
   * Elimina el logotipo personalizado y regresa al logo por defecto
   */
  public static removeLogo(): void {
    const current = this.getBranding().gym_logo_url;
    if (current && current.startsWith('/uploads/branding/')) {
      const fullPath = path.resolve(process.cwd(), current.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch {}
      }
    }

    db.prepare(`
      INSERT INTO configuracion (clave, valor) VALUES ('gym_logo_url', '')
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `).run();
  }
}
