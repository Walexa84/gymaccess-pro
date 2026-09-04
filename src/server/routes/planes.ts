import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const planesRouter = Router();

planesRouter.get('/', (_req: Request, res: Response) => {
  const planes = db.prepare('SELECT * FROM planes WHERE activo = 1 ORDER BY duracion_dias ASC').all();
  res.json(planes);
});

planesRouter.post('/', (req: Request, res: Response) => {
  const { nombre, duracion_dias, precio } = req.body;

  if (!nombre || !duracion_dias || !precio) {
    return res.status(400).json({ error: 'Nombre, duración y precio requeridos' });
  }

  const result = db.prepare(`
    INSERT INTO planes (nombre, duracion_dias, precio) VALUES (?, ?, ?)
  `).run(nombre, parseInt(duracion_dias), parseFloat(precio));

  res.json({ id: result.lastInsertRowid, nombre, duracion_dias, precio });
});
