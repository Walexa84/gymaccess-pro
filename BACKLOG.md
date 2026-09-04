# 📋 Backlog del Proyecto — Integración GYMS + HikCentral Connect

> **Estrategia:** Desarrollo por Fases | Local-First con SQLite WAL | Sincronización Hikvision Cloud

---

## 🟢 Fase 1: MVP Núcleo (Completada al 100%)
- [x] Extracción completa de documentación HikCentral Connect API (44 endpoints, 32 códigos de error en `HIKCONNECT_API_REFERENCE.md`).
- [x] Mapa Funcional y Arquitectura Técnica aprobados (`FUNCTIONAL_MAP.md` y `CODEBASE_MAP.md`).
- [x] Base de datos local SQLite con motor nativo de Node.js 22 (`node:sqlite`) y modo WAL activo.
- [x] Motor de respaldos en caliente sin bloqueo mediante `VACUUM INTO` (`backupService.ts`).
- [x] Cliente REST tipado para HikCentral Connect Gateway de Syscom (`hikconnect.ts`).
- [x] SyncWorker en segundo plano: revocación automática a medianoche y Startup Catch-up (`syncWorker.ts`).
- [x] Frontend SPA React 18 + Vite + Tailwind CSS (`dist/client`).
- [x] Prueba en vivo con hardware físico de Mario: "Checador Araucarias" (DS-K1T343MWX) y Nivel de Acceso `684236721751815168` vinculados y verificados.
- [x] Lanzador de un solo clic para Windows (`iniciar.bat`).

---

## 🟡 Fase 2: Robustez Operativa y Alertas (En Curso / Próxima)
- [ ] Enlace automático opcional de respaldos hacia Google Drive / OneDrive mediante copia de carpeta `backups/`.
- [ ] Módulo de auditoría de paso en tiempo real: sondeo de eventos de acceso `/events/search` para mostrar en pantalla foto y nombre al momento exacto de pasar por el facial.
- [ ] Generador de recibos / tickets de cobro en formato PDF o impresión térmica (ESC/POS).
- [ ] Notificaciones por WhatsApp / SMS para avisar al socio 2 días antes de que venza su cuota.

---

## 🔵 Fase 3: Multi-Sucursal y Autoservicio (Futura)
- [ ] Soporte para múltiples gimnasios o sucursales con base de datos sincronizada entre sedes.
- [ ] Portal de autoservicio web para que los socios consulten su vigencia y renueven con tarjeta de crédito/débito (Stripe / Mercado Pago).
- [ ] Registro biométrico remoto: enlace QR para que el socio se tome la selfie desde su celular antes de su primer visita.
