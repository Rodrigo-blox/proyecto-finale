/**
 * Validador de contraseñas fuertes
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export class PasswordValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly REGEX_UPPERCASE = /[A-Z]/;
  private static readonly REGEX_LOWERCASE = /[a-z]/;
  private static readonly REGEX_NUMBER = /[0-9]/;
  private static readonly REGEX_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

  /**
   * Valida una contraseña según los criterios de seguridad
   */
  static validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    // Verificar longitud mínima
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Debe tener al menos ${this.MIN_LENGTH} caracteres`);
    }

    // Verificar mayúsculas
    if (!this.REGEX_UPPERCASE.test(password)) {
      errors.push('Debe contener al menos una letra mayúscula');
    }

    // Verificar minúsculas
    if (!this.REGEX_LOWERCASE.test(password)) {
      errors.push('Debe contener al menos una letra minúscula');
    }

    // Verificar números
    if (!this.REGEX_NUMBER.test(password)) {
      errors.push('Debe contener al menos un número');
    }

    // Verificar caracteres especiales
    if (!this.REGEX_SPECIAL.test(password)) {
      errors.push('Debe contener al menos un carácter especial (!@#$%^&*...)');
    }

    // Calcular fortaleza
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    const criteriaMet = 5 - errors.length;

    if (criteriaMet >= 5) {
      strength = 'strong';
    } else if (criteriaMet >= 3) {
      strength = 'medium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Obtiene el color para el indicador de fortaleza
   */
  static getStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
    }
  }

  /**
   * Obtiene el texto para el indicador de fortaleza
   */
  static getStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
      case 'weak': return 'Débil';
      case 'medium': return 'Media';
      case 'strong': return 'Fuerte';
    }
  }

  /**
   * Obtiene el porcentaje de fortaleza
   */
  static getStrengthPercentage(strength: 'weak' | 'medium' | 'strong'): number {
    switch (strength) {
      case 'weak': return 33;
      case 'medium': return 66;
      case 'strong': return 100;
    }
  }
}
