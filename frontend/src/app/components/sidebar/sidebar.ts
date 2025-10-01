import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AuthStore } from '../../stores/auth.store';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly sidebarService = inject(SidebarService);

  user = this.authStore.user;
  isCollapsed = this.sidebarService.isCollapsed;
  isMobileMenuOpen = signal(false);

  // Permissions
  canManageUsers = this.authStore.canManageUsers;
  canViewAuditoria = this.authStore.canViewAuditoria;
  canGenerateReports = this.authStore.canGenerateReports;

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(value => !value);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  logout() {
    this.authService.logout();
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }
}
