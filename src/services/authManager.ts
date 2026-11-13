/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Gestor OOP de autenticación administrativa para controlar el acceso al panel de administración.
 */
export class AuthManager {
  private static readonly STORAGE_KEY = 'barberia_josue_admin_auth_v1';
  private static readonly ADMIN_USERNAME = 'adminbarber';
  private static readonly ADMIN_PASSWORD = 'admin123barber';

  public isAuthenticated(): boolean {
    try {
      return sessionStorage.getItem(AuthManager.STORAGE_KEY) === 'authenticated';
    } catch {
      return false;
    }
  }

  public getAdminUsername(): string {
    return AuthManager.ADMIN_USERNAME;
  }

  public login(username: string, password: string): AuthResult {
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      return {
        success: false,
        error: 'Ingresa el nombre de usuario y la contraseña.',
      };
    }

    if (
      cleanUser === AuthManager.ADMIN_USERNAME &&
      password === AuthManager.ADMIN_PASSWORD
    ) {
      try {
        sessionStorage.setItem(AuthManager.STORAGE_KEY, 'authenticated');
      } catch {
        // Ignorar errores de almacenamiento en modo privado restringido
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.',
    };
  }

  public logout(): void {
    try {
      sessionStorage.removeItem(AuthManager.STORAGE_KEY);
    } catch {
      // Ignorar errores de almacenamiento
    }
  }
}

export const authManager = new AuthManager();
