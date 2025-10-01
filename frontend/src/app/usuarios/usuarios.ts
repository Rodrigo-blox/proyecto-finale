import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Layout } from '../components/layout/layout';
import { AuthService } from '../services/auth.service';
import { UsuarioService, Usuario, FiltrosUsuarios } from '../services/usuario.service';
import { AuthStore } from '../stores/auth.store';
import { PasswordValidator, PasswordValidationResult } from '../utils/password-validator';

@Component({
  selector: 'app-usuarios',
  imports: [CommonModule, FormsModule, Layout],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class UsuariosComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);

  user = this.authStore.user;
  usuarios = signal<Usuario[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Paginación
  paginaActual = signal(1);
  totalPaginas = signal(1);
  totalRegistros = signal(0);
  registrosPorPagina = signal(10);

  // Filtros
  filtros = signal<FiltrosUsuarios>({
    pagina: 1,
    limite: 10,
    rol: undefined,
    activo: undefined
  });

  // Modal de crear/editar
  mostrarModal = signal(false);
  modoEdicion = signal(false);
  usuarioSeleccionado = signal<Usuario | null>(null);

  // Formulario
  formulario = signal({
    nombre: '',
    correo: '',
    rol: 'TECNICO' as 'ADMIN' | 'TECNICO' | 'SUPERVISOR',
    clave: '',
    activo: true
  });

  // Modal de confirmación
  mostrarModalConfirmacion = signal(false);
  accionConfirmacion = signal<'activar' | 'desactivar' | null>(null);
  usuarioParaConfirmar = signal<Usuario | null>(null);

  // Validación de contraseña
  passwordValidation = signal<PasswordValidationResult | null>(null);

  // Exponer clases para el template
  Math = Math;
  PasswordValidator = PasswordValidator;

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.isLoading.set(true);
    this.error.set(null);

    const filtrosActuales = this.filtros();

    this.usuarioService.obtenerUsuarios(filtrosActuales).subscribe({
      next: (response) => {
        if (response.success) {
          this.usuarios.set(response.data);
          this.paginaActual.set(response.meta.pagina);
          this.totalPaginas.set(response.meta.total_paginas);
          this.totalRegistros.set(response.meta.total);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.error.set('Error al cargar los usuarios');
        this.isLoading.set(false);
      }
    });
  }

  aplicarFiltros() {
    this.filtros.update(f => ({ ...f, pagina: 1 }));
    this.cargarUsuarios();
  }

  limpiarFiltros() {
    this.filtros.set({
      pagina: 1,
      limite: 10,
      rol: undefined,
      activo: undefined
    });
    this.cargarUsuarios();
  }

  cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.filtros.update(f => ({ ...f, pagina }));
    this.cargarUsuarios();
  }

  actualizarFiltro(campo: keyof FiltrosUsuarios, event: Event) {
    const valor = (event.target as HTMLInputElement | HTMLSelectElement)?.value || '';

    if (campo === 'activo') {
      const activoValor = valor === '' ? undefined : valor === 'true';
      this.filtros.update(f => ({ ...f, activo: activoValor }));
    } else {
      this.filtros.update(f => ({ ...f, [campo]: valor || undefined }));
    }
  }

  abrirModalCrear() {
    this.modoEdicion.set(false);
    this.usuarioSeleccionado.set(null);
    this.formulario.set({
      nombre: '',
      correo: '',
      rol: 'TECNICO',
      clave: '',
      activo: true
    });
    this.mostrarModal.set(true);
  }

  abrirModalEditar(usuario: Usuario) {
    this.modoEdicion.set(true);
    this.usuarioSeleccionado.set(usuario);
    this.formulario.set({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      clave: '',
      activo: usuario.activo
    });
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
    this.modoEdicion.set(false);
    this.usuarioSeleccionado.set(null);
  }

  onPasswordChange(event: Event) {
    const password = (event.target as HTMLInputElement).value;
    if (password) {
      const validation = PasswordValidator.validate(password);
      this.passwordValidation.set(validation);
    } else {
      this.passwordValidation.set(null);
    }
  }

  guardarUsuario() {
    const form = this.formulario();

    if (!form.nombre || !form.correo) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    // Validar contraseña si se proporcionó
    if (form.clave) {
      const validation = PasswordValidator.validate(form.clave);
      if (!validation.isValid) {
        alert('La contraseña no cumple con los requisitos de seguridad:\n\n' + validation.errors.join('\n'));
        return;
      }
    }

    if (this.modoEdicion()) {
      const id = this.usuarioSeleccionado()?.id;
      if (!id) return;

      const datos: any = {
        nombre: form.nombre,
        correo: form.correo,
        rol: form.rol,
        activo: form.activo
      };

      if (form.clave) {
        datos.clave = form.clave;
      }

      this.usuarioService.actualizarUsuario(id, datos).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarUsuarios();
            this.cerrarModal();
          }
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);
          alert('Error al actualizar usuario');
        }
      });
    } else {
      if (!form.clave) {
        alert('La contraseña es requerida para crear un usuario');
        return;
      }

      this.usuarioService.crearUsuario({
        nombre: form.nombre,
        correo: form.correo,
        rol: form.rol,
        clave: form.clave
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarUsuarios();
            this.cerrarModal();
          }
        },
        error: (error) => {
          console.error('Error al crear usuario:', error);
          alert('Error al crear usuario');
        }
      });
    }
  }

  confirmarCambioEstado(usuario: Usuario, accion: 'activar' | 'desactivar') {
    this.usuarioParaConfirmar.set(usuario);
    this.accionConfirmacion.set(accion);
    this.mostrarModalConfirmacion.set(true);
  }

  ejecutarCambioEstado() {
    const usuario = this.usuarioParaConfirmar();
    const accion = this.accionConfirmacion();

    if (!usuario || !accion) return;

    if (accion === 'desactivar') {
      this.usuarioService.desactivarUsuario(usuario.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarUsuarios();
            this.cerrarModalConfirmacion();
          }
        },
        error: (error) => {
          console.error('Error al desactivar usuario:', error);
          alert('Error al desactivar usuario');
        }
      });
    } else {
      this.usuarioService.activarUsuario(usuario.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarUsuarios();
            this.cerrarModalConfirmacion();
          }
        },
        error: (error) => {
          console.error('Error al activar usuario:', error);
          alert('Error al activar usuario');
        }
      });
    }
  }

  cerrarModalConfirmacion() {
    this.mostrarModalConfirmacion.set(false);
    this.accionConfirmacion.set(null);
    this.usuarioParaConfirmar.set(null);
  }

  getRolBadgeClass(rol: string): string {
    switch (rol) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'SUPERVISOR': return 'bg-blue-100 text-blue-800';
      case 'TECNICO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getEstadoBadgeClass(activo: boolean): string {
    return activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  logout() {
    this.authService.logout();
  }
}
