import { Routes } from '@angular/router';
import { AlertasComponent } from './alertas/alertas';
import { AuditoriaComponent } from './auditoria/auditoria';
import { authGuard, guestGuard } from './guards/auth.guard';
import { adminGuard, adminOrSupervisorGuard } from './guards/role.guard';
import { Login } from './login/login';
import { Mapa } from './mapa/mapa';
import { NapsDetalle } from './naps-detalle/naps-detalle';
import { NapsLista } from './naps-lista/naps-lista';
import { ReportesComponent } from './reportes/reportes';
import { UsuariosComponent } from './usuarios/usuarios';

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
  {
    path: 'naps',
    component: NapsLista,
    canActivate: [authGuard]
  },
  {
    path: 'naps/:id',
    component: NapsDetalle,
    canActivate: [authGuard]
  },
  {
    path: 'auditoria',
    component: AuditoriaComponent,
    canActivate: [authGuard, adminOrSupervisorGuard]
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'alertas',
    component: AlertasComponent,
    canActivate: [authGuard]
  },
  {
    path: 'reportes',
    component: ReportesComponent,
    canActivate: [authGuard, adminOrSupervisorGuard]
  },
  // {
  //   path: 'dashboard',
  //   component: Dashboard,
  //   canActivate: [authGuard]
  // },
  { path: '**', redirectTo: '/mapa' }
];
