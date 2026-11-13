/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory } from '../../models/DomainModels';
import { CurrencyFormatter, DateTimeHelper } from '../../utils/helpers';
import { DailyCashReportGenerator } from '../../utils/pdfGenerator';
import { mockDb } from '../../db/mockDb';
import { ReceiptModal } from '../shared/ReceiptModal';
import {
  DollarSign,
  ShoppingCart,
  Trash2,
  Scissors,
  Package,
  CreditCard,
  UserCheck,
  QrCode,
  History,
  Receipt,
  FileDown,
} from 'lucide-react';

interface CartLineItem {
  itemId: string;
  itemName: string;
  itemType: 'service' | 'product';
  price: number;
  quantity: number;
}

interface SalesPOSState {
  openingBalance: number;
  closingBalance: number;
  closeNotes: string;
  movementType: 'income' | 'expense';
  movementAmount: number;
  movementReason: string;
  cart: CartLineItem[];
  selectedClientId: string;
  selectedBarberId: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed';
  cashReceived: string;
  qrReference: string;
  tip: number;
  printedReceipt: any;
  viewHistoryReceipt: any;
}

export class SalesPOS extends BaseAppComponent<{}, SalesPOSState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      openingBalance: 1000,
      closingBalance: 0,
      closeNotes: '',
      movementType: 'income',
      movementAmount: 0,
      movementReason: '',
      cart: [],
      selectedClientId: '',
      selectedBarberId: '',
      paymentMethod: 'cash',
      cashReceived: '',
      qrReference: '',
      tip: 0,
      printedReceipt: null,
      viewHistoryReceipt: null,
    };
  }

  private handleAddItemToCart = (item: any, type: 'service' | 'product'): void => {
    const { cart } = this.state;
    const existingIndex = cart.findIndex(c => c.itemId === item.id && c.itemType === type);

    if (existingIndex > -1) {
      if (type === 'product' && cart[existingIndex].quantity >= item.stock) {
        alert('No hay suficiente inventario disponible para agregar más unidades.');
        return;
      }
      const updated = [...cart];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      };
      this.setState({ cart: updated });
    } else {
      this.setState({
        cart: [
          ...cart,
          {
            itemId: item.id,
            itemName: item.name,
            itemType: type,
            price: item.price,
            quantity: 1,
          },
        ],
      });
    }
  };

  private handleRemoveFromCart = (itemId: string, type: string): void => {
    this.setState(prevState => ({
      cart: prevState.cart.filter(c => !(c.itemId === itemId && c.itemType === type)),
    }));
  };

  private getCartTotals(): {
    cartSubtotal: number;
    cartTotal: number;
    receivedAmountVal: number;
    changeGivenVal: number;
  } {
    const { cart, tip, cashReceived } = this.state;
    const cartSubtotal = cart.reduce((acc, c) => acc + c.price * c.quantity, 0);
    const cartTotal = cartSubtotal + Number(tip);
    const receivedAmountVal = Number(cashReceived) || cartTotal;
    const changeGivenVal = Math.max(0, receivedAmountVal - cartTotal);
    return { cartSubtotal, cartTotal, receivedAmountVal, changeGivenVal };
  }

  private handleCheckout = (e: React.FormEvent): void => {
    e.preventDefault();
    const { activeSession, companyInfo, selectedBranchId, addSale } = this.app;
    const { cart, selectedClientId, selectedBarberId, paymentMethod, tip } = this.state;
    const { cartSubtotal, cartTotal, receivedAmountVal, changeGivenVal } = this.getCartTotals();

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
      alert(
        `El monto recibido (${CurrencyFormatter.format(receivedAmountVal)}) es menor al total a cobrar (${CurrencyFormatter.format(cartTotal)}).`
      );
      return;
    }

    const saleItems = cart.map(c => ({
      type: c.itemType,
      itemType: c.itemType,
      itemId: c.itemId,
      quantity: c.quantity,
      price: c.price,
      unitPrice: c.price,
      totalPrice: c.price * c.quantity,
      employeeId: selectedBarberId,
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

      this.setState({
        printedReceipt: {
          ...sale,
          items: saleItems,
        },
        cart: [],
        tip: 0,
        cashReceived: '',
        qrReference: '',
        selectedClientId: '',
        selectedBarberId: '',
      });
    } catch (err: any) {
      alert(err.message || 'Error al procesar el checkout.');
    }
  };

  private handleDownloadPDF = (): void => {
    const { activeSession, companyInfo, sales, clients, employees, selectedBranchId } = this.app;
    const movements = activeSession ? mockDb.getCashMovements(activeSession.id) : [];
    const todayStr = DateTimeHelper.getTodayStr();
    const salesToday = sales.filter(
      s => s.branchId === selectedBranchId && (s.date?.startsWith(todayStr) || s.createdAt?.startsWith(todayStr))
    );

    const reportGenerator = new DailyCashReportGenerator();
    reportGenerator.generate({
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

  public render(): React.ReactNode {
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
      selectedBranchId,
    } = this.app;

    const {
      openingBalance,
      closingBalance,
      closeNotes,
      movementType,
      movementAmount,
      movementReason,
      cart,
      selectedClientId,
      selectedBarberId,
      paymentMethod,
      cashReceived,
      tip,
      printedReceipt,
      viewHistoryReceipt,
    } = this.state;

    const movements = activeSession ? mockDb.getCashMovements(activeSession.id) : [];
    const availableProducts = products.filter(p => p.branchId === selectedBranchId);
    const activeBarbers = employees.filter(e => e.branchId === selectedBranchId && e.role === 'barber');
    const { cartSubtotal, cartTotal, changeGivenVal } = this.getCartTotals();

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* SECCIÓN CAJA CONTROL (ARRIBA) */}
        <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 dark:border-[#1E3354] pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Control de Turno de Caja</h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Apertura, arqueos y corte final diario.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {activeSession && (
                <div className="grid grid-cols-2 gap-4 text-xs border-r border-slate-200 dark:border-[#1E3354] pr-4">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Fondo de Apertura</span>
                    <span className="font-extrabold text-slate-900 dark:text-white font-mono">
                      {CurrencyFormatter.format(activeSession.openingBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Balance Esperado Caja</span>
                    <span className="font-extrabold text-navy-800 dark:text-navy-300 font-mono">
                      {CurrencyFormatter.format(activeSession.expectedBalance)}
                    </span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={this.handleDownloadPDF}
                className="px-3.5 py-2 bg-navy-50 dark:bg-navy-900/70 hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-600/60 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                title="Descargar reporte PDF del día"
              >
                <FileDown className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                <span>Resumen PDF Diario</span>
              </button>
            </div>
          </div>

          {!activeSession ? (
            <div className="flex flex-col sm:flex-row items-end gap-4 bg-slate-50 dark:bg-[#12233B] p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#243D63]">
              <div className="space-y-1 w-full sm:max-w-xs text-xs">
                <label className="text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  Fondo de Apertura ({companyInfo.currencySymbol})
                </label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={e => this.setState({ openingBalance: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                />
              </div>
              <button
                onClick={() => openCash(openingBalance)}
                className="px-5 py-2.5 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Abrir Turno de Caja
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              {/* Movimientos rápidos */}
              <div className="space-y-2">
                <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Registrar Arqueo (Ajuste)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => this.setState({ movementType: 'income' })}
                    className={`py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                      movementType === 'income'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Entrada Cash
                  </button>
                  <button
                    onClick={() => this.setState({ movementType: 'expense' })}
                    className={`py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                      movementType === 'expense'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Egreso / Retiro
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="number"
                    placeholder="Monto"
                    value={movementAmount || ''}
                    onChange={e => this.setState({ movementAmount: Number(e.target.value) })}
                    className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Motivo / Detalle"
                    value={movementReason}
                    onChange={e => this.setState({ movementReason: e.target.value })}
                    className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                  />
                </div>
                <button
                  onClick={() => {
                    if (movementAmount <= 0 || !movementReason) {
                      alert('Ingresa monto y motivo válido.');
                      return;
                    }
                    addCashMovement(movementType, movementAmount, movementReason);
                    this.setState({ movementAmount: 0, movementReason: '' });
                  }}
                  className="w-full bg-navy-50 dark:bg-navy-900/60 border border-navy-200 dark:border-navy-600/60 hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-800 dark:text-navy-200 py-1.5 rounded-lg font-bold transition-all cursor-pointer mt-1"
                >
                  Aplicar Ajuste de Caja
                </button>
              </div>

              {/* Listado de movimientos de la sesión */}
              <div className="space-y-2">
                <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Bitácora de Sesión
                </span>
                <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#12233B] p-2.5 rounded-lg border border-slate-200 dark:border-[#243D63]">
                  {movements.length === 0 ? (
                    <span className="text-slate-400 italic block py-3 text-center font-sans">
                      Sin ingresos ni egresos extra en caja.
                    </span>
                  ) : (
                    movements.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between border-b border-slate-200/70 dark:border-[#1E3354] pb-1 last:border-none"
                      >
                        <span className="text-slate-600 dark:text-slate-300 font-sans truncate pr-2">{m.reason}</span>
                        <span
                          className={
                            m.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-rose-600 dark:text-rose-400 font-bold'
                          }
                        >
                          {m.type === 'income' ? '+' : '-'}
                          {CurrencyFormatter.format(m.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Corte final de caja */}
              <div className="space-y-2">
                <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Corte Final / Cierre
                </span>
                <div className="space-y-1.5">
                  <input
                    type="number"
                    placeholder="Efectivo Real en Caja"
                    value={closingBalance || ''}
                    onChange={e => this.setState({ closingBalance: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Notas de arqueo..."
                    value={closeNotes}
                    onChange={e => this.setState({ closeNotes: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                  />
                </div>
                <button
                  onClick={() => {
                    closeCash(closingBalance, closeNotes);
                    this.setState({ closingBalance: 0, closeNotes: '' });
                  }}
                  className="w-full bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
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
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                  <span>Elegir Servicios</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {services.map(s => {
                    const sm = ModelFactory.createService(s);
                    return (
                      <button
                        key={sm.id}
                        onClick={() => this.handleAddItemToCart(s, 'service')}
                        className="p-3.5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] hover:border-navy-700 dark:hover:border-navy-400 hover:bg-navy-50/40 dark:hover:bg-[#12233B] rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between h-24 shadow-xs"
                      >
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate block max-w-full">
                          {sm.name}
                        </span>
                        <div className="flex justify-between items-center mt-2 w-full">
                          <span className="text-[10px] text-slate-400 font-mono">{sm.duration}m</span>
                          <span className="text-xs font-black text-navy-800 dark:text-navy-300 font-mono">
                            {CurrencyFormatter.format(sm.price)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PRODUCTOS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                  <span>Elegir Productos</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableProducts.map(p => {
                    const pm = ModelFactory.createProduct(p);
                    return (
                      <button
                        key={pm.id}
                        onClick={() => this.handleAddItemToCart(p, 'product')}
                        disabled={pm.isOutOfStock()}
                        className="p-3.5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] hover:border-navy-700 dark:hover:border-navy-400 hover:bg-navy-50/40 dark:hover:bg-[#12233B] disabled:opacity-40 disabled:hover:border-slate-200 dark:disabled:hover:border-[#1E3354] disabled:cursor-not-allowed rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between h-24 shadow-xs"
                      >
                        <div className="w-full">
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate block max-w-full">
                            {pm.name}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate font-mono">SKU: {pm.sku}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2 w-full">
                          <span
                            className={`text-[10px] font-bold font-mono ${
                              pm.isCriticalStock()
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {pm.stock} pz
                          </span>
                          <span className="text-xs font-black text-navy-800 dark:text-navy-300 font-mono">
                            {CurrencyFormatter.format(pm.price)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CHECKOUT CART PANEL */}
            <div className="lg:col-span-5">
              <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl space-y-4 shadow-sm">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                    <span>Ticket de Cobro</span>
                  </h3>
                  <span className="bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-navy-200 dark:border-navy-700/60 uppercase font-mono">
                    {cart.length} ítems
                  </span>
                </div>

                {/* CART LINES */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 space-y-1">
                      <ShoppingCart className="w-6 h-6 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Canasta vacía</p>
                      <p className="text-[11px] text-slate-400">
                        Agrega productos o servicios haciendo clic en el catálogo de la izquierda.
                      </p>
                    </div>
                  ) : (
                    cart.map((line, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg flex justify-between items-center text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white block truncate max-w-[180px]">
                            {line.itemName}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block capitalize font-mono">
                            {line.itemType} — {line.quantity} pz × {CurrencyFormatter.format(line.price)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                            {CurrencyFormatter.format(line.price * line.quantity)}
                          </span>
                          <button
                            onClick={() => this.handleRemoveFromCart(line.itemId, line.itemType)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-all cursor-pointer"
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
                  <form
                    onSubmit={this.handleCheckout}
                    className="space-y-3.5 border-t border-slate-100 dark:border-[#1E3354] pt-4 text-xs"
                  >
                    {/* CLIENTE */}
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                        Cliente Receptor *
                      </label>
                      <select
                        required
                        value={selectedClientId}
                        onChange={e => this.setState({ selectedClientId: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      >
                        <option value="">-- Elige Cliente --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.fullName} ({c.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* BARBERO COMISIÓN */}
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                        Barbero Asignado (Recibe Comisión) *
                      </label>
                      <select
                        required
                        value={selectedBarberId}
                        onChange={e => this.setState({ selectedBarberId: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      >
                        <option value="">-- Elige Barbero --</option>
                        {activeBarbers.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* METODO DE PAGO Y TIPO DE PAGO */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1E3354]">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                        Tipo y Método de Pago *
                      </label>

                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => this.setState({ paymentMethod: 'cash' })}
                          className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            paymentMethod === 'cash'
                              ? 'bg-navy-800 dark:bg-navy-600 border-navy-800 dark:border-navy-500 text-white'
                              : 'bg-slate-50 dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-600 dark:text-slate-300 hover:border-navy-400'
                          }`}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Efectivo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => this.setState({ paymentMethod: 'transfer' })}
                          className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            paymentMethod === 'transfer'
                              ? 'bg-navy-800 dark:bg-navy-600 border-navy-800 dark:border-navy-500 text-white'
                              : 'bg-slate-50 dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-600 dark:text-slate-300 hover:border-navy-400'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pago QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => this.setState({ paymentMethod: 'card' })}
                          className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            paymentMethod === 'card'
                              ? 'bg-navy-800 dark:bg-navy-600 border-navy-800 dark:border-navy-500 text-white'
                              : 'bg-slate-50 dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-600 dark:text-slate-300 hover:border-navy-400'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Tarjeta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => this.setState({ paymentMethod: 'mixed' })}
                          className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            paymentMethod === 'mixed'
                              ? 'bg-navy-800 dark:bg-navy-600 border-navy-800 dark:border-navy-500 text-white'
                              : 'bg-slate-50 dark:bg-[#12233B] border-slate-200 dark:border-[#243D63] text-slate-600 dark:text-slate-300 hover:border-navy-400'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Mixto</span>
                        </button>
                      </div>

                      {paymentMethod === 'cash' && (
                        <div className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] p-3 rounded-xl space-y-2 mt-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-600 dark:text-slate-300 font-bold uppercase">
                              Monto Recibido ({companyInfo.currencySymbol})
                            </span>
                            <span className="text-slate-400">Calculador de Vuelto</span>
                          </div>

                          <input
                            type="number"
                            placeholder={`Ej. ${cartTotal.toFixed(2)}`}
                            value={cashReceived}
                            onChange={e => this.setState({ cashReceived: e.target.value })}
                            className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-900 dark:text-white font-mono font-extrabold text-sm focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                          />

                          <div className="flex gap-1 flex-wrap pt-1">
                            {[cartTotal, 20, 50, 100, 200].map(amount => (
                              <button
                                key={amount}
                                type="button"
                                onClick={() => this.setState({ cashReceived: String(amount) })}
                                className="px-2 py-1 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] hover:border-navy-500 text-slate-700 dark:text-slate-200 font-mono text-[10px] rounded font-bold cursor-pointer transition-all"
                              >
                                {amount === cartTotal ? 'Exacto' : `${amount} ${companyInfo.currencySymbol}`}
                              </button>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-[#1E3354] text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Vuelto / Cambio a Entregar:</span>
                            <span
                              className={`font-mono font-black text-sm ${
                                changeGivenVal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {CurrencyFormatter.format(changeGivenVal)}
                            </span>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'transfer' && (
                        <div className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] p-3 rounded-xl text-center space-y-2 mt-2">
                          <div className="w-28 h-28 bg-white p-2 rounded-xl mx-auto shadow-md flex items-center justify-center">
                            <img
                              src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BarberiaJosuePagoQR"
                              alt="QR Pago"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-sans">
                            Muestra este QR al cliente para transferir{' '}
                            <strong className="font-mono text-navy-800 dark:text-navy-300">
                              {CurrencyFormatter.format(cartTotal)}
                            </strong>{' '}
                            directamente a la cuenta institucional.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* PROPINA */}
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                        Propina Extra ({companyInfo.currencySymbol})
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={tip || ''}
                        onChange={e => this.setState({ tip: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                    </div>

                    {/* IMPORTES TOTALES */}
                    <div className="p-3.5 bg-navy-900 dark:bg-[#081326] border border-navy-800 dark:border-[#243D63] rounded-xl space-y-1.5 font-semibold text-white">
                      <div className="flex justify-between text-xs">
                        <span className="text-navy-200">Subtotal</span>
                        <span className="text-slate-100 font-mono">{CurrencyFormatter.format(cartSubtotal)}</span>
                      </div>
                      {tip > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-navy-200">Propina</span>
                          <span className="text-emerald-400 font-mono">+{CurrencyFormatter.format(tip)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t border-navy-700/80 pt-1.5 font-black">
                        <span className="text-white">TOTAL A COBRAR</span>
                        <span className="text-navy-200 font-mono">{CurrencyFormatter.format(cartTotal)}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-3.5 rounded-xl font-extrabold tracking-wide transition-all cursor-pointer text-xs shadow-md flex items-center justify-center gap-2"
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
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl p-6 shadow-sm space-y-4 text-slate-800 dark:text-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1E3354]">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-navy-700 dark:text-navy-300 stroke-[2.2]" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                Historial de Ventas & Comprobantes Generados
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={this.handleDownloadPDF}
                className="px-3 py-1.5 bg-navy-50 dark:bg-navy-900/70 hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-600/60 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <FileDown className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                <span>Descargar Reporte PDF</span>
              </button>
              <span className="text-[10px] bg-slate-100 dark:bg-[#12233B] text-slate-600 dark:text-slate-300 font-bold px-2.5 py-1 rounded-md font-mono">
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
                  <tr className="border-b border-slate-200 dark:border-[#1E3354] text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider bg-slate-50/70 dark:bg-[#12233B]">
                    <th className="py-2.5 px-3">Folio</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Método</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3354] font-medium text-slate-700 dark:text-slate-200">
                  {sales.map(sale => {
                    const saleModel = ModelFactory.createSale(sale);
                    const client = clients.find(c => c.id === sale.clientId);
                    return (
                      <tr key={saleModel.id} className="hover:bg-slate-50 dark:hover:bg-[#12233B]/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{saleModel.id}</td>
                        <td className="py-3 px-3 font-sans text-slate-500 dark:text-slate-400">
                          {new Date(sale.createdAt || Date.now()).toLocaleDateString('es-BO')}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                          {client?.fullName || 'Cliente General'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-700/60 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-navy-800 dark:text-navy-300">
                          {saleModel.total.toFixed(2)} {companyInfo.currencySymbol}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => this.setState({ viewHistoryReceipt: sale })}
                            className="px-3 py-1 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <Receipt className="w-3 h-3 text-navy-200" />
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
            onClose={() => this.setState({ printedReceipt: null, viewHistoryReceipt: null })}
          />
        )}
      </div>
    );
  }
}
