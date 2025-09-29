import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NAP {
  id: string;
  codigo: string;
  modelo: string;
  firmware: string;
  estado: 'ACTIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
  total_puertos: number;
  ubicacion: string;
  latitud: string;
  longitud: string;
  createdAt: string;
  updatedAt: string;
  puertos: Puerto[];
  estadisticas: {
    puertos_ocupados: number;
    puertos_libres: number;
    porcentaje_ocupacion: number;
  };
}

export interface Puerto {
  id: string;
  nap_id: string;
  numero: number;
  estado: 'LIBRE' | 'OCUPADO';
  nota: string | null;
  createdAt: string;
  updatedAt: string;
  conexion: any | null;
}

export interface NAPParaMapa {
  id: string;
  codigo: string;
  modelo: string;
  estado: 'ACTIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
  ubicacion: string;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  estadisticas: {
    total_puertos: number;
    puertos_ocupados: number;
    porcentaje_ocupacion: number;
  };
}

export interface NAPResponse {
  success: boolean;
  data: NAP[];
  meta: {
    total: number;
    pagina: number;
    limite: number;
    total_paginas: number;
  };
}

export interface NAPMapaResponse {
  success: boolean;
  data: NAPParaMapa[];
}

export interface NAPFiltros {
  estado?: 'ACTIVO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';
  busqueda?: string;
  limite?: number;
  pagina?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NAPService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api/v1';

  obtenerNAPs(filtros?: NAPFiltros): Observable<NAPResponse> {
    let params = new HttpParams();

    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }

    if (filtros?.busqueda) {
      params = params.set('busqueda', filtros.busqueda);
    }

    if (filtros?.limite) {
      params = params.set('limite', filtros.limite.toString());
    }

    if (filtros?.pagina) {
      params = params.set('pagina', filtros.pagina.toString());
    }

    return this.http.get<NAPResponse>(`${this.baseUrl}/naps`, { params });
  }

  obtenerNAPsParaMapa(): Observable<NAPMapaResponse> {
    return this.http.get<NAPMapaResponse>(`${this.baseUrl}/naps/mapa`);
  }

  obtenerNAPPorId(id: string): Observable<{ success: boolean; data: NAP }> {
    return this.http.get<{ success: boolean; data: NAP }>(`${this.baseUrl}/naps/${id}`);
  }
}