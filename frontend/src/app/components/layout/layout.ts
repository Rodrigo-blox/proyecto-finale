import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { NotificacionesComponent } from '../notificaciones/notificaciones';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, Sidebar, NotificacionesComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex">
      <app-sidebar />

      <!-- Main Content Area with independent scroll -->
      <main
        [ngClass]="{
          'lg:ml-64': !sidebarService.isCollapsed(),
          'lg:ml-20': sidebarService.isCollapsed()
        }"
        class="flex-1 transition-all duration-300 overflow-y-auto h-screen"
      >
        <!-- Header con barra de búsqueda y notificaciones -->
        <div class="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <!-- Slot para barra de búsqueda (izquierda) -->
            <div class="flex-1">
              <ng-content select="[header-search]"></ng-content>
            </div>

            <!-- Notificaciones (derecha) -->
            <div class="flex-shrink-0">
              <app-notificaciones />
            </div>
          </div>
        </div>

        <!-- Contenido principal -->
        <ng-content></ng-content>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class Layout {
  readonly sidebarService = inject(SidebarService);
}
