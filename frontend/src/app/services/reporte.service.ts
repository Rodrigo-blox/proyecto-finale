import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TipoReporte {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'Infraestructura' | 'Clientes' | 'Comercial';
  parametros: string[];
  formatos: string[];
}

export interface RespuestaTiposReporte {
  success: boolean;
  data: TipoReporte[];
}

export interface RespuestaReporte {
  success: boolean;
  tipo: string;
  fecha_generacion: string;
  parametros: any;
  data: any[];
  resumen: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reportes`;

  /**
   * Obtiene los tipos de reportes disponibles
   */
  obtenerTiposReporte(): Observable<RespuestaTiposReporte> {
    return this.http.get<RespuestaTiposReporte>(`${this.apiUrl}/tipos`);
  }

  /**
   * Genera un reporte según el tipo y parámetros
   */
  generarReporte(tipoReporte: string, parametros: any = {}): Observable<RespuestaReporte> {
    let params = new HttpParams();

    // Agregar parámetros a la query string
    Object.keys(parametros).forEach(key => {
      if (parametros[key] !== null && parametros[key] !== undefined && parametros[key] !== '') {
        params = params.set(key, parametros[key].toString());
      }
    });

    const endpoint = this.getEndpointPorTipo(tipoReporte);
    return this.http.get<RespuestaReporte>(`${this.apiUrl}/${endpoint}`, { params });
  }

  /**
   * Descarga un reporte en formato JSON
   */
  descargarJSON(tipoReporte: string, parametros: any = {}) {
    this.generarReporte(tipoReporte, parametros).subscribe({
      next: (response) => {
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        this.descargarArchivo(blob, `reporte_${tipoReporte}_${new Date().getTime()}.json`);
      },
      error: (error) => {
        console.error('Error al descargar reporte JSON:', error);
        alert('Error al descargar el reporte');
      }
    });
  }

  /**
   * Descarga un reporte en formato PDF
   */
  descargarPDF(tipoReporte: string, parametros: any = {}) {
    const params = { ...parametros, formato: 'pdf' };
    let queryParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams = queryParams.set(key, params[key].toString());
      }
    });

    const endpoint = this.getEndpointPorTipo(tipoReporte);
    const url = `${this.apiUrl}/${endpoint}?${queryParams.toString()}`;
    const token = localStorage.getItem('token');

    // Usar fetch para descargar el archivo binario
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .then(arrayBuffer => {
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      this.descargarArchivo(blob, `reporte_${tipoReporte}_${new Date().getTime()}.pdf`);
    })
    .catch(error => {
      console.error('Error al descargar PDF:', error);
      alert('Error al descargar el reporte PDF');
    });
  }

  /**
   * Descarga un reporte en formato Excel
   */
  descargarExcel(tipoReporte: string, parametros: any = {}) {
    const params = { ...parametros, formato: 'excel' };
    let queryParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams = queryParams.set(key, params[key].toString());
      }
    });

    const endpoint = this.getEndpointPorTipo(tipoReporte);
    const url = `${this.apiUrl}/${endpoint}?${queryParams.toString()}`;
    const token = localStorage.getItem('token');

    // Usar fetch para descargar el archivo binario
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .then(arrayBuffer => {
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      this.descargarArchivo(blob, `reporte_${tipoReporte}_${new Date().getTime()}.xlsx`);
    })
    .catch(error => {
      console.error('Error al descargar Excel:', error);
      alert('Error al descargar el reporte Excel');
    });
  }

  /**
   * Descarga un archivo (helper)
   */
  private descargarArchivo(blob: Blob, nombreArchivo: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Mapea el tipo de reporte al endpoint correspondiente
   */
  private getEndpointPorTipo(tipo: string): string {
    const endpoints: { [key: string]: string } = {
      'ocupacion': 'ocupacion',
      'consumo': 'consumo',
      'tecnico': 'tecnico',
      'planes-populares': 'planes-populares',
      'tendencias-planes': 'tendencias-planes',
      'analisis-velocidades': 'analisis-velocidades'
    };

    return endpoints[tipo] || tipo;
  }

  /**
   * Formatea una fecha para el formato YYYY-MM-DD
   */
  formatearFecha(fecha: Date | string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toISOString().split('T')[0];
  }
}
