import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, switchMap, startWith, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Alerta {
  tipo: 'NAP_SATURADO' | 'NAP_MANTENIMIENTO' | 'NAP_PROXIMO_SATURACION' | 'MANTENIMIENTO_CORRECTIVO';
  nivel: 'CRITICO' | 'ADVERTENCIA' | 'INFO';
  mensaje: string;
  detalle: string;
  nap_id: string;
  fecha: string;
}

export interface RespuestaAlertas {
  success: boolean;
  data: Alerta[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  // Señales reactivas
  alertas = signal<Alerta[]>([]);
  totalAlertas = signal<number>(0);
  alertasCriticas = signal<number>(0);
  alertasAdvertencia = signal<number>(0);
  isPolling = signal<boolean>(false);

  // Intervalo de polling (30 segundos por defecto)
  private pollingInterval = 30000;
  private pollingSubscription: any = null;

  /**
   * Obtiene las alertas del servidor
   */
  obtenerAlertas() {
    return this.http.get<RespuestaAlertas>(`${this.apiUrl}/alertas`);
  }

  /**
   * Actualiza las alertas manualmente
   */
  actualizarAlertas() {
    this.obtenerAlertas().subscribe({
      next: (response) => {
        if (response.success) {
          this.alertas.set(response.data);
          this.totalAlertas.set(response.total);

          // Calcular alertas por nivel
          const criticas = response.data.filter(a => a.nivel === 'CRITICO').length;
          const advertencias = response.data.filter(a => a.nivel === 'ADVERTENCIA').length;

          this.alertasCriticas.set(criticas);
          this.alertasAdvertencia.set(advertencias);
        }
      },
      error: (error) => {
        console.error('Error al obtener alertas:', error);
      }
    });
  }

  /**
   * Inicia el polling automático de alertas
   */
  iniciarPolling(intervalo: number = this.pollingInterval) {
    if (this.isPolling()) {
      return; // Ya está en polling
    }

    this.isPolling.set(true);
    this.pollingInterval = intervalo;

    // Usar RxJS interval para polling
    this.pollingSubscription = interval(intervalo)
      .pipe(
        startWith(0), // Ejecutar inmediatamente
        switchMap(() => this.obtenerAlertas()),
        catchError(error => {
          console.error('Error en polling de alertas:', error);
          return of({ success: false, data: [], total: 0 } as RespuestaAlertas);
        })
      )
      .subscribe(response => {
        if (response.success) {
          this.alertas.set(response.data);
          this.totalAlertas.set(response.total);

          const criticas = response.data.filter(a => a.nivel === 'CRITICO').length;
          const advertencias = response.data.filter(a => a.nivel === 'ADVERTENCIA').length;

          this.alertasCriticas.set(criticas);
          this.alertasAdvertencia.set(advertencias);
        }
      });
  }

  /**
   * Detiene el polling de alertas
   */
  detenerPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    this.isPolling.set(false);
  }

  /**
   * Filtra alertas por nivel
   */
  obtenerAlertasPorNivel(nivel: 'CRITICO' | 'ADVERTENCIA' | 'INFO'): Alerta[] {
    return this.alertas().filter(a => a.nivel === nivel);
  }

  /**
   * Filtra alertas por tipo
   */
  obtenerAlertasPorTipo(tipo: Alerta['tipo']): Alerta[] {
    return this.alertas().filter(a => a.tipo === tipo);
  }

  /**
   * Obtiene el color del badge según el nivel
   */
  getColorPorNivel(nivel: 'CRITICO' | 'ADVERTENCIA' | 'INFO'): string {
    switch (nivel) {
      case 'CRITICO': return 'bg-red-100 text-red-800';
      case 'ADVERTENCIA': return 'bg-yellow-100 text-yellow-800';
      case 'INFO': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtiene el ícono según el tipo de alerta
   */
  getIconoPorTipo(tipo: Alerta['tipo']): string {
    switch (tipo) {
      case 'NAP_SATURADO': return '⚠️';
      case 'NAP_MANTENIMIENTO': return '🔧';
      case 'NAP_PROXIMO_SATURACION': return '⚡';
      case 'MANTENIMIENTO_CORRECTIVO': return 'ℹ️';
      default: return '📢';
    }
  }
}
