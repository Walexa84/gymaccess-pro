import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const planesRouter = Router();

planesRouter.get('/', (_req: Request, res: Response) => {
  const planes = db.prepare(`
    SELECT p.*, n.nombre as nivel_nombre
    FROM planes p
    LEFT JOIN niveles_acceso n ON n.id = p.nivel_acceso_id
    WHERE p.activo = 1
    ORDER BY p.duracion_dias ASC
  `).all();
  res.json(planes);
});

planesRouter.post('/', (req: Request, res: Response) => {
  const { nombre, duracion_dias, precio, nivel_acceso_id } = req.body;

  if (!nombre || !duracion_dias || !precio) {
    return res.status(400).json({ error: 'Nombre, duración y precio requeridos' });
  }

  const result = db.prepare(`
    INSERT INTO planes (nombre, duracion_dias, precio, nivel_acceso_id) VALUES (?, ?, ?, ?)
  `).run(nombre, parseInt(duracion_dias), parseFloat(precio), nivel_acceso_id || null);

  res.json({ id: result.lastInsertRowid, nombre, duracion_dias, precio, nivel_acceso_id });
});

planesRouter.put('/:id', (req: Request, res: Response) => {
  const { nombre, duracion_dias, precio, nivel_acceso_id } = req.body;
  const planId = Number(req.params.id);

  db.prepare(`
    UPDATE planes
    SET nombre = COALESCE(?, nombre),
        duracion_dias = COALESCE(?, duracion_dias),
        precio = COALESCE(?, precio),
        nivel_acceso_id = COALESCE(?, nivel_acceso_id)
    WHERE id = ?
  `).run(
    nombre !== undefined ? nombre : null,
    duracion_dias !== undefined ? parseInt(duracion_dias) : null,
    precio !== undefined ? parseFloat(precio) : null,
    nivel_acceso_id !== undefined ? Number(nivel_acceso_id) : null,
    planId
  );

  res.json({ success: true, message: 'Plan actualizado' });
});
