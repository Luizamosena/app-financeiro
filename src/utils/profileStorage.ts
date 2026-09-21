import { 
  ProfileId, 
  ProfileConfig, 
  ProfileData, 
  PagamentoFeito, 
  NotaFiscalEntrada, 
  BoletoAPagar, 
  OrdemServico 
} from '../types';
import { 
  INITIAL_PAGAMENTOS, 
  INITIAL_NOTAS_FISCAIS, 
  INITIAL_BOLETOS, 
  INITIAL_ORDENS_SERVICO 
} from '../data/initialData';
import { 
  INITIAL_PAGAMENTOS_PERFIL_2, 
  INITIAL_NOTAS_FISCAIS_PERFIL_2, 
  INITIAL_BOLETOS_PERFIL_2, 
  INITIAL_ORDENS_SERVICO_PERFIL_2 
} from '../data/initialProfile2Data';

const STORAGE_KEYS = {
  PROFILES_CONFIG: 'transuniao_profiles_config_v1',
  DATA_PREFIX: 'transuniao_profile_data_',
  LEGACY: {
    PAGAMENTOS: 'transuniao_pagamentos_v1',
    NOTAS_FISCAIS: 'transuniao_notas_fiscais_v1',
    BOLETOS: 'transuniao_boletos_v1',
    ORDENS_SERVICO: 'transuniao_ordens_servico_v1',
  }
};

export const DEFAULT_PROFILES_CONFIG: Record<ProfileId, ProfileConfig> = {
  perfil_1: {
    id: 'perfil_1',
    name: 'Perfil 1 - Transunião Matriz',
    subtitle: 'Operação Central & Transporte Rodoviário',
    documento: 'CNPJ: 12.345.678/0001-90',
    color: 'emerald',
  },
  perfil_2: {
    id: 'perfil_2',
    name: 'Perfil 2 - Transunião Filial',
    subtitle: 'Segunda Unidade & Manutenção / Logística',
    documento: 'CNPJ: 12.345.678/0002-71',
    color: 'indigo',
  }
};

export function getProfilesConfig(): Record<ProfileId, ProfileConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.perfil_1 && parsed.perfil_2) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler configurações de perfis', e);
  }
  return DEFAULT_PROFILES_CONFIG;
}

export function saveProfilesConfig(config: Record<ProfileId, ProfileConfig>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar configurações de perfis', e);
  }
}

export function loadProfileData(profileId: ProfileId): ProfileData {
  const profileKey = `${STORAGE_KEYS.DATA_PREFIX}${profileId}`;
  try {
    const raw = localStorage.getItem(profileKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        pagamentos: Array.isArray(parsed.pagamentos) ? parsed.pagamentos : [],
        notasFiscais: Array.isArray(parsed.notasFiscais) ? parsed.notasFiscais : [],
        boletos: Array.isArray(parsed.boletos) ? parsed.boletos : [],
        ordensServico: Array.isArray(parsed.ordensServico) ? parsed.ordensServico : [],
      };
    }
  } catch (e) {
    console.error(`Erro ao carregar dados do perfil ${profileId}`, e);
  }

  // If no saved data for Profile 1, check legacy keys for migration
  if (profileId === 'perfil_1') {
    let legacyPagamentos: PagamentoFeito[] = INITIAL_PAGAMENTOS;
    let legacyNotas: NotaFiscalEntrada[] = INITIAL_NOTAS_FISCAIS;
    let legacyBoletos: BoletoAPagar[] = INITIAL_BOLETOS;
    let legacyOS: OrdemServico[] = INITIAL_ORDENS_SERVICO;

    try {
      const savedPag = localStorage.getItem(STORAGE_KEYS.LEGACY.PAGAMENTOS);
      if (savedPag) legacyPagamentos = JSON.parse(savedPag);

      const savedNotas = localStorage.getItem(STORAGE_KEYS.LEGACY.NOTAS_FISCAIS);
      if (savedNotas) legacyNotas = JSON.parse(savedNotas);

      const savedBol = localStorage.getItem(STORAGE_KEYS.LEGACY.BOLETOS);
      if (savedBol) legacyBoletos = JSON.parse(savedBol);

      const savedOS = localStorage.getItem(STORAGE_KEYS.LEGACY.ORDENS_SERVICO);
      if (savedOS) legacyOS = JSON.parse(savedOS);
    } catch (e) {
      console.error('Erro na migração de dados legado', e);
    }

    const initialP1Data: ProfileData = {
      pagamentos: legacyPagamentos,
      notasFiscais: legacyNotas,
      boletos: legacyBoletos,
      ordensServico: legacyOS,
    };
    saveProfileData('perfil_1', initialP1Data);
    return initialP1Data;
  }

  // If Profile 2 and no data exists yet, initialize with Profile 2 defaults
  const initialP2Data: ProfileData = {
    pagamentos: INITIAL_PAGAMENTOS_PERFIL_2,
    notasFiscais: INITIAL_NOTAS_FISCAIS_PERFIL_2,
    boletos: INITIAL_BOLETOS_PERFIL_2,
    ordensServico: INITIAL_ORDENS_SERVICO_PERFIL_2,
  };
  saveProfileData('perfil_2', initialP2Data);
  return initialP2Data;
}

export function saveProfileData(profileId: ProfileId, data: ProfileData): void {
  const profileKey = `${STORAGE_KEYS.DATA_PREFIX}${profileId}`;
  try {
    localStorage.setItem(profileKey, JSON.stringify(data));
  } catch (e) {
    console.error(`Erro ao salvar dados do perfil ${profileId}`, e);
  }
}

export function resetProfileToDefault(profileId: ProfileId): ProfileData {
  let defaultData: ProfileData;
  if (profileId === 'perfil_1') {
    defaultData = {
      pagamentos: INITIAL_PAGAMENTOS,
      notasFiscais: INITIAL_NOTAS_FISCAIS,
      boletos: INITIAL_BOLETOS,
      ordensServico: INITIAL_ORDENS_SERVICO,
    };
  } else {
    defaultData = {
      pagamentos: INITIAL_PAGAMENTOS_PERFIL_2,
      notasFiscais: INITIAL_NOTAS_FISCAIS_PERFIL_2,
      boletos: INITIAL_BOLETOS_PERFIL_2,
      ordensServico: INITIAL_ORDENS_SERVICO_PERFIL_2,
    };
  }
  saveProfileData(profileId, defaultData);
  return defaultData;
}
