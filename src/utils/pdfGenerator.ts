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
    paymentMethod: string;
    subtotal: number;
    tip?: number;
    total: number;
  }>;
  clients: Array<{ id: string; fullName?: string; nombreCompleto?: string }>;
  employees: Array<{ id: string; fullName?: string; nombreCompleto?: string }>;
}

export function generateDailyTransactionsPDF(data: DailyReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = data.companyInfo.currencySymbol || 'Bs.';
  const branchText = data.branchName || 'Sucursal Principal';

  // Palette Colors
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [217, 119, 6]; // Amber 600
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const textColor: [number, number, number] = [51, 65, 85]; // Slate 700

  // 1. HEADER BANNER
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((data.companyInfo.name || 'BARBERÍA JOSUÉ').toUpperCase(), 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`RESUMEN DE TRANSACCIONES Y ARQUEO DIARIO DE CAJA`, 14, 19);
  doc.text(`Sucursal: ${branchText}  |  Fecha: ${data.dateStr}`, 14, 25);

  // Accent Line under header
  doc.setFillColor(...accentColor);
  doc.rect(0, 32, 210, 2, 'F');

  let currentY = 40;

  // 2. RESUMEN EJECUTIVO / METRIC CARDS
  const totalSalesAmount = data.salesToday.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalSubtotal = data.salesToday.reduce((acc, s) => acc + (s.subtotal || 0), 0);
  const totalTips = data.salesToday.reduce((acc, s) => acc + (s.tip || 0), 0);
  const totalTransactionsCount = data.salesToday.length;

  // Breakdown by payment method
  const cashSales = data.salesToday
    .filter((s) => s.paymentMethod === 'cash')
    .reduce((acc, s) => acc + s.total, 0);
  const cardSales = data.salesToday
    .filter((s) => s.paymentMethod === 'card')
    .reduce((acc, s) => acc + s.total, 0);
  const transferSales = data.salesToday
    .filter((s) => s.paymentMethod === 'transfer' || s.paymentMethod === 'qr')
    .reduce((acc, s) => acc + s.total, 0);

  // Cards layout
  const cardWidth = 43;
  const cardHeight = 22;
  const startX = 14;

  const kpis = [
    { title: 'Total Cobrado', val: `${totalSalesAmount.toFixed(2)} ${currency}`, color: primaryColor },
    { title: 'Efectivo Cash', val: `${cashSales.toFixed(2)} ${currency}`, color: [16, 185, 129] as [number, number, number] },
    { title: 'Tarjetas / Transf.', val: `${(cardSales + transferSales).toFixed(2)} ${currency}`, color: [99, 102, 241] as [number, number, number] },
    { title: 'Nº Operaciones', val: `${totalTransactionsCount} ventas`, color: accentColor },
  ];

  kpis.forEach((kpi, idx) => {
    const x = startX + idx * (cardWidth + 4);
    doc.setFillColor(...lightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title.toUpperCase(), x + 3, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, x + 3, currentY + 15);
  });

  currentY += cardHeight + 8;

  // 3. ESTADO DE CAJA CHICA (Si hay sesión activa)
  if (data.activeSession) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('ESTADO Y BALANCE DE LA CAJA CHICA', 14, currentY);
    currentY += 4;

    const opening = data.activeSession.openingBalance || 0;
    const expected = data.activeSession.expectedBalance || (opening + cashSales);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      head: [['Fondo de Apertura', 'Ventas en Efectivo', 'Ajustes / Arqueos', 'Balance Esperado en Caja']],
      body: [
        [
          `${opening.toFixed(2)} ${currency}`,
          `${cashSales.toFixed(2)} ${currency}`,
          `${((data.movements || []).reduce((acc, m) => {
            const isInc = (m.type || m.tipo) === 'income';
            const amt = Number(m.amount ?? m.monto ?? 0);
            return acc + (isInc ? amt : -amt);
          }, 0)).toFixed(2)} ${currency}`,
          `${expected.toFixed(2)} ${currency}`,
        ],
      ],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [15, 23, 42], fontStyle: 'bold' },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. DETALLE DE VENTAS DEL DÍA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('DETALLE DE TRANSACCIONES Y VENTAS', 14, currentY);
  currentY += 4;

  if (data.salesToday.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No hay registro de ventas ni transacciones para este día.', 14, currentY + 4);
    currentY += 12;
  } else {
    const tableRows = data.salesToday.map((s) => {
      const client = data.clients.find((c) => c.id === s.clientId);
      const employee = data.employees.find((e) => e.id === s.employeeId);
      const clientName = client?.fullName || client?.nombreCompleto || 'Cliente General';
      const barberName = employee?.fullName || employee?.nombreCompleto || 'Sin Asignar';
      
      const dateObj = new Date(s.createdAt || Date.now());
      const timeStr = dateObj.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

      const methodLabel =
        s.paymentMethod === 'cash'
          ? 'Efectivo'
          : s.paymentMethod === 'card'
          ? 'Tarjeta'
          : s.paymentMethod === 'transfer'
          ? 'Transferencia QR'
          : s.paymentMethod;

      return [
        s.id,
        timeStr,
        clientName,
        barberName,
        methodLabel,
        `${(s.subtotal || 0).toFixed(2)} ${currency}`,
        `${(s.tip || 0).toFixed(2)} ${currency}`,
        `${(s.total || 0).toFixed(2)} ${currency}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
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
          `${totalSubtotal.toFixed(2)} ${currency}`,
          `${totalTips.toFixed(2)} ${currency}`,
          `${totalSalesAmount.toFixed(2)} ${currency}`,
        ],
      ],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. MOVIMIENTOS DE CAJA CHICA (Si hay)
  if (data.movements && data.movements.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('BITÁCORA DE ARQUEOS Y MOVIMIENTOS DE CAJA', 14, currentY);
    currentY += 4;

    const movementRows = data.movements.map((m, idx) => {
      const isInc = (m.type || m.tipo) === 'income';
      const amt = Number(m.amount ?? m.monto ?? 0);
      const reasonText = m.reason || m.motivo || 'Ajuste de caja';
      return [
        `#${idx + 1}`,
        isInc ? 'Ingreso (+)' : 'Egreso / Retiro (-)',
        reasonText,
        `${isInc ? '+' : '-'}${amt.toFixed(2)} ${currency}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      head: [['Nº', 'Tipo', 'Motivo / Concepto', 'Monto']],
      body: movementRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // 6. FIRMAS Y FOOTER
  if (currentY > 240) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY = Math.max(currentY + 10, 240);
  }

  // Line for signatures
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);

  // Cajero
  doc.line(25, currentY, 85, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Firma Cajero / Administrador', 55, currentY + 5, { align: 'center' });

  // Supervisor
  doc.line(125, currentY, 185, currentY);
  doc.text('Firma Supervisor / Gerencia', 155, currentY + 5, { align: 'center' });

  // Timestamp footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const nowStr = new Date().toLocaleString('es-BO');
  doc.text(`Documento generado automáticamente por sistema el ${nowStr}`, 105, 287, { align: 'center' });

  // Save PDF file
  const safeDate = data.dateStr.replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`resumen_caja_${safeDate}.pdf`);
}
