import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { Login } from './login/login';
import { Mapa } from './mapa/mapa';

export const routes: Routes = [
  { path: '', redirectTo: '/mapa', pathMatch: 'full' },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard]
  },
  {
    path: 'mapa',
    component: Mapa,
    canActivate: [authGuard]
  },
  // {
  //   path: 'dashboard',
  //   component: Dashboard,
  //   canActivate: [authGuard]
  // },
  { path: '**', redirectTo: '/mapa' }
];
