import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database.js';
import { HikConnectService } from '../services/hikconnect.js';

export const sociosRouter = Router();

// Listar socios con búsqueda y filtros
socios_ts: sociosRouter.get('/', (req: Request, res: Response) => {
  const { q, estatus } = req.query;
  let sql = `
    SELECT 
      s.id, s.nombre, s.telefono, s.email, s.foto_path, s.estatus, s.hik_person_id, s.fecha_registro,
      m.fecha_fin as vigencia_fin, p.nombre as plan_nombre
    FROM socios s
    LEFT JOIN membresias m ON m.socio_id = s.id AND m.activa = 1
    LEFT JOIN planes p ON p.id = m.plan_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (estatus && estatus !== 'TODOS') {
    sql += ' AND s.estatus = ?';
    params.push(estatus);
  }

  if (q) {
    sql += ' AND (s.nombre LIKE ? OR s.telefono LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += ' ORDER BY s.id DESC';

  const socios = db.prepare(sql).all(...params);
  res.json(socios);
});

// Detalle de un socio con historial
sociosRouter.get('/:id', (req: Request, res: Response) => {
  const socioId = String(req.params.id);
  const socio = db.prepare(`
    SELECT s.*, m.fecha_fin as vigencia_fin, p.nombre as plan_nombre
    FROM socios s
    LEFT JOIN membresias m ON m.socio_id = s.id AND m.activa = 1
    LEFT JOIN planes p ON p.id = m.plan_id
    WHERE s.id = ?
  `).get(socioId);

  if (!socio) {
    return res.status(404).json({ error: 'Socio no encontrado' });
  }

  const pagos = db.prepare(`
    SELECT pg.*, pl.nombre as plan_nombre, u.nombre as usuario_nombre
    FROM pagos pg
    JOIN planes pl ON pl.id = pg.plan_id
    LEFT JOIN usuarios u ON u.id = pg.usuario_id
    WHERE pg.socio_id = ?
    ORDER BY pg.fecha_pago DESC
  `).all(socioId);

  const accesos = db.prepare(`
    SELECT * FROM accesos_log WHERE socio_id = ? ORDER BY fecha_hora DESC LIMIT 20
  `).all(socioId);

  res.json({ socio, pagos, accesos });
});

// Crear nuevo socio con foto y enrolamiento en HikCentral Connect
sociosRouter.post('/', async (req: Request, res: Response) => {
  const { nombre, telefono, email, fotoBase64 } = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  // Verificar teléfono único
  const existing = db.prepare('SELECT id FROM socios WHERE telefono = ?').get(telefono);
  if (existing) {
    return res.status(400).json({ error: 'Ya existe un socio registrado con este número de teléfono' });
  }

  let fotoPath = '';
  if (fotoBase64) {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const cleanBase64 = fotoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const filename = `socio_${Date.now()}.jpg`;
    const fullPath = path.join(uploadDir, filename);
    fs.writeFileSync(fullPath, Buffer.from(cleanBase64, 'base64'));
    fotoPath = `/uploads/${filename}`;
  }

  let hikPersonId: string | null = null;
  let hikError: string | null = null;

  // Intentar dar de alta en HikCentral Connect si está configurado
  try {
    hikPersonId = await HikConnectService.addPerson(nombre, telefono);
    if (fotoBase64 && hikPersonId) {
      await HikConnectService.uploadPersonPhoto(hikPersonId, fotoBase64);
    }
  } catch (err: any) {
    console.warn('⚠️ No se pudo sincronizar inmediatamente con HikCentral:', err.message);
    hikError = err.message;
  }

  const insert = db.prepare(`
    INSERT INTO socios (nombre, telefono, email, foto_path, hik_person_id, estatus)
    VALUES (?, ?, ?, ?, ?, 'VENCIDO')
  `).run(nombre, telefono, email || null, fotoPath || null, hikPersonId);

  const socioId = insert.lastInsertRowid;

  res.status(201).json({
    id: socioId,
    nombre,
    telefono,
    email,
    foto_path: fotoPath,
    hik_person_id: hikPersonId,
    estatus: 'VENCIDO',
    advertenciaHik: hikError,
  });
});
