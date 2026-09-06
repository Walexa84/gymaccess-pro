import path from 'path';
import fs from 'fs';
import { db } from '../../db/database.js';
import { HikConnectService } from '../../services/hikconnect.js';
import { TelemetryService } from '../../services/telemetryService.js';

export interface ImportPersonInput {
  personId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  tipo?: 'SOCIO' | 'EMPLEADO' | 'VISITANTE';
  planId?: number;
}

export interface EnrollPersonInput {
  codigo?: string;
  nombre: string;
  apellidos?: string;
  telefono: string;
  email?: string;
  tipo: 'SOCIO' | 'EMPLEADO' | 'VISITANTE';
  sucursalId?: number;
  planId?: number;
  nivelIds: number[];
  fotoBase64?: string;
  vigenciaDias?: number;
}

export class TeamsPersonService {
  /**
   * Descarga la foto remota de Teams (S3) y la guarda localmente en uploads/
   */
  private static async downloadAndSavePhoto(photoUrl?: string): Promise<string | null> {
    if (!photoUrl) return null;
    try {
      const res = await fetch(photoUrl);
      if (!res.ok) return photoUrl;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filename = `teams_${Date.now()}.jpg`;
      const fullPath = path.join(uploadDir, filename);
      fs.writeFileSync(fullPath, buffer);
      return `/uploads/${filename}`;
    } catch (err: any) {
      console.warn('⚠️ No se pudo descargar imagen de Teams localmente:', err.message);
      return photoUrl;
    }
  }

  /**
   * Obtiene la lista en vivo de personas de una cuenta de Teams
   * y las cruza contra el directorio de clientes en SQLite para clasificar su estado.
   */
  public static async getPersonsFromTeams(cuentaId?: number) {
    const config = HikConnectService.getConfig(cuentaId);
    const token = await HikConnectService.getAccessToken(config.id);

    const startTime = performance.now();
    const response = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify({
        pageIndex: 1,
        pageSize: 100,
      }),
    });

    const latencyMs = Math.round(performance.now() - startTime);
    const result = await response.json();

    TelemetryService.log({
      cuenta_id: config.id,
      cuenta_nombre: config.nombre,
      tipo_accion: 'GESTION_PERSONAS',
      latencia_ms: latencyMs,
      http_status: response.status,
      hct_error_code: result.errorCode,
      hct_message: result.message || 'Consulta de personas en Teams',
      exito: result.errorCode === '0',
    });

    if (result.errorCode !== '0') {
      throw new Error(`Error de Teams al listar personas (${result.errorCode}): ${result.message}`);
    }

    const rawList = result.data?.personList || [];

    // Obtener todas las personas locales activas con su membresía
    const localPersons = db.prepare(`
      SELECT 
        p.id, p.nombre, p.apellidos, p.telefono, p.foto_url, p.hik_person_id, p.tipo,
        m.estatus as membresia_estatus, m.fecha_fin as vigencia_fin, gp.nombre as plan_nombre
      FROM personas p
      LEFT JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
      LEFT JOIN gym_planes gp ON gp.id = m.plan_id
      WHERE p.activo = 1
    `).all() as any[];

    // Mapas para cruce rápido
    const byHikId = new Map<string, any>();
    const byName = new Map<string, any>();

    for (const lp of localPersons) {
      if (lp.hik_person_id) byHikId.set(String(lp.hik_person_id), lp);
      const fullNameNorm = `${lp.nombre} ${lp.apellidos || ''}`.trim().toLowerCase();
      byName.set(fullNameNorm, lp);
    }

    let unregisteredCount = 0;

    const persons = rawList.map((item: any) => {
      const info = item.personInfo || {};
      const personId = String(info.personId || '');
      const firstName = (info.firstName || '').trim();
      const lastName = (info.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const fullNameNorm = fullName.toLowerCase();

      // Cruzar por ID de Teams o por Nombre Completo
      const match = byHikId.get(personId) || byName.get(fullNameNorm);

      const isRegistered = !!match;
      if (!isRegistered) unregisteredCount++;

      return {
        personId,
        personCode: info.personCode || '',
        groupId: info.groupId || '',
        firstName,
        lastName,
        fullName,
        gender: info.gender,
        headPicUrl: info.headPicUrl || null,
        startDate: info.startDate || null,
        endDate: info.endDate || null,
        // Datos de cruce con GymAccess Pro
        is_registered_in_gym: isRegistered,
        local_person_id: match?.id || null,
        local_tipo: match?.tipo || null,
        membresia_estatus: match?.membresia_estatus || null,
        plan_nombre: match?.plan_nombre || null,
        vigencia_fin: match?.vigencia_fin || null,
        telefono: match?.telefono || info.phone || '',
      };
    });

    return {
      cuentaId: config.id,
      cuentaNombre: config.nombre,
      totalTeams: persons.length,
      unregisteredCount,
      registeredCount: persons.length - unregisteredCount,
      persons,
    };
  }

  /**
   * Importa una persona detectada en Teams hacia la base de datos de GymAccess Pro
   */
  public static async importPersonToGym(cuentaId: number, data: ImportPersonInput) {
    if (!data.personId || !data.firstName) {
      throw new Error('ID de Teams y Nombre son campos requeridos para importar');
    }

    // Verificar si ya existe por hik_person_id
    const existingHik = db.prepare('SELECT id, nombre FROM personas WHERE hik_person_id = ? AND activo = 1').get(data.personId) as any;
    if (existingHik) {
      return { success: true, message: `Esta persona ya está registrada como [${existingHik.nombre}]`, personaId: existingHik.id };
    }

    // Teléfono: si no viene, generar uno provisional único para no romper la restricción UNIQUE
    let phoneToUse = data.phone?.trim();
    if (!phoneToUse) {
      phoneToUse = `IMP-${data.personId.slice(-8)}`;
    }

    const existingPhone = db.prepare('SELECT id FROM personas WHERE telefono = ? AND activo = 1').get(phoneToUse) as any;
    if (existingPhone) {
      throw new Error(`El teléfono ${phoneToUse} ya pertenece a otro cliente registrado`);
    }

    // Descargar copia local de la fotografía facial
    const localPhotoUrl = await this.downloadAndSavePhoto(data.photoUrl);

    db.exec('BEGIN');
    try {
      const nextIdRow = db.prepare('SELECT MAX(id) as max_id FROM personas').get() as { max_id: number };
      const nextId = (nextIdRow?.max_id || 0) + 1;
      const codigo = `PER-${1000 + nextId}`;

      const stmt = db.prepare(`
        INSERT INTO personas (codigo, nombre, apellidos, telefono, email, foto_url, tipo, hik_person_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(codigo, data.firstName.trim(), (data.lastName || '').trim(), phoneToUse, data.email?.trim() || null, localPhotoUrl, data.tipo || 'SOCIO', data.personId);
      const newPersonaId = Number(info.lastInsertRowid);

      if (localPhotoUrl) {
        db.prepare(`INSERT INTO credenciales (persona_id, tipo, valor) VALUES (?, 'FACIAL', ?)`).run(newPersonaId, localPhotoUrl);
      }

      if (data.planId) {
        const plan = db.prepare('SELECT * FROM gym_planes WHERE id = ?').get(data.planId) as any;
        if (plan) {
          const hoy = new Date();
          const fin = new Date();
          fin.setDate(hoy.getDate() + (plan.duracion_dias || 30));
          db.prepare(`
            INSERT INTO gym_membresias (persona_id, plan_id, fecha_inicio, fecha_fin, estatus, activa)
            VALUES (?, ?, ?, ?, 'VIGENTE', 1)
          `).run(newPersonaId, plan.id, hoy.toISOString().split('T')[0], fin.toISOString().split('T')[0]);
        }
      }

      db.exec('COMMIT');
      return { success: true, message: 'Persona importada al gimnasio con éxito', personaId: newPersonaId };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Elimina individualmente una persona de Teams y del checador
   */
  public static async deletePersonFromTeams(cuentaId: number, personId: string) {
    if (!personId) throw new Error('personId es requerido para eliminar');

    const config = HikConnectService.getConfig(cuentaId);
    const token = await HikConnectService.getAccessToken(config.id);

    const startTime = performance.now();
    const response = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Token': token },
      body: JSON.stringify({ personId }),
    });

    const latencyMs = Math.round(performance.now() - startTime);
    const result = await response.json();

    TelemetryService.log({
      cuenta_id: config.id,
      cuenta_nombre: config.nombre,
      tipo_accion: 'GESTION_PERSONAS',
      recurso_id: personId,
      latencia_ms: latencyMs,
      http_status: response.status,
      hct_error_code: result.errorCode,
      hct_message: result.message || 'Eliminación de persona en Teams',
      exito: result.errorCode === '0',
    });

    if (result.errorCode !== '0') {
      throw new Error(`Error de Teams al eliminar persona (${result.errorCode}): ${result.message}`);
    }

    // Si estaba vinculada localmente, desvincular el ID de Teams para mantener consistencia
    db.prepare('UPDATE personas SET hik_person_id = NULL WHERE hik_person_id = ?').run(personId);

    return { success: true, message: 'Persona eliminada exitosamente de Teams y del checador' };
  }

  /**
   * Purga masiva: Elimina de Teams a todas las personas que NO están registradas en el gimnasio
   */
  public static async purgeUnregisteredPersons(cuentaId: number) {
    const data = await this.getPersonsFromTeams(cuentaId);
    const unregistered = data.persons.filter((p: any) => !p.is_registered_in_gym);

    if (unregistered.length === 0) {
      return { success: true, message: 'No hay personas no registradas para purgar', purgedCount: 0 };
    }

    let purgedCount = 0;
    const errors: string[] = [];

    for (const p of unregistered) {
      try {
        await this.deletePersonFromTeams(cuentaId, p.personId);
        purgedCount++;
      } catch (err: any) {
        errors.push(`${p.fullName} (${p.personId}): ${err.message}`);
      }
    }

    return {
      success: true,
      message: `Se purgaron ${purgedCount} personas de ${unregistered.length} no registradas en Teams`,
      purgedCount,
      totalUnregistered: unregistered.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

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
   * Enrola a una persona (Socio o Staff) de forma unificada:
   * 1. Guarda en SQLite (personas, credenciales, membresía si es socio).
   * 2. Inyecta a Teams en vivo con su foto y los niveles de acceso seleccionados.
   */
  public static async enrollPersonWithAccess(input: EnrollPersonInput) {
    if (!input.nombre || !input.telefono) {
      throw new Error('Nombre y teléfono son obligatorios');
    }

    const existingPhone = db.prepare('SELECT id FROM personas WHERE telefono = ? AND activo = 1').get(input.telefono.trim());
    if (existingPhone) {
      throw new Error(`Ya existe una persona registrada con el teléfono ${input.telefono}`);
    }

    let localPhotoUrl: string | null = null;
    let cleanBase64ForTeams: string | null = null;
    if (input.fotoBase64) {
      cleanBase64ForTeams = input.fotoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      localPhotoUrl = this.saveBase64Photo(input.fotoBase64);
    }

    db.exec('BEGIN');
    try {
      const nextIdRow = db.prepare('SELECT MAX(id) as max_id FROM personas').get() as { max_id: number };
      const nextId = (nextIdRow?.max_id || 0) + 1;
      const codigo = input.codigo?.trim() || String(1000 + nextId);

      if (/[^a-zA-Z0-9]/.test(codigo)) {
        throw new Error('El ID o Código solo puede contener letras y números (sin guiones ni símbolos).');
      }

      const duplicado = db.prepare('SELECT id, nombre FROM personas WHERE codigo = ?').get(codigo) as any;
      if (duplicado) {
        throw new Error(`El código/ID "${codigo}" ya pertenece a ${duplicado.nombre}`);
      }

      const stmt = db.prepare(`
        INSERT INTO personas (codigo, nombre, apellidos, telefono, email, foto_url, tipo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        codigo,
        input.nombre.trim(),
        (input.apellidos || '').trim(),
        input.telefono.trim(),
        input.email?.trim() || null,
        localPhotoUrl,
        input.tipo || 'SOCIO'
      );

      const newPersonaId = Number(info.lastInsertRowid);

      if (localPhotoUrl) {
        db.prepare(`
          INSERT INTO credenciales (persona_id, tipo, valor)
          VALUES (?, 'FACIAL', ?)
        `).run(newPersonaId, localPhotoUrl);
      }

      // Fechas de vigencia con cálculo de fin de día y pase diario
      const hoy = new Date();
      let fechaFin = new Date();

      if (input.tipo === 'SOCIO' && input.planId) {
        const plan = db.prepare('SELECT * FROM gym_planes WHERE id = ?').get(input.planId) as any;
        const dias = plan?.duracion_dias || input.vigenciaDias || 30;

        if (dias === 1) {
          // Pase Diario: vence hoy mismo al cierre (23:59:59)
          fechaFin.setHours(23, 59, 59, 999);
        } else {
          fechaFin.setDate(hoy.getDate() + dias);
          fechaFin.setHours(23, 59, 59, 999);
        }

        db.prepare(`
          INSERT INTO gym_membresias (persona_id, plan_id, fecha_inicio, fecha_fin, estatus, activa)
          VALUES (?, ?, ?, ?, 'VIGENTE', 1)
        `).run(newPersonaId, input.planId, hoy.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);
      } else {
        // Staff o Empleado: vigencia a 1 año
        fechaFin.setDate(hoy.getDate() + (input.vigenciaDias || 365));
        fechaFin.setHours(23, 59, 59, 999);
      }

      // Enrolamiento en Teams si se seleccionaron niveles
      let cloudPersonId: string | null = null;
      let teamsSyncSuccess = false;
      let teamsErrorMsg: string | null = null;

      if (Array.isArray(input.nivelIds) && input.nivelIds.length > 0) {
        // Consultar los niveles de acceso seleccionados
        const placeholders = input.nivelIds.map(() => '?').join(',');
        const niveles = db.prepare(`
          SELECT n.id, n.nombre, n.cloud_level_id, n.cuenta_hct_id, c.nombre as cuenta_nombre, c.base_url
          FROM niveles_acceso n
          JOIN cuentas_hct c ON c.id = n.cuenta_hct_id
          WHERE n.id IN (${placeholders}) AND n.activo = 1
        `).all(...input.nivelIds) as any[];

        // Agrupar por cuenta de Teams
        const byCuenta = new Map<number, any[]>();
        for (const niv of niveles) {
          const arr = byCuenta.get(niv.cuenta_hct_id) || [];
          arr.push(niv);
          byCuenta.set(niv.cuenta_hct_id, arr);
        }

        // Formatear ISO con zona horaria de México (GMT-6)
        const formatTz = (d: Date) => {
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}-06:00`;
        };

        const startDateIso = formatTz(hoy);
        const endDateIso = formatTz(fechaFin);

        for (const [cuentaId, nivelesDeCuenta] of byCuenta.entries()) {
          try {
            const config = HikConnectService.getConfig(cuentaId);
            const token = await HikConnectService.getAccessToken(cuentaId);
            const cloudLevelIds = nivelesDeCuenta.map((n) => n.cloud_level_id).filter(Boolean);

            const safeLastName = (input.apellidos && input.apellidos.trim().length > 0) ? input.apellidos.trim() : '.';
            const safeFirstName = input.nombre.trim();
            const quickAddPayload: any = {
              personInfo: {
                personCode: codigo,
                firstName: safeFirstName,
                lastName: safeLastName,
                gender: 1,
                groupId: '684236911358785536',
                phoneNo: input.telefono.trim(),
                startDate: startDateIso,
                endDate: endDateIso,
              }
            };
            if (cleanBase64ForTeams) {
              quickAddPayload.photoData = cleanBase64ForTeams;
              quickAddPayload.photoBase64 = cleanBase64ForTeams;
            }

            const startTime = performance.now();
            const res = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/quick/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Token: token },
              body: JSON.stringify(quickAddPayload),
            });

            const latencyMs = Math.round(performance.now() - startTime);
            const data = await res.json();
            TelemetryService.log({
              cuenta_id: cuentaId, cuenta_nombre: config.nombre, tipo_accion: 'GESTION_PERSONAS',
              recurso_nombre: `${safeFirstName} ${safeLastName}`, latencia_ms: latencyMs,
              http_status: res.status, hct_error_code: data.errorCode, hct_message: data.message || 'Alta rápida en Teams',
              exito: data.errorCode === '0',
            });

            if (data.errorCode === '0' && data.data?.personId) {
              cloudPersonId = String(data.data.personId);
              teamsSyncSuccess = true;

              // Concesión individual de nivel de acceso por persona
              if (cloudLevelIds.length > 0) {
                try {
                  await fetch(`${config.baseUrl}/hccgw/acspm/v1/accesslevel/person/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Token: token },
                    body: JSON.stringify({ personList: [{ personId: cloudPersonId, accessLevelIdList: cloudLevelIds }] }),
                  });
                } catch (lErr: any) {
                  console.warn('⚠️ Error vinculando nivel de acceso:', lErr.message);
                }
              }

              for (const niv of nivelesDeCuenta) {
                db.prepare('INSERT OR REPLACE INTO persona_autorizaciones_acceso (persona_id, nivel_id, fecha_inicio, fecha_fin, estado_sincronizacion) VALUES (?, ?, ?, ?, \'SINCRONIZADO\')').run(newPersonaId, niv.id, hoy.toISOString(), fechaFin.toISOString());
              }
            } else {
              teamsErrorMsg = `Teams (${data.errorCode}): ${data.message}`;
            }
          } catch (tErr: any) {
            console.warn('⚠️ Error al enrolar persona en Teams:', tErr.message);
            teamsErrorMsg = tErr.message;
          }
        }
      }

      if (cloudPersonId) {
        db.prepare('UPDATE personas SET hik_person_id = ? WHERE id = ?').run(cloudPersonId, newPersonaId);
      }
      db.exec('COMMIT');

      const created = db.prepare('SELECT * FROM personas WHERE id = ?').get(newPersonaId) as any;
      return {
        success: true,
        persona: created,
        teamsSynced: teamsSyncSuccess,
        teamsPersonId: cloudPersonId,
        teamsError: teamsErrorMsg,
      };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Actualiza la fecha de vigencia de una persona y sincroniza el hardware autónomo en Teams
   */
  public static async updatePersonVigencia(personaId: number, nuevaFechaFinStr: string) {
    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId) as any;
    if (!persona) throw new Error('Persona no encontrada');

    const dateOnly = nuevaFechaFinStr.split('T')[0];
    const pad = (n: number) => String(n).padStart(2, '0');
    const parts = dateOnly.split('-');
    const endDateIso = `${parts[0]}-${pad(Number(parts[1]))}-${pad(Number(parts[2]))}T23:59:59-06:00`;

    // 1. Actualizar membresía en base de datos local
    const mem = db.prepare('SELECT id FROM gym_membresias WHERE persona_id = ? AND activa = 1 LIMIT 1').get(personaId) as any;
    if (mem) {
      db.prepare(`
        UPDATE gym_membresias 
        SET fecha_fin = ?, estatus = 'VIGENTE', activa = 1 
        WHERE id = ?
      `).run(dateOnly, mem.id);
    } else {
      db.prepare(`
        INSERT INTO gym_membresias (persona_id, plan_id, fecha_inicio, fecha_fin, estatus, activa)
        VALUES (?, 1, DATE('now'), ?, 'VIGENTE', 1)
      `).run(personaId, dateOnly);
    }

    // 2. Si la persona existe en Teams, inyectar la fecha en el chip del checador
    let teamsOk = false;
    let teamsErr: string | null = null;

    if (persona.hik_person_id) {
      try {
        const config = HikConnectService.getConfig(1);
        const token = await HikConnectService.getAccessToken(1);

        const res = await fetch(`${config.baseUrl}/hccgw/person/v1/persons/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Token': token },
          body: JSON.stringify({
            personId: persona.hik_person_id,
            personCode: persona.codigo || `CX${persona.id}`,
            firstName: persona.nombre,
            lastName: persona.apellidos || '',
            gender: 1,
            groupId: '1',
            startDate: `${new Date().toISOString().split('T')[0]}T00:00:00-06:00`,
            endDate: endDateIso,
          }),
        });

        const data = await res.json();
        if (data.errorCode === '0') {
          teamsOk = true;
          console.log(`📡 Vigencia en hardware autónomo para ${persona.nombre} hasta: ${endDateIso}`);
        } else {
          teamsErr = data.message || `Error ${data.errorCode}`;
        }
      } catch (tErr: any) {
        teamsErr = tErr.message;
      }
    }
    return { success: true, fecha_fin: dateOnly, endDateIso, teamsSynced: teamsOk, teamsError: teamsErr };
  }
}
