# 🏋️‍♂️ GymAccess Pro — Control Biométrico Facial & Gestión de Gimnasios

Sistema integral de administración local para gimnasios y centros deportivos con control de acceso por torniquetes mediante reconocimiento facial **Hikvision (HikCentral Connect OpenAPI V2.11.800)**.

---

## ⚡ Características Principales

- **Monitor de Recepción en Tiempo Real:** Dashboard con métricas de clientes activos, vencidos, caja del día y visor de accesos en vivo desde los lectores faciales.
- **Diseño Dual en Tiempo Real:** Alterna instantáneamente con un solo clic en la barra superior entre:
  - ⚡ **Cyber-Gym High-Energy Dark:** Fondo carbón profundo `#090a0f`, acentos neón volt `#ccff00` y estética atlética de alto impacto.
  - ☀️ **Clean Sport Light:** Modo claro pulcro y fresco (estilo Apple Fitness / Whoop), sombras multicapa y acentos naranja atleta `#ff5722`.
- **Padrón de Socios y Enrolamiento Facial:**
  - Registro de socios con cámara web integrada para captura instantánea de fotografía facial.
  - Sincronización automática de credenciales faciales hacia HikCentral Connect.
- **Punto de Cobro y Venta de Membresías:**
  - Emisión de folios de ticket.
  - Cobro por Efectivo, Tarjeta o Transferencia.
  - Activación y rehabilitación inmediata de paso en torniquetes al concretar el pago.
- **Motor de Sincronización de Tolerancia Cero:**
  - Demonio en segundo plano que audita membresías cada medianoche y al reiniciar el sistema, revocando accesos a usuarios con pagos vencidos.
- **Respaldos en Caliente (Hot Backup WAL):**
  - Copias de seguridad atómicas sin bloquear la base de datos ni detener los torniquetes físicos.

---

## 🏛️ Arquitectura del Sistema

```
Integracion GYMS/
├── src/
│   ├── client/                  # Frontend SPA (React 18 + Vite + Tailwind CSS)
│   │   ├── context/ThemeContext # Conmutador reactivo de temas (Cyber / Clean)
│   │   ├── components/Navbar    # Barra superior con branding y selector de temas
│   │   └── pages/               # Dashboard, Socios, Cobro, Hardware, Backups
│   │
│   └── server/                  # Backend Local (Node.js 22 + Express + TypeScript)
│       ├── db/                  # SQLite nativo (node:sqlite) en modo WAL
│       ├── services/hikconnect  # Cliente oficial HikCentral Connect OpenAPI V2.11.800
│       ├── services/syncWorker  # Demonio de sincronización y auditoría de accesos
│       └── services/backup      # Motor de respaldos atómicos en caliente
```

---

## 🚀 Instalación y Puesta en Marcha

### Requisitos
- [Node.js](https://nodejs.org/) v20+ o v22+
- Sistema Operativo: Windows 10/11 o Linux

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/gymaccess-pro.git
cd gymaccess-pro
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Compilar el proyecto
```bash
npm run build
```

### 4. Iniciar la aplicación
En Windows, puedes hacer doble clic en el archivo `iniciar.bat` o ejecutar:
```bash
npm start
```
La aplicación abrirá automáticamente `http://localhost:3000` en tu navegador.

---

## 🔒 Seguridad y Privacidad
- La base de datos SQLite y las fotografías biométricas residen de forma 100% local en tu servidor.
- La comunicación con los servidores de HikCentral Connect se realiza mediante tokens de autenticación firmados con App Key y Secret Key.

---

## 📄 Licencia
Este proyecto es software privado de gestión operativa para gimnasios.
