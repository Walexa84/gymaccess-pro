import { FichaService } from '../modules/iam/ficha.service.js';

export interface QueueStatus {
  isProcessing: boolean;
  pendingCount: number;
  totalEnqueued: number;
  completedCount: number;
  errorCount: number;
}

/**
 * AccessQueueService: Gestor de cola secuencial con limitador de tasa (Rate Limiting)
 * Garantiza que la API de Hik-Connect Teams nunca reciba ráfagas concurrentes ni sea bloqueada por 429 Too Many Requests.
 */
export class AccessQueueService {
  private static queue: number[] = [];
  private static isProcessing = false;
  private static totalEnqueued = 0;
  private static completedCount = 0;
  private static errorCount = 0;

  // Intervalo de seguridad entre llamadas a la OpenAPI (350ms = aprox 2.8 req/seg)
  private static readonly RATE_LIMIT_DELAY_MS = 350;

  /**
   * Encola una lista de IDs de personas para sincronizar con Teams de manera espaciada.
   */
  public static enqueuePersonas(personaIds: number[]): { enqueued: number; totalPending: number } {
    const validIds = personaIds.filter(id => typeof id === 'number' && id > 0);
    const uniqueIds = Array.from(new Set(validIds));

    let added = 0;
    for (const pid of uniqueIds) {
      if (!this.queue.includes(pid)) {
        this.queue.push(pid);
        added++;
        this.totalEnqueued++;
      }
    }

    console.log(`[AccessQueue] 📥 Encoladas ${added} personas. Total pendientes: ${this.queue.length}.`);

    if (!this.isProcessing && this.queue.length > 0) {
      this.processNext().catch(err => {
        console.error('[AccessQueue] ❌ Error fatal en cola:', err);
      });
    }

    return { enqueued: added, totalPending: this.queue.length };
  }

  /**
   * Procesa secuencialmente cada persona con retardo deliberado anti-rate-limit.
   */
  private static async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      console.log(`[AccessQueue] ✅ Cola de sincronización completada (${this.completedCount} éxitos, ${this.errorCount} errores).`);
      return;
    }

    this.isProcessing = true;
    const personaId = this.queue.shift()!;

    try {
      console.log(`[AccessQueue] 🔄 Sincronizando persona #${personaId} a Teams (${this.queue.length} restantes)...`);
      const result = await FichaService.sincronizarConChecador(personaId);
      if (result.success) {
        this.completedCount++;
      } else {
        this.errorCount++;
        console.warn(`[AccessQueue] ⚠️ Resultado con advertencia para #${personaId}:`, result.teamsError);
      }
    } catch (err: any) {
      this.errorCount++;
      console.error(`[AccessQueue] ❌ Error sincronizando #${personaId}:`, err.message);

      // Si es un rate limit detectado, pausar por 2.5 segundos de enfriamiento
      if (err.message && (err.message.includes('429') || err.message.includes('frecuencia') || err.message.includes('limit'))) {
        console.warn('[AccessQueue] ⏸️ Límite de tasa detectado. Pausando cola 2500ms...');
        await this.sleep(2500);
      }
    }

    // Retardo controlado antes de la siguiente llamada
    await this.sleep(this.RATE_LIMIT_DELAY_MS);

    // Recursión de la cola
    return this.processNext();
  }

  public static getStatus(): QueueStatus {
    return {
      isProcessing: this.isProcessing,
      pendingCount: this.queue.length,
      totalEnqueued: this.totalEnqueued,
      completedCount: this.completedCount,
      errorCount: this.errorCount,
    };
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
