import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../../db/database.js';
import { SseManager, AccessLiveEvent } from './sse.manager.js';

export class IsapiListener {
  /**
   * Procesa la notificación HTTP Push entrante de una terminal checadora Hikvision
   * Endpoint: POST /api/access/events/isapi-listener
   */
  public static handleIncomingAlert(req: Request, res: Response) {
    try {
      const clientIp = req.ip?.replace(/^.*:/, '') || '127.0.0.1';
      const rawBody = req.body;

      // Extraer datos del evento (JSON o XML deserializado o texto)
      let eventData: any = null;
      let employeeNo: string | null = null;
      let minorType = 1;
      let doorNo = 1;

      if (typeof rawBody === 'object' && rawBody !== null) {
        eventData = rawBody.AccessControllerEvent || rawBody;
        employeeNo = eventData.employeeNoString || eventData.employeeNo || eventData.cardNo || null;
        minorType = Number(eventData.minor || eventData.subEventType || 1);
        doorNo = Number(eventData.doorNo || 1);
      } else if (typeof rawBody === 'string') {
        const empMatch = rawBody.match(/<employeeNoString>(.*?)<\/employeeNoString>/) || rawBody.match(/"employeeNoString":\s*"([^"]+)"/);
        const minorMatch = rawBody.match(/<minor>(.*?)<\/minor>/) || rawBody.match(/"minor":\s*(\d+)/);
        const doorMatch = rawBody.match(/<doorNo>(.*?)<\/doorNo>/) || rawBody.match(/"doorNo":\s*(\d+)/);

        if (empMatch) employeeNo = empMatch[1];
        if (minorMatch) minorType = parseInt(minorMatch[1], 10);
        if (doorMatch) doorNo = parseInt(doorMatch[1], 10);
      }

      // Buscar dispositivo por IP
      const disp = db.prepare(`SELECT * FROM dispositivos WHERE ip = ?`).get(clientIp) as any;

      // Buscar torniquete asociado al dispositivo y canal/puerta
      let torniquete = db.prepare(`
        SELECT * FROM torniquetes WHERE dispositivo_id = ? AND canal_relevador = ?
      `).get(disp?.id || 1, doorNo) as any;

      if (!torniquete) {
        torniquete = db.prepare(`SELECT * FROM torniquetes WHERE activo = 1 ORDER BY id ASC LIMIT 1`).get() as any;
      }

      // Determinar resultado del acceso según el minor type de Hikvision
      // 1: Acceso legal concedido
      // 75 (0x4B): Vigencia expirada
      // 38 (0x26): Fuera de horario
      // 37 (0x25): Sin permiso en esta puerta
      let tipoEvento: AccessLiveEvent['tipoEvento'] = 'CONCEDIDO';
      if (minorType === 75 || minorType === 0x4B) {
        tipoEvento = 'DENEGADO_VENCIDO';
      } else if (minorType === 38 || minorType === 0x26) {
        tipoEvento = 'DENEGADO_HORARIO';
      } else if (minorType === 37 || minorType === 0x25 || minorType === 8) {
        tipoEvento = 'DENEGADO_DESCONOCIDO';
      }

      // Buscar persona en base de datos
      let persona: any = null;
      if (employeeNo) {
        persona = db.prepare(`
          SELECT p.*, m.fecha_fin, m.estatus as membresia_estatus
          FROM personas p
          LEFT JOIN gym_membresias m ON m.persona_id = p.id AND m.activa = 1
          WHERE p.telefono = ? OR p.codigo = ? OR p.hik_person_id = ? OR p.id = ?
        `).get(employeeNo, employeeNo, employeeNo, Number(employeeNo) || 0) as any;
      }

      const personaNombre = persona ? `${persona.nombre} ${persona.apellidos || ''}`.trim() : (employeeNo ? `ID: ${employeeNo}` : 'Desconocido');
      const torniqueteNombre = torniquete?.nombre || 'Torniquete Principal';
      const direccion = (torniquete?.direccion || 'ENTRADA') as 'ENTRADA' | 'SALIDA';

      // Calcular días restantes si tiene membresía
      let diasRestantes: number | null = null;
      if (persona?.fecha_fin) {
        const diffMs = new Date(persona.fecha_fin).getTime() - Date.now();
        diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      // Guardar evento en base de datos
      const insertStmt = db.prepare(`
        INSERT INTO eventos_acceso (
          dispositivo_id, torniquete_id, persona_id, persona_nombre, persona_foto,
          tipo_evento, direccion, metodo_autenticacion, fecha_hora
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'FACIAL', CURRENT_TIMESTAMP)
      `);

      const info = insertStmt.run(
        disp?.id || null,
        torniquete?.id || null,
        persona?.id || null,
        personaNombre,
        persona?.foto_url || null,
        tipoEvento,
        direccion
      );

      // Transmitir inmediatamente vía SSE a la pantalla de recepción (<100ms)
      const liveEvent: AccessLiveEvent = {
        id: Number(info.lastInsertRowid),
        personaId: persona?.id,
        personaNombre,
        personaFoto: persona?.foto_url || null,
        tipoEvento,
        torniqueteId: torniquete?.id,
        torniqueteNombre,
        direccion,
        fechaHora: new Date().toISOString(),
        vigenciaFin: persona?.fecha_fin || null,
        diasRestantes,
      };

      SseManager.broadcastEvent(liveEvent);

      // Responder HTTP 200 a la terminal Hikvision
      res.status(200).send('<ResponseStatus version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><requestURL>/ISAPI/Event/notification/httpHosts/1</requestURL><statusCode>1</statusCode><statusString>OK</statusString></ResponseStatus>');
    } catch (err: any) {
      console.error('❌ Error en receptor ISAPI Listener:', err.message);
      res.status(500).send('Error');
    }
  }
}
