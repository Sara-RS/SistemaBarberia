/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  ShieldCheck,
  LogIn,
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

interface AdminLoginModalState {
  username: string;
  password: string;
  showPassword: boolean;
  errorMsg: string;
}

/**
 * Modal de inicio de sesión OOP (Clase React) para acceder al Panel de Administración.
 */
export class AdminLoginModal extends BaseAppComponent<AdminLoginModalProps, AdminLoginModalState> {
  private usernameInputRef = React.createRef<HTMLInputElement>();

  constructor(props: AdminLoginModalProps) {
    super(props);
    this.state = {
      username: '',
      password: '',
      showPassword: false,
      errorMsg: '',
    };
  }

  public componentDidUpdate(prevProps: AdminLoginModalProps): void {
    if (!prevProps.isOpen && this.props.isOpen) {
      this.setState({
        username: '',
        password: '',
        showPassword: false,
        errorMsg: '',
      });
      window.setTimeout(() => this.usernameInputRef.current?.focus(), 80);
    }
  }

  private handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const { username, password } = this.state;
    const result = this.app.loginAdmin(username, password);

    if (result.success) {
      this.setState({ errorMsg: '', password: '' });
      this.props.onLoginSuccess();
      this.props.onClose();
    } else {
      this.setState({
        errorMsg: result.error || 'Credenciales incorrectas.',
      });
    }
  };

  public render(): React.ReactNode {
    const { isOpen, onClose } = this.props;
    const { username, password, showPassword, errorMsg } = this.state;
    const { companyInfo } = this.app;

    if (!isOpen) return null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <form
          onSubmit={this.handleSubmit}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-fadeIn"
        >
          <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

          <div className="p-6 space-y-5">
            {/* CABECERA */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E3354]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 flex items-center justify-center text-navy-800 dark:text-navy-200 shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2
                    id="admin-login-title"
                    className="font-extrabold text-slate-900 dark:text-white text-base leading-tight"
                  >
                    Acceso Administrador
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {companyInfo.name || 'Barbería "Josué"'} · Panel de Gestión
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ventana de inicio de sesión"
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#12233B] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* CAMPOS */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-username"
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block"
                >
                  Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={this.usernameInputRef}
                    id="admin-username"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={e => this.setState({ username: e.target.value, errorMsg: '' })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={e => this.setState({ password: e.target.value, errorMsg: '' })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 focus:bg-white dark:focus:bg-[#162B47] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => this.setState(prev => ({ showPassword: !prev.showPassword }))}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* ACCIONES */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#243D63] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#12233B] font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 px-4 rounded-xl bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-navy-900/20 transition-all cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-50 dark:bg-[#0A1526] border-t border-slate-200 dark:border-[#1E3354] flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300 shrink-0" />
            <span>Área exclusiva para administración, caja, inventario y personal.</span>
          </div>
        </form>
      </div>
    );
  }
}
