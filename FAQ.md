# ❓ Bitácora Viva de Preguntas Frecuentes (FAQ.md)

> **Proyecto:** AccessCore & Gym POS V2.5 (Integración GYMS)  
> **Propósito:** Registro didáctico y conceptual de dudas, decisiones de diseño y operativa del sistema para facilitar el aprendizaje continuo sin frustración (§1 de GEMINI.md).

---

## 📑 Índice de Preguntas

1. [¿Por qué los niveles de acceso se asignan por persona y no por departamento en Hik-Connect Teams?](#faq-01)
2. [¿Cómo funcionan los tiempos de vigencia (Pase de 1 día vs. Mensualidad) y qué pasa a las 11:59 PM?](#faq-02)
3. [¿Cómo se corta el acceso en Teams al vencerse un plan: se revoca la puerta o se borra la persona?](#faq-03)
4. [¿Qué pasa si la computadora del gimnasio se apaga a medianoche o se corta el internet? ¿El checador sigue bloqueando el acceso?](#faq-04)
5. [¿Cómo funciona la acumulación de vigencias (Rollover) si un socio paga antes de que venza su mes?](#faq-05)
6. [¿Por qué no verificar a todos los socios contra el checador cada vez que se carga la lista o se busca a una persona?](#faq-06)
7. [¿Cómo editar los datos mal capturados de un cliente y cómo limitarlo a administradores (RBAC)?](#faq-07)
8. [¿Por qué Hikvision devolvía OPEN000010 y cómo se traducen los errores técnicos a explicaciones humanas?](#faq-08)
9. [¿Por qué un pase diario tenía 30 días de vigencia en las pruebas y cómo se garantiza su corte hoy a las 11:59 PM?](#faq-09)
10. [¿Por qué se subió a Teams sin foto y qué causaba el error al forzar envío al checador?](#faq-10)
11. [¿Cómo funciona el ID / Código de Persona para gimnasios con sistema previo vs. consecutivos nuevos?](#faq-11)
12. [¿Por qué la persona aparecía en Teams "Sin acceso concedido" y cómo se asigna el nivel de acceso en la OpenAPI V2.11?](#faq-12)
13. [¿Qué pasa cuando damos de baja a un socio en el sistema? ¿Cómo evitamos perder su historial y cómo liberamos el checador?](#faq-13)

---

<a name="faq-01"></a>
### 1. ¿Por qué los niveles de acceso se asignan por persona y no por departamento en Hik-Connect Teams?

- **Pregunta Original de Mario:**  
  *"¿Estoy entendiendo que estamos dando el nivel de acceso por persona y no por departamento en Teams verdad y el que lleva la gestión es nuestro software verdad, es la mejor opción?"*
- **Formulación Técnica Formal:**  
  *¿Es conveniente adoptar un modelo de control de acceso discrecional granular basado en personas administrado por el software POS local (Master Record) en lugar del modelo jerárquico de departamentos de Hik-Connect Teams?*
- **Explicación Didáctica (La Analogía del Hotel vs. la Oficina):**  
  Los departamentos en Teams están diseñados para empresas (ej. *Contabilidad, Mantenimiento*), donde todos entran en el mismo horario y nadie paga mensualidad. En un gimnasio, cada socio tiene un reloj biológico y de pago único: Juan pagó el 1 de marzo, María el 15 de marzo y Pedro una visita de hoy. Si los agrupáramos por departamento en Teams, tendríamos que inventar departamentos monstruosos (*"Mensual Normal"*, *"Mensual + Alberca"*, *"Trimestre VIP"*) y si uno no paga no podríamos sacarlo sin alterar el grupo. Además, Teams limita cada cuenta a 100 usuarios gratis; los departamentos de la Cuenta A no existen en la Cuenta B.
- **Solución Aplicada en GymAccess Pro:**  
  GymAccess Pro es el cerebro maestro. Guarda los datos, pagos y vigencias en SQLite local. Hik-Connect Teams es solo el "músculo ejecutor". El software le indica a la API de Teams exactamente a qué persona (`personId`) qué niveles/puertas (`accessLevelIds`) abrir y hasta qué fecha, otorgando control total sin importar si hay múltiples cuentas Teams conectadas.

---

<a name="faq-02"></a>
### 2. ¿Cómo funcionan los tiempos de vigencia (Pase de 1 día vs. Mensualidad) y qué pasa a las 11:59 PM?

- **Pregunta Original de Mario:**  
  *"¿Cómo funcionan los tiempos, por ejemplo si alguien viene por un día a las 4:50 pm, su vigencia es hasta mañana a las 11:59? ¿o hasta mañana a las 4:50 pm?"*
- **Formulación Técnica Formal:**  
  *¿Cómo se computa el ciclo de expiración temporal para membresías de corta duración (Pase Diario) frente a suscripciones periódicas multidiarias?*
- **Explicación Didáctica (La Analogía del Cine / Parque de Diversiones):**  
  Una visita diaria es un boleto de entrenamiento para **hoy**. Si compras un boleto de cine a las 4:50 PM, no puedes volver a entrar mañana a la 1:00 PM con ese boleto. Si el sistema contara 24 horas exactas (hasta mañana a las 4:50 PM), el socio podría entrenar dos días distintos pagando un solo pase diario.
- **Solución Aplicada en GymAccess Pro:**  
  - **Pase Diario (1 día):** Vence **hoy mismo a las 23:59:59**. Si vino a las 4:50 PM, tiene lo que resta del día para entrenar. Mañana deberá comprar su nuevo pase.
  - **Planes Multidía (Semana, Mes, Trimestre, Año):** Suman los días completos y vencen a las **23:59:59 del último día contratado**, garantizando que el socio disfrute todos sus días completos.

---

<a name="faq-03"></a>
### 3. ¿Cómo se corta el acceso en Teams al vencerse un plan: se revoca la puerta o se borra la persona?

- **Pregunta Original de Mario:**  
  *"¿Cómo cierras el acceso a las personas dentro de Teams? ¿Le das vigencia a la persona o el sistema borrará la persona cuando se venza, o cómo operamos?"*
- **Formulación Técnica Formal:**  
  *¿Cuál es el ciclo de vida de desautorización: vaciado de AccessLevelIds (revocación lógica) vs. DELETE de la entidad Person (purga física)?*
- **Explicación Didáctica (Desprogramar la Llave vs. Echar las Maletas del Hotel):**  
  - **Revocar el Nivel de Acceso (`accessLevelIds: []`):** Es como desprogramar la tarjeta de la habitación. El huésped sigue en el libro de huéspedes, pero la cerradura parpadea en rojo y no abre. Si baja a recepción a pagar otra noche, se le reactiva la llave en 1 segundo sin pedirle foto ni llenar papeleo de nuevo.
  - **Borrado Físico (`/persons/delete`):** Es borrar completamente a la persona de la nube y del checador para liberar uno de los 100 cupos gratuitos de Teams.
- **Solución Aplicada en GymAccess Pro:**  
  Estrategia híbrida de 2 niveles:
  1. **Día a Día:** El checador corta el paso al llegar a la fecha fin (`endDate`). Si la persona vuelve, se reactiva en 1 segundo.
  2. **Mantenimiento (Buzón de Triaje):** Cuando se acumulan decenas de personas que vinieron un solo día y llevan semanas sin volver, el administrador abre el botón **"☁️ Triaje Checador (Teams)"** y presiona **"Purgar No Registrados"** para recuperar cupos libres. Y si esa persona regresa meses después, ¡GymAccess Pro conserva su foto en la PC local y la vuelve a subir al checador con un solo clic!

---

<a name="faq-04"></a>
### 4. ¿Qué pasa si la computadora del gimnasio se apaga a medianoche o se corta el internet? ¿El checador sigue bloqueando el acceso?

- **Pregunta Original de Mario:**  
  *"Para que la opción funcione el sistema tiene que estar encendido, pero puede que se dañe la PC, se pierdan credenciales, etc. Si se le da una vigencia a la persona en Teams que se manda al checador, ¿expira automáticamente?"*
- **Formulación Técnica Formal:**  
  *¿Cómo se implementa la resiliencia offline (Edge Computing) ante fallas de host local mediante el reloj de tiempo real (RTC) y la memoria flash de las terminales biométricas?*
- **Explicación Didáctica (El Síndrome del Guardia Dormido):**  
  Si el torniquete dependiera de que la PC le mande la orden de corte a las 11:59 PM, bastaría con que la recepcionista apague la PC a las 10:00 PM o se corte la luz para que al día siguiente a las 6:00 AM todos los socios vencidos entren gratis porque "el guardia se quedó dormido".
- **Solución Aplicada en GymAccess Pro:**  
  Los checadores Hikvision tienen un chip con procesador, memoria flash y **reloj interno de cuarzo (RTC)** con batería. GymAccess Pro inyecta los campos nativos `startDate` y `endDate` en formato ISO con huso horario (`YYYY-MM-DDTHH:mm:ss-06:00`) a través de la OpenAPI de Teams. El checador guarda esa fecha en su chip. Al llegar las **11:59:59 PM**, el checador mira su propio reloj y **bloquea el paso por sí mismo de forma 100% autónoma**, sin necesitar que la PC esté encendida ni que haya internet.

---

<a name="faq-05"></a>
### 5. ¿Cómo funciona la acumulación de vigencias (Rollover) si un socio paga antes de que venza su mes?

- **Pregunta Original de Mario:**  
  *"Cuando un cliente viene a pagar hay que sumar la nueva vigencia a la actual, por si ya se le venció o aún le quedan días, y eso debe ser visible desde una interfaz de cliente por si se solicita la información o se quiere editar la información."*
- **Formulación Técnica Formal:**  
  *¿Cuál es el algoritmo de cómputo acumulativo de vigencias (Rollover) para renovaciones anticipadas frente a renovaciones post-expiración?*
- **Explicación Didáctica:**  
  Si a un socio le quedan 4 días de su membresía y hoy paga 30 días más, ponerle "hoy + 30 días" sería una estafa porque le robarías los 4 días que ya pagó. Debe acumularse a su vencimiento anterior.
- **Solución Aplicada en GymAccess Pro:**  
  - **Renovación Anticipada:** Si `fecha_fin > hoy`, el nuevo vencimiento es: `fecha_fin_actual + días_del_plan`. (Le quedan sus días anteriores + los nuevos).
  - **Renovación Vencida:** Si el socio ya estaba vencido, arranca desde hoy a las 23:59:59 + `días_del_plan`.
  - **Ficha Visual en Pantalla:** En la pantalla de **Personas**, cada socio tiene un badge con sus días restantes (`X días restantes` o `Vencido hace X días`) y un botón **"📅 Ficha"** que permite ver su carnet, consultar sus fechas y extenderle días de cortesía (+7, +15, +30 días o fecha exacta) actualizando tanto la base de datos como el checador al instante.

---

<a name="faq-06"></a>
### 6. ¿Por qué no verificar a todos los socios contra el checador cada vez que se carga la lista o se busca a una persona? ¿Y qué hacer si alguien no se mandó al checador?

- **Pregunta Original de Mario:**  
  *"¿Cada vez que consulto a las personas es viable que haga una revisión de las personas que tengo ahí y verifique si ya están en el checador y qué nivel de acceso tienen según su paquete cuidando los límites de la API? Además quiero poder editar su foto con el carnet 3:4, ver sus accesos y tener la opción de forzar el envío manualmente si tiene un paquete pagado."*
- **Formulación Técnica Formal:**  
  *¿Cómo mitigar el cuello de botella de latencia y el bloqueo por Rate Limiting (0x2006 / HTTP 429) de la OpenAPI de HikCentral Connect Teams (límite de 5 req/s) implementando sincronización local con persistencia de estado y reconciliación manual bajo demanda (Ficha Integral)?*
- **Explicación Didáctica (La Garita de Peaje y la Llamada Telefónica):**  
  Imagina que en el gimnasio hay 80 personas registradas. Si cada vez que la recepcionista abre la pantalla de socios o escribe una letra en el buscador, el sistema llamara por teléfono a la nube de Hikvision 80 veces seguidas (*"Oye, ¿está Carlos? ¿Y qué puertas tiene? ¿Y Juan?..."*):
  1. Hikvision colgaría la llamada: su límite estricto es de **5 preguntas por segundo**. Al segundo 2 nos botaría el error `0x2006 (Rate Limit Exceeded)`.
  2. La pantalla tardaría entre 12 y 16 segundos congelada.
- **Solución Aplicada en GymAccess Pro:**  
  - **Estado Local Instantáneo (0 ms):** SQLite ya sabe si el socio tiene `hik_person_id` (insignia verde `🟢 Checador`) o si tiene paquete pagado pero le falta enviarse (insignia amarilla `🟡 Pendiente`).
  - **Ficha Integral del Socio (`FichaPersonaModal.tsx`):** Al presionar **"🪪 Ficha"** en cualquier tarjeta:
    1. **Foto Biométrica 3:4:** Permite ver el carnet rectangular y presionar **"📷 Cambiar"** para abrir el recortador biométrico `FaceCropperModal` con la silueta antropométrica, guardando la imagen localmente y actualizándola de inmediato en el checador.
    2. **Zonas & Puertas:** Lista qué torniquetes y puertas tiene autorizadas y cuáles corresponden a su plan activo.
    3. **Vigencia:** Días restantes, selector de fecha y botones rápidos (+7d, +15d, +30d, +1a).
    4. **🚀 Forzar Envío al Checador (1-Clic):** Si el socio pagó y por cualquier falla de red no se mandó, o si se cambió su foto/puertas, este botón valida su membresía, empaqueta su foto, puertas y vigencia de chip, y lo inyecta a Teams en 1 segundo.

---

<a name="faq-07"></a>
### 7. ¿Cómo editar los datos mal capturados de un cliente y cómo limitarlo a administradores (RBAC)?

- **Pregunta Original de Mario:**  
  *"¿También es viable que podamos editar la información de clientes y datos en caso de estar mal capturadas? Y más adelante cuando pongamos autenticación y permisos ¿limitar quién lo pueda hacer?"*
- **Formulación Técnica Formal:**  
  *¿Cómo implementar la mutación atómica de atributos de identidad (nombre, apellidos, teléfono, correo) garantizando sincronización bidireccional local-hardware y preparando la arquitectura para control de acceso basado en roles (RBAC - Role-Based Access Control)?*
- **Explicación Didáctica (El Carnet de Conducir con Error Tipográfico):**  
  Si un cliente se llama "Carlos Mendoza" pero la recepcionista por error tecleó "Carols Menodza", el checador guardará el nombre chueco. Necesitamos poder corregirlo con un botón de editar sin tener que borrar al socio ni hacer que vuelva a pagar. Además, la recepcionista no debería poder cambiarle el nombre a un socio para meter a un amigo gratis; solo el Administrador o Gerente debe tener la llave para alterar identidades una vez que se implementen cuentas de usuario.
- **Solución Aplicada en GymAccess Pro:**  
  - **Edición en Ficha (`PUT /api/iam/personas/:id/datos`):** Dentro de la Ficha Integral del Socio, al presionar **"✏️ Editar"**, los campos de nombre, apellidos, teléfono y correo se vuelven editables. Al hacer clic en **"Guardar Datos"**, se actualizan en SQLite y, si el socio ya está dado de alta en Teams, el sistema llama de inmediato a `/hccgw/person/v1/persons/update` con su vigencia y código, actualizando la pantalla del checador facial al instante.
  - **Preparación para RBAC (Fase Autenticación):** El endpoint ya valida la integridad de datos. En cuanto se active el módulo de sesiones y JWT/Cookies, el middleware `requireRole(['ADMIN', 'GERENTE'])` protegerá este botón para que el cajero (`OPERADOR`) solo pueda cobrar y enrolar, pero no alterar datos históricos sin autorización.

---

<a name="faq-08"></a>
### 8. ¿Por qué Hikvision devolvía OPEN000010 y cómo se traducen los errores técnicos a explicaciones humanas?

- **Pregunta Original de Mario:**  
  *"¿Hay forma de hacer que si hay un error al actualizar sobre la API en vez de el código de error sea un error más explicativo por si lo puede corregir el usuario?"*
- **Formulación Técnica Formal:**  
  *¿Cómo abstraer códigos de estado propietarios y excepciones crudas de la OpenAPI de Hik-Connect Teams (ej. OPEN000010, 0x6001, 0x2006, 0x3003) mediante una capa semántica de traducción de dominio para ofrecer mensajes de diagnóstico claros y accionables en la interfaz de usuario?*
- **Explicación Didáctica (El Médico que Habla en Latín vs. el Médico que te Explica en Cristiano):**  
  Si el checador le dice a la cajera: *"Error OPEN000010: validated failed argument [personInfo]"*, la cajera se asusta y no sabe si se rompió la base de datos o se cayó el internet. En realidad, Hikvision solo estaba diciendo: *"Oye, el campo 'apellido' está vacío y yo necesito al menos una letra ahí para guardar a la persona"*. Una capa traductora toma ese código confuso y le dice a la cajera exactamente qué hacer: *"👤 Falta el Apellido: Hikvision requiere que el socio tenga al menos un apellido registrado"*.
- **Solución Aplicada en GymAccess Pro:**  
  - **Servicio `TeamsErrorTranslator` (`src/server/services/teamsErrorTranslator.ts`):** Mapea cada código crudo de Hikvision a un mensaje en español con icono y recomendación práctica:
    - `OPEN000010 (param valid error)` ➔ Analiza qué campo faltó (`firstName`, `lastName`, `phoneNo`, `photoBase64`, `startDate`) y le dice al usuario exactamente qué corregir.
    - `0x6001 / 0x6003 (photo invalid / face recognition failed)` ➔ *"👁️ Rostro no detectado: Centra la cara del socio en la silueta 3:4 con buena iluminación."*
    - `0x2006 (rate limit)` ➔ *"⏳ Nube ocupada: Espera 3 segundos y presiona de nuevo."*
    - `0x3003 (resource limit exceeded)` ➔ *"⚠️ Cupo Máximo Alcanzado: Ve a Triaje Checador y purga socios inactivos."*
    - `0x3004 (device offline)` ➔ *"🔌 Checador Desconectado: Verifica que el cable de red esté conectado."*

---

<a name="faq-09"></a>
### 9. ¿Por qué un pase diario tenía 30 días de vigencia en las pruebas y cómo se garantiza su corte hoy a las 11:59 PM?

- **Pregunta Original de Mario:**  
  *"Sé que es demo, pero ¿por qué tiene pase diario pero 30 días de vigencia?"*
- **Formulación Técnica Formal:**  
  *¿A qué se debía la discrepancia donde un socio con un plan de 1 día mostraba 30 días de vigencia en su ficha y cómo el motor de cobro POS calcula estrictamente el fin de vigencia en base al atributo duracion_dias?*
- **Explicación Didáctica:**  
  En las pruebas iniciales, el socio Carlos Mendoza había comprado una mensualidad de \$500 el 4 de septiembre que vencía el 4 de octubre. Cuando se probó comprarle un pase de 1 día adicional para probar el sistema, la lógica antigua de acumulación sumó 1 día a su fecha final previa (extendiendo su vigencia hasta el 5 o 6 de octubre), por lo que seguía mostrando ~30 días restantes.
- **Solución Aplicada en GymAccess Pro:**  
  El servicio de cobro `src/server/services/pos.service.ts` distingue con total claridad:
  1. Si un cliente compra un **Pase Diario** (`duracion_dias === 1`), su vigencia final es **hoy a las 23:59:59**.
  2. Al llegar a las 11:59:59 PM de hoy, el chip del checador bloquea el acceso automáticamente sin importar si la PC está apagada.
  3. En la Ficha Integral, el administrador puede consultar tanto la fecha de la membresía activa como editar manualmente el día exacto de corte si necesita otorgar cortesías o corregir fechas.

---

<a name="faq-10"></a>
### 10. ¿Por qué se subió a Teams sin foto y qué causaba el error al forzar envío al checador?

- **Pregunta Original de Mario:**  
  *"Se agregó pero sin foto, y salía una franja roja de error al forzar envío."*
- **Formulación Técnica Formal:**  
  *¿A qué discrepancias en el contrato de la OpenAPI V2.11 de Hik-Connect Teams respondían la ausencia de fotografía facial en el bucket S3 y el código de error en la sincronización manual?*
- **Explicación Didáctica (La Etiqueta Equivocada en el Paquete y la Puerta Inexistente):**  
  1. **El nombre del parámetro:** En el endpoint `/hccgw/person/v1/persons/photo`, la nube de Hikvision exige que el campo con la imagen se llame exactamente `photoData`. El código anterior le enviaba `photoBase64`, por lo que Hikvision respondía: *"Oye, no me mandaste photoData"* y no guardaba el rostro en el checador.
  2. **El endpoint de puertas:** Para darle permisos de puerta a alguien que ya existía, el sistema intentaba llamar a `/hccgw/acspm/v1/personaccess/assign`. Pero ese endpoint no existe en Teams V2.11 (devolvía 404 No Encontrado). En Teams, las puertas se asignan directamente dentro de `/hccgw/person/v1/persons/update` mediante la propiedad `accessLevelIds: [...]`.
- **Solución Aplicada en GymAccess Pro:**  
  - En `ficha.service.ts` y `teamsPerson.service.ts`, los payloads ahora envían `photoData` (y `photoBase64` como respaldo de compatibilidad). La foto se sube a AWS S3 y el checador la descarga de inmediato.
  - Se eliminó la llamada fantasma 404 a `personaccess/assign` y se integró `accessLevelIds` dentro de `/persons/update`.
  - Ahora, al presionar **"🚀 Forzar Envío al Checador"**, la barra de estado responde en verde instantáneo: *"Sincronizado con checador con éxito"*.

---

<a name="faq-11"></a>
### 11. ¿Cómo funciona el ID / Código de Persona para gimnasios con sistema previo vs. consecutivos nuevos?

- **Pregunta Original de Mario:**  
  *"No hemos tomado en cuenta el ID de persona, por si ya tienen un sistema implementado o si quieren usar uno nuevo."*
- **Formulación Técnica Formal:**  
  *¿Cómo soportar esquemas heterogéneos de identificación externa (`personCode`: códigos alfanuméricos heredados como `CX00000006` vs. autoincrementales limpios como `1001`) respetando las restricciones de inmutabilidad y sintaxis de Hik-Connect Teams OpenAPI?*
- **Explicación Didáctica (El Número de Seguro Social vs. el Número de Turno):**  
  - Si un gimnasio ya tiene tarjetas RFID grabadas o software previo, sus clientes ya tienen carnets impresos con códigos como `CX00000006` o `2045`. Si los obligáramos a cambiar a `1, 2, 3`, tendrían que reimprimir todas las credenciales y cambiar las tarjetas de sus clientes.
  - Si es un gimnasio nuevo, no quieren inventar números raros; quieren que el sistema les sugiera automáticamente el siguiente número consecutivo limpio (`1001`, `1002`, `1003`).
- **Solución Aplicada en GymAccess Pro:**  
  1. **Campo `ID / Código *` Visible y Editable:**
     - En el modal **"+ Nueva Persona"**, el campo viene prellenado con el siguiente consecutivo inteligente (ej. `1002`), pero el recepcionista puede borrarlo y teclear el código del sistema anterior (ej. `CX00000008` o `5504`).
     - En la **Ficha del Socio**, el código aparece visible en el carnet y puede editarse mientras la persona no haya sido congelada en hardware.
  2. **Reglas de Oro de Hik-Connect Teams:**
     - **Solo Alfanumérico:** Teams solo permite letras y números `[a-zA-Z0-9]` (sin guiones, espacios ni símbolos). El sistema valida esto antes de enviar nada a la nube para evitar errores.
     - **Inmutabilidad en Nube:** Una vez que un socio es enrolado en el checador con un código, la nube de Hikvision bloquea cambios de código sobre ese `personId` (error `CCF000001: must be same with old code`). GymAccess Pro protege este campo para garantizar integridad total.

---

<a name="faq-12"></a>
### 12. ¿Por qué la persona aparecía en Teams "Sin acceso concedido" y cómo se asigna el nivel de acceso en la OpenAPI V2.11?

- **Pregunta Original de Mario:**  
  *"Se agregó la persona con foto pero no se le ha asignado un nivel de acceso desde teams, puedes revisar... sigue sin acceso... en el checador sí está, pero en Teams dice 'Sin acceso concedido'."*
- **Formulación Técnica Formal:**  
  *¿A qué endpoint y esquema de payload responde la concesión de privilegios por persona (`Concesión por persona`) en la arquitectura OpenAPI V2.11 de Hik-Connect Teams, dado que `/persons/update` ignora `accessLevelIds` y `/personaccess/assign` fue deprecado?*
- **Explicación Didáctica (El Carnet sin Llave Magnética):**  
  Imagina que das de alta a un empleado en Recursos Humanos y le imprimes su credencial con foto. Ya existe en la empresa, pero el de seguridad todavía no le dio de alta su tarjeta en el lector del torniquete. En Teams pasaba lo mismo:
  - Crear la persona (`/persons/quick/add` o `/persons/update`) crea la ficha de identidad en la nube.
  - Pero la nube tiene un departamento separado llamado **Control de Acceso (ACSPM)**. Para vincular a la persona con el nivel de acceso (puertas del gimnasio), la OpenAPI V2.11 exige llamar a un endpoint especializado: `POST /api/hccgw/acspm/v1/accesslevel/person/add`.
- **Solución Aplicada en GymAccess Pro:**  
  1. Descubrimos e implementamos el contrato oficial de Teams OpenAPI V2.11:
     - Endpoint: `POST /api/hccgw/acspm/v1/accesslevel/person/add`
     - Payload:
       ```json
       {
         "personList": [
           {
             "personId": "752006153705135104",
             "accessLevelIdList": ["684236721751815168"]
           }
         ]
       }
       ```
  2. Al enrolar a una persona o al forzar sincronización desde la ficha, GymAccess Pro llama inmediatamente a este endpoint.
  3. En la columna **Nivel de acceso** del portal de Teams ahora aparece: **"Concesión por persona: Araucarias (1)"**, y en la columna de puertas aparece la terminal física asignada, garantizando acceso instantáneo y corte por reloj interno.

---

<a name="faq-13"></a>
### 13. ¿Qué pasa cuando damos de baja a un socio en el sistema? ¿Cómo evitamos perder su historial y cómo liberamos el checador?

- **Pregunta Original de Mario:**  
  *"¿Y qué pasa cuando doy de baja a una persona? Porque recién lo hice y la perdí del sistema, pero seguía en Teams."*
- **Formulación Técnica Formal:**  
  *¿Cuál es el patrón de borrado lógico (Soft Delete) con sincronización de estado externo (Cloud Hardware Purge) para preservar la integridad referencial de pagos y auditoría mientras se liberan cuotas en dispositivos físicos?*
- **Explicación Didáctica (El Archivador de Ex-Socios vs. la Llave del Casillero):**  
  Si un socio decide dejar el gimnasio:
  - **No puedes borrarlo de la base de datos (Hard Delete):** Si lo borraras, se borrarían sus recibos de pago, las ventas de la caja cuadrarían mal y perderías la foto y el historial por si regresa en 6 meses.
  - **Pero tampoco puedes dejarlo en el checador:** Si lo dejas en Teams, ocupa uno de tus 100 cupos gratuitos y podría seguir abriendo la puerta si tenía días vigentes.
- **Solución Aplicada en GymAccess Pro:**  
  1. **Baja en Dos Frentes Automática:**  
     Al hacer clic en **"Baja"**:
     - El backend llama a Teams (`POST /hccgw/person/v1/persons/delete`) y **lo expulsa de la nube y del checador físico**. Se libera un cupo de hardware al instante.
     - En la base de datos local SQLite, se marca `activo = 0` y se desvincula `hik_person_id = NULL`. Todos sus pagos, adeudos y asistencias quedan 100% intactos en caja.
  2. **Pestaña "Dados de Baja (Inactivos)":**  
     En la pantalla de Personas, se agregó un conmutador:
     - `🟢 Activos`: Vista diaria de clientes y personal activo.
     - `⚪ Dados de Baja`: Muestra a todos los socios inactivos con su etiqueta roja `INACTIVO`.
  3. **Botón `🔄 Reactivar`:**  
     Si un socio que se dio de baja hace meses regresa, el recepcionista abre "Dados de Baja", presiona **"🔄 Reactivar"**, y la persona vuelve al directorio activo con toda su foto e historial conservados, lista para cobrarle un nuevo plan y subirla al checador en un clic.
