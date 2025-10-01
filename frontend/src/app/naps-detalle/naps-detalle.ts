import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { AuthService } from '../services/auth.service';
import { NAPService } from '../services/nap.service';
import { Plan, PuertoService } from '../services/puerto.service';
import { AuthStore } from '../stores/auth.store';

interface Puerto {
  id: string;
  numero: number;
  estado: 'LIBRE' | 'OCUPADO' | 'MANTENIMIENTO';
  nota?: string | null;
  conexion?: {
    id: string;
    fecha_inicio: string;
    fecha_fin?: string;
    estado: string;
    cliente?: {
      id: string;
      nombre: string;
      apellido: string;
      ci: string;
      telefono: string;
      correo?: string;
      direccion?: string;
    } | null;
    plan?: {
      id: string;
      nombre: string;
      velocidad_mbps: number;
    } | null;
  } | null;
}

interface NAPDetalle {
  id: string;
  codigo: string;
  modelo: string;
  firmware: string;
  estado: string;
  total_puertos: number;
  ubicacion: string;
  latitud: number;
  longitud: number;
  puertos: Puerto[];
}

@Component({
  selector: 'app-naps-detalle',
  imports: [CommonModule, FormsModule, Layout],
  templateUrl: './naps-detalle.html',
  styleUrl: './naps-detalle.css'
})
export class NapsDetalle implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly napService = inject(NAPService);
  private readonly puertoService = inject(PuertoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  user = this.authStore.user;
  nap = signal<NAPDetalle | null>(null);
  puertos = signal<Puerto[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroEstado = signal<string>('');
  busquedaCliente = signal<string>('');

  // Vista
  vistaGrid = signal(false); // true = grid, false = tabla

  // Modal para agregar cliente/plan
  mostrarModalAsignar = signal(false);
  puertoSeleccionado = signal<Puerto | null>(null);
  planes = signal<Plan[]>([]);

  // Modal de detalles
  mostrarModalDetalles = signal(false);
  planSeleccionado = signal<string>('');
  planOriginal = signal<string>('');
  estadoConexionSeleccionado = signal<string>('');
  estadoConexionOriginal = signal<string>('');

  // Formulario de asignación
  formAsignacion = signal({
    ci: '',
    nombre: '',
    apellido: '',
    telefono: '',
    correo: '',
    direccion: '',
    plan_id: '',
    fecha_inicio: '',
    estado_conexion: 'ACTIVA' as 'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA',
    nota: ''
  });

  // Ordenamiento de puertos
  ordenAscendente = signal(true);

  napId: string | null = null;

  ngOnInit() {
    this.napId = this.route.snapshot.paramMap.get('id');
    if (this.napId) {
      this.cargarDetallesNAP();
    } else {
      this.router.navigate(['/naps']);
    }
  }

  private cargarDetallesNAP() {
    if (!this.napId) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Cargar datos del NAP
    this.napService.obtenerNAPPorId(this.napId).subscribe({
      next: (response) => {
        if (response.success) {
          const napData = response.data;

          // Mapear los puertos del backend
          const puertos = napData.puertos || [];

          this.nap.set({
            ...napData,
            latitud: typeof napData.latitud === 'string' ? parseFloat(napData.latitud) : napData.latitud,
            longitud: typeof napData.longitud === 'string' ? parseFloat(napData.longitud) : napData.longitud,
            puertos: puertos
          });

          // Setear los puertos en el signal
          this.puertos.set(puertos);

          this.isLoading.set(false);
        }
      },
      error: (error) => {
        console.error('Error al cargar NAP:', error);
        this.error.set('Error al cargar los detalles del NAP');
        this.isLoading.set(false);
      }
    });
  }

  puertosFiltrados(): Puerto[] {
    const filtrados = this.puertos().filter(puerto => {
      const coincideEstado = !this.filtroEstado() || puerto.estado === this.filtroEstado();

      // Buscar en la información del cliente dentro de la conexión
      const cliente = puerto.conexion?.cliente;
      const coincideBusqueda = !this.busquedaCliente() ||
        (cliente &&
          (cliente.nombre.toLowerCase().includes(this.busquedaCliente().toLowerCase()) ||
           cliente.apellido.toLowerCase().includes(this.busquedaCliente().toLowerCase()) ||
           cliente.ci.includes(this.busquedaCliente()) ||
           (cliente.telefono && cliente.telefono.includes(this.busquedaCliente())) ||
           (cliente.correo && cliente.correo.toLowerCase().includes(this.busquedaCliente().toLowerCase())) ||
           (cliente.direccion && cliente.direccion.toLowerCase().includes(this.busquedaCliente().toLowerCase()))
          )
        );

      return coincideEstado && (this.busquedaCliente() ? coincideBusqueda : true);
    });

    // Ordenar por número de puerto
    return filtrados.sort((a, b) => {
      return this.ordenAscendente() ? a.numero - b.numero : b.numero - a.numero;
    });
  }

  estadisticas() {
    const total = this.puertos().length;
    console.log(this.puertos())
    const libres = this.puertos().filter(p => p.estado === 'LIBRE').length;
    const ocupados = this.puertos().filter(p => p.estado === 'OCUPADO').length;
    const mantenimiento = this.puertos().filter(p => p.estado === 'MANTENIMIENTO').length;
    const porcentajeOcupacion = total > 0 ? Math.round((ocupados / total) * 100) : 0;
    return {
      total,
      libres,
      ocupados,
      mantenimiento,
      porcentajeOcupacion
    };
  }

  onFiltroEstadoChange(event: Event) {
    const estado = (event.target as HTMLSelectElement)?.value || '';
    this.filtroEstado.set(estado);
  }

  onBusquedaClienteChange(event: Event) {
    const busqueda = (event.target as HTMLInputElement)?.value || '';
    this.busquedaCliente.set(busqueda);
  }

  limpiarFiltros() {
    this.filtroEstado.set('');
    this.busquedaCliente.set('');
  }

  cambiarVista(esGrid: boolean) {
    this.vistaGrid.set(esGrid);
  }

  getEstadoPuertoBadgeClass(estado: string): string {
    switch (estado) {
      case 'LIBRE': return 'bg-green-100 text-green-800';
      case 'OCUPADO': return 'bg-blue-100 text-blue-800';
      case 'DAÑADO': return 'bg-red-100 text-red-800';
      case 'RESERVADO': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getEstadoNAPBadgeClass(estado: string): string {
    switch (estado) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'MANTENIMIENTO': return 'bg-orange-100 text-orange-800';
      case 'FUERA_SERVICIO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  verEnMapa() {
    if (this.nap()) {
      this.router.navigate(['/mapa'], {
        queryParams: {
          lat: this.nap()!.latitud,
          lng: this.nap()!.longitud,
          napId: this.nap()!.id
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/naps']);
  }

  // Métodos para el modal de asignación
  abrirModalAsignar(puerto: Puerto) {
    this.puertoSeleccionado.set(puerto);
    this.cargarPlanes();
    // Resetear formulario
    this.formAsignacion.set({
      ci: '',
      nombre: '',
      apellido: '',
      telefono: '',
      correo: '',
      direccion: '',
      plan_id: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      estado_conexion: 'ACTIVA',
      nota: ''
    });
    this.mostrarModalAsignar.set(true);
  }

  cerrarModalAsignar() {
    this.mostrarModalAsignar.set(false);
    this.puertoSeleccionado.set(null);
  }

  cargarPlanes() {
    this.puertoService.obtenerPlanes().subscribe({
      next: (response) => {
        if (response.success) {
          this.planes.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error al cargar planes:', error);
      }
    });
  }

  asignarCliente(event: Event) {
    event.preventDefault();

    const puerto = this.puertoSeleccionado();
    if (!puerto) return;
    console.log(puerto)
    const form = this.formAsignacion();
    console.log(form);
    this.isLoading.set(true);
    this.error.set(null);
    this.puertoService.asignarClienteAPuerto(puerto.id, form).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Cliente asignado exitosamente:', response.message);
          this.cerrarModalAsignar();
          // Recargar los detalles del NAP para actualizar la vista
          this.cargarDetallesNAP();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al asignar cliente:', error);
        this.error.set(error.error?.message || 'Error al asignar cliente al puerto');
        this.isLoading.set(false);
      }
    });
  }

  updateFormField(field: string, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || '';
    this.formAsignacion.update(form => ({ ...form, [field]: value }));
  }

  // Método para cambiar el orden
  toggleOrdenamiento() {
    this.ordenAscendente.update(v => !v);
  }

  // Métodos para el modal de detalles
  abrirModalDetalles(puerto: Puerto) {
    this.puertoSeleccionado.set(puerto);
    this.cargarPlanes();

    // Establecer el plan seleccionado y original
    const planId = puerto.conexion?.plan?.id || '';
    this.planSeleccionado.set(planId);
    this.planOriginal.set(planId);

    // Establecer el estado de conexión seleccionado y original
    const estado = puerto.conexion?.estado || 'ACTIVA';
    this.estadoConexionSeleccionado.set(estado);
    this.estadoConexionOriginal.set(estado);

    this.mostrarModalDetalles.set(true);
    this.error.set(null);
  }

  cerrarModalDetalles() {
    this.mostrarModalDetalles.set(false);
    this.puertoSeleccionado.set(null);
    this.planSeleccionado.set('');
    this.planOriginal.set('');
    this.estadoConexionSeleccionado.set('');
    this.estadoConexionOriginal.set('');
    this.error.set(null);
  }

  planCambiado(): boolean {
    return this.planSeleccionado() !== this.planOriginal();
  }

  estadoConexionCambiado(): boolean {
    return this.estadoConexionSeleccionado() !== this.estadoConexionOriginal();
  }

  hayCambios(): boolean {
    return this.planCambiado() || this.estadoConexionCambiado();
  }

  onPlanChange(event: Event) {
    const planId = (event.target as HTMLSelectElement)?.value || '';
    this.planSeleccionado.set(planId);
  }

  onEstadoConexionChange(event: Event) {
    const estado = (event.target as HTMLSelectElement)?.value || '';
    this.estadoConexionSeleccionado.set(estado);
  }

  guardarCambios() {
    const puerto = this.puertoSeleccionado();
    if (!puerto || !puerto.conexion) return;

    if (!this.hayCambios()) {
      this.cerrarModalDetalles();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    const datosActualizacion: any = {};

    if (this.planCambiado()) {
      datosActualizacion.plan_id = this.planSeleccionado();
    }

    if (this.estadoConexionCambiado()) {
      datosActualizacion.estado = this.estadoConexionSeleccionado();
      // Si el estado cambia a FINALIZADA, agregar fecha_fin
      if (this.estadoConexionSeleccionado() === 'FINALIZADA') {
        datosActualizacion.fecha_fin = new Date().toISOString().split('T')[0];
      }
    }

    this.puertoService.actualizarConexion(puerto.conexion.id, datosActualizacion).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Conexión actualizada exitosamente');
          this.cerrarModalDetalles();
          this.cargarDetallesNAP();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al actualizar conexión:', error);
        this.error.set(error.error?.message || 'Error al actualizar la conexión');
        this.isLoading.set(false);
      }
    });
  }

  confirmarLiberarPuerto() {
    const confirmar = confirm('¿Está seguro que desea LIBERAR este puerto? Esta acción finalizará la conexión y liberará el puerto. El cliente permanecerá en la base de datos.');
    if (confirmar) {
      this.liberarPuerto();
    }
  }

  liberarPuerto() {
    const puerto = this.puertoSeleccionado();
    if (!puerto) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.puertoService.liberarPuerto(puerto.id).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Puerto liberado exitosamente');
          this.cerrarModalDetalles();
          this.cargarDetallesNAP();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al liberar puerto:', error);
        this.error.set(error.error?.message || 'Error al liberar el puerto');
        this.isLoading.set(false);
      }
    });
  }

  getEstadoConexionBadgeClass(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'bg-green-100 text-green-800';
      case 'SUSPENDIDA': return 'bg-yellow-100 text-yellow-800';
      case 'FINALIZADA': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  logout() {
    this.authService.logout();
  }
}
