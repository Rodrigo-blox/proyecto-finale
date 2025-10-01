import { CommonModule, DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CreateNAPData, NAPParaMapa, NAPService } from '../services/nap.service';
import { AuthStore } from '../stores/auth.store';
import { Layout } from '../components/layout/layout';
import { SidebarService } from '../services/sidebar.service';

declare const L: any; // Declaración temporal para Leaflet

@Component({
  selector: 'app-mapa',
  imports: [CommonModule, FormsModule, DecimalPipe, Layout],
  templateUrl: './mapa-new.html',
  styleUrl: './mapa.css'
})
export class Mapa implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly napService = inject(NAPService);
  readonly sidebarService = inject(SidebarService);
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map: any;
  private markers: any[] = [];
  private baseLayers: any = {};

  user = this.authStore.user;
  naps = signal<NAPParaMapa[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Permissions
  canCreateNAP = this.authStore.canCreateNAP;
  canUpdateNAP = this.authStore.canUpdateNAP;
  canViewStatistics = this.authStore.canViewStatistics;

  // Filtros
  filtroEstado = signal<string>('');
  busqueda = signal<string>('');

  // Estadísticas
  estadisticas = signal({
    activos: 0,
    mantenimiento: 0,
    fueraServicio: 0
  });

  // Creación y edición de NAPs
  mostrarFormulario = signal(false);
  editandoNAP = signal(false);
  napEditandoId = signal<string | null>(null);
  seleccionandoPunto = signal(false);
  coordenadasSeleccionadas = signal<{ lat: number; lng: number } | null>(null);

  // Formulario de NAP
  napForm = signal<CreateNAPData>({
    codigo: '',
    modelo: '',
    firmware: '',
    estado: 'ACTIVO',
    total_puertos: 48,
    ubicacion: '',
    latitud: 0,
    longitud: 0
  });

  ngOnInit() {
    // Cargar Leaflet CSS dinámicamente
    this.loadLeafletStyles();

    // Exponer métodos al objeto window para el popup
    (window as any).editarNAP = (napId: string) => {
      this.abrirFormularioEdicion(napId);
    };

    (window as any).copiarTexto = (texto: string, tipo: string) => {
      navigator.clipboard.writeText(texto).then(() => {
        console.log(`${tipo} copiado: ${texto}`);
      }).catch(err => {
        console.error('Error al copiar:', err);
      });
    };
  }

  ngAfterViewInit() {
    // Cargar Leaflet JS y inicializar el mapa
    this.loadLeafletAndInitializeMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private loadLeafletStyles() {
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }

  private loadLeafletAndInitializeMap() {
    // Verificar si Leaflet ya está cargado
    if (typeof L !== 'undefined') {
      this.initializeMap();
      return;
    }

    // Cargar Leaflet desde CDN si no está disponible
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      this.initializeMap();
    };
    document.head.appendChild(script);
  }

  private initializeMap() {
    // Coordenadas específicas solicitadas
    const centerCoordinates: [number, number] = [-21.53549, -64.72956];

    // Inicializar el mapa
    this.map = L.map(this.mapContainer.nativeElement, {
      center: centerCoordinates,
      zoom: 14.5, // Zoom nivel ciudad para ver bien la zona
      zoomControl: false // Desactivar controles de zoom por defecto
    });

    // Agregar controles de zoom en la esquina inferior derecha
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    // Definir múltiples capas de mapa
    this.baseLayers = {
      'Esri Streets': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri, HERE, Garmin, SafeGraph',
        maxZoom: 19
      }),
      'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
      }),
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }),
      'CartoDB Positron (Limpio)': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19
      }),
      'CartoDB Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        maxZoom: 19
      }),
      'Stamen Toner (Minimal)': L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png', {
        attribution: '© Stamen Design, © OpenStreetMap contributors',
        maxZoom: 19
      })
    };

    // Agregar la capa por defecto (CartoDB Positron - más limpia)
    this.baseLayers['Esri Streets'].addTo(this.map);

    // Agregar control de capas en la esquina superior derecha
    L.control.layers(this.baseLayers, null, {
      position: 'topright',
      collapsed: true
    }).addTo(this.map);

    // Agregar listener para selección de puntos
    this.map.on('click', (e: any) => {
      if (this.seleccionandoPunto()) {
        this.coordenadasSeleccionadas.set({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
        // Automáticamente usar las coordenadas seleccionadas
        this.usarCoordenadas();
      }
    });

    // Cargar NAPs del backend
    this.cargarNAPs();
  }

  private cargarNAPs() {
    this.isLoading.set(true);
    this.error.set(null);

    this.napService.obtenerNAPsParaMapa().subscribe({
      next: (response) => {
        if (response.success) {
          this.naps.set(response.data);
          this.actualizarEstadisticas(response.data);
          this.mostrarNAPsEnMapa(response.data);
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

  private mostrarNAPsEnMapa(naps: NAPParaMapa[]) {
    // Limpiar marcadores existentes
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];

    // Aplicar filtros
    const napsFiltrados = this.aplicarFiltros(naps);

    napsFiltrados.forEach(nap => {
      const icon = this.getIconByStatus(nap.estado);
      const coords: [number, number] = [nap.coordenadas.latitud, nap.coordenadas.longitud];

      const marker = L.marker(coords, { icon })
        .addTo(this.map)
        .bindPopup(`
          <div class="p-2 min-w-48 max-w-56">
            <!-- Header compacto -->
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-bold text-sm text-gray-900">${nap.codigo}</h3>
              <span class="px-2 py-1 text-xs rounded-full ${this.getStatusBadgeClass(nap.estado)}">${nap.estado}</span>
            </div>

            <!-- Botones de copiar -->
            <div class="grid grid-cols-2 gap-2 mb-2">
              <button
                onclick="window.copiarTexto('${nap.codigo}', 'Código')"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 px-2 rounded-md transition-colors flex items-center justify-center space-x-1"
                title="Copiar código"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <span>Código</span>
              </button>
              <button
                onclick="window.copiarTexto('${nap.modelo}', 'Modelo')"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 px-2 rounded-md transition-colors flex items-center justify-center space-x-1"
                title="Copiar modelo"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <span>Modelo</span>
              </button>
            </div>

            <!-- Info principal en grid compacto -->
            <div class="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <span class="text-gray-500">Modelo:</span>
                <div class="font-medium text-gray-800">${nap.modelo}</div>
              </div>
              <div>
                <span class="text-gray-500">Coords:</span>
                <div class="font-medium text-gray-800">${nap.coordenadas.latitud.toFixed(4)}, ${nap.coordenadas.longitud.toFixed(4)}</div>
              </div>
            </div>

            <!-- Ubicación -->
            <div class="mb-2">
              <span class="text-xs text-gray-500">📍</span>
              <span class="text-xs text-gray-700">${nap.ubicacion}</span>
            </div>

            <!-- Estadísticas en barra -->
            <div class="bg-gray-50 rounded p-2 mb-2">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-gray-600">Ocupación de Puertos</span>
                <span class="font-bold text-gray-800">${nap.estadisticas.porcentaje_ocupacion}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div class="bg-blue-500 h-2 rounded-full" style="width: ${nap.estadisticas.porcentaje_ocupacion}%"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-600">
                <span>🟢 ${nap.estadisticas.puertos_ocupados} ocupados</span>
                <span>⚪ ${nap.estadisticas.total_puertos - nap.estadisticas.puertos_ocupados} libres</span>
              </div>
            </div>

            <!-- Botón de editar -->
            ${this.canUpdateNAP() ? `
              <button
                onclick="window.editarNAP('${nap.id}')"
                class="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                <span>Editar NAP</span>
              </button>
            ` : ''}
          </div>
        `);

      this.markers.push(marker);
    });
  }

  private aplicarFiltros(naps: NAPParaMapa[]): NAPParaMapa[] {
    return naps.filter(nap => {
      const coincideEstado = !this.filtroEstado() || nap.estado === this.filtroEstado();
      const coincideBusqueda = !this.busqueda() ||
        nap.codigo.toLowerCase().includes(this.busqueda().toLowerCase()) ||
        nap.modelo.toLowerCase().includes(this.busqueda().toLowerCase()) ||
        nap.ubicacion.toLowerCase().includes(this.busqueda().toLowerCase());

      return coincideEstado && coincideBusqueda;
    });
  }

  private actualizarEstadisticas(naps: NAPParaMapa[]) {
    const stats = {
      activos: naps.filter(n => n.estado === 'ACTIVO').length,
      mantenimiento: naps.filter(n => n.estado === 'MANTENIMIENTO').length,
      fueraServicio: naps.filter(n => n.estado === 'FUERA_SERVICIO').length
    };
    this.estadisticas.set(stats);
  }

  private getIconByStatus(status: string) {
    let color: string;
    let icon: string;

    switch (status) {
      case 'ACTIVO':
        color = '#10b981'; // green-500
        icon = `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>`;
        break;
      case 'MANTENIMIENTO':
        color = '#f59e0b'; // amber-500
        icon = `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>`;
        break;
      case 'FUERA_SERVICIO':
        color = '#ef4444'; // red-500
        icon = `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>`;
        break;
      default:
        color = '#6b7280'; // gray-500
        icon = `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>`;
    }

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="relative">
          <div class="w-8 h-8 rounded-lg border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${color}">
            ${icon}
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-white shadow-lg" style="background-color: ${color}"></div>
        </div>
      `,
      iconSize: [32, 36],
      iconAnchor: [16, 36]
    });
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVO': return 'text-green-600';
      case 'MANTENIMIENTO': return 'text-orange-600';
      case 'FUERA_SERVICIO': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  private getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVO': return 'bg-green-100 text-green-800';
      case 'MANTENIMIENTO': return 'bg-orange-100 text-orange-800';
      case 'FUERA_SERVICIO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Métodos públicos para los filtros
  onFiltroEstadoChange(event: Event) {
    const estado = (event.target as HTMLSelectElement)?.value || '';
    this.filtroEstado.set(estado);
    this.aplicarFiltrosYActualizarMapa();
  }

  onBusquedaChange(event: Event) {
    const busqueda = (event.target as HTMLInputElement)?.value || '';
    this.busqueda.set(busqueda);
    this.aplicarFiltrosYActualizarMapa();
  }

  private aplicarFiltrosYActualizarMapa() {
    this.mostrarNAPsEnMapa(this.naps());
  }

  actualizarVista() {
    this.cargarNAPs();
  }

  limpiarFiltros() {
    this.filtroEstado.set('');
    this.busqueda.set('');
    this.aplicarFiltrosYActualizarMapa();
  }

  // Métodos para creación de NAPs
  mostrarFormularioCreacion() {
    this.mostrarFormulario.set(true);
    this.resetFormulario();
  }

  cerrarFormulario() {
    this.mostrarFormulario.set(false);
    this.editandoNAP.set(false);
    this.napEditandoId.set(null);
    this.seleccionandoPunto.set(false);
    this.coordenadasSeleccionadas.set(null);
    this.resetFormulario();
  }

  resetFormulario() {
    this.napForm.set({
      codigo: '',
      modelo: '',
      firmware: '',
      estado: 'ACTIVO',
      total_puertos: 48,
      ubicacion: '',
      latitud: 0,
      longitud: 0
    });
  }

  activarSeleccionPunto() {
    this.seleccionandoPunto.set(true);
    this.coordenadasSeleccionadas.set(null);
    // Cerrar temporalmente el formulario para permitir selección
    this.mostrarFormulario.set(false);
    // Cerrar todos los popups abiertos para dar libertad de selección
    this.map.closePopup();
    // Cambiar el cursor del mapa para indicar que se puede hacer clic
    if (this.map) {
      this.map.getContainer().style.cursor = 'crosshair';
    }
  }

  desactivarSeleccionPunto() {
    this.seleccionandoPunto.set(false);
    if (this.map) {
      this.map.getContainer().style.cursor = '';
    }
  }

  cancelarSeleccionPunto() {
    this.desactivarSeleccionPunto();
    this.coordenadasSeleccionadas.set(null);
    // Reabrir el formulario al cancelar la selección
    this.mostrarFormulario.set(true);
  }

  usarCoordenadas() {
    const coordenadas = this.coordenadasSeleccionadas();
    if (coordenadas) {
      const form = this.napForm();
      this.napForm.set({
        ...form,
        latitud: coordenadas.lat,
        longitud: coordenadas.lng
      });
      this.desactivarSeleccionPunto();
      // Reabrir el formulario después de seleccionar coordenadas
      this.mostrarFormulario.set(true);
    }
  }

  crearNAP() {
    const form = this.napForm();
    if (this.validarFormulario(form)) {
      this.isLoading.set(true);

      if (this.editandoNAP()) {
        // Actualizar NAP existente
        const napId = this.napEditandoId();
        if (napId) {
          this.napService.actualizarNAP(napId, form).subscribe({
            next: (response: any) => {
              if (response.success) {
                this.cerrarFormulario();
                this.cargarNAPs(); // Recargar la lista
                console.log('NAP actualizado exitosamente:', response.message);
              }
              this.isLoading.set(false);
            },
            error: (error: any) => {
              console.error('Error al actualizar NAP:', error);
              this.error.set('Error al actualizar el NAP');
              this.isLoading.set(false);
            }
          });
        }
      } else {
        // Crear nuevo NAP
        this.napService.crearNAP(form).subscribe({
          next: (response) => {
            if (response.success) {
              this.cerrarFormulario();
              this.cargarNAPs(); // Recargar la lista
              console.log('NAP creado exitosamente:', response.message);
            }
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error al crear NAP:', error);
            this.error.set('Error al crear el NAP');
            this.isLoading.set(false);
          }
        });
      }
    }
  }

  abrirFormularioEdicion(napId: string) {
    this.isLoading.set(true);
    this.napService.obtenerNAPPorId(napId).subscribe({
      next: (response) => {
        if (response.success) {
          const nap = response.data;
          this.napForm.set({
            codigo: nap.codigo,
            modelo: nap.modelo,
            firmware: nap.firmware,
            estado: nap.estado,
            total_puertos: nap.total_puertos,
            ubicacion: nap.ubicacion,
            latitud: parseFloat(nap.latitud),
            longitud: parseFloat(nap.longitud)
          });
          this.editandoNAP.set(true);
          this.napEditandoId.set(napId);
          this.mostrarFormulario.set(true);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar NAP:', error);
        this.error.set('Error al cargar el NAP para editar');
        this.isLoading.set(false);
      }
    });
  }

  private validarFormulario(form: CreateNAPData): boolean {
    return !!(form.codigo && form.modelo && form.firmware && form.ubicacion &&
              form.latitud !== 0 && form.longitud !== 0 && form.total_puertos > 0);
  }

  // Métodos para el formulario
  updateCodigo(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.napForm.update(form => ({ ...form, codigo: value }));
  }

  updateModelo(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.napForm.update(form => ({ ...form, modelo: value }));
  }

  updateFirmware(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.napForm.update(form => ({ ...form, firmware: value }));
  }

  updateEstado(event: Event) {
    const value = (event.target as HTMLSelectElement)?.value as 'ACTIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
    this.napForm.update(form => ({ ...form, estado: value }));
  }

  updateTotalPuertos(event: Event) {
    const value = +(event.target as HTMLInputElement)?.value || 0;
    this.napForm.update(form => ({ ...form, total_puertos: value }));
  }

  updateUbicacion(event: Event) {
    const value = (event.target as HTMLInputElement)?.value || '';
    this.napForm.update(form => ({ ...form, ubicacion: value }));
  }

  updateLatitud(event: Event) {
    const value = +(event.target as HTMLInputElement)?.value || 0;
    this.napForm.update(form => ({ ...form, latitud: value }));
  }

  updateLongitud(event: Event) {
    const value = +(event.target as HTMLInputElement)?.value || 0;
    this.napForm.update(form => ({ ...form, longitud: value }));
  }

  logout() {
    this.authService.logout();
  }
}