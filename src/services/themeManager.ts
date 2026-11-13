/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemeMode = 'light' | 'dark';

/**
 * Gestor orientado a objetos para la persistencia y sincronización del tema dual (Claro / Oscuro).
 */
export class ThemeManager {
  private readonly storageKey = 'barberia_theme_mode';

  public loadTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Fallback seguro si localStorage no está disponible
    }
    return 'light';
  }

  public applyTheme(mode: ThemeMode): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      root.style.colorScheme = mode;
    }

    try {
      localStorage.setItem(this.storageKey, mode);
    } catch {
      // Ignorar errores de almacenamiento restringido
    }
  }

  public getToggledTheme(current: ThemeMode): ThemeMode {
    return current === 'light' ? 'dark' : 'light';
  }
}

export const themeManager = new ThemeManager();
