import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthStore, User } from '../stores/auth.store';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  correo: string;
  clave: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    usuario: User;
    token: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);
  private readonly apiUrl = environment.apiUrl;

  login(credentials: LoginRequest): Observable<void> {
    this.authStore.setLoading(true);
    this.authStore.clearError();

    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.authStore.login(response.data.usuario, response.data.token);
          } else {
            throw new Error(response.message || 'Error en el login');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  logout(): void {
    this.authStore.logout();
  }

  initializeAuth(): void {
    this.authStore.initializeFromStorage();
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = error.error.message;
    } else {
      // Error del servidor
      if (error.status === 401) {
        errorMessage = 'Credenciales incorrectas';
      } else if (error.status === 0) {
        errorMessage = 'No se puede conectar con el servidor';
      } else {
        errorMessage = error.error?.message || `Error ${error.status}`;
      }
    }

    this.authStore.setError(errorMessage);
    this.authStore.setLoading(false);
    return throwError(() => new Error(errorMessage));
  }
}