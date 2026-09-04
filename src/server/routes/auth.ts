import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const user = db.prepare('SELECT id, nombre, username, password_hash, rol FROM usuarios WHERE username = ? AND activo = 1').get(username) as any;

  if (!user || user.password_hash !== password) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  return res.json({
    id: user.id,
    nombre: user.nombre,
    username: user.username,
    rol: user.rol,
  });
});
