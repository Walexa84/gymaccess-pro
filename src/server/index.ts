import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database.js';
import { SyncWorker } from './services/syncWorker.js';

// Módulos de Arquitectura Desacoplada (V2.0)
import { iamRouter } from './modules/iam/iam.routes.js';
import { accessRouter } from './modules/access/access.routes.js';
import { posRouter } from './modules/gym_pos/pos.routes.js';

// Rutas y Controladores Base
import { authRouter } from './routes/auth.js';
import { hardwareRouter } from './routes/hardware.js';
import { backupsRouter } from './routes/backups.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: ['text/xml', 'application/xml'], limit: '10mb' }));

// Servir fotos subidas
const uploadsPath = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// ============================================================================
// 1. RUTAS MODULARES PRINCIPALES (ACCESSCORE & POS DESACOPLADOS)
// ============================================================================
app.use('/api/iam', iamRouter);        // Directorio central de personas y biometría
app.use('/api/access', accessRouter);  // Motor de control de acceso, torniquetes y eventos
app.use('/api/gym', posRouter);        // Punto de venta, planes de membresía y cobro

// ============================================================================
// 2. RUTAS DE SOPORTE Y SISTEMA
// ============================================================================
app.use('/api/auth', authRouter);
app.use('/api/hardware', hardwareRouter);
app.use('/api/backups', backupsRouter);

// Servir frontend en producción o cliente estático
const clientDist = path.resolve(process.cwd(), 'dist', 'client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Inicializar base de datos y demonios
initDatabase();
SyncWorker.startDaemon();

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 GymAccess Pro (AccessCore & POS) iniciado en:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Canal SSE Live: http://localhost:${PORT}/api/access/events/stream`);
  console.log(`   Webhook ISAPI: http://localhost:${PORT}/api/access/events/isapi-listener`);
  console.log(`====================================================`);
});
