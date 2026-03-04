import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Mantenimiento {
  id: string;
  nap_id: string;
  tipo: 'PREVENTIVO' | 'CORRECTIVO';
  descripcion: string;
  fecha: string;
  realizado_por: string;
  tecnico?: { id: string; nombre: string; correo: string };
}

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/mantenimientos`;

  obtenerPorNAP(napId: string): Observable<{ success: boolean; data: Mantenimiento[] }> {
    return this.http.get<{ success: boolean; data: Mantenimiento[] }>(
      `${this.apiUrl}/nap/${napId}?limite=50`
    );
  }

  crear(datos: { nap_id: string; tipo: 'PREVENTIVO' | 'CORRECTIVO'; descripcion: string; fecha: string }): Observable<{ success: boolean; message: string; data: Mantenimiento }> {
    return this.http.post<{ success: boolean; message: string; data: Mantenimiento }>(
      this.apiUrl, datos
    );
  }
}
