import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PagamentoFeito, NotaFiscalEntrada, BoletoAPagar, OrdemServico } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  formatMesAno, 
  getCategoriaLabel, 
  getFormaPagamentoLabel, 
  getStatusVencimento 
} from './formatters';

const getNowFormatted = () => {
  const now = new Date();
  return `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

// ==========================================
// 1. RELATÓRIO: PAGAMENTOS FEITOS
// ==========================================

export const exportPagamentosExcel = (pagamentos: PagamentoFeito[], subtituloFiltro?: string) => {
  const wb = XLSX.utils.book_new();

  const totalValor = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);

  // Sheet Header Information
  const rows: any[] = [
    ['GESTÃO FINANCEIRA EMPRESARIAL - RELATÓRIO DE PAGAMENTOS FEITOS'],
    [`Gerado em: ${getNowFormatted()}`],
    [subtituloFiltro ? `Filtro aplicado: ${subtituloFiltro}` : 'Todos os registros'],
    [`Quantidade de lançamentos: ${pagamentos.length} | Total Pago: ${formatCurrency(totalValor)}`],
    [], // empty line
    [
      'Data Pagamento',
      'Nome do Beneficiário',
      'Nº Nota Fiscal Origem',
      'Mês Emissão NF',
      'Forma de Pagamento',
      'Valor Pago (R$)',
      'Banco / Conta',
      'Observações'
    ]
  ];

  // Data rows
  pagamentos.forEach((p) => {
    rows.push([
      formatDateBR(p.dataPagamento),
      p.beneficiario,
      p.numeroNotaFiscal,
      formatMesAno(p.mesEmissaoNF),
      p.formaPagamento || (p.boletoOrigem ? 'Liquidação de boleto' : '-'),
      p.valor,
      p.banco || '-',
      p.observacoes || '-'
    ]);
  });

  // Total summary row
  rows.push([]);
  rows.push(['TOTAL GERAL', '', '', '', '', totalValor, '', '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 16 }, // Data
    { wch: 35 }, // Beneficiario
    { wch: 22 }, // NF
    { wch: 20 }, // Mes Emissao
    { wch: 24 }, // Forma Pagamento
    { wch: 18 }, // Valor
    { wch: 22 }, // Banco
    { wch: 40 }  // Obs
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Pagamentos Feitos');
  const fileName = `relatorio_pagamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportPagamentosPDF = (pagamentos: PagamentoFeito[], subtituloFiltro?: string) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const totalValor = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Relatório de Pagamentos Feitos', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gestão Financeira Empresarial • Gerado em: ${getNowFormatted()}`, 40, 56);
  if (subtituloFiltro) {
    doc.text(`Filtro: ${subtituloFiltro}`, 40, 70);
  }

  // Summary box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(40, subtituloFiltro ? 80 : 66, 762, 32, 4, 4, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Liquidado: ${formatCurrency(totalValor)}`, 55, subtituloFiltro ? 100 : 86);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quantidade de Registros: ${pagamentos.length}`, 300, subtituloFiltro ? 100 : 86);

  // Table
  const tableData = pagamentos.map((p) => [
    formatDateBR(p.dataPagamento),
    p.beneficiario,
    p.numeroNotaFiscal,
    formatMesAno(p.mesEmissaoNF),
    p.formaPagamento || (p.boletoOrigem ? 'Liquidação de boleto' : '-'),
    formatCurrency(p.valor),
    p.banco || '-',
    p.observacoes || '-'
  ]);

  autoTable(doc, {
    startY: subtituloFiltro ? 122 : 108,
    head: [['Data Pagto', 'Beneficiário', 'NF Origem', 'Mês Emissão', 'Forma Pagto', 'Valor Pago', 'Banco', 'Observações']],
    body: tableData,
    foot: [['TOTAL GERAL', '', '', '', '', formatCurrency(totalValor), '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 140 },
      2: { cellWidth: 70 },
      3: { cellWidth: 80 },
      4: { cellWidth: 105 },
      5: { cellWidth: 85, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 75 },
      7: { cellWidth: 'auto' },
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(`relatorio_pagamentos_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 2. RELATÓRIO: NOTAS FISCAIS DE ENTRADA
// ==========================================

export const exportNotasFiscaisExcel = (notas: NotaFiscalEntrada[], subtituloFiltro?: string) => {
  const wb = XLSX.utils.book_new();
  const totalValor = notas.reduce((acc, n) => acc + (n.valorTotal || 0), 0);

  const rows: any[] = [
    ['GESTÃO FINANCEIRA EMPRESARIAL - NOTAS FISCAIS DE ENTRADA'],
    [`Gerado em: ${getNowFormatted()}`],
    [subtituloFiltro ? `Filtro aplicado: ${subtituloFiltro}` : 'Todos os registros'],
    [`Quantidade de Notas: ${notas.length} | Valor Total: ${formatCurrency(totalValor)}`],
    [],
    [
      'Nº da Nota Fiscal',
      'Data de Emissão',
      'Fornecedor',
      'Categoria',
      'Forma de Pagamento',
      'Valor Total (R$)'
    ]
  ];

  notas.forEach((n) => {
    rows.push([
      n.numeroNF,
      formatDateBR(n.dataEmissao),
      n.fornecedor,
      getCategoriaLabel(n.categoria),
      getFormaPagamentoLabel(n.formaPagamento),
      n.valorTotal
    ]);
  });

  rows.push([]);
  rows.push(['TOTAL GERAL', '', '', '', '', totalValor]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 18 }, // NF
    { wch: 16 }, // Emissao
    { wch: 35 }, // Fornecedor
    { wch: 22 }, // Categoria
    { wch: 24 }, // Forma Pagamento
    { wch: 18 }  // Valor
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Notas de Entrada');
  const fileName = `relatorio_notas_fiscais_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportNotasFiscaisPDF = (notas: NotaFiscalEntrada[], subtituloFiltro?: string) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const totalValor = notas.reduce((acc, n) => acc + (n.valorTotal || 0), 0);

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Relatório de Notas Fiscais de Entrada', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gestão Financeira Empresarial • Gerado em: ${getNowFormatted()}`, 40, 56);
  if (subtituloFiltro) {
    doc.text(`Filtro: ${subtituloFiltro}`, 40, 70);
  }

  // Summary box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(40, subtituloFiltro ? 80 : 66, 762, 32, 4, 4, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`Valor Total das Notas: ${formatCurrency(totalValor)}`, 55, subtituloFiltro ? 100 : 86);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quantidade de Notas Registradas: ${notas.length}`, 320, subtituloFiltro ? 100 : 86);

  const tableData = notas.map((n) => [
    n.numeroNF,
    formatDateBR(n.dataEmissao),
    n.fornecedor,
    getCategoriaLabel(n.categoria),
    getFormaPagamentoLabel(n.formaPagamento),
    formatCurrency(n.valorTotal)
  ]);

  autoTable(doc, {
    startY: subtituloFiltro ? 122 : 108,
    head: [['Nº NF', 'Emissão', 'Fornecedor', 'Categoria', 'Forma Pagamento', 'Valor Total']],
    body: tableData,
    foot: [['TOTAL GERAL', '', '', '', '', formatCurrency(totalValor)]],
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235], // blue-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 80 },
      2: { cellWidth: 220 },
      3: { cellWidth: 120 },
      4: { cellWidth: 130 },
      5: { cellWidth: 120, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(`relatorio_notas_fiscais_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 3. RELATÓRIO: BOLETOS A PAGAR
// ==========================================

export const exportBoletosExcel = (boletos: BoletoAPagar[], subtituloFiltro?: string) => {
  const wb = XLSX.utils.book_new();
  const totalValor = boletos.reduce((acc, b) => acc + (b.valor || 0), 0);

  const rows: any[] = [
    ['GESTÃO FINANCEIRA EMPRESARIAL - RELATÓRIO DE BOLETOS A PAGAR POR VENCIMENTO'],
    [`Gerado em: ${getNowFormatted()}`],
    [subtituloFiltro ? `Filtro aplicado: ${subtituloFiltro}` : 'Todos os títulos pendentes'],
    [`Quantidade de Boletos: ${boletos.length} | Total em Aberto: ${formatCurrency(totalValor)}`],
    [],
    [
      'Data de Vencimento',
      'Situação / Status',
      'Fornecedor',
      'Nº Nota Fiscal Origem',
      'Data Emissão NF',
      'Categoria',
      'Parcela',
      'Valor do Boleto (R$)',
      'Linha Digitável / Código de Barras'
    ]
  ];

  boletos.forEach((b) => {
    const status = getStatusVencimento(b.dataVencimento);
    rows.push([
      formatDateBR(b.dataVencimento),
      status.texto,
      b.fornecedor,
      b.numeroNF,
      formatDateBR(b.dataEmissaoNF),
      getCategoriaLabel(b.categoria),
      b.parcelaInfo || 'Única',
      b.valor,
      b.codigoBarras || '-'
    ]);
  });

  rows.push([]);
  rows.push(['TOTAL EM ABERTO', '', '', '', '', '', '', totalValor, '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 16 }, // Vencimento
    { wch: 18 }, // Status
    { wch: 35 }, // Fornecedor
    { wch: 18 }, // NF
    { wch: 16 }, // Emissao NF
    { wch: 20 }, // Categoria
    { wch: 12 }, // Parcela
    { wch: 18 }, // Valor
    { wch: 45 }  // Codigo Barras
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Boletos a Pagar');
  const fileName = `relatorio_boletos_a_pagar_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportBoletosPDF = (boletos: BoletoAPagar[], subtituloFiltro?: string) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const totalValor = boletos.reduce((acc, b) => acc + (b.valor || 0), 0);

  let vencidosCount = 0;
  let vencidosTotal = 0;
  boletos.forEach(b => {
    const st = getStatusVencimento(b.dataVencimento);
    if (st.tipo === 'vencido' || st.tipo === 'hoje') {
      vencidosCount++;
      vencidosTotal += b.valor;
    }
  });

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Relatório de Boletos a Pagar por Vencimento', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Gestão Financeira Empresarial • Gerado em: ${getNowFormatted()}`, 40, 56);
  if (subtituloFiltro) {
    doc.text(`Filtro: ${subtituloFiltro}`, 40, 70);
  }

  // Summary banner
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(40, subtituloFiltro ? 80 : 66, 762, 32, 4, 4, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`Total em Aberto: ${formatCurrency(totalValor)} (${boletos.length} títulos)`, 55, subtituloFiltro ? 100 : 86);

  if (vencidosCount > 0) {
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(`Atenção: ${vencidosCount} título(s) vencido(s) ou vencendo hoje (${formatCurrency(vencidosTotal)})`, 380, subtituloFiltro ? 100 : 86);
  }

  const tableData = boletos.map((b) => {
    const st = getStatusVencimento(b.dataVencimento);
    return [
      formatDateBR(b.dataVencimento),
      st.texto,
      b.fornecedor,
      b.numeroNF,
      formatDateBR(b.dataEmissaoNF),
      getCategoriaLabel(b.categoria),
      b.parcelaInfo || 'Única',
      formatCurrency(b.valor),
      b.codigoBarras ? b.codigoBarras.substring(0, 24) + '...' : '-'
    ];
  });

  autoTable(doc, {
    startY: subtituloFiltro ? 122 : 108,
    head: [['Vencimento', 'Situação', 'Fornecedor', 'NF Origem', 'Emissão NF', 'Categoria', 'Parcela', 'Valor', 'Código de Barras']],
    body: tableData,
    foot: [['TOTAL EM ABERTO', '', '', '', '', '', '', formatCurrency(totalValor), '']],
    theme: 'striped',
    headStyles: {
      fillColor: [217, 119, 6], // amber-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 5.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      1: { cellWidth: 75 },
      2: { cellWidth: 155 },
      3: { cellWidth: 65 },
      4: { cellWidth: 65 },
      5: { cellWidth: 85 },
      6: { cellWidth: 45 },
      7: { cellWidth: 85, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 'auto' },
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(`relatorio_boletos_a_pagar_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 4. RELATÓRIO EXECUTIVO CONSOLIDADO (GERAL)
// ==========================================

export const exportConsolidadoExcel = (
  pagamentos: PagamentoFeito[],
  notas: NotaFiscalEntrada[],
  boletos: BoletoAPagar[],
  periodoDescricao: string
) => {
  const wb = XLSX.utils.book_new();
  const totalPago = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const totalNotas = notas.reduce((acc, n) => acc + (n.valorTotal || 0), 0);
  const totalBoletos = boletos.reduce((acc, b) => acc + (b.valor || 0), 0);

  // Aba 1: Resumo Executivo
  const resumoRows: any[] = [
    ['GESTÃO FINANCEIRA EMPRESARIAL - RELATÓRIO EXECUTIVO GERAL'],
    [`Gerado em: ${getNowFormatted()}`],
    [`Filtro de Período: ${periodoDescricao}`],
    [],
    ['INDICADOR FINANCEIRO', 'QUANTIDADE', 'VALOR TOTAL (R$)'],
    ['Total de Pagamentos Realizados', pagamentos.length, totalPago],
    ['Total de Notas Fiscais de Entrada', notas.length, totalNotas],
    ['Total de Boletos a Pagar (Em Aberto)', boletos.length, totalBoletos],
    [],
    ['Saldo / Balanço Provisório do Período:', '', totalNotas - totalPago]
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
  wsResumo['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Geral');

  // Aba 2: Pagamentos
  const pagRows: any[] = [
    ['PAGAMENTOS REALIZADOS NO PERÍODO'],
    [`Período: ${periodoDescricao}`],
    [],
    ['Data Pagamento', 'Beneficiário', 'Nº NF Origem', 'Mês Emissão NF', 'Valor Pago (R$)', 'Observações']
  ];
  pagamentos.forEach(p => {
    pagRows.push([
      formatDateBR(p.dataPagamento),
      p.beneficiario,
      p.numeroNotaFiscal,
      formatMesAno(p.mesEmissaoNF),
      p.valor,
      p.observacoes || '-'
    ]);
  });
  pagRows.push([]);
  pagRows.push(['TOTAL PAGO', '', '', '', totalPago, '']);
  const wsPag = XLSX.utils.aoa_to_sheet(pagRows);
  wsPag['!cols'] = [{ wch: 16 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsPag, 'Pagamentos Feitos');

  // Aba 3: Notas Fiscais
  const nfRows: any[] = [
    ['NOTAS FISCAIS DE ENTRADA NO PERÍODO'],
    [`Período: ${periodoDescricao}`],
    [],
    ['Nº NF', 'Data Emissão', 'Fornecedor', 'Categoria', 'Forma Pagamento', 'Valor Total (R$)', 'Observações']
  ];
  notas.forEach(n => {
    nfRows.push([
      n.numeroNF,
      formatDateBR(n.dataEmissao),
      n.fornecedor,
      getCategoriaLabel(n.categoria),
      getFormaPagamentoLabel(n.formaPagamento),
      n.valorTotal,
      n.observacoes || '-'
    ]);
  });
  nfRows.push([]);
  nfRows.push(['TOTAL NOTAS', '', '', '', '', totalNotas, '']);
  const wsNf = XLSX.utils.aoa_to_sheet(nfRows);
  wsNf['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 35 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsNf, 'Notas de Entrada');

  // Aba 4: Boletos
  const bolRows: any[] = [
    ['BOLETOS A PAGAR NO PERÍODO (POR VENCIMENTO)'],
    [`Período: ${periodoDescricao}`],
    [],
    ['Vencimento', 'Situação', 'Fornecedor', 'Nº NF Origem', 'Data Emissão NF', 'Categoria', 'Parcela', 'Valor (R$)', 'Linha Digitável']
  ];
  boletos.forEach(b => {
    const st = getStatusVencimento(b.dataVencimento);
    bolRows.push([
      formatDateBR(b.dataVencimento),
      st.texto,
      b.fornecedor,
      b.numeroNF,
      formatDateBR(b.dataEmissaoNF),
      getCategoriaLabel(b.categoria),
      b.parcelaInfo || 'Única',
      b.valor,
      b.codigoBarras || '-'
    ]);
  });
  bolRows.push([]);
  bolRows.push(['TOTAL EM ABERTO', '', '', '', '', '', '', totalBoletos, '']);
  const wsBol = XLSX.utils.aoa_to_sheet(bolRows);
  wsBol['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 35 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsBol, 'Boletos a Pagar');

  const fileName = `relatorio_geral_financeiro_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportConsolidadoPDF = (
  pagamentos: PagamentoFeito[],
  notas: NotaFiscalEntrada[],
  boletos: BoletoAPagar[],
  periodoDescricao: string
) => {
  const doc = new jsPDF('landscape', 'pt', 'a4');
  const totalPago = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const totalNotas = notas.reduce((acc, n) => acc + (n.valorTotal || 0), 0);
  const totalBoletos = boletos.reduce((acc, b) => acc + (b.valor || 0), 0);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Relatório Executivo Consolidado de Gestão Financeira', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Período Filtrado: ${periodoDescricao} • Emitido em: ${getNowFormatted()}`, 40, 56);

  // KPI summary boxes
  const startY = 70;
  // Box 1: Pagamentos
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(40, startY, 240, 48, 6, 6, 'F');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DE PAGAMENTOS REALIZADOS', 52, startY + 18);
  doc.setFontSize(13);
  doc.setTextColor(6, 95, 70);
  doc.text(formatCurrency(totalPago), 52, startY + 36);

  // Box 2: Notas Fiscais
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(300, startY, 240, 48, 6, 6, 'F');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DE NOTAS FISCAIS DE ENTRADA', 312, startY + 18);
  doc.setFontSize(13);
  doc.setTextColor(30, 64, 175);
  doc.text(formatCurrency(totalNotas), 312, startY + 36);

  // Box 3: Boletos a Pagar
  doc.setFillColor(254, 243, 199); // amber-50
  doc.roundedRect(560, startY, 242, 48, 6, 6, 'F');
  doc.setFontSize(9);
  doc.setTextColor(217, 119, 6);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DE BOLETOS A PAGAR', 572, startY + 18);
  doc.setFontSize(13);
  doc.setTextColor(146, 64, 14);
  doc.text(formatCurrency(totalBoletos), 572, startY + 36);

  // Table 1: Pagamentos
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`1. Pagamentos Feitos (${pagamentos.length} lançamentos)`, 40, startY + 68);

  const pagTableData = pagamentos.slice(0, 12).map(p => [
    formatDateBR(p.dataPagamento),
    p.beneficiario,
    p.numeroNotaFiscal,
    formatMesAno(p.mesEmissaoNF),
    formatCurrency(p.valor)
  ]);

  autoTable(doc, {
    startY: startY + 76,
    head: [['Data Pagto', 'Beneficiário', 'NF Origem', 'Mês Emissão NF', 'Valor Pago']],
    body: pagTableData.length > 0 ? pagTableData : [['Nenhum pagamento registrado no período.', '', '', '', '']],
    foot: [['Total Pagamentos no Período', '', '', '', formatCurrency(totalPago)]],
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 4 },
    margin: { left: 40, right: 40 },
  });

  // Table 2: Boletos a Pagar (Top pending)
  const afterPagY = (doc as any).lastAutoTable.finalY + 18;

  if (afterPagY < 480) {
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`2. Boletos a Pagar por Vencimento (${boletos.length} títulos pendentes)`, 40, afterPagY);

    const bolTableData = boletos.slice(0, 10).map(b => {
      const st = getStatusVencimento(b.dataVencimento);
      return [
        formatDateBR(b.dataVencimento),
        st.texto,
        b.fornecedor,
        b.numeroNF,
        b.parcelaInfo || 'Única',
        formatCurrency(b.valor)
      ];
    });

    autoTable(doc, {
      startY: afterPagY + 8,
      head: [['Vencimento', 'Situação', 'Fornecedor', 'NF Origem', 'Parcela', 'Valor']],
      body: bolTableData.length > 0 ? bolTableData : [['Nenhum boleto a pagar no período.', '', '', '', '', '']],
      foot: [['Total Boletos no Período', '', '', '', '', formatCurrency(totalBoletos)]],
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 4 },
      margin: { left: 40, right: 40 },
    });
  }

  doc.save(`relatorio_executivo_geral_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 5. RELATÓRIO: BAIXA DE ORDENS DE SERVIÇO (OS)
// ==========================================

export const exportOrdemServicoExcel = (ordens: OrdemServico[], subtituloFiltro?: string) => {
  const wb = XLSX.utils.book_new();

  const totalPendentes = ordens.filter(o => o.status === 'pendente').length;
  const totalBaixadas = ordens.filter(o => o.status === 'baixada').length;

  const rows: any[] = [
    ['GESTÃO FINANCEIRA EMPRESARIAL - RELATÓRIO DE CONTROLE E BAIXA DE OS'],
    [`Gerado em: ${getNowFormatted()}`],
    [subtituloFiltro ? `Filtro aplicado: ${subtituloFiltro}` : 'Lista completa'],
    [`Total: ${ordens.length} | Pendentes: ${totalPendentes} | Baixadas: ${totalBaixadas}`],
    [],
    ['Nº OS', 'Status', 'Data da Baixa', 'Observações']
  ];

  ordens.forEach(o => {
    rows.push([
      `OS-${o.numero}`,
      o.status === 'baixada' ? 'BAIXADA' : 'PENDENTE',
      o.dataBaixa ? new Date(o.dataBaixa).toLocaleString('pt-BR') : '-',
      o.observacao || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Baixa de OS');
  XLSX.writeFile(wb, `relatorio_baixa_os_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportOrdemServicoPDF = (ordens: OrdemServico[], subtituloFiltro?: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 595, 65, 'F');

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE E BAIXA DE ORDENS DE SERVIÇO (OS)', 40, 32);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${getNowFormatted()} | Gestão Financeira Empresarial`, 40, 48);

  const totalPendentes = ordens.filter(o => o.status === 'pendente').length;
  const totalBaixadas = ordens.filter(o => o.status === 'baixada').length;

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total: ${ordens.length} OS | Pendentes: ${totalPendentes} | Baixadas: ${totalBaixadas}`, 40, 85);

  if (subtituloFiltro) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filtro: ${subtituloFiltro}`, 40, 98);
  }

  const tableData = ordens.map(o => [
    `OS-${o.numero}`,
    o.status === 'baixada' ? 'BAIXADA' : 'PENDENTE',
    o.dataBaixa ? new Date(o.dataBaixa).toLocaleString('pt-BR') : '-',
    o.observacao || '-'
  ]);

  autoTable(doc, {
    startY: subtituloFiltro ? 110 : 100,
    head: [['Nº OS', 'Status', 'Data da Baixa', 'Observações']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        if (data.cell.raw === 'BAIXADA') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 40, right: 40 }
  });

  doc.save(`relatorio_baixa_os_${new Date().toISOString().split('T')[0]}.pdf`);
};

