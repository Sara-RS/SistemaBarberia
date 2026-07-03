/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import {
  DollarSign,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  FileText,
  AlertCircle,
  Scissors,
  Package,
  User,
  CreditCard,
  UserCheck,
} from 'lucide-react';

export const SalesPOS: React.FC = () => {
  const {
    activeSession,
    openCash,
    closeCash,
    addCashMovement,
    services,
    products,
    clients,
    employees,
    addSale,
    selectedBranchId,
  } = useApp();

  // CASH SESSION INPUTS
  const [openingBalance, setOpeningBalance] = useState<number>(1000);
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState('');

  // POS TERMINAL BASKET STATE
  const [cart, setCart] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [tip, setTip] = useState<number>(0);

  // Receipt Modal State
  const [printedReceipt, setPrintedReceipt] = useState<any>(null);

  // FILTRAR PRODUCTOS CON STOCK
  const availableProducts = products.filter(p => p.branchId === selectedBranchId);
  const activeBarbers = employees.filter(e => e.branchId === selectedBranchId && e.role === 'barber');

  // --- ACTIONS CART ---
  const handleAddItemToCart = (item: any, type: 'service' | 'product') => {
    const existingIndex = cart.findIndex(c => c.itemId === item.id && c.itemType === type);

    if (existingIndex > -1) {
      // Si es un producto, verificar stock límite
      if (type === 'product' && cart[existingIndex].quantity >= item.stock) {
        alert('No hay suficiente inventario disponible para agregar más unidades.');
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          itemId: item.id,
          itemName: item.name,
          itemType: type,
          price: item.price,
          quantity: 1,
        },
      ]);
    }
  };

  const handleRemoveFromCart = (itemId: string, type: string) => {
    setCart(cart.filter(c => !(c.itemId === itemId && c.itemType === type)));
  };

  const cartSubtotal = cart.reduce((acc, c) => acc + c.price * c.quantity, 0);
  const cartTotal = cartSubtotal + Number(tip);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      alert('Debes abrir una sesión de caja antes de realizar transacciones.');
      return;
    }
    if (cart.length === 0) {
      alert('La canasta está vacía.');
      return;
    }
    if (!selectedClientId) {
      alert('Por favor selecciona un cliente para registrar la venta.');
      return;
    }
    if (!selectedBarberId) {
      alert('Por favor selecciona el barbero que atendió el servicio.');
      return;
    }

    // Estructurar items de venta
    const saleItems = cart.map(c => ({
      itemType: c.itemType,
      itemId: c.itemId,
      quantity: c.quantity,
      unitPrice: c.price,
      totalPrice: c.price * c.quantity,
    }));

    try {
      const sale = addSale(
        {
          branchId: selectedBranchId,
          clientId: selectedClientId,
          employeeId: selectedBarberId,
          subtotal: cartSubtotal,
          tip: Number(tip),
          total: cartTotal,
          paymentMethod,
          commissionPaid: cartSubtotal * 0.35, // comisión del 35% por defecto en servicios
        },
        saleItems
      );

      // Guardar para el ticket visual
      setPrintedReceipt(sale);

      // Reset cart
      setCart([]);
      setTip(0);
      setSelectedClientId('');
      setSelectedBarberId('');
    } catch (err: any) {
      alert(err.message || 'Error al procesar el checkout.');
    }
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN CAJA CONTROL (ARRIBA) */}
      <div className="p-5 bg-[#0d0e15] border border-gray-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-800/40 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm">Control de Turno de Caja</h3>
            <span className="text-[10px] text-gray-500 block">Apertura, arqueos y corte final diario.</span>
          </div>
          {activeSession && (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">Fondo de Apertura</span>
                <span className="font-extrabold text-white">{formatCurrency(activeSession.openingBalance)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Balance Esperado Caja</span>
                <span className="font-extrabold text-amber-500">{formatCurrency(activeSession.expectedBalance)}</span>
              </div>
            </div>
          )}
        </div>

        {!activeSession ? (
          // FORMULARIO APERTURA CAJA
          <div className="flex flex-col sm:flex-row items-end gap-4 bg-[#121422]/20 p-4 rounded-xl border border-dashed border-gray-800">
            <div className="space-y-1 w-full sm:max-w-xs text-xs">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Fondo de Apertura ($ MXN)</label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <button
              onClick={() => openCash(openingBalance)}
              className="px-5 py-2.5 bg-amber-500 text-black rounded-lg text-xs font-bold hover:bg-amber-600 transition-all cursor-pointer shadow-lg shadow-amber-500/5"
            >
              Abrir Turno de Caja
            </button>
          </div>
        ) : (
          // SECCIÓN RETIROS / INGRESOS / CIERRE CAJA
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Movimientos rápidos */}
            <div className="space-y-2">
              <span className="font-bold text-[10px] text-gray-500 uppercase tracking-wider block">Registrar Arqueo (Ajuste)</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMovementType('income')}
                  className={`py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                    movementType === 'income' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-500'
                  }`}
                >
                  Entrada Cash
                </button>
                <button
                  onClick={() => setMovementType('expense')}
                  className={`py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                    movementType === 'expense' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-gray-900 border-gray-800 text-gray-500'
                  }`}
                >
                  Egreso / Retiro
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="number"
                  placeholder="$ Monto"
                  value={movementAmount || ''}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  className="bg-[#11121d] border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none font-mono"
                />
                <input
                  type="text"
                  placeholder="Motivo / Detalle"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="bg-[#11121d] border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (movementAmount <= 0 || !movementReason) {
                    alert('Ingresa monto y motivo válido.');
                    return;
                  }
                  addCashMovement(movementType, movementAmount, movementReason);
                  setMovementAmount(0);
                  setMovementReason('');
                }}
                className="w-full bg-[#11121d] border border-gray-800 hover:border-amber-500 text-amber-500 py-1.5 rounded-lg font-bold transition-all cursor-pointer mt-1"
              >
                Aplicar Ajuste de Caja
              </button>
            </div>

            {/* Listado de movimientos de la sesión */}
            <div className="space-y-2">
              <span className="font-bold text-[10px] text-gray-500 uppercase tracking-wider block">Bitácora de Sesión</span>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px] text-gray-400">
                {activeSession.movements.length === 0 ? (
                  <span className="text-gray-600 italic block py-4 text-center">Sin ingresos ni egresos extra en caja.</span>
                ) : (
                  activeSession.movements.map((m, idx) => (
                    <div key={idx} className="flex justify-between border-b border-gray-900 pb-1">
                      <span className="text-gray-500">{m.reason}</span>
                      <span className={m.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>
                        {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Corte final de caja */}
            <div className="space-y-2">
              <span className="font-bold text-[10px] text-gray-500 uppercase tracking-wider block">Corte Final / Cierre</span>
              <div className="space-y-1.5">
                <input
                  type="number"
                  placeholder="$ Efectivo Real en Caja"
                  value={closingBalance || ''}
                  onChange={(e) => setClosingBalance(Number(e.target.value))}
                  className="w-full bg-[#11121d] border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none font-mono"
                />
                <input
                  type="text"
                  placeholder="Notas de arqueo..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full bg-[#11121d] border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  closeCash(closingBalance, closeNotes);
                  setClosingBalance(0);
                  setCloseNotes('');
                }}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
              >
                Cerrar Caja (Corte)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POS TERMINAL GRID */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CATALOG SELECTION PANELS */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* SERVICIOS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-amber-500" />
                <span>Elegir Servicios</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleAddItemToCart(s, 'service')}
                    className="p-3 bg-[#0d0e15] border border-gray-800 hover:border-amber-500 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between h-24"
                  >
                    <span className="font-extrabold text-white text-xs truncate block max-w-full">{s.name}</span>
                    <div className="flex justify-between items-center mt-2 w-full">
                      <span className="text-[10px] text-gray-500">{s.duration}m</span>
                      <span className="text-xs font-black text-amber-500">{formatCurrency(s.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* PRODUCTOS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-500" />
                <span>Elegir Productos</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleAddItemToCart(p, 'product')}
                    disabled={p.stock <= 0}
                    className="p-3 bg-[#0d0e15] border border-gray-800 hover:border-amber-500 disabled:opacity-40 disabled:hover:border-gray-800 disabled:cursor-not-allowed rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between h-24"
                  >
                    <div className="w-full">
                      <span className="font-extrabold text-white text-xs truncate block max-w-full">{p.name}</span>
                      <span className="text-[9px] text-gray-500 block truncate">SKU: {p.sku}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 w-full">
                      <span className={`text-[10px] font-bold ${p.stock <= p.minStock ? 'text-rose-400' : 'text-gray-500'}`}>
                        {p.stock} pz
                      </span>
                      <span className="text-xs font-black text-amber-500">{formatCurrency(p.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* CHECKOUT CART PANEL */}
          <div className="lg:col-span-5">
            <div className="p-5 bg-[#0d0e15] border border-gray-800 rounded-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/40">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-amber-500" />
                  <span>Ticket de Cobro</span>
                </h3>
                <span className="bg-[#121422] text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-800 uppercase">
                  {cart.length} ítems
                </span>
              </div>

              {/* CART LINES */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-500 space-y-1">
                    <ShoppingCart className="w-6 h-6 mx-auto stroke-[1.5] text-gray-600" />
                    <p className="font-semibold text-gray-400">Canasta vacía</p>
                    <p className="text-[10px]">Agrega productos o servicios haciendo clic en el catálogo de la izquierda.</p>
                  </div>
                ) : (
                  cart.map((line, idx) => (
                    <div key={idx} className="p-2.5 bg-[#11121d]/50 border border-gray-800 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="font-extrabold text-white block truncate max-w-[180px]">{line.itemName}</span>
                        <span className="text-[10px] text-gray-500 mt-0.5 block capitalize">
                          {line.itemType} — {line.quantity} pz × {formatCurrency(line.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-300 font-mono">{formatCurrency(line.price * line.quantity)}</span>
                        <button
                          onClick={() => handleRemoveFromCart(line.itemId, line.itemType)}
                          className="p-1 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* FORM DE DATOS EXTRA CHECKOUT */}
              {cart.length > 0 && (
                <form onSubmit={handleCheckout} className="space-y-3.5 border-t border-gray-800/40 pt-4 text-xs">
                  {/* CLIENTE */}
                  <div className="space-y-1">
                    <label className="text-gray-500 font-semibold uppercase tracking-wider text-[9px] block">Cliente Receptor *</label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none"
                    >
                      <option value="">-- Elige Cliente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>
                      ))}
                    </select>
                  </div>

                  {/* BARBERO COMISIÓN */}
                  <div className="space-y-1">
                    <label className="text-gray-500 font-semibold uppercase tracking-wider text-[9px] block">Barbero Asignado (Recibe Comisión) *</label>
                    <select
                      required
                      value={selectedBarberId}
                      onChange={(e) => setSelectedBarberId(e.target.value)}
                      className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none"
                    >
                      <option value="">-- Elige Barbero --</option>
                      {activeBarbers.map(b => (
                        <option key={b.id} value={b.id}>{b.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {/* METODO DE PAGO Y PROPINA */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-gray-500 font-semibold uppercase tracking-wider text-[9px] block">Método de Pago</label>
                      <select
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                        className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta / Transfer</option>
                        <option value="mixed">Pago Mixto</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-gray-500 font-semibold uppercase tracking-wider text-[9px] block">Propina Extra ($)</label>
                      <input
                        type="number"
                        placeholder="$ Tip"
                        value={tip || ''}
                        onChange={(e) => setTip(Number(e.target.value))}
                        className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2.5 text-gray-200 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* IMPORTES TOTALES */}
                  <div className="p-3.5 bg-[#141625] border border-gray-800 rounded-xl space-y-1.5 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-300 font-mono">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Propina</span>
                      <span className="text-emerald-400 font-mono">+{formatCurrency(tip)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-800/60 pt-1.5 font-black">
                      <span className="text-white">TOTAL COBRO</span>
                      <span className="text-amber-500 font-mono">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs shadow-lg shadow-amber-500/10"
                  >
                    Registrar Venta & Cobrar
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODAL / POPUP DE IMPRESIÓN DE TICKET DE COMPRA (POS) */}
      {printedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121420] border border-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-left">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 w-full" />
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-gray-800">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-black text-emerald-400 block">Venta Registrada</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Folio: {printedReceipt.id}</span>
                </div>
                <button
                  onClick={() => setPrintedReceipt(null)}
                  className="p-1 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* TICKET MOCK COMPRA */}
              <div className="space-y-3.5 text-xs text-gray-300">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Cliente</span>
                  <span className="font-extrabold text-white">
                    {clients.find(c => c.id === printedReceipt.clientId)?.fullName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Conceptos</span>
                  <div className="space-y-1 text-gray-400">
                    {printedReceipt.items.map((line: any, index: number) => (
                      <div key={index} className="flex justify-between border-b border-gray-900 pb-1">
                        <span>
                          {line.quantity} × {services.find(s => s.id === line.itemId)?.name || products.find(p => p.id === line.itemId)?.name || 'Ítem'}
                        </span>
                        <span className="font-mono text-gray-200">{formatCurrency(line.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-3 space-y-1 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span className="font-mono text-white">{formatCurrency(printedReceipt.subtotal)}</span>
                  </div>
                  {printedReceipt.tip > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Propina:</span>
                      <span className="font-mono text-emerald-400">+{formatCurrency(printedReceipt.tip)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-800/40 pt-1 text-sm font-black text-amber-500">
                    <span>Monto Cobrado:</span>
                    <span className="font-mono">{formatCurrency(printedReceipt.total)}</span>
                  </div>
                </div>

                <div className="bg-[#141625] p-3 rounded-lg border border-gray-800 text-[11px] leading-relaxed text-gray-400">
                  ⚡ <strong>Información de Pago:</strong> Recibido vía <strong>{printedReceipt.paymentMethod.toUpperCase()}</strong>. La comisión del 35% ({formatCurrency(printedReceipt.commissionPaid)}) fue asignada automáticamente al barbero en turno.
                </div>
              </div>

              <button
                onClick={() => setPrintedReceipt(null)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-2.5 rounded-lg font-bold transition-all text-xs cursor-pointer shadow-lg shadow-emerald-500/5"
              >
                Completar y Volver al POS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
