# 🗺️ MAPA DEL PROYECTO: Integración GYMS (GymAccess Pro V2.5)

> **Propósito del Workspace:** Software comercial para administración de gimnasios (clientes, membresías, cobros) con motor de control de acceso agnóstico (**AccessCore**) compatible con hardware biométrico facial Hikvision: Nube Multi-Cuenta (**Hik-Connect Teams OpenAPI Multi-Tenant**), Local Directo sin Internet (**Hikvision ISAPI LAN**) y Servidor Corporativo (**HikCentral Professional Artemis**).

---

## 📁 Estructura Completa del Repositorio

```plaintext
Integracion GYMS/
├── iniciar.bat                  # Lanzador Windows de 1 clic (arranca servidor y abre navegador)
├── package.json                 # Dependencias (Node 22, Express, React 18, Tailwind, Lucide)
├── tsconfig.json                # Configuración TypeScript para React Vite
├── tsconfig.server.json         # Configuración TypeScript para backend Express
├── vite.config.ts               # Bundler Vite con proxy hacia API backend
├── tailwind.config.js           # Estilos Tailwind CSS
│
├── data/
│   └── gym.db                   # Base de datos SQLite local (modo WAL nativo)
├── backups/                     # Copias de seguridad atómicas fechadas (.db vía VACUUM INTO)
├── uploads/                     # Fotografías faciales de socios y credenciales
│
├── src/
│   ├── server/                  # Backend Modular (Node.js 22 LTS + Express)
│   │   ├── index.ts             # Punto de entrada HTTP, Express, SSE y servicios (Puerto 3000)
│   │   │
│   │   ├── db/
│   │   │   ├── database.ts      # Conexión nativa node:sqlite en modo WAL, auto-migración y saneamiento
│   │   │   └── schema.sql       # Tablas DDL (cuentas_hct, dispositivos, torniquetes, niveles_acceso, personas, gym_planes, etc.)
│   │   │
│   │   ├── modules/             # Arquitectura Modular Desacoplada (Dominio por Contextos)
│   │   │   ├── access/          # Subdominio AccessCore (Control de Acceso Físico)
│   │   │   │   ├── access.service.ts     # Orquestador de hardware, torniquetes, niveles y cuentas HCT
│   │   │   │   ├── sucursales.service.ts # Orquestador de Sucursales/Gimnasios y asignación multicuenta
│   │   │   │   ├── access.routes.ts      # Endpoints REST (/api/access/*)
│   │   │   │   ├── isapi.listener.ts     # Receptor de eventos HTTP Digest ISAPI
│   │   │   │   └── sse.manager.ts        # Canal SSE en tiempo real para el monitor de recepción
│   │   │   │
│   │   │   ├── audit/           # Subdominio Bitácora & Auditoría (Clean Architecture Independiente)
│   │   │   │   ├── audit.types.ts        # Contratos genéricos de eventos (ACCESO, CAJA, MEMBRESIA, HARDWARE)
│   │   │   │   ├── audit.service.ts      # Registro resiliente, consultas paginadas y métricas del día
│   │   │   │   ├── audit.routes.ts       # Endpoints REST (/api/audit/*)
│   │   │   │   └── README.md             # Directiva arquitectónica: agnóstico del giro de negocio y migrable
│   │   │   │
│   │   │   ├── iam/             # Subdominio IAM Core (Directorio Central de Personas)
│   │   │   │   ├── iam.service.ts         # Lógica de enrolamiento y fotografía facial
│   │   │   │   ├── cortesias.service.ts   # Motor de Cortesías (Trial 1 día, límite vitalicio 3 por ID, anti-abuso)
│   │   │   │   ├── teamsPerson.service.ts # Sincronización en vivo, triaje, importación y purga con Teams
│   │   │   │   ├── ficha.service.ts       # Ficha integral del socio, actualización de foto biométrica y push a Teams
│   │   │   │   └── iam.routes.ts          # Endpoints REST (/api/iam/*)
│   │   │   │
│   │   │   ├── config/          # Subdominio Configuración & White-Label (Identidad y Marca)
│   │   │   │   ├── branding.service.ts    # Persistencia de identidad de marca, logo y preferencias en SQLite
│   │   │   │   └── branding.routes.ts     # Endpoints REST (/api/config/branding/*)
│   │   │   │
│   │   │   └── gym_pos/         # Subdominio Gym POS (Punto de Venta e Inyección de Vigencia)
│   │   │       ├── pos.service.ts     # Cobro de planes y transmisión inmediata de Valid.endTime
│   │   │       └── pos.routes.ts      # Endpoints REST (/api/pos/*)
│   │   │
│   │   ├── services/            # Controladores de Hardware y Utilidades
│   │   │   ├── hikconnect.ts         # Cliente Hik-Connect Teams OpenAPI con caché de tokens Multi-Tenant
│   │   │   ├── hikvisionIsapi.ts     # Driver ISAPI HTTP Digest nativo para checadores LAN directos
│   │   │   ├── hikconnectDriver.ts   # Adaptador IHardwareDriver para Teams Cloud
│   │   │   ├── hikcentralProDriver.ts# Driver para servidores Artemis On-Premise
│   │   │   ├── telemetryService.ts   # Auditoría de latencias en ms, HTTP status y códigos OpenAPI
│   │   │   ├── teamsErrorTranslator.ts# Traductor semántico de errores OpenAPI a explicaciones humanas
│   │   │   ├── hardwareDriver.ts     # Interfaz abstracta IHardwareDriver
│   │   │   ├── hardwareManager.ts    # Gestor unificado con conmutación en caliente
│   │   │   ├── backupService.ts      # Generador de respaldos atómicos en caliente
│   │   │   └── syncWorker.ts         # Demonio de auditoría de vigencias y latidos periódicos de hardware
│   │   │
│   │   └── routes/              # Rutas de soporte del sistema
│   │       ├── auth.ts          # Autenticación de operadores
│   │       ├── backups.ts       # Creación, descarga directa a USB/PC y restauración atómica de copias
│   │       └── hardware.ts      # Diagnóstico, reloj y telemetría de hardware
│   │
│   └── client/                  # Frontend SPA (React 18 + Tailwind CSS)
│       ├── index.html           # Plantilla HTML con fuentes Outfit y Plus Jakarta
│       ├── main.tsx             # Punto de entrada ReactDOM
│       ├── App.tsx              # Router, barra superior y sondeo dinámico de salud de hardware
│       ├── context/
│       │   ├── ThemeContext.tsx    # Contexto de temas visuales
│       │   └── BrandingContext.tsx # Contexto de marca White-Label, CSS variables dinámicas y audio sintetizado
│       │
│       ├── components/
│       │   ├── Navbar.tsx       # Barra de navegación con logo dinámico, reloj y LED de hardware
│       │   ├── WebcamModal.tsx  # Modal de captura facial directa con webcam
│       │   ├── iam/
│       │   │   ├── NuevaPersonaModal.tsx  # Alta unificada (Socio, Staff o Cortesía) con carnet y biometría
│       │   │   ├── FaceCropperModal.tsx   # Recortador biométrico 3:4 con silueta antropométrica
│       │   │   ├── FichaPersonaModal.tsx  # Expediente integral con edición de datos y forzar envío
│       │   │   ├── FichaPhotoCarnet.tsx   # Visualizador 3:4 con botones de carga PC y Webcam
│       │   │   ├── FichaVigenciaCard.tsx  # Tarjeta de vigencia, días restantes y botones rápidos
│       │   │   ├── FichaZonasList.tsx     # Selector de zonas y puertas de acceso autorizadas
│       │   │   └── TeamsSyncModal.tsx     # Buzón de triaje, importación y purga de checador Teams
│       │   └── config/          # Subpestañas modulares de Configuración (<500 líneas c/u)
│       │       ├── BrandingTab.tsx        # Identidad & Marca: Logo, nombre, lema, colores, tickets y audio
│       │       ├── SucursalesTab.tsx      # Gestión de Sucursales y Gimnasios (asigna terminales de N cuentas)
│       │       ├── CuentasHctTab.tsx      # Gestión Multi-Cuenta HCT (100 usuarios gratis por org) y renombrado
│       │       ├── NivelesAccesoTab.tsx   # Niveles de acceso y vinculación con torniquetes
│       │       ├── PaquetesTab.tsx        # Paquetes comerciales y selección de puertas de acceso
│       │       ├── RespaldosTab.tsx       # Copias de seguridad atómicas SQLite WAL en caliente
│       │       └── TelemetriaDrawer.tsx   # Bitácora en vivo de latencias OpenAPI y códigos de error
│       │
│       └── pages/
│           ├── Monitor.tsx          # Monitor en vivo con alertas visuales y pase en torniquetes
│           ├── Personas.tsx         # Directorio central de personas (IAM Core con insignias y cortesías)
│           ├── Bitacora.tsx         # Bitácora & Auditoría del sistema (Cruces físicos y operaciones)
│           ├── Cobro.tsx            # Punto de venta y activación inmediata de torniquetes
│           ├── Configuracion.tsx    # Panel de Control de Acceso Físico (Sedes, Cuentas Teams, Niveles)
│           └── AjustesGenerales.tsx # Panel de Configuración General (Marca, Paquetes, Respaldos)
│
├── dist/client/                 # Bundle web compilado para producción
├── USER_GUIDE.md                # Manual de Operación y Guía de Usuario pantalla por pantalla
├── CODEBASE_MAP.md              # Este mapa vivo de arquitectura
├── BACKLOG.md                   # Control de fases y tareas del proyecto
└── HIKCONNECT_API_REFERENCE.md  # Catálogo oficial de endpoints HikCentral Connect
```

---

## 🗄️ Esquema de Base de Datos Principal (`data/gym.db`)

| Tabla | Propósito | Llaves Foráneas / Campos Clave |
| :--- | :--- | :--- |
| `sucursales` | Sedes o gimnasios físicos del negocio | `id`, `nombre`, `direccion`, `telefono`, `activa` |
| `sucursal_dispositivos` | Asociación M:N entre sucursales y dispositivos de múltiples cuentas | `sucursal_id`, `dispositivo_id` |
| `gym_plan_sucursales` | Cobertura multi-sucursal por plan de membresía | `plan_id`, `sucursal_id` |
| `cuentas_hct` | Gestión Multi-Cuenta / Multi-Sucursal de Hik-Connect Teams | `id`, `nombre`, `app_key`, `secret_key`, `base_url`, `activa`, `ultimo_sync` |
| `dispositivos` | Checadores físicos (ISAPI LAN o Teams Cloud) | `id`, `cuenta_hct_id` ➔ `cuentas_hct(id)`, `ip`, `puerto`, `cloud_serial`, `estado_conexion` |
| `torniquetes` | Carriles físicos de paso y relevadores | `id`, `dispositivo_id` ➔ `dispositivos(id)`, `canal_relevador`, `direccion`, `cloud_resource_id` |
| `niveles_acceso` | Grupos de puertas autorizadas (Cloud o Local) | `id`, `cuenta_hct_id` ➔ `cuentas_hct(id)`, `cloud_level_id`, `origen` (`TEAMS` / `LOCAL`) |
| `personas` | Directorio maestro de identidades | `id`, `nombre`, `telefono` (opcional con índice parcial), `tipo` (`SOCIO`, `EMPLEADO`, `VISITANTE`), `foto_url` |
| `gym_planes` | Catálogo comercial de membresías | `id`, `nombre`, `precio`, `duracion_dias`, `nivel_acceso_id` ➔ `niveles_acceso(id)` |
| `gym_membresias`| Estado de suscripción del socio | `id`, `persona_id` ➔ `personas(id)`, `plan_id` ➔ `gym_planes(id)`, `fecha_inicio`, `fecha_fin` |
| `gym_pagos` | Registro de transacciones financieras | `id`, `membresia_id` ➔ `gym_membresias(id)`, `monto`, `metodo_pago`, `folio` |
| `eventos_acceso`| Bitácora cronológica de cruces físicos | `id`, `persona_id`, `torniquete_id`, `tipo_evento` (`CONCEDIDO`, `DENEGADO_VENCIDO`, `DENEGADO_DESCONOCIDO`, `APERTURA_MANUAL`), `direccion` |
| `eventos_auditoria`| Auditoría desacoplada e independiente del sistema | `id`, `modulo`, `accion`, `usuario_id`, `persona_id`, `detalles`, `resultado`, `metadata_json`, `fecha_hora` |

---

## 🔌 Matriz de Endpoints REST Clave

- **Multi-Cuenta Teams & Dispositivos:**
  - `GET /api/access/cuentas-hct` ➔ Lista de cuentas con métricas y estado.
  - `POST /api/access/cuentas-hct/:id/sync` ➔ Sincronización 1-clic de checadores, puertas y niveles de esa cuenta.
  - `POST /api/access/dispositivos/:id/test` ➔ Prueba en vivo de comunicación LAN ISAPI o Cloud Teams.
  - `POST /api/access/torniquetes/:id/open` ➔ Apertura manual desde recepción (registra `APERTURA_MANUAL`, SSE y audita).
- **IAM Core & Cortesías:**
  - `GET /api/iam/personas` ➔ Búsqueda y listado con vigencias y cortesías usadas.
  - `GET /api/iam/personas/buscar-duplicados` ➔ Detección preventiva de personas por nombre/apellidos.
  - `POST /api/iam/personas/:id/cortesia` ➔ Otorgar cortesía de 1 día (aplica candado estricto `< 3` vitalicias).
  - `GET /api/iam/personas/:id/cortesias` ➔ Consulta de cortesías usadas y restantes por ID.
- **Bitácora & Auditoría Desacoplada:**
  - `GET /api/audit/metricas` ➔ Métricas en tiempo real del día (concedidos, denegados, aperturas manuales, cortesías).
  - `GET /api/audit/accesos` ➔ Cruces físicos en torniquetes con filtros por evento y fecha.
  - `GET /api/audit/eventos` ➔ Bitácora de operaciones del sistema (Caja, Cortesías, Altas, Hardware).
- **Vigencia y POS:**
  - `POST /api/pos/cobrar` ➔ Registro de cobro e inyección instantánea de `Valid.endTime` en hardware.
  - `GET /api/access/stream` ➔ Canal Server-Sent Events (SSE) con eventos reactivos para el monitor.
