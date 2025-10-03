import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.token();

  // Clonar la petición y agregar headers necesarios
  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Si hay token, agregar el header de autorización
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const clonedReq = req.clone({
    setHeaders: headers,
    withCredentials: true // Importante para CORS con credentials
  });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejar errores CORS y otros errores HTTP
      if (error.status === 0) {
        console.error('Error de conexión o CORS:', error);
      } else if (error.status === 401) {
        // Token inválido o expirado
        console.warn('Token inválido o expirado');
        authStore.logout();
      }
      return throwError(() => error);
    })
  );
};
