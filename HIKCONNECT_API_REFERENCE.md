# 📡 Guía Maestra y Referencia Técnica Completa: API HikCentral Connect (HikConnect OpenAPI V2.11.800)

> **Fuente Oficial Syscom:** [hikconnectapi.syscom.mx](https://hikconnectapi.syscom.mx/)  
> **Versión de Especificación:** OpenAPI V2.11.800  
> **Plataforma Soportada:** HikCentral Connect Cloud Gateway (`/api/hccgw/`)  
> **Ámbito de Aplicación:** Control de acceso, torniquetes, videovigilancia en vivo/grabación, biometría facial, intercomunicación/visitas, alarmas MQ, monitoreo vehicular y asistencia.

---
## 📑 Tabla de Contenidos
1. [Arquitectura General y Reglas de Integración](#1-arquitectura-general-y-reglas-de-integraci%C3%B3n)
2. [Flujo de Inicio Rápido en 5 Pasos (Quick Start)](#2-flujo-de-inicio-r%C3%A1pido-en-5-pasos-quick-start)
3. [Integración Frontend con EZUIKit JS SDK (Video Cifrado)](#3-integraci%C3%B3n-frontend-con-ezuikit-js-sdk-video-cifrado)
4. [Módulo 1: Autenticación y Tokens (Getting Started)](#m%C3%B3dulo-1-autenticaci%C3%B3n-y-tokens-getting-started)
5. [Módulo 2: Servicios del Sistema (System Services)](#m%C3%B3dulo-2-servicios-del-sistema-system-services)
6. [Módulo 3: Gestión de Recursos y Dispositivos (Resource Services)](#m%C3%B3dulo-3-gesti%C3%B3n-de-recursos-y-dispositivos-resource-services)
7. [Módulo 4: Alarmas y Eventos en Tiempo Real (Alarm Services)](#m%C3%B3dulo-4-alarmas-y-eventos-en-tiempo-real-alarm-services)
8. [Módulo 5: Servicios de Mensajería Cruda (Message Services)](#m%C3%B3dulo-5-servicios-de-mensajer%C3%ADa-cruda-message-services)
9. [Módulo 6: Servicios de Video (Video Services)](#m%C3%B3dulo-6-servicios-de-video-video-services)
10. [Módulo 7: Video Porteros e Intercomunicación Residencial (VISP)](#m%C3%B3dulo-7-video-porteros-e-intercomunicaci%C3%B3n-residencial-visp)
11. [Módulo 8: Control de Acceso y Torniquetes (Access Control - ACS)](#m%C3%B3dulo-8-control-de-acceso-y-torniquetes-access-control---acs)
12. [Módulo 9: Gestión de Personas y Biometría Facial (Person Management)](#m%C3%B3dulo-9-gesti%C3%B3n-de-personas-y-biometr%C3%ADa-facial-person-management)
13. [Módulo 10: Monitoreo Móvil / Vehicular (On-Board Monitoring - OBD)](#m%C3%B3dulo-10-monitoreo-m%C3%B3vil--vehicular-on-board-monitoring---obd)
14. [Módulo 11: Control de Tiempo y Asistencia (Attendance Services)](#m%C3%B3dulo-11-control-de-tiempo-y-asistencia-attendance-services)
15. [Catálogo Completo de Códigos de Error (Error Codes Reference)](#15-cat%C3%A1logo-completo-de-c%C3%B3digos-de-error-error-codes-reference)

---

## 1. Arquitectura General y Reglas de Integración

### Parámetros Globales de Conexión
| Parámetro | Valor / Especificación | Detalle Técnico / Consideraciones |
| :--- | :--- | :--- |
| **Protocolo Base** | HTTPS REST / JSON | Todas las solicitudes POST/GET envían y reciben payloads JSON estructurados |
| **Base URL (Norteamérica / México)** | `https://ius.hikcentralconnect.com/api` | Endpoint de producción para cuentas registradas en región América |
| **Base URL (Europa)** | `https://ieu.hikcentralconnect.com/api` | Endpoint para instalaciones en centros de datos europeos |
| **Cabecera de Autenticación** | `Token: <accessToken>` | **CRÍTICO:** Se debe usar el header exacto `Token`. **NO** usar `Bearer <token>` ni `Authorization`. |
| **Content-Type** | `application/json` | Obligatorio en todas las peticiones con cuerpo |
| **Credenciales Base** | `appKey` y `secretKey` (AK/SK) | Claves emitidas en el portal web de HikCentral Connect |
| **Vigencia del Token** | 7 días (604,800 segundos) | Debe renovarse antes de su expiración con `/token/refresh` |
| **Límite de Tasa (Rate Limiting)** | 5 peticiones / segundo | Excederlo genera bloqueo temporal y error `429 / 0x1001` |
| **Estructura Estándar de Respuesta** | `{ errorCode: string, message: string, data: any }` | Toda respuesta exitosa tiene `errorCode: "0"` |

```json
{
  "errorCode": "0",
  "message": "success",
  "data": {
    // Objeto o lista de resultados específicos del endpoint
  }
}
```

### Servidores de Video Streaming por Región (EZUIKit `env.domain`)

| Región Geográfica | Dominio de Streaming |
| :--- | :--- |
| **Norteamérica, México y Sudamérica** | `https://isgpopen.ezvizlife.com` |
| **Europa** | `https://ieuopen.ezvizlife.com` |
| **China (Default del SDK)** | `https://open.ys7.com` |

> [!WARNING]
> **Peligro de Fallo Silencioso:** Si no se pasa explícitamente `env: { domain: streamAreaDomain }` al inicializar `EZUIKitPlayer`, el SDK intentará comunicarse con `open.ys7.com`. Las cámaras fuera de China fallarán sin emitir un mensaje de error claro en la consola.


---

## 2. Flujo de Inicio Rápido en 5 Pasos (Quick Start)

1. **Obtener Credenciales:** Acceder al portal de HikCentral Connect y registrar una aplicación para obtener el `appKey` y `secretKey`.
2. **Generar Access Token:** Enviar un `POST` a `/api/hccgw/platform/v1/token/get` con las credenciales AK/SK. Guardar el `accessToken` devuelto.
3. **Obtener Stream Token y Dominio:** Enviar un `GET` a `/api/hccgw/platform/v1/streamtoken/get` con el header `Token: <accessToken>`. Esto retorna `appToken` y el `streamAreaDomain` específico de tu cuenta.
4. **Generar URL EZOPEN:** Enviar un `POST` a `/api/hccgw/video/v1/live/address/get` con el `deviceSerial`, `resourceId`, `type: "1"` y `protocol: "1"` (1 = EZOPEN). Se obtendrá una URL `ezopen://...`.
5. **Inicializar EZUIKit:** En el frontend, inicializar `EZUIKitPlayer` pasando el ID del contenedor div, `accessToken: appToken`, `url: ezopenUrl` y `env.domain: streamAreaDomain`.


---

## 3. Integración Frontend con EZUIKit JS SDK (Video Cifrado)

> [!IMPORTANT]
> **Por qué EZUIKit es Mandatorio para Cámaras Hikvision:**  
> Prácticamente todos los dispositivos Hikvision modernos (cámaras IP, NVRs, DVRs y terminales faciales de acceso) tienen cifrado de stream activado de fábrica. Si intentas solicitar una transmisión HTTP-FLV o HLS sin descifrar, la API retornará el error **`EVZ60019`**. El protocolo oficial y seguro es **EZOPEN**, que se decodifica en tiempo real en el cliente web mediante `ezuikit-js`.

### Instalación del Paquete NPM
```bash
npm install ezuikit-js
```

### Importación e Inicialización
```typescript
import { EZUIKitPlayer } from 'ezuikit-js';

const player = new EZUIKitPlayer({
  id: 'video-container',        // ID del elemento <div> en el DOM
  accessToken: appToken,        // appToken obtenido de /platform/v1/streamtoken/get
  url: ezopenUrl,               // URL 'ezopen://open.ezviz.com/...' devuelta por la API
  env: {
    domain: streamAreaDomain,   // https://isgpopen.ezvizlife.com para América
  },
  template: 'pcLive',           // 'pcLive' | 'pcRec' | 'simple'
  width: 640,
  height: 360,
});
```

### Plantillas de Reproducción Soportadas

| Nombre de Plantilla | Propósito | Características y Controles |
| :--- | :--- | :--- |
| `pcLive` | Streaming en vivo | Botón Play/Stop, activación de audio bidireccional/micrófono, pantalla completa |
| `pcRec` | Grabaciones NVR / Nube | Play/Pausa, barra de tiempo (timeline scrubbing), selector de velocidad (0.5x a 4x), pantalla completa |
| `simple` | Video incrustado sin barra | Sin controles nativos visibles; ideal para construir dashboards con botones propios |

### Funciones Utilitarias del SDK
```typescript
// Maximizar a pantalla completa de manera asíncrona
await player.fullScreen();

// Destruir instancia y liberar recursos de WebGL / memoria al desmontar componente
player.destroy();
```


---

## Módulo 1: Getting Started (Autenticación)

> Autenticación basada en AppKey/SecretKey y renovación de tokens con vigencia de 7 días.

### `POST` Get Access Token
**Identificador Único:** `get-token`  
**Ruta:** `/api/hccgw/platform/v1/token/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/platform/v1/token/get`  
**Descripción Funcional:** Obtain an access token using your AK/SK credentials. The token is valid for 7 days and can be refreshed.

**Reglas Operativas y Restricciones:**
- Rate limit: 5 requests per second
- Token validity: 7 days
- Refresh the token before expiration to maintain access

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `appKey` | `string` | Required | Application Key provided by HikCentral Connect |
| `secretKey` | `string` | Required | Secret Key provided by HikCentral Connect |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `accessToken` | `string` | Required | Access token for API authentication |
| `expireTime` | `string` | Required | Token expiration time (ISO 8601 format) |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/platform/v1/token/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    appKey: 'your_app_key',
    secretKey: 'your_secret_key',
  }),
})

const data = await response.json()

if (data.errorCode === '0') {
  const accessToken = data.data.accessToken
  const expireTime = data.data.expireTime
  console.log('Token obtained:', accessToken)
} else {
  console.error('Error:', data.message)
}
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/platform/v1/token/get',
    headers={'Content-Type': 'application/json'},
    json={
        'appKey': 'your_app_key',
        'secretKey': 'your_secret_key',
    }
)

data = response.json()

if data['errorCode'] == '0':
    access_token = data['data']['accessToken']
    expire_time = data['data']['expireTime']
    print(f'Token obtained: {access_token}')
else:
    print(f\\
```

---

### `POST` Refresh Access Token
**Identificador Único:** `refresh-token`  
**Ruta:** `/api/hccgw/platform/v1/token/refresh`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/platform/v1/token/refresh`  
**Descripción Funcional:** Refresh an existing access token to extend its validity period.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `accessToken` | `string` | Required | Current access token to refresh |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `accessToken` | `string` | Required | New access token |
| `expireTime` | `string` | Required | New expiration time |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/platform/v1/token/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    accessToken: currentToken,
  }),
})

const data = await response.json()
const newToken = data.data.accessToken
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/platform/v1/token/refresh',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'accessToken': current_token}
)

data = response.json()
new_token = data['data']['accessToken']
```

---

## Módulo 2: System Services (Servicios del Sistema)

> Propiedades de plataforma, licencias de paquetes, streaming tokens y usuarios.

### `GET` Get System Properties
**Identificador Único:** `system-info`  
**Ruta:** `/api/hccgw/platform/v1/systemproperties`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/platform/v1/systemproperties`  
**Descripción Funcional:** Retrieve system properties and configuration information.

#### Parámetros de Solicitud
*Sin cuerpo JSON. Requiere únicamente la cabecera `Token: <accessToken>`.*

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `version` | `string` | Required | System version |
| `timezone` | `string` | Required | Server timezone |
| `language` | `string` | Required | System language |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/platform/v1/systemproperties', {
  method: 'GET',
  headers: {
    'Token': accessToken,
  },
})

const data = await response.json()
console.log('System version:', data.data.version)
console.log('Timezone:', data.data.timezone)
```

**Python (Requests):**
```python
import requests

response = requests.get(
    'https://ius.hikcentralconnect.com/api/hccgw/platform/v1/systemproperties',
    headers={'Token': access_token}
)

data = response.json()
print(f\\
```

---

### `GET` Get Service Package Info
**Identificador Único:** `service-package`  
**Ruta:** `/api/hccgw/platform/v1/servicepackage`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/platform/v1/servicepackage`  
**Descripción Funcional:** Get information about the current service package and its capabilities.

#### Parámetros de Solicitud
*Sin cuerpo JSON. Requiere únicamente la cabecera `Token: <accessToken>`.*

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `packageName` | `string` | Required | Name of the service package |
| `maxDevices` | `number` | Required | Maximum number of devices allowed |
| `features` | `array` | Required | List of enabled features |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/platform/v1/servicepackage', {
  method: 'GET',
  headers: {
    'Token': accessToken,
  },
})

const data = await response.json()
console.log('Package:', data.data.packageName)
console.log('Max devices:', data.data.maxDevices)
```

**Python (Requests):**
```python
import requests

response = requests.get(
    'https://ius.hikcentralconnect.com/api/hccgw/platform/v1/servicepackage',
    headers={'Token': access_token}
)

data = response.json()
print(f\\
```

---

### `GET` Get Streaming Token
**Identificador Único:** `streaming-token`  
**Ruta:** `/api/hccgw/platform/v1/streamtoken/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/platform/v1/streamtoken/get`  
**Descripción Funcional:** Obtain credentials for video streaming via EZUIKit. Returns appKey, appToken (used as accessToken in EZUIKit player), and the regional stream server domain.

**Reglas Operativas y Restricciones:**
- appToken is different from the API access token - it is specifically for video streaming
- streamAreaDomain MUST be set in EZUIKit env.domain or streams will fail
- Default domain (open.ys7.com) is for China only - international accounts must use the returned domain

#### Parámetros de Solicitud
*Sin cuerpo JSON. Requiere únicamente la cabecera `Token: <accessToken>`.*

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `appKey` | `string` | Required | Application key for EZUIKit SDK |
| `appToken` | `string` | Required | Access token for EZUIKit player (use as accessToken param) |
| `streamAreaDomain` | `string` | Required | Regional video server domain (e.g., https://isgpopen.ezvizlife.com). MUST match your region. |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/platform/v1/streamtoken/get', {
  method: 'GET',
  headers: {
    'Token': accessToken,
  },
})

const data = await response.json()
const { appKey, appToken, streamAreaDomain } = data.data
// appToken is used as the accessToken for EZUIKit player
// streamAreaDomain is the regional video server domain
console.log('Stream domain:', streamAreaDomain)
```

**Python (Requests):**
```python
import requests

response = requests.get(
    'https://ius.hikcentralconnect.com/api/hccgw/platform/v1/streamtoken/get',
    headers={'Token': access_token}
)

data = response.json()
app_key = data['data']['appKey']
app_token = data['data']['appToken']
stream_domain = data['data']['streamAreaDomain']
# app_token is used as the accessToken for EZUIKit player
# stream_domain is the regional video server domain
print(f'Stream domain: {stream_domain}')
```

---

### `POST` Get Users
**Identificador Único:** `get-users`  
**Ruta:** `/api/hccgw/platform/v1/users/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/platform/v1/users/get`  
**Descripción Funcional:** Retrieve a list of users with optional filtering.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `pageNo` | `number` | Optional | Page number (starts from 1) (Default:  1 ) |
| `pageSize` | `number` | Optional | Number of items per page (Default:  20 ) |
| `userName` | `string` | Optional | Filter by username |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total number of users |
| `list` | `array` | Required | Array of user objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/platform/v1/users/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    pageNo: 1,
    pageSize: 20,
  }),
})

const data = await response.json()
console.log('Total users:', data.data.total)
data.data.list.forEach(user => {
  console.log(user.userName)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/platform/v1/users/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'pageNo': 1, 'pageSize': 20}
)

data = response.json()
print(f\\
```

---

## Módulo 3: Resource Services (Gestión de Recursos y Dispositivos)

> Alta, modificación, consulta y baja de dispositivos, áreas y vinculación de cámaras.

### `POST` Add Device
**Identificador Único:** `add-device`  
**Ruta:** `/api/hccgw/resource/v1/devices/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/add`  
**Descripción Funcional:** Register a new device to the platform.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `deviceName` | `string` | Required | Name for the device |
| `deviceSerial` | `string` | Required | Device serial number |
| `validateCode` | `string` | Required | Device validation code |
| `areaId` | `string` | Optional | Area ID to assign the device |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `deviceId` | `string` | Required | Unique identifier of the added device |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    deviceName: 'Front Door Camera',
    deviceSerial: 'DS-2CD2143G2-I-ABC123',
    validateCode: 'ABCDEF',
    areaId: 'area_001',
  }),
})

const data = await response.json()
const deviceId = data.data.deviceId
console.log('Device added:', deviceId)
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'deviceName': 'Front Door Camera',
        'deviceSerial': 'DS-2CD2143G2-I-ABC123',
        'validateCode': 'ABCDEF',
        'areaId': 'area_001',
    }
)

data = response.json()
device_id = data['data']['deviceId']
print(f'Device added: {device_id}')
```

---

### `POST` Update Device
**Identificador Único:** `update-device`  
**Ruta:** `/api/hccgw/resource/v1/devices/update`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/update`  
**Descripción Funcional:** Update device information.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `deviceId` | `string` | Required | Device ID to update |
| `deviceName` | `string` | Optional | New device name |
| `areaId` | `string` | Optional | New area assignment |

#### Parámetros de Respuesta
*Estructura estándar de éxito: `{ errorCode: "0", message: "success", data: {} }`*

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    deviceId: 'device_001',
    deviceName: 'Updated Camera Name',
    areaId: 'area_002',
  }),
})

const data = await response.json()
console.log('Device updated:', data.errorCode === '0')
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/update',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'deviceId': 'device_001',
        'deviceName': 'Updated Camera Name',
        'areaId': 'area_002',
    }
)

data = response.json()
print(f\\
```

---

### `POST` Get Devices
**Identificador Único:** `get-devices`  
**Ruta:** `/api/hccgw/resource/v1/devices/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/get`  
**Descripción Funcional:** Retrieve a list of registered devices.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |
| `areaId` | `string` | Optional | Filter by area |
| `deviceName` | `string` | Optional | Filter by device name |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total device count |
| `list` | `array` | Required | Array of device objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    pageNo: 1,
    pageSize: 20,
    areaId: 'area_001',
  }),
})

const data = await response.json()
console.log('Total devices:', data.data.total)
data.data.list.forEach(device => {
  console.log(`${device.deviceName}: ${device.status}`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'pageNo': 1, 'pageSize': 20, 'areaId': 'area_001'}
)

data = response.json()
print(f\\
```

---

### `POST` Delete Device
**Identificador Único:** `delete-device`  
**Ruta:** `/api/hccgw/resource/v1/devices/delete`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/delete`  
**Descripción Funcional:** Remove a device from the platform.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `deviceIds` | `array` | Required | Array of device IDs to delete |

#### Parámetros de Respuesta
*Estructura estándar de éxito: `{ errorCode: "0", message: "success", data: {} }`*

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/delete', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    deviceIds: ['device_001', 'device_002'],
  }),
})

const data = await response.json()
console.log('Devices deleted:', data.errorCode === '0')
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/devices/delete',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'deviceIds': ['device_001', 'device_002']}
)

data = response.json()
print(f\\
```

---

### `POST` Add Area
**Identificador Único:** `add-area`  
**Ruta:** `/api/hccgw/resource/v1/areas/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/add`  
**Descripción Funcional:** Create a new area for organizing devices.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `areaName` | `string` | Required | Name of the area |
| `parentAreaId` | `string` | Optional | Parent area ID for hierarchy |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `areaId` | `string` | Required | ID of the created area |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    areaName: 'Building A - Floor 1',
    parentAreaId: 'root_area',
  }),
})

const data = await response.json()
const areaId = data.data.areaId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'areaName': 'Building A - Floor 1',
        'parentAreaId': 'root_area',
    }
)

data = response.json()
area_id = data['data']['areaId']
```

---

### `POST` Get Areas
**Identificador Único:** `get-areas`  
**Ruta:** `/api/hccgw/resource/v1/areas/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/get`  
**Descripción Funcional:** Retrieve the area hierarchy.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `parentAreaId` | `string` | Optional | Filter by parent area |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `list` | `array` | Required | Array of area objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({}),
})

const data = await response.json()
data.data.list.forEach(area => {
  console.log(`${area.areaName} (ID: ${area.areaId})`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={}
)

data = response.json()
for area in data['data']['list']:
    print(f\\
```

---

### `POST` Get Cameras by Area
**Identificador Único:** `get-cameras`  
**Ruta:** `/api/hccgw/resource/v1/areas/cameras/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/cameras/get`  
**Descripción Funcional:** Get all cameras in a specific area.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `areaId` | `string` | Required | Area ID to query |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total camera count |
| `list` | `array` | Required | Array of camera objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/cameras/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    areaId: 'area_001',
    pageNo: 1,
    pageSize: 20,
  }),
})

const data = await response.json()
data.data.list.forEach(camera => {
  console.log(`Camera: ${camera.cameraName}, Status: ${camera.status}`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/areas/cameras/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'areaId': 'area_001', 'pageNo': 1, 'pageSize': 20}
)

data = response.json()
for camera in data['data']['list']:
    print(f\\
```

---

## Módulo 4: Alarm Services (Servicios de Alarmas y Eventos)

> Suscripción a colas MQ para eventos en tiempo real, reglas de alarma y logs de eventos.

### `POST` Subscribe to Message Queue
**Identificador Único:** `subscribe-mq`  
**Ruta:** `/api/hccgw/alarm/v1/mq/subscribe`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/mq/subscribe`  
**Descripción Funcional:** Subscribe to receive alarm notifications via message queue.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `eventTypes` | `array` | Required | Array of event types to subscribe |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `subscriptionId` | `string` | Required | Subscription identifier |
| `mqUrl` | `string` | Required | Message queue URL |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/mq/subscribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    eventTypes: ['motion', 'intrusion', 'faceDetection'],
  }),
})

const data = await response.json()
const subscriptionId = data.data.subscriptionId
const mqUrl = data.data.mqUrl
console.log('Subscribed to MQ:', subscriptionId)
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/mq/subscribe',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'eventTypes': ['motion', 'intrusion', 'faceDetection']}
)

data = response.json()
subscription_id = data['data']['subscriptionId']
mq_url = data['data']['mqUrl']
print(f'Subscribed to MQ: {subscription_id}')
```

---

### `POST` Get Message Queue Messages
**Identificador Único:** `get-mq-messages`  
**Ruta:** `/api/hccgw/alarm/v1/mq/messages`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/mq/messages`  
**Descripción Funcional:** Retrieve messages from the subscribed message queue.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `subscriptionId` | `string` | Required | Subscription ID |
| `maxMessages` | `number` | Optional | Maximum messages to retrieve (Default:  100 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `messages` | `array` | Required | Array of alarm messages |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/mq/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    subscriptionId: 'sub_001',
    maxMessages: 100,
  }),
})

const data = await response.json()
data.data.messages.forEach(msg => {
  console.log(`Event: ${msg.eventType}, Time: ${msg.timestamp}`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/mq/messages',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'subscriptionId': 'sub_001', 'maxMessages': 100}
)

data = response.json()
for msg in data['data']['messages']:
    print(f\\
```

---

### `POST` Add Alarm Rule
**Identificador Único:** `add-alarm-rule`  
**Ruta:** `/api/hccgw/alarm/v1/alarmrules/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/alarmrules/add`  
**Descripción Funcional:** Create a new alarm rule.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `ruleName` | `string` | Required | Name of the alarm rule |
| `deviceIds` | `array` | Required | Devices to apply the rule |
| `eventType` | `string` | Required | Type of event to trigger alarm |
| `schedule` | `object` | Optional | Schedule configuration |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `ruleId` | `string` | Required | ID of the created rule |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/alarmrules/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    ruleName: 'Motion Detection Rule',
    deviceIds: ['device_001', 'device_002'],
    eventType: 'motion',
    schedule: {
      startTime: '08:00',
      endTime: '18:00',
      weekDays: [1, 2, 3, 4, 5],
    },
  }),
})

const data = await response.json()
const ruleId = data.data.ruleId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/alarmrules/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'ruleName': 'Motion Detection Rule',
        'deviceIds': ['device_001', 'device_002'],
        'eventType': 'motion',
        'schedule': {
            'startTime': '08:00',
            'endTime': '18:00',
            'weekDays': [1, 2, 3, 4, 5],
        },
    }
)

data = response.json()
rule_id = data['data']['ruleId']
```

---

### `POST` Get Alarm Logs
**Identificador Único:** `get-alarm-logs`  
**Ruta:** `/api/hccgw/alarm/v1/alarmlogs/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/alarmlogs/get`  
**Descripción Funcional:** Retrieve historical alarm logs.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `startTime` | `string` | Required | Start time (ISO 8601) |
| `endTime` | `string` | Required | End time (ISO 8601) |
| `deviceIds` | `array` | Optional | Filter by devices |
| `eventTypes` | `array` | Optional | Filter by event types |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total log count |
| `list` | `array` | Required | Array of alarm log objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/alarmlogs/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-31T23:59:59Z',
    eventTypes: ['motion', 'intrusion'],
    pageNo: 1,
    pageSize: 50,
  }),
})

const data = await response.json()
console.log('Total alarms:', data.data.total)
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/alarm/v1/alarmlogs/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'startTime': '2024-01-01T00:00:00Z',
        'endTime': '2024-01-31T23:59:59Z',
        'eventTypes': ['motion', 'intrusion'],
        'pageNo': 1,
        'pageSize': 50,
    }
)

data = response.json()
print(f\\
```

---

## Módulo 5: Message Services (Servicios de Mensajería Cruda)

> Recepción de mensajes crudos del sistema y confirmación (ACK) de recepción.

### `POST` Get Raw Messages
**Identificador Único:** `get-raw-messages`  
**Ruta:** `/api/hccgw/message/v1/rawmessage/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/message/v1/rawmessage/get`  
**Descripción Funcional:** Retrieve raw messages from the platform message queue.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `queueId` | `string` | Required | Queue identifier |
| `maxCount` | `number` | Optional | Maximum messages (Default:  100 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `messages` | `array` | Required | Array of raw messages |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/message/v1/rawmessage/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    queueId: 'queue_001',
    maxCount: 100,
  }),
})

const data = await response.json()
const messages = data.data.messages
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/message/v1/rawmessage/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'queueId': 'queue_001', 'maxCount': 100}
)

data = response.json()
messages = data['data']['messages']
```

---

### `POST` Acknowledge Messages
**Identificador Único:** `ack-messages`  
**Ruta:** `/api/hccgw/message/v1/rawmessage/ack`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/message/v1/rawmessage/ack`  
**Descripción Funcional:** Acknowledge receipt of messages to remove them from the queue.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `queueId` | `string` | Required | Queue identifier |
| `messageIds` | `array` | Required | Array of message IDs to acknowledge |

#### Parámetros de Respuesta
*Estructura estándar de éxito: `{ errorCode: "0", message: "success", data: {} }`*

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/message/v1/rawmessage/ack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    queueId: 'queue_001',
    messageIds: ['msg_001', 'msg_002', 'msg_003'],
  }),
})

const data = await response.json()
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/message/v1/rawmessage/ack',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'queueId': 'queue_001',
        'messageIds': ['msg_001', 'msg_002', 'msg_003'],
    }
)

data = response.json()
```

---

## Módulo 6: Video Services (Servicios de Video y Grabaciones)

> Obtención de URLs de streaming en vivo y reproducción, búsqueda de grabaciones, capturas instantáneas e itinerarios.

### `POST` Get Video URL (Live & Playback)
**Identificador Único:** `get-video-url`  
**Ruta:** `/api/hccgw/video/v1/live/address/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/video/v1/live/address/get`  
**Descripción Funcional:** Obtain an EZOPEN URL for live streaming or recorded playback. This single endpoint handles both live and playback by changing the type parameter. For encrypted cameras, you MUST use protocol "1" (EZOPEN) and play the URL with EZUIKit SDK.

**Reglas Operativas y Restricciones:**
- Encrypted cameras return error EVZ60019 with HLS/FLV - use EZOPEN protocol instead
- EZOPEN URLs must be played with EZUIKit JS SDK (ezuikit-js npm package)
- For playback (type="2"/"3"), startTime and stopTime are required
- Use EZUIKit template "pcLive" for live, "pcRec" for playback

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `resourceId` | `string` | Required | Camera resource ID (from camera list response) |
| `deviceSerial` | `string` | Required | Device serial number |
| `type` | `string` | Required | Stream type: "1"=live, "2"=cloud playback, "3"=local playback  1  2  3 |
| `code` | `string` | Optional | Channel code (usually "0") (Default:  0 ) |
| `protocol` | `string` | Optional | Protocol: "1"=EZOPEN (required for encrypted streams) (Default:  1 ) |
| `quality` | `string` | Optional | Video quality: "1"=HD, "2"=SD (Default:  1 )   1  2 |
| `startTime` | `string` | Optional | Playback start time (format: YYYY-MM-DD HH:MM:SS). Required when type="2" or "3". |
| `stopTime` | `string` | Optional | Playback stop time (format: YYYY-MM-DD HH:MM:SS). Required when type="2" or "3". |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `url` | `string` | Required | EZOPEN URL (e.g., ezopen://open.ezviz.com/<token>/live) |

#### Ejemplos de Implementación de Código

**Python (Requests):**
```python
import requests

# Get live EZOPEN URL for a camera
response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/video/v1/live/address/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'resourceId': 'camera_resource_id',  # From camera list
        'deviceSerial': 'DS-2CD2143G2-I-ABC123',
        'type': '1',       # 1=live, 2=cloud playback, 3=local playback
        'code': '0',       # Channel code (usually \\
```

---

### `POST` Get Playback URL
**Identificador Único:** `get-playback-url`  
**Ruta:** `/api/hccgw/video/v1/live/address/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/video/v1/live/address/get`  
**Descripción Funcional:** Same endpoint as Get Video URL but with type="2" (cloud) or type="3" (local). Requires startTime and stopTime parameters.

**Reglas Operativas y Restricciones:**
- Use EZUIKit template "pcRec" for playback
- Time format is "YYYY-MM-DD HH:MM:SS" (NOT ISO 8601)

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `resourceId` | `string` | Required | Camera resource ID |
| `deviceSerial` | `string` | Required | Device serial number |
| `type` | `string` | Required | "2"=cloud playback, "3"=local playback  2  3 |
| `code` | `string` | Optional | Channel code (Default:  0 ) |
| `protocol` | `string` | Optional | Protocol: "1"=EZOPEN (Default:  1 ) |
| `quality` | `string` | Optional | "1"=HD, "2"=SD (Default:  1 ) |
| `startTime` | `string` | Required | Start time (YYYY-MM-DD HH:MM:SS) |
| `stopTime` | `string` | Required | Stop time (YYYY-MM-DD HH:MM:SS) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `url` | `string` | Required | EZOPEN playback URL |

#### Ejemplos de Implementación de Código

**Python (Requests):**
```python
import requests

# Get live EZOPEN URL for a camera
response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/video/v1/live/address/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'resourceId': 'camera_resource_id',  # From camera list
        'deviceSerial': 'DS-2CD2143G2-I-ABC123',
        'type': '1',       # 1=live, 2=cloud playback, 3=local playback
        'code': '0',       # Channel code (usually \\
```

---

### `POST` Search Recording Segments
**Identificador Único:** `get-recordings`  
**Ruta:** `/api/hccgw/video/v1/record/element/search`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/video/v1/record/element/search`  
**Descripción Funcional:** Search for available recording segments for a camera. Returns time ranges of recorded video.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `resourceId` | `string` | Required | Camera resource ID |
| `filter` | `object` | Required | Filter object with time range and target type |
| `filter.beginTime` | `string` | Required | Start time (ISO 8601, e.g., 2024-01-15T00:00:00.000+00:00) |
| `filter.endTime` | `string` | Required | End time (ISO 8601) |
| `filter.targetType` | `string` | Optional | "0"=cloud recordings, "1"=local device recordings (Default:  0 )   0  1 |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `list` | `array` | Required | Array of recording segment objects with beginTime and endTime |

#### Ejemplos de Implementación de Código

**Python (Requests):**
```python
import requests

# Search recording segments for a camera
response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/video/v1/record/element/search',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'resourceId': 'camera_resource_id',
        'filter': {
            'beginTime': '2024-01-15T00:00:00.000+00:00',  # ISO 8601
            'endTime': '2024-01-15T23:59:59.000+00:00',
            'targetType': '0',  # 0=cloud, 1=local device
        },
    }
)

data = response.json()
for segment in data['data']['list']:
    print(f\\
```

---

### `POST` Capture Snapshot
**Identificador Único:** `capture-snapshot`  
**Ruta:** `/api/hccgw/resource/v1/device/capturePic`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/resource/v1/device/capturePic`  
**Descripción Funcional:** Capture a snapshot image from a device camera. Returns a URL to the captured image.

**Reglas Operativas y Restricciones:**
- Device must be online for capture to succeed
- Capture URL is temporary and may expire

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `deviceSerial` | `string` | Required | Device serial number |
| `channelNo` | `number` | Optional | Channel number (defaults to 1) (Default:  1 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `captureUrl` | `string` | Required | URL of the captured snapshot image |

#### Ejemplos de Implementación de Código

**Python (Requests):**
```python
import requests

# Capture a snapshot from a device camera
response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/resource/v1/device/capturePic',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'deviceSerial': 'DS-2CD2143G2-I-ABC123',
        'channelNo': 1,
    }
)

data = response.json()
capture_url = data['data']['captureUrl']
print(f'Snapshot URL: {capture_url}')
```

---

### `POST` Get Recording Schedule
**Identificador Único:** `recording-schedule`  
**Ruta:** `/api/hccgw/video/v1/recordsettings/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/video/v1/recordsettings/get`  
**Descripción Funcional:** Get the recording schedule settings for a camera.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `resourceId` | `string` | Required | Camera resource ID |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `settings` | `object` | Required | Recording schedule configuration |

#### Ejemplos de Implementación de Código

**Python (Requests):**
```python
import requests

# Get recording schedule settings for a camera
response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/video/v1/recordsettings/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'resourceId': 'camera_resource_id'}
)

data = response.json()
print(f'Recording settings: {data[\\
```

---

## Módulo 7: Video Intercom Services (Video Porteros e Intercomunicación)

> Edificios residenciales, gestión de inquilinos y expedición de pases temporales de visitantes.

### `POST` Add Building
**Identificador Único:** `add-building`  
**Ruta:** `/api/hccgw/visp/v1/buildings/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/visp/v1/buildings/add`  
**Descripción Funcional:** Register a new building for intercom services.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `buildingName` | `string` | Required | Name of the building |
| `buildingNo` | `string` | Required | Building number |
| `address` | `string` | Optional | Building address |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `buildingId` | `string` | Required | ID of the created building |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/visp/v1/buildings/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    buildingName: 'Main Building',
    buildingNo: 'A1',
    address: '123 Main Street',
  }),
})

const data = await response.json()
const buildingId = data.data.buildingId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/visp/v1/buildings/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'buildingName': 'Main Building',
        'buildingNo': 'A1',
        'address': '123 Main Street',
    }
)

data = response.json()
building_id = data['data']['buildingId']
```

---

### `POST` Get Buildings
**Identificador Único:** `get-buildings`  
**Ruta:** `/api/hccgw/visp/v1/buildings/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/visp/v1/buildings/get`  
**Descripción Funcional:** Retrieve list of buildings.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total building count |
| `list` | `array` | Required | Array of building objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/visp/v1/buildings/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    pageNo: 1,
    pageSize: 20,
  }),
})

const data = await response.json()
data.data.list.forEach(building => {
  console.log(building.buildingName)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/visp/v1/buildings/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'pageNo': 1, 'pageSize': 20}
)

data = response.json()
for building in data['data']['list']:
    print(building['buildingName'])
```

---

### `POST` Add Resident
**Identificador Único:** `add-resident`  
**Ruta:** `/api/hccgw/visp/v1/residents/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/visp/v1/residents/add`  
**Descripción Funcional:** Register a new resident.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `residentName` | `string` | Required | Name of the resident |
| `phoneNo` | `string` | Required | Phone number |
| `buildingId` | `string` | Required | Building ID |
| `roomNo` | `string` | Required | Room number |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `residentId` | `string` | Required | ID of the created resident |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/visp/v1/residents/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    residentName: 'John Doe',
    phoneNo: '+1234567890',
    buildingId: 'building_001',
    roomNo: '101',
  }),
})

const data = await response.json()
const residentId = data.data.residentId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/visp/v1/residents/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'residentName': 'John Doe',
        'phoneNo': '+1234567890',
        'buildingId': 'building_001',
        'roomNo': '101',
    }
)

data = response.json()
resident_id = data['data']['residentId']
```

---

### `POST` Issue Visitor Pass
**Identificador Único:** `issue-pass`  
**Ruta:** `/api/hccgw/visp/v1/passes/issue`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/visp/v1/passes/issue`  
**Descripción Funcional:** Issue a temporary visitor pass.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `residentId` | `string` | Required | Resident ID issuing the pass |
| `visitorName` | `string` | Required | Visitor name |
| `validFrom` | `string` | Required | Pass validity start (ISO 8601) |
| `validTo` | `string` | Required | Pass validity end (ISO 8601) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `passCode` | `string` | Required | Pass code for the visitor |
| `qrCode` | `string` | Required | QR code image URL |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/visp/v1/passes/issue', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    residentId: 'resident_001',
    visitorName: 'Jane Smith',
    validFrom: '2024-01-20T09:00:00Z',
    validTo: '2024-01-20T18:00:00Z',
  }),
})

const data = await response.json()
const passCode = data.data.passCode
const qrCode = data.data.qrCode
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/visp/v1/passes/issue',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'residentId': 'resident_001',
        'visitorName': 'Jane Smith',
        'validFrom': '2024-01-20T09:00:00Z',
        'validTo': '2024-01-20T18:00:00Z',
    }
)

data = response.json()
pass_code = data['data']['passCode']
qr_code = data['data']['qrCode']
```

---

## Módulo 8: Access Control Services (Control de Acceso y Torniquetes)

> Apertura/cierre remoto de puertas/torniquetes, información de cifrado, niveles de acceso y asignación a personas.

### `POST` Remote Door Control
**Identificador Único:** `remote-control`  
**Ruta:** `/api/hccgw/acs/v1/remote/control`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/acs/v1/remote/control`  
**Descripción Funcional:** Remotely control a door (open/close/remain open).

**Reglas Operativas y Restricciones:**
- Ensure proper permissions before remote control
- Control actions are logged for audit purposes

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `doorId` | `string` | Required | Door identifier |
| `controlType` | `string` | Required | Control action  open  close  remainOpen  remainClose |

#### Parámetros de Respuesta
*Estructura estándar de éxito: `{ errorCode: "0", message: "success", data: {} }`*

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/acs/v1/remote/control', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    doorId: 'door_001',
    controlType: 'open',
  }),
})

const data = await response.json()
if (data.errorCode === '0') {
  console.log('Door opened successfully')
}
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/acs/v1/remote/control',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'doorId': 'door_001',
        'controlType': 'open',
    }
)

data = response.json()
if data['errorCode'] == '0':
    print('Door opened successfully')
```

---

### `GET` Get Encryption Info
**Identificador Único:** `get-encrypt-info`  
**Ruta:** `/api/hccgw/acs/v1/encryptinfo/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/acs/v1/encryptinfo/get`  
**Descripción Funcional:** Get encryption information for secure Bluetooth communication.

#### Parámetros de Solicitud
*Sin cuerpo JSON. Requiere únicamente la cabecera `Token: <accessToken>`.*

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `publicKey` | `string` | Required | Public key for encryption |
| `algorithm` | `string` | Required | Encryption algorithm |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/acs/v1/encryptinfo/get', {
  method: 'GET',
  headers: {
    'Token': accessToken,
  },
})

const data = await response.json()
const publicKey = data.data.publicKey
const algorithm = data.data.algorithm
```

**Python (Requests):**
```python
import requests

response = requests.get(
    'https://ius.hikcentralconnect.com/api/hccgw/acs/v1/encryptinfo/get',
    headers={'Token': access_token}
)

data = response.json()
public_key = data['data']['publicKey']
algorithm = data['data']['algorithm']
```

---

### `POST` Get Access Levels
**Identificador Único:** `get-access-levels`  
**Ruta:** `/api/hccgw/acspm/v1/accesslevel/list`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/acspm/v1/accesslevel/list`  
**Descripción Funcional:** Retrieve list of access levels.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total count |
| `list` | `array` | Required | Array of access level objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/acspm/v1/accesslevel/list', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    pageNo: 1,
    pageSize: 20,
  }),
})

const data = await response.json()
data.data.list.forEach(level => {
  console.log(`Access Level: ${level.name}`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/acspm/v1/accesslevel/list',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'pageNo': 1, 'pageSize': 20}
)

data = response.json()
for level in data['data']['list']:
    print(f\\
```

---

### `POST` Assign Access to Person
**Identificador Único:** `assign-access`  
**Ruta:** `/api/hccgw/acspm/v1/personaccess/assign`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/acspm/v1/personaccess/assign`  
**Descripción Funcional:** Assign access levels to a person.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `personId` | `string` | Required | Person identifier |
| `accessLevelIds` | `array` | Required | Array of access level IDs |

#### Parámetros de Respuesta
*Estructura estándar de éxito: `{ errorCode: "0", message: "success", data: {} }`*

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/acspm/v1/personaccess/assign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    personId: 'person_001',
    accessLevelIds: ['level_001', 'level_002'],
  }),
})

const data = await response.json()
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/acspm/v1/personaccess/assign',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'personId': 'person_001',
        'accessLevelIds': ['level_001', 'level_002'],
    }
)

data = response.json()
```

---

## Módulo 9: Person Management Services (Gestión de Personas y Credenciales)

> Organización en grupos, alta de personal, carga de foto facial biométrica y búsquedas.

### `POST` Search Person Groups
**Identificador Único:** `search-groups`  
**Ruta:** `/api/hccgw/person/v1/groups/search`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/person/v1/groups/search`  
**Descripción Funcional:** Search for person groups (departments).

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `keyword` | `string` | Optional | Search keyword |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total count |
| `list` | `array` | Required | Array of group objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/person/v1/groups/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    keyword: 'Engineering',
    pageNo: 1,
    pageSize: 20,
  }),
})

const data = await response.json()
data.data.list.forEach(group => {
  console.log(`Group: ${group.groupName}`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/person/v1/groups/search',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'keyword': 'Engineering', 'pageNo': 1, 'pageSize': 20}
)

data = response.json()
for group in data['data']['list']:
    print(f\\
```

---

### `POST` Add Person
**Identificador Único:** `add-person`  
**Ruta:** `/api/hccgw/person/v1/persons/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/add`  
**Descripción Funcional:** Add a new person to the system.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `personName` | `string` | Required | Full name of the person |
| `groupId` | `string` | Required | Group/department ID |
| `phoneNo` | `string` | Optional | Phone number |
| `email` | `string` | Optional | Email address |
| `cardNo` | `string` | Optional | Card number |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `personId` | `string` | Required | ID of the created person |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    personName: 'John Smith',
    groupId: 'group_001',
    phoneNo: '+1234567890',
    email: 'john.smith@example.com',
    cardNo: 'CARD123456',
  }),
})

const data = await response.json()
const personId = data.data.personId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'personName': 'John Smith',
        'groupId': 'group_001',
        'phoneNo': '+1234567890',
        'email': 'john.smith@example.com',
        'cardNo': 'CARD123456',
    }
)

data = response.json()
person_id = data['data']['personId']
```

---

### `POST` Upload Person Photo
**Identificador Único:** `upload-photo`  
**Ruta:** `/api/hccgw/person/v1/persons/photo`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/photo`  
**Descripción Funcional:** Upload a photo for facial recognition.

**Reglas Operativas y Restricciones:**
- Photo should be a clear frontal face image
- Recommended resolution: 640x480 or higher
- Maximum file size: 200KB (base64 encoded)

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `personId` | `string` | Required | Person identifier |
| `photoBase64` | `string` | Required | Base64 encoded photo (JPEG/PNG) |

#### Parámetros de Respuesta
*Estructura estándar de éxito: `{ errorCode: "0", message: "success", data: {} }`*

#### Ejemplos de Implementación de Código

**Python (Requests):**
```python
import requests
import base64

# Read image and convert to base64
with open('/path/to/photo.jpg', 'rb') as f:
    photo_base64 = base64.b64encode(f.read()).decode('utf-8')

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/photo',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'personId': 'person_001',
        'photoBase64': photo_base64,
    }
)

data = response.json()
```

---

### `POST` Quick Add Person
**Identificador Único:** `quick-add-person`  
**Ruta:** `/api/hccgw/person/v1/persons/quick/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/quick/add`  
**Descripción Funcional:** Quickly add a person with photo and card in a single request.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `personName` | `string` | Required | Full name |
| `groupId` | `string` | Required | Group/department ID |
| `photoBase64` | `string` | Optional | Base64 encoded photo |
| `cardNo` | `string` | Optional | Card number |
| `accessLevelIds` | `array` | Optional | Access level IDs to assign |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `personId` | `string` | Required | ID of the created person |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/quick/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    personName: 'Jane Doe',
    groupId: 'group_001',
    photoBase64: photoBase64String,
    cardNo: 'CARD789012',
    accessLevelIds: ['level_001'],
  }),
})

const data = await response.json()
const personId = data.data.personId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/quick/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'personName': 'Jane Doe',
        'groupId': 'group_001',
        'photoBase64': photo_base64_string,
        'cardNo': 'CARD789012',
        'accessLevelIds': ['level_001'],
    }
)

data = response.json()
person_id = data['data']['personId']
```

---

### `POST` Search Persons
**Identificador Único:** `search-persons`  
**Ruta:** `/api/hccgw/person/v1/persons/search`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/search`  
**Descripción Funcional:** Search for persons with various filters.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `keyword` | `string` | Optional | Search keyword |
| `groupId` | `string` | Optional | Filter by group |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total count |
| `list` | `array` | Required | Array of person objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    keyword: 'John',
    groupId: 'group_001',
    pageNo: 1,
    pageSize: 20,
  }),
})

const data = await response.json()
console.log('Found:', data.data.total, 'persons')
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/person/v1/persons/search',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'keyword': 'John',
        'groupId': 'group_001',
        'pageNo': 1,
        'pageSize': 20,
    }
)

data = response.json()
print(f\\
```

---

## Módulo 10: On-Board Monitoring Services (Monitoreo Móvil / Vehicular OBD)

> Gestión de vehículos de transporte, asignación de conductores y ubicación GPS en tiempo real.

### `POST` Add Vehicle
**Identificador Único:** `add-vehicle`  
**Ruta:** `/api/hccgw/obd/v1/vehicles/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/add`  
**Descripción Funcional:** Register a new vehicle.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `plateNo` | `string` | Required | Vehicle plate number |
| `vehicleName` | `string` | Optional | Vehicle name/identifier |
| `deviceId` | `string` | Optional | Associated device ID |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `vehicleId` | `string` | Required | ID of the created vehicle |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    plateNo: 'ABC-1234',
    vehicleName: 'Delivery Truck 1',
    deviceId: 'device_001',
  }),
})

const data = await response.json()
const vehicleId = data.data.vehicleId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'plateNo': 'ABC-1234',
        'vehicleName': 'Delivery Truck 1',
        'deviceId': 'device_001',
    }
)

data = response.json()
vehicle_id = data['data']['vehicleId']
```

---

### `POST` Get Vehicles
**Identificador Único:** `get-vehicles`  
**Ruta:** `/api/hccgw/obd/v1/vehicles/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/get`  
**Descripción Funcional:** Retrieve list of vehicles.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |
| `plateNo` | `string` | Optional | Filter by plate number |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total count |
| `list` | `array` | Required | Array of vehicle objects |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    pageNo: 1,
    pageSize: 20,
  }),
})

const data = await response.json()
data.data.list.forEach(vehicle => {
  console.log(`${vehicle.plateNo}: ${vehicle.vehicleName}`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'pageNo': 1, 'pageSize': 20}
)

data = response.json()
for vehicle in data['data']['list']:
    print(f\\
```

---

### `POST` Add Driver
**Identificador Único:** `add-driver`  
**Ruta:** `/api/hccgw/obd/v1/drivers/add`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/obd/v1/drivers/add`  
**Descripción Funcional:** Register a new driver.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `driverName` | `string` | Required | Driver name |
| `licenseNo` | `string` | Required | License number |
| `phoneNo` | `string` | Optional | Phone number |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `driverId` | `string` | Required | ID of the created driver |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/obd/v1/drivers/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    driverName: 'Mike Johnson',
    licenseNo: 'DL123456789',
    phoneNo: '+1234567890',
  }),
})

const data = await response.json()
const driverId = data.data.driverId
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/obd/v1/drivers/add',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'driverName': 'Mike Johnson',
        'licenseNo': 'DL123456789',
        'phoneNo': '+1234567890',
    }
)

data = response.json()
driver_id = data['data']['driverId']
```

---

### `POST` Get Vehicle Location
**Identificador Único:** `get-vehicle-location`  
**Ruta:** `/api/hccgw/obd/v1/vehicles/location`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/location`  
**Descripción Funcional:** Get current location of a vehicle.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `vehicleId` | `string` | Required | Vehicle identifier |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `latitude` | `number` | Required | Latitude coordinate |
| `longitude` | `number` | Required | Longitude coordinate |
| `speed` | `number` | Required | Current speed (km/h) |
| `timestamp` | `string` | Required | Location timestamp |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/location', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    vehicleId: 'vehicle_001',
  }),
})

const data = await response.json()
const { latitude, longitude, speed, timestamp } = data.data
console.log(`Location: ${latitude}, ${longitude} - Speed: ${speed} km/h`)
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/obd/v1/vehicles/location',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={'vehicleId': 'vehicle_001'}
)

data = response.json()
lat = data['data']['latitude']
lon = data['data']['longitude']
speed = data['data']['speed']
print(f'Location: {lat}, {lon} - Speed: {speed} km/h')
```

---

## Módulo 11: Attendance Services (Control de Asistencia / Tiempo y Asistencia)

> Extracción de registros de checadas biométricas, reportes de tarjetas de tiempo y resúmenes de asistencia.

### `POST` Get Attendance Records
**Identificador Único:** `get-attendance-records`  
**Ruta:** `/api/hccgw/attendance/v1/records/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/records/get`  
**Descripción Funcional:** Retrieve attendance check-in/out records.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `startTime` | `string` | Required | Start time (ISO 8601) |
| `endTime` | `string` | Required | End time (ISO 8601) |
| `personIds` | `array` | Optional | Filter by person IDs |
| `groupId` | `string` | Optional | Filter by group |
| `pageIndex` | `number` | Required | Page index (Comienza en 1. *Nota: La pasarela en la nube valida estrictamente `pageIndex`*) |
| `pageNo` | `number` | Optional | Page number (Alias de paginación) |
| `pageSize` | `number` | Optional | Items per page (Default:  20 ) |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `total` | `number` | Required | Total record count |
| `list` | `array` | Required | Array of attendance records |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/records/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2024-01-31T23:59:59Z',
    groupId: 'group_001',
    pageNo: 1,
    pageSize: 50,
  }),
})

const data = await response.json()
console.log('Total records:', data.data.total)
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/records/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'startTime': '2024-01-01T00:00:00Z',
        'endTime': '2024-01-31T23:59:59Z',
        'groupId': 'group_001',
        'pageNo': 1,
        'pageSize': 50,
    }
)

data = response.json()
print(f\\
```

---

### `POST` Get Time Card Report
**Identificador Único:** `get-time-card-report`  
**Ruta:** `/api/hccgw/attendance/v1/timecard/report`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/timecard/report`  
**Descripción Funcional:** Generate a time card report for specified period.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `startDate` | `string` | Required | Start date (YYYY-MM-DD) |
| `endDate` | `string` | Required | End date (YYYY-MM-DD) |
| `personIds` | `array` | Optional | Filter by person IDs |
| `groupId` | `string` | Optional | Filter by group |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `report` | `array` | Required | Array of time card entries |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/timecard/report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    groupId: 'group_001',
  }),
})

const data = await response.json()
data.data.report.forEach(entry => {
  console.log(`${entry.personName}: ${entry.totalHours} hours`)
})
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/timecard/report',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'startDate': '2024-01-01',
        'endDate': '2024-01-31',
        'groupId': 'group_001',
    }
)

data = response.json()
for entry in data['data']['report']:
    print(f\\
```

---

### `POST` Get Attendance Summary
**Identificador Único:** `get-attendance-summary`  
**Ruta:** `/api/hccgw/attendance/v1/summary/get`  
**URL Absoluta (América):** `https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/summary/get`  
**Descripción Funcional:** Get attendance summary statistics.

#### Parámetros de Solicitud (Payload)
| Parámetro | Tipo de Dato | Obligatorio | Descripción / Valores Permitidos |
| :--- | :--- | :--- | :--- |
| `date` | `string` | Required | Date (YYYY-MM-DD) |
| `groupId` | `string` | Optional | Filter by group |

#### Parámetros de Respuesta en `data`
| Campo | Tipo de Dato | Obligatorio | Descripción / Significado |
| :--- | :--- | :--- | :--- |
| `totalPersons` | `number` | Required | Total persons |
| `checkedIn` | `number` | Required | Number checked in |
| `absent` | `number` | Required | Number absent |
| `late` | `number` | Required | Number late |

#### Ejemplos de Implementación de Código

**TypeScript (Node.js / Fetch):**
```typescript
const response = await fetch('https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/summary/get', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Token': accessToken,
  },
  body: JSON.stringify({
    date: '2024-01-15',
    groupId: 'group_001',
  }),
})

const data = await response.json()
const { totalPersons, checkedIn, absent, late } = data.data
console.log(`Checked in: ${checkedIn}/${totalPersons}, Late: ${late}, Absent: ${absent}`)
```

**Python (Requests):**
```python
import requests

response = requests.post(
    'https://ius.hikcentralconnect.com/api/hccgw/attendance/v1/summary/get',
    headers={
        'Content-Type': 'application/json',
        'Token': access_token,
    },
    json={
        'date': '2024-01-15',
        'groupId': 'group_001',
    }
)

data = response.json()
summary = data['data']
print(f\\
```

---

## 15. Catálogo Completo de Códigos de Error (Error Codes Reference)

Listado oficial de códigos de respuesta emitidos por el Cloud Gateway `hccgw` de HikCentral Connect:

| Código Hex / Decimal | Nombre del Error | Causa Raíz Técnica | Acción Correctiva / Solución |
| :--- | :--- | :--- | :--- |
| `0` | **Success** | The request was successful. | - |
| `0x1001` | **Invalid Parameter** | One or more request parameters are invalid or missing. | Check that all required parameters are provided and have valid values. |
| `0x1002` | **Parameter Type Error** | A parameter has an incorrect data type. | Verify that parameter types match the API specification (string, number, array, etc.). |
| `0x1003` | **Parameter Out of Range** | A parameter value is outside the allowed range. | Check the allowed range for numeric parameters in the API documentation. |
| `0x2001` | **Authentication Failed** | Invalid or expired access token. | Refresh your access token or obtain a new one using the /token/get endpoint. |
| `0x2002` | **Invalid App Key** | The provided app key is invalid or has been revoked. | Verify your app key is correct and active in the HikCentral Connect portal. |
| `0x2003` | **Invalid Secret Key** | The provided secret key is invalid. | Verify your secret key matches the one in the HikCentral Connect portal. |
| `0x2004` | **Token Expired** | The access token has expired. | Refresh your token using the /token/refresh endpoint or obtain a new one. |
| `0x2005` | **Permission Denied** | The account does not have permission for this operation. | Contact your administrator to grant the required permissions. |
| `0x2006` | **Rate Limit Exceeded** | Too many requests in a short period. Rate limit is 5 requests per second. | Implement request throttling in your application. Wait before retrying. |
| `0x3001` | **Resource Not Found** | The requested resource (device, camera, area, etc.) does not exist. | Verify the resource ID is correct and the resource has not been deleted. |
| `0x3002` | **Resource Already Exists** | A resource with the same identifier already exists. | Use a different identifier or update the existing resource instead. |
| `0x3003` | **Resource Limit Exceeded** | The maximum number of resources has been reached. | Upgrade your service package or delete unused resources. |
| `0x3004` | **Device Offline** | The device is currently offline and cannot respond to commands. | Check the device network connection and power status. |
| `0x3005` | **Device Busy** | The device is busy processing another request. | Wait and retry the request after a short delay. |
| `0x3006` | **Invalid Device Serial** | The device serial number is invalid or already registered. | Verify the serial number is correct and not registered to another account. |
| `0x3007` | **Invalid Validation Code** | The device validation code is incorrect. | Check the validation code on the device label or in the device documentation. |
| `EVZ60019` | **Encrypted Stream** | The camera stream is encrypted. HLS and FLV protocols cannot be used. | Use EZOPEN protocol (protocol: "1") and play the stream with EZUIKit JS SDK. See the EZUIKit Integration section. |
| `0x4001` | **Video Stream Error** | Failed to establish video stream connection. | Check camera connectivity and try again. Verify the protocol is supported. |
| `0x4002` | **Recording Not Found** | No recording available for the specified time range. | Verify the camera has recording enabled and check the time range. |
| `0x4003` | **Stream Token Expired** | The streaming token has expired. | Obtain a new streaming token using the /streamtoken/get endpoint. |
| `0x5001` | **Subscription Failed** | Failed to create message queue subscription. | Verify the event types are valid and try again. |
| `0x5002` | **Queue Not Found** | The specified message queue does not exist. | Create a new subscription to get a new queue ID. |
| `0x5003` | **Message Acknowledge Failed** | Failed to acknowledge messages. | Verify the message IDs are valid and belong to the specified queue. |
| `0x6001` | **Person Photo Invalid** | The uploaded photo does not meet requirements. | Ensure the photo is a clear frontal face image, minimum 640x480, under 200KB. |
| `0x6002` | **Card Number Duplicate** | The card number is already assigned to another person. | Use a different card number or remove it from the existing person. |
| `0x6003` | **Face Recognition Failed** | No face detected in the uploaded photo. | Upload a clear photo with a visible frontal face. |
| `0x7001` | **Access Control Error** | Failed to execute access control command. | Verify the door is connected and try again. |
| `0x7002` | **Door Not Configured** | The door is not properly configured for remote control. | Configure the door in the HikCentral Connect portal. |
| `0x8001` | **Internal Server Error** | An unexpected error occurred on the server. | Try again later. If the problem persists, contact support. |
| `0x8002` | **Service Unavailable** | The service is temporarily unavailable. | Wait and retry. Check the HikCentral Connect status page. |
| `0x8003` | **Database Error** | A database error occurred. | Try again later. If the problem persists, contact support. |