import path from 'path';
import fs from 'fs';
import { db } from '../../db/database.js';

export interface PersonaInput {
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  tipo?: 'SOCIO' | 'EMPLEADO' | 'VISITANTE' | 'PROVEEDOR';
  notas?: string;
  fotoBase64?: string;
}

export class IamService {
  /**
   * Listar personas con búsqueda y filtros
   */
  public static getPersonas(q?: string, tipo?: string, estado?: string) {
    let sql = `
      SELECT 
        p.*,
        m.fecha_fin as vigencia_fin,
        m.estatus as membresia_estatus,
        gp.nombre as plan_nombre,
        (SELECT COUNT(*) FROM gym_membresias cm JOIN gym_planes cp ON cp.id = cm.plan_id WHERE cm.persona_id = p.id AND (cp.nombre LIKE '%Cortesía%' OR cp.precio = 0)) as cortesias_usadas
      FROM personas p
      LEFT JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
      LEFT JOIN gym_planes gp ON gp.id = m.plan_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (estado === 'INACTIVOS') {
      sql += ' AND p.activo = 0';
    } else if (estado === 'TODOS') {
      // no filtrar por activo
    } else {
      sql += ' AND p.activo = 1';
    }

    if (tipo && tipo !== 'TODOS') {
      if (tipo === 'VISITANTE' || tipo === 'CORTESIA' || tipo === 'CORTESIAS') {
        sql += ` AND (p.tipo = 'VISITANTE' OR gp.nombre LIKE '%Cortesía%' OR (m.activa = 1 AND gp.precio = 0))`;
      } else {
        sql += ' AND p.tipo = ?';
        params.push(tipo);
      }
    }

    if (q) {
      sql += ' AND (p.nombre LIKE ? OR p.apellidos LIKE ? OR p.telefono LIKE ? OR p.codigo LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY p.id DESC';
    return db.prepare(sql).all(...params);
  }

  /**
   * Detalle completo de una persona con historial
   */
  public static getPersonaById(id: number) {
    const persona = db.prepare(`
      SELECT 
        p.*,
        m.fecha_fin as vigencia_fin,
        m.estatus as membresia_estatus,
        gp.nombre as plan_nombre,
        gp.id as plan_id,
        (SELECT COUNT(*) FROM gym_membresias cm JOIN gym_planes cp ON cp.id = cm.plan_id WHERE cm.persona_id = p.id AND (cp.nombre LIKE '%Cortesía%' OR cp.precio = 0)) as cortesias_usadas
      FROM personas p
      LEFT JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
      LEFT JOIN gym_planes gp ON gp.id = m.plan_id
      WHERE p.id = ?
    `).get(id);

    if (!persona) return null;

    const membresias = db.prepare(`
      SELECT m.*, gp.nombre as plan_nombre
      FROM gym_membresias m
      JOIN gym_planes gp ON gp.id = m.plan_id
      WHERE m.persona_id = ?
      ORDER BY m.fecha_inicio DESC
    `).all(id);

    const pagos = db.prepare(`
      SELECT pg.*, gp.nombre as plan_nombre, u.nombre as cajero_nombre
      FROM gym_pagos pg
      JOIN gym_planes gp ON gp.id = pg.plan_id
      LEFT JOIN usuarios u ON u.id = pg.cajero_usuario_id
      WHERE pg.persona_id = ?
      ORDER BY pg.fecha_pago DESC
    `).all(id);

    const accesos = db.prepare(`
      SELECT e.*, t.nombre as torniquete_nombre
      FROM eventos_acceso e
      LEFT JOIN torniquetes t ON t.id = e.torniquete_id
      WHERE e.persona_id = ?
      ORDER BY e.fecha_hora DESC
      LIMIT 25
    `).all(id);

    return { persona, membresias, pagos, accesos };
  }

  /**
   * Crear nueva persona en el directorio central
   */
  public static createPersona(data: PersonaInput) {
    if (!data.nombre || !data.nombre.trim()) {
      throw new Error('El nombre de la persona es obligatorio');
    }

    const cleanPhone = data.telefono?.trim() || null;
    if (cleanPhone) {
      const existing = db.prepare('SELECT id FROM personas WHERE telefono = ? AND activo = 1').get(cleanPhone);
      if (existing) {
        throw new Error(`Ya existe una persona registrada con el teléfono ${cleanPhone}`);
      }
    }

    let fotoUrl: string | null = null;
    if (data.fotoBase64) {
      fotoUrl = this.savePhotoFile(data.fotoBase64);
    }

    const nextIdRow = db.prepare('SELECT MAX(id) as max_id FROM personas').get() as { max_id: number };
    const nextId = (nextIdRow?.max_id || 0) + 1;
    const codigo = `PER-${1000 + nextId}`;

    const stmt = db.prepare(`
      INSERT INTO personas (codigo, nombre, apellidos, telefono, email, foto_url, tipo, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      codigo,
      data.nombre.trim(),
      (data.apellidos || '').trim(),
      cleanPhone,
      data.email?.trim() || null,
      fotoUrl,
      data.tipo || 'SOCIO',
      data.notas || null
    );

    const personaId = Number(info.lastInsertRowid);

    // Si tiene foto, registrar credencial biométrica facial inicial
    if (fotoUrl) {
      db.prepare(`
        INSERT INTO credenciales (persona_id, tipo, valor)
        VALUES (?, 'FACIAL', ?)
      `).run(personaId, fotoUrl);
    }

    return this.getPersonaById(personaId);
  }

  /**
   * Actualizar persona
   */
  public static updatePersona(id: number, data: Partial<PersonaInput>) {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as any;
    if (!persona) throw new Error('Persona no encontrada');

    let fotoUrl = persona.foto_url;
    if (data.fotoBase64) {
      fotoUrl = this.savePhotoFile(data.fotoBase64);
      db.prepare(`INSERT INTO credenciales (persona_id, tipo, valor) VALUES (?, 'FACIAL', ?)`).run(id, fotoUrl);
    }

    db.prepare(`
      UPDATE personas
      SET nombre = COALESCE(?, nombre),
          apellidos = COALESCE(?, apellidos),
          telefono = COALESCE(?, telefono),
          email = COALESCE(?, email),
          foto_url = ?,
          tipo = COALESCE(?, tipo),
          notas = COALESCE(?, notas),
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.nombre || null,
      data.apellidos !== undefined ? data.apellidos : null,
      data.telefono || null,
      data.email !== undefined ? data.email : null,
      fotoUrl,
      data.tipo || null,
      data.notas !== undefined ? data.notas : null,
      id
    );

    return this.getPersonaById(id);
  }

  /**
   * Desactivar persona (baja lógica y desvinculación de Teams/checador)
   */
  public static async deletePersona(id: number) {
    const persona = db.prepare('SELECT id, hik_person_id, nombre FROM personas WHERE id = ?').get(id) as any;
    if (!persona) throw new Error('Persona no encontrada');

    let teamsDeleted = false;
    if (persona.hik_person_id) {
      try {
        const { TeamsPersonService } = await import('./teamsPerson.service.js');
        const resTeams = await TeamsPersonService.deletePersonFromTeams(1, persona.hik_person_id);
        teamsDeleted = resTeams.success;
      } catch (err: any) {
        console.warn(`[IamService] No se pudo borrar de Teams (personId: ${persona.hik_person_id}):`, err.message);
      }
    }

    db.prepare('UPDATE personas SET activo = 0, hik_person_id = NULL WHERE id = ?').run(id);
    return {
      success: true,
      message: teamsDeleted 
        ? 'Persona dada de baja y eliminada del checador físico' 
        : 'Persona dada de baja localmente'
    };
  }

  /**
   * Reactivar persona previamente dada de baja
   */
  public static reactivarPersona(id: number) {
    db.prepare('UPDATE personas SET activo = 1 WHERE id = ?').run(id);
    return { success: true, message: 'Persona reactivada en el directorio' };
  }

  /**
   * Guardar imagen base64 a archivo JPG en uploads/
   */
  private static savePhotoFile(base64Data: string): string {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const filename = `persona_${Date.now()}.jpg`;
    const fullPath = path.join(uploadDir, filename);
    fs.writeFileSync(fullPath, Buffer.from(cleanBase64, 'base64'));
    return `/uploads/${filename}`;
  }
}
