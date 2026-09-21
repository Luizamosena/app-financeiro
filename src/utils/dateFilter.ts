export type PeriodoPreset = 
  | 'todos' 
  | 'hoje'
  | 'ultimos_7' 
  | 'ultimos_30' 
  | 'mes_atual' 
  | 'mes_anterior' 
  | 'ano_atual' 
  | 'custom';

export interface FiltroData {
  preset: PeriodoPreset;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
}

const formatDateToISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getPresetDates = (preset: PeriodoPreset): { dataInicio: string; dataFim: string; label: string } => {
  const now = new Date();
  const todayStr = formatDateToISO(now);

  switch (preset) {
    case 'hoje':
      return {
        dataInicio: todayStr,
        dataFim: todayStr,
        label: 'Hoje'
      };

    case 'ultimos_7': {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      return {
        dataInicio: formatDateToISO(past7),
        dataFim: todayStr,
        label: 'Últimos 7 dias'
      };
    }

    case 'ultimos_30': {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 29);
      return {
        dataInicio: formatDateToISO(past30),
        dataFim: todayStr,
        label: 'Últimos 30 dias'
      };
    }

    case 'mes_atual': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const monthName = start.toLocaleDateString('pt-BR', { month: 'long' });
      return {
        dataInicio: formatDateToISO(start),
        dataFim: formatDateToISO(end),
        label: `Mês Atual (${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${now.getFullYear()})`
      };
    }

    case 'mes_anterior': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const monthName = start.toLocaleDateString('pt-BR', { month: 'long' });
      return {
        dataInicio: formatDateToISO(start),
        dataFim: formatDateToISO(end),
        label: `Mês Anterior (${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${start.getFullYear()})`
      };
    }

    case 'ano_atual': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        dataInicio: formatDateToISO(start),
        dataFim: formatDateToISO(end),
        label: `Ano de ${now.getFullYear()}`
      };
    }

    case 'todos':
    default:
      return {
        dataInicio: '',
        dataFim: '',
        label: 'Todos os períodos'
      };
  }
};

export const isDateInRange = (dateStr: string, inicio?: string, fim?: string): boolean => {
  if (!dateStr) return false;
  // Compare strings formatted as YYYY-MM-DD
  const pureDate = dateStr.split('T')[0];
  if (inicio && pureDate < inicio) return false;
  if (fim && pureDate > fim) return false;
  return true;
};

export const getPeriodoDescricao = (filtro: FiltroData): string => {
  if (filtro.preset === 'todos') {
    return 'Todos os períodos';
  }
  if (filtro.preset !== 'custom') {
    const presetInfo = getPresetDates(filtro.preset);
    if (filtro.dataInicio && filtro.dataFim) {
      const [anoI, mesI, diaI] = filtro.dataInicio.split('-');
      const [anoF, mesF, diaF] = filtro.dataFim.split('-');
      return `${presetInfo.label} (${diaI}/${mesI}/${anoI} a ${diaF}/${mesF}/${anoF})`;
    }
    return presetInfo.label;
  }
  if (filtro.dataInicio && filtro.dataFim) {
    const [anoI, mesI, diaI] = filtro.dataInicio.split('-');
    const [anoF, mesF, diaF] = filtro.dataFim.split('-');
    return `Período: ${diaI}/${mesI}/${anoI} até ${diaF}/${mesF}/${anoF}`;
  }
  if (filtro.dataInicio) {
    const [anoI, mesI, diaI] = filtro.dataInicio.split('-');
    return `A partir de ${diaI}/${mesI}/${anoI}`;
  }
  if (filtro.dataFim) {
    const [anoF, mesF, diaF] = filtro.dataFim.split('-');
    return `Até ${diaF}/${mesF}/${anoF}`;
  }
  return 'Período não definido';
};
