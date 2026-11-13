/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { CurrencyFormatter } from '../../utils/helpers';
import { ModelFactory } from '../../models/DomainModels';
import { Package, Plus, Truck, Edit, Trash2 } from 'lucide-react';
import { Product } from '../../types';

interface InventoryAdminState {
  isModalOpen: boolean;
  editingProduct: Product | null;
  name: string;
  sku: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  selectedProviderId: string;
  selectedProdId: string | null;
  adjustQty: number;
  adjustReason: string;
}

export class InventoryAdmin extends BaseAppComponent<{}, InventoryAdminState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      isModalOpen: false,
      editingProduct: null,
      name: '',
      sku: '',
      category: '',
      cost: 0,
      price: 0,
      stock: 10,
      minStock: 3,
      selectedProviderId: '',
      selectedProdId: null,
      adjustQty: 0,
      adjustReason: 'Reabastecimiento',
    };
  }

  private get isAdmin(): boolean {
    return this.app.currentRole === 'admin';
  }

  private openAddModal = (): void => {
    if (!this.isAdmin) return;
    const { providers } = this.app;
    if (providers.length === 0) {
      alert('Debes registrar al menos un proveedor antes de agregar insumos.');
      return;
    }
    this.setState({
      editingProduct: null,
      name: '',
      sku: '',
      category: '',
      cost: 30,
      price: 50,
      stock: 10,
      minStock: 3,
      selectedProviderId: providers[0].id,
      isModalOpen: true,
    });
  };

  private openEditModal = (prod: Product): void => {
    if (!this.isAdmin) return;
    this.setState({
      editingProduct: prod,
      name: prod.name || '',
      sku: prod.sku || '',
      category: prod.category || '',
      cost: prod.cost || 0,
      price: prod.price || 0,
      stock: prod.stock ?? 0,
      minStock: prod.minStock ?? 0,
      selectedProviderId: prod.providerId || '',
      isModalOpen: true,
    });
  };

  private handleDeleteProduct = (id: string): void => {
    if (!this.isAdmin) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto del inventario?')) {
      this.app.deleteProduct(id);
    }
  };

  private handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!this.isAdmin) return;

    const { editingProduct, name, sku, category, cost, price, stock, minStock, selectedProviderId } = this.state;
    const { updateProduct, addProduct, selectedBranchId } = this.app;

    if (!name || !sku || !category || !selectedProviderId) {
      alert('Todos los campos con asterisco son obligatorios.');
      return;
    }

    try {
      if (editingProduct) {
        updateProduct(editingProduct.id, {
          name,
          sku,
          category,
          cost,
          price,
          stock,
          minStock,
          providerId: selectedProviderId,
        });
      } else {
        addProduct({
          branchId: selectedBranchId,
          providerId: selectedProviderId,
          name,
          sku,
          category,
          cost,
          price,
          stock,
          minStock,
          active: true,
        } as any);
      }

      this.setState({ isModalOpen: false });
    } catch (err: any) {
      alert(err.message || 'Error al guardar producto.');
    }
  };

  private handleApplyAdjustment = (): void => {
    const { selectedProdId, adjustQty, adjustReason } = this.state;
    if (!selectedProdId || adjustQty === 0) return;
    this.app.adjustProductStock(selectedProdId, adjustQty, adjustReason);
    this.setState({ selectedProdId: null, adjustQty: 0 });
  };

  public render(): React.ReactNode {
    const { products, providers, selectedBranchId } = this.app;
    const {
      isModalOpen,
      editingProduct,
      name,
      sku,
      category,
      cost,
      price,
      stock,
      minStock,
      selectedProviderId,
      selectedProdId,
      adjustQty,
      adjustReason,
    } = this.state;

    const isCurrentRoleAdmin = this.isAdmin;
    const branchProducts = products.filter(p => p.branchId === selectedBranchId);

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* HEADER CONTROLES */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] p-4 rounded-xl shadow-sm">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Almacén & Control de Insumos</h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Monitoreo de stock, mermas, órdenes de suministro y proveedores.
            </span>
          </div>

          {isCurrentRoleAdmin && (
            <button
              onClick={this.openAddModal}
              className="w-full sm:w-auto px-4 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Producto</span>
            </button>
          )}
        </div>

        {/* BODY INVENTARIO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* TABLA PRINCIPAL DE INVENTARIOS */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl overflow-hidden shadow-sm text-xs">
            <div className="p-4 border-b border-slate-200 dark:border-[#1E3354] bg-slate-50/70 dark:bg-[#12233B] flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                Existencias en Almacén
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                {isCurrentRoleAdmin ? 'Modo: Administrador (CRUD disponible)' : 'Modo: Vista de Lectura'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#1E3354] bg-slate-50/40 dark:bg-[#0A1526] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3.5 pl-5">Insumo / Detalle</th>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5 text-center">Stock Real</th>
                    <th className="p-3.5 text-right">P. Compra</th>
                    <th className="p-3.5 text-right">P. Venta</th>
                    <th className="p-3.5 text-center">Margen %</th>
                    <th className="p-3.5 pr-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3354] text-slate-700 dark:text-slate-200">
                  {branchProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        No hay insumos registrados en esta sucursal.
                      </td>
                    </tr>
                  ) : (
                    branchProducts.map(p => {
                      const pm = ModelFactory.createProduct(p);
                      const isCritical = pm.isCriticalStock();
                      const isNoStock = pm.isOutOfStock();
                      const profitMargin = pm.getProfitMargin();

                      return (
                        <tr key={pm.id} className="hover:bg-slate-50 dark:hover:bg-[#12233B]/70 transition-all">
                          <td className="p-3.5 pl-5">
                            <div className="flex gap-2.5 items-center">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] flex items-center justify-center text-navy-700 dark:text-navy-300 shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-white block">{pm.name}</span>
                                <span className="text-[10px] bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 px-1.5 py-0.5 rounded uppercase font-bold border border-navy-200 dark:border-navy-700/60 mt-0.5 inline-block">
                                  {pm.category}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{pm.sku}</td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-black font-mono text-xs ${
                                isNoStock
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                  : isCritical
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              }`}
                            >
                              {pm.stock} pz
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-medium text-slate-600 dark:text-slate-300 font-mono">
                            {CurrencyFormatter.format(pm.cost)}
                          </td>
                          <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                            {CurrencyFormatter.format(pm.price)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="text-[10px] font-mono font-bold bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 px-1.5 py-0.5 rounded border border-navy-200 dark:border-navy-700/60">
                              +{profitMargin.toFixed(0)}%
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isCurrentRoleAdmin ? (
                                <>
                                  <button
                                    onClick={() => this.setState({ selectedProdId: pm.id })}
                                    className="px-2 py-1 bg-white dark:bg-[#12233B] hover:border-navy-600 dark:hover:border-navy-400 text-navy-800 dark:text-navy-200 rounded-lg border border-slate-200 dark:border-[#243D63] text-[10px] font-bold transition-all cursor-pointer"
                                    title="Ajustar Stock"
                                  >
                                    Stock
                                  </button>
                                  <button
                                    onClick={() => this.openEditModal(p)}
                                    className="p-1 text-slate-400 hover:text-navy-700 dark:hover:text-navy-300 hover:bg-slate-100 dark:hover:bg-[#12233B] rounded transition-all cursor-pointer"
                                    title="Editar Propiedades"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => this.handleDeleteProduct(pm.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                                    title="Eliminar Producto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No disponible</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PROVEEDORES LISTADO */}
          <div className="space-y-6">
            <div className="p-5 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl space-y-4 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                  <span>Directorio Proveedores</span>
                </h3>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {providers.map(prov => (
                  <div
                    key={prov.id}
                    className="p-3 bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg text-xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-white">{prov.name}</span>
                      <span className="text-[10px] text-navy-700 dark:text-navy-300 font-bold uppercase text-right">
                        {prov.contactName}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-slate-500 dark:text-slate-300 text-[11px] leading-relaxed">
                      <p className="font-mono">Tel: {prov.phone}</p>
                      <p className="truncate">Correo: {prov.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL AJUSTAR STOCK RÁPIDO */}
        {selectedProdId && isCurrentRoleAdmin && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl relative text-xs text-slate-600 dark:text-slate-300">
              <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Ajuste de Existencias</h3>
                  <button
                    onClick={() => this.setState({ selectedProdId: null })}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-slate-500 dark:text-slate-300 leading-normal">
                    Modifica las piezas registradas de{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {products.find(p => p.id === selectedProdId)?.name}
                    </strong>{' '}
                    en almacén. Usa signos negativos para mermas/pérdidas.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] block">
                        Piezas a Ajustar
                      </label>
                      <input
                        type="number"
                        placeholder="Ej. +10 o -2"
                        value={adjustQty || ''}
                        onChange={e => this.setState({ adjustQty: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 text-center font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] block">
                        Motivo Ajuste
                      </label>
                      <select
                        value={adjustReason}
                        onChange={e => this.setState({ adjustReason: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      >
                        <option value="Reabastecimiento">Reabastecimiento (+)</option>
                        <option value="Merma de Producto">Merma / Pérdida (-)</option>
                        <option value="Auditoría Interna">Auditoría General</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  onClick={this.handleApplyAdjustment}
                  className="w-full bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-2.5 rounded-lg font-bold transition-all cursor-pointer text-xs mt-4 shadow-sm"
                >
                  Aplicar Ajuste de Almacén
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CRUD MODAL */}
        {isModalOpen && isCurrentRoleAdmin && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={this.handleSubmit}
              className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-xs"
            >
              <div className="h-1.5 bg-navy-800 dark:bg-navy-500 w-full" />

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-[#1E3354]">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingProduct ? 'Editar Insumo de Almacén' : 'Registrar Nuevo Insumo'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => this.setState({ isModalOpen: false })}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded transition-all cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-slate-600 dark:text-slate-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Nombre Producto *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Gel Fijador Oud"
                        value={name}
                        onChange={e => this.setState({ name: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">SKU *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. BARB-GEL-01"
                        value={sku}
                        onChange={e => this.setState({ sku: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Categoría Insumo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Cuidado de Barba"
                        value={category}
                        onChange={e => this.setState({ category: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Proveedor *
                      </label>
                      <select
                        value={selectedProviderId}
                        onChange={e => this.setState({ selectedProviderId: e.target.value })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                      >
                        {providers.map(prov => (
                          <option key={prov.id} value={prov.id}>
                            {prov.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Precio de Compra / Costo (Bs.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        value={cost}
                        onChange={e => this.setState({ cost: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Precio de Venta al Público (Bs.) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        value={price}
                        onChange={e => this.setState({ price: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono text-center font-bold"
                      />
                    </div>
                  </div>

                  {cost > 0 && price > 0 && (
                    <div className="p-2.5 bg-navy-50 dark:bg-[#12233B] border border-navy-200 dark:border-[#243D63] rounded-lg flex justify-between items-center text-xs">
                      <span className="text-navy-800 dark:text-navy-200 font-bold">Margen de Utilidad:</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-navy-900 dark:text-white font-black">
                          +{(((price - cost) / cost) * 100).toFixed(1)}%
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          Ganancia: +{CurrencyFormatter.format(price - cost)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Stock Real *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={stock}
                        onChange={e => this.setState({ stock: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono text-center"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">
                        Stock Mínimo Alerta *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={minStock}
                        onChange={e => this.setState({ minStock: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-lg p-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-slate-100 dark:border-[#1E3354] pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => this.setState({ isModalOpen: false })}
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-[#243D63] hover:bg-slate-50 dark:hover:bg-[#12233B] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white py-2 rounded-lg font-bold transition-all cursor-pointer text-xs shadow-sm"
                  >
                    {editingProduct ? 'Guardar Cambios' : 'Registrar Insumo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }
}
