import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AlertaService, Alerta } from '../../services/alerta.service';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.html',
  styleUrl: './notificaciones.css'
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private readonly alertaService = inject(AlertaService);
  private readonly router = inject(Router);

  // Señales del servicio
  alertas = this.alertaService.alertas;
  totalAlertas = this.alertaService.totalAlertas;
  alertasCriticas = this.alertaService.alertasCriticas;

  // Estado local
  mostrarDropdown = signal(false);
  mostrarSoloNoLeidas = signal(true);

  ngOnInit() {
    // Iniciar polling al cargar el componente
    this.alertaService.iniciarPolling(30000); // Cada 30 segundos
  }

  ngOnDestroy() {
    // Detener polling al destruir el componente
    this.alertaService.detenerPolling();
  }

  toggleDropdown() {
    this.mostrarDropdown.update(v => !v);
  }

  cerrarDropdown() {
    this.mostrarDropdown.set(false);
  }

  irAAlerta(alerta: Alerta) {
    // Navegar al NAP relacionado
    this.router.navigate(['/naps', alerta.nap_id]);
    this.cerrarDropdown();
  }

  verTodasLasAlertas() {
    this.router.navigate(['/alertas']);
    this.cerrarDropdown();
  }

  getColorBadge(nivel: 'CRITICO' | 'ADVERTENCIA' | 'INFO'): string {
    return this.alertaService.getColorPorNivel(nivel);
  }

  getIcono(tipo: Alerta['tipo']): string {
    return this.alertaService.getIconoPorTipo(tipo);
  }

  getAlertasRecientes(): Alerta[] {
    // Mostrar solo las últimas 5 alertas
    return this.alertas().slice(0, 5);
  }

  actualizarAlertas() {
    this.alertaService.actualizarAlertas();
  }
}
