import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../stores/auth.store';

declare const L: any; // Declaración temporal para Leaflet

@Component({
  selector: 'app-mapa',
  imports: [],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css'
})
export class Mapa implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map: any;

  user = this.authStore.user;

  ngOnInit() {
    // Cargar Leaflet CSS dinámicamente
    this.loadLeafletStyles();
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
      zoom: 14.5 // Zoom nivel ciudad para ver bien la zona
    });

    // Agregar capa de tiles (mapa base)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Agregar marcador principal en las coordenadas especificadas
    L.marker(centerCoordinates)
      .addTo(this.map)
      .bindPopup('Ubicación Principal')
      .openPopup();

    // Agregar algunos marcadores de ejemplo para NAPs
    this.addSampleNaps();
  }

  private addSampleNaps() {
    // Datos de ejemplo de NAPs cerca de la ubicación central
    const sampleNaps = [
      {
        name: 'NAP Centro',
        coords: [-21.53549, -64.72956] as [number, number], // Ubicación central
        status: 'ACTIVO',
        connections: 45
      },
      {
        name: 'NAP Norte',
        coords: [-21.52549, -64.73456] as [number, number], // Norte de la zona
        status: 'ACTIVO',
        connections: 78
      },
      {
        name: 'NAP Sur',
        coords: [-21.54549, -64.72456] as [number, number], // Sur de la zona
        status: 'MANTENIMIENTO',
        connections: 32
      },
      {
        name: 'NAP Este',
        coords: [-21.53749, -64.71956] as [number, number], // Este de la zona
        status: 'ACTIVO',
        connections: 23
      },
      {
        name: 'NAP Oeste',
        coords: [-21.53349, -64.73956] as [number, number], // Oeste de la zona
        status: 'FUERA_SERVICIO',
        connections: 0
      }
    ];

    sampleNaps.forEach(nap => {
      const icon = this.getIconByStatus(nap.status);

      L.marker(nap.coords, { icon })
        .addTo(this.map)
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-lg">${nap.name}</h3>
            <p class="text-sm text-gray-600">Estado: <span class="font-medium ${nap.status === 'ACTIVO' ? 'text-green-600' : 'text-yellow-600'}">${nap.status}</span></p>
            <p class="text-sm text-gray-600">Conexiones: <span class="font-medium">${nap.connections}</span></p>
          </div>
        `);
    });
  }

  private getIconByStatus(status: string) {
    const color = status === 'ACTIVO' ? 'green' : status === 'MANTENIMIENTO' ? 'orange' : 'red';

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="w-6 h-6 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}">
          <div class="w-2 h-2 rounded-full bg-white m-1"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  logout() {
    this.authService.logout();
  }
}