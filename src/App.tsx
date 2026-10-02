/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TabsNav } from './components/TabsNav';
import { PagamentosFeitosTab } from './components/PagamentosFeitosTab';
import { NotasFiscaisTab } from './components/NotasFiscaisTab';
import { BoletosTab } from './components/BoletosTab';
import { BaixaOSTab } from './components/BaixaOSTab';
import { LoginScreen } from './components/LoginScreen';
import { EditProfileModal } from './components/EditProfileModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UserProfileModal } from './components/UserProfileModal';
import { 
  TabType, 
  PagamentoFeito, 
  NotaFiscalEntrada, 
  BoletoAPagar,
  ParcelaBoletoInput,
  OrdemServico,
  ProfileId,
  ProfileConfig,
  ProfileData,
  UserSession
} from './types';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { ConfirmModal } from './components/ConfirmModal';
import { FiltroData, isDateInRange, getPeriodoDescricao } from './utils/dateFilter';
import { exportConsolidadoExcel, exportConsolidadoPDF } from './utils/reports';
import { formatDateBR } from './utils/formatters';
import { getActiveSession, saveActiveSession, clearActiveSession } from './utils/auth';
import { 
  getProfilesConfig, 
  saveProfilesConfig, 
  loadProfileData, 
  saveProfileData, 
  resetProfileToDefault 
} from './utils/profileStorage';
import {
  subscribeToProfileData,
  syncSaveProfileData,
  subscribeToProfilesConfig,
  syncSaveProfilesConfig,
  subscribeToCredentials,
} from './services/firestoreSync';

export default function App() {
  // Authentication & Access Restriction State
  const [authSession, setAuthSession] = useState<UserSession | null>(() => {
    return getActiveSession();
  });

  // Profiles Configuration (Names, Subtitles, Documentos)
  const [profilesConfig, setProfilesConfig] = useState<Record<ProfileId, ProfileConfig>>(() => {
    return getProfilesConfig();
  });

  // Active Profile ID ('perfil_1' or 'perfil_2')
  const [activeProfileId, setActiveProfileId] = useState<ProfileId>(() => {
    const session = getActiveSession();
    return session?.activeProfileId || 'perfil_1';
  });

  // Profile-specific independent data store
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    const session = getActiveSession();
    const initialPid = session?.activeProfileId || 'perfil_1';
    return loadProfileData(initialPid);
  });

  // Real-time Cloud Sync Status
  const [isCloudSynced, setIsCloudSynced] = useState(true);

  // Subscribe to real-time changes from Firestore for Profiles Config
  useEffect(() => {
    const unsubscribe = subscribeToProfilesConfig((remoteConfig) => {
      setProfilesConfig(remoteConfig);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time changes from Firestore for Active Profile Data
  useEffect(() => {
    const unsubscribe = subscribeToProfileData(
      activeProfileId,
      (remoteData) => {
        setProfileData(remoteData);
        setIsCloudSynced(true);
      },
      (error) => {
        console.warn('Firestore fallback to local mode:', error);
        setIsCloudSynced(false);
      }
    );
    return () => unsubscribe();
  }, [activeProfileId]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('pagamentos');

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Date range filter for dashboard summaries and consolidated reports
  const [filtroData, setFiltroData] = useState<FiltroData>({
    preset: 'todos',
    dataInicio: '',
    dataFim: '',
  });

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const showToast = (text: string, actionLabel?: string, onAction?: () => void) => {
    setToastMessage({ text, actionLabel, onAction });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 6000);
  };

  // Helper getters for active profile data
  const pagamentos = profileData.pagamentos;
  const notasFiscais = profileData.notasFiscais;
  const boletos = profileData.boletos;
  const ordensServico = profileData.ordensServico;

  // Helper setters that synchronously write to active profile's independent localStorage and cloud Firestore
  const updateActiveProfileData = (updater: (prev: ProfileData) => ProfileData) => {
    setProfileData(prev => {
      const updated = updater(prev);
      syncSaveProfileData(activeProfileId, updated);
      return updated;
    });
  };

  const setPagamentos = (updater: PagamentoFeito[] | ((prev: PagamentoFeito[]) => PagamentoFeito[])) => {
    updateActiveProfileData(prev => ({
      ...prev,
      pagamentos: typeof updater === 'function' ? updater(prev.pagamentos) : updater,
    }));
  };

  const setNotasFiscais = (updater: NotaFiscalEntrada[] | ((prev: NotaFiscalEntrada[]) => NotaFiscalEntrada[])) => {
    updateActiveProfileData(prev => ({
      ...prev,
      notasFiscais: typeof updater === 'function' ? updater(prev.notasFiscais) : updater,
    }));
  };

  const setBoletos = (updater: BoletoAPagar[] | ((prev: BoletoAPagar[]) => BoletoAPagar[])) => {
    updateActiveProfileData(prev => ({
      ...prev,
      boletos: typeof updater === 'function' ? updater(prev.boletos) : updater,
    }));
  };

  const setOrdensServico = (updater: OrdemServico[] | ((prev: OrdemServico[]) => OrdemServico[])) => {
    updateActiveProfileData(prev => ({
      ...prev,
      ordensServico: typeof updater === 'function' ? updater(prev.ordensServico) : updater,
    }));
  };

  // --- Profile Switching ---
  const handleSwitchProfile = (targetProfileId: ProfileId) => {
    if (targetProfileId === activeProfileId) return;

    // 1. Ensure current profile is completely saved to Cloud Firestore
    syncSaveProfileData(activeProfileId, profileData);

    // 2. Set target profile ID (the real-time subscriber will automatically load Firestore data)
    setActiveProfileId(targetProfileId);

    // 3. Update session
    if (authSession) {
      const updatedSession: UserSession = {
        ...authSession,
        activeProfileId: targetProfileId,
      };
      setAuthSession(updatedSession);
      saveActiveSession(updatedSession);
    }

    showToast(`Ambiente alterado para ${profilesConfig[targetProfileId].name}. Dados sincronizados.`);
  };

  // --- Save Profile Config (Renaming) ---
  const handleSaveProfilesConfig = (newConfig: Record<ProfileId, ProfileConfig>) => {
    setProfilesConfig(newConfig);
    syncSaveProfilesConfig(newConfig);
    showToast('Nomes e configurações dos perfis salvos com sucesso.');
  };

  // --- Auth Handlers ---
  const handleLoginSuccess = (session: UserSession) => {
    setAuthSession(session);
    saveActiveSession(session);
    if (session.activeProfileId !== activeProfileId) {
      setActiveProfileId(session.activeProfileId);
    }
    showToast(`Bem-vindo! Acessando ${profilesConfig[session.activeProfileId].name}.`);
  };

  const handleLogout = () => {
    // Persist current profile data to Cloud before logging out
    syncSaveProfileData(activeProfileId, profileData);
    clearActiveSession();
    setAuthSession(null);
    showToast('Sessão finalizada. Acesso restrito ao sistema.');
  };

  // --- Handlers: Pagamentos Feitos ---
  const handleAddPagamento = (dados: Omit<PagamentoFeito, 'id' | 'criadoEm'>) => {
    const novo: PagamentoFeito = {
      ...dados,
      id: 'pag-' + Date.now(),
      criadoEm: new Date().toISOString(),
    };
    setPagamentos(prev => [novo, ...prev]);
    showToast(`Pagamento para ${novo.beneficiario} registrado com sucesso!`);
  };

  const handleUpdatePagamento = (id: string, updates: Partial<PagamentoFeito>) => {
    setPagamentos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    showToast('Lançamento atualizado com sucesso.');
  };

  const handleDeletePagamento = (id: string, retornarBoleto?: boolean) => {
    const target = pagamentos.find(p => p.id === id);
    setPagamentos(prev => prev.filter(p => p.id !== id));

    if (retornarBoleto && target) {
      if (target.boletoOrigem) {
        const boletoRestaurado: BoletoAPagar = {
          ...target.boletoOrigem,
          pago: false,
        };
        setBoletos(prev => {
          const filtrados = prev.filter(b => b.id !== boletoRestaurado.id);
          return [boletoRestaurado, ...filtrados];
        });
        showToast(
          `Pagamento cancelado e título da NF ${target.numeroNotaFiscal} retornado aos boletos em aberto!`,
          'Ver Boletos',
          () => setActiveTab('boletos')
        );
        return;
      } else {
        // Fallback: reconstruct boleto from payment data
        const boletoReconstituido: BoletoAPagar = {
          id: 'bol-retornado-' + Date.now(),
          numeroNF: target.numeroNotaFiscal,
          fornecedor: target.beneficiario,
          categoria: 'consumo',
          dataEmissaoNF: target.mesEmissaoNF ? `${target.mesEmissaoNF}-01` : target.dataPagamento,
          valor: target.valor,
          dataVencimento: target.dataPagamento,
          parcelaInfo: 'Reaberto',
          pago: false,
          criadoEm: new Date().toISOString(),
          observacoes: `Título retornado aos boletos em aberto após cancelamento do pagamento em ${formatDateBR(new Date().toISOString().split('T')[0])}`,
        };
        setBoletos(prev => [boletoReconstituido, ...prev]);
        showToast(
          `Pagamento cancelado e título da NF ${target.numeroNotaFiscal} retornado aos boletos em aberto!`,
          'Ver Boletos',
          () => setActiveTab('boletos')
        );
        return;
      }
    }

    showToast('Lançamento de pagamento excluído.');
  };

  // --- Handlers: Notas Fiscais & Automatic Boleto / PIX Generation ---
  const handleAddNotaFiscal = (
    nfData: Omit<NotaFiscalEntrada, 'id' | 'criadoEm'>,
    parcelasBoletos?: ParcelaBoletoInput[],
    pagamentoPixData?: {
      banco: string;
      dataPagamento: string;
      observacoes?: string;
    }
  ) => {
    const novaNFId = 'nf-' + Date.now();
    const novaNF: NotaFiscalEntrada = {
      ...nfData,
      id: novaNFId,
      criadoEm: new Date().toISOString(),
    };

    // If payment method is 'boleto', generate the boletos automatically!
    if (nfData.formaPagamento === 'boleto' && parcelasBoletos && parcelasBoletos.length > 0) {
      const novosBoletos: BoletoAPagar[] = parcelasBoletos.map((parc, index) => ({
        id: `bol-${Date.now()}-${index}`,
        notaFiscalId: novaNFId,
        numeroNF: nfData.numeroNF,
        fornecedor: nfData.fornecedor,
        categoria: nfData.categoria,
        dataEmissaoNF: nfData.dataEmissao,
        valor: parc.valor,
        dataVencimento: parc.dataVencimento,
        parcelaInfo: parcelasBoletos.length > 1 ? `${parc.numeroParcela}/${parcelasBoletos.length}` : 'Única',
        codigoBarras: parc.codigoBarras || undefined,
        pago: false,
        criadoEm: new Date().toISOString(),
      }));

      setNotasFiscais(prev => [novaNF, ...prev]);
      setBoletos(prev => [...novosBoletos, ...prev]);
      showToast(
        `Nota Fiscal ${novaNF.numeroNF} salva! ${novosBoletos.length} boleto(s) a pagar gerado(s) na aba de Boletos.`,
        'Ver Boletos',
        () => setActiveTab('boletos')
      );
    } else if (nfData.formaPagamento === 'pix' && pagamentoPixData && pagamentoPixData.banco) {
      // Automatic PIX payment creation in Pagamentos Feitos
      const novoPagamentoId = 'pag-' + Date.now();
      const novoPagamento: PagamentoFeito = {
        id: novoPagamentoId,
        dataPagamento: pagamentoPixData.dataPagamento || novaNF.dataEmissao,
        valor: novaNF.valorTotal,
        beneficiario: novaNF.fornecedor,
        numeroNotaFiscal: novaNF.numeroNF,
        mesEmissaoNF: novaNF.dataEmissao ? novaNF.dataEmissao.substring(0, 7) : new Date().toISOString().substring(0, 7),
        formaPagamento: 'PIX',
        banco: pagamentoPixData.banco,
        observacoes: pagamentoPixData.observacoes?.trim() || undefined,
        criadoEm: new Date().toISOString(),
      };

      novaNF.pixLancado = true;
      novaNF.pixBanco = pagamentoPixData.banco;
      novaNF.pixDataPagamento = pagamentoPixData.dataPagamento || novaNF.dataEmissao;
      novaNF.pixPagamentoId = novoPagamentoId;

      setNotasFiscais(prev => [novaNF, ...prev]);
      setPagamentos(prev => [novoPagamento, ...prev]);
      showToast(
        `Nota Fiscal ${novaNF.numeroNF} salva! Pagamento via PIX lançado em Pagamentos Feitos (${pagamentoPixData.banco}).`,
        'Ver Pagamentos',
        () => setActiveTab('pagamentos')
      );
    } else {
      setNotasFiscais(prev => [novaNF, ...prev]);
      showToast(`Nota Fiscal ${novaNF.numeroNF} registrada com sucesso!`);
    }
  };

  const handleUpdateNotaFiscal = (
    id: string,
    updatedData: Partial<NotaFiscalEntrada>,
    parcelasBoletos?: ParcelaBoletoInput[],
    pagamentoPixData?: {
      banco: string;
      dataPagamento: string;
      observacoes?: string;
    }
  ) => {
    const existingNF = notasFiscais.find(nf => nf.id === id);
    if (!existingNF) return;

    let pixExtraFields: Partial<NotaFiscalEntrada> = {};

    if (updatedData.formaPagamento === 'pix' && pagamentoPixData && pagamentoPixData.banco) {
      const novoPagamentoId = 'pag-' + Date.now();
      const novoPagamento: PagamentoFeito = {
        id: novoPagamentoId,
        dataPagamento: pagamentoPixData.dataPagamento || updatedData.dataEmissao || existingNF.dataEmissao,
        valor: updatedData.valorTotal ?? existingNF.valorTotal,
        beneficiario: updatedData.fornecedor || existingNF.fornecedor,
        numeroNotaFiscal: updatedData.numeroNF || existingNF.numeroNF,
        mesEmissaoNF: (updatedData.dataEmissao || existingNF.dataEmissao).substring(0, 7),
        formaPagamento: 'PIX',
        banco: pagamentoPixData.banco,
        observacoes: pagamentoPixData.observacoes?.trim() || undefined,
        criadoEm: new Date().toISOString(),
      };

      pixExtraFields = {
        pixLancado: true,
        pixBanco: pagamentoPixData.banco,
        pixDataPagamento: pagamentoPixData.dataPagamento || updatedData.dataEmissao || existingNF.dataEmissao,
        pixPagamentoId: novoPagamentoId,
      };

      setPagamentos(prev => [novoPagamento, ...prev]);
      showToast(
        `Nota Fiscal ${updatedData.numeroNF || existingNF.numeroNF} atualizada e pagamento via PIX lançado (${pagamentoPixData.banco})!`,
        'Ver Pagamentos',
        () => setActiveTab('pagamentos')
      );
    }

    setNotasFiscais(prev =>
      prev.map(nf => (nf.id === id ? { ...nf, ...updatedData, ...pixExtraFields } : nf))
    );

    // Sync metadata with boletos linked to this NF
    setBoletos(prev =>
      prev.map(b => {
        if (b.notaFiscalId === id || b.numeroNF === existingNF.numeroNF) {
          return {
            ...b,
            numeroNF: updatedData.numeroNF ?? b.numeroNF,
            fornecedor: updatedData.fornecedor ?? b.fornecedor,
            categoria: updatedData.categoria ?? b.categoria,
            dataEmissaoNF: updatedData.dataEmissao ?? b.dataEmissaoNF,
          };
        }
        return b;
      })
    );

    // If payment method is 'boleto' and parcelas are provided:
    if (updatedData.formaPagamento === 'boleto' && parcelasBoletos && parcelasBoletos.length > 0) {
      setBoletos(prev => {
        const remaining = prev.filter(b => b.notaFiscalId !== id && b.numeroNF !== existingNF.numeroNF);
        const novosBoletos: BoletoAPagar[] = parcelasBoletos.map((parc, index) => ({
          id: `bol-${Date.now()}-${index}`,
          notaFiscalId: id,
          numeroNF: updatedData.numeroNF || existingNF.numeroNF,
          fornecedor: updatedData.fornecedor || existingNF.fornecedor,
          categoria: updatedData.categoria || existingNF.categoria,
          dataEmissaoNF: updatedData.dataEmissao || existingNF.dataEmissao,
          valor: parc.valor,
          dataVencimento: parc.dataVencimento,
          parcelaInfo: parcelasBoletos.length > 1 ? `${parc.numeroParcela}/${parcelasBoletos.length}` : 'Única',
          codigoBarras: parc.codigoBarras || undefined,
          pago: false,
          criadoEm: new Date().toISOString(),
        }));
        return [...novosBoletos, ...remaining];
      });
    } else if (updatedData.formaPagamento && updatedData.formaPagamento !== 'boleto') {
      setBoletos(prev => prev.filter(b => b.notaFiscalId !== id && b.numeroNF !== existingNF.numeroNF));
    }

    showToast(`Nota Fiscal ${updatedData.numeroNF || existingNF.numeroNF} atualizada com sucesso!`);
  };

  const handleDeleteNotaFiscal = (id: string, deleteRelatedBoletos: boolean) => {
    const targetNF = notasFiscais.find(nf => nf.id === id);
    setNotasFiscais(prev => prev.filter(nf => nf.id !== id));

    if (deleteRelatedBoletos && targetNF) {
      setBoletos(prev => prev.filter(b => b.notaFiscalId !== id && b.numeroNF !== targetNF.numeroNF));
    }
    showToast('Nota Fiscal excluída com sucesso.');
  };

  // --- Handlers: Boletos a Pagar ---
  const handleDeleteBoleto = (id: string) => {
    setBoletos(prev => prev.filter(b => b.id !== id));
    showToast('Boleto excluído com sucesso.');
  };

  const handlePagarELancar = (
    boleto: BoletoAPagar, 
    dataPagamento: string, 
    banco?: string, 
    observacoesAdicionais?: string
  ) => {
    // 1. Remove from boletos
    setBoletos(prev => prev.filter(b => b.id !== boleto.id));

    // 2. Derive Month of NF emission (YYYY-MM)
    const mesEmissao = boleto.dataEmissaoNF ? boleto.dataEmissaoNF.substring(0, 7) : dataPagamento.substring(0, 7);

    // 3. Build observations
    const obsPartes: string[] = [];
    if (boleto.agrupado) {
      obsPartes.push(`Baixa de boleto agrupado (${boleto.titulosOrigemQtd || '2+'} títulos)`);
    } else {
      obsPartes.push(`Baixa de boleto${boleto.parcelaInfo ? ` (Parcela ${boleto.parcelaInfo})` : ''}`);
    }
    if (banco) {
      obsPartes.push(`Banco: ${banco}`);
    }
    if (observacoesAdicionais && observacoesAdicionais.trim()) {
      obsPartes.push(observacoesAdicionais.trim());
    }

    // 4. Add to Pagamentos Feitos
    const novoPagamento: PagamentoFeito = {
      id: 'pag-' + Date.now(),
      dataPagamento: dataPagamento,
      valor: boleto.valor,
      beneficiario: boleto.fornecedor,
      numeroNotaFiscal: boleto.numeroNF,
      mesEmissaoNF: mesEmissao,
      formaPagamento: 'Liquidação de boleto',
      banco: banco || undefined,
      observacoes: obsPartes.join(' - '),
      criadoEm: new Date().toISOString(),
      boletoOrigem: boleto,
    };

    setPagamentos(prev => [novoPagamento, ...prev]);

    showToast(
      `Boleto liquidado${banco ? ` via ${banco}` : ''} e lançado em Pagamentos Feitos de ${profilesConfig[activeProfileId].name}!`,
      'Ver Pagamentos',
      () => setActiveTab('pagamentos')
    );
  };

  const handleAddBoletoAvulso = (boletoData: Omit<BoletoAPagar, 'id' | 'criadoEm'>) => {
    const novoBoleto: BoletoAPagar = {
      ...boletoData,
      id: 'bol-' + Date.now(),
      criadoEm: new Date().toISOString(),
    };
    setBoletos(prev => [novoBoleto, ...prev]);
    showToast(`Boleto da ${novoBoleto.numeroNF} cadastrado com sucesso.`);
  };

  const handleAgruparBoletos = (
    boletosIdsOrigem: string[],
    novosBoletos: Omit<BoletoAPagar, 'id' | 'criadoEm'>[]
  ) => {
    const grupoId = `grp-${Date.now()}`;
    setBoletos(prev => {
      const restantes = prev.filter(b => !boletosIdsOrigem.includes(b.id));
      const novos: BoletoAPagar[] = novosBoletos.map((nb, idx) => ({
        ...nb,
        id: `bol-grp-${Date.now()}-${idx}`,
        grupoId,
        criadoEm: new Date().toISOString(),
      }));
      return [...novos, ...restantes];
    });
    showToast(`${boletosIdsOrigem.length} título(s) agrupado(s) com sucesso em ${novosBoletos.length} boleto(s) a pagar!`);
  };

  const handleUpdateBoleto = (id: string, updates: Partial<BoletoAPagar>) => {
    setBoletos(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    showToast('Boleto atualizado com sucesso.');
  };

  const handleDesvincularBoleto = (boletoId: string) => {
    const boletoAlvo = boletos.find(b => b.id === boletoId);
    if (!boletoAlvo) return;

    if (boletoAlvo.boletosOriginais && boletoAlvo.boletosOriginais.length > 0) {
      const grupoIdAlvo = boletoAlvo.grupoId;
      setBoletos(prev => {
        const filtrados = prev.filter(b => grupoIdAlvo ? b.grupoId !== grupoIdAlvo : b.id !== boletoId);
        const restaurados = boletoAlvo.boletosOriginais!.map(ob => ({
          ...ob,
          pago: false,
        }));
        return [...restaurados, ...filtrados];
      });
      showToast(`${boletoAlvo.boletosOriginais.length} títulos desvinculados com sucesso e restaurados para a lista de boletos!`);
      return;
    }

    if (boletoAlvo.notasOrigem && boletoAlvo.notasOrigem.length > 0) {
      const qtd = boletoAlvo.notasOrigem.length;
      const valorPorTitulo = parseFloat((boletoAlvo.valor / qtd).toFixed(2));
      const diferencaCentavos = parseFloat((boletoAlvo.valor - (valorPorTitulo * qtd)).toFixed(2));

      const desmembrados: BoletoAPagar[] = boletoAlvo.notasOrigem.map((nfNum, idx) => {
        const val = idx === 0 ? valorPorTitulo + diferencaCentavos : valorPorTitulo;
        return {
          id: `bol-desv-${Date.now()}-${idx}`,
          numeroNF: nfNum,
          fornecedor: boletoAlvo.fornecedor,
          categoria: boletoAlvo.categoria,
          dataEmissaoNF: boletoAlvo.dataEmissaoNF,
          valor: val,
          dataVencimento: boletoAlvo.dataVencimento,
          parcelaInfo: 'Única',
          codigoBarras: undefined,
          pago: false,
          criadoEm: new Date().toISOString(),
          observacoes: `Título desvinculado do boleto ${boletoAlvo.numeroNF}`,
        };
      });

      setBoletos(prev => {
        const filtrados = prev.filter(b => b.id !== boletoId);
        return [...desmembrados, ...filtrados];
      });
      showToast(`${qtd} títulos desvinculados com sucesso e retornados à lista de boletos!`);
      return;
    }

    showToast('Não foi possível identificar os títulos originais deste agrupamento.', 'info');
  };

  // --- Handlers: Baixa de OS ---
  const handleDarBaixaOS = (id: string, observacao?: string) => {
    setOrdensServico(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          status: 'baixada',
          dataBaixa: new Date().toISOString(),
          observacao: observacao !== undefined ? observacao : o.observacao,
        };
      }
      return o;
    }));
    const target = ordensServico.find(o => o.id === id);
    showToast(`Baixa realizada com sucesso na OS ${target?.numero || ''}!`);
  };

  const handleDesfazerBaixaOS = (id: string) => {
    setOrdensServico(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          status: 'pendente',
          dataBaixa: undefined,
        };
      }
      return o;
    }));
    const target = ordensServico.find(o => o.id === id);
    showToast(`Baixa da OS ${target?.numero || ''} desfeita (reaberta como pendente).`);
  };

  const handleExcluirOS = (id: string) => {
    const target = ordensServico.find(o => o.id === id);
    setOrdensServico(prev => prev.filter(o => o.id !== id));
    showToast(`OS ${target?.numero || ''} excluída da lista.`);
  };

  const handleAddOS = (numero: number, observacao?: string): boolean => {
    if (ordensServico.some(o => o.numero === numero)) {
      return false;
    }
    const nova: OrdemServico = {
      id: `os-${numero}-${Date.now()}`,
      numero,
      status: 'pendente',
      observacao,
      criadoEm: new Date().toISOString(),
    };
    setOrdensServico(prev => [...prev, nova].sort((a, b) => a.numero - b.numero));
    showToast(`OS ${numero} inserida na lista com sucesso!`);
    return true;
  };

  const handleGerarSequenciaOS = (inicio: number, quantidade: number): number => {
    const existing = new Set(ordensServico.map(o => o.numero));
    const toAdd: OrdemServico[] = [];
    for (let i = 0; i < quantidade; i++) {
      const num = inicio + i;
      if (!existing.has(num)) {
        toAdd.push({
          id: `os-${num}-${Date.now()}-${i}`,
          numero: num,
          status: 'pendente',
          criadoEm: new Date().toISOString(),
        });
      }
    }
    if (toAdd.length > 0) {
      setOrdensServico(prev => [...prev, ...toAdd].sort((a, b) => a.numero - b.numero));
      showToast(`${toAdd.length} numerações de OS geradas em sequência!`);
    } else {
      showToast('Todas as numerações do intervalo já existem na lista.');
    }
    return toAdd.length;
  };

  // --- Backup & Restore ---
  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const confirmResetData = () => {
    const reset = resetProfileToDefault(activeProfileId);
    setProfileData(reset);
    syncSaveProfileData(activeProfileId, reset);
    showToast(`Dados padrão restaurados para ${profilesConfig[activeProfileId].name}.`);
  };

  // Export current active profile
  const handleExportData = () => {
    const exportObject = {
      tipo: 'backup_perfil_individual',
      perfilId: activeProfileId,
      perfilNome: profilesConfig[activeProfileId].name,
      dataExportacao: new Date().toISOString(),
      pagamentos,
      notasFiscais,
      boletos,
      ordensServico,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportObject, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `backup_${activeProfileId}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Backup de ${profilesConfig[activeProfileId].name} exportado com sucesso.`);
  };

  // Export both profiles consolidated
  const handleExportAmbosPerfis = () => {
    saveProfileData(activeProfileId, profileData);
    const dataP1 = loadProfileData('perfil_1');
    const dataP2 = loadProfileData('perfil_2');

    const fullBackup = {
      sistema: 'Gestão Financeira Empresarial Transunião',
      tipo: 'backup_consolidado_ambos_perfis',
      dataExportacao: new Date().toISOString(),
      profilesConfig,
      perfil_1: dataP1,
      perfil_2: dataP2,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(fullBackup, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `backup_completo_ambos_perfis_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup completo de ambos os perfis exportado com sucesso.');
  };

  // Import Handler (supports both single profile and dual profile backups)
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);

          // Check if it's a dual-profile consolidated backup
          if (parsed.tipo === 'backup_consolidado_ambos_perfis' && parsed.perfil_1 && parsed.perfil_2) {
            saveProfileData('perfil_1', parsed.perfil_1);
            saveProfileData('perfil_2', parsed.perfil_2);
            if (parsed.profilesConfig) {
              setProfilesConfig(parsed.profilesConfig);
              saveProfilesConfig(parsed.profilesConfig);
            }
            const reloaded = loadProfileData(activeProfileId);
            setProfileData(reloaded);
            showToast('Backup completo de ambos os perfis importado com sucesso!');
            return;
          }

          // Single profile backup or legacy format
          if (Array.isArray(parsed.pagamentos) && Array.isArray(parsed.notasFiscais) && Array.isArray(parsed.boletos)) {
            const importedData: ProfileData = {
              pagamentos: parsed.pagamentos,
              notasFiscais: parsed.notasFiscais,
              boletos: parsed.boletos,
              ordensServico: Array.isArray(parsed.ordensServico) ? parsed.ordensServico : [],
            };
            setProfileData(importedData);
            saveProfileData(activeProfileId, importedData);
            showToast(`Dados importados com sucesso para ${profilesConfig[activeProfileId].name}!`);
          } else {
            showToast('Arquivo JSON inválido para este sistema financeiro.');
          }
        } catch {
          showToast('Falha ao processar o arquivo JSON selecionado.');
        }
      };
    }
  };

  const handleExportExcelGeral = () => {
    const pagFiltrados = pagamentos.filter(p => isDateInRange(p.dataPagamento, filtroData.dataInicio, filtroData.dataFim));
    const notasFiltradas = notasFiscais.filter(n => isDateInRange(n.dataEmissao, filtroData.dataInicio, filtroData.dataFim));
    const bolFiltrados = boletos.filter(b => isDateInRange(b.dataVencimento, filtroData.dataInicio, filtroData.dataFim));
    exportConsolidadoExcel(pagFiltrados, notasFiltradas, bolFiltrados, `${profilesConfig[activeProfileId].name} - ${getPeriodoDescricao(filtroData)}`);
    showToast(`Relatório em Excel gerado para ${profilesConfig[activeProfileId].name}!`);
  };

  const handleExportPdfGeral = () => {
    const pagFiltrados = pagamentos.filter(p => isDateInRange(p.dataPagamento, filtroData.dataInicio, filtroData.dataFim));
    const notasFiltradas = notasFiscais.filter(n => isDateInRange(n.dataEmissao, filtroData.dataInicio, filtroData.dataFim));
    const bolFiltrados = boletos.filter(b => isDateInRange(b.dataVencimento, filtroData.dataInicio, filtroData.dataFim));
    exportConsolidadoPDF(pagFiltrados, notasFiltradas, bolFiltrados, `${profilesConfig[activeProfileId].name} - ${getPeriodoDescricao(filtroData)}`);
    showToast(`Relatório em PDF gerado para ${profilesConfig[activeProfileId].name}!`);
  };

  // If user is not authenticated, show the Login Screen to restrict access
  if (!authSession || !authSession.isAuthenticated) {
    return (
      <LoginScreen
        profilesConfig={profilesConfig}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium">{toastMessage.text}</p>
          </div>
          {toastMessage.actionLabel && toastMessage.onAction && (
            <button
              onClick={() => {
                toastMessage.onAction!();
                setToastMessage(null);
              }}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0 px-2 py-1 bg-slate-800 rounded-md"
            >
              <span>{toastMessage.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Main Header & KPI Summary */}
      <Header
        pagamentos={pagamentos}
        notasFiscais={notasFiscais}
        boletos={boletos}
        filtroData={filtroData}
        activeProfileId={activeProfileId}
        profilesConfig={profilesConfig}
        currentUser={authSession.username}
        isCloudSynced={isCloudSynced}
        onSwitchProfile={handleSwitchProfile}
        onOpenEditProfileModal={() => setShowEditProfileModal(true)}
        onOpenChangePasswordModal={() => setShowChangePasswordModal(true)}
        onOpenUserProfileModal={() => setShowUserProfileModal(true)}
        onLogout={handleLogout}
        onFilterChange={setFiltroData}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onExportAmbosPerfis={handleExportAmbosPerfis}
        onImportData={handleImportData}
        onExportExcelGeral={handleExportExcelGeral}
        onExportPdfGeral={handleExportPdfGeral}
      />

      {/* Tabs Navigation */}
      <TabsNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        countPagamentos={pagamentos.length}
        countNotasFiscais={notasFiscais.length}
        boletos={boletos}
        countOrdensServico={ordensServico.length}
      />

      {/* Tab View Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-6">
        {activeTab === 'pagamentos' && (
          <PagamentosFeitosTab
            pagamentos={pagamentos}
            filtroDataGlobal={filtroData}
            onAddPagamento={handleAddPagamento}
            onUpdatePagamento={handleUpdatePagamento}
            onDeletePagamento={handleDeletePagamento}
          />
        )}

        {activeTab === 'notas_fiscais' && (
          <NotasFiscaisTab
            notasFiscais={notasFiscais}
            boletos={boletos}
            pagamentos={pagamentos}
            filtroDataGlobal={filtroData}
            onAddNotaFiscal={handleAddNotaFiscal}
            onUpdateNotaFiscal={handleUpdateNotaFiscal}
            onDeleteNotaFiscal={handleDeleteNotaFiscal}
            onNavigateToBoletos={() => setActiveTab('boletos')}
            onPagarELancarBoleto={handlePagarELancar}
            onAddPagamento={handleAddPagamento}
            onNavigateToPagamentos={() => setActiveTab('pagamentos')}
          />
        )}

        {activeTab === 'boletos' && (
          <BoletosTab
            boletos={boletos}
            filtroDataGlobal={filtroData}
            onDeleteBoleto={handleDeleteBoleto}
            onUpdateBoleto={handleUpdateBoleto}
            onDesvincularBoleto={handleDesvincularBoleto}
            onPagarELancar={handlePagarELancar}
            onAddBoletoAvulso={handleAddBoletoAvulso}
            onAgruparBoletos={handleAgruparBoletos}
          />
        )}

        {activeTab === 'baixa_os' && (
          <BaixaOSTab
            ordens={ordensServico}
            onDarBaixa={handleDarBaixaOS}
            onDesfazerBaixa={handleDesfazerBaixaOS}
            onExcluirOS={handleExcluirOS}
            onAddOS={handleAddOS}
            onGerarSequencia={handleGerarSequenciaOS}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          Sistema de Gestão Financeira Empresarial • Transunião • {profilesConfig[activeProfileId].name} • Lançamentos Independentes
        </p>
      </footer>

      {/* Modal de Customização de Perfis */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        profilesConfig={profilesConfig}
        onSaveProfiles={handleSaveProfilesConfig}
      />

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccessToast={showToast}
      />

      {/* Modal de Dados Pessoais do Usuário (Nome, E-mail, Telefone para Recuperação) */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        onSuccessToast={showToast}
      />

      {/* Modal de Restauração de Dados */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title={`Restaurar Dados - ${profilesConfig[activeProfileId].name}`}
        description={`Deseja restaurar os lançamentos padrão de "${profilesConfig[activeProfileId].name}"? Apenas os dados deste perfil serão redefinidos. O outro perfil permanecerá inalterado.`}
        confirmText="Restaurar Dados"
        cancelText="Cancelar"
        variant="warning"
        onConfirm={confirmResetData}
        onClose={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
