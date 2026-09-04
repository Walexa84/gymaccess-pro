import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { HikvisionIsapiDriver } from '../services/hikvisionIsapi.js';

export const topologyRouter = Router();

// ==========================================
// 1. GESTIÓN DE ÁREAS
// ==========================================
topologyRouter.get('/areas', (_req: Request, res: Response) => {
  const areas = db.prepare(`
    SELECT a.*, COUNT(t.id) as total_terminales
    FROM areas a
    LEFT JOIN terminales t ON t.area_id = a.id AND t.activa = 1
    WHERE a.activo = 1
    GROUP BY a.id
    ORDER BY a.id ASC
  `).all();
  res.json(areas);
});

topologyRouter.post('/areas', (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del área es requerido' });

  const stmt = db.prepare(`INSERT INTO areas (nombre, descripcion) VALUES (?, ?)`);
  const info = stmt.run(nombre, descripcion || null);
  res.status(201).json({ id: info.lastInsertRowid, nombre, descripcion });
});

topologyRouter.delete('/areas/:id', (req: Request, res: Response) => {
  db.prepare(`UPDATE areas SET activo = 0 WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true, message: 'Área desactivada' });
});

// ==========================================
// 2. GESTIÓN DE TERMINALES / CHECADORES
// ==========================================
topologyRouter.get('/terminales', (_req: Request, res: Response) => {
  const terminales = db.prepare(`
    SELECT t.*, a.nombre as area_nombre
    FROM terminales t
    LEFT JOIN areas a ON a.id = t.area_id
    WHERE t.activa = 1
    ORDER BY t.id ASC
  `).all();
  res.json(terminales);
});

topologyRouter.post('/terminales', (req: Request, res: Response) => {
  const { area_id, nombre, ip, puerto, usuario, password, direccion, tipo_driver, cloud_device_serial } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre de la terminal es requerido' });

  const stmt = db.prepare(`
    INSERT INTO terminales (area_id, nombre, ip, puerto, usuario, password, direccion, tipo_driver, cloud_device_serial)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    area_id || null,
    nombre,
    ip || null,
    puerto || '80',
    usuario || 'admin',
    password || '',
    direccion || 'ENTRADA',
    tipo_driver || 'HIKVISION_LOCAL_ISAPI',
    cloud_device_serial || null
  );

  res.status(201).json({ id: info.lastInsertRowid, nombre, ip });
});

topologyRouter.delete('/terminales/:id', (req: Request, res: Response) => {
  db.prepare(`UPDATE terminales SET activa = 0 WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true, message: 'Terminal eliminada' });
});

// Probar conexión específica de una terminal
topologyRouter.post('/terminales/:id/test', async (req: Request, res: Response) => {
  const terminal = db.prepare('SELECT * FROM terminales WHERE id = ?').get(Number(req.params.id)) as any;
  if (!terminal) return res.status(404).json({ success: false, message: 'Terminal no encontrada' });
  const isapi = new HikvisionIsapiDriver();
  const result = await isapi.testTerminal(terminal);
  res.json(result);
});

// Abrir relevador de una terminal específica
topologyRouter.post('/terminales/:id/open', async (req: Request, res: Response) => {
  const terminal = db.prepare('SELECT * FROM terminales WHERE id = ?').get(Number(req.params.id)) as any;
  if (!terminal) return res.status(404).json({ success: false, message: 'Terminal no encontrada' });
  const isapi = new HikvisionIsapiDriver();
  const ok = await isapi.openTerminalDoor(terminal);
  res.json({ success: ok, message: ok ? `Puerta abierta en ${terminal.nombre}` : `Fallo al abrir en ${terminal.nombre}` });
});

// Sincronizar reloj de una terminal específica
topologyRouter.post('/terminales/:id/sync-time', async (req: Request, res: Response) => {
  const terminal = db.prepare('SELECT * FROM terminales WHERE id = ?').get(Number(req.params.id)) as any;
  if (!terminal) return res.status(404).json({ success: false, message: 'Terminal no encontrada' });
  const isapi = new HikvisionIsapiDriver();
  const timeZone = req.body.timeZone || 'CST+6:00:00';
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const ok = await isapi.syncTerminalTime(terminal, nowIso, timeZone);
  res.json({ success: ok, message: ok ? `Reloj sincronizado en ${terminal.nombre}` : `Fallo al sincronizar reloj en ${terminal.nombre}` });
});

// ==========================================
// 3. GESTIÓN DE HORARIOS / TURNOS
// ==========================================
topologyRouter.get('/horarios', (_req: Request, res: Response) => {
  const horarios = db.prepare(`SELECT * FROM horarios WHERE activo = 1 ORDER BY id ASC`).all();
  res.json(horarios);
});

topologyRouter.post('/horarios', (req: Request, res: Response) => {
  const { nombre, hora_inicio, hora_fin, dias_semana } = req.body;
  if (!nombre || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Nombre, hora de inicio y fin son obligatorios' });
  }

  const stmt = db.prepare(`
    INSERT INTO horarios (nombre, hora_inicio, hora_fin, dias_semana)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(nombre, hora_inicio, hora_fin, dias_semana || 'L,M,X,J,V,S,D');
  res.status(201).json({ id: info.lastInsertRowid, nombre, hora_inicio, hora_fin });
});

topologyRouter.delete('/horarios/:id', (req: Request, res: Response) => {
  db.prepare(`UPDATE horarios SET activo = 0 WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true, message: 'Horario desactivado' });
});

// ==========================================
// 4. GESTIÓN DE NIVELES DE ACCESO
// ==========================================
topologyRouter.get('/niveles', (_req: Request, res: Response) => {
  const niveles = db.prepare(`SELECT * FROM niveles_acceso WHERE activo = 1 ORDER BY id ASC`).all() as any[];

  // Traer relaciones con áreas y horarios
  const rels = db.prepare(`
    SELECT na.nivel_id, na.area_id, a.nombre as area_nombre, na.horario_id, h.nombre as horario_nombre
    FROM nivel_acceso_areas na
    JOIN areas a ON a.id = na.area_id
    LEFT JOIN horarios h ON h.id = na.horario_id
  `).all() as any[];

  const resultado = niveles.map(n => ({
    ...n,
    areas: rels.filter(r => r.nivel_id === n.id),
  }));

  res.json(resultado);
});

topologyRouter.post('/niveles', (req: Request, res: Response) => {
  const { nombre, descripcion, areas } = req.body; // areas: [{ area_id, horario_id }]
  if (!nombre) return res.status(400).json({ error: 'El nombre del nivel es obligatorio' });

  try {
    db.exec('BEGIN');
    const stmt = db.prepare(`INSERT INTO niveles_acceso (nombre, descripcion) VALUES (?, ?)`);
    const info = stmt.run(nombre, descripcion || null);
    const nivelId = info.lastInsertRowid;

    if (Array.isArray(areas) && areas.length > 0) {
      const linkStmt = db.prepare(`INSERT INTO nivel_acceso_areas (nivel_id, area_id, horario_id) VALUES (?, ?, ?)`);
      for (const a of areas) {
        linkStmt.run(nivelId, a.area_id, a.horario_id || null);
      }
    }

    db.exec('COMMIT');
    res.status(201).json({ id: nivelId, nombre, areas });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

topologyRouter.delete('/niveles/:id', (req: Request, res: Response) => {
  db.prepare(`UPDATE niveles_acceso SET activo = 0 WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true, message: 'Nivel de acceso eliminado' });
});
