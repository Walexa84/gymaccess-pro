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

    let startDate = new Date();
    if (persona.fecha_inicio) {
      const partsS = persona.fecha_inicio.split('T')[0].split('-');
      startDate = new Date(Number(partsS[0]), Number(partsS[1]) - 1, Number(partsS[2]), 0, 0, 0);
    }
    if (startDate.getTime() >= fechaFin.getTime()) {
      startDate = new Date(fechaFin.getTime() - 24 * 60 * 60 * 1000);
    }

    const startDateIso = this.formatIsoTz(startDate);
    const endDateIso = this.formatIsoTz(fechaFin);
    const photoBase64 = this.getBase64FromLocalPhoto(persona.foto_url);

    const placeholders = (nivelesIds || []).map(() => '?').join(',');
    const niveles = placeholders ? db.prepare(`
      SELECT n.id, n.nombre, n.cloud_level_id, n.cuenta_hct_id
      FROM niveles_acceso n
      WHERE n.id IN (${placeholders}) AND n.activo = 1
    `).all(...(nivelesIds || [])) as any[] : [];

    // Agrupar niveles por cuenta de Teams para orquestación Multi-Tenant
    const byCuenta = new Map<number, any[]>();
    for (const niv of niveles) {
      const cId = niv.cuenta_hct_id || 1;
      const arr = byCuenta.get(cId) || [];
      arr.push(niv);
      byCuenta.set(cId, arr);
    }
    if (byCuenta.size === 0) {
      byCuenta.set(1, []);
    }

    const fullName = `${persona.nombre} ${persona.apellidos || ''}`.trim();
    const rawCode = (persona.codigo || '').replace(/[^a-zA-Z0-9]/g, '');
    const personCode = rawCode.length > 0 ? rawCode : String(1000 + persona.id);
    const safeLastName = (persona.apellidos && persona.apellidos.trim().length > 0) ? persona.apellidos.trim() : '.';
    const safeFirstName = (persona.nombre && persona.nombre.trim().length > 0) ? persona.nombre.trim() : 'Socio';

    let allTeamsSuccess = true;
    let mainCloudPersonId = persona.hik_person_id;
    const errors: string[] = [];

    for (const [cuentaId, nivelesDeCuenta] of byCuenta.entries()) {
      try {
        const config = HikConnectService.getConfig(cuentaId);
        const token = await HikConnectService.getAccessToken(cuentaId);
        const cloudLevelIds = nivelesDeCuenta.map((n: any) => n.cloud_level_id).filter(Boolean);

        // Identificar si la persona ya tiene ID en esta cuenta de Teams
        let cloudPersonIdParaCuenta: string | null = null;
        try {
          const mapping = db.prepare('SELECT cloud_person_id FROM persona_cuentas_hct WHERE persona_id = ? AND cuenta_hct_id = ?').get(personaId, cuentaId) as { cloud_person_id: string } | undefined;
          if (mapping?.cloud_person_id) {
            cloudPersonIdParaCuenta = mapping.cloud_person_id;
          }
        } catch {}

        if (!cloudPersonIdParaCuenta && cuentaId === 1 && persona.hik_person_id) {
          cloudPersonIdParaCuenta = persona.hik_person_id;
        }

        let cuentaOk = false;

        if (!cloudPersonIdParaCuenta) {
          // Alta Rápida (Quick Add) en esta cuenta específica de Teams
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
            hct_message: data.message || `Alta rápida en [${config.nombre}]`,
            exito: data.errorCode === '0',
          });

          if (data.errorCode === '0' && data.data?.personId) {
            cloudPersonIdParaCuenta = String(data.data.personId);
            cuentaOk = true;
            try {
              db.prepare('INSERT OR REPLACE INTO persona_cuentas_hct (persona_id, cuenta_hct_id, cloud_person_id) VALUES (?, ?, ?)').run(personaId, cuentaId, cloudPersonIdParaCuenta);
            } catch {}
            if (cuentaId === 1 || !mainCloudPersonId) {
              mainCloudPersonId = cloudPersonIdParaCuenta;
              db.prepare('UPDATE personas SET hik_person_id = ? WHERE id = ?').run(mainCloudPersonId, personaId);
            }
          } else if (data.errorCode === 'CCF038024') {
            // Ya existía en esta cuenta de Teams; vincular su ID y asociar niveles
            try {
              const { TeamsPersonService } = await import('./teamsPerson.service.js');
              const tData = await TeamsPersonService.getPersonsFromTeams(cuentaId);
              const found = tData.persons?.find((p: any) => p.personCode === personCode || p.fullName === fullName);
              if (found?.personId) {
                cloudPersonIdParaCuenta = String(found.personId);
                cuentaOk = true;
                db.prepare('INSERT OR REPLACE INTO persona_cuentas_hct (persona_id, cuenta_hct_id, cloud_person_id) VALUES (?, ?, ?)').run(personaId, cuentaId, cloudPersonIdParaCuenta);
                if (cloudLevelIds.length > 0) {
                  await fetch(`${config.baseUrl}/hccgw/acspm/v1/accesslevel/person/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Token: token },
                    body: JSON.stringify({
                      personList: [{ personId: cloudPersonIdParaCuenta, accessLevelIdList: cloudLevelIds }],
                    }),
                  });
                }
              }
            } catch {}
          } else {
            errors.push(`[${config.nombre}]: ${data.message || data.errorCode}`);
            allTeamsSuccess = false;
          }
        } else {
          // Actualización en esta cuenta
          const updateRes = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Token': token },
            body: JSON.stringify({
              personId: cloudPersonIdParaCuenta,
              personCode,
              firstName: safeFirstName,
              lastName: safeLastName,
              gender: 1,
              groupId: '1',
              startDate: startDateIso,
              endDate: endDateIso,
            }),
          });
          const updateData = await updateRes.json();
          let finalUpdateData = updateData;
          if (finalUpdateData.errorCode === 'CCF000001') {
            try {
              const { TeamsPersonService } = await import('./teamsPerson.service.js');
              const tData = await TeamsPersonService.getPersonsFromTeams(cuentaId);
              const foundInTeams = tData.persons?.find((p: any) => String(p.personId) === String(cloudPersonIdParaCuenta));
              if (foundInTeams?.personCode) {
                const retryRes = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/update`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Token': token },
                  body: JSON.stringify({
                    personId: cloudPersonIdParaCuenta,
                    personCode: foundInTeams.personCode,
                    firstName: safeFirstName,
                    lastName: safeLastName,
                    gender: 1,
                    groupId: '1',
                    startDate: startDateIso,
                    endDate: endDateIso,
                  }),
                });
                finalUpdateData = await retryRes.json();
              }
            } catch {}
          }

          let photoOk = true;
          if (photoBase64) {
            const photoRes = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/photo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Token': token },
              body: JSON.stringify({
                personId: cloudPersonIdParaCuenta,
                photoData: photoBase64,
                photoBase64: photoBase64,
              }),
            });
            const photoResult = await photoRes.json();
            photoOk = photoResult.errorCode === '0';
          }

          cuentaOk = finalUpdateData.errorCode === '0' && photoOk;
          if (cuentaOk) {
            if (cloudLevelIds.length > 0) {
              try {
                await fetch(`${config.baseUrl}/hccgw/acspm/v1/accesslevel/person/add`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Token: token },
                  body: JSON.stringify({
                    personList: [{ personId: cloudPersonIdParaCuenta, accessLevelIdList: cloudLevelIds }],
                  }),
                });
              } catch (lErr: any) {
                console.warn(`⚠️ Error asociando nivel en [${config.nombre}]:`, lErr.message);
              }
            }
          } else {
            errors.push(`[${config.nombre}]: ${finalUpdateData.message || finalUpdateData.errorCode}`);
            allTeamsSuccess = false;
          }
        }

        if (cuentaOk) {
          for (const niv of nivelesDeCuenta) {
            db.prepare(`
              INSERT OR REPLACE INTO persona_autorizaciones_acceso 
              (persona_id, nivel_id, fecha_inicio, fecha_fin, estado_sincronizacion)
              VALUES (?, ?, ?, ?, 'SINCRONIZADO')
            `).run(personaId, niv.id, hoy.toISOString(), fechaFin.toISOString());
          }
        }
      } catch (cErr: any) {
        errors.push(`Cuenta ${cuentaId}: ${cErr.message}`);
        allTeamsSuccess = false;
      }
    }

    return {
      success: allTeamsSuccess,
      hik_person_id: mainCloudPersonId,
      teamsSynced: allTeamsSuccess,
      teamsError: errors.length > 0 ? errors.join('; ') : null,
      endDateIso,
      nivelesSincronizados: niveles.map((n: any) => n.nombre),
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
    const telefonoFinal = telefono || null;

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

    const codigoFinal = persona.hik_person_id ? persona.codigo : codigo;

    db.prepare(`
      UPDATE personas 
      SET codigo = ?, nombre = ?, apellidos = ?, telefono = ?, email = ?, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(codigoFinal, nombre, apellidos, telefonoFinal, email, personaId);

    let teamsSynced = false;
    let teamsError: string | null = null;

    if (persona.hik_person_id) {
      const syncResult = await this.sincronizarConChecador(personaId);
      teamsSynced = syncResult.teamsSynced;
      teamsError = syncResult.teamsError;
    }

    return {
      success: true,
      persona: { id: personaId, nombre, apellidos, telefono, email },
      teamsSynced,
      teamsError,
    };
  }
}

