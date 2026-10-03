import { CategoriaNF, FormaPagamento } from '../types';

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
};

export const parseCurrencyInput = (valueStr: string): number => {
  // Cleans string and converts to number
  const cleaned = valueStr.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const formatNumberToCurrencyInput = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const sanitizeCurrencyInputOnBlur = (valueStr: string): string => {
  if (!valueStr || !valueStr.trim()) return '0,00';
  const num = parseCurrencyInput(valueStr);
  return formatNumberToCurrencyInput(num);
};

/**
 * Máscara monetária que preenche os centavos automaticamente da direita para a esquerda
 * sem que o usuário precise digitar a vírgula.
 * Exemplo: 1 -> 0,01 | 15 -> 0,15 | 150 -> 1,50 | 1500 -> 15,00 | 15000 -> 150,00
 */
export const maskCurrencyInput = (valueStr: string): string => {
  if (!valueStr) return '0,00';
  
  // Extrai somente os dígitos
  const cleanDigits = valueStr.replace(/\D/g, '');
  if (!cleanDigits) return '0,00';
  
  // Limita a até 12 dígitos para evitar overflow
  const digits = cleanDigits.length > 12 ? cleanDigits.slice(-12) : cleanDigits;
  const cents = parseInt(digits, 10);
  if (isNaN(cents) || cents === 0) return '0,00';
  
  const val = cents / 100;
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Retorna as classes de cores dos bancos para badges:
 * - Banco do Brasil: amarelo
 * - Itaú: laranja
 * - Pagbank: verde
 */
export const getBancoBadgeClass = (bancoNome?: string): { badge: string; icon: string } => {
  if (!bancoNome || !bancoNome.trim()) {
    return { badge: 'bg-slate-100 text-slate-600 border-slate-200', icon: 'text-slate-400' };
  }
  const bLower = bancoNome.toLowerCase().trim();
  
  // Banco do Brasil: Amarelo
  if (bLower.includes('brasil') || bLower === 'bb') {
    return {
      badge: 'bg-amber-100 text-amber-950 border-amber-300 font-bold shadow-2xs',
      icon: 'text-amber-700'
    };
  }
  
  // Itaú: Laranja
  if (bLower.includes('itaú') || bLower.includes('itau')) {
    return {
      badge: 'bg-orange-100 text-orange-950 border-orange-300 font-bold shadow-2xs',
      icon: 'text-orange-600'
    };
  }
  
  // Pagbank: Verde
  if (bLower.includes('pagbank') || bLower.includes('pag bank') || bLower.includes('pagseguro')) {
    return {
      badge: 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold shadow-2xs',
      icon: 'text-emerald-700'
    };
  }
  
  // Demais bancos
  return {
    badge: 'bg-blue-50 text-blue-800 border-blue-200 font-semibold shadow-2xs',
    icon: 'text-blue-600'
  };
};

export const formatDateBR = (isoDate: string): string => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

export const formatDateBResumida = (dateStr: string): string => {
  if (!dateStr) return '-';
  // Handle ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const ano = isoMatch[1].slice(2);
    return `${isoMatch[3]}/${isoMatch[2]}/${ano}`;
  }
  // Handle DD/MM/YYYY
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const ano = brMatch[3].slice(2);
    return `${brMatch[1]}/${brMatch[2]}/${ano}`;
  }
  // If already DD/MM/YY
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return dateStr;
};

export const formatMesAno = (mesAno: string): string => {
  if (!mesAno) return '-';
  const parts = mesAno.split('-');
  if (parts.length === 2) {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mesIndex = parseInt(parts[1], 10) - 1;
    if (mesIndex >= 0 && mesIndex < 12) {
      return `${meses[mesIndex]} de ${parts[0]}`;
    }
  }
  return mesAno;
};

export const formatMesAnoResumido = (mesAno: string): string => {
  if (!mesAno) return '-';
  const mesesAbrev = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  const mesesCompletos = [
    'janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  // If format is YYYY-MM or YYYY-MM-DD
  const isoMatch = mesAno.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const mesIndex = parseInt(isoMatch[2], 10) - 1;
    const ano = isoMatch[1].slice(2);
    if (mesIndex >= 0 && mesIndex < 12) {
      return `${mesesAbrev[mesIndex]}/${ano}`;
    }
  }

  // If format is "Setembro de 2026" or "Setembro / 2026" or "Setembro/2026"
  const textMatch = mesAno.match(/^([a-zA-ZçÇáéíóúÁÉÍÓÚãõÃÕ]+)(?:\s+(?:de\s+)?|\s*\/\s*)(\d{2,4})/i);
  if (textMatch) {
    const nomeMes = textMatch[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let ano = textMatch[2];
    if (ano.length === 4) ano = ano.slice(2);

    const mesIndex = mesesCompletos.findIndex(m => m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").startsWith(nomeMes.slice(0, 3)));
    if (mesIndex >= 0) {
      return `${mesesAbrev[mesIndex]}/${ano}`;
    }
  }

  // If format is MM/YYYY
  const numSlashMatch = mesAno.match(/^(\d{1,2})\/(\d{2,4})/);
  if (numSlashMatch) {
    const mesIndex = parseInt(numSlashMatch[1], 10) - 1;
    let ano = numSlashMatch[2];
    if (ano.length === 4) ano = ano.slice(2);
    if (mesIndex >= 0 && mesIndex < 12) {
      return `${mesesAbrev[mesIndex]}/${ano}`;
    }
  }

  return mesAno;
};

export const getCategoriaLabel = (cat: CategoriaNF): string => {
  switch (cat) {
    case 'consumo':
      return 'Consumo';
    case 'revenda':
      return 'Revenda';
    case 'remessa de conserto':
      return 'Remessa de Conserto';
    case 'retorno de conserto':
      return 'Retorno de Conserto';
    case 'servico':
      return 'Serviço';
    case 'frete':
      return 'Frete';
    default:
      return cat;
  }
};

export const getCategoriaBadgeClass = (cat: CategoriaNF): string => {
  switch (cat) {
    case 'consumo':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'revenda':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'remessa de conserto':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'retorno de conserto':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'servico':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'frete':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const getFormaPagamentoLabel = (forma: FormaPagamento): string => {
  switch (forma) {
    case 'boleto':
      return 'Boleto Bancário';
    case 'pix':
      return 'PIX';
    case 'transferencia':
      return 'Transferência (TED/DOC)';
    case 'cartao':
      return 'Cartão de Crédito/Débito';
    case 'dinheiro':
      return 'Dinheiro em Espécie';
    case 'sem faturamento':
      return 'Sem Faturamento';
    default:
      return forma;
  }
};

export interface StatusVencimento {
  tipo: 'vencido' | 'hoje' | 'proximo' | 'regular';
  texto: string;
  badgeClass: string;
  diasDiferenca: number;
}

export const getStatusVencimento = (dataVencimentoIso: string): StatusVencimento => {
  if (!dataVencimentoIso) {
    return { tipo: 'regular', texto: 'Sem data', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', diasDiferenca: 0 };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [ano, mes, dia] = dataVencimentoIso.split('-').map(n => parseInt(n, 10));
  const dataVenc = new Date(ano, mes - 1, dia);
  dataVenc.setHours(0, 0, 0, 0);

  const diffTime = dataVenc.getTime() - hoje.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const diasAtras = Math.abs(diffDays);
    return {
      tipo: 'vencido',
      texto: `Vencido há ${diasAtras} ${diasAtras === 1 ? 'dia' : 'dias'}`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-medium',
      diasDiferenca: diffDays,
    };
  } else if (diffDays === 0) {
    return {
      tipo: 'hoje',
      texto: 'Vence Hoje',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold animate-pulse',
      diasDiferenca: 0,
    };
  } else if (diffDays <= 3) {
    return {
      tipo: 'proximo',
      texto: `Vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
      diasDiferenca: diffDays,
    };
  } else {
    return {
      tipo: 'regular',
      texto: `Vence em ${diffDays} dias`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      diasDiferenca: diffDays,
    };
  }
};
