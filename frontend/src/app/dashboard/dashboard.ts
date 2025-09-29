import { Component, inject, OnInit } from '@angular/core';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);

  user = this.authStore.user;
  isAuthenticated = this.authStore.isAuthenticated;

  ngOnInit() {
    // El guard ya se encarga de verificar la autenticación
  }

  logout() {
    this.authService.logout();
  }
}
