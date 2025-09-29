import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../stores/auth.store';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  correo = '';
  clave = '';

  // Computed signals from store
  isLoading = this.authStore.isLoading;
  error = this.authStore.error;
  isAuthenticated = this.authStore.isAuthenticated;

  ngOnInit() {
    // El guard ya se encarga de verificar la autenticación
  }

  onSubmit() {
    if (this.correo && this.clave) {
      this.authService.login({
        correo: this.correo,
        clave: this.clave
      }).subscribe({
        next: () => {
          this.router.navigate(['/mapa']);
        },
        error: (error) => {
          console.error('Login error:', error);
          // El error ya se maneja en el store
        }
      });
    }
  }

  clearError() {
    this.authStore.clearError();
  }
}
