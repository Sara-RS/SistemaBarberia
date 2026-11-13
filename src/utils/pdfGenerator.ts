import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DailyReportData {
  dateStr: string;
  companyInfo: {
    name: string;
    phone?: string;
    address?: string;
    currencySymbol: string;
  };
  branchName?: string;
  activeSession?: {
    openedAt?: string;
    openingBalance?: number;
    expectedBalance?: number;
    closedAt?: string;
    finalBalance?: number;
    notes?: string;
  } | null;
  movements?: Array<{
    type?: 'income' | 'expense' | string;
    tipo?: 'income' | 'expense' | string;
    amount?: number;
    monto?: number;
    reason?: string;
    motivo?: string;
  }>;
  salesToday: Array<{
    id: string;
    createdAt?: string;
    clientId?: string;
    employeeId?: string;
    paymentMethod?: string;
    subtotal?: number;
    tip?: number;
    total?: number;
  }>;
  clients: Array<{ id: string; fullName?: string; nombreCompleto?: string }>;
  employees: Array<{ id: string; fullName?: string; nombreCompleto?: string }>;
}

/**
 * Clase base abstracta para generadores de reportes PDF.
 */
export abstract class BasePdfReport<TData> {
  protected doc: jsPDF;
  protected currentY: number = 40;
  protected readonly primaryColor: [number, number, number] = [15, 23, 42];
  protected readonly accentColor: [number, number, number] = [217, 119, 6];
  protected readonly lightBg: [number, number, number] = [248, 250, 252];

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
  }

  protected renderBanner(title: string, subtitle: string, meta: string): void {
    this.doc.setFillColor(...this.primaryColor);
    this.doc.rect(0, 0, 210, 32, 'F');

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text(title.toUpperCase(), 14, 13);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(203, 213, 225);
    this.doc.text(subtitle, 14, 19);
    this.doc.text(meta, 14, 25);

    this.doc.setFillColor(...this.accentColor);
    this.doc.rect(0, 32, 210, 2, 'F');
    this.currentY = 40;
  }

  protected renderTimestampFooter(): void {
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(7);
    this.doc.setTextColor(148, 163, 184);
    const nowStr = new Date().toLocaleString('es-BO');
    this.doc.text(`Documento generado automáticamente por sistema el ${nowStr}`, 105, 287, { align: 'center' });
  }

  public abstract generate(data: TData): void;
}

/**
 * Generador OOP del reporte diario de transacciones y arqueo de caja.
 */
export class DailyCashReportGenerator extends BasePdfReport<DailyReportData> {
  private currency: string = 'Bs.';

  public generate(data: DailyReportData): void {
    this.currency = data.companyInfo.currencySymbol || 'Bs.';
    const branchText = data.branchName || 'Sucursal Principal';

    this.renderBanner(
      data.companyInfo.name || 'BARBERÍA JOSUÉ',
      'RESUMEN DE TRANSACCIONES Y ARQUEO DIARIO DE CAJA',
      `Sucursal: ${branchText}  |  Fecha: ${data.dateStr}`
    );

    const cashSales = this.renderExecutiveCards(data);
    this.renderCashSessionTable(data, cashSales);
    this.renderSalesTable(data);
    this.renderMovementsTable(data);
    this.renderSignatures();
    this.renderTimestampFooter();

    const safeDate = data.dateStr.replace(/[^a-zA-Z0-9-]/g, '_');
    this.doc.save(`resumen_caja_${safeDate}.pdf`);
  }

  private renderExecutiveCards(data: DailyReportData): number {
    const totalSalesAmount = data.salesToday.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalTransactionsCount = data.salesToday.length;

    const cashSales = data.salesToday
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((acc, s) => acc + (s.total || 0), 0);
    const cardSales = data.salesToday
      .filter((s) => s.paymentMethod === 'card')
      .reduce((acc, s) => acc + (s.total || 0), 0);
    const transferSales = data.salesToday
      .filter((s) => s.paymentMethod === 'transfer' || s.paymentMethod === 'qr')
      .reduce((acc, s) => acc + (s.total || 0), 0);

    const cardWidth = 43;
    const cardHeight = 22;
    const startX = 14;

    const kpis = [
      { title: 'Total Cobrado', val: `${totalSalesAmount.toFixed(2)} ${this.currency}`, color: this.primaryColor },
      { title: 'Efectivo Cash', val: `${cashSales.toFixed(2)} ${this.currency}`, color: [16, 185, 129] as [number, number, number] },
      { title: 'Tarjetas / Transf.', val: `${(cardSales + transferSales).toFixed(2)} ${this.currency}`, color: [99, 102, 241] as [number, number, number] },
      { title: 'Nº Operaciones', val: `${totalTransactionsCount} ventas`, color: this.accentColor },
    ];

    kpis.forEach((kpi, idx) => {
      const x = startX + idx * (cardWidth + 4);
      this.doc.setFillColor(...this.lightBg);
      this.doc.setDrawColor(226, 232, 240);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 2, 2, 'FD');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(kpi.title.toUpperCase(), x + 3, this.currentY + 6);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.doc.setTextColor(...kpi.color);
      this.doc.text(kpi.val, x + 3, this.currentY + 15);
    });

    this.currentY += cardHeight + 8;
    return cashSales;
  }

  private renderCashSessionTable(data: DailyReportData, cashSales: number): void {
    if (!data.activeSession) return;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.text('ESTADO Y BALANCE DE LA CAJA CHICA', 14, this.currentY);
    this.currentY += 4;

    const opening = data.activeSession.openingBalance || 0;
    const expected = data.activeSession.expectedBalance || opening + cashSales;
    const movementsNet = (data.movements || []).reduce((acc, m) => {
      const isInc = (m.type || m.tipo) === 'income';
      const amt = Number(m.amount ?? m.monto ?? 0);
      return acc + (isInc ? amt : -amt);
    }, 0);

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: 14, right: 14 },
      head: [['Fondo de Apertura', 'Ventas en Efectivo', 'Ajustes / Arqueos', 'Balance Esperado en Caja']],
      body: [
        [
          `${opening.toFixed(2)} ${this.currency}`,
          `${cashSales.toFixed(2)} ${this.currency}`,
          `${movementsNet.toFixed(2)} ${this.currency}`,
          `${expected.toFixed(2)} ${this.currency}`,
        ],
      ],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  private renderSalesTable(data: DailyReportData): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.text('DETALLE DE TRANSACCIONES Y VENTAS', 14, this.currentY);
    this.currentY += 4;

    if (data.salesToday.length === 0) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text('No hay registro de ventas ni transacciones para este día.', 14, this.currentY + 4);
      this.currentY += 12;
      return;
    }

    const totalSalesAmount = data.salesToday.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalSubtotal = data.salesToday.reduce((acc, s) => acc + (s.subtotal || 0), 0);
    const totalTips = data.salesToday.reduce((acc, s) => acc + (s.tip || 0), 0);

    const tableRows = data.salesToday.map((s) => {
      const client = data.clients.find((c) => c.id === s.clientId);
      const employee = data.employees.find((e) => e.id === s.employeeId);
      const clientName = client?.fullName || client?.nombreCompleto || 'Cliente General';
      const barberName = employee?.fullName || employee?.nombreCompleto || 'Sin Asignar';

      const dateObj = new Date(s.createdAt || Date.now());
      const timeStr = dateObj.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

      const method = s.paymentMethod || 'cash';
      const methodLabel =
        method === 'cash'
          ? 'Efectivo'
          : method === 'card'
          ? 'Tarjeta'
          : method === 'transfer'
          ? 'Transferencia QR'
          : method;

      return [
        s.id,
        timeStr,
        clientName,
        barberName,
        methodLabel,
        `${(s.subtotal || 0).toFixed(2)} ${this.currency}`,
        `${(s.tip || 0).toFixed(2)} ${this.currency}`,
        `${(s.total || 0).toFixed(2)} ${this.currency}`,
      ];
    });

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: 14, right: 14 },
      head: [['Folio', 'Hora', 'Cliente', 'Barbero', 'Método', 'Subtotal', 'Propina', 'Total']],
      body: tableRows,
      foot: [
        [
          'TOTALES',
          '',
          '',
          '',
          '',
          `${totalSubtotal.toFixed(2)} ${this.currency}`,
          `${totalTips.toFixed(2)} ${this.currency}`,
          `${totalSalesAmount.toFixed(2)} ${this.currency}`,
        ],
      ],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  private renderMovementsTable(data: DailyReportData): void {
    if (!data.movements || data.movements.length === 0) return;

    if (this.currentY > 240) {
      this.doc.addPage();
      this.currentY = 20;
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...this.primaryColor);
    this.doc.text('BITÁCORA DE ARQUEOS Y MOVIMIENTOS DE CAJA', 14, this.currentY);
    this.currentY += 4;

    const movementRows = data.movements.map((m, idx) => {
      const isInc = (m.type || m.tipo) === 'income';
      const amt = Number(m.amount ?? m.monto ?? 0);
      const reasonText = m.reason || m.motivo || 'Ajuste de caja';
      return [
        `#${idx + 1}`,
        isInc ? 'Ingreso (+)' : 'Egreso / Retiro (-)',
        reasonText,
        `${isInc ? '+' : '-'}${amt.toFixed(2)} ${this.currency}`,
      ];
    });

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: 14, right: 14 },
      head: [['Nº', 'Tipo', 'Motivo / Concepto', 'Monto']],
      body: movementRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 12;
  }

  private renderSignatures(): void {
    if (this.currentY > 240) {
      this.doc.addPage();
      this.currentY = 30;
    } else {
      this.currentY = Math.max(this.currentY + 10, 240);
    }

    this.doc.setDrawColor(203, 213, 225);
    this.doc.setLineWidth(0.5);

    this.doc.line(25, this.currentY, 85, this.currentY);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(51, 65, 85);
    this.doc.text('Firma Cajero / Administrador', 55, this.currentY + 5, { align: 'center' });

    this.doc.line(125, this.currentY, 185, this.currentY);
    this.doc.text('Firma Supervisor / Gerencia', 155, this.currentY + 5, { align: 'center' });
  }
}

export function generateDailyTransactionsPDF(data: DailyReportData): void {
  const generator = new DailyCashReportGenerator();
  generator.generate(data);
}
