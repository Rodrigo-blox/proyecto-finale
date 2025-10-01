import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAdmin()) {
    return true;
  }

  router.navigate(['/mapa']);
  return false;
};

export const adminOrSupervisorGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAdmin() || authStore.isSupervisor()) {
    return true;
  }

  router.navigate(['/mapa']);
  return false;
};

export const allRolesGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
