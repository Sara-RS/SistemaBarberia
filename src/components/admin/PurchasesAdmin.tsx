/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BaseAppComponent } from '../../context/AppContext';
import { ModelFactory, PurchaseItemModel } from '../../models/DomainModels';
import { CurrencyFormatter, DateTimeHelper } from '../../utils/helpers';
import {
  ShoppingCart,
  Plus,
  Truck,
  Package,
  DollarSign,
  TrendingUp,
  Percent,
  Search,
  Filter,
  Eye,
  Trash2,
  X,
  CheckCircle,
  FileText,
  Calendar,
  Printer,
} from 'lucide-react';
import { Purchase } from '../../types';

interface PurchaseFormItem {
  productId: string;
  isNewProduct?: boolean;
  newProductName?: string;
  newProductSku?: string;
  newProductCategory?: string;
  quantity: number;
  cost: number;
  profitMargin: number;
  salePrice: number;
  updateSalePrice: boolean;
}

interface PurchasesAdminState {
  searchTerm: string;
  selectedProviderFilter: string;
  selectedStatusFilter: string;
  isNewPurchaseModalOpen: boolean;
  selectedPurchaseDetail: Purchase | null;
  isQuickProviderModalOpen: boolean;
  quickProvName: string;
  quickProvContact: string;
  quickProvPhone: string;
  quickProvEmail: string;
  quickProvAddress: string;
  providerId: string;
  invoiceNumber: string;
  purchaseDate: string;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'credit';
  notes: string;
  status: 'completed' | 'pending';
  formItems: PurchaseFormItem[];
}

export class PurchasesAdmin extends BaseAppComponent<{}, PurchasesAdminState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      searchTerm: '',
      selectedProviderFilter: 'all',
      selectedStatusFilter: 'all',
      isNewPurchaseModalOpen: false,
      selectedPurchaseDetail: null,
      isQuickProviderModalOpen: false,
      quickProvName: '',
      quickProvContact: '',
      quickProvPhone: '',
      quickProvEmail: '',
      quickProvAddress: '',
      providerId: '',
      invoiceNumber: '',
      purchaseDate: DateTimeHelper.getTodayStr(),
      paymentMethod: 'cash',
      notes: '',
      status: 'completed',
      formItems: [],
    };
  }

  private getBranchPurchases(): Purchase[] {
    const { purchases, selectedBranchId } = this.app;
    return purchases.filter(p => !p.branchId || p.branchId === selectedBranchId);
  }

  private getFilteredPurchases(branchPurchases: Purchase[]): Purchase[] {
    const { providers } = this.app;
    const { searchTerm, selectedProviderFilter, selectedStatusFilter } = this.state;

    return branchPurchases.filter(p => {
      const pm = ModelFactory.createPurchase(p);
      const prov = providers.find(pr => pr.id === p.providerId);
      const provName = prov?.name?.toLowerCase() || '';
      const invNum = pm.invoiceNumber.toLowerCase();
      const matchSearch =
        invNum.includes(searchTerm.toLowerCase()) ||
        provName.includes(searchTerm.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchProvider = selectedProviderFilter === 'all' || p.providerId === selectedProviderFilter;
      const matchStatus = selectedStatusFilter === 'all' || pm.status === selectedStatusFilter;

      return matchSearch && matchProvider && matchStatus;
    });
  }

  private computeStats(branchPurchases: Purchase[]) {
    const totalSpent = branchPurchases.reduce((acc, p) => acc + (p.total || 0), 0);

    let totalUnits = 0;
    let totalCostVal = 0;
    let totalSaleVal = 0;

    branchPurchases.forEach(p => {
      const pm = ModelFactory.createPurchase(p);
      pm.getItemModels().forEach(itemModel => {
        totalUnits += itemModel.quantity;
        totalCostVal += itemModel.getLineSubtotal();
        totalSaleVal += itemModel.getLineProjectedRevenue();
      });
    });

    const avgMargin = totalCostVal > 0 ? ((totalSaleVal - totalCostVal) / totalCostVal) * 100 : 50;
    const activeProvidersCount = new Set(branchPurchases.map(p => p.providerId).filter(Boolean)).size;

    return {
      totalSpent,
      totalUnits,
      avgMargin,
      purchasesCount: branchPurchases.length,
      activeProvidersCount,
      totalProjectedRevenue: totalSaleVal,
      totalProjectedProfit: totalSaleVal - totalCostVal,
    };
  }

  private computeFormCalculations() {
    const { formItems } = this.state;
    let totalCost = 0;
    let totalProjectedSale = 0;
    let totalQty = 0;

    formItems.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const unitCost = Number(item.cost) || 0;
      const unitSale = Number(item.salePrice) || 0;

      totalQty += qty;
      totalCost += qty * unitCost;
      totalProjectedSale += qty * unitSale;
    });

    const totalProfit = totalProjectedSale - totalCost;
    const overallMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      totalCost,
      totalProjectedSale,
      totalProfit,
      totalQty,
      overallMargin,
    };
  }

  private handleOpenNewPurchase = (): void => {
    const { currentRole, providers, products, selectedBranchId } = this.app;
    if (currentRole !== 'admin') return;

    if (providers.length === 0) {
      this.setState({ isQuickProviderModalOpen: true });
      return;
    }

    const branchPurchases = this.getBranchPurchases();
    const defaultProvId = providers[0]?.id || '';
    const nextSeq = branchPurchases.length + 1;
    const firstProduct = products.find(p => p.branchId === selectedBranchId) || products[0];

    let initialItems: PurchaseFormItem[];
    if (firstProduct) {
      const pm = ModelFactory.createProduct(firstProduct);
      const initialCost = pm.cost || Math.round(pm.price * 0.5) || 50;
      const initialMargin = 60;
      const initialSale = Math.round(initialCost * (1 + initialMargin / 100));
      initialItems = [
        {
          productId: pm.id,
          quantity: 10,
          cost: initialCost,
          profitMargin: initialMargin,
          salePrice: initialSale,
          updateSalePrice: true,
        },
      ];
    } else {
      initialItems = [
        {
          productId: 'new',
          isNewProduct: true,
          newProductName: 'Nuevo Producto Barbería',
          newProductSku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          newProductCategory: 'Estilizado',
          quantity: 10,
          cost: 50,
          profitMargin: 60,
          salePrice: 80,
          updateSalePrice: true,
        },
      ];
    }

    this.setState({
      providerId: defaultProvId,
      invoiceNumber: `COM-${new Date().getFullYear()}-${String(nextSeq).padStart(3, '0')}`,
      purchaseDate: DateTimeHelper.getTodayStr(),
      paymentMethod: 'transfer',
      notes: '',
      status: 'completed',
      formItems: initialItems,
      isNewPurchaseModalOpen: true,
    });
  };

  private handleAddItemRow = (): void => {
    const { products, selectedBranchId } = this.app;
    const defaultProduct = products.find(p => p.branchId === selectedBranchId) || products[0];

    if (defaultProduct) {
      const pm = ModelFactory.createProduct(defaultProduct);
      const cost = pm.cost || Math.round(pm.price * 0.5) || 50;
      const margin = 50;
      const sale = Math.round(cost * (1 + margin / 100));
      this.setState(prevState => ({
        formItems: [
          ...prevState.formItems,
          {
            productId: pm.id,
            quantity: 5,
            cost,
            profitMargin: margin,
            salePrice: sale,
            updateSalePrice: true,
          },
        ],
      }));
    } else {
      this.setState(prevState => ({
        formItems: [
          ...prevState.formItems,
          {
            productId: 'new',
            isNewProduct: true,
            newProductName: 'Producto Nuevo',
            newProductSku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            newProductCategory: 'Insumo',
            quantity: 5,
            cost: 30,
            profitMargin: 50,
            salePrice: 45,
            updateSalePrice: true,
          },
        ],
      }));
    }
  };

  private handleUpdateItemField = (index: number, field: keyof PurchaseFormItem, value: any): void => {
    const { products } = this.app;

    this.setState(prevState => {
      const updated = [...prevState.formItems];
      const current = { ...updated[index], [field]: value };

      if (field === 'productId') {
        if (value === 'new') {
          current.isNewProduct = true;
          current.newProductName = current.newProductName || 'Nuevo Producto';
          current.newProductSku = current.newProductSku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
          current.newProductCategory = current.newProductCategory || 'Estilizado';
        } else {
          current.isNewProduct = false;
          const foundProd = products.find(p => p.id === value);
          if (foundProd) {
            const pm = ModelFactory.createProduct(foundProd);
            current.cost = pm.cost || Math.round(pm.price * 0.5) || 40;
            current.salePrice = pm.price || Math.round(current.cost * 1.5);
            current.profitMargin =
              current.cost > 0
                ? Number((((current.salePrice - current.cost) / current.cost) * 100).toFixed(1))
                : 50;
          }
        }
      }

      if (field === 'cost') {
        const costNum = Number(value) || 0;
        current.cost = costNum;
        if (current.profitMargin !== undefined && costNum > 0) {
          current.salePrice = Number((costNum * (1 + current.profitMargin / 100)).toFixed(2));
        }
      }

      if (field === 'profitMargin') {
        const marginNum = Number(value) || 0;
        current.profitMargin = marginNum;
        if (current.cost > 0) {
          current.salePrice = Number((current.cost * (1 + marginNum / 100)).toFixed(2));
        }
      }

      if (field === 'salePrice') {
        const saleNum = Number(value) || 0;
        current.salePrice = saleNum;
        if (current.cost > 0) {
          current.profitMargin = Number((((saleNum - current.cost) / current.cost) * 100).toFixed(1));
        }
      }

      updated[index] = current;
      return { formItems: updated };
    });
  };

  private handleApplyMarginPreset = (index: number, marginPercent: number): void => {
    this.handleUpdateItemField(index, 'profitMargin', marginPercent);
  };

  private handleRemoveItemRow = (index: number): void => {
    if (this.state.formItems.length <= 1) {
      alert('La compra debe contener al menos un producto.');
      return;
    }
    this.setState(prevState => ({
      formItems: prevState.formItems.filter((_, i) => i !== index),
    }));
  };

  private handleSubmitPurchase = (e: React.FormEvent): void => {
    e.preventDefault();
    const { selectedBranchId, addProduct, addPurchase } = this.app;
    const { providerId, formItems, invoiceNumber, purchaseDate, status, paymentMethod, notes } = this.state;

    if (!providerId) {
      alert('Seleccione un proveedor para la compra.');
      return;
    }

    if (formItems.length === 0) {
      alert('Agregue al menos un producto a la compra.');
      return;
    }

    const preparedItems: {
      productId: string;
      quantity: number;
      cost: number;
      profitMargin: number;
      salePrice: number;
      updateSalePrice: boolean;
    }[] = [];

    for (const item of formItems) {
      if (item.quantity <= 0 || item.cost <= 0) {
        alert('La cantidad y el precio de costo deben ser mayores a 0.');
        return;
      }

      let finalProductId = item.productId;

      if (item.isNewProduct || item.productId === 'new') {
        const prodName = item.newProductName?.trim() || 'Producto Nuevo';
        const prodSku = item.newProductSku?.trim() || `SKU-${Date.now().toString().slice(-4)}`;
        const prodCategory = item.newProductCategory || 'Insumo';

        const createdProd = addProduct({
          branchId: selectedBranchId,
          providerId,
          name: prodName,
          sku: prodSku,
          category: prodCategory,
          cost: item.cost,
          price: item.salePrice,
          stock: 0,
          minStock: 3,
          active: true,
        });

        finalProductId = createdProd.id;
      }

      preparedItems.push({
        productId: finalProductId,
        quantity: Number(item.quantity),
        cost: Number(item.cost),
        profitMargin: Number(item.profitMargin) || 0,
        salePrice: Number(item.salePrice) || Number(item.cost) * 1.5,
        updateSalePrice: item.updateSalePrice,
      });
    }

    try {
      const createdPurchase = addPurchase(
        {
          branchId: selectedBranchId,
          providerId,
          invoiceNumber: invoiceNumber.trim() || `FAC-${Date.now()}`,
          date: purchaseDate,
          status,
          paymentMethod,
          notes: notes.trim(),
        },
        preparedItems
      );

      this.setState({
        isNewPurchaseModalOpen: false,
        selectedPurchaseDetail: createdPurchase,
      });
    } catch (err: any) {
      alert(err.message || 'Error al registrar la compra.');
    }
  };

  private handleCreateQuickProvider = (e: React.FormEvent): void => {
    e.preventDefault();
    const {
      quickProvName,
      quickProvContact,
      quickProvPhone,
      quickProvEmail,
      quickProvAddress,
    } = this.state;

    if (!quickProvName.trim() || !quickProvPhone.trim()) {
      alert('Nombre del Proveedor y Teléfono son obligatorios.');
      return;
    }

    try {
      this.app.addProvider({
        name: quickProvName.trim(),
        contactName: quickProvContact.trim() || quickProvName.trim(),
        phone: quickProvPhone.trim(),
        email: quickProvEmail.trim(),
        address: quickProvAddress.trim() || 'Bolivia',
      });

      this.setState({
        quickProvName: '',
        quickProvContact: '',
        quickProvPhone: '',
        quickProvEmail: '',
        quickProvAddress: '',
        isQuickProviderModalOpen: false,
        isNewPurchaseModalOpen: true,
      });
    } catch {
      alert('Error al crear proveedor.');
    }
  };

  private handleDeletePurchase = (id: string): void => {
    if (this.app.currentRole !== 'admin') return;
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de compra del historial?')) {
      this.app.deletePurchase(id);
      if (this.state.selectedPurchaseDetail?.id === id) {
        this.setState({ selectedPurchaseDetail: null });
      }
    }
  };

  public render(): React.ReactNode {
    const { products, providers, companyInfo, currentRole } = this.app;
    const {
      searchTerm,
      selectedProviderFilter,
      selectedStatusFilter,
      isNewPurchaseModalOpen,
      selectedPurchaseDetail,
      isQuickProviderModalOpen,
      quickProvName,
      quickProvContact,
      quickProvPhone,
      quickProvEmail,
      quickProvAddress,
      providerId,
      invoiceNumber,
      purchaseDate,
      paymentMethod,
      notes,
      status,
      formItems,
    } = this.state;

    const isCurrentRoleAdmin = currentRole === 'admin';
    const currency = companyInfo.currencySymbol || 'Bs.';
    const branchPurchases = this.getBranchPurchases();
    const filteredPurchases = this.getFilteredPurchases(branchPurchases);
    const stats = this.computeStats(branchPurchases);
    const formCalculations = this.computeFormCalculations();

    return (
      <div className="space-y-6 pb-12 animate-fadeIn">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0D1A2D] p-5 rounded-2xl border border-slate-200 dark:border-[#1E3354] shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-navy-800 dark:bg-navy-600 flex items-center justify-center text-white shadow-sm">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                  <span>Gestión de Compras y Abastecimiento</span>
                  <span className="bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 text-navy-800 dark:text-navy-200 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    Stock & Costos
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Registra compras a proveedores, actualiza inventario automáticamente y calcula el precio de venta según tu margen de utilidad.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isCurrentRoleAdmin && (
              <button
                onClick={this.handleOpenNewPurchase}
                className="w-full sm:w-auto px-4 py-2.5 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Nueva Compra</span>
              </button>
            )}
          </div>
        </div>

        {/* METRIC KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-bold">Total Invertido (Compras)</span>
              <DollarSign className="w-4 h-4 text-navy-700 dark:text-navy-300" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {CurrencyFormatter.format(stats.totalSpent)}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              {stats.purchasesCount} facturas/recibos registrados
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-bold">Unidades Ingresadas</span>
              <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {stats.totalUnits} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">piezas</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
              Suministros sumados al stock
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-bold">Margen Promedio Utilidad</span>
              <TrendingUp className="w-4 h-4 text-navy-700 dark:text-navy-300" />
            </div>
            <p className="text-xl font-black text-navy-800 dark:text-navy-300 font-mono tracking-tight">
              +{stats.avgMargin.toFixed(1)}%
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              Rentabilidad sobre costo de compra
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-bold">Proveedores Activos</span>
              <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {providers.length}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
              Distribuidores asociados
            </span>
          </div>
        </div>

        {/* FILTER & SEARCH BAR */}
        <div className="p-4 bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por N° factura, proveedor o nota..."
              value={searchTerm}
              onChange={e => this.setState({ searchTerm: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-xs rounded-xl pl-9 pr-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Proveedor:</span>
            </div>
            <select
              value={selectedProviderFilter}
              onChange={e => this.setState({ selectedProviderFilter: e.target.value })}
              className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 cursor-pointer"
            >
              <option value="all">Todos los Proveedores</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={e => this.setState({ selectedStatusFilter: e.target.value })}
              className="bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="completed">Completadas</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>

        {/* PURCHASES LIST TABLE */}
        <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E3354] flex justify-between items-center bg-slate-50/70 dark:bg-[#12233B]">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white">
                Historial de Compras ({filteredPurchases.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Movimientos de adquisición e ingreso de stock por proveedor
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E3354] bg-slate-50 dark:bg-[#0A1526] text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">N° Documento</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Proveedor</th>
                  <th className="p-3.5">Ítems / Detalle</th>
                  <th className="p-3.5 text-center">Forma Pago</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-right">Total Compra</th>
                  <th className="p-3.5 pr-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E3354]">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          No se encontraron compras registradas
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Usa el botón "Registrar Nueva Compra" para registrar tu primera adquisición de stock con cálculo de utilidad.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(purchase => {
                    const pm = ModelFactory.createPurchase(purchase);
                    const prov = providers.find(p => p.id === purchase.providerId);
                    const itemCount = pm.getTotalUnits();
                    const isCompleted = pm.isCompleted();

                    return (
                      <tr key={pm.id} className="hover:bg-slate-50/70 dark:hover:bg-[#12233B]/70 transition-colors">
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 flex items-center justify-center text-navy-700 dark:text-navy-300 font-black shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 dark:text-white font-mono block">
                                {pm.invoiceNumber}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">ID: {pm.id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{DateTimeHelper.formatLegible(pm.date)}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-800 dark:text-white block">
                              {prov?.name || 'Proveedor General'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Tel: {prov?.phone || 'Sin teléfono'}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-navy-50 dark:bg-navy-900/70 text-navy-800 dark:text-navy-200 border border-navy-200 dark:border-navy-700/60 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                                {itemCount} piezas
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                ({purchase.items?.length || 0} productos)
                              </span>
                            </div>
                            {purchase.items && purchase.items.length > 0 && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {purchase.items.slice(0, 2).map((item, idx) => {
                                  const prod = products.find(p => p.id === item.productId);
                                  return (
                                    <span
                                      key={idx}
                                      className="text-[9.5px] bg-slate-100 dark:bg-[#12233B] text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded truncate max-w-[130px]"
                                    >
                                      {item.quantity}x {prod?.name || 'Producto'}
                                    </span>
                                  );
                                })}
                                {purchase.items.length > 2 && (
                                  <span className="text-[9.5px] text-slate-400 font-bold">
                                    +{purchase.items.length - 2} más
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="bg-slate-100 dark:bg-[#12233B] text-slate-700 dark:text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {pm.paymentMethod === 'transfer'
                              ? 'Transferencia'
                              : pm.paymentMethod === 'card'
                              ? 'Tarjeta'
                              : pm.paymentMethod === 'credit'
                              ? 'Crédito'
                              : 'Efectivo'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isCompleted
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCompleted ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-600 dark:bg-amber-400'
                              }`}
                            />
                            {isCompleted ? 'Recibido en Almacén' : 'Pendiente'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                          {CurrencyFormatter.format(pm.total)}
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => this.setState({ selectedPurchaseDetail: purchase })}
                              className="px-2.5 py-1 bg-white dark:bg-[#12233B] hover:bg-navy-50 dark:hover:bg-navy-900/70 border border-slate-200 dark:border-[#243D63] hover:border-navy-600 dark:hover:border-navy-400 text-navy-800 dark:text-navy-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Ver Detalle y Margen de Utilidad"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detalle</span>
                            </button>

                            {isCurrentRoleAdmin && (
                              <button
                                onClick={() => this.handleDeletePurchase(pm.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                                title="Eliminar Registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

        {/* MODAL: REGISTRAR NUEVA COMPRA CON CALCULADORA DE MARGEN DE UTILIDAD */}
        {isNewPurchaseModalOpen && isCurrentRoleAdmin && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl my-auto">
              <div className="p-5 border-b border-slate-100 dark:border-[#1E3354] flex justify-between items-center bg-slate-50/80 dark:bg-[#12233B]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-navy-800 dark:bg-navy-600 text-white flex items-center justify-center shadow-sm">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Registrar Compra y Reabastecimiento de Stock
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ingresa los costos de compra; calcula y define el precio de venta público según tu margen de ganancia.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => this.setState({ isNewPurchaseModalOpen: false })}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-200/50 dark:hover:bg-[#182E4D] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={this.handleSubmitPurchase} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* SECTION 1: PROVEEDOR Y DOCUMENTO */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-2xl text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                        Proveedor *
                      </label>
                      <button
                        type="button"
                        onClick={() => this.setState({ isQuickProviderModalOpen: true })}
                        className="text-[10px] text-navy-700 dark:text-navy-300 hover:underline font-bold cursor-pointer"
                      >
                        + Nuevo Proveedor
                      </button>
                    </div>
                    <select
                      value={providerId}
                      onChange={e => this.setState({ providerId: e.target.value })}
                      required
                      className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white font-bold focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 cursor-pointer"
                    >
                      {providers.map(prov => (
                        <option key={prov.id} value={prov.id}>
                          {prov.name} ({prov.contactName || 'Contacto'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                      N° Factura / Recibo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. FAC-2026-001"
                      value={invoiceNumber}
                      onChange={e => this.setState({ invoiceNumber: e.target.value })}
                      className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white font-mono font-bold focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                      Fecha de Compra *
                    </label>
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={e => this.setState({ purchaseDate: e.target.value })}
                      className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                      Forma de Pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e =>
                        this.setState({
                          paymentMethod: e.target.value as 'cash' | 'transfer' | 'card' | 'credit',
                        })
                      }
                      className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 cursor-pointer"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia / QR</option>
                      <option value="card">Tarjeta de Débito/Crédito</option>
                      <option value="credit">Crédito Comercial Proveedor</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                      Estado de Recepción
                    </label>
                    <select
                      value={status}
                      onChange={e => this.setState({ status: e.target.value as 'completed' | 'pending' })}
                      className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 cursor-pointer"
                    >
                      <option value="completed">Completado (Aumentar Stock de Inmediato)</option>
                      <option value="pending">Pendiente de Llegada</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                      Observaciones / Lote
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Promoción 10% dcto por volumen"
                      value={notes}
                      onChange={e => this.setState({ notes: e.target.value })}
                      className="w-full bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>
                </div>

                {/* SECTION 2: PRODUCTOS CON MARGEN DE UTILIDAD */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                        <span>Ítems Adquiridos, Costos & Margen de Ganancia</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Modifica el costo o el margen (%) para ver en tiempo real el precio de venta sugerido y la utilidad estimada.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={this.handleAddItemRow}
                      className="px-3 py-1.5 bg-navy-50 dark:bg-navy-900/70 hover:bg-navy-100 dark:hover:bg-navy-800 text-navy-800 dark:text-navy-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-navy-200 dark:border-navy-600/60 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Producto</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formItems.map((item, index) => {
                      const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.cost) || 0);
                      const lineRevenue = (Number(item.quantity) || 0) * (Number(item.salePrice) || 0);
                      const lineProfit = lineRevenue - lineSubtotal;
                      const unitProfit = (Number(item.salePrice) || 0) - (Number(item.cost) || 0);

                      return (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-2xl shadow-xs space-y-3 relative"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3354] pb-2.5">
                            <span className="font-black text-[11px] text-navy-800 dark:text-navy-200 bg-navy-50 dark:bg-navy-900/70 px-2 py-0.5 rounded-md font-mono">
                              Ítem #{index + 1}
                            </span>

                            <button
                              type="button"
                              onClick={() => this.handleRemoveItemRow(index)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Quitar línea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                                Producto
                              </label>
                              <select
                                value={item.isNewProduct ? 'new' : item.productId}
                                onChange={e => this.handleUpdateItemField(index, 'productId', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                              >
                                <optgroup label="Productos en Inventario">
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} (Stock actual: {p.stock} | Costo ant: {p.cost || 'N/A'} {currency})
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Nuevo Registro">
                                  <option value="new">+ Crear Producto Nuevo en Almacén</option>
                                </optgroup>
                              </select>

                              {item.isNewProduct && (
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                  <input
                                    type="text"
                                    placeholder="Nombre del Producto..."
                                    value={item.newProductName || ''}
                                    onChange={e =>
                                      this.handleUpdateItemField(index, 'newProductName', e.target.value)
                                    }
                                    className="w-full bg-white dark:bg-[#0D1A2D] border border-navy-200 dark:border-[#243D63] rounded-lg p-1.5 text-xs text-slate-800 dark:text-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="SKU / Código..."
                                    value={item.newProductSku || ''}
                                    onChange={e =>
                                      this.handleUpdateItemField(index, 'newProductSku', e.target.value)
                                    }
                                    className="w-full bg-white dark:bg-[#0D1A2D] border border-navy-200 dark:border-[#243D63] rounded-lg p-1.5 text-xs text-slate-800 dark:text-white font-mono"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={item.quantity || ''}
                                onChange={e =>
                                  this.handleUpdateItemField(index, 'quantity', Number(e.target.value))
                                }
                                className="w-full bg-slate-50 dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2 text-xs font-mono font-bold text-center text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                                P. Compra Unit. ({currency})
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="0.1"
                                required
                                value={item.cost || ''}
                                onChange={e => this.handleUpdateItemField(index, 'cost', Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#243D63] rounded-xl p-2 text-xs font-mono font-bold text-right text-slate-900 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                              />
                            </div>

                            <div className="md:col-span-3 space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-navy-700 dark:text-navy-300 uppercase flex items-center gap-1">
                                  <Percent className="w-3 h-3" />
                                  <span>Margen Utilidad %</span>
                                </label>
                                <div className="flex gap-1">
                                  {[30, 50, 100].map(preset => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => this.handleApplyMarginPreset(index, preset)}
                                      className="text-[9px] bg-slate-100 dark:bg-[#0D1A2D] hover:bg-navy-100 dark:hover:bg-navy-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold cursor-pointer font-mono"
                                    >
                                      {preset}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input
                                type="number"
                                step="1"
                                value={item.profitMargin || ''}
                                onChange={e =>
                                  this.handleUpdateItemField(index, 'profitMargin', Number(e.target.value))
                                }
                                className="w-full bg-navy-50/70 dark:bg-navy-900/50 border border-navy-200 dark:border-navy-600/60 rounded-xl p-2 text-xs font-mono font-black text-center text-navy-800 dark:text-navy-200 focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                                placeholder="Ej. 50"
                              />
                            </div>
                          </div>

                          {/* PROFIT & SALE PRICE LIVE BAR */}
                          <div className="bg-slate-50 dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                                Precio Venta Sugerido:
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  value={item.salePrice || ''}
                                  onChange={e =>
                                    this.handleUpdateItemField(index, 'salePrice', Number(e.target.value))
                                  }
                                  className="w-24 bg-white dark:bg-[#12233B] border border-emerald-300 dark:border-emerald-700/60 rounded-lg px-2 py-1 text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 text-right focus:outline-none focus:border-emerald-500"
                                />
                                <span className="font-bold text-slate-500 dark:text-slate-400">{currency}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-[11px]">
                              <div className="text-slate-600 dark:text-slate-300">
                                Ganancia x unidad:{' '}
                                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                                  +{CurrencyFormatter.format(unitProfit)}
                                </strong>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300">
                                Subtotal Compra:{' '}
                                <strong className="font-mono text-slate-900 dark:text-white">
                                  {CurrencyFormatter.format(lineSubtotal)}
                                </strong>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300">
                                Utilidad Total Línea:{' '}
                                <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                                  +{CurrencyFormatter.format(lineProfit)}
                                </strong>
                              </div>
                            </div>

                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.updateSalePrice}
                                onChange={e =>
                                  this.handleUpdateItemField(index, 'updateSalePrice', e.target.checked)
                                }
                                className="rounded text-navy-700 focus:ring-navy-500 cursor-pointer"
                              />
                              <span>Actualizar precio en Catálogo</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FINANCIAL SUMMARY FOOTER IN MODAL */}
                <div className="p-4 bg-navy-900 dark:bg-[#06142B] border border-navy-800 dark:border-[#243D63] text-white rounded-2xl shadow-lg space-y-3">
                  <div className="flex justify-between items-center border-b border-navy-700 dark:border-[#1E3354] pb-2">
                    <span className="text-[10px] uppercase font-bold text-navy-200 tracking-wider">
                      Balance Financiero de la Compra
                    </span>
                    <span className="bg-navy-800 dark:bg-navy-900 text-navy-100 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                      {formCalculations.totalQty} unidades totales
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-navy-200 block">Total a Pagar al Proveedor</span>
                      <span className="text-lg font-black font-mono text-white">
                        {CurrencyFormatter.format(formCalculations.totalCost)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-navy-200 block">Venta Total Proyectada</span>
                      <span className="text-lg font-black font-mono text-navy-100">
                        {CurrencyFormatter.format(formCalculations.totalProjectedSale)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-300 block">Ganancia Bruta Estimada</span>
                      <span className="text-lg font-black font-mono text-emerald-400">
                        +{CurrencyFormatter.format(formCalculations.totalProfit)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-navy-200 block">Margen Ponderado Global</span>
                      <span className="text-lg font-black font-mono text-navy-300">
                        +{formCalculations.overallMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => this.setState({ isNewPurchaseModalOpen: false })}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-[#12233B] hover:bg-slate-200 dark:hover:bg-[#182E4D] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Completar y Guardar Compra</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DETALLE DE COMPRA / COMPROBANTE / MARGENES */}
        {selectedPurchaseDetail && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-auto">
              <div className="p-5 border-b border-slate-100 dark:border-[#1E3354] flex justify-between items-center bg-slate-50 dark:bg-[#12233B]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-navy-800 dark:bg-navy-600 text-white flex items-center justify-center font-black">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm">
                      Comprobante de Compra #{selectedPurchaseDetail.invoiceNumber || selectedPurchaseDetail.id}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Registrado el{' '}
                      {DateTimeHelper.formatLegible(
                        selectedPurchaseDetail.date || selectedPurchaseDetail.createdAt || ''
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => this.setState({ selectedPurchaseDetail: null })}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-200/50 dark:hover:bg-[#182E4D] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs text-slate-700 dark:text-slate-200 max-h-[75vh] overflow-y-auto">
                {(() => {
                  const prov = providers.find(p => p.id === selectedPurchaseDetail.providerId);
                  return (
                    <div className="p-3.5 bg-slate-50 dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">
                            Proveedor
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {prov?.name || 'Proveedor General'}
                          </span>
                        </div>
                        <span className="bg-navy-50 dark:bg-navy-900/70 border border-navy-200 dark:border-navy-700/60 text-navy-800 dark:text-navy-200 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                          {selectedPurchaseDetail.paymentMethod || 'Efectivo'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <p>
                          Contacto: <strong className="text-slate-700 dark:text-slate-200">{prov?.contactName || 'N/A'}</strong>
                        </p>
                        <p>
                          Teléfono: <strong className="text-slate-700 dark:text-slate-200 font-mono">{prov?.phone || 'N/A'}</strong>
                        </p>
                        <p>
                          Dirección: <strong className="text-slate-700 dark:text-slate-200">{prov?.address || 'Bolivia'}</strong>
                        </p>
                        <p>
                          Correo: <strong className="text-slate-700 dark:text-slate-200">{prov?.email || 'N/A'}</strong>
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Desglose de Productos Adquiridos y Márgenes
                  </span>

                  <div className="border border-slate-200 dark:border-[#243D63] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-[#12233B] text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-[#243D63]">
                        <tr>
                          <th className="p-2.5 pl-3">Producto</th>
                          <th className="p-2.5 text-center">Cant.</th>
                          <th className="p-2.5 text-right">P. Compra</th>
                          <th className="p-2.5 text-center">Margen %</th>
                          <th className="p-2.5 text-right">P. Venta</th>
                          <th className="p-2.5 pr-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#1E3354]">
                        {selectedPurchaseDetail.items?.map((it, idx) => {
                          const prod = products.find(p => p.id === it.productId);
                          const itemModel = new PurchaseItemModel(it);

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#12233B]/50">
                              <td className="p-2.5 pl-3">
                                <span className="font-extrabold text-slate-800 dark:text-white block">
                                  {prod?.name || 'Insumo'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {prod?.sku || 'SKU-000'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                {itemModel.quantity}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                {CurrencyFormatter.format(itemModel.cost)}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-navy-700 dark:text-navy-300">
                                +{Number(itemModel.profitMargin).toFixed(0)}%
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {CurrencyFormatter.format(itemModel.salePrice)}
                              </td>
                              <td className="p-2.5 pr-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {CurrencyFormatter.format(itemModel.getLineSubtotal())}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-navy-900 dark:bg-[#06142B] border border-navy-800 dark:border-[#243D63] text-white rounded-2xl flex justify-between items-center font-mono">
                  <div>
                    <span className="text-[10px] text-navy-200 uppercase tracking-wider block">Total Pagado</span>
                    <span className="text-xl font-black text-white">
                      {CurrencyFormatter.format(selectedPurchaseDetail.total || 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-300 uppercase tracking-wider block">
                      Estado de Stock
                    </span>
                    <span className="text-xs font-bold text-emerald-400">✓ Ingresado al Inventario</span>
                  </div>
                </div>

                {selectedPurchaseDetail.notes && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 text-[11px]">
                    <strong>Notas de compra:</strong> {selectedPurchaseDetail.notes}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-[#1E3354] flex justify-between items-center bg-slate-50 dark:bg-[#0A1526]">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-white dark:bg-[#12233B] hover:bg-slate-100 dark:hover:bg-[#182E4D] border border-slate-200 dark:border-[#243D63] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={() => this.setState({ selectedPurchaseDetail: null })}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RÁPIDO: AGREGAR NUEVO PROVEEDOR */}
        {isQuickProviderModalOpen && isCurrentRoleAdmin && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0D1A2D] border border-slate-200 dark:border-[#1E3354] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-100 dark:border-[#1E3354] flex justify-between items-center bg-slate-50 dark:bg-[#12233B]">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">Nuevo Proveedor Rápido</h3>
                </div>
                <button
                  onClick={() => this.setState({ isQuickProviderModalOpen: false })}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={this.handleCreateQuickProvider} className="p-5 space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Nombre de la Empresa / Distribuidora *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Distribuidora Barber Supply"
                    value={quickProvName}
                    onChange={e => this.setState({ quickProvName: e.target.value })}
                    className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Persona de Contacto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={quickProvContact}
                      onChange={e => this.setState({ quickProvContact: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Celular / Teléfono *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 79501111"
                      value={quickProvPhone}
                      onChange={e => this.setState({ quickProvPhone: e.target.value })}
                      className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="ventas@proveedor.com"
                    value={quickProvEmail}
                    onChange={e => this.setState({ quickProvEmail: e.target.value })}
                    className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Dirección / Ciudad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Calle Murillo #450, La Paz"
                    value={quickProvAddress}
                    onChange={e => this.setState({ quickProvAddress: e.target.value })}
                    className="w-full bg-white dark:bg-[#12233B] border border-slate-200 dark:border-[#243D63] rounded-xl p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-navy-700 dark:focus:border-navy-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => this.setState({ isQuickProviderModalOpen: false })}
                    className="px-3 py-2 bg-slate-100 dark:bg-[#12233B] hover:bg-slate-200 dark:hover:bg-[#182E4D] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-navy-800 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer"
                  >
                    Guardar Proveedor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
}
