/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ChatMessageModel, chatbotService } from '../../services/chatbotService';
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Scissors,
  Loader2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Formateador OOP para convertir texto plano/markdown básico de respuestas del chatbot
 * en nodos React seguros y legibles (negritas y listas).
 */
class ChatTextRenderer {
  public static renderFormattedText(text: string): React.ReactNode {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed">
        {lines.map((rawLine, lineIdx) => {
          const trimmed = rawLine.trim();
          if (!trimmed) {
            return <div key={`sp-${lineIdx}`} className="h-1" />;
          }

          const isBullet = /^[-*•]\s+/.test(trimmed);
          const cleanLine = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : trimmed;
          const inlineNodes = ChatTextRenderer.renderInlineSegments(cleanLine, lineIdx);

          if (isBullet) {
            return (
              <div key={`li-${lineIdx}`} className="flex items-start gap-2 pl-1">
                <span className="text-navy-700 dark:text-navy-300 font-bold select-none mt-0.5">•</span>
                <span className="flex-1">{inlineNodes}</span>
              </div>
            );
          }

          return (
            <p key={`p-${lineIdx}`} className="break-words">
              {inlineNodes}
            </p>
          );
        })}
      </div>
    );
  }

  private static renderInlineSegments(line: string, lineIdx: number): React.ReactNode[] {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={`b-${lineIdx}-${idx}`} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={`t-${lineIdx}-${idx}`}>{part}</React.Fragment>;
    });
  }
}

interface BarbershopChatbotProps {
  onNavigateToBooking?: () => void;
}

interface BarbershopChatbotState {
  isOpen: boolean;
  inputValue: string;
  messages: ChatMessageModel[];
  isLoading: boolean;
  lastFailedPrompt: string | null;
}

/**
 * Componente OOP (Clase React) del Chatbot de Atención y Consultas de Barbería.
 */
export class BarbershopChatbot extends BaseAppComponent<BarbershopChatbotProps, BarbershopChatbotState> {
  private messagesEndRef = React.createRef<HTMLDivElement>();
  private inputRef = React.createRef<HTMLTextAreaElement>();

  constructor(props: BarbershopChatbotProps) {
    super(props);
    this.state = {
      isOpen: false,
      inputValue: '',
      messages: [],
      isLoading: false,
      lastFailedPrompt: null,
    };
  }

  public componentDidMount(): void {
    const initialMessages = chatbotService.loadMessages(this.app.companyInfo.name);
    this.setState({ messages: initialMessages });
  }

  public componentDidUpdate(
    _prevProps: BarbershopChatbotProps,
    prevState: BarbershopChatbotState
  ): void {
    if (prevState.messages !== this.state.messages && this.state.messages.length > 0) {
      chatbotService.saveMessages(this.state.messages);
      this.scrollToBottom();
    }
    if (!prevState.isOpen && this.state.isOpen) {
      this.scrollToBottom();
      window.setTimeout(() => this.inputRef.current?.focus(), 120);
    }
  }

  private scrollToBottom = (): void => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  private handleToggleOpen = (): void => {
    this.setState(prev => ({ isOpen: !prev.isOpen }));
  };

  private handleClearChat = (): void => {
    if (this.state.isLoading) return;
    const resetMessages = chatbotService.clearMessages(this.app.companyInfo.name);
    this.setState({
      messages: resetMessages,
      lastFailedPrompt: null,
      inputValue: '',
    });
  };

  private handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void this.submitPrompt(this.state.inputValue);
  };

  private handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void this.submitPrompt(this.state.inputValue);
    }
  };

  private submitPrompt = async (rawText: string): Promise<void> => {
    const trimmed = rawText.trim();
    if (!trimmed || this.state.isLoading) return;

    const userMsg = new ChatMessageModel({
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: chatbotService.formatCurrentTime(),
    });

    const historySnapshot = [...this.state.messages];

    this.setState(prev => ({
      messages: [...prev.messages, userMsg],
      inputValue: '',
      isLoading: true,
      lastFailedPrompt: null,
    }));

    try {
      const replyText = await chatbotService.sendMessage(trimmed, historySnapshot, this.app);
      const botMsg = new ChatMessageModel({
        id: `msg-bot-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: chatbotService.formatCurrentTime(),
      });

      this.setState(prev => ({
        messages: [...prev.messages, botMsg],
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMsg = new ChatMessageModel({
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: error?.message || 'No pudimos responder tu consulta en este momento.',
        timestamp: chatbotService.formatCurrentTime(),
        isError: true,
      });

      this.setState(prev => ({
        messages: [...prev.messages, errorMsg],
        isLoading: false,
        lastFailedPrompt: trimmed,
      }));
    }
  };

  private handleRetry = (): void => {
    const { lastFailedPrompt, isLoading } = this.state;
    if (!lastFailedPrompt || isLoading) return;

    this.setState(
      prev => ({
        messages: prev.messages.filter(m => !m.isError),
        lastFailedPrompt: null,
      }),
      () => {
        void this.submitPrompt(lastFailedPrompt);
      }
    );
  };

  public render(): React.ReactNode {
    const { companyInfo, currentRole } = this.app;
    const { isOpen, inputValue, messages, isLoading, lastFailedPrompt } = this.state;
    const { onNavigateToBooking } = this.props;

    return (
      <>
        {/* PANEL FLOTANTE DEL CHATBOT */}
        <AnimatePresence>
          {isOpen && (
            <motion.section
              aria-label="Asistente virtual de la barbería"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[540px] max-h-[80vh] bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* CABECERA AZUL MARINO */}
              <div className="bg-navy-900 dark:bg-[#0A1526] border-b border-navy-800 dark:border-[#1E3354] px-4 py-3.5 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-navy-700 dark:bg-navy-600 border border-navy-500/40 flex items-center justify-center text-white shrink-0">
                    <Scissors className="w-4 h-4 stroke-[2.3]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white truncate leading-tight">
                      Asistente · {companyInfo.name || 'Barbería "Josué"'}
                    </h2>
                    <p className="text-[11px] text-navy-200 dark:text-slate-400 truncate mt-0.5">
                      Dudas sobre atención, precios y horarios
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={this.handleClearChat}
                    disabled={isLoading}
                    title="Reiniciar conversación"
                    aria-label="Reiniciar conversación"
                    className="p-2 text-navy-200 hover:text-white hover:bg-navy-800 dark:hover:bg-[#12233B] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={this.handleToggleOpen}
                    title="Cerrar asistente"
                    aria-label="Cerrar asistente"
                    className="p-2 text-navy-200 hover:text-white hover:bg-navy-800 dark:hover:bg-[#12233B] rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PREGUNTAS RÁPIDAS */}
              <div className="px-3.5 py-2.5 bg-white dark:bg-[#0D1A2D] border-b border-slate-200 dark:border-[#1E3354] flex items-center gap-1.5 overflow-x-auto shrink-0">
                {chatbotService.quickPrompts.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void this.submitPrompt(item.question)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#12233B] hover:bg-navy-50 dark:hover:bg-navy-900/70 text-slate-700 dark:text-slate-200 hover:text-navy-800 dark:hover:text-navy-200 border border-slate-200 dark:border-[#243D63] hover:border-navy-300 dark:hover:border-navy-500 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* LISTADO DE MENSAJES */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#070E1A]">
                {messages.map(msg => {
                  const isUser = msg.isUser();
                  const isError = msg.isError;

                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[85%] bg-navy-800 dark:bg-navy-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-xs shadow-xs text-xs">
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                          <div className="text-[10px] text-navy-200 dark:text-navy-100/80 text-right mt-1 font-mono tabular-nums">
                            {msg.timestamp}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isError) {
                    return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="max-w-[88%] bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-2xl rounded-bl-xs text-xs space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">{msg.text}</p>
                          </div>
                          {lastFailedPrompt && (
                            <button
                              type="button"
                              onClick={this.handleRetry}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Reintentar consulta
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[88%] bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] text-slate-800 dark:text-slate-100 px-3.5 py-2.5 rounded-2xl rounded-bl-xs shadow-xs text-xs">
                        {ChatTextRenderer.renderFormattedText(msg.text)}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-1.5 font-mono tabular-nums">
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] text-slate-600 dark:text-slate-300 px-3.5 py-2.5 rounded-2xl rounded-bl-xs text-xs flex items-center gap-2 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300 animate-spin" />
                      <span>Consultando información de la barbería...</span>
                    </div>
                  </div>
                )}

                <div ref={this.messagesEndRef} />
              </div>

              {/* ACCESO DIRECTO A RESERVA EN MODO CLIENTE */}
              {onNavigateToBooking && currentRole === 'client' && (
                <div className="px-3.5 py-2 bg-slate-100/80 dark:bg-[#0A1526] border-t border-slate-200 dark:border-[#1E3354] flex items-center justify-between gap-2 shrink-0">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    ¿Listo para agendar tu corte o servicio?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToBooking();
                      this.setState({ isOpen: false });
                    }}
                    className="px-2.5 py-1 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Reservar cita</span>
                  </button>
                </div>
              )}

              {/* FORMULARIO DE ENTRADA */}
              <form
                onSubmit={this.handleSubmit}
                className="p-3 bg-white dark:bg-[#0D1A2D] border-t border-slate-200 dark:border-[#1E3354] flex items-end gap-2 shrink-0"
              >
                <textarea
                  ref={this.inputRef}
                  rows={1}
                  value={inputValue}
                  onChange={e => this.setState({ inputValue: e.target.value })}
                  onKeyDown={this.handleKeyDown}
                  placeholder="Pregunta sobre precios, horarios, cortes..."
                  disabled={isLoading}
                  className="flex-1 min-h-[42px] max-h-24 resize-none bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-navy-600 dark:focus:border-navy-400 transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  aria-label="Enviar mensaje"
                  className="h-[42px] px-3.5 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 disabled:bg-slate-200 dark:disabled:bg-[#12233B] disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* BOTÓN LANZADOR FLOTANTE */}
        <button
          type="button"
          onClick={this.handleToggleOpen}
          aria-label={isOpen ? 'Cerrar asistente de barbería' : 'Abrir asistente de barbería'}
          aria-expanded={isOpen}
          className="fixed bottom-4 right-4 sm:bottom-5 sm:right-6 z-40 h-12 px-3.5 sm:px-4 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white border border-navy-700 dark:border-navy-400/40 rounded-xl shadow-lg shadow-navy-950/25 flex items-center justify-center gap-2 font-bold text-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
        >
          {isOpen ? (
            <>
              <X className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Cerrar ayuda</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Asistente Barbería</span>
            </>
          )}
        </button>
      </>
    );
  }
}
