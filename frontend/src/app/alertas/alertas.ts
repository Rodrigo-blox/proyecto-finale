import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { AlertaService, Alerta } from '../services/alerta.service';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule, Layout],
  templateUrl: './alertas.html',
  styleUrl: './alertas.css'
})
export class AlertasComponent implements OnInit, OnDestroy {
  private readonly alertaService = inject(AlertaService);
  private readonly router = inject(Router);

  // Señales del servicio
  alertas = this.alertaService.alertas;
  totalAlertas = this.alertaService.totalAlertas;
  alertasCriticas = this.alertaService.alertasCriticas;
  alertasAdvertencia = this.alertaService.alertasAdvertencia;

  // Filtros
  filtroNivel = signal<'TODAS' | 'CRITICO' | 'ADVERTENCIA' | 'INFO'>('TODAS');
  filtroTipo = signal<'TODAS' | Alerta['tipo']>('TODAS');
  busqueda = signal<string>('');

  // Alertas filtradas
  alertasFiltradas = computed(() => {
    let resultado = this.alertas();

    // Filtrar por nivel
    if (this.filtroNivel() !== 'TODAS') {
      resultado = resultado.filter(a => a.nivel === this.filtroNivel());
    }

    // Filtrar por tipo
    if (this.filtroTipo() !== 'TODAS') {
      resultado = resultado.filter(a => a.tipo === this.filtroTipo());
    }

    // Filtrar por búsqueda
    const busquedaTexto = this.busqueda().toLowerCase();
    if (busquedaTexto) {
      resultado = resultado.filter(a =>
        a.mensaje.toLowerCase().includes(busquedaTexto) ||
        a.detalle.toLowerCase().includes(busquedaTexto)
      );
    }

    return resultado;
  });

  ngOnInit() {
    // Iniciar polling al cargar la página
    this.alertaService.iniciarPolling(30000);
  }

  ngOnDestroy() {
    // Detener polling al salir de la página
    this.alertaService.detenerPolling();
  }

  irANAP(napId: string) {
    this.router.navigate(['/naps', napId]);
  }

  actualizarAlertas() {
    this.alertaService.actualizarAlertas();
  }

  limpiarFiltros() {
    this.filtroNivel.set('TODAS');
    this.filtroTipo.set('TODAS');
    this.busqueda.set('');
  }

  cambiarFiltroNivel(event: Event) {
    const valor = (event.target as HTMLSelectElement).value as any;
    this.filtroNivel.set(valor);
  }

  cambiarFiltroTipo(event: Event) {
    const valor = (event.target as HTMLSelectElement).value as any;
    this.filtroTipo.set(valor);
  }

  actualizarBusqueda(event: Event) {
    const valor = (event.target as HTMLInputElement).value;
    this.busqueda.set(valor);
  }

  getColorBadge(nivel: 'CRITICO' | 'ADVERTENCIA' | 'INFO'): string {
    return this.alertaService.getColorPorNivel(nivel);
  }

  getIcono(tipo: Alerta['tipo']): string {
    return this.alertaService.getIconoPorTipo(tipo);
  }

  getColorIcono(nivel: 'CRITICO' | 'ADVERTENCIA' | 'INFO'): string {
    switch (nivel) {
      case 'CRITICO': return 'text-red-600';
      case 'ADVERTENCIA': return 'text-yellow-600';
      case 'INFO': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  }

  getNombreTipo(tipo: Alerta['tipo']): string {
    switch (tipo) {
      case 'NAP_SATURADO': return 'NAP Saturado';
      case 'NAP_MANTENIMIENTO': return 'NAP en Mantenimiento';
      case 'NAP_PROXIMO_SATURACION': return 'NAP Próximo a Saturación';
      case 'MANTENIMIENTO_CORRECTIVO': return 'Mantenimiento Correctivo';
      default: return tipo;
    }
  }
}
