import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { NAPService, NAPParaMapa } from '../services/nap.service';
import { AuthStore } from '../stores/auth.store';
import { Layout } from '../components/layout/layout';

@Component({
  selector: 'app-naps-lista',
  imports: [CommonModule, FormsModule, Layout],
  templateUrl: './naps-lista.html',
  styleUrl: './naps-lista.css'
})
export class NapsLista implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly napService = inject(NAPService);
  private readonly router = inject(Router);

  user = this.authStore.user;
  naps = signal<NAPParaMapa[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroEstado = signal<string>('');
  busqueda = signal<string>('');

  // Paginación
  paginaActual = signal(1);
  itemsPorPagina = 10;

  ngOnInit() {
    this.cargarNAPs();
  }

  private cargarNAPs() {
    this.isLoading.set(true);
    this.error.set(null);

    this.napService.obtenerNAPsParaMapa().subscribe({
      next: (response) => {
        if (response.success) {
          this.naps.set(response.data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar NAPs:', error);
        this.error.set('Error al cargar los NAPs');
        this.isLoading.set(false);
      }
    });
  }

  napsFiltrados(): NAPParaMapa[] {
    return this.naps().filter(nap => {
      const coincideEstado = !this.filtroEstado() || nap.estado === this.filtroEstado();
      const coincideBusqueda = !this.busqueda() ||
        nap.codigo.toLowerCase().includes(this.busqueda().toLowerCase()) ||
        nap.modelo.toLowerCase().includes(this.busqueda().toLowerCase()) ||
        nap.ubicacion.toLowerCase().includes(this.busqueda().toLowerCase());

      return coincideEstado && coincideBusqueda;
    });
  }

  napsPaginados(): NAPParaMapa[] {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.napsFiltrados().slice(inicio, fin);
  }

  totalPaginas(): number {
    return Math.ceil(this.napsFiltrados().length / this.itemsPorPagina);
  }

  get Math() {
    return Math;
  }

  onBusquedaChange(event: Event) {
    const busqueda = (event.target as HTMLInputElement)?.value || '';
    this.busqueda.set(busqueda);
    this.paginaActual.set(1);
  }

  onFiltroEstadoChange(event: Event) {
    const estado = (event.target as HTMLSelectElement)?.value || '';
    this.filtroEstado.set(estado);
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.filtroEstado.set('');
    this.busqueda.set('');
    this.paginaActual.set(1);
  }

  actualizarVista() {
    this.cargarNAPs();
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas()) {
      this.paginaActual.set(pagina);
    }
  }

  verDetalles(napId: string) {
    this.router.navigate(['/naps', napId]);
  }

  verEnMapa(nap: NAPParaMapa) {
    this.router.navigate(['/mapa'], {
      queryParams: {
        lat: nap.coordenadas.latitud,
        lng: nap.coordenadas.longitud,
        napId: nap.id
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'MANTENIMIENTO': return 'bg-orange-100 text-orange-800';
      case 'FUERA_SERVICIO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  copiarTexto(texto: string) {
    navigator.clipboard.writeText(texto).then(() => {
      console.log('Texto copiado:', texto);
    }).catch(err => {
      console.error('Error al copiar:', err);
    });
  }

  logout() {
    this.authService.logout();
  }
}
