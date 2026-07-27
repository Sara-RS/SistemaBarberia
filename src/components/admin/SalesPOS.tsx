/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getTodayStr } from '../../utils/helpers';
import { generateDailyTransactionsPDF } from '../../utils/pdfGenerator';
import { mockDb } from '../../db/mockDb';
import { ReceiptModal } from '../shared/ReceiptModal';
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
  QrCode,
  CheckCircle2,
  Printer,
  History,
  Receipt,
  FileDown
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
    sales,
    companyInfo,
    addSale,
    selectedBranchId,
  } = useApp();

  const movements = activeSession ? mockDb.getCashMovements(activeSession.id) : [];

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'mixed'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [qrReference, setQrReference] = useState('');
  const [tip, setTip] = useState<number>(0);

  // Receipt Modal State
  const [printedReceipt, setPrintedReceipt] = useState<any>(null);
  const [viewHistoryReceipt, setViewHistoryReceipt] = useState<any>(null);

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
  const receivedAmountVal = Number(cashReceived) || cartTotal;
  const changeGivenVal = Math.max(0, receivedAmountVal - cartTotal);

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

    if (paymentMethod === 'cash' && receivedAmountVal < cartTotal) {
      alert(`El monto recibido (${formatCurrency(receivedAmountVal)}) es menor al total a cobrar (${formatCurrency(cartTotal)}).`);
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

    const commissionPercent = (companyInfo.defaultCommission || 35) / 100;

    try {
      const sale = addSale(
        {
          branchId: selectedBranchId,
          clientId: selectedClientId,
          employeeId: selectedBarberId,
          cashierId: selectedBarberId,
          subtotal: cartSubtotal,
          tip: Number(tip),
          total: cartTotal,
          paymentMethod,
          paymentDetails: {
            cashAmount: receivedAmountVal,
            cardAmount: changeGivenVal,
            transactionId: selectedBarberId,
          },
          commissionPaid: cartSubtotal * commissionPercent,
        },
        saleItems
      );

      // Save for receipt
      setPrintedReceipt({
        ...sale,
        items: saleItems,
      });

      // Reset cart
      setCart([]);
      setTip(0);
      setCashReceived('');
      setQrReference('');
      setSelectedClientId('');
      setSelectedBarberId('');
    } catch (err: any) {
      alert(err.message || 'Error al procesar el checkout.');
    }
  };

  const handleDownloadPDF = () => {
    const todayStr = getTodayStr();
    const salesToday = sales.filter(
      (s) => s.branchId === selectedBranchId && (s.date?.startsWith(todayStr) || s.createdAt?.startsWith(todayStr))
    );

    generateDailyTransactionsPDF({
      dateStr: todayStr,
      companyInfo: {
        name: companyInfo.name,
        phone: companyInfo.phone,
        address: companyInfo.address,
        currencySymbol: companyInfo.currencySymbol,
      },
      branchName: 'Sucursal Principal',
      activeSession,
      movements,
      salesToday: salesToday.length > 0 ? salesToday : sales,
      clients,
      employees,
    });
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
          <div className="flex flex-wrap items-center gap-3">
            {activeSession && (
              <div className="grid grid-cols-2 gap-4 text-xs border-r border-gray-800 pr-4">
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
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-amber-500/60"
              title="Descargar reporte PDF del día"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Resumen PDF Diario</span>
            </button>
          </div>
        </div>

        {!activeSession ? (
          // FORMULARIO APERTURA CAJA
          <div className="flex flex-col sm:flex-row items-end gap-4 bg-[#121422]/20 p-4 rounded-xl border border-dashed border-gray-800">
            <div className="space-y-1 w-full sm:max-w-xs text-xs">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Fondo de Apertura (Bs.)</label>
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
                {movements.length === 0 ? (
                  <span className="text-gray-600 italic block py-4 text-center">Sin ingresos ni egresos extra en caja.</span>
                ) : (
                  movements.map((m, idx) => (
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

                  {/* METODO DE PAGO Y TIPO DE PAGO */}
                  <div className="space-y-2 pt-1 border-t border-gray-800/60">
                    <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px] block">Tipo y Método de Pago *</label>
                    
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === 'cash'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-[#11121d] border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Efectivo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === 'transfer'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-[#11121d] border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pago QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === 'card'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-[#11121d] border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Tarjeta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mixed')}
                        className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          paymentMethod === 'mixed'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                            : 'bg-[#11121d] border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Mixto</span>
                      </button>
                    </div>

                    {/* CAMPOS ESPECIFICOS SEGUN METODO */}
                    {paymentMethod === 'cash' && (
                      <div className="bg-[#11121d] border border-gray-800 p-3 rounded-xl space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400 font-bold uppercase">Monto Recibido ({companyInfo.currencySymbol})</span>
                          <span className="text-gray-500">Calculador de Vuelto</span>
                        </div>
                        
                        <input
                          type="number"
                          placeholder={`Ej. ${cartTotal.toFixed(2)}`}
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          className="w-full bg-[#181a29] border border-gray-700 rounded-lg p-2.5 text-white font-mono font-extrabold text-sm focus:outline-none focus:border-amber-500"
                        />

                        {/* ACCESOS DIRECTOS A BILLETES */}
                        <div className="flex gap-1 flex-wrap pt-1">
                          {[cartTotal, 20, 50, 100, 200].map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setCashReceived(String(amount))}
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-[9.5px] rounded font-bold cursor-pointer transition-all"
                            >
                              {amount === cartTotal ? 'Exacto' : `${amount} ${companyInfo.currencySymbol}`}
                            </button>
                          ))}
                        </div>

                        {/* MUESTRA VUELTO EN TIEMPO REAL */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-800 text-xs">
                          <span className="text-gray-400">Vuelto / Cambio a Entregar:</span>
                          <span className={`font-mono font-black text-sm ${changeGivenVal > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {formatCurrency(changeGivenVal)}
                          </span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'transfer' && (
                      <div className="bg-[#11121d] border border-gray-800 p-3 rounded-xl text-center space-y-2 mt-2">
                        <div className="w-28 h-28 bg-white p-2 rounded-xl mx-auto shadow-md flex items-center justify-center">
                          <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BarberiaJosuePagoQR"
                            alt="QR Pago"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 font-sans">
                          Muestra este QR al cliente para transferir <strong>{formatCurrency(cartTotal)}</strong> directamente a la cuenta institucional.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* PROPINA */}
                  <div className="space-y-1">
                    <label className="text-gray-500 font-semibold uppercase tracking-wider text-[9px] block">Propina Extra ({companyInfo.currencySymbol})</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={tip || ''}
                      onChange={(e) => setTip(Number(e.target.value))}
                      className="w-full bg-[#11121d] border border-gray-800 rounded-lg p-2 text-gray-200 focus:outline-none font-mono"
                    />
                  </div>

                  {/* IMPORTES TOTALES */}
                  <div className="p-3.5 bg-[#141625] border border-gray-800 rounded-xl space-y-1.5 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-300 font-mono">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {tip > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Propina</span>
                        <span className="text-emerald-400 font-mono">+{formatCurrency(tip)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-gray-800/60 pt-1.5 font-black">
                      <span className="text-white">TOTAL A COBRAR</span>
                      <span className="text-amber-500 font-mono">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black py-3.5 rounded-xl font-extrabold tracking-wide transition-all cursor-pointer text-xs shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                    <span>Realizar Pago & Generar Comprobante</span>
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      )}

      {/* HISTORIAL DE VENTAS Y COMPROBANTES REGISTRADOS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600 stroke-[2.2]" />
            <h3 className="font-extrabold text-slate-900 text-sm">Historial de Ventas & Comprobantes Generados</h3>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <FileDown className="w-4 h-4 text-indigo-600" />
              <span>Descargar Reporte PDF</span>
            </button>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full">
              {sales.length} Registro(s)
            </span>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            Aún no hay ventas registradas en esta sucursal. Realiza una venta en el POS para ver su comprobante.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase font-black tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Folio</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sales.map((sale) => {
                  const client = clients.find(c => c.id === sale.clientId);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{sale.id}</td>
                      <td className="py-3 px-3 font-sans text-slate-500">
                        {new Date(sale.createdAt || Date.now()).toLocaleDateString('es-BO')}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">{client?.fullName || 'Cliente General'}</td>
                      <td className="py-3 px-3">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600">
                        {sale.total.toFixed(2)} {companyInfo.currencySymbol}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setViewHistoryReceipt(sale)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Receipt className="w-3 h-3 text-amber-400" />
                          <span>Ver Comprobante</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL / COMPROBANTE OFICIAL DE VENTA (PRINTABLE & WHATSAPP) */}
      {(printedReceipt || viewHistoryReceipt) && (
        <ReceiptModal
          sale={printedReceipt || viewHistoryReceipt}
          companyInfo={companyInfo}
          clients={clients}
          services={services}
          products={products}
          employees={employees}
          onClose={() => {
            setPrintedReceipt(null);
            setViewHistoryReceipt(null);
          }}
        />
      )}
    </div>
  );
};
