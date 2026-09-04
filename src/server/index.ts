import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database.js';
import { SyncWorker } from './services/syncWorker.js';

import { authRouter } from './routes/auth.js';
import { sociosRouter } from './routes/socios.js';
import { pagosRouter } from './routes/pagos.js';
import { planesRouter } from './routes/planes.js';
import { hardwareRouter } from './routes/hardware.js';
import { backupsRouter } from './routes/backups.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir fotos subidas
const uploadsPath = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Rutas de API REST
app.use('/api/auth', authRouter);
app.use('/api/socios', sociosRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/planes', planesRouter);
app.use('/api/hardware', hardwareRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/dashboard', dashboardRouter);

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
  console.log(`🚀 GymAccess Pro iniciado exitosamente en:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`====================================================`);
});
