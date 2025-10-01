import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: 'ADMIN' | 'TECNICO' | 'SUPERVISOR';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiltrosUsuarios {
  rol?: string;
  activo?: boolean;
  limite?: number;
  pagina?: number;
}

export interface RespuestaUsuarios {
  success: boolean;
  data: Usuario[];
  meta: {
    total: number;
    pagina: number;
    limite: number;
    total_paginas: number;
  };
}

export interface RespuestaUsuario {
  success: boolean;
  data: Usuario;
  message?: string;
}

export interface CrearUsuarioDto {
  nombre: string;
  correo: string;
  rol: 'ADMIN' | 'TECNICO' | 'SUPERVISOR';
  clave: string;
}

export interface ActualizarUsuarioDto {
  nombre?: string;
  correo?: string;
  rol?: 'ADMIN' | 'TECNICO' | 'SUPERVISOR';
  clave?: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  obtenerUsuarios(filtros: FiltrosUsuarios = {}): Observable<RespuestaUsuarios> {
    let params = new HttpParams();

    if (filtros.rol) {
      params = params.set('rol', filtros.rol);
    }

    if (filtros.activo !== undefined) {
      params = params.set('activo', filtros.activo.toString());
    }

    if (filtros.limite) {
      params = params.set('limite', filtros.limite.toString());
    }

    if (filtros.pagina) {
      params = params.set('pagina', filtros.pagina.toString());
    }

    return this.http.get<RespuestaUsuarios>(`${this.apiUrl}/findAll`, { params });
  }

  obtenerUsuarioPorId(id: string): Observable<RespuestaUsuario> {
    return this.http.get<RespuestaUsuario>(`${this.apiUrl}/${id}`);
  }

  crearUsuario(usuario: CrearUsuarioDto): Observable<RespuestaUsuario> {
    return this.http.post<RespuestaUsuario>(`${this.apiUrl}/create`, usuario);
  }

  actualizarUsuario(id: string, datos: ActualizarUsuarioDto): Observable<RespuestaUsuario> {
    return this.http.put<RespuestaUsuario>(`${this.apiUrl}/${id}`, datos);
  }

  desactivarUsuario(id: string): Observable<RespuestaUsuario> {
    return this.http.delete<RespuestaUsuario>(`${this.apiUrl}/${id}`);
  }

  activarUsuario(id: string): Observable<RespuestaUsuario> {
    return this.http.put<RespuestaUsuario>(`${this.apiUrl}/${id}`, { activo: true });
  }
}
