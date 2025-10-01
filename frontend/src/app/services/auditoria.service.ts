import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FiltrosAuditoria {
  page?: number;
  limit?: number;
  tabla?: string;
  registro_id?: string;
  accion?: 'CREATE' | 'UPDATE' | 'DELETE';
  usuario_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface Auditoria {
  id: number;
  tabla: string;
  registro_id: string;
  accion: 'CREATE' | 'UPDATE' | 'DELETE';
  datos_anteriores: any;
  datos_nuevos: any;
  fecha: string;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: string;
  };
}

export interface EstadisticasAuditoria {
  total_cambios: number;
  por_accion: {
    CREATE: number;
    UPDATE: number;
    DELETE: number;
  };
  por_tabla: { [tabla: string]: number };
  por_usuario: Array<{
    usuario_id: string;
    nombre: string;
    correo: string;
    cantidad: number;
  }>;
}

export interface TablaAuditada {
  nombre: string;
  total_cambios: number;
  ultimo_cambio: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api/v1';

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  obtenerHistorialCambios(filtros: FiltrosAuditoria): Observable<{
    success: boolean;
    data: Auditoria[];
    pagination: {
      total: number;
      pages: number;
      currentPage: number;
      limit: number;
    };
  }> {
    let params = new HttpParams();

    if (filtros.page) params = params.set('page', filtros.page.toString());
    if (filtros.limit) params = params.set('limit', filtros.limit.toString());
    if (filtros.tabla) params = params.set('tabla', filtros.tabla);
    if (filtros.registro_id) params = params.set('registro_id', filtros.registro_id);
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.usuario_id) params = params.set('usuario_id', filtros.usuario_id);
    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);

    return this.http.get<{
      success: boolean;
      data: Auditoria[];
      pagination: {
        total: number;
        pages: number;
        currentPage: number;
        limit: number;
      };
    }>(`${this.baseUrl}/auditoria`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  obtenerEstadisticas(filtros?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    usuario_id?: string;
  }): Observable<{
    success: boolean;
    data: EstadisticasAuditoria;
  }> {
    let params = new HttpParams();

    if (filtros?.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros?.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros?.usuario_id) params = params.set('usuario_id', filtros.usuario_id);

    return this.http.get<{
      success: boolean;
      data: EstadisticasAuditoria;
    }>(`${this.baseUrl}/auditoria/estadisticas`, {
      headers: this.getAuthHeaders(),
      params
    });
  }

  obtenerTablasAuditadas(): Observable<{
    success: boolean;
    data: TablaAuditada[];
  }> {
    return this.http.get<{
      success: boolean;
      data: TablaAuditada[];
    }>(`${this.baseUrl}/auditoria/tablas`, {
      headers: this.getAuthHeaders()
    });
  }

  obtenerHistorialPorRegistro(tabla: string, registroId: string): Observable<{
    success: boolean;
    data: any[];
    total: number;
  }> {
    return this.http.get<{
      success: boolean;
      data: any[];
      total: number;
    }>(`${this.baseUrl}/auditoria/${tabla}/${registroId}`, {
      headers: this.getAuthHeaders()
    });
  }

  exportarAExcel(filtros: FiltrosAuditoria): Observable<void> {
    let params = new HttpParams();

    if (filtros.tabla) params = params.set('tabla', filtros.tabla);
    if (filtros.registro_id) params = params.set('registro_id', filtros.registro_id);
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.usuario_id) params = params.set('usuario_id', filtros.usuario_id);
    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);

    return new Observable(observer => {
      const token = localStorage.getItem('token');
      const url = `${this.baseUrl}/auditoria/exportar/excel?${params.toString()}`;

      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        const blob = new Blob([arrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `auditoria_${new Date().getTime()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        observer.next();
        observer.complete();
      })
      .catch(error => {
        console.error('Error al descargar Excel:', error);
        observer.error(error);
      });
    });
  }
}
