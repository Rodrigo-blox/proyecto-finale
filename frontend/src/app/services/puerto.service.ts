import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AsignarClienteData {
  ci: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  plan_id: string;
  fecha_inicio: string;
  estado_conexion?: 'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA';
  nota?: string;
}

export interface Plan {
  id: string;
  nombre: string;
  velocidad_mbps: number;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PuertoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api/v1';

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  asignarClienteAPuerto(puertoId: string, datos: AsignarClienteData): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.post<{ success: boolean; data: any; message: string }>(
      `${this.baseUrl}/puertos/${puertoId}/asignar-cliente`,
      datos,
      { headers: this.getAuthHeaders() }
    );
  }

  obtenerPlanes(): Observable<{ success: boolean; data: Plan[] }> {
    return this.http.get<{ success: boolean; data: Plan[] }>(
      `${this.baseUrl}/planes`,
      { headers: this.getAuthHeaders() }
    );
  }

  actualizarPuerto(puertoId: string, datos: { estado?: string; nota?: string }): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.put<{ success: boolean; data: any; message: string }>(
      `${this.baseUrl}/puertos/${puertoId}`,
      datos,
      { headers: this.getAuthHeaders() }
    );
  }

  liberarPuerto(puertoId: string): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.post<{ success: boolean; data: any; message: string }>(
      `${this.baseUrl}/puertos/${puertoId}/liberar`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  actualizarConexion(conexionId: string, datos: { plan_id?: string; estado?: string; fecha_fin?: string }): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.put<{ success: boolean; data: any; message: string }>(
      `${this.baseUrl}/conexiones/${conexionId}`,
      datos,
      { headers: this.getAuthHeaders() }
    );
  }

  eliminarCliente(clienteId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/clientes/${clienteId}`,
      { headers: this.getAuthHeaders() }
    );
  }
}
