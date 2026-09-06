import { Response } from 'express';

export interface AccessLiveEvent {
  id?: number;
  personaId?: number;
  personaNombre: string;
  personaFoto?: string | null;
  tipoEvento: 'CONCEDIDO' | 'DENEGADO_VENCIDO' | 'DENEGADO_HORARIO' | 'DENEGADO_DESCONOCIDO' | 'APERTURA_MANUAL' | 'ERROR';
  torniqueteId?: number;
  torniqueteNombre: string;
  direccion: 'ENTRADA' | 'SALIDA' | 'DESCONOCIDA';
  fechaHora: string;
  vigenciaFin?: string | null;
  diasRestantes?: number | null;
  fotoCapturaUrl?: string | null;
}

export class SseManager {
  private static clients: Set<Response> = new Set();

  /**
   * Registrar un cliente navegador en el flujo SSE
   */
  public static addClient(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    this.clients.add(res);
    console.log(`🔌 Cliente conectado al monitor SSE en vivo (Total activos: ${this.clients.size})`);

    // Enviar evento inicial de conexión
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Canal SSE activo', timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
      console.log(`🔌 Cliente desconectado del monitor SSE (Restantes: ${this.clients.size})`);
    });
  }

  /**
   * Transmitir un evento de acceso a todos los navegadores conectados en <100ms
   */
  public static broadcastEvent(event: AccessLiveEvent) {
    const payload = `data: ${JSON.stringify({ type: 'ACCESS_EVENT', ...event })}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Transmitir cambio de estatus de hardware/conexión a todos los navegadores conectados
   */
  public static broadcastStatus(status: any) {
    const payload = `data: ${JSON.stringify({ type: 'HARDWARE_STATUS', ...status })}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Enviar heartbeat periódico para mantener vivos los sockets
   */
  public static startHeartbeat() {
    const timer = setInterval(() => {
      const ping = `: heartbeat ${Date.now()}\n\n`;
      for (const client of this.clients) {
        try {
          client.write(ping);
        } catch {
          this.clients.delete(client);
        }
      }
    }, 15000);
    timer.unref();
  }
}

// Iniciar heartbeat
SseManager.startHeartbeat();
