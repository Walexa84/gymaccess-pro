import { Router, Request, Response } from 'express';
import { PosService } from './pos.service.js';

export const posRouter = Router();

// ==========================================================================
// 1. PLANES DE MEMBRESÍA
// ==========================================================================
posRouter.get('/planes', (_req: Request, res: Response) => {
  res.json(PosService.getPlanes());
});

posRouter.post('/planes', (req: Request, res: Response) => {
  try {
    const plan = PosService.createPlan(req.body);
    res.status(201).json(plan);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

posRouter.put('/planes/:id', (req: Request, res: Response) => {
  try {
    const plan = PosService.updatePlan(Number(req.params.id), req.body);
    res.json(plan);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

posRouter.delete('/planes/:id', (req: Request, res: Response) => {
  try {
    res.json(PosService.deletePlan(Number(req.params.id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 2. COBRO Y REACTIVACIÓN EN HARDWARE
// ==========================================================================
posRouter.post('/cobro', async (req: Request, res: Response) => {
  try {
    const result = await PosService.registrarCobro(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================================================
// 3. KPIS Y MONITOR DE RECEPCIÓN
// ==========================================================================
posRouter.get('/stats', (_req: Request, res: Response) => {
  try {
    res.json(PosService.getDashboardStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
