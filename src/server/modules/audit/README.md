# 🛡️ Módulo de Bitácora & Auditoría del Sistema (Clean Architecture)

> **DIRECTIVA ARQUITECTÓNICA VITAL (RECORDATORIO PERMANENTE):**  
> Este módulo es **100% INDEPENDIENTE Y DESACOPLADO DEL GIRO COMERCIAL**.  
> No contiene reglas ni acoplamiento forzado a membresías de gimnasio, rutinas ni ejercicios.
> Está diseñado con principios de **Clean Architecture** para poder ser exportado, migrado o adaptado a cualquier otro giro de negocio futuro (coworking, clínicas, clubes deportivos, corporativos, escuelas o condominios).

---

## 📌 Principios de Diseño
1. **Contrato Genérico de Auditoría (`AuditEventInput`):**  
   Cualquier módulo del sistema (Acceso físico, POS, Caja, IAM, Hardware, Seguridad) registra eventos mediante:
   - `modulo`: Identificador del subsistema (`ACCESO`, `POS`, `MEMBRESIA`, `IAM`, `HARDWARE`, `SEGURIDAD`, `SISTEMA`).
   - `accion`: Verbo de la acción (`APERTURA_MANUAL`, `EMISION_CORTESIA`, `COBRO_MEMBRESIA`, etc.).
   - `actor`: Usuario o dispositivo que originó el evento (`usuarioId`, `ip`).
   - `resultado`: `EXITO`, `FALLO`, `ADVERTENCIA`.
   - `metadata`: JSON extensible para detalles futuros sin alterar el esquema de base de datos.
2. **Carácter Evolutivo:**  
   A medida que se agreguen nuevos módulos al software (ej. facturación electrónica, control de inventario, torniquetes de visitas, reservas de áreas), cada uno debe emitir sus eventos hacia `AuditService.registrarEvento()`.
3. **Resiliencia Fail-Safe:**  
   Un fallo al escribir un log de auditoría NUNCA debe detener la transacción principal del usuario. Las excepciones se atrapan y registran silenciosamente con log de advertencia.
