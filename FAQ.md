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
14. [¿Por qué no se pueden crear horarios o niveles de acceso de Teams desde la aplicación y cómo separar accesos de Staff vs. Clientes?](#faq-14)
15. [¿Cómo funciona la personalización de Identidad & Marca (White-Label) y los Pases de Cortesía temporales?](#faq-15)
16. [¿Cómo extraer y restaurar copias de seguridad (.db) a una USB y qué pasa con el sistema y los checadores?](#faq-16)
17. [¿Por qué falló la carga de planes en el Triaje y cómo las directivas maestras prohíben parches de API y alias en backend?](#faq-17)
18. [¿Cómo funcionan las Cortesías de 1 día, el candado vitalicio de 3 por ID y la Bitácora agnóstica de eventos?](#faq-18)
19. [¿Por qué la Bitácora no mostraba la fecha, cómo exportar a Excel/PDF sin romper caracteres y por qué abrir el sitio al 80%?](#faq-19)
20. [¿Por qué se requerían múltiples clics para marcar zonas y deben poder alterarse las puertas de un socio manualmente?](#faq-20)
21. [¿Por qué una persona nueva no se sincronizaba a todos los checadores y cuál es la diferencia entre sincronizar niveles vs. alinear checadores?](#faq-21)
22. [¿Por qué al dar clic en Cortesía la pantalla arrojaba error y sacaba de la aplicación?](#faq-22)
23. [¿Por qué decía 'Vigente' si ya había vencido hace 2 días y cómo se resolvió la dependencia de la nube?](#faq-23)
24. [¿Cómo optimizar y simplificar la gestión y horarios de acceso para Empleados (Staff)?](#faq-24)
25. [¿Cómo funciona la búsqueda facetada en dos niveles, métricas en vivo y debounce en el Directorio de Personas?](#faq-25)
26. [¿Por qué decía 'de 5 registradas' si había 4 personas y cómo se unificó la coherencia de ámbito?](#faq-26)

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

---

<a name="faq-14"></a>
### 14. ¿Por qué no se pueden crear horarios o niveles de acceso de Teams desde la aplicación y cómo separar accesos de Staff vs. Clientes?

- **Pregunta Original de Mario:**  
  *"¿Y si quiero limitar a los clientes al horario de ellos y el staff 24/7 hay que hacer 2 niveles de acceso verdad? ¿Y dices que no los puedo crear desde la aplicación verdad, tendría que hacerse manual? ¿Eso pasa en otras partes?"*
- **Formulación Técnica Formal:**  
  *¿Por qué la OpenAPI V2.11 de Hik-Connect Teams carece de endpoints para mutación DDL de niveles de acceso (`createAccessLevel`) y plantillas horarias (`createSchedule`), restringiendo a las integraciones a un flujo de consumo/asignación, y cómo se modela el acceso diferenciado Staff 24/7 vs. Socios?*
- **Explicación Didáctica (El Interruptor vs. el Cableado de la Pared):**  
  Imagina que compras un apagador inteligente para tu casa. Puedes encender la luz, apagarla y programar que se apague a las 11:00 PM desde tu teléfono. Pero la aplicación del apagador no puede romper la pared para meter nuevos cables de cobre ni cambiar el fusible principal; eso se hace una sola vez en el cuadro eléctrico de la casa.
  La API de Hikvision funciona igual:
  - **Lo que SÍ permite la API (Operación Diaria):** Dar de alta personas, subir fotos, asignarles llaves, inyectar fechas de corte y abrir torniquetes.
  - **Lo que NO expone la API de Hikvision (Infraestructura):** Crear reglas de horarios semanales complejos desde código. Hikvision reserva la creación de horarios y niveles al portal oficial de Teams por seguridad para evitar que un bug en un software externo borre la programación de seguridad del edificio.
- **Solución Aplicada en GymAccess Pro:**  
  1. **Configuración de Una Sola Vez (10 Minutos):**  
     En el portal web de Hik-Connect Teams se crean los 2 niveles:
     - Nivel 1: *"Staff General"* ➔ Horario 24/7 (Lunes a Domingo, todo el día).
     - Nivel 2: *"Clientes Gimnasio"* ➔ Horario comercial (ej. Lunes a Viernes 6:00 a 22:00, Sábados 7:00 a 14:00).
  2. **Sincronización 1-Clic en la App:**  
     En GymAccess Pro, vas a **Configuración ➔ Horarios & Niveles** y presionas **"🔄 Sincronizar Niveles"**. Ambos niveles se descargan al sistema local.
  3. **Asignación Automática Inteligente:**  
     - Al cobrar una membresía de socio, el sistema le asigna el nivel de *"Clientes"*.
     - Al dar de alta a un recepcionista, entrenador o guardia (categoría `Personal / Staff`), el sistema le asigna el nivel *"Staff General 24/7"* con vigencia de 1 año.
  ¡Cero complicaciones y máxima seguridad!

---

<a name="faq-15"></a>
### 15. ¿Cómo funciona la personalización de Identidad & Marca (White-Label) y los Pases de Cortesía temporales?

- **Pregunta Original de Mario:**  
  *"Necesitamos un menú de configuración para cambiar el nombre del gym, cambiar logo y cambiar colores de la interfaz, analiza y dime qué más podríamos incluir que le dé valor a la solución... Y no veo lo de pases de cortesía..."*
- **Formulación Técnica Formal:**  
  *¿Cómo se implementa un sistema White-Label multi-tenant ligero acoplado a persistencia clave-valor en SQLite nativo, inyección dinámica de CSS Variables, sintetizador Web Audio API y enrolamiento biométrico de visitantes sin suscripción comercial?*
- **Explicación Didáctica (El Traje a la Medida vs. el Uniforme Genérico):**  
  A ningún dueño de gimnasio le gusta tener un software que parezca un producto genérico y frío con el nombre de otro. Quieren que sus pantallas, la barra de recepción y los recibos que imprimen a sus clientes lleven su propio escudo, su lema y sus colores de combate. Además, cuando llega un amigo del dueño o un cliente potencial pidiendo un pase de cortesía de 1 o 2 días, la recepcionista no debería verse forzada a "inventar una membresía de 0 pesos": debe presionar un botón directo que abra el paso por hoy y se bloquee solo al cerrar.
- **Solución Aplicada en GymAccess Pro (V2.5 / v0.6):**  
  1. **Subpestaña "Identidad & Marca":**
     - Permite cambiar el nombre y eslogan del gimnasio al vuelo.
     - Permite subir el logo oficial (PNG, SVG, WebP) con almacenamiento en disco y previsualización viva.
     - Ofrece 5 temas atléticos (⚡ *Cyber Volt*, 🍊 *Sport Blaze*, 🌊 *Ocean Flow*, 🔴 *Crimson Power*, ⚪ *Clean Minimal*) y un selector libre hexadecimal que recalcula las variables CSS (`--accent-color`, `--border-highlight`, etc.) en tiempo real.
     - Permite capturar datos fiscales (RFC, teléfono, dirección) y pie de ticket para recibos de cobro profesionales.
     - Incorpora sintetizador auditivo nativo en el navegador para emitir bips de bienvenida o alertas de membresía vencida en la computadora de recepción.
  2. **Pases de Cortesía / Visitantes en 1 Clic:**
     - En el modal **+ Nueva Persona**, ahora existe la 3ra opción: `[ 🔵 Cortesía ]`.
     - Permite elegir duración: `Hoy (1 d)`, `2 días`, `3 días` o `7 días`.
     - Otorga paso inmediato y programa en el reloj de cuarzo del checador la expiración exacta a las 23:59:59 del día de corte, garantizando bloqueo autónomo sin costos extras.

---

<a name="faq-16"></a>
### 16. ¿Cómo extraer y restaurar copias de seguridad (.db) a una USB y qué pasa con el sistema y los checadores?

- **Pregunta Original de Mario:**  
  *"Se corta el botón, y las copias de seguridad ¿cómo las puedo sacar de esa PC, y cómo las puedo restaurar? ¿Esa copia de seguridad dejará el sistema tal como cuando se realizó?"*
- **Formulación Técnica Formal:**  
  *¿Cuál es el protocolo de resguardo físico y restauración atómica en caliente de snapshots SQLite generados vía VACUUM INTO, y cuál es la estrategia de conciliación de estado entre el almacenamiento relacional local y la memoria no volátil de los dispositivos perimetrales (Hikvision RTC/Flash)?*
- **Explicación Didáctica (La Llave en la Caja Fuerte y el Auto en Movimiento):**  
  - *Sacar la copia a una USB:* Guardar respaldos únicamente en el disco duro de la misma computadora de recepción es como dejar la llave de repuesto adentro de la misma caja fuerte que se descompuso. Si el disco duro se quema o le cae un virus, pierdes todo. Por eso necesitas sacarlo a una memoria USB física o a la nube (Estrategia 3-2-1).
  - *Restaurar la copia:* La base de datos es el motor del gimnasio. Si intentas cambiar el motor mientras el auto va a 100 km/h, se rompen los engranes. Por eso el sistema detiene las escrituras, cierra los archivos de forma limpia (`PRAGMA wal_checkpoint(TRUNCATE)`), reemplaza el archivo y vuelve a encender el motor de inmediato sin errores.
  - *¿El sistema queda idéntico?:* En la computadora, **SÍ, 100% IDÉNTICO**. Gracias a `VACUUM INTO`, se congela una fotografía milimétrica de clientes, fotos, precios y cobros. Con respecto a los checadores físicos (torniquetes), ellos tienen su propio chip. Si en el lapso entre la copia y hoy diste de alta a alguien directamente en Teams, la PC no lo tendrá, pero el botón *"Triaje Checador"* envía la lista exacta del respaldo al checador para que queden emparejados en 1 clic.
- **Solución Aplicada en GymAccess Pro:**  
  1. **Botón `[ 📥 Descargar ]` en cada respaldo:** Permite descargar el archivo `.db` al instante desde el navegador a la carpeta de descargas de Windows o directamente a una USB insertada.
  2. **Botón `[ 🔄 Restaurar ]` con advertencia de seguridad:** Modal de confirmación que detalla la fecha/hora del respaldo y advierte sobre el reemplazo de movimientos posteriores antes de ejecutar la restauración atómica.
  3. **Endpoint de restauración `/api/backups/restore/:filename`:** Cierra descriptores de SQLite, elimina temporales WAL/SHM y monta el snapshot atómico de manera segura.
  4. **Corrección de layout anti-recorte:** En `AjustesGenerales.tsx`, se aplicó `shrink-0` y salto de línea adaptativo (`lg:flex-row`), evitando que el botón de pestañas se comprima a "Copias de Se".

---

<a name="faq-17"></a>
### 17. ¿Por qué falló la carga de planes en el Triaje y cómo las directivas maestras prohíben parches de API y alias en backend?

- **Pregunta Original de Mario:**  
  *"Al importar desde el triaje no puedo seleccionar el plan... ¿No es un parche esa solución? ... Mi pregunta es si tenemos reglas que nos evitan planear o implementar parches de este tipo, ¿por qué sucedió? ... ¿Cómo podríamos modificar GEMINI.md global para evitar que vuelva a suceder?"*
- **Formulación Técnica Formal:**  
  *¿Cuál es el riesgo arquitectónico del acoplamiento tolerante mediante enrutamiento redundante (API Aliasing) frente a la disciplina Fail-Fast con Fuente Única de Verdad (SSOT), y cómo se previene la fuga de Strings Mágicos no tipados mediante gobernanza estricta en las directivas maestras?*
- **Explicación Didáctica (La Ventanilla Equivocada y la Farmacia Complaciente):**  
  - *Por qué falló:* Todos los módulos acudían a la ventanilla oficial de planes (`/api/gym/planes`), pero el modal de Triaje intentó consultar una ventanilla inexistente (`/api/pos/planes`). Como Express tenía una regla comodín para mostrar la web, devolvió la página HTML en vez de planes. El modal no pudo convertir letras en paquetes y el selector quedó vacío.
  - *Por qué proponer un alias era un parche:* Si el cliente se equivoca de dirección, abrir una puerta falsa en el servidor es como abrir una sucursal fantasma para no admitir que imprimiste mal un volante. Solo genera confusión y deuda técnica. La solución limpia es corregir el volante (el cliente).
- **Solución y Blindaje Aplicados en GymAccess Pro y GEMINI.md:**  
  1. **Enmienda en GEMINI.md (Pilar 1 y §7):** Prohibición estricta de parches de conveniencia y alias en el backend. Principio *Fail-Fast*: toda petición inválida debe ser rechazada inmediatamente (`404 Not Found`). La causa raíz DEBE corregirse en el archivo emisor del error.
  2. **Corta-fuegos API 404 en Express:** Se blindó `src/server/index.ts` con un filtro previo `app.all('/api/*', ...)` que responde `404 JSON` ante cualquier ruta inexistente, evitando que vuelva a disfrazarse un error con páginas HTML.
  3. **Corrección limpia en `TeamsSyncModal.tsx`:** Se redirigió la petición a `/api/gym/planes`, se formatearon las opciones con precio y días, y se agregó la opción neutra *"Sin Plan Inicial (Cobrar después)"* para mayor flexibilidad operativa.

---

<a name="faq-18"></a>
### 18. ¿Cómo funcionan las Cortesías de 1 día, el candado vitalicio de 3 por ID y la Bitácora agnóstica de eventos?

- **Pregunta Original de Mario:**  
  *"¿Debería mostrar la vigencia restante en este panel aunque no demos click la ficha no? Además no veo cómo dar las cortesías... Yo veo las cortesías más como una suerte de prueba gratuita para que prueben el gimnasio y siento que siempre deben estar limitadas a 1 día, y tener un modo de verificación para que una persona no pueda tener más de 3 cortesías para siempre... No siempre se pide teléfono, ¿no sería mejor por ID? ... El módulo de bitácora me parece bien, pero iremos agregando más funciones y hay que irlo actualizando, ponle un recordatorio a eso, y tomo por entendido que es un módulo independiente y que puede ser migrado si cambiamos después el giro del negocio. Los eventos registrados como accesos concedidos y denegados, ¿tenemos forma de identificarlos? Por ejemplo es muy diferente una denegación por fecha vencida que una porque no reconoce a la persona."*
- **Formulación Técnica Formal:**  
  *¿Cómo se implementa un modelo anti-abuso de pases de prueba gratuitos (Free Trial) acoplado a la entidad central de identidad (`persona_id`) con teléfono opcional y detección preventiva de duplicados fonéticos/nominales, conjuntamente con un subsistema de auditoría desacoplado basado en Clean Architecture para la trazabilidad granular de eventos físicos (Concedido, Denegado Vencido, Denegado Desconocido, Apertura Manual) y transaccionales?*
- **Explicación Didáctica (La Muestra Gratis del Helado y la Bitácora de Vuelo):**  
  - *Las Cortesías de 1 día (El Helado de Prueba):* Una cortesía es para que conozcan las instalaciones hoy. Si le diéramos 30 días o no tuviéramos límite, la gente vendría a pedir cortesías todos los meses sin pagar nunca. Por eso expira hoy mismo a las 23:59:59 y se bloquea un candado inflexible: máximo 3 en toda la vida del cliente. A la cuarta, el sistema le dice amablemente: *"Ya disfrutaste tus 3 pruebas gratuitas, ahora te toca inscribirte o pagar tu pase diario"*.
  - *¿Por qué por ID y teléfono opcional?:* Si obligas a pedir teléfono, un cliente desconfiado se da la vuelta y se va, o la recepcionista pone ceros falsos (`0000000000`). Al identificar por ID (`persona_id`), no dependes del teléfono. Y para evitar que Juan se registre como nuevo cada semana para burlar el límite de 3, el sistema busca en vivo si ya existe un "Juan Pérez" y alerta a la recepcionista antes de crearlo.
  - *La Bitácora de Vuelo Desacoplada:* Así como los aviones tienen una "caja negra" que anota cada movimiento sin importar si el avión lleva pasajeros o carga, nuestro módulo de bitácora (`src/server/modules/audit/`) anota quién abrió un torniquete, quién cobró y quién entró. Si mañana convertimos el sistema en un control de acceso para oficinas, escuelas o estacionamientos, este módulo se traslada intacto porque no sabe nada de gimnasios: solo sabe de auditoría, personas y accesos.
- **Solución Aplicada en GymAccess Pro:**  
  1. **Vigencia Semáforo en Tarjetas de Clientes (`Personas.tsx`):** Píldoras visibles directamente en cada tarjeta:
     - 🟢 `X días restantes` (Socio vigente)
     - 🟡 `Vence hoy (11:59 PM)`
     - 🎟️ `Cortesía (Vence hoy 11:59 PM)`
     - 🔴 `Vencido hace X días`
     - 🟣 `Staff / Acceso Permanente`
  2. **Botón Directo `🎟️ X/3`:** Permite emitir cortesía en 1 clic si `usadas < 3`. Si llega a 3, se bloquea con candado rojo y el backend rechaza cualquier intento posterior con `400 Bad Request`.
  3. **Teléfono Opcional con Índice Parcial:** En SQLite, `personas.telefono` admite valores nulos, pero si se captura un número, se valida que no esté duplicado mediante un índice parcial (`WHERE telefono IS NOT NULL AND telefono != ''`).
  4. **Trazabilidad de Aperturas Manuales:** Al presionar "Abrir torniquete" en recepción, se registra en `eventos_acceso` como `APERTURA_MANUAL`, se emite por SSE al monitor en vivo y se audita en la bitácora con el nombre del operador.
  5. **Pantalla y Módulo `Bitácora & Auditoría`:** Accesible desde la barra de navegación con pestañas de *Accesos Físicos* (filtrado por Concedido, Denegado Vencido, Denegado Desconocido y Apertura Manual) y *Operaciones del Sistema* (Caja, Cortesías, Altas).

---

<a name="faq-19"></a>
### 19. ¿Por qué la Bitácora no mostraba la fecha, cómo exportar a Excel/PDF sin romper caracteres y por qué abrir el sitio al 80%?

- **Pregunta Original de Mario:**  
  *"Veo que me dice la hora del evento pero no la fecha, además no veo cómo exportar estos eventos en Excel o en PDF, también siento que aunque no estirado al 100% del ancho debería estar un poco más abierto el sitio, como a un 80%, y requiero responsividad para múltiples dispositivos en todo el sitio, presente y futuro."*
- **Formulación Técnica Formal:**  
  *¿Cómo se implementa la normalización de marcas temporales ISO/SQLite en cliente para desagregar fecha (`Intl.DateTimeFormat`) y hora, la exportación de datasets a CSV con Byte Order Mark (`\uFEFF`) y delimitador punto y coma para interoperabilidad con Microsoft Excel en español, hojas de estilo `@media print` para renderizado ejecutivo en PDF, y contenedores fluidos adaptativos de ancho extendido (`max-w-[1600px]`) con grid móvil a 4K?*
- **Explicación Didáctica (El Reloj sin Calendario, el Excel en Chino y la Pantalla con Franjas Negras):**  
  - *La Hora sin Fecha:* Saber que alguien entró a las `01:47 a. m.` no te sirve si no sabes si fue hoy, ayer o la semana pasada. Ahora la bitácora te muestra claramente: `07 Sep 2026, 01:47:44 a. m.`, convirtiendo automáticamente el tiempo del servidor al horario de México.
  - *Exportar a Excel sin dolores de cabeza:* Muchas veces, al bajar un archivo `.csv`, abres Excel y las palabras con tildes o la letra "ñ" salen como garabatos raros (`Bitcora`), y todas las columnas quedan pegadas en una sola celda. Esto sucede porque Excel en español asume que el separador es el punto y coma (`;`) y necesita una pequeña "marca invisible" al principio del archivo (llamada UTF-8 BOM) para saber que está en español. Nuestro botón de Excel genera esa marca automáticamente: le das doble clic y abre perfecto, limpio y con sus columnas separadas.
  - *Imprimir / PDF con Membrete:* Si el dueño del gimnasio o un auditor pide un informe impreso, no quieres que se imprima la barra de navegación negra ni los botones de la pantalla. Al hacer clic en **"Imprimir / PDF"**, el sistema oculta todo lo visual de la web y genera una hoja blanca formal con el logo de tu gimnasio, fecha de emisión y tabla limpia lista para firmar o guardar como PDF.
  - *El Ancho al ~80% y Responsividad:* Los monitores de computadora actuales (Full HD y 2K) son panorámicos. La página estaba encerrada en una caja angosta de 1280px (`max-w-7xl`), dejando dos franjas negras vacías a los lados que hacían sentir el sistema apretado. Lo abrimos a `1600px / 1720px` (~80-85% del monitor), permitiendo ver 4 tarjetas de clientes por fila en lugar de 3, pero conservando total adaptabilidad en laptops pequeñas, iPads y teléfonos celulares.
- **Solución Aplicada en GymAccess Pro:**  
  1. **Helper `formatFechaHora()` en `Bitacora.tsx`:** Normaliza marcas de tiempo de SQLite (`YYYY-MM-DD HH:MM:SS`) y extrae independientemente la fecha en español natural (`07 Sep 2026`) y la hora con segundos en formato local (GMT-6).
  2. **Botón `📊 Exportar Excel`:** Genera y descarga al instante un archivo CSV con prefijo `\uFEFF` y delimitadores `;` con nombres temporales claros (`bitacora_accesos_YYYY-MM-DD.csv` y `bitacora_operaciones_YYYY-MM-DD.csv`).
  3. **Botón `📄 Imprimir / PDF`:** Abre el diálogo de impresión con reglas `@media print` en `index.css` que suprimen el encabezado web, footer y botones, renderizando un membrete corporativo con los colores y branding de la sucursal.
  4. **Canvas Extendido al ~80-85% y Responsividad:**
     - En `App.tsx` y `Navbar.tsx`: Se migró de `max-w-7xl` a `w-full max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8`.
     - En `Personas.tsx`: Cuadrícula fluida adaptada a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`.
     - Se respetó el límite de líneas (§13): `Bitacora.tsx` se mantuvo en 492 líneas.

---

<a name="faq-20"></a>
### 20. ¿Por qué se requerían múltiples clics para marcar zonas y deben poder alterarse las puertas de un socio manualmente?

- **Pregunta Original de Mario:**  
  *"En zonas y puertas autorizadas tengo que cliquear mucho para marcar o desmarcar las opciones, pero la pregunta clave es si debo poder hacerlo?"*
- **Formulación Técnica Formal:**  
  *¿Cómo mitigar el conflicto de propagación de eventos (*Event Bubbling*) entre contenedores interactivos y elementos de formulario nativos, y cuál es el modelo de gobierno de autorización física basado en roles y contratos comerciales (RBAC / SSOT: Single Source of Truth) para prevenir la manipulación no auditada de privilegios de acceso en clientes con membresías activas?*
- **Explicación Didáctica (El Rebote del Clic y el Boleto de Cine):**  
  - *El choque de clics (Event Bubbling):* Tanto la caja contenedora como la casilla de verificación tenían la orden de "cambiar estado al hacer clic". Al hacer clic en la casilla, esta se marcaba, pero la señal subía a la caja padre y esta la desmarcaba en la misma milésima de segundo. Por eso se sentía que "no agarraba". Al usar un elemento semántico `<label>` sin eventos duplicados, ahora responde instantáneamente al primer toque.
  - *¿Debe poder cambiarse a mano en un socio? (El Boleto de Cine):* Si compraste un boleto para la sala normal ($50), la cajera no puede dejarte pasar a la sala VIP ($180) por simpatía. En el gimnasio es idéntico: **las puertas a las que tiene derecho un socio las define el plan comercial que pagó en caja**. Si permitiéramos que el recepcionista marque o desmarque puertas libremente, se generaría fuga de dinero (regalar accesos VIP a amigos sin pagar) y contradicciones de datos. Por ello, las puertas de un socio son **de solo-lectura y derivadas de su plan activo**. Para darle más puertas, se le vende el paquete correspondiente en el Punto de Cobro.
  - *¿Para quiénes SÍ es manual?:* Para empleados, entrenadores, personal de limpieza y proveedores, ya que ellos no compran membresías comerciales; a ellos la administración les asigna manualmente las llaves de acceso que requieran.
- **Solución Aplicada en GymAccess Pro:**  
  1. **Modo "Regido por Plan" en `FichaZonasList.tsx`:**  
     - Si la persona es un socio con plan activo, las zonas incluidas aparecen marcadas con el badge `🏷️ Plan Activo`, candado `🔒` y estilo protegido.
     - Las zonas no incluidas aparecen atenuadas con el distintivo `🔒 No incluido en plan`, y una nota didáctica explica que para desbloquearlas debe actualizarse el plan en Cobro.
  2. **Modo Manual para Staff / Visitantes:**  
     - Los empleados o personas sin membresía conservan la edición manual libre.
  3. **Solución del Clic Único:**  
     - Se reemplazó el contenedor por un `<label>` accesible que elimina la duplicidad de eventos y conmuta al primer toque limpio.

---

<a name="faq-21"></a>
### 21. ¿Por qué una persona nueva no se sincronizaba a todos los checadores y cuál es la diferencia entre sincronizar niveles vs. alinear checadores?

- **Pregunta Original de Mario:**  
  *"Agregué una persona nueva, pero no se agregó a un checador, ¿puedes revisar? Usé la opción de sincronizar pero no veo que lo sincronice... ¿Hay una opción para mandar a los checadores (todos) los usuarios que le corresponden con los niveles de acceso que le corresponden? ¿Es buena idea mezclarlo con el triaje?"*
- **Formulación Técnica Formal:**  
  *¿Cómo se resolvió el error de aprovisionamiento multi-tenant `CCF038009: Group is not existed` en Hik-Connect Teams al registrar personas entre organizaciones independientes (reemplazando `groupId` específico por la raíz universal `'1'`), y cómo se diseñó la orquestación asíncrona de reconciliación masiva (`AccessQueueService`) diferenciando el catálogo físico de puertas (`NivelesAccesoTab`) del enrolamiento de identidades y credenciales en el Centro de Triaje?*
- **Explicación Didáctica (El Catálogo de Tiendas vs. el Camión de Mercancía):**  
  - *La confusión de botones:* Imagina una cadena de tiendas. Un botón dice *"Actualizar Lista de Sucursales"* (revisa qué tiendas existen y qué puertas tienen). El otro botón dice *"Repartir Credenciales a los Empleados en todas las Sucursales"*. Si presionabas el primer botón esperando que un socio nuevo apareciera en el checador, era como actualizar la lista telefónica de las sucursales esperando que un cliente llegara físicamente a una de ellas.
  - *El error de organización (`CCF038009`):* Cuando registrabas a alguien en la Cuenta 1 (Araucarias), el sistema intentaba mandarlo a la Cuenta 2 (Américas) usando el número de oficina de Araucarias. La nube de Hikvision decía: *"Esa oficina no existe en Américas"* y rechazaba a la persona. Al corregirlo a la oficina raíz universal (`'1'`), ambas sucursales lo aceptan sin problemas.
  - *¿Por qué unificarlo en el Centro de Triaje?:* El Triaje es el "hospital general" donde el sistema compara qué hay en la computadora contra qué hay en los checadores. Tener ahí el botón maestro **`🚀 Alinear Todos a Checadores`** permite con un solo clic enviar a la cola a todos los socios y empleados activos con sus fotos, vigencias y torniquetes correctos sin congelar la pantalla.
- **Solución Aplicada en GymAccess Pro:**  
  1. **Desambiguación de Botones:** En *Configuración ➔ Niveles & Zonas*, el botón se renombró a **`🔄 Actualizar Zonas / Puertas`**, con una nota clara de que ese botón solo refresca la infraestructura física, mientras que para las personas se utiliza el Triaje.
  2. **Corrección de `groupId` Universal en `teamsPerson.service.ts`:** Se fijó `groupId: '1'` para todas las organizaciones de Hik-Connect Teams, garantizando creación limpia en cualquier cuenta secundaria.
  3. **Botón Maestro en Triaje:** En *Personas ➔ 🏥 Triaje & Conciliación*, se agregó el botón **`🚀 Alinear Todos a Checadores`**, respaldado por el endpoint `POST /api/iam/personas/sync-all-to-checador` y la cola `AccessQueueService` con control de flujo secuencial (350 ms entre llamadas) para evitar bloqueos por tasa de peticiones.

---

<a name="faq-22"></a>
### 22. ¿Por qué al dar clic en Cortesía la pantalla arrojaba error y sacaba de la aplicación?

- **Pregunta Original de Mario:**  
  *"Al agregar una persona en cortesía al dar click me da error y me saca de la página"*
- **Formulación Técnica Formal:**  
  *¿Cómo impacta una referencia no declarada en tiempo de ejecución (`ReferenceError: Cannot find name 'CheckCircle2'`) dentro de un bloque condicional de React SPA sin Error Boundary, y cuál es la estrategia de validación estática para prevenir colapsos del árbol de componentes en producción?*
- **Explicación Didáctica (El Tablero de Control y el Interruptor Falso):**  
  Imagina que instalas un panel con tres botones: *Socio*, *Empleado* y *Cortesía*. Los dos primeros tienen sus circuitos completos y encienden sus respectivas luces. Pero en el botón de *Cortesía*, el fabricante mandó llamar un indicador visual que nunca se conectó a la placa madre. Mientras no toques ese botón, el auto funciona normal; pero en el segundo exacto en que presionas *Cortesía*, el sistema busca el componente faltante, se produce un fallo crítico de memoria y la computadora central apaga el sistema entero para protegerse. En la pantalla del navegador, esto se manifestó como un error en rojo de React que desmonto toda la página y la dejó en blanco ("te saca de la pantalla").
- **Solución Aplicada en GymAccess Pro:**  
  1. **Corrección de la Importación:** En `NuevaPersonaModal.tsx`, se sustituyó la importación residual `Check` por `CheckCircle2` de `lucide-react`, vinculando el icono real que requería el banner de 1 día de cortesía.
  2. **Encadenamiento Opcional de Seguridad:** En `Personas.tsx`, se protegió la llamada posterior al alta (`persona?.tipo === 'SOCIO'`) para evitar cualquier redirección inesperada a la pantalla de Cobro si el objeto de respuesta no correspondía a un socio comercial.
  3. **Auditoría de Tipos:** Se corrió `npx tsc --noEmit` para asegurar que ningún otro componente condicional contenga nombres huérfanos o no importados.

---

<a name="faq-23"></a>
### 23. ¿Por qué decía 'Vigente' si ya había vencido hace 2 días y cómo se resolvió la dependencia de la nube?

- **Pregunta Original de Mario:**  
  *"¿Por qué me dice vigente, si ya venció hace 2 días?"*
- **Formulación Técnica Formal:**  
  *¿Cómo mitigar el acoplamiento bloqueante entre procesos de auditoría local en segundo plano (`SyncWorker.auditVigencias`) y APIs de hardware externo en la nube, implementando un modelo Offline-First / SSOT (Single Source of Truth) donde la base de datos SQLite transaccione primero la revocación temporal independientemente del estado de red?*
- **Explicación Didáctica (La Factura de Luz y el Cartero):**  
  - *El error de diseño original:* Imagina que la compañía de luz (tu base de datos local) decide cortar el servicio a un cliente porque no pagó hace dos días. Pero la secretaria dice: *"No voy a poner el contrato como CORTADO en mi sistema hasta que el cartero me llame por teléfono confirmando que ya entregó la notificación física en la casa del cliente"*. Si el cartero se queda sin señal de teléfono o se poncha su llanta (lo que ocurrió con la llamada a la nube de Hikvision), la oficina central se queda diciendo *"Contrato Vigente"* eternamente, a pesar de que en el calendario ya pasaron dos días completos.
  - *¿Podía entrar el cliente al gimnasio?:* **No.** En GymAccess Pro V2.5, al enrolar a un cliente se le graba en el chip de memoria del checador la fecha límite exacta (`2026-09-07T23:59:59`). El reloj interno de la terminal bloqueó el paso automáticamente desde la medianoche del 7 sin necesitar internet. La inconsistencia era puramente de datos en la pantalla de la computadora.
  - *La solución sin parches:*  
    1. **Soberanía Local (Fail-Safe):** La base de datos de la computadora es la dueña absoluta de la verdad. A medianoche, el demonio transacciona `activa = 0, estatus = 'VENCIDA'` en SQLite **primero**. Si la nube o el internet fallan después, tu sistema y tu pantalla ya tienen el dato correcto y no se quedan congelados.
    2. **Historial de Último Plan Activo:** Se reemplazó el `LEFT JOIN ... WHERE activa = 1` por una subconsulta que extrae la membresía más reciente de la persona. Así, aunque ya haya vencido, la tarjeta sigue mostrando con orgullo qué plan tenía (*"Cortesía"*) y cuándo venció (*"Vencido hace 2 días"*), con la insignia en rojo `Membresía: Vencida`.
- **Solución Aplicada en GymAccess Pro:**  
  1. **En `syncWorker.ts`:** Se separó la transacción de SQLite (`UPDATE gym_membresias SET activa = 0, estatus = 'VENCIDA'`) de la llamada de red a `HardwareManager.setPersonAccess()`, evitando que una excepción remota revierta la base de datos local.
  2. **En `iam.service.ts`:** Se implementó una subconsulta `ORDER BY activa DESC, fecha_fin DESC, id DESC LIMIT 1` con cómputo estricto `CASE WHEN m.fecha_fin < DATE('now', 'localtime') THEN 'VENCIDA'`, garantizando que la API devuelva siempre la última membresía y evalúe la expiración del calendario.
  3. **En `Personas.tsx`:** Se unificó `estaVigente` con el cálculo de calendario para que el distintivo superior y el renglón inferior coincidan de forma 100% armónica.

---

<a name="faq-24"></a>
### 24. ¿Cómo optimizar y simplificar la gestión y horarios de acceso para Empleados (Staff)?

- **Pregunta Original de Mario:**  
  *"¿Tenemos la mejor gestión para empleados? ¿Cómo hay que crear un nivel de acceso para ellos? No sé si las instrucciones que hay son suficientes en el sistema, o hay forma de mejorar y simplificar esta opción."*
- **Formulación Técnica Formal:**  
  *¿Cómo optimizar el aprovisionamiento de credenciales de personal operativo (Staff/Colaboradores) en una arquitectura híbrida Edge/Cloud sin exponer APIs de creación de horarios no soportadas por la OpenAPI V2.11 de Hik-Connect Teams, automatizando la selección de puertas mediante flags de rol (`es_staff`), asignación por defecto a 1 año renovable y guías interactivas integradas en UI?*
- **Explicación Didáctica (El Carnet Maestro de Empleado vs. El Boleto del Gimnasio):**  
  - *El boleto del cliente:* Un socio compra un paquete mensual o una visita; su fecha de salida depende de cuánto dinero pagó y qué días compró.
  - *El carnet del empleado:* Un entrenador, recepcionista o personal de limpieza no compra un paquete; trabaja allí. No debe pasar por la caja de cobro ni tener vencimiento de 30 días, sino un pase anual renovable. Además, sus puertas y horarios (por ejemplo, poder entrar a las 5:00 AM para abrir el gimnasio antes que los socios o entrar al almacén) se definen en el sistema de control de accesos de Hikvision.
  - *El reto operativo previo:* Anteriormente, al registrar a un empleado, el recepcionista tenía que recordar de memoria cuáles casillas marcar entre todos los torniquetes y puertas, con el riesgo de olvidar la puerta de servicio o asignarle puertas de socios. Además, no estaba claro cómo enlazar los horarios creados en Hik-Connect Teams con GymAccess Pro.
  - *La solución inteligente implementada:*  
    1. **Etiquetado Inteligente de Puertas de Staff:** En *Configuración ➔ Niveles & Zonas*, cada nivel cuenta con el botón `⭐ Nivel de Staff (Auto-seleccionar)`. Con un solo clic se define qué puertas corresponden a los empleados.
    2. **Preselección 100% Automática:** Al abrir *+ Nueva Persona* y hacer clic en la pestaña *Personal*, el modal desmarca inmediatamente las puertas de clientes y marca en automático todos los niveles de Staff configurados, eliminando errores humanos.
    3. **Vigencia Anual y Cero Cobro:** Asigna automáticamente vigencia de 1 año renovable y crea el registro directo sin requerir membresía comercial ni cobrarle en caja.
    4. **Guía Integrada Paso a Paso:** Tanto en *Niveles & Zonas* como en el modal de alta, un botón con tutorial interactivo explica con enlaces directos cómo crear o ajustar los horarios de personal en el portal web de Hik-Connect Teams y descargarlos a GymAccess Pro con el botón `🔄 Sincronizar Niveles`.
- **Solución Aplicada en GymAccess Pro:**  
  1. **En Base de Datos (`schema.sql` y `database.ts`):** Se agregó la columna `es_staff INTEGER DEFAULT 0` en la tabla `niveles_acceso` con migración idempotente.
  2. **En Rutas Backend (`iam.routes.ts`):** Se expuso el endpoint `PATCH /api/iam/niveles-acceso/:id/toggle-staff` para alternar el distintivo de Staff en vivo.
  3. **En Interfaz de Niveles (`NivelesAccesoTab.tsx`):** Se incorporó el botón `⭐ Nivel de Staff` en cada tarjeta de nivel, la insignia visual violeta y la guía interactiva desplegable `❓ Guía de Horarios Staff`.
  4. **En Alta de Personas (`NuevaPersonaModal.tsx`):** Se implementó `handleSelectTipo` para autoseleccionar todas las puertas marcadas con `es_staff === 1` al elegir *Personal*, además de la tarjeta informativa de vigencia y el botón `⭐ Reaplicar Puertas de Staff`.

---

<a name="faq-25"></a>
### 25. ¿Cómo funciona la búsqueda facetada en dos niveles, métricas en vivo y debounce en el Directorio de Personas?

- **Pregunta Original de Mario:**  
  *"Revisa los filtros actuales, ¿cómo se puede mejorar la experiencia?"*
- **Formulación Técnica Formal:**  
  *¿Cómo implementar un patrón de Búsqueda Facetada (Faceted Search) reactivo en un directorio IAM local, complementando la segmentación por rol con filtros ortogonales de ciclo de vida de membresía (`VIGENTE`, `POR_VENCER`, `VENCIDA`) y estado biométrico (`SIN_FOTO`), agregando agregaciones SQL en tiempo real para insignias numéricas y debounce en el input de texto?*
- **Explicación Didáctica (El Archivero Ciego vs. El Tablero con Semáforos Inteligentes):**  
  - *El problema del archivero ciego:* Antes, los filtros solo clasificaban a las personas por rol (*Socio*, *Empleado*, *Cortesía*). Si recepción quería saber a quiénes cobrarles hoy o a quiénes les faltaba tomarles la foto para el checador facial, tenía que revisar 300 tarjetas una por una con lupa. Además, las pestañas no mostraban números, obligando a adivinar cuántos socios activos o vencidos había.
  - *El tablero inteligente en 2 niveles:*
    1. **Nivel 1 (Control Maestro):** Un buscador amplio con botón para borrar de un clic (`✕`), selector `Activos` vs. `Dados de Baja` con contadores exactos, y un botón `Limpiar` para restaurar la vista al instante. Cada letra tecleada espera 250 ms (debounce) antes de consultar a la base de datos, eliminando parpadeos y saturación.
    2. **Nivel 2 (Filtros Facetados con Métricas):**
       - **Audiencia:** Muestra cuántas personas hay en cada rol (`Todos (5)`, `Socios (3)`, `Staff (1)`, `Cortesías (3)`).
       - **Semáforo de Vigencia / Cobranza:** Tres botones táctiles para cobranza inmediata: `🟢 Vigentes (3)`, `🟡 Por Vencer (1)` (socios que expiran en los próximos 3 días para mandarles recordatorio preventivo) y `🔴 Vencidos (2)` (socios con membresía expirada para cobrarles en cuanto crucen la puerta).
       - **Biometría Facial:** El botón `📷 Sin Rostro (2)` filtra en un solo clic a todos los clientes que ya están en el sistema pero aún no tienen fotografía cargada, permitiendo al operador regularizarlos de inmediato al recibirlos en el mostrador.
- **Solución Aplicada en GymAccess Pro:**  
  1. **En Base de Datos y Backend (`iam.service.ts` y `iam.routes.ts`):**  
     - Se añadió el método `IamService.getStats()` que computa en una sola consulta agregada de alto rendimiento los totales de activos, inactivos, socios, staff, cortesías, vigentes, por vencer, vencidos y sin foto.
     - Se expuso el endpoint `GET /api/iam/personas/stats`.
     - Se amplió `GET /api/iam/personas` para procesar los parámetros `vigencia` (`VIGENTE`, `POR_VENCER`, `VENCIDA`) y `biometria` (`SIN_FOTO`, `CON_FOTO`).
  2. **En Interfaz Frontend (`Personas.tsx`):**  
     - Implementación del hook de debounce (250 ms) con botón de limpieza `✕`.
     - Barra facetada de 2 niveles compacta y reactiva con insignias numéricas en vivo.
     - Estado vacío elegante con botón *"Restablecer todos los filtros"*.
     - Cumplimiento estricto de la directiva §13 (491 líneas totales, por debajo del tope de 500 líneas).

---

<a name="faq-26"></a>
### 26. ¿Por qué decía 'de 5 registradas' si había 4 personas y cómo se unificó la coherencia de ámbito?

- **Pregunta Original de Mario:**  
  *"Si todos son 4 y socios son 3 y me dice de 5 registradas, no es clara la información"*
- **Formulación Técnica Formal:**  
  *¿Cómo mitigar la Inconsistencia de Ámbito (Scope Mismatch) en dashboards reactivos, asegurando que denominadores de filtrado y leyendas textuales deriven de forma determinista del subconjunto de ciclo de vida activo (`totalUniverso = activos`) en lugar del universo histórico global persistido en la base de datos?*
- **Explicación Didáctica (Los Clientes en la Tienda vs. El Cliente que se fue a Casa):**  
  - *El choque de números:* Imagina que en el gimnasio tienes a **4 personas adentro** (3 socios y 1 colaborador del staff), y tienes a **1 persona dada de baja** en el archivo muerto. Al ver la lista de activos, el botón de arriba dice claramente `Todos: 4`. Si filtras por *Socios*, ves a los 3 socios. Pero si el sistema te dice: *"Mostrando 3 socios (de 5 personas registradas)"*, te quedas pensando: *"¿De dónde salió ese 5 si arriba dice que Todos son 4?"*.
  - *La causa:* El texto estaba tomando el total general de la base de datos (`stats.total = 5`, que incluye al inactivo), en lugar de respetar el ámbito que el usuario está viendo en su pantalla (`stats.activos = 4`).
  - *La regla de oro de la industria:* Si estás en la pestaña de **Activos**, tu universo absoluto es **4**. El número 5 jamás debe aparecer allí. Si estás en la pestaña de **Dados de Baja**, tu universo es **1**.
- **Solución Aplicada en GymAccess Pro:**  
  1. **En `Personas.tsx`:** Se implementó la constante de ámbito coherente:  
     `const totalUniverso = filtroEstado === 'ACTIVOS' ? (stats.activos || 0) : (stats.inactivos || 0);`
  2. **Textos Contextuales Unificados:**  
     - Al filtrar por Socios: `👤 Mostrando 3 socio(s) (de 4 personas activas)`
     - Al filtrar por Vencidos: `🔴 Mostrando 2 persona(s) con membresía vencida (de 4 activas)`
     - Al ver la vista general: `📋 Mostrando las 4 personas activas en la sucursal`
     - Botón de restauración: `✕ Ver todos (4)`
  3. **Cuadratura en Botones:** El botón de Todos muestra exactamente `Todos 4`, sumando `Socios 3` + `Staff 1` = 4 sin ninguna contradicción.
