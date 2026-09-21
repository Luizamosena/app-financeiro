import { PagamentoFeito, NotaFiscalEntrada, BoletoAPagar, OrdemServico } from '../types';

export const INITIAL_PAGAMENTOS_PERFIL_2: PagamentoFeito[] = [
  {
    id: 'pag-p2-1',
    dataPagamento: '2026-09-12',
    valor: 2780.00,
    beneficiario: 'Auto Elétrica e Tacógrafos Paulista',
    numeroNotaFiscal: 'NF-20511',
    mesEmissaoNF: '2026-08',
    banco: 'Itaú',
    formaPagamento: 'PIX',
    observacoes: 'Aferição de tacógrafos e parte elétrica - Filial',
    criadoEm: '2026-09-12T11:00:00Z',
  },
  {
    id: 'pag-p2-2',
    dataPagamento: '2026-09-07',
    valor: 1420.00,
    beneficiario: 'Seguradora Porto & Cargas Seguras',
    numeroNotaFiscal: 'NF-19044',
    mesEmissaoNF: '2026-08',
    banco: 'Banco do Brasil',
    formaPagamento: 'Liquidação de boleto',
    observacoes: 'Parcela de apólice de frotas da filial',
    criadoEm: '2026-09-07T14:30:00Z',
  },
  {
    id: 'pag-p2-3',
    dataPagamento: '2026-08-30',
    valor: 3150.00,
    beneficiario: 'Combustíveis & Lubrificantes Bandeirantes',
    numeroNotaFiscal: 'NF-18230',
    mesEmissaoNF: '2026-07',
    banco: 'Pagbank',
    formaPagamento: 'Cartão de crédito',
    observacoes: 'Abastecimento mensal veículos de apoio',
    criadoEm: '2026-08-30T10:00:00Z',
  }
];

export const INITIAL_NOTAS_FISCAIS_PERFIL_2: NotaFiscalEntrada[] = [
  {
    id: 'nf-p2-1',
    numeroNF: 'NF-22105',
    dataEmissao: '2026-09-06',
    valorTotal: 5400.00,
    fornecedor: 'Reforma de Baús e Carrocerias União',
    categoria: 'servico',
    formaPagamento: 'boleto',
    quantidadeParcelas: 2,
    observacoes: 'Manutenção estrutural de implementos rodoviários - Filial',
    criadoEm: '2026-09-06T15:00:00Z',
  },
  {
    id: 'nf-p2-2',
    numeroNF: 'NF-21940',
    dataEmissao: '2026-09-10',
    valorTotal: 1890.00,
    fornecedor: 'Sistemas de Monitoramento Logístico SatTech',
    categoria: 'consumo',
    formaPagamento: 'pix',
    observacoes: 'Renovação licença de rastreadores e telemetria',
    criadoEm: '2026-09-10T09:30:00Z',
  }
];

export const INITIAL_BOLETOS_PERFIL_2: BoletoAPagar[] = [
  {
    id: 'bol-p2-1',
    notaFiscalId: 'nf-p2-1',
    numeroNF: 'NF-22105',
    fornecedor: 'Reforma de Baús e Carrocerias União',
    categoria: 'servico',
    dataEmissaoNF: '2026-09-06',
    valor: 2700.00,
    dataVencimento: '2026-09-20',
    parcelaInfo: '1/2',
    codigoBarras: '34191.79001 01043.510047 91020.150008 3 91200000270000',
    pago: false,
    criadoEm: '2026-09-06T15:00:00Z',
  },
  {
    id: 'bol-p2-2',
    notaFiscalId: 'nf-p2-1',
    numeroNF: 'NF-22105',
    fornecedor: 'Reforma de Baús e Carrocerias União',
    categoria: 'servico',
    dataEmissaoNF: '2026-09-06',
    valor: 2700.00,
    dataVencimento: '2026-10-20',
    parcelaInfo: '2/2',
    codigoBarras: '34191.79001 01043.510047 91020.150008 4 91500000270000',
    pago: false,
    criadoEm: '2026-09-06T15:00:00Z',
  },
  {
    id: 'bol-p2-3',
    numeroNF: 'NF-20880',
    fornecedor: 'Equipamentos e EPIs Segurança Total',
    categoria: 'consumo',
    dataEmissaoNF: '2026-09-08',
    valor: 980.00,
    dataVencimento: '2026-09-28',
    parcelaInfo: 'Única',
    codigoBarras: '23793.38128 60032.110008 14000.043009 2 91280000098000',
    pago: false,
    criadoEm: '2026-09-08T10:00:00Z',
  }
];

export const INITIAL_ORDENS_SERVICO_PERFIL_2: OrdemServico[] = Array.from({ length: 20 }, (_, i) => {
  const numero = 8100 + i;
  return {
    id: `os-p2-${numero}`,
    numero,
    status: 'pendente' as const,
    criadoEm: '2026-09-05T08:00:00Z',
  };
});
