/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanyInfo, Client, Service, Product, Employee, Sale } from '../../types';
import { WhatsAppUrlBuilder } from '../../utils/helpers';
import { Scissors, Printer, MessageSquare, CheckCircle, X } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale & { items?: any[] };
  companyInfo: CompanyInfo;
  clients: Client[];
  services: Service[];
  products: Product[];
  employees: Employee[];
  onClose: () => void;
}

export class ReceiptModal extends React.Component<ReceiptModalProps> {
  private handlePrint = (): void => {
    window.print();
  };

  private buildWhatsAppText(clientName: string, currency: string): string {
    const { sale, companyInfo, products, services } = this.props;

    const itemsSummary =
      sale.items && sale.items.length > 0
        ? sale.items
            .map((item: any) => {
              const prod = products.find(p => p.id === item.itemId);
              const serv = services.find(s => s.id === item.itemId);
              const name = prod?.name || serv?.name || 'Ítem';
              const unitPrice = item.price ?? item.totalPrice / (item.quantity || 1) ?? 0;
              return `• ${item.quantity}x ${name} @ ${unitPrice.toFixed(2)} ${currency} = ${(item.totalPrice || item.price * item.quantity).toFixed(2)} ${currency}`;
            })
            .join('\n')
        : `• Servicio Barbería: ${(sale.subtotal ?? 0).toFixed(2)} ${currency}`;

    return (
      `*COMPROBANTE DE VENTA - ${companyInfo.name}*\n` +
      `--------------------------------------\n` +
      `Folio: ${sale.id}\n` +
      `Fecha: ${new Date(sale.createdAt || Date.now()).toLocaleString('es-BO')}\n` +
      `Cliente: ${clientName}\n` +
      `--------------------------------------\n` +
      `*DETALLE DE VENTA:*\n${itemsSummary}\n` +
      `--------------------------------------\n` +
      `*TOTAL COBRADO:* ${(sale.total ?? 0).toFixed(2)} ${currency}\n` +
      `Método de Pago: ${(sale.paymentMethod || 'cash').toUpperCase()}\n\n` +
      `_${companyInfo.receiptFooterMsg}_\n\n` +
      `¡Gracias por preferirnos! ✂️💈`
    );
  }

  public render(): React.ReactNode {
    const { sale, companyInfo, clients, services, products, employees, onClose } = this.props;
    const client = clients.find(c => c.id === sale.clientId);
    const barber = employees.find(e => e.id === sale.cashierId || e.id === sale.paymentDetails?.transactionId);
    const currency = companyInfo.currencySymbol || 'Bs.';
    const clientName = client?.fullName || 'Cliente General';

    const whatsappPhone = client?.phone ? WhatsAppUrlBuilder.normalizeBoliviaPhone(client.phone) : '';
    const whatsappText = this.buildWhatsAppText(clientName, currency);

    return (
      <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-slate-800 dark:text-slate-100 print:bg-white print:text-black print:shadow-none print:border-none print:max-w-full">
          {/* BARRA SUPERIOR ACCIONES */}
          <div className="bg-navy-900 dark:bg-[#06142B] text-white p-4 flex justify-between items-center border-b border-navy-800 dark:border-[#1E3354] print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span className="font-extrabold text-xs uppercase tracking-wider">Comprobante de Venta</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-navy-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CONTENIDO DEL COMPROBANTE DE VENTA */}
          <div className="p-6 space-y-4 text-xs font-mono">
            {/* LOGO & CABECERA INSTITUCIONAL */}
            <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300 dark:border-[#243D63]">
              {companyInfo.logoUrl ? (
                <img
                  src={companyInfo.logoUrl}
                  alt="Logo"
                  className="w-14 h-14 object-cover rounded-full mx-auto border-2 border-navy-100 dark:border-navy-700"
                />
              ) : (
                <div className="w-12 h-12 bg-navy-800 dark:bg-navy-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-2">
                  <Scissors className="w-6 h-6" />
                </div>
              )}

              <h2 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">
                {companyInfo.name}
              </h2>
              {companyInfo.slogan && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic font-sans">{companyInfo.slogan}</p>
              )}
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                NIT / RUC: {companyInfo.nitRuc || '1029384029'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
                {companyInfo.address}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">Tel: {companyInfo.phone}</p>
            </div>

            {/* METADATOS DEL COMPROBANTE */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#12233B] p-3 rounded-xl border border-slate-200 dark:border-[#243D63] text-[11px]">
              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-bold block">
                  N° Comprobante
                </span>
                <span className="font-black text-slate-800 dark:text-white">{sale.id}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-bold block">
                  Fecha & Hora
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {new Date(sale.createdAt || Date.now()).toLocaleDateString('es-BO')}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-bold block">Cliente</span>
                <span className="font-bold text-slate-800 dark:text-white truncate block">{clientName}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-bold block">
                  Barbero Atendió
                </span>
                <span className="font-bold text-slate-800 dark:text-white truncate block">
                  {barber?.fullName || 'Barbero en Turno'}
                </span>
              </div>
            </div>

            {/* TABLA DETALLE DE SERVICIOS / PRODUCTOS */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                Detalle de Servicios & Ítems
              </span>

              <div className="border-t border-b border-slate-200 dark:border-[#243D63] py-2 space-y-2 text-[11px]">
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item: any, idx: number) => {
                    const prod = products.find(p => p.id === item.itemId);
                    const serv = services.find(s => s.id === item.itemId);
                    const name = prod?.name || serv?.name || 'Servicio / Producto';
                    const isProd = !!prod || item.type === 'product';
                    const unitPrice = item.price ?? item.totalPrice / (item.quantity || 1) ?? 0;
                    const itemTotal = item.totalPrice ?? unitPrice * item.quantity;

                    return (
                      <div
                        key={idx}
                        className="pb-1.5 border-b border-slate-100 dark:border-[#1E3354] last:border-none last:pb-0 space-y-0.5"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-slate-800 dark:text-slate-100 font-bold leading-tight">
                            <span className="text-navy-700 dark:text-navy-300 font-black">{item.quantity}x</span> {name}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                            {itemTotal.toFixed(2)} {currency}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[9.5px] text-slate-500 dark:text-slate-400 font-sans">
                          <span>
                            P. Unitario:{' '}
                            <strong className="font-mono text-slate-700 dark:text-slate-200">
                              {unitPrice.toFixed(2)} {currency}
                            </strong>
                          </span>
                          <span className="bg-slate-100 dark:bg-[#12233B] text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase">
                            {isProd ? 'Producto' : 'Servicio'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-200 font-medium">Servicio Barbería Profesional</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {sale.subtotal?.toFixed(2)} {currency}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* RESUMEN DE TOTALES Y PAGO */}
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {sale.subtotal?.toFixed(2)} {currency}
                </span>
              </div>
              {(sale.tip ?? 0) > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Propina / Extra:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{sale.tip?.toFixed(2)} {currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-300 dark:border-[#243D63] text-slate-900 dark:text-white">
                <span>TOTAL COBRADO:</span>
                <span className="text-navy-800 dark:text-navy-300 text-base">
                  {sale.total?.toFixed(2)} {currency}
                </span>
              </div>

              <div className="bg-slate-100 dark:bg-[#12233B] p-2.5 rounded-xl border border-slate-200 dark:border-[#243D63] mt-2 space-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Método de Pago:</span>
                  <span className="font-black text-slate-800 dark:text-white uppercase">{sale.paymentMethod}</span>
                </div>
                {sale.paymentDetails?.cashAmount ? (
                  <>
                    <div className="flex justify-between">
                      <span>Monto Recibido:</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {sale.paymentDetails.cashAmount.toFixed(2)} {currency}
                      </span>
                    </div>
                    {sale.paymentDetails.cardAmount ? (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                        <span>Cambio / Vuelto Entregado:</span>
                        <span>
                          {sale.paymentDetails.cardAmount.toFixed(2)} {currency}
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {/* PIE DE PAGINA MENSAJE */}
            <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 italic font-sans pt-2 border-t border-dashed border-slate-300 dark:border-[#243D63] leading-relaxed">
              "{companyInfo.receiptFooterMsg || '¡Gracias por su preferencia! Vuelva pronto.'}"
            </div>
          </div>

          {/* BOTONES DE ACCION */}
          <div className="p-4 bg-slate-50 dark:bg-[#0A1526] border-t border-slate-200 dark:border-[#1E3354] flex flex-col sm:flex-row gap-2 print:hidden">
            <button
              onClick={this.handlePrint}
              className="flex-1 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprobante</span>
            </button>

            {whatsappPhone && (
              <a
                href={WhatsAppUrlBuilder.buildApiUrl(client?.phone || '', whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
}
