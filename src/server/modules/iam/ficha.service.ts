import path from 'path';
import fs from 'fs';
import { db } from '../../db/database.js';
import { HikConnectService } from '../../services/hikconnect.js';
import { TelemetryService } from '../../services/telemetryService.js';
import { TeamsErrorTranslator } from '../../services/teamsErrorTranslator.js';

export interface FichaPersonaResponse {
  persona: any;
  membresia: any | null;
  niveles: Array<{
    id: number;
    nombre: string;
    cloud_level_id: string;
    cuenta_nombre: string;
    cuenta_id: number;
    puertas: string[];
    incluido_en_plan: boolean;
    asignado: boolean;
    estado_sincronizacion?: string;
  }>;
}

export class FichaService {
  /**
   * Guarda imagen base64 recortada localmente en uploads/
   */
  private static saveBase64Photo(base64Data: string): string {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const filename = `persona_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(cleanBase64, 'base64'));
    return `/uploads/${filename}`;
  }

  /**
   * Lee la foto guardada en disco local y la convierte a base64 limpio
   */
  private static getBase64FromLocalPhoto(photoUrl?: string | null): string | null {
    if (!photoUrl || !photoUrl.startsWith('/uploads/')) return null;
    try {
      const fullPath = path.resolve(process.cwd(), photoUrl.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath).toString('base64');
      }
    } catch (e: any) {
      console.warn('⚠️ No se pudo leer la imagen local para base64:', e.message);
    }
    return null;
  }

  /**
   * Formatea fecha en ISO 8601 con zona horaria de México (GMT-6 / CST)
   */
  private static formatIsoTz(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}-06:00`;
  }

  /**
   * Obtiene la ficha completa de un socio: identidad, plan activo, puertas y niveles
   */
  public static getFicha(personaId: number): FichaPersonaResponse {
    const persona = db.prepare(`
      SELECT 
        p.id, p.codigo, p.nombre, p.apellidos, p.telefono, p.email, p.foto_url, p.tipo, p.hik_person_id, p.activo,
        m.id as membresia_id, m.fecha_inicio as vigencia_inicio, m.fecha_fin as vigencia_fin, 
        m.estatus as membresia_estatus, gp.id as plan_id, gp.nombre as plan_nombre, gp.precio as plan_precio
      FROM personas p
      LEFT JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
      LEFT JOIN gym_planes gp ON gp.id = m.plan_id
      WHERE p.id = ?
    `).get(personaId) as any;

    if (!persona) {
      throw new Error('Persona no encontrada');
    }

    // Obtener los niveles que incluye el plan actual
    let nivelesDelPlanIds: number[] = [];
    if (persona.plan_id) {
      const planNiveles = db.prepare(`
        SELECT nivel_id FROM gym_plan_niveles WHERE plan_id = ?
      `).all(persona.plan_id) as Array<{ nivel_id: number }>;
      nivelesDelPlanIds = planNiveles.map(pn => pn.nivel_id);

      if (nivelesDelPlanIds.length === 0) {
        const directPlan = db.prepare('SELECT nivel_acceso_id FROM gym_planes WHERE id = ?').get(persona.plan_id) as any;
        if (directPlan?.nivel_acceso_id) {
          nivelesDelPlanIds = [directPlan.nivel_acceso_id];
        }
      }
    }

    // Obtener los niveles actualmente asignados a la persona
    const autorizaciones = db.prepare(`
      SELECT nivel_id, estado_sincronizacion, ultimo_error 
      FROM persona_autorizaciones_acceso 
      WHERE persona_id = ?
    `).all(personaId) as Array<{ nivel_id: number; estado_sincronizacion: string; ultimo_error: string }>;
    
    const asignadosMap = new Map<number, string>();
    autorizaciones.forEach(a => asignadosMap.set(a.nivel_id, a.estado_sincronizacion));

    // Obtener todos los niveles de acceso activos con sus torniquetes/puertas
    const todosLosNiveles = db.prepare(`
      SELECT n.id, n.nombre, n.cloud_level_id, n.cuenta_hct_id, c.nombre as cuenta_nombre
      FROM niveles_acceso n
      LEFT JOIN cuentas_hct c ON c.id = n.cuenta_hct_id
      WHERE n.activo = 1
      ORDER BY n.id ASC
    `).all() as any[];

    const nivelesFormateados = todosLosNiveles.map(niv => {
      const puertas = db.prepare(`
        SELECT t.nombre 
        FROM nivel_acceso_torniquetes nat
        JOIN torniquetes t ON t.id = nat.torniquete_id
        WHERE nat.nivel_id = ?
      `).all(niv.id) as Array<{ nombre: string }>;

      return {
        id: niv.id,
        nombre: niv.nombre,
        cloud_level_id: niv.cloud_level_id,
        cuenta_nombre: niv.cuenta_nombre || 'Cuenta Principal',
        cuenta_id: niv.cuenta_hct_id || 1,
        puertas: puertas.map(p => p.nombre),
        incluido_en_plan: nivelesDelPlanIds.includes(niv.id),
        asignado: asignadosMap.has(niv.id),
        estado_sincronizacion: asignadosMap.get(niv.id),
      };
    });

    return {
      persona,
      membresia: persona.membresia_id ? {
        id: persona.membresia_id,
        plan_id: persona.plan_id,
        plan_nombre: persona.plan_nombre,
        plan_precio: persona.plan_precio,
        vigencia_inicio: persona.vigencia_inicio,
        vigencia_fin: persona.vigencia_fin,
        estatus: persona.membresia_estatus,
      } : null,
      niveles: nivelesFormateados,
    };
  }

  /**
   * Actualiza la foto biométrica de la persona en SQLite y la propaga a Teams
   */
  public static async actualizarFoto(personaId: number, fotoBase64: string) {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId) as any;
    if (!persona) throw new Error('Persona no encontrada');

    const cleanBase64 = fotoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const localPhotoUrl = this.saveBase64Photo(fotoBase64);

    // Guardar en SQLite
    db.prepare('UPDATE personas SET foto_url = ? WHERE id = ?').run(localPhotoUrl, personaId);
    db.prepare(`
      INSERT OR REPLACE INTO credenciales (persona_id, tipo, valor)
      VALUES (?, 'FACIAL', ?)
    `).run(personaId, localPhotoUrl);

    let teamsOk = false;
    let teamsErr: string | null = null;

    if (persona.hik_person_id) {
      try {
        const config = HikConnectService.getConfig(1);
        const token = await HikConnectService.getAccessToken(1);

        const startTime = performance.now();
        const res = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Token': token },
          body: JSON.stringify({
            personId: persona.hik_person_id,
            photoData: cleanBase64,
            photoBase64: cleanBase64,
          }),
        });

        const latencyMs = Math.round(performance.now() - startTime);
        const data = await res.json();

        TelemetryService.log({
          cuenta_id: 1,
          cuenta_nombre: config.nombre,
          tipo_accion: 'GESTION_PERSONAS',
          recurso_nombre: `${persona.nombre} ${persona.apellidos || ''}`.trim(),
          latencia_ms: latencyMs,
          http_status: res.status,
          hct_error_code: data.errorCode,
          hct_message: data.message || 'Actualización de foto en Teams',
          exito: data.errorCode === '0',
        });

        if (data.errorCode === '0') {
          teamsOk = true;
          console.log(`📸 Foto biométrica actualizada en Teams para ${persona.nombre}`);
        } else {
          teamsErr = data.message || `Error ${data.errorCode}`;
        }
      } catch (err: any) {
        teamsErr = err.message;
      }
    }

    return {
      success: true,
      foto_url: localPhotoUrl,
      teamsSynced: teamsOk,
      teamsError: teamsErr,
    };
  }

  /**
   * Fuerza el envío o re-sincronización de un socio al checador de Teams
   */
  public static async sincronizarConChecador(personaId: number, nivelesIdsSeleccionados?: number[]) {
    const persona = db.prepare(`
      SELECT 
        p.*, 
        m.fecha_inicio, m.fecha_fin as vigencia_fin, m.estatus as membresia_estatus,
        gp.id as plan_id, gp.nombre as plan_nombre
      FROM personas p
      LEFT JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
      LEFT JOIN gym_planes gp ON gp.id = m.plan_id
      WHERE p.id = ?
    `).get(personaId) as any;

    if (!persona) throw new Error('Persona no encontrada');

    let nivelesIds = nivelesIdsSeleccionados;
    if (!nivelesIds || nivelesIds.length === 0) {
      if (persona.plan_id) {
        const rows = db.prepare('SELECT nivel_id FROM gym_plan_niveles WHERE plan_id = ?').all(persona.plan_id) as any[];
        nivelesIds = rows.map(r => r.nivel_id);
        if (nivelesIds.length === 0) {
          const direct = db.prepare('SELECT nivel_acceso_id FROM gym_planes WHERE id = ?').get(persona.plan_id) as any;
          if (direct?.nivel_acceso_id) nivelesIds = [direct.nivel_acceso_id];
        }
      }
    }

    if (!nivelesIds || nivelesIds.length === 0) {
      const defaultNivel = db.prepare('SELECT id FROM niveles_acceso WHERE activo = 1 LIMIT 1').get() as any;
      if (defaultNivel) nivelesIds = [defaultNivel.id];
    }

    const hoy = new Date();
    let fechaFin = new Date();
    if (persona.vigencia_fin) {
      const parts = persona.vigencia_fin.split('T')[0].split('-');
      fechaFin = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59);
    } else {
      fechaFin.setDate(hoy.getDate() + 30);
      fechaFin.setHours(23, 59, 59);
    }

    const startDateIso = this.formatIsoTz(hoy);
    const endDateIso = this.formatIsoTz(fechaFin);
    const photoBase64 = this.getBase64FromLocalPhoto(persona.foto_url);

    const placeholders = (nivelesIds || []).map(() => '?').join(',');
    const niveles = placeholders ? db.prepare(`
      SELECT n.id, n.nombre, n.cloud_level_id, n.cuenta_hct_id
      FROM niveles_acceso n
      WHERE n.id IN (${placeholders}) AND n.activo = 1
    `).all(...(nivelesIds || [])) as any[] : [];

    const cloudLevelIds = niveles.map(n => n.cloud_level_id).filter(Boolean);
    const cuentaId = niveles[0]?.cuenta_hct_id || 1;
    const config = HikConnectService.getConfig(cuentaId);
    const token = await HikConnectService.getAccessToken(cuentaId);

    const fullName = `${persona.nombre} ${persona.apellidos || ''}`.trim();
    let cloudPersonId = persona.hik_person_id;
    let teamsSuccess = false;
    let errorMessage: string | null = null;

    const personCode = (persona.codigo || '').trim() || String(1000 + persona.id);
    const safeLastName = (persona.apellidos && persona.apellidos.trim().length > 0) ? persona.apellidos.trim() : '.';
    const safeFirstName = (persona.nombre && persona.nombre.trim().length > 0) ? persona.nombre.trim() : 'Socio';

    if (!cloudPersonId) {
      const quickAddPayload: any = {
        personInfo: {
          personCode,
          firstName: safeFirstName,
          lastName: safeLastName,
          gender: 1,
          groupId: '1',
          phoneNo: (persona.telefono || '').trim() || undefined,
          startDate: startDateIso,
          endDate: endDateIso,
        }
      };
      if (photoBase64) {
        quickAddPayload.photoData = photoBase64;
        quickAddPayload.photoBase64 = photoBase64;
      }
      if (cloudLevelIds.length > 0) quickAddPayload.accessLevelIds = cloudLevelIds;

      const startTime = performance.now();
      const res = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/quick/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Token': token },
        body: JSON.stringify(quickAddPayload),
      });

      const latencyMs = Math.round(performance.now() - startTime);
      const data = await res.json();

      TelemetryService.log({
        cuenta_id: cuentaId,
        cuenta_nombre: config.nombre,
        tipo_accion: 'GESTION_PERSONAS',
        recurso_nombre: fullName,
        latencia_ms: latencyMs,
        http_status: res.status,
        hct_error_code: data.errorCode,
        hct_message: data.message || 'Forzar sincronización (Quick Add) en Teams',
        exito: data.errorCode === '0',
      });

      if (data.errorCode === '0' && data.data?.personId) {
        cloudPersonId = String(data.data.personId);
        teamsSuccess = true;
        db.prepare('UPDATE personas SET hik_person_id = ? WHERE id = ?').run(cloudPersonId, personaId);
      } else {
        errorMessage = TeamsErrorTranslator.translate(data.errorCode, data.message);
      }
    } else {
      try {
        const updateRes = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Token': token },
          body: JSON.stringify({
            personId: cloudPersonId,
            personCode,
            firstName: safeFirstName,
            lastName: safeLastName,
            gender: 1,
            groupId: '684236911358785536',
            startDate: startDateIso,
            endDate: endDateIso,
          }),
        });
        const updateData = await updateRes.json();

        let photoOk = true;
        if (photoBase64) {
          const photoRes = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Token': token },
            body: JSON.stringify({
              personId: cloudPersonId,
              photoData: photoBase64,
              photoBase64: photoBase64,
            }),
          });
          const photoResult = await photoRes.json();
          photoOk = photoResult.errorCode === '0';
        }

        teamsSuccess = updateData.errorCode === '0' && photoOk;
        if (!teamsSuccess) {
          const failCode = updateData.errorCode !== '0' ? updateData.errorCode : '0x6001';
          const failMsg = updateData.message || 'Error al actualizar persona o fotografía en Teams';
          errorMessage = TeamsErrorTranslator.translate(failCode, failMsg);
        }
      } catch (err: any) {
        errorMessage = err.message;
      }
    }

    if (teamsSuccess) {
      // Asignar niveles de acceso individuales por persona a la nube de Teams
      if (cloudLevelIds.length > 0) {
        try {
          await fetch(`${config.baseUrl}/hccgw/acspm/v1/accesslevel/person/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Token: token },
            body: JSON.stringify({
              personList: [{ personId: cloudPersonId, accessLevelIdList: cloudLevelIds }],
            }),
          });
        } catch (lErr: any) {
          console.warn('⚠️ Error asociando nivel en Teams:', lErr.message);
        }
      }

      db.prepare('DELETE FROM persona_autorizaciones_acceso WHERE persona_id = ?').run(personaId);
      for (const niv of niveles) {
        db.prepare(`
          INSERT INTO persona_autorizaciones_acceso 
          (persona_id, nivel_id, fecha_inicio, fecha_fin, estado_sincronizacion)
          VALUES (?, ?, ?, ?, 'SINCRONIZADO')
        `).run(personaId, niv.id, hoy.toISOString(), fechaFin.toISOString());
      }
    }

    return {
      success: teamsSuccess,
      hik_person_id: cloudPersonId,
      teamsSynced: teamsSuccess,
      teamsError: errorMessage,
      endDateIso,
      nivelesSincronizados: niveles.map(n => n.nombre),
    };
  }

  /**
   * Actualiza datos generales (nombre, apellidos, teléfono, email) en SQLite
   * y si la persona ya está en Teams, propaga los cambios a la terminal de hardware.
   */
  public static async actualizarDatosPersona(personaId: number, data: {
    codigo?: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
  }) {
    const persona = db.prepare(`
      SELECT p.*, m.fecha_fin as vigencia_fin
      FROM personas p
      LEFT JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
      WHERE p.id = ?
    `).get(personaId) as any;
    if (!persona) throw new Error('Persona no encontrada');

    const codigo = data.codigo !== undefined && data.codigo.trim() ? data.codigo.trim() : persona.codigo;
    const nombre = data.nombre !== undefined ? data.nombre.trim() : persona.nombre;
    const apellidos = data.apellidos !== undefined ? data.apellidos.trim() : (persona.apellidos || '');
    const telefono = data.telefono !== undefined ? data.telefono.trim() : (persona.telefono || '');
    const email = data.email !== undefined ? data.email.trim() : (persona.email || '');

    if (!nombre) {
      throw new Error('El nombre de la persona es obligatorio');
    }
    if (!telefono) {
      throw new Error('El teléfono es obligatorio');
    }

    if (codigo) {
      if (/[^a-zA-Z0-9]/.test(codigo)) {
        throw new Error('El ID/Código solo puede contener letras y números (sin guiones ni símbolos).');
      }
      if (persona.hik_person_id && codigo !== persona.codigo) {
        throw new Error(`El código en el checador es inmutable ("${persona.codigo}"). No se puede alterar una vez registrado en Teams.`);
      }
      if (codigo !== persona.codigo) {
        const duplicado = db.prepare('SELECT id, nombre FROM personas WHERE codigo = ? AND id != ?').get(codigo, personaId) as any;
        if (duplicado) {
          throw new Error(`El código/ID "${codigo}" ya pertenece a ${duplicado.nombre}`);
        }
      }
    }

    db.prepare(`
      UPDATE personas 
      SET codigo = ?, nombre = ?, apellidos = ?, telefono = ?, email = ?, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(codigo, nombre, apellidos, telefono, email, personaId);

    let teamsSynced = false;
    let teamsError: string | null = null;

    if (persona.hik_person_id) {
      try {
        const config = HikConnectService.getConfig(1);
        const token = await HikConnectService.getAccessToken(1);

        const safeLastName = apellidos.length > 0 ? apellidos : '.';

        const hoy = new Date();
        let fechaFin = new Date();
        if (persona.vigencia_fin) {
          const parts = persona.vigencia_fin.split('T')[0].split('-');
          fechaFin = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59);
        } else {
          fechaFin.setDate(hoy.getDate() + 30);
          fechaFin.setHours(23, 59, 59);
        }

        const startDateIso = this.formatIsoTz(hoy);
        const endDateIso = this.formatIsoTz(fechaFin);

        const startTime = performance.now();
        const updateRes = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Token': token },
          body: JSON.stringify({
            personId: persona.hik_person_id,
            personCode: codigo,
            firstName: nombre,
            lastName: safeLastName,
            gender: 1,
            groupId: '684236911358785536',
            phoneNo: telefono || undefined,
            email: email || undefined,
            startDate: startDateIso,
            endDate: endDateIso,
          }),
        });

        const latencyMs = Math.round(performance.now() - startTime);
        const updateData = await updateRes.json();

        TelemetryService.log({
          cuenta_id: 1,
          cuenta_nombre: config.nombre,
          tipo_accion: 'GESTION_PERSONAS',
          recurso_nombre: `${nombre} ${apellidos}`.trim(),
          latencia_ms: latencyMs,
          http_status: updateRes.status,
          hct_error_code: updateData.errorCode,
          hct_message: updateData.message || 'Actualización de datos generales en Teams',
          exito: updateData.errorCode === '0',
        });

        if (updateData.errorCode === '0') {
          teamsSynced = true;
        } else {
          teamsError = TeamsErrorTranslator.translate(updateData.errorCode, updateData.message);
        }
      } catch (err: any) {
        teamsError = err.message;
      }
    }

    return {
      success: true,
      persona: { id: personaId, nombre, apellidos, telefono, email },
      teamsSynced,
      teamsError,
    };
  }
}

