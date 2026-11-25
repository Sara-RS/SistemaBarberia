/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuthResult {
  success: boolean;
  username?: string;
  error?: string;
  captchaError?: boolean;
}

export interface CaptchaChallenge {
  captchaId: string;
  imageDataUrl: string;
  expiresInSeconds: number;
}

/**
 * Gestor OOP de autenticación administrativa con verificación CAPTCHA.
 * Verifica credenciales y CAPTCHA en el servidor y mantiene el token Bearer únicamente en memoria JS.
 */
export class AuthManager {
  private bearerToken: string | null = null;
  private authenticatedUsername: string | null = null;

  public isAuthenticated(): boolean {
    return Boolean(this.bearerToken);
  }

  public getToken(): string | null {
    return this.bearerToken;
  }

  public getAuthHeaders(): Record<string, string> {
    if (!this.bearerToken) return {};
    return {
      Authorization: `Bearer ${this.bearerToken}`,
    };
  }

  public getAdminUsername(): string {
    return this.authenticatedUsername || 'adminbarber';
  }

  public async fetchCaptcha(): Promise<CaptchaChallenge> {
    const response = await fetch('/api/auth/captcha', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('No se pudo cargar el código CAPTCHA.');
    }

    return response.json();
  }

  public async login(
    username: string,
    password: string,
    captchaId: string,
    captchaAnswer: string
  ): Promise<AuthResult> {
    const cleanUser = username.trim();
    const cleanCaptcha = captchaAnswer.trim();

    if (!cleanUser || !password) {
      return {
        success: false,
        error: 'Ingresa el nombre de usuario y la contraseña.',
      };
    }

    if (!captchaId || !cleanCaptcha) {
      return {
        success: false,
        captchaError: true,
        error: 'Ingresa el código CAPTCHA de verificación.',
      };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUser,
          password,
          captchaId,
          captchaAnswer: cleanCaptcha,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.token) {
        this.bearerToken = null;
        this.authenticatedUsername = null;
        return {
          success: false,
          captchaError: Boolean(data?.captchaError),
          error: data?.error || 'Credenciales incorrectas. Verifica tu usuario y contraseña.',
        };
      }

      this.bearerToken = String(data.token);
      this.authenticatedUsername = String(data.username || cleanUser);

      return {
        success: true,
        username: this.authenticatedUsername,
      };
    } catch {
      return {
        success: false,
        error: 'No se pudo conectar con el servidor de autenticación.',
      };
    }
  }

  public async logout(): Promise<void> {
    const headers = this.getAuthHeaders();
    this.bearerToken = null;
    this.authenticatedUsername = null;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
      });
    } catch {
      // Ignorar fallos de red al cerrar sesión
    }
  }
}

export const authManager = new AuthManager();
