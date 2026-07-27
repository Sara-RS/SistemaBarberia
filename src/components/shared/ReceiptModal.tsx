/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanyInfo, Client, Service, Product, Employee, Sale } from '../../types';
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

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  companyInfo,
  clients,
  services,
  products,
  employees,
  onClose,
}) => {
  const client = clients.find(c => c.id === sale.clientId);
  const barber = employees.find(e => e.id === sale.cashierId || e.id === sale.paymentDetails?.transactionId);
  const currency = companyInfo.currencySymbol || 'Bs.';

  const handlePrint = () => {
    window.print();
  };

  // Format WhatsApp message
  const whatsappPhone = client?.phone
    ? client.phone.startsWith('591') || client.phone.startsWith('+591')
      ? client.phone.replace(/[^0-9]/g, '')
      : `591${client.phone.replace(/[^0-9]/g, '')}`
    : '';

  const whatsappText = `*COMPROBANTE DE VENTA - ${companyInfo.name}*\n` +
    `--------------------------------------\n` +
    `Folio: ${sale.id}\n` +
    `Fecha: ${new Date(sale.createdAt || Date.now()).toLocaleString('es-BO')}\n` +
    `Cliente: ${client?.fullName || 'Cliente General'}\n` +
    `--------------------------------------\n` +
    `*TOTAL COBRADO:* ${sale.total.toFixed(2)} ${currency}\n` +
    `Método de Pago: ${sale.paymentMethod.toUpperCase()}\n\n` +
    `_${companyInfo.receiptFooterMsg}_\n\n` +
    `¡Gracias por preferirnos! ✂️💈`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative text-slate-800 print:shadow-none print:border-none print:max-w-full">
        
        {/* BARRA SUPERIOR ACCIONES */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            <span className="font-extrabold text-xs uppercase tracking-wider">Comprobante de Venta</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DEL COMPROBANTE DE VENTA (ESTILO RECIBO OFICIAL) */}
        <div className="p-6 space-y-4 text-xs font-mono">
          
          {/* LOGO & CABECERA INSTITUCIONAL */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
            {companyInfo.logoUrl ? (
              <img src={companyInfo.logoUrl} alt="Logo" className="w-14 h-14 object-cover rounded-full mx-auto border-2 border-indigo-100" />
            ) : (
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-2">
                <Scissors className="w-6 h-6" />
              </div>
            )}

            <h2 className="font-black text-slate-900 text-base uppercase tracking-tight">{companyInfo.name}</h2>
            {companyInfo.slogan && <p className="text-[10px] text-slate-500 italic font-sans">{companyInfo.slogan}</p>}
            <p className="text-[10px] text-slate-600 font-bold">NIT / RUC: {companyInfo.nitRuc || '1029384029'}</p>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">{companyInfo.address}</p>
            <p className="text-[10px] text-slate-500 font-sans">Tel: {companyInfo.phone}</p>
          </div>

          {/* METADATOS DEL COMPROBANTE */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">N° Comprobante</span>
              <span className="font-black text-slate-800">{sale.id}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Fecha & Hora</span>
              <span className="font-bold text-slate-700">{new Date(sale.createdAt || Date.now()).toLocaleDateString('es-BO')}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Cliente</span>
              <span className="font-bold text-slate-800 truncate block">{client?.fullName || 'Cliente General'}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Barbero Atendió</span>
              <span className="font-bold text-slate-800 truncate block">{barber?.fullName || 'Barbero en Turno'}</span>
            </div>
          </div>

          {/* TABLA DETALLE DE SERVICIOS / PRODUCTOS */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Detalle de Servicios & Ítems</span>
            
            <div className="border-t border-b border-slate-200 py-2 space-y-1.5 text-[11px]">
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item: any, idx: number) => {
                  const name =
                    services.find(s => s.id === item.itemId)?.name ||
                    products.find(p => p.id === item.itemId)?.name ||
                    'Servicio / Producto';
                  return (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-slate-700">
                        <span className="font-bold text-indigo-600">{item.quantity}x</span> {name}
                      </span>
                      <span className="font-bold text-slate-900">{item.totalPrice?.toFixed(2) || (item.price * item.quantity).toFixed(2)} {currency}</span>
                    </div>
                  );
                })
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Servicio Barbería Profesional</span>
                  <span className="font-bold text-slate-900">{sale.subtotal?.toFixed(2)} {currency}</span>
                </div>
              )}
            </div>
          </div>

          {/* RESUMEN DE TOTALES Y PAGO */}
          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-700">{sale.subtotal?.toFixed(2)} {currency}</span>
            </div>
            {sale.tip > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Propina / Extra:</span>
                <span className="font-bold text-emerald-600">+{sale.tip?.toFixed(2)} {currency}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-300 text-slate-900">
              <span>TOTAL COBRADO:</span>
              <span className="text-indigo-600 text-base">{sale.total?.toFixed(2)} {currency}</span>
            </div>

            {/* DETALLES DE METODO Y VUELTO */}
            <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 mt-2 space-y-1 text-[10px] text-slate-600">
              <div className="flex justify-between">
                <span>Método de Pago:</span>
                <span className="font-black text-slate-800 uppercase">{sale.paymentMethod}</span>
              </div>
              {sale.paymentDetails?.cashAmount ? (
                <>
                  <div className="flex justify-between">
                    <span>Monto Recibido:</span>
                    <span className="font-bold text-slate-800">{sale.paymentDetails.cashAmount.toFixed(2)} {currency}</span>
                  </div>
                  {sale.paymentDetails.cardAmount ? (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Cambio / Vuelto Entregado:</span>
                      <span>{sale.paymentDetails.cardAmount.toFixed(2)} {currency}</span>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {/* PIE DE PAGINA MENSAJE */}
          <div className="text-center text-[10px] text-slate-500 italic font-sans pt-2 border-t border-dashed border-slate-300 leading-relaxed">
            "{companyInfo.receiptFooterMsg || '¡Gracias por su preferencia! Vuelva pronto.'}"
          </div>
        </div>

        {/* BOTONES DE ACCION */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Comprobante</span>
          </button>

          {whatsappPhone && (
            <a
              href={`https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </a>
          )}
        </div>

      </div>
    </div>
  );
};
