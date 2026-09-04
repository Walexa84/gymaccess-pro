# 🗺️ MAPA DEL PROYECTO: Integración GYMS (GymAccess Pro)

> **Propósito del Workspace:** Software comercial para administración de gimnasios (clientes, membresías, cobros) con soporte multi-driver de hardware biométrico facial Hikvision: Cloud (Hik-Connect Teams OpenAPI), Local Directo sin Internet (Hikvision ISAPI LAN) y Servidor Corporativo (HikCentral Professional Artemis).

---

## 📁 Estructura Completa de Archivos

```plaintext
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
│   │   │   ├── database.ts      # Conexión nativa node:sqlite en modo WAL con defaults multi-driver
│   │   │   └── schema.sql       # Tablas (socios, membresias, pagos, configuracion, accesos)
│   │   ├── services/
│   │   │   ├── hardwareDriver.ts     # Interfaz abstracta IHardwareDriver para desacople total
│   │   │   ├── hardwareManager.ts    # Gestor unificado con conmutación de driver en caliente
│   │   │   ├── hikconnectDriver.ts   # Adaptador para Hik-Connect Teams Cloud OpenAPI
│   │   │   ├── hikvisionIsapi.ts     # Driver nativo HTTP Digest ISAPI para checadores LAN directos
│   │   │   ├── hikcentralProDriver.ts# Driver para servidores On-Premise HikCentral Pro (Artemis)
│   │   │   ├── mockDriver.ts         # Driver simulado para demostraciones y pruebas sin hardware
│   │   │   ├── hikconnect.ts         # Cliente base HikCentral Connect OpenAPI V2.11.800
│   │   │   ├── backupService.ts      # Respaldos en caliente atómicos (VACUUM INTO)
│   │   │   └── syncWorker.ts         # Demonio de tolerancia cero (Startup Catch-up + Medianoche)
│   │   └── routes/
│   │       ├── auth.ts          # Autenticación de operadores de recepción
│   │       ├── socios.ts        # CRUD de socios y carga de fotos faciales vía HardwareManager
│   │       ├── pagos.ts         # Cobro de membresías, asignación de nivel y vigencia en hardware
│   │       ├── planes.ts        # Catálogo de planes y vinculación con nivel_acceso_id
│   │       ├── topology.ts      # CRUD de Áreas, Terminales (Entrada/Salida), Horarios y Niveles de Acceso
│   │       ├── hardware.ts      # Endpoints multi-modo (configuración, telemetría y sincronización de reloj)
│   │       ├── backups.ts       # Generación y descarga de copias de seguridad
│   │       └── dashboard.ts     # KPIs y monitor de entradas en vivo
│   │
│   └── client/                  # Frontend SPA (React + Tailwind CSS)
│       ├── index.html           # Plantilla base con Google Fonts (Outfit, Plus Jakarta)
│       ├── main.tsx             # Montaje de React
│       ├── App.tsx              # Navegación principal con ThemeProvider y 4 pestañas limpias
│       ├── context/
│       │   └── ThemeContext.tsx # Conmutador reactivo y persistencia de temas (Cyber-Gym / Clean Sport)
│       ├── components/
│       │   ├── Navbar.tsx       # Barra superior con segundero en vivo, telemetría de reloj del checador y navegación
│       │   └── WebcamModal.tsx  # Enrolamiento facial directo con cámara web
│       └── pages/
│           ├── Dashboard.tsx    # Monitor de recepción y KPIs de alto contraste
│           ├── Socios.tsx       # Directorio de socios con filtros y modal de alta
│           ├── Cobro.tsx        # Punto de venta y reactivación biométrica
│           └── Configuracion.tsx# Panel unificado: Hardware/Reloj, Áreas/Terminales, Horarios/Niveles y Respaldos
│
├── dist/client/                 # Bundle compilado de producción servido por Express
├── CODEBASE_MAP.md              # Mapa vivo de arquitectura y módulos
├── FUNCTIONAL_MAP.md            # Especificación funcional completa de producto
├── USER_GUIDE.md                # Manual de Operación y Uso para el usuario final
└── HIKCONNECT_API_REFERENCE.md  # Catálogo oficial de 44 endpoints de Syscom
```

---

## 🏛️ Guías y Documentación de Referencia

1. **[FUNCTIONAL_MAP.md](file:///c:/Users/Mario/Documents/Proyectos%20IA/Integracion%20GYMS/FUNCTIONAL_MAP.md):** Mapa funcional detallado con UX, pantallas y reglas de negocio.
2. **[USER_GUIDE.md](file:///c:/Users/Mario/Documents/Proyectos%20IA/Integracion%20GYMS/USER_GUIDE.md):** Manual de operación detallado pantalla por pantalla.
3. **[HIKCONNECT_API_REFERENCE.md](file:///c:/Users/Mario/Documents/Proyectos%20IA/Integracion%20GYMS/HIKCONNECT_API_REFERENCE.md):** Referencia completa de los 44 endpoints de HikCentral Connect.
4. **[iniciar.bat](file:///c:/Users/Mario/Documents/Proyectos%20IA/Integracion%20GYMS/iniciar.bat):** Lanzador de 1 clic para que cualquier gimnasio lo ejecute sin complicaciones técnicas.
