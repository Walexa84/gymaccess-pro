import { Router, Request, Response } from 'express';
import { IamService } from './iam.service.js';

export const iamRouter = Router();

// Listar personas
iamRouter.get('/personas', (req: Request, res: Response) => {
  try {
    const { q, tipo, estado } = req.query;
    const personas = IamService.getPersonas(q as string, tipo as string, estado as string);
    res.json(personas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sugerir siguiente código/ID disponible
iamRouter.get('/personas/siguiente-codigo', async (_req: Request, res: Response) => {
  try {
    const { db } = await import('../../db/database.js');
    const maxRow = db.prepare('SELECT MAX(id) as max_id FROM personas').get() as { max_id: number };
    const nextId = (maxRow?.max_id || 0) + 1;
    res.json({ siguienteCodigo: String(1000 + nextId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Detalle de una persona
iamRouter.get('/personas/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = IamService.getPersonaById(id);
    if (!data) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Crear persona (básica)
iamRouter.post('/personas', (req: Request, res: Response) => {
  try {
    const persona = IamService.createPersona(req.body);
    res.status(201).json(persona);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Enrolar persona unificada (Socio o Staff con niveles de acceso e inyección a Teams)
iamRouter.post('/personas/enroll', async (req: Request, res: Response) => {
  try {
    const { TeamsPersonService } = await import('./teamsPerson.service.js');
    const result = await TeamsPersonService.enrollPersonWithAccess(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Catálogo de niveles de acceso disponibles para checkboxes
iamRouter.get('/niveles-acceso', async (_req: Request, res: Response) => {
  try {
    const { db } = await import('../../db/database.js');
    const rows = db.prepare(`
      SELECT n.id, n.nombre, n.cloud_level_id, n.cuenta_hct_id, c.nombre as cuenta_nombre
      FROM niveles_acceso n
      LEFT JOIN cuentas_hct c ON c.id = n.cuenta_hct_id
      WHERE n.activo = 1
      ORDER BY n.id ASC
    `).all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar persona
iamRouter.put('/personas/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const persona = IamService.updatePersona(id, req.body);
    res.json(persona);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Desactivar persona (baja lógica y retiro de Teams)
iamRouter.delete('/personas/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = await IamService.deletePersona(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reactivar persona
iamRouter.post('/personas/:id/reactivar', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const result = IamService.reactivarPersona(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// SINCRONIZACIÓN, TRIAJE Y PURGA DE PERSONAS EN TEAMS
// ============================================================================

// Listar personas en Teams y cruzarlas contra base local
iamRouter.get('/teams-persons/:cuentaId', async (req: Request, res: Response) => {
  try {
    const cuentaId = req.params.cuentaId ? Number(req.params.cuentaId) : undefined;
    const { TeamsPersonService } = await import('./teamsPerson.service.js');
    const result = await TeamsPersonService.getPersonsFromTeams(cuentaId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Importar una persona de Teams hacia la base local de clientes
iamRouter.post('/teams-persons/:cuentaId/import', async (req: Request, res: Response) => {
  try {
    const cuentaId = Number(req.params.cuentaId);
    const { TeamsPersonService } = await import('./teamsPerson.service.js');
    const result = await TeamsPersonService.importPersonToGym(cuentaId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Purgar individualmente una persona de Teams y del checador
iamRouter.delete('/teams-persons/:cuentaId/:personId', async (req: Request, res: Response) => {
  try {
    const cuentaId = Number(req.params.cuentaId);
    const personId = String(req.params.personId);
    const { TeamsPersonService } = await import('./teamsPerson.service.js');
    const result = await TeamsPersonService.deletePersonFromTeams(cuentaId, personId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purgar masivamente a todos los usuarios de Teams no registrados en el gimnasio
iamRouter.post('/teams-persons/:cuentaId/purge-unregistered', async (req: Request, res: Response) => {
  try {
    const cuentaId = Number(req.params.cuentaId);
    const { TeamsPersonService } = await import('./teamsPerson.service.js');
    const result = await TeamsPersonService.purgeUnregisteredPersons(cuentaId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar manualmente la fecha de vigencia de una persona y sincronizar el checador
iamRouter.put('/personas/:id/vigencia', async (req: Request, res: Response) => {
  try {
    const personaId = Number(req.params.id);
    const { fecha_fin } = req.body;
    if (!fecha_fin) {
      return res.status(400).json({ error: 'El campo fecha_fin es obligatorio (YYYY-MM-DD)' });
    }
    const { TeamsPersonService } = await import('./teamsPerson.service.js');
    const result = await TeamsPersonService.updatePersonVigencia(personaId, fecha_fin);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener ficha completa con puertas y niveles
iamRouter.get('/personas/:id/ficha', async (req: Request, res: Response) => {
  try {
    const personaId = Number(req.params.id);
    const { FichaService } = await import('./ficha.service.js');
    const result = FichaService.getFicha(personaId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar foto biométrica y propagar a Teams
iamRouter.post('/personas/:id/foto', async (req: Request, res: Response) => {
  try {
    const personaId = Number(req.params.id);
    const { fotoBase64 } = req.body;
    if (!fotoBase64) {
      return res.status(400).json({ error: 'La foto en formato base64 es obligatoria' });
    }
    const { FichaService } = await import('./ficha.service.js');
    const result = await FichaService.actualizarFoto(personaId, fotoBase64);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Forzar sincronización con Teams y checador (Quick Add o actualización)
iamRouter.post('/personas/:id/sync-teams', async (req: Request, res: Response) => {
  try {
    const personaId = Number(req.params.id);
    const { nivelesIds } = req.body;
    const { FichaService } = await import('./ficha.service.js');
    const result = await FichaService.sincronizarConChecador(personaId, nivelesIds);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar datos de socio (nombre, apellidos, teléfono, email) y propagar a Teams
iamRouter.put('/personas/:id/datos', async (req: Request, res: Response) => {
  try {
    const personaId = Number(req.params.id);
    const { FichaService } = await import('./ficha.service.js');
    const result = await FichaService.actualizarDatosPersona(personaId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

