import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { AuthService } from '../services/auth.service';
import { AuditoriaService, Auditoria, FiltrosAuditoria, EstadisticasAuditoria, TablaAuditada } from '../services/auditoria.service';
import { UsuarioService, Usuario } from '../services/usuario.service';
import { AuthStore } from '../stores/auth.store';

@Component({
  selector: 'app-auditoria',
  imports: [CommonModule, FormsModule, Layout],
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css'
})
export class AuditoriaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly auditoriaService = inject(AuditoriaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);

  user = this.authStore.user;
  auditorias = signal<Auditoria[]>([]);
  estadisticas = signal<EstadisticasAuditoria | null>(null);
  tablasAuditadas = signal<TablaAuditada[]>([]);
  usuarios = signal<Usuario[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  isExporting = signal(false);

  // Paginación
  paginaActual = signal(1);
  totalPaginas = signal(1);
  totalRegistros = signal(0);
  registrosPorPagina = signal(20);

  // Filtros
  filtros = signal<FiltrosAuditoria>({
    page: 1,
    limit: 20,
    tabla: '',
    accion: undefined,
    usuario_id: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  // Modal de detalles
  mostrarModalDetalles = signal(false);
  auditoriaSeleccionada = signal<Auditoria | null>(null);

  // Vista de estadísticas
  mostrarEstadisticas = signal(false);

  // Exponer Math para el template
  Math = Math;

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargarAuditorias();
    this.cargarTablasAuditadas();
    this.cargarEstadisticas();
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.usuarioService.obtenerUsuarios({ activo: true }).subscribe({
      next: (response) => {
        if (response.success) {
          this.usuarios.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
      }
    });
  }

  cargarAuditorias() {
    this.isLoading.set(true);
    this.error.set(null);

    const filtrosActuales = this.filtros();

    this.auditoriaService.obtenerHistorialCambios(filtrosActuales).subscribe({
      next: (response) => {
        if (response.success) {
          this.auditorias.set(response.data);
          this.paginaActual.set(response.pagination.currentPage);
          this.totalPaginas.set(response.pagination.pages);
          this.totalRegistros.set(response.pagination.total);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar auditorías:', error);
        this.error.set('Error al cargar el historial de cambios');
        this.isLoading.set(false);
      }
    });
  }

  cargarEstadisticas() {
    this.auditoriaService.obtenerEstadisticas().subscribe({
      next: (response) => {
        if (response.success) {
          this.estadisticas.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
      }
    });
  }

  cargarTablasAuditadas() {
    this.auditoriaService.obtenerTablasAuditadas().subscribe({
      next: (response) => {
        if (response.success) {
          this.tablasAuditadas.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error al cargar tablas auditadas:', error);
      }
    });
  }

  aplicarFiltros() {
    this.filtros.update(f => ({ ...f, page: 1 }));
    this.cargarAuditorias();
  }

  limpiarFiltros() {
    this.filtros.set({
      page: 1,
      limit: 20,
      tabla: '',
      accion: undefined,
      usuario_id: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
    this.cargarAuditorias();
  }

  cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.filtros.update(f => ({ ...f, page: pagina }));
    this.cargarAuditorias();
  }

  actualizarFiltro(campo: keyof FiltrosAuditoria, event: Event) {
    const valor = (event.target as HTMLInputElement | HTMLSelectElement)?.value || '';
    this.filtros.update(f => ({ ...f, [campo]: valor || undefined }));
  }

  verDetalles(auditoria: Auditoria) {
    this.auditoriaSeleccionada.set(auditoria);
    this.mostrarModalDetalles.set(true);
  }

  cerrarModal() {
    this.mostrarModalDetalles.set(false);
    this.auditoriaSeleccionada.set(null);
  }

  toggleEstadisticas() {
    this.mostrarEstadisticas.update(v => !v);
  }

  getAccionBadgeClass(accion: string): string {
    switch (accion) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getAccionIcon(accion: string): string {
    switch (accion) {
      case 'CREATE': return '＋';
      case 'UPDATE': return '✎';
      case 'DELETE': return '✕';
      default: return '?';
    }
  }

  getNombreTablaLegible(tabla: string): string {
    const nombres: { [key: string]: string } = {
      'naps': 'NAPs',
      'puertos': 'Puertos',
      'clientes': 'Clientes',
      'conexiones': 'Conexiones',
      'planes': 'Planes',
      'usuarios': 'Usuarios',
      'mantenimientos': 'Mantenimientos'
    };
    return nombres[tabla] || tabla;
  }

  obtenerCambiosFormateados(auditoria: Auditoria): string[] {
    const cambios: string[] = [];

    if (auditoria.accion === 'CREATE') {
      return ['Registro creado'];
    }

    if (auditoria.accion === 'DELETE') {
      return ['Registro eliminado'];
    }

    if (auditoria.accion === 'UPDATE' && auditoria.datos_nuevos) {
      Object.keys(auditoria.datos_nuevos).forEach(campo => {
        const valorAnterior = auditoria.datos_anteriores?.[campo];
        const valorNuevo = auditoria.datos_nuevos[campo];
        cambios.push(`${campo}: ${valorAnterior} → ${valorNuevo}`);
      });
    }

    return cambios.length > 0 ? cambios : ['Sin cambios detectados'];
  }

  exportarAExcel() {
    this.isExporting.set(true);

    const filtrosActuales = this.filtros();

    this.auditoriaService.exportarAExcel(filtrosActuales).subscribe({
      next: () => {
        this.isExporting.set(false);
      },
      error: (error) => {
        console.error('Error al exportar a Excel:', error);
        alert('Error al exportar el archivo Excel');
        this.isExporting.set(false);
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}
