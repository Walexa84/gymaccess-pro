# 📋 Mapa Funcional — GymAccess Pro (Gestión Local de Gimnasios y Control Biométrico)

## 0. Contexto y Alcance
- **Idea / Propósito:** Software local para administración de gimnasios (clientes, catálogo de planes y cobro de membresías) con automatización integral del control de acceso físico: otorga nivel de acceso a terminales faciales Hikvision exclusivamente a socios con pagos vigentes y revoca el acceso de manera automática e inmediata al vencer la membresía.
- **Plataforma:** Aplicación de Escritorio / Servidor Local con interfaz web en red local (`http://localhost:port`), operada desde la computadora de recepción.
- **Cómo se accede:** Mediante acceso directo en el escritorio de la PC de recepción (abre el navegador o ventana dedicada del sistema). En red local, otros dispositivos del gimnasio (ej. tablet del dueño) pueden conectarse vía IP local.
- **¿Requiere Login?:** Sí. 2 perfiles de usuario:
  - *Administrador / Dueño:* Acceso completo a caja, finanzas, reportes, configuración de planes, respaldo de datos y configuración de terminales Hikvision.
  - *Recepcionista / Staff:* Operación diaria en mostrador: búsqueda rápida de socios, registro de nuevos socios, captura de fotografía facial y cobro de membresías.
- **Dónde se monta:** 100% en la computadora local del gimnasio (bajo consumo, sin costo mensual de servidores en la nube).
- **Mecanismo de Respaldo:** Módulo nativo de Copias de Seguridad Diarias automáticas (exportación de base de datos comprimida a disco local, memoria USB y/o sincronización con almacenamiento en la nube privada como Google Drive o OneDrive).
- **Para quién es:** Dueños y operadores de gimnasios, boxes de crossfit, estudios de artes marciales y academias deportivas que buscan una solución comercial 'empaquetada', fácil de instalar y sin cuotas forzosas recurrentes.
- **Mobile-first / Responsive:** Adaptable a pantallas de escritorio (1366x768 o 1080p en recepción) y tablets en red local.

---

## 1. Mapa de Navegación

```plaintext
[Login / Bloqueo de Sesión]
   │
   ├── [Dashboard / Monitor de Recepción]
   │     ├── Indicador de Estado del Lector Facial (En línea / Fuera de línea)
   │     ├── Feed en Vivo de Accesos (Foto, Nombre, Hora, Resultado: Concedido / Denegado)
   │     ├── Buscador Rápido de Socio (Filtro instantáneo por nombre o teléfono)
   │     └── Acceso Directo a Cobro Rápido
   │
   ├── [Módulo de Socios]
   │     ├── Lista General de Socios (Filtros: Todos, Vigentes, Vencidos)
   │     ├── Alta de Socio (Formulario + Enrolamiento Fotográfico Biométrico)
   │     ├── Ficha Detallada del Socio (Datos personales, historial de membresías, historial de checadas)
   │     └── Modificación / Baja de Socio
   │
   ├── [Módulo de Caja y Cobros]
   │     ├── Terminal Punto de Venta / Cobro de Membresía
   │     ├── Generación / Impresión de Ticket de Pago
   │     └── Historial de Transacciones del Turno
   │
   ├── [Catálogo de Membresías y Planes]
   │     ├── Lista de Planes (Día, Semana, Quincena, Mes, Trimestre, Semestre, Año)
   │     └── Formulario Nuevo / Editar Plan (Nombre, Precio, Días de Vigencia)
   │
   ├── [Control de Acceso y Hardware Hikvision]
   │     ├── Estado de Conexión de Terminales Faciales y Torniquetes
   │     ├── Mapeo de Dispositivos (Entrada / Salida)
   │     └── Sincronización Manual Forzada (Revisa y alinea permisos de todos los socios en 1 clic)
   │
   ├── [Reportes y Métricas]
   │     ├── Corte de Caja Diario / Por Turno
   │     ├── Reporte de Vencimientos Inmediatos
   │     └── Reporte de Afluencia y Horas Pico
   │
   └── [Configuración y Mantenimiento]
         ├── Asistente de Configuración Inicial (Setup Wizard en 3 pasos)
         ├── Credenciales API HikCentral Connect (AppKey, SecretKey, Base URL)
         ├── Configuración de Copias de Seguridad Diarias (Ruta local / externa y hora programada)
         └── Usuarios del Sistema (Gestión de contraseñas y roles)
```

---

## 2. Inventario de Módulos y Pantallas (Ficha por Pantalla)

| Pantalla | Propósito | Controles (Botón / Campo / Selector) | Qué hace / A dónde lleva / Qué valida | Info que captura | Info que emite / Reporte | Con qué interactúa |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P1: Login** | Autenticación del operador en recepción o administrador. | - Campo `Usuario`<br>- Campo `Contraseña`<br>- Botón `Iniciar Turno` | Valida credenciales locales. Registra hora de inicio de turno. Redirige a Dashboard. | Usuario, Contraseña. | Mensaje de error si falla; token de sesión si es válido. | Base de datos local (tabla Usuarios). |
| **P2: Dashboard / Monitor de Recepción** | Vista operativa permanente en el mostrador. Monitorea quién entra y quién es rechazado. | - Buscador global de socio<br>- Lista en tiempo real de checadas con semáforo (Verde=Pasa, Rojo=Rechazado)<br>- Indicador de estado de la terminal facial (Verde=Conectada, Rojo=Desconectada)<br>- Botón `Nuevo Socio`<br>- Botón `Cobrar` | Muestra instantáneamente la foto y nombre del socio que acaba de checar en el facial. Si el socio está vencido, muestra alerta sonora/visual para que el recepcionista lo invite a pagar. | Texto de búsqueda. | Vista de tarjetas de acceso en vivo con foto, nombre, fecha y hora exacta. | Base de datos local y WebSocket/Polling de eventos de HikCentral Connect. |
| **P3: Alta de Socio y Enrolamiento Facial** | Registrar nuevo cliente e inscribir su rostro en el sistema y en el hardware. | - Campos obligatorios: `Nombre Completo`, `Teléfono`<br>- Campos opcionales: `Email`, `Notas Médicas`<br>- Componente de Cámara: Botón `Capturar con Cámara Web` o `Subir Archivo de Imagen`<br>- Botón `Guardar y Proceder al Cobro` | Valida que el nombre no esté vacío y que la fotografía cumpla los requisitos faciales (rostro centrado, buena iluminación). Guarda el socio en BD local, lo crea en la nube de Hikvision (`/persons/add`) y sube su foto (`/persons/photo`). | Datos de contacto, Foto facial JPG/PNG. | ID de socio asignado y confirmación de enrolamiento exitoso. | BD local y API HikCentral Connect (`/persons/add`, `/persons/photo`). |
| **P4: Punto de Cobro de Membresía** | Registrar pago de plan y activar permisos de entrada de forma automática. | - Selector de `Plan de Membresía`<br>- Campo `Fecha de Inicio` (por defecto hoy)<br>- Selector `Método de Pago` (Efectivo, Tarjeta, Transferencia)<br>- Botón `Registrar Cobro y Activar Acceso`<br>- Checkbox `Imprimir Ticket Térmico` | Valida que el monto sea correcto. Calcula la fecha de expiración (`fecha_inicio + dias_plan`). Guarda el pago. **Inmediatamente asocia el Nivel de Acceso del torniquete al socio en HikCentral Connect (`/personaccess/assign`).** Al instante, el socio ya puede pasar por el facial. | Plan seleccionado, Método de pago, Monto recibido. | Cálculo de cambio, Fecha de vencimiento, Ticket de cobro formateado para impresora de 58mm/80mm. | BD local (tabla Pagos, Membresías) y API HikCentral Connect (`/acspm/v1/personaccess/assign`). |
| **P5: Directorio y Ficha del Socio** | Consulta integral de la situación del socio, renovaciones y ajustes. | - Filtro rápido: `Todos` / `Vigentes` / `Vencidos`<br>- Botones por fila: `Cobrar`, `Editar`, `Historial`<br>- Ficha: Muestra foto grande, estatus (VIGENTE en verde o VENCIDO en rojo), fecha de expiración, historial de pagos previos y registros de visitas. | Permite actualizar datos, cambiar fotografía facial (re-enrola en Hikvision) o consultar por qué se le denegó el paso. | Búsqueda por texto o código. | Ficha completa del cliente en pantalla o exportable a PDF/Excel. | BD local. |
| **P6: Configuración de Terminales y Conexión** | Conectar el software con la cuenta de HikCentral Connect del gimnasio. | - Campo `App Key`<br>- Campo `Secret Key`<br>- Selector `Región` (Norteamérica / México)<br>- Botón `Probar Conexión`<br>- Selector de `Terminal Facial / Puerta` detectada<br>- Botón `Sincronizar Todo Ahora` | Envía petición a `/token/get` para verificar credenciales. Si es exitoso, lista las terminales detectadas mediante `/resource/v1/devices/get` para vincular la puerta de entrada. El botón de sincronización total audita todos los socios en BD y asegura que los vigentes tengan permiso y los vencidos no. | Credenciales AK/SK, Selección de hardware. | Mensaje de éxito de conexión y lista de dispositivos en línea. | API HikCentral Connect (`/token/get`, `/devices/get`, `/personaccess/assign`). |
| **P7: Copias de Seguridad Diarias** | Salvaguardar la base de datos contra fallas de disco o formateos de la PC. | - Selector de `Carpeta de Respaldo Local / Externa (USB)`<br>- Selector de `Hora de Respaldo Automático` (por defecto 23:00 hrs)<br>- Botón `Crear Respaldo Manual Ahora`<br>- Botón `Restaurar desde Respaldo`<br>- Lista de respaldos existentes con fecha y tamaño | Genera un archivo `.backup` o `.sql.gz` fechado con todos los socios, fotos, pagos y configuraciones. Valida integridad del archivo generado. | Ruta de carpeta destino. | Archivo comprimido con marca de tiempo (ej. `gym_backup_2026_09_04.gz`). | Sistema de archivos local / unidad USB. |
| **P8: Corte de Caja y Reportes** | Cuadre de dinero en recepción al final del turno o del día. | - Selector de `Rango de Fechas` o `Turno Actual`<br>- Botón `Cerrar Turno / Corte de Caja`<br>- Botón `Imprimir Reporte de Caja`<br>- Botón `Exportar a Excel (CSV)` | Suma los ingresos desglosados por método de pago (Efectivo, Tarjeta, Transferencia). Compara el total esperado con lo capturado por el cajero. Bloquea el turno cerrado. | Arqueo de efectivo ingresado por el operador. | Reporte impreso o en pantalla con totales, número de membresías vendidas y balance. | BD local (tabla Pagos, Turnos). |

---

## 3. Flujos de Usuario (Paso a Paso)

### Flujo 1: Alta de Nuevo Socio y Primer Acceso Facial
1. El recepcionista pulsa `Nuevo Socio` en el Dashboard.
2. Captura el nombre y teléfono del cliente.
3. Hace clic en `Tomar Foto` (se abre la webcam de la PC) y pulsa `Capturar` cuando el socio esté mirando al frente.
4. El sistema envía la información a HikCentral Connect (`/persons/add` y `/persons/photo`).
5. El recepcionista pasa a la pestaña de cobro, selecciona el plan (ej. *Mensualidad $500*), registra el pago en efectivo y pulsa `Registrar Cobro`.
6. El sistema asocia el nivel de acceso al torniquete en la API (`/personaccess/assign`).
7. El socio camina al torniquete, mira la pantalla de la terminal facial, el hardware lo reconoce, emite el pitido de bienvenida y el torniquete se desbloquea físicamente.
8. En el Dashboard de la recepción aparece inmediatamente su tarjeta en verde con su foto confirmando el acceso.

### Flujo 2: Renovación de Membresía de Socio Vencido
1. El socio vencido llega al gimnasio e intenta pasar por el torniquete.
2. La terminal facial lee su rostro, detecta que no tiene nivel de acceso activo y la pantalla muestra: *"Acceso Denegado / Membresía Vencida"*. El torniquete permanece bloqueado.
3. El recepcionista busca al socio en el Dashboard por su nombre.
4. Pulsa `Cobrar`, selecciona el plan deseado y confirma el pago.
5. El sistema calcula la nueva fecha de vigencia y llama a la API para reactivar el nivel de acceso en el terminal facial.
6. El socio vuelve a pararse frente al facial; el hardware lo valida y le permite el paso.

### Flujo 3: Bloqueo Automático por Vencimiento (Tolerancia Cero: Justo al Vencer)
1. Llega la medianoche (00:00 hrs).
2. El proceso interno del software local se dispara automáticamente y ejecuta la consulta de auditoría:  
   *Buscar todos los socios cuyo `fecha_vencimiento < hoy` y que aún mantengan el permiso activo.*
3. Por cada socio vencido detectado, el sistema envía una solicitud a HikCentral Connect desasociando el nivel de acceso del torniquete.
4. A la mañana siguiente, si ese cliente intenta entrar, el terminal facial no le otorgará paso.
5. El perfil y la foto facial del socio **permanecen intactos en el sistema y en el dispositivo**; no se eliminan, solo se inactiva el permiso de paso hasta el próximo cobro.

### Flujo 4: Respaldo Automático Diario
1. A la hora configurada (ej. 23:00 hrs), el servicio del sistema verifica si el turno está cerrado o si la PC sigue encendida.
2. Genera una copia instantánea de la base de datos local y la comprime junto con la carpeta de fotos.
3. Guarda el archivo en la carpeta local designada y, si hay una memoria USB conectada, copia un duplicado en la memoria.
4. Registra en el log de auditoría: `Respaldo exitoso: gym_backup_2026-09-04_2300.zip (14.2 MB)`.

---

## 4. Capa de Datos / Reportes

### Datos que Captura Cada Operación:
- **Socios:** ID único, Nombre, Teléfono, Correo, Foto (archivo binario / base64), Fecha de Registro, Estatus (Activo, Vencido, Inactivo), ID de persona en HikCentral (`personId`).
- **Planes:** ID, Nombre (ej. Mensual, Anual), Duración en días (ej. 30, 365), Precio regular.
- **Membresías / Suscripciones:** ID Socio, ID Plan, Fecha de Inicio, Fecha de Vencimiento exacto, Estado (Vigente, Expirada).
- **Cobros / Transacciones:** Folio de ticket, ID Socio, ID Plan, Monto pagado, Método de pago, Fecha y hora, Operador en turno.
- **Accesos / Checadas:** ID Socio, Fecha y hora del evento, Dispositivo (Torniquete 1), Resultado (Concedido / Denegado por falta de pago).

### Reportes del Sistema:
1. **Corte de Caja Diario / Turno:** Formato pantalla e impresión en miniprinter de tickets (58mm/80mm). Detalla ingresos en efectivo, tarjeta y transferencias, con total recaudado y firma de responsable.
2. **Lista de Clientes Vencidos / Por Vencer:** Reporte en pantalla con exportación a Excel (CSV). Permite al gimnasio descargar los teléfonos de quienes vencen esta semana para mandarles recordatorio por WhatsApp.
3. **Registro de Asistencias y Afluencia:** Gráfica visual de barras que muestra las horas con mayor tráfico de personas en el gimnasio para optimizar horarios de entrenadores y personal de limpieza.

---

## 5. Matriz de Redundancia (Fuente Única de Verdad)

| Información | Dónde se pide / emite / guarda | ¿Redundante? | Fuente de Verdad | Justificación / Regla |
| :--- | :--- | :---: | :--- | :--- |
| **Estatus Financiero y Vigencia** | Se ve en el Dashboard, en la lista de socios, en la terminal de cobro y en los reportes. | Sí (Vista) | **Base de Datos Local (Tabla Membresías)** | El estado financiero es local. HikCentral Connect solo es un ejecutor de hardware; no calcula si alguien debe dinero. |
| **Nivel de Acceso en el Torniquete** | En la base de datos local (campo `acceso_activo: true/false`) y en la terminal física Hikvision. | Sí | **Estado en el Gateway HikCentral Connect** | El hardware físico es quien efectivamente abre el electroimán del torniquete. Si hay discrepancia, el software fuerza la sincronización para que coincida con la BD local. |
| **Fotografía Facial del Socio** | Se almacena en la carpeta local de imágenes y se envía a la nube de Hikvision (`/persons/photo`). | Sí | **Almacenamiento Local del Software** | La imagen original en alta definición se conserva en la PC del gimnasio; la nube de Hikvision almacena la versión optimizada para reconocimiento biométrico. |

---

## 6. Checklist Condicional

- **Estados de Interfaz:**
  - *Sin conexión a internet:* El sistema muestra banner amarillo `[Modo Offline - Terminales funcionando con permisos locales previos]`. Permite seguir cobrando localmente y encola la sincronización con Hikvision para cuando regrese la red.
  - *Terminal Facial Desconectada:* Indicador en rojo con mensaje claro: `Verifique cable de red o energía del lector facial`.
  - *Lista vacía:* Si no hay socios registrados, muestra botón grande animado: `+ Registrar mi primer socio`.
- **Roles y Permisos:**
  - *Recepcionista:* Solo puede ver Dashboard, dar de alta socios, cobrar y reimprimir tickets. Ocultas las opciones de reportes financieros acumulados, configuración de precios, borrado de socios y credenciales de hardware.
  - *Administrador:* Control absoluto protegido por contraseña maestra.
- **Reglas de Negocio Estrictas:**
  - **Tolerancia Cero (Justo al Vencer):** Si el plan vence el día 15 de enero a las 23:59:59 hrs, el día 16 a las 00:00:00 hrs el acceso físico queda revocado.
  - **Cero Bypass Manual en Recepción:** No existe botón de 'abrir torniquete' libre para clientes. Toda persona debe checar en la terminal facial; si no tiene membresía vigente, el torniquete no gira.
  - **Unicidad de Socio:** No se permite registrar dos socios con el mismo número de teléfono.
- **Notificaciones:**
  - Alerta en pantalla en el Dashboard cada vez que la terminal rechace a un socio por membresía vencida, mostrando su nombre para que el recepcionista lo llame a caja.
- **Prioridad MVP vs. Fase 2:**
  - *MVP (Imprescindible):* Alta de socio con foto, cobro de planes, sincronización automática con HikCentral Connect (activar/desactivar acceso en facial), respaldo diario y corte de caja diario.
  - *Fase 2 (Nice-to-have):* Integración directa con API de WhatsApp para avisos automáticos de vencimiento, torniquete de salida antipassback, app móvil para que el socio vea su vigencia.

---

## 7. Criterios de Aceptación (Medibles y Verificables)

1. **Tiempo de Activación de Acceso:** Al completar un cobro en recepción, la llamada a `/personaccess/assign` debe ejecutarse en menos de 2 segundos; el socio puede pasar inmediatamente al torniquete y ser reconocido.
2. **Efectividad del Bloqueo al Vencer:** El proceso nocturno de revocación de permisos debe dejar sin acceso al 100% de los socios vencidos antes de la apertura matutina del gimnasio (ej. 05:00 AM).
3. **Resiliencia de Datos (Backup):** El archivo de copia de seguridad diaria debe generarse en < 15 segundos sin bloquear la interfaz de cobro y debe poder restaurarse limpiamente en una computadora nueva dejando el sistema operativo.
4. **Facilidad de Uso en Recepción:** Un recepcionista sin conocimientos técnicos debe ser capaz de dar de alta a un socio, tomarle la foto y cobrarle su primer mes en menos de 90 segundos.
