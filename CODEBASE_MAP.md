# 🗺️ MAPA DEL PROYECTO: Integración GYMS (GymAccess Pro)

> **Propósito del Workspace:** Software local comercial para administración de gimnasios (clientes, membresías, cobros) con sincronización automática de hardware y control biométrico facial Hikvision (HikCentral Connect OpenAPI V2.11.800).

---

## 📁 Estructura Completa de Archivos

\\plaintext
Integracion GYMS/
├── iniciar.bat                  # Lanzador Windows de 1 clic (abre navegador y arranca servidor)
├── package.json                 # Dependencias (Node 22, Express, React, Tailwind, Lucide)
├── tsconfig.json                # Configuración TypeScript para cliente
├── tsconfig.server.json         # Configuración TypeScript para servidor
├── vite.config.ts               # Bundler Vite con proxy hacia API
├── tailwind.config.js           # Estilos modernos Tailwind
│
├── data/
│   └── gym.db                   # Base de datos SQLite local (modo WAL)
├── backups/                     # Copias de seguridad atómicas fechadas (.db)
├── uploads/                     # Fotografías faciales de socios
│
├── src/
│   ├── server/                  # Backend Local (Node.js + Express)
│   │   ├── index.ts             # Punto de entrada HTTP y servicios (Puerto 3000)
│   │   ├── db/
│   │   │   ├── database.ts      # Conexión nativa node:sqlite en modo WAL
│   │   │   └── schema.sql       # Tablas (socios, membresias, pagos, configuracion, accesos)
│   │   ├── services/
│   │   │   ├── hikconnect.ts    # Cliente oficial HikCentral Connect OpenAPI V2.11.800
│   │   │   ├── backupService.ts # Respaldos en caliente atómicos (VACUUM INTO)
│   │   │   └── syncWorker.ts    # Demonio de tolerancia cero (Startup Catch-up + Medianoche)
│   │   └── routes/
│   │       ├── auth.ts          # Autenticación de operadores de recepción
│   │       ├── socios.ts        # CRUD de socios y carga de fotos faciales
│   │       ├── pagos.ts         # Cobro de membresías y activación inmediata de acceso
│   │       ├── planes.ts        # Catálogo de planes y precios
│   │       ├── hardware.ts      # Conexión y prueba con Hikvision AK/SK
│   │       ├── backups.ts       # Generación y consulta de copias de seguridad
│   │       └── dashboard.ts     # KPIs y monitor de entradas en vivo
│   │
│   └── client/                  # Frontend SPA (React + Tailwind CSS)
│       ├── index.html           # Plantilla base con Google Fonts (Outfit, Plus Jakarta)
│       ├── main.tsx             # Montaje de React
│       ├── App.tsx              # Navegación principal por pestañas con ThemeProvider
│       ├── context/
│       │   └── ThemeContext.tsx # Conmutador reactivo y persistencia de temas (Cyber-Gym / Clean Sport)
│       ├── components/
│       │   ├── Navbar.tsx       # Barra superior con conmutador de temas y estado de terminal
│       │   └── WebcamModal.tsx  # Enrolamiento facial directo con cámara web
│       └── pages/
│           ├── Dashboard.tsx    # Monitor de recepción y KPIs de alto contraste
│           ├── Socios.tsx       # Directorio de socios con filtros y modal de alta
│           ├── Cobro.tsx        # Punto de venta y reactivación biométrica
│           ├── Hardware.tsx     # Asistente de configuración HikCentral
│           └── Backups.tsx      # Gestión de copias de seguridad
│
├── dist/client/                 # Bundle compilado de producción servido por Express
├── CODEBASE_MAP.md              # Mapa vivo de arquitectura y módulos
├── FUNCTIONAL_MAP.md            # Especificación funcional completa de producto
└── HIKCONNECT_API_REFERENCE.md  # Catálogo oficial de 44 endpoints de Syscom
\
---

## 🏛️ Guías y Documentación de Referencia

1. **[FUNCTIONAL_MAP.md](file:///c:/Users/Mario/Documents/Proyectos%20IA/Integracion%20GYMS/FUNCTIONAL_MAP.md):** Mapa funcional detallado con UX, pantallas y reglas de negocio.
2. **[HIKCONNECT_API_REFERENCE.md](file:///c:/Users/Mario/Documents/Proyectos%20IA/Integracion%20GYMS/HIKCONNECT_API_REFERENCE.md):** Referencia completa de los 44 endpoints de HikCentral Connect (tokens, torniquetes, fotos faciales y errores).
3. **[iniciar.bat](file:///c:/Users/Mario/Documents/Proyectos%20IA/Integracion%20GYMS/iniciar.bat):** Lanzador de 1 clic para que cualquier gimnasio lo ejecute sin complicaciones técnicas.
