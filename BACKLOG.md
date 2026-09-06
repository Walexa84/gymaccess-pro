# 📋 Backlog del Proyecto — Integración GYMS (GymAccess Pro V2.5)

> **Estrategia:** Desarrollo por Fases | Local-First con SQLite WAL | Multi-Cuenta Hik-Connect Teams & ISAPI Local Directo

---

## 🟢 Fase 1: MVP Núcleo (Completada al 100%)
- [x] Extracción completa de documentación HikCentral Connect API (44 endpoints en `HIKCONNECT_API_REFERENCE.md`).
- [x] Base de datos local SQLite con motor nativo de Node.js 22 (`node:sqlite`) y modo WAL activo.
- [x] Motor de respaldos en caliente sin bloqueo mediante `VACUUM INTO` (`backupService.ts`).
- [x] Cliente REST tipado para HikCentral Connect Gateway de Syscom (`hikconnect.ts`).
- [x] SyncWorker en segundo plano: revocación automática a medianoche y Startup Catch-up (`syncWorker.ts`).
- [x] Lanzador de un solo clic para Windows (`iniciar.bat`).

---

## 🟢 Fase 2: Desacoplamiento Modular & Autonomía Offline (Completada al 100%)
- [x] **Desacoplamiento de Base de Datos:** Migración modular en SQLite a tres dominios:
  - `IAM Core`: personas, credenciales.
  - `AccessCore`: dispositivos, torniquetes, horarios, niveles, eventos.
  - `Gym POS`: gym_planes, gym_membresias, gym_pagos.
- [x] **Autonomía Offline por Hardware:** Inyección obligatoria de `Valid.endTime` en la memoria flash de terminales ISAPI en el instante exacto del cobro (eliminando la dependencia en el cron nocturno).
- [x] **Mapeo Físico de Torniquetes:** Configuración de torniquetes con etiqueta visual, canal de relevador y sentido direccional (`ENTRADA`, `SALIDA`, `BIDIRECCIONAL`).
- [x] **Monitor en Vivo Reactivo (SSE):** Receptor HTTP de eventos ISAPI en backend y canal SSE en tiempo real con alertas visuales (Verde/Azul/Rojo) y contador de aforo.
- [x] **Punto de Venta Independiente (Gym POS):** Vista de cobro limpia que emite eventos de dominio hacia AccessCore para activación instantánea.

---

## 🟢 Fase 3: Multi-Cuenta Hik-Connect Teams & UX Renovada (Completada al 100%)
- [x] **Soporte Multi-Cuenta / Multi-Sucursal HCT:**
  - Tabla `cuentas_hct` en SQLite con credenciales por sucursal.
  - Token caching independiente por cuenta en `HikConnectService`.
  - Aprovechamiento del pool gratuito de 100 usuarios y 10 puertas por organización.
- [x] **Sincronización Inteligente de Recursos:**
  - Inserción y actualización automática directa en las tablas activas `dispositivos` y `torniquetes`.
  - Vinculación del `cloud_resource_id` de cada puerta para apertura remota vía OpenAPI `{ remoteControl: { actionType: 1, elementlist: [id] } }`.
  - Clasificación de niveles de acceso en Cloud (sólo lectura, con etiqueta de sucursal) vs Local (editables con horario semanal).
- [x] **Frontend SPA Rediseñado:**
  - Nueva subpestaña `Cuentas Teams` con tarjetas de estado, métricas y botón de sincronización 1-clic.
  - Pestaña `Dispositivos` con métricas en tiempo real (online/offline/LAN/Cloud), alta adaptativa y prueba de conexión/reloj.
  - Pestaña `Torniquetes` con badges de sentido de paso y vinculación enriquecida de hardware.
  - Pestaña `Planes de Gimnasio` con selector clasificado por origen de nivel.
- [x] **Ficha Integral del Socio, Recortador Biométrico 3:4 & Sincronización Manual:**
  - Recortador biométrico 3:4 con silueta antropométrica estándar de cabeza/hombros (`FaceCropperModal.tsx`).
  - Expediente integral del socio (`FichaPersonaModal.tsx`) con visualización de vigencia autónoma (RTC), desglose de puertas y planes asociados.
  - Sincronización 1-clic hacia el checador (`ficha.service.ts`), empaquetando `personInfo` según OpenAPI V2.11 y respetando el rate limit de la OpenAPI.
  - Carga dual de fotografía de carnet desde PC (explorador de archivos JPG/PNG) y cámara web en vivo (`FichaPhotoCarnet.tsx`).
  - Edición atómica de identidad (nombre, apellidos, teléfono, email) con propagación inmediata a terminales Teams y arquitectura preparada para RBAC.
  - Capa de traducción semántica de errores (`TeamsErrorTranslator.ts`) para convertir códigos técnicos crudos (`OPEN000010`, `0x6001`, `0x2006`, `0x3003`, `0x3004`) en explicaciones y guías claras en español.
- [x] **Manual de Operación y Uso (`USER_GUIDE.md`):** Documentación completa pantalla por pantalla, control por control y guías prácticas de flujo.

---

## 🟡 Fase 4: Próximas Mejoras & Expansión Corporativa
- [ ] **Driver Artemis:** Driver nativo para servidores corporativos HikCentral Professional On-Premise.
- [ ] **Tickets Térmicos / PDF:** Generación de recibos de cobro en formato PDF y comando directo para impresoras de 58mm/80mm (ESC/POS).
- [ ] **Respaldo Automático en Nube:** Sincronización secundaria de la carpeta `backups/` hacia Google Drive o Dropbox mediante script desatendido.
- [ ] **Notificaciones WhatsApp:** Mensajes de bienvenida y recordatorio de vencimiento vía API oficial de WhatsApp Business.
