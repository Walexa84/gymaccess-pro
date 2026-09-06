# 🏛️ ESPECIFICACIÓN TÉCNICA DE REFACTORIZACIÓN ARQUITECTÓNICA
## AccessCore (Motor Agnóstico de Control de Acceso) & Gym POS (Punto de Venta Modular)

> **Versión del Documento:** 2.0.0-PROPOSAL  
> **Fecha:** Septiembre 2026  
> **Estado:** Documento Maestro de Diseño y Auditoría Técnica  

---

## 1. 🔍 AUDITORÍA RADICAL: ERRORES DE LÓGICA Y DISEÑO EN LA VERSIÓN ACTUAL

Tras una auditoría exhaustiva línea por línea del código fuente actual (`schema.sql`, `socios.ts`, `pagos.ts`, `syncWorker.ts`, `hikvisionIsapi.ts`, `hikconnect.ts`), se identificaron **5 fallos críticos de arquitectura y lógica operativa**:

### 🔴 Error 1: Autonomía Offline Rota por Dependencia en Demonio Nocturno (Falsa Seguridad)
- **El Fallo:** En `src/server/services/syncWorker.ts`, el sistema utiliza un cron job (`cron.schedule('5 0 0 * * *')`) que busca en SQLite socios vencidos y manda una petición de red a la terminal para quitarles el acceso. Al crear o cobrar en `pagos.ts` o `socios.ts`, el campo `Valid.endTime` en la terminal se llenaba con `2037-12-31T23:59:59` o se omitía.
- **Riesgo Operativo Crítico:** En gimnasios o empresas, **la recepcionista apaga la computadora al cerrar en la noche**. Si el servidor está apagado a las 00:00:05, el cron job NUNCA se ejecuta. A las 06:00 AM del día siguiente, el socio vencido llega, el servidor aún está apagado, y el checador **LE DA ACCESO LIBRE** porque en su memoria Flash interna la fecha de vencimiento es el año 2037.
- **Solución Correcta:** El checador facial MinMoe (Hikvision ISAPI) tiene un procesador embebido y un reloj RTC independiente. **Desde el segundo en que se cobra la membresía**, se debe inyectar la fecha y hora exacta de corte en el hardware:  
  `Valid: { enable: true, beginTime: "2026-09-06T00:00:00", endTime: "2026-10-06T23:59:59", timeType: "local" }`.  
  De esta forma, aunque el servidor pase 6 meses apagado o sin internet, **el checador físico bloquea el torniquete a las 00:00:01 del día 7 de octubre de forma 100% autónoma**.

### 🔴 Error 2: Acoplamiento de la Identidad con la Venta de Gimnasio
- **El Fallo:** La tabla `socios` agrupa datos de identidad (nombre, teléfono, foto), credenciales de hardware (`hik_person_id`) y estado comercial (`VIGENTE`, `VENCIDO`).
- **Riesgo:** Imposibilita utilizar este sistema para un edificio corporativo, una escuela o una fábrica. Además, impide que una persona tenga dos roles a la vez (ejemplo: un entrenador que es Empleado con acceso 24/7 y a la vez Cliente de un plan especial).
- **Solución:** Arquitectura IAM (*Identity & Access Management*):
  - `personas`: El ser humano (identidad, nombre, teléfono, foto).
  - `credenciales`: Sus llaves de acceso (rostro biométrico, tarjeta RFID, PIN).
  - `gym_socios` / `gym_membresias`: Su contrato comercial en la vertical de gimnasio.

### 🔴 Error 3: Monitoreo "En Vivo" Pasivo y Ciego
- **El Fallo:** En `Dashboard.tsx`, el frontend hace un `fetch('/api/dashboard/stats')` cada 10 segundos. Sin embargo, en el backend, la tabla `accesos_log` **únicamente se alimentaba cuando el cron de medianoche revocaba a alguien**.
- **Riesgo:** La pantalla de monitoreo no mostraba las checadas reales de los socios al cruzar el torniquete.
- **Solución:** Implementar un **Receptor HTTP de Eventos ISAPI (Webhook)** en el backend y un canal **Server-Sent Events (SSE)** hacia React. Cada vez que alguien mira la pantalla del checador, el equipo lanza un POST HTTP con la foto y el ID en < 50ms, apareciendo en pantalla al instante.

### 🔴 Error 4: Supuesto Erróneo sobre la API de Hik-Connect Teams (HCT)
- **El Fallo:** Se pretendía crear horarios y niveles de acceso arbitrarios por API hacia Hik-Connect Teams Cloud.
- **Realidad de la API:** La especificación oficial de Syscom (`HikCentral Connect OpenAPI V2.11.800`) **NO incluye endpoints para crear o modificar plantillas de horarios (`schedules`) ni crear niveles de acceso dinámicamente**. Solo permite:
  1. `POST /api/hccgw/acspm/v1/accesslevel/list` (Consultar los niveles existentes).
  2. `POST /api/hccgw/acspm/v1/personaccess/assign` (Vincular un nivel existente a una persona).
- **En Contraste (ISAPI Local):** La terminal MinMoe local **SÍ cuenta con endpoints completos** para crear plantillas semanales (`WeekPlanCfg`) y plantillas de horarios (`ScheduleTemplate`).
- **Solución:** Estrategia adaptativa:
  - En **Modo Local ISAPI**: Nuestra aplicación gestiona y crea los horarios y niveles directo en la memoria del hardware.
  - En **Modo Hik-Connect Teams**: La aplicación mapea y lista los niveles configurados en el portal Teams, y gobierna la asignación de vigencias y permisos a las personas por API.
  - En **Modo HikCentral Professional (Artemis - Futuro)**: Se utilizará el CRUD completo de plantillas y grupos de privilegios (`/artemis/api/acs/v1/schedule/timeSchedule` y `/privilege/group`).

### 🔴 Error 5: Falta de Abstracción entre Terminal Física y Punto de Paso (Torniquete)
- **El Fallo:** La tabla `terminales` mezclaba la dirección IP del hardware con el concepto de "puerta" o "dirección".
- **Realidad de Campo:** Una terminal facial o un panel de acceso (ej. Hikvision DS-K2604 o DS-K2802) puede gobernar múltiples relevadores y recibir múltiples lectores (Lector 1: Entrada, Lector 2: Salida). O bien, un torniquete bidireccional tiene dos terminales faciales montadas (una viendo hacia afuera y otra hacia adentro).
- **Solución:** Separar `dispositivos` (hardware físico IP/Cloud) de `torniquetes_puertas` (punto de paso físico, canal, sentido de circulación: ENTRADA / SALIDA).

---

## 2. 🏛️ ARQUITECTURA MODULAR (BOUNDED CONTEXTS)

El nuevo diseño se estructura como un **Monolito Modular en 3 Capas Aisladas**:

```
+-------------------------------------------------------------------------+
|                         GYMACCESS PRO SUITE                             |
+-------------------------------------------------------------------------+
                                     |
    +--------------------------------+--------------------------------+
    |                                |                                |
    v                                v                                v
+-----------------------+  +-----------------------+  +-----------------------+
|  1. IAM CORE          |  |  2. ACCESSCORE ENGINE |  |  3. GYM POS VERTICAL  |
|  (Directorio Central) |  |  (Control de Acceso)  |  |  (Punto de Venta)     |
+-----------------------+  +-----------------------+  +-----------------------+
| - Personas            |  | - Dispositivos HW     |  | - Catálogo de Planes  |
| - Fotos Biométricas   |  | - Torniquetes/Puertas |  | - Membresías Activas  |
| - Tarjetas RFID / PIN |  | - Horarios (Schedules)|  | - Cobro y Pagos       |
| - Categorías (Staff,  |  | - Niveles de Acceso   |  | - Tickets y Recibos   |
|   Socios, Visitas)    |  | - Sincronizador Edge  |  | - Cortes de Caja      |
|                       |  | - Monitor en Vivo SSE |  |                       |
+-----------------------+  +-----------------------+  +-----------------------+
            ^                                  ^                                  ^
            |                                  |                                  |
            +------------- EVENTOS ------------+----------------------------------+
              • Al cobrar membresía -> Emite: MembershipGranted(personaId, nivelId, fechaFin)
              • AccessCore recibe evento -> Inyecta Valid.endTime en el Checador Físico
              • Checador detecta rostro -> Emite Webhook HTTP a AccessCore
              • AccessCore hace Push SSE -> Monitor en Vivo de Recepción muestra el pase
```

---

## 3. 💾 NUEVO ESQUEMA DE BASE DE DATOS RELACIONAL (SQLITE WAL DDL)

```sql
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. NÚCLEO DE IDENTIDAD Y DIRECTORIO CENTRAL (IAM CORE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL, -- Identificador único visible (ej. PER-1001)
  nombre TEXT NOT NULL,
  apellidos TEXT,
  telefono TEXT UNIQUE NOT NULL,
  email TEXT,
  foto_url TEXT,
  tipo TEXT CHECK(tipo IN ('SOCIO', 'EMPLEADO', 'VISITANTE', 'PROVEEDOR')) DEFAULT 'SOCIO',
  notas TEXT,
  activo INTEGER DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credenciales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  tipo TEXT CHECK(tipo IN ('FACIAL', 'TARJETA_RFID', 'PIN', 'QR')) NOT NULL,
  valor TEXT NOT NULL, -- Hash facial, número de tarjeta RFID, PIN o token QR
  activa INTEGER DEFAULT 1,
  fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. MOTOR DE CONTROL DE ACCESO FÍSICO (ACCESSCORE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dispositivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL, -- ej. "MinMoe Torniquete Principal"
  driver TEXT CHECK(driver IN ('ISAPI_LOCAL', 'HCT_CLOUD', 'HCP_ARTEMIS', 'SIMULADO')) NOT NULL,
  ip TEXT,
  puerto TEXT DEFAULT '80',
  usuario TEXT DEFAULT 'admin',
  password TEXT,
  cloud_serial TEXT,
  firmware_version TEXT,
  estado_conexion TEXT CHECK(estado_conexion IN ('ONLINE', 'OFFLINE', 'ERROR')) DEFAULT 'OFFLINE',
  ultimo_ping DATETIME,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS torniquetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo_id INTEGER NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
  canal_relevador INTEGER DEFAULT 1, -- Canal 1, Canal 2 de la placa/terminal
  nombre TEXT NOT NULL, -- ej. "Torniquete 1 - Entrada"
  direccion TEXT CHECK(direccion IN ('ENTRADA', 'SALIDA', 'BIDIRECCIONAL')) NOT NULL DEFAULT 'ENTRADA',
  ubicacion_area TEXT, -- ej. "Acceso Principal", "Área de Pesas"
  tiempo_apertura_seg INTEGER DEFAULT 3,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS horarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL, -- ej. "Horario Completo 24/7", "Matutino L-V"
  isapi_template_no INTEGER, -- Número de plantilla en checador ISAPI (1 a 8)
  dias_semana TEXT DEFAULT 'L,M,X,J,V,S,D',
  hora_inicio TEXT DEFAULT '06:00',
  hora_fin TEXT DEFAULT '23:00',
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS niveles_acceso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL, -- ej. "Acceso General Gimnasio", "Staff Administrativo"
  descripcion TEXT,
  cloud_level_id TEXT, -- ID asignado en Hik-Connect Teams si aplica
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS nivel_acceso_torniquetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nivel_id INTEGER NOT NULL REFERENCES niveles_acceso(id) ON DELETE CASCADE,
  torniquete_id INTEGER NOT NULL REFERENCES torniquetes(id) ON DELETE CASCADE,
  horario_id INTEGER REFERENCES horarios(id) ON DELETE SET NULL,
  UNIQUE(nivel_id, torniquete_id)
);

CREATE TABLE IF NOT EXISTS persona_autorizaciones_acceso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  nivel_id INTEGER NOT NULL REFERENCES niveles_acceso(id) ON DELETE CASCADE,
  fecha_inicio DATETIME NOT NULL,
  fecha_fin DATETIME NOT NULL, -- Fecha inyectada en el checador físico (Valid.endTime)
  estado_sincronizacion TEXT CHECK(estado_sincronizacion IN ('SINCRONIZADO', 'PENDIENTE', 'ERROR')) DEFAULT 'PENDIENTE',
  ultimo_error TEXT,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(persona_id, nivel_id)
);

CREATE TABLE IF NOT EXISTS eventos_acceso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo_id INTEGER REFERENCES dispositivos(id) ON DELETE SET NULL,
  torniquete_id INTEGER REFERENCES torniquetes(id) ON DELETE SET NULL,
  persona_id INTEGER REFERENCES personas(id) ON DELETE SET NULL,
  persona_nombre TEXT,
  persona_foto TEXT,
  tipo_evento TEXT CHECK(tipo_evento IN ('ACCESO_CONCEDIDO', 'DENEGADO_VENCIDO', 'DENEGADO_HORARIO', 'DENEGADO_DESCONOCIDO', 'APERTURA_MANUAL')) NOT NULL,
  direccion TEXT CHECK(direccion IN ('ENTRADA', 'SALIDA', 'DESCONOCIDA')),
  metodo_autenticacion TEXT CHECK(metodo_autenticacion IN ('FACIAL', 'TARJETA', 'PIN', 'REMOTO_SOFTWARE')),
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  foto_evento_url TEXT
);

-- ============================================================================
-- 3. VERTICAL DE NEGOCIO: GESTIÓN DE GIMNASIO & PUNTO DE VENTA (GYM POS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gym_planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL, -- ej. "Mensualidad General", "Visita Diaria", "Trimestre VIP"
  duracion_dias INTEGER NOT NULL,
  precio REAL NOT NULL,
  nivel_acceso_id INTEGER REFERENCES niveles_acceso(id) ON DELETE RESTRICT,
  activo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS gym_membresias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES gym_planes(id),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estatus TEXT CHECK(estatus IN ('VIGENTE', 'VENCIDA', 'CANCELADA')) DEFAULT 'VIGENTE',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE NOT NULL,
  persona_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  membresia_id INTEGER REFERENCES gym_membresias(id) ON DELETE SET NULL,
  plan_id INTEGER NOT NULL REFERENCES gym_planes(id),
  monto REAL NOT NULL,
  metodo_pago TEXT CHECK(metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA')) NOT NULL,
  cajero_usuario_id INTEGER,
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gym_caja_turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cajero_usuario_id INTEGER NOT NULL,
  fondo_inicial REAL DEFAULT 0,
  total_efectivo_sistema REAL DEFAULT 0,
  total_efectivo_declarado REAL,
  diferencia REAL,
  fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre DATETIME,
  estado TEXT CHECK(estado IN ('ABIERTO', 'CERRADO')) DEFAULT 'ABIERTO'
);

-- ============================================================================
-- ÍNDICES DE ALTO RENDIMIENTO PARA BÚSQUEDA Y RECEPCIÓN
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_personas_telefono ON personas(telefono);
CREATE INDEX IF NOT EXISTS idx_personas_codigo ON personas(codigo);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos_acceso(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_gym_membresias_vigencia ON gym_membresias(persona_id, estatus, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_autorizaciones_sync ON persona_autorizaciones_acceso(estado_sincronizacion);
```

---

## 4. 📡 INVESTIGACIÓN A FONDO DE PROTOCOLOS (ISAPI vs HCT vs HCP)

### A) Hikvision Local ISAPI (Checadores MinMoe DS-K1Txxx / Controladores DS-K26xx)

#### 1. Creación de Horarios y Planes Semanales:
- **Endpoint:** `PUT /ISAPI/AccessControl/WeekPlanCfg/1?format=json`
- **Payload para Lunes a Domingo de 06:00 a 23:00:**
```json
{
  "WeekPlanCfg": {
    "enable": true,
    "WeekPlanCfgDetail": [
      {
        "dayOfWeek": 1,
        "enable": true,
        "TimeSegment": { "beginTime": "06:00:00", "endTime": "23:00:00" }
      },
      {
        "dayOfWeek": 2,
        "enable": true,
        "TimeSegment": { "beginTime": "06:00:00", "endTime": "23:00:00" }
      },
      {
        "dayOfWeek": 3,
        "enable": true,
        "TimeSegment": { "beginTime": "06:00:00", "endTime": "23:00:00" }
      },
      {
        "dayOfWeek": 4,
        "enable": true,
        "TimeSegment": { "beginTime": "06:00:00", "endTime": "23:00:00" }
      },
      {
        "dayOfWeek": 5,
        "enable": true,
        "TimeSegment": { "beginTime": "06:00:00", "endTime": "23:00:00" }
      },
      {
        "dayOfWeek": 6,
        "enable": true,
        "TimeSegment": { "beginTime": "07:00:00", "endTime": "20:00:00" }
      },
      {
        "dayOfWeek": 7,
        "enable": true,
        "TimeSegment": { "beginTime": "08:00:00", "endTime": "14:00:00" }
      }
    ]
  }
}
```

#### 2. Autonomía Offline por Hardware (Inyección de Fecha Límite):
- **Endpoint:** `PUT /ISAPI/AccessControl/UserInfo/Modify?format=json`
- **Payload:**
```json
{
  "UserInfo": {
    "employeeNo": "1001",
    "name": "Juan Perez",
    "userType": "normal",
    "Valid": {
      "enable": true,
      "beginTime": "2026-09-06T00:00:00",
      "endTime": "2026-10-06T23:59:59",
      "timeType": "local"
    },
    "doorRight": "1",
    "RightPlan": [
      {
        "doorNo": 1,
        "planTemplateNo": "1"
      }
    ]
  }
}
```
*Comportamiento comprobado:* Cuando el reloj interno del checador supera las `2026-10-06 23:59:59`, la terminal deniega el paso de forma autónoma sin consultar a ningún servidor.

#### 3. Receptor de Eventos en Tiempo Real (Webhook HTTP Push):
La terminal puede configurarse mediante:
- `PUT /ISAPI/Event/notification/httpHosts/1`
Configurando la IP de la computadora de recepción (ej. `192.168.1.50`), puerto `3000` y ruta `/api/access/events/isapi-listener`.
Cada vez que un socio pone la cara, la terminal envía un paquete HTTP POST multipart con los datos del evento (`AccessControllerEvent`) y la imagen de captura en menos de 40 milisegundos.

---

### B) Hik-Connect Teams Cloud (HikCentral Connect Gateway `/api/hccgw/`)

#### 1. Reglas y Límites de la Nube:
- **Niveles de Acceso:** No hay endpoint para crearlos. El instalador crea los niveles en `teams.hik-connect.com` (ejemplo: *"Entrada General"*).
- **Lectura de Niveles:** `POST /api/hccgw/acspm/v1/accesslevel/list` (devuelve el ID y nombre).
- **Asignación de Nivel:** `POST /api/hccgw/acspm/v1/personaccess/assign`
  ```json
  {
    "personId": "684236721751815168",
    "accessLevelIds": ["712398471928374829"]
  }
  ```
- **Vigencia en Nube:** Se gestiona mediante la actualización de la persona o desvinculación del nivel cuando expira su fecha de corte.

---

### C) HikCentral Professional (Artemis On-Premise - Futuro)
- Soporta CRUD completo mediante firmas criptográficas HMAC-SHA256 (`x-ca-key`, `x-ca-signature`).
- Horarios: `POST /artemis/api/acs/v1/schedule/timeSchedule`
- Niveles: `POST /artemis/api/acs/v1/privilege/group`

---

## 5. 🖥️ INTERFAZ DE USUARIO Y EXPERIENCIA OPERATIVA (UX)

La aplicación web en React se reorganiza en **4 Pestañas Maestras Claras y Desacopladas**:

```plaintext
+-----------------------------------------------------------------------------------------------+
|  GymAccess Pro  |  🟢 Monitor En Vivo  |  👥 Personas  |  💳 Caja & Cobro  |  ⚙️ Control Acceso |
+-----------------------------------------------------------------------------------------------+
```

### 1. 🟢 Monitor En Vivo (Recepción)
- **Diseño:** Tarjeta de Gran Tamaño del Último Acceso a la izquierda y Feed histórico a la derecha.
- **Diferenciación de Torniquetes y Dirección:**
  - 🟢 **ENTRADA** (Borde verde esmeralda, icono de flecha hacia adentro):  
    *"Juan Pérez cruzó por Torniquete 1 - Entrada (Membresía Vigente - 14 días restantes)"*.
  - 🔵 **SALIDA** (Borde azul cian, icono de flecha hacia afuera):  
    *"Juan Pérez cruzó por Torniquete 2 - Salida"*.
  - 🔴 **DENEGADO** (Borde rojo carmesí, pitido de alerta en bocina de la PC):  
    *"Carlos Ruiz RECHAZADO en Torniquete 1 (Membresía Vencida desde ayer)"*.
- **Contador de Aforo:** Muestra el número estimado de personas que entraron y no han registrado salida en el día.

### 2. 👥 Personas & Identidades (IAM Core)
- Directorio de todo el personal: Socios del gimnasio, entrenadores, recepcionistas, personal de limpieza y visitas.
- Formulario de Alta con Enrolamiento Facial en Vivo (cámara web).
- Pestaña de Credenciales: Permite agregar tarjeta RFID o código PIN si la terminal cuenta con teclado o lector Mifare.

### 3. 💳 Caja & Cobro (Punto de Venta GYM)
- Búsqueda ultrarrápida de socio.
- Selección del plan a renovar.
- Cobro en efectivo, tarjeta o transferencia.
- Botón grande: **"Cobrar y Activar Paso Inmediato"**.
- Al pulsar el botón, en segundo plano:
  1. Registra el pago en SQLite.
  2. Extiende la membresía.
  3. Llama a `AccessCore.grantAccess(personaId, nivelId, fechaFin)`.
  4. La terminal MinMoe o Teams recibe la nueva vigencia en milisegundos.

### 4. ⚙️ Control de Acceso (AccessCore Workbench)
Subpestañas técnicas para el integrador o dueño:
- **Dispositivos:** Alta de terminales por IP (ISAPI) o por AppKey/SecretKey (Teams Cloud). Botón de prueba de conexión y sincronización de hora.
- **Torniquetes:** Mapeo de cada terminal o relevador: Etiqueta visible (*Torniquete Entrada A*), Canal, Dirección (*Entrada / Salida*).
- **Horarios:** Editor visual de bandas horarias por día de la semana.
- **Niveles de Acceso:** Asignación de qué torniquetes y qué horarios componen cada nivel.
- **Diagnóstico y Apertura Manual:** Botones para abrir torniquetes a distancia en caso de emergencia.

---

## 6. 🔄 PLAN DE MIGRACIÓN Y REFACTORIZACIÓN PASO A PASO

1. **Paso 1 (Esquema y Migración de Datos):**
   - Ejecutar script de migración en `src/server/db/` que copie los datos de la tabla `socios` a `personas` y `gym_membresias`, sin perder un solo cliente ni fotografía.
2. **Paso 2 (Servicios Backend Modularizados):**
   - Crear las carpetas `src/server/modules/iam`, `src/server/modules/access` y `src/server/modules/pos_gym`.
   - Implementar el Webhook de eventos ISAPI y el canal SSE en `access/`.
3. **Paso 3 (Frontend React Desacoplado):**
   - Separar las páginas en `Monitor.tsx`, `Personas.tsx`, `Cobro.tsx` y `ControlAcceso.tsx`.
   - Implementar la vista en vivo con etiquetas de torniquetes y sentido de giro.
4. **Paso 4 (Verificación de Autonomía):**
   - Probar inyección de vigencia con fecha/hora en checador MinMoe local y validar que el corte offline funcione al 100%.
