import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Router } from '@angular/router';

export interface User {
  id: string;
  correo: string;
  nombre?: string;
  rol?: 'ADMIN' | 'SUPERVISOR' | 'TECNICO';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => !!store.token() && !!store.user()),
    isLoggedOut: computed(() => !store.token() || !store.user()),

    // Role checks
    isAdmin: computed(() => store.user()?.rol === 'ADMIN'),
    isSupervisor: computed(() => store.user()?.rol === 'SUPERVISOR'),
    isTecnico: computed(() => store.user()?.rol === 'TECNICO'),

    // Permission checks
    canManageUsers: computed(() => store.user()?.rol === 'ADMIN'),
    canViewAuditoria: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canGenerateReports: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canCreateNAP: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canDeleteNAP: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canUpdateNAP: computed(() => ['ADMIN', 'SUPERVISOR', 'TECNICO'].includes(store.user()?.rol || '')),
    canManageClients: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canViewClients: computed(() => !!store.user()?.rol),
    canManagePlanes: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canViewPlanes: computed(() => !!store.user()?.rol),
    canCreateConnections: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canFinalizeConnections: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
    canUpdateConnections: computed(() => ['ADMIN', 'SUPERVISOR', 'TECNICO'].includes(store.user()?.rol || '')),
    canEditPorts: computed(() => ['ADMIN', 'TECNICO'].includes(store.user()?.rol || '')),
    canViewPorts: computed(() => !!store.user()?.rol),
    canManageMaintenances: computed(() => ['ADMIN', 'TECNICO'].includes(store.user()?.rol || '')),
    canViewMaintenances: computed(() => !!store.user()?.rol),
    canViewStatistics: computed(() => ['ADMIN', 'SUPERVISOR'].includes(store.user()?.rol || '')),
  })),
  withMethods((store) => {
    const router = inject(Router);

    return {
      setLoading(isLoading: boolean) {
        patchState(store, { isLoading });
      },

      setError(error: string | null) {
        patchState(store, { error });
      },

      login(user: User, token: string) {
        patchState(store, {
          user,
          token,
          isLoading: false,
          error: null
        });
        // Guardar en localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },

      logout() {
        patchState(store, {
          user: null,
          token: null,
          isLoading: false,
          error: null
        });
        // Limpiar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate(['/login']);
      },

      initializeFromStorage() {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            patchState(store, { user, token });
          } catch (error) {
            this.logout();
          }
        }
      },

      clearError() {
        patchState(store, { error: null });
      }
    };
  })
);