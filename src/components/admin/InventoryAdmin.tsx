/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/helpers';
import { Package, Plus, AlertTriangle, ArrowDown, ArrowUp, Truck, Tag, RefreshCw } from 'lucide-react';

export const InventoryAdmin: React.FC = () => {
  const {
    products,
    providers,
    addProduct,
    adjustProductStock,
    selectedBranchId,
  } = useApp();

  // ADD NEW PRODUCT FORM STATE
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(3);
  const [selectedProviderId, setSelectedProviderId] = useState('');

  // ADJUSTMENT DRAWER
  const [selectedProdId, setSelectedProdId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Reabastecimiento');

  const branchProducts = products.filter(p => p.branchId === selectedBranchId);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !category || !selectedProviderId) {
      alert('Todos los campos con asterisco son obligatorios.');
      return;
    }

    try {
      addProduct({
        tenantId: 'tenant-1',
        branchId: selectedBranchId,
        providerId: selectedProviderId,
        name,
        sku,
        category,
        price,
        stock,
        minStock,
        active: true,
      });

      // Reset
      setName('');
      setSku('');
      setCategory('');
      setPrice(0);
      setStock(10);
      setMinStock(3);
      setSelectedProviderId('');
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Error al agregar producto.');
    }
  };

  const handleApplyAdjustment = () => {
    if (!selectedProdId || adjustQty === 0) return;
    adjustProductStock(selectedProdId, adjustQty, adjustReason);
    setSelectedProdId(null);
    setAdjustQty(0);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Almacén & Control de Insumos</h2>
          <span className="text-[10px] text-slate-500 block">Monitoreo de stock, mermas, órdenes de suministro y proveedores.</span>
        </div>

        <button
          onClick={() => {
            if (providers.length === 0) {
              alert('Debes registrar al menos un proveedor antes de agregar insumos.');
              return;
            }
            setSelectedProviderId(providers[0].id);
            setShowAddForm(true);
          }}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Producto</span>
        </button>
      </div>

      {/* BODY INVENTARIO CONTENEDORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* TABLA PRINCIPAL DE INVENTARIOS */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Existencias en Almacén</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/20 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3.5 pl-5">Insumo / Detalle</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5 text-center">Stock Real</th>
                  <th className="p-3.5 text-right">Inversión</th>
                  <th className="p-3.5 pr-5 text-right">Ajustes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-650">
                {branchProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400">
                      No hay insumos registrados en esta sucursal.
                    </td>
                  </tr>
                ) : (
                  branchProducts.map(p => {
                    const isCritical = p.stock <= p.minStock;
                    const isNoStock = p.stock <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="p-3.5 pl-5">
                          <div className="flex gap-2.5 items-center">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                              <Package className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-800 block">{p.name}</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase font-bold border border-indigo-100 mt-0.5 inline-block">
                                {p.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{p.sku}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded font-black font-mono text-xs ${
                            isNoStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isCritical
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {p.stock} pz
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-700 font-mono">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => setSelectedProdId(p.id)}
                            className="px-2.5 py-1 bg-white hover:border-indigo-500 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Ajustar
                          </button>
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
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4.5 h-4.5 text-indigo-600" />
                <span>Directorio Proveedores</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {providers.map(prov => (
                <div key={prov.id} className="p-3 bg-slate-50/50 border border-slate-200 rounded-lg text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-slate-800">{prov.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{prov.contactName}</span>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-slate-500 text-[11px] leading-relaxed">
                    <p>📞 Tel: {prov.phone}</p>
                    <p>✉️ Correo: {prov.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL AJUSTAR STOCK RÁPIDO */}
      {selectedProdId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl relative text-xs text-slate-600">
            <div className="h-1 bg-indigo-600 w-full" />
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Ajuste de Existencias</h3>
                <button
                  onClick={() => setSelectedProdId(null)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded transition-all cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-slate-500 leading-normal">
                  Modifica las piezas registradas de <strong>{products.find(p => p.id === selectedProdId)?.name}</strong> en almacén. Usa signos negativos para mermas/pérdidas.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px] block">Piezas a Ajustar</label>
                    <input
                      type="number"
                      placeholder="Ej. +10 o -2"
                      value={adjustQty || ''}
                      onChange={(e) => setAdjustQty(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 text-center font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px] block">Motivo Ajuste</label>
                    <select
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none"
                    >
                      <option value="Reabastecimiento">Reabastecimiento (+)</option>
                      <option value="Merma de Producto">Merma / Pérdida (-)</option>
                      <option value="Auditoría Interna">Auditoría General</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleApplyAdjustment}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold transition-all cursor-pointer text-xs mt-4 shadow-md shadow-indigo-600/10"
              >
                Aplicar Ajuste de Almacén
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR NUEVO INSUMO */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateProduct} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-xs">
            <div className="h-1 bg-indigo-600 w-full" />
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Registrar Nuevo Insumo</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded transition-all cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-slate-600">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Nombre Producto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Gel Fijador Oud"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-805 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">SKU *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. BARB-GEL-01"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Categoría Insumo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Cuidado de Barba"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Proveedor *</label>
                    <select
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none"
                    >
                      {providers.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Precio ($ MXN)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Stock Inicial</label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-bold uppercase text-[9px]">Stock Mínimo</label>
                    <input
                      type="number"
                      value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer text-xs mt-4 shadow-md shadow-indigo-600/10"
              >
                Registrar Producto en Almacén
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
