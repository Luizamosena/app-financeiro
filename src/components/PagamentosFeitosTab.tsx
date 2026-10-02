import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Calendar, 
  Hash, 
  User, 
  DollarSign, 
  FileSpreadsheet,
  FileText,
  Filter,
  Building,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Zap,
  Barcode
} from 'lucide-react';
import { PagamentoFeito } from '../types';
import { formatCurrency, formatDateBR, formatDateBResumida, formatMesAno, formatMesAnoResumido, parseCurrencyInput } from '../utils/formatters';
import { exportPagamentosExcel, exportPagamentosPDF } from '../utils/reports';
import { subscribeToFinancialOptions, syncSaveFinancialOptions } from '../services/firestoreSync';
import { FiltroData, isDateInRange, getPeriodoDescricao } from '../utils/dateFilter';
import { ConfirmModal } from './ConfirmModal';

interface PagamentosFeitosTabProps {
  pagamentos: PagamentoFeito[];
  filtroDataGlobal?: FiltroData;
  onAddPagamento: (pagamento: Omit<PagamentoFeito, 'id' | 'criadoEm'>) => void;
  onUpdatePagamento: (id: string, pagamento: Partial<PagamentoFeito>) => void;
  onDeletePagamento: (id: string, retornarBoleto?: boolean) => void;
}

export const PagamentosFeitosTab: React.FC<PagamentosFeitosTabProps> = ({
  pagamentos,
  filtroDataGlobal,
  onAddPagamento,
  onUpdatePagamento,
  onDeletePagamento,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [dataPagamento, setDataPagamento] = useState(() => new Date().toISOString().split('T')[0]);
  const [valorInput, setValorInput] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('');
  const [mesEmissaoNF, setMesEmissaoNF] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [banco, setBanco] = useState('');
  const [bancoCustom, setBancoCustom] = useState('');

  // Bank options for manual payment: only Banco do Brasil, Itaú, Pagbank by default, expandable with "+"
  const [bancosOpcoes, setBancosOpcoes] = useState<string[]>(() => {
    const defaultBanks = ['Banco do Brasil', 'Itaú', 'Pagbank'];
    const legacyExcluded = ['bradesco', 'caixa econômica', 'caixa economica', 'santander', 'nubank', 'inter', 'banco inter', 'sicoob', 'sicredi'];
    try {
      const saved = localStorage.getItem('transuniao_bancos_opcoes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep only Banco do Brasil, Itaú, Pagbank and any non-legacy custom user banks
          const filtered = parsed.filter((b: string) => {
            const bLower = b.toLowerCase().trim();
            if (legacyExcluded.includes(bLower)) return false;
            return true;
          });
          // Ensure the 3 requested base banks are present
          defaultBanks.forEach(db => {
            if (!filtered.some((b: string) => b.toLowerCase() === db.toLowerCase())) {
              filtered.push(db);
            }
          });
          localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(filtered));
          return filtered;
        }
      }
    } catch {
      // fallback
    }
    return defaultBanks;
  });
  const [showNovoBancoInput, setShowNovoBancoInput] = useState(false);
  const [novoBancoNome, setNovoBancoNome] = useState('');

  // Payment methods: PIX, Liquidação de boleto, Cartão de crédito + expandable
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [formasPagamentoOpcoes, setFormasPagamentoOpcoes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('transuniao_formas_pagamento_opcoes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const standards = ['PIX', 'Liquidação de boleto', 'Cartão de crédito'];
          const merged = [...parsed];
          standards.forEach(s => {
            if (!merged.some(m => m.toLowerCase() === s.toLowerCase())) {
              merged.push(s);
            }
          });
          return merged;
        }
      }
    } catch {
      // fallback
    }
    return ['PIX', 'Liquidação de boleto', 'Cartão de crédito'];
  });
  const [showNovaFormaInput, setShowNovaFormaInput] = useState(false);
  const [novaFormaNome, setNovaFormaNome] = useState('');

  // Subscribe to real-time options from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToFinancialOptions((opts) => {
      if (opts.bancos && opts.bancos.length > 0) {
        setBancosOpcoes(opts.bancos);
      }
      if (opts.formasPagamento && opts.formasPagamento.length > 0) {
        setFormasPagamentoOpcoes(opts.formasPagamento);
      }
    });
    return () => unsubscribe();
  }, []);

  const [observacoes, setObservacoes] = useState('');
  const [formError, setFormError] = useState('');
  const [itemParaExcluir, setItemParaExcluir] = useState<PagamentoFeito | null>(null);
  const [retornarAosBoletos, setRetornarAosBoletos] = useState(true);

  // Edit in Modal
  const [pagamentoParaEditar, setPagamentoParaEditar] = useState<PagamentoFeito | null>(null);
  const [editDataPagamento, setEditDataPagamento] = useState('');
  const [editValorInput, setEditValorInput] = useState('');
  const [editBeneficiario, setEditBeneficiario] = useState('');
  const [editNumeroNF, setEditNumeroNF] = useState('');
  const [editMesEmissaoNF, setEditMesEmissaoNF] = useState('');
  const [editFormaPagamento, setEditFormaPagamento] = useState('PIX');
  const [editBanco, setEditBanco] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editModalError, setEditModalError] = useState('');
  const [editShowNovaForma, setEditShowNovaForma] = useState(false);
  const [editNovaFormaNome, setEditNovaFormaNome] = useState('');
  const [editShowNovoBanco, setEditShowNovoBanco] = useState(false);
  const [editNovoBancoNome, setEditNovoBancoNome] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMesEmissao, setSelectedMesEmissao] = useState('todos');
  const [selectedBanco, setSelectedBanco] = useState('todos');
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState('todos');
  const [aplicarFiltroData, setAplicarFiltroData] = useState(true);

  // Month options for filter based on existing data
  const mesesDisponiveis = useMemo(() => {
    const setMeses = new Set<string>();
    pagamentos.forEach(p => {
      if (p.mesEmissaoNF) setMeses.add(p.mesEmissaoNF);
    });
    return Array.from(setMeses).sort().reverse();
  }, [pagamentos]);

  // Banks available in existing payments for filtering
  const bancosDisponiveis = useMemo(() => {
    const setBancos = new Set<string>();
    pagamentos.forEach(p => {
      if (p.banco) setBancos.add(p.banco);
    });
    return Array.from(setBancos).sort();
  }, [pagamentos]);

  // Formas de pagamento available in existing payments for filtering
  const formasDisponiveis = useMemo(() => {
    const setFormas = new Set<string>();
    pagamentos.forEach(p => {
      if (p.formaPagamento) {
        setFormas.add(p.formaPagamento);
      } else if (p.boletoOrigem) {
        setFormas.add('Liquidação de boleto');
      }
    });
    return Array.from(setFormas).sort();
  }, [pagamentos]);

  // Filtered payments list
  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter(p => {
      const matchSearch = 
        p.beneficiario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numeroNotaFiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.formaPagamento && p.formaPagamento.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.banco && p.banco.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.observacoes && p.observacoes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMes = selectedMesEmissao === 'todos' || p.mesEmissaoNF === selectedMesEmissao;
      const matchBanco = selectedBanco === 'todos' || p.banco === selectedBanco;
      const matchForma = selectedFormaPagamento === 'todos' || 
        (p.formaPagamento === selectedFormaPagamento) ||
        (!p.formaPagamento && p.boletoOrigem && selectedFormaPagamento === 'Liquidação de boleto');

      const matchData = !aplicarFiltroData || !filtroDataGlobal || filtroDataGlobal.preset === 'todos' || 
        isDateInRange(p.dataPagamento, filtroDataGlobal.dataInicio, filtroDataGlobal.dataFim);

      return matchSearch && matchMes && matchBanco && matchForma && matchData;
    }).sort((a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime());
  }, [pagamentos, searchTerm, selectedMesEmissao, selectedBanco, selectedFormaPagamento, aplicarFiltroData, filtroDataGlobal]);

  // Statistics for the filtered view
  const totalFiltrado = useMemo(() => {
    return filteredPagamentos.reduce((sum, p) => sum + (p.valor || 0), 0);
  }, [filteredPagamentos]);

  const handleAdicionarNovaForma = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeLimpo = novaFormaNome.trim();
    if (!nomeLimpo) return;
    if (!formasPagamentoOpcoes.some(f => f.toLowerCase() === nomeLimpo.toLowerCase())) {
      const novasOpcoes = [...formasPagamentoOpcoes, nomeLimpo];
      setFormasPagamentoOpcoes(novasOpcoes);
      syncSaveFinancialOptions({ formasPagamento: novasOpcoes });
    }
    setFormaPagamento(nomeLimpo);
    setNovaFormaNome('');
    setShowNovaFormaInput(false);
  };

  const handleAdicionarNovoBanco = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeLimpo = novoBancoNome.trim();
    if (!nomeLimpo) return;
    if (!bancosOpcoes.some(b => b.toLowerCase() === nomeLimpo.toLowerCase())) {
      const novasOpcoes = [...bancosOpcoes, nomeLimpo];
      setBancosOpcoes(novasOpcoes);
      syncSaveFinancialOptions({ bancos: novasOpcoes });
    }
    setBanco(nomeLimpo);
    setNovoBancoNome('');
    setShowNovoBancoInput(false);
  };

  const resetForm = () => {
    setDataPagamento(new Date().toISOString().split('T')[0]);
    setValorInput('');
    setBeneficiario('');
    setNumeroNotaFiscal('');
    const d = new Date();
    setMesEmissaoNF(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setBanco('');
    setBancoCustom('');
    setShowNovoBancoInput(false);
    setNovoBancoNome('');
    setFormaPagamento('PIX');
    setShowNovaFormaInput(false);
    setNovaFormaNome('');
    setObservacoes('');
    setEditingId(null);
    setFormError('');
    setShowForm(false);
  };

  const handleStartEdit = (p: PagamentoFeito) => {
    setEditingId(p.id);
    setDataPagamento(p.dataPagamento);
    setValorInput(p.valor.toString().replace('.', ','));
    setBeneficiario(p.beneficiario);
    setNumeroNotaFiscal(p.numeroNotaFiscal);
    setMesEmissaoNF(p.mesEmissaoNF);
    if (p.formaPagamento) {
      setFormaPagamento(p.formaPagamento);
      if (!formasPagamentoOpcoes.some(f => f.toLowerCase() === p.formaPagamento!.toLowerCase())) {
        const novasOpcoes = [...formasPagamentoOpcoes, p.formaPagamento];
        setFormasPagamentoOpcoes(novasOpcoes);
        try {
          localStorage.setItem('transuniao_formas_pagamento_opcoes', JSON.stringify(novasOpcoes));
        } catch {
          // ignore
        }
      }
    } else if (p.boletoOrigem) {
      setFormaPagamento('Liquidação de boleto');
    } else {
      setFormaPagamento('PIX');
    }
    setShowNovaFormaInput(false);
    setNovaFormaNome('');

    if (p.banco) {
      setBanco(p.banco);
      if (!bancosOpcoes.some(b => b.toLowerCase() === p.banco!.toLowerCase())) {
        const novasOpcoes = [...bancosOpcoes, p.banco];
        setBancosOpcoes(novasOpcoes);
        try {
          localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(novasOpcoes));
        } catch {
          // ignore
        }
      }
    } else {
      setBanco('');
    }
    setBancoCustom('');
    setShowNovoBancoInput(false);
    setNovoBancoNome('');
    setObservacoes(p.observacoes || '');
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEditModal = (p: PagamentoFeito) => {
    setPagamentoParaEditar(p);
    setEditDataPagamento(p.dataPagamento);
    setEditValorInput(p.valor.toString().replace('.', ','));
    setEditBeneficiario(p.beneficiario);
    setEditNumeroNF(p.numeroNotaFiscal);
    setEditMesEmissaoNF(p.mesEmissaoNF);
    const forma = p.formaPagamento || (p.boletoOrigem ? 'Liquidação de boleto' : 'PIX');
    setEditFormaPagamento(forma);
    if (!formasPagamentoOpcoes.some(f => f.toLowerCase() === forma.toLowerCase())) {
      const novas = [...formasPagamentoOpcoes, forma];
      setFormasPagamentoOpcoes(novas);
      try {
        localStorage.setItem('transuniao_formas_pagamento_opcoes', JSON.stringify(novas));
      } catch {}
    }
    const bnc = p.banco || '';
    setEditBanco(bnc);
    if (bnc && !bancosOpcoes.some(b => b.toLowerCase() === bnc.toLowerCase())) {
      const novos = [...bancosOpcoes, bnc];
      setBancosOpcoes(novos);
      try {
        localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(novos));
      } catch {}
    }
    setEditObservacoes(p.observacoes || '');
    setEditModalError('');
    setEditShowNovaForma(false);
    setEditNovaFormaNome('');
    setEditShowNovoBanco(false);
    setEditNovoBancoNome('');
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagamentoParaEditar) return;
    const valNumerico = parseCurrencyInput(editValorInput);

    if (!editDataPagamento) {
      setEditModalError('Informe a data do pagamento.');
      return;
    }
    if (valNumerico <= 0) {
      setEditModalError('Informe um valor válido maior que zero.');
      return;
    }
    if (!editBeneficiario.trim()) {
      setEditModalError('Informe o nome do beneficiário.');
      return;
    }
    if (!editNumeroNF.trim()) {
      setEditModalError('Informe o número da nota fiscal de origem.');
      return;
    }
    if (!editMesEmissaoNF) {
      setEditModalError('Informe o mês de emissão da nota fiscal.');
      return;
    }

    onUpdatePagamento(pagamentoParaEditar.id, {
      dataPagamento: editDataPagamento,
      valor: valNumerico,
      beneficiario: editBeneficiario.trim(),
      numeroNotaFiscal: editNumeroNF.trim(),
      mesEmissaoNF: editMesEmissaoNF,
      formaPagamento: editFormaPagamento.trim() || undefined,
      banco: editBanco.trim() || undefined,
      observacoes: editObservacoes.trim() || undefined,
    });

    setPagamentoParaEditar(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valNumerico = parseCurrencyInput(valorInput);

    if (!dataPagamento) {
      setFormError('Informe a data do pagamento.');
      return;
    }
    if (valNumerico <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }
    if (!beneficiario.trim()) {
      setFormError('Informe o nome do beneficiário.');
      return;
    }
    if (!numeroNotaFiscal.trim()) {
      setFormError('Informe o número da nota fiscal de origem.');
      return;
    }
    if (!mesEmissaoNF) {
      setFormError('Informe o mês de emissão da nota fiscal.');
      return;
    }

    const bancoFinal = banco.trim();
    const formaFinal = formaPagamento.trim();

    if (editingId) {
      onUpdatePagamento(editingId, {
        dataPagamento,
        valor: valNumerico,
        beneficiario: beneficiario.trim(),
        numeroNotaFiscal: numeroNotaFiscal.trim(),
        mesEmissaoNF,
        formaPagamento: formaFinal || undefined,
        banco: bancoFinal || undefined,
        observacoes: observacoes.trim() || undefined,
      });
    } else {
      onAddPagamento({
        dataPagamento,
        valor: valNumerico,
        beneficiario: beneficiario.trim(),
        numeroNotaFiscal: numeroNotaFiscal.trim(),
        mesEmissaoNF,
        formaPagamento: formaFinal || undefined,
        banco: bancoFinal || undefined,
        observacoes: observacoes.trim() || undefined,
      });
    }

    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Top action & banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Lançamento de Pagamentos Feitos
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              Despesas Liquidadas
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Registre e consulte as liquidações com data, valor, beneficiário, NF de origem e mês de emissão
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Relatório Excel */}
          <button
            id="btn-relatorio-excel-pagamentos"
            onClick={() => {
              const filtrosArr: string[] = [];
              if (aplicarFiltroData && filtroDataGlobal && filtroDataGlobal.preset !== 'todos') {
                filtrosArr.push(`Período: ${getPeriodoDescricao(filtroDataGlobal)}`);
              }
              if (selectedMesEmissao !== 'todos') {
                filtrosArr.push(`NF emitida em ${formatMesAno(selectedMesEmissao)}`);
              }
              if (selectedFormaPagamento !== 'todos') {
                filtrosArr.push(`Forma: ${selectedFormaPagamento}`);
              }
              if (selectedBanco !== 'todos') {
                filtrosArr.push(`Banco: ${selectedBanco}`);
              }
              const filtroInfo = filtrosArr.length > 0 ? filtrosArr.join(' | ') : undefined;
              exportPagamentosExcel(filteredPagamentos, filtroInfo);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
            title="Baixar relatório em formato Excel (.xlsx) com filtros ativos"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Relatório PDF */}
          <button
            id="btn-relatorio-pdf-pagamentos"
            onClick={() => {
              const filtrosArr: string[] = [];
              if (aplicarFiltroData && filtroDataGlobal && filtroDataGlobal.preset !== 'todos') {
                filtrosArr.push(`Período: ${getPeriodoDescricao(filtroDataGlobal)}`);
              }
              if (selectedMesEmissao !== 'todos') {
                filtrosArr.push(`NF emitida em ${formatMesAno(selectedMesEmissao)}`);
              }
              if (selectedFormaPagamento !== 'todos') {
                filtrosArr.push(`Forma: ${selectedFormaPagamento}`);
              }
              if (selectedBanco !== 'todos') {
                filtrosArr.push(`Banco: ${selectedBanco}`);
              }
              const filtroInfo = filtrosArr.length > 0 ? filtrosArr.join(' | ') : undefined;
              exportPagamentosPDF(filteredPagamentos, filtroInfo);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            title="Gerar relatório em formato PDF com filtros ativos"
          >
            <FileText className="w-4 h-4 text-rose-700" />
            <span>PDF (.pdf)</span>
          </button>

          <button
            id="btn-novo-pagamento"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Fechar Formulário' : 'Novo Pagamento'}</span>
          </button>
        </div>
      </div>

      {/* Form Container */}
      {showForm && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {editingId ? 'Editar Lançamento de Pagamento' : 'Cadastrar Pagamento Feito'}
            </h3>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 p-3 text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Data do Pagamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data do Pagamento *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="input-data-pagamento"
                    type="date"
                    required
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Valor Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Pago (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    id="input-valor-pagamento"
                    type="text"
                    required
                    placeholder="Ex: 1.500,00"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Nome do Beneficiário */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Beneficiário *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-beneficiario-pagamento"
                    type="text"
                    required
                    placeholder="Ex: Posto Petrovale Ltda"
                    value={beneficiario}
                    onChange={(e) => setBeneficiario(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número da Nota Fiscal de Origem */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número da Nota Fiscal de Origem *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    id="input-nf-origem-pagamento"
                    type="text"
                    required
                    placeholder="Ex: NF-10482 ou 10482"
                    value={numeroNotaFiscal}
                    onChange={(e) => setNumeroNotaFiscal(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Mês que foi emitida a Nota Fiscal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mês de Emissão da Nota Fiscal *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="input-mes-emissao-nf"
                    type="month"
                    required
                    value={mesEmissaoNF}
                    onChange={(e) => setMesEmissaoNF(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formatado: <strong className="text-slate-700">{formatMesAno(mesEmissaoNF)}</strong>
                </p>
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tipo / Forma de Pagamento *</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  PIX, Liquidação de boleto, Cartão de crédito ou lance outra forma
                </span>
              </div>

              {/* Botões de formas de pagamento */}
              <div className="flex items-center gap-2 flex-wrap">
                {formasPagamentoOpcoes.map((fName) => {
                  const isSelected = formaPagamento.toLowerCase() === fName.toLowerCase();
                  const isPix = fName.toLowerCase().includes('pix');
                  const isBoleto = fName.toLowerCase().includes('boleto') || fName.toLowerCase().includes('liquidação');
                  const isCartao = fName.toLowerCase().includes('cartão') || fName.toLowerCase().includes('cartao');

                  return (
                    <button
                      key={fName}
                      type="button"
                      id={`btn-manual-forma-${fName.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => setFormaPagamento(fName)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/20'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : isPix ? (
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isBoleto ? (
                        <Barcode className="w-3.5 h-3.5 text-amber-600" />
                      ) : isCartao ? (
                        <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{fName}</span>
                    </button>
                  );
                })}

                {/* Botão + para lançar outra forma de pagamento */}
                {!showNovaFormaInput && (
                  <button
                    type="button"
                    id="btn-manual-adicionar-outra-forma"
                    onClick={() => setShowNovaFormaInput(true)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-dashed border-emerald-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    title="Lançar outra forma de pagamento nas opções"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar Outra Forma</span>
                  </button>
                )}
              </div>

              {/* Campo aberto para cadastrar nova forma de pagamento */}
              {showNovaFormaInput && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <label className="block text-[11px] font-semibold text-emerald-900">
                    Nome da nova forma de pagamento:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      id="input-manual-nova-forma-nome"
                      placeholder="Ex: Transferência TED, Cheque, Dinheiro, Cartão de Débito..."
                      value={novaFormaNome}
                      onChange={(e) => setNovaFormaNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAdicionarNovaForma();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      id="btn-manual-salvar-nova-forma"
                      onClick={() => handleAdicionarNovaForma()}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNovaFormaInput(false);
                        setNovaFormaNome('');
                      }}
                      className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Banco do Pagamento & Observações */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>Banco / Conta de Saída do Pagamento</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Opcional - selecione o banco de saída ou lance um novo
                </span>
              </div>

              {/* Bank options: Banco do Brasil, Itaú, Pagbank + dynamic banks */}
              <div className="flex items-center gap-2 flex-wrap">
                {bancosOpcoes.map((bName) => {
                  const isSelected = banco === bName;
                  return (
                    <button
                      key={bName}
                      type="button"
                      id={`btn-manual-banco-${bName.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => setBanco(isSelected ? '' : bName)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      <span>{bName}</span>
                    </button>
                  );
                })}

                {/* Botão + para lançar outro banco */}
                {!showNovoBancoInput && (
                  <button
                    type="button"
                    id="btn-manual-adicionar-outro-banco"
                    onClick={() => setShowNovoBancoInput(true)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    title="Lançar novo banco nas opções"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar Novo Banco</span>
                  </button>
                )}
              </div>

              {/* Campo aberto para cadastrar novo banco */}
              {showNovoBancoInput && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <label className="block text-[11px] font-semibold text-blue-900">
                    Nome do novo banco / instituição:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      id="input-manual-novo-banco-nome"
                      placeholder="Ex: Santander, Bradesco, Caixa, Nubank, Sicoob..."
                      value={novoBancoNome}
                      onChange={(e) => setNovoBancoNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAdicionarNovoBanco();
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      id="btn-manual-salvar-novo-banco"
                      onClick={() => handleAdicionarNovoBanco()}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNovoBancoInput(false);
                        setNovoBancoNome('');
                      }}
                      className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Observações */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações / Descrição do Pagamento (Opcional)
                </label>
                <input
                  id="input-obs-pagamento"
                  type="text"
                  placeholder="Ex: Abastecimento de frota, pagamento via PIX, comprovante nº 4893"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-salvar-pagamento"
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Atualizar Pagamento' : 'Salvar Pagamento'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              id="search-pagamentos"
              type="text"
              placeholder="Buscar por beneficiário, banco, nº da NF ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-mes-emissao"
              value={selectedMesEmissao}
              onChange={(e) => setSelectedMesEmissao(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 max-w-[190px]"
            >
              <option value="todos">Todos os Meses</option>
              {mesesDisponiveis.map(mes => (
                <option key={mes} value={mes}>
                  NF: {formatMesAnoResumido(mes)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-forma-pagamento"
              value={selectedFormaPagamento}
              onChange={(e) => setSelectedFormaPagamento(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 max-w-[170px]"
            >
              <option value="todos">Todas as Formas</option>
              {formasDisponiveis.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Bank Filter */}
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-banco"
              value={selectedBanco}
              onChange={(e) => setSelectedBanco(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 max-w-[170px]"
            >
              <option value="todos">Todos os Bancos</option>
              {bancosDisponiveis.map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Badge */}
        <div className="flex items-center gap-2 shrink-0 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            Total Lançamentos ({filteredPagamentos.length}):
          </span>
          <span className="text-xs font-bold text-emerald-700">
            {formatCurrency(totalFiltrado)}
          </span>
        </div>
      </div>

      {/* Active Global Date Filter Pill */}
      {filtroDataGlobal && filtroDataGlobal.preset !== 'todos' && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-semibold text-blue-800">Filtro de Período Ativo:</span>
            <span className="text-blue-900 font-medium">{getPeriodoDescricao(filtroDataGlobal)}</span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 font-medium">
            <input
              type="checkbox"
              checked={aplicarFiltroData}
              onChange={(e) => setAplicarFiltroData(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Aplicar a esta tabela e aos relatórios</span>
          </label>
        </div>
      )}

      {/* Table of Pagamentos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-2.5 whitespace-nowrap">Data Pagto</th>
                <th className="py-2.5 px-2.5 min-w-[130px]">Beneficiário</th>
                <th className="py-2.5 px-2 whitespace-nowrap">NF Origem</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Mês NF</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Forma Pagto</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Banco / Conta</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Valor Pago</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPagamentos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Nenhum pagamento encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || selectedMesEmissao !== 'todos' || selectedBanco !== 'todos' || selectedFormaPagamento !== 'todos'
                        ? 'Tente ajustar os filtros ou termo de busca.'
                        : 'Clique no botão "Novo Pagamento" para registrar um lançamento.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPagamentos.map((pag) => (
                  <tr 
                    key={pag.id} 
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-2.5 font-semibold text-slate-900 whitespace-nowrap text-xs" title={formatDateBR(pag.dataPagamento)}>
                      {formatDateBResumida(pag.dataPagamento)}
                    </td>
                    <td className="py-2.5 px-2.5 max-w-[200px]">
                      <div className="font-semibold text-slate-800 truncate" title={pag.beneficiario}>
                        {pag.beneficiario}
                      </div>
                      {pag.observacoes && !(() => {
                        const obsLower = pag.observacoes.trim().toLowerCase();
                        return (
                          obsLower.startsWith('lançamento automático via pix') ||
                          obsLower.startsWith('lançamento manual via pix') ||
                          obsLower.startsWith('pagamento via pix ref. nf') ||
                          obsLower === 'pagamento via pix'
                        );
                      })() && (
                        <div className="text-[11px] text-slate-500 truncate" title={pag.observacoes}>
                          {pag.observacoes}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {pag.numeroNotaFiscal}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap text-slate-700 font-semibold text-xs" title={formatMesAno(pag.mesEmissaoNF)}>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100/80 text-slate-700 border border-slate-200 text-[11px]">
                        {formatMesAnoResumido(pag.mesEmissaoNF)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {pag.formaPagamento ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          pag.formaPagamento.toLowerCase().includes('pix')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : pag.formaPagamento.toLowerCase().includes('boleto') || pag.formaPagamento.toLowerCase().includes('liquidação')
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : pag.formaPagamento.toLowerCase().includes('cartão') || pag.formaPagamento.toLowerCase().includes('cartao')
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {pag.formaPagamento.toLowerCase().includes('pix') ? (
                            <Zap className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          ) : pag.formaPagamento.toLowerCase().includes('boleto') || pag.formaPagamento.toLowerCase().includes('liquidação') ? (
                            <Barcode className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          ) : pag.formaPagamento.toLowerCase().includes('cartão') || pag.formaPagamento.toLowerCase().includes('cartao') ? (
                            <CreditCard className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                          ) : (
                            <CreditCard className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                          )}
                          <span>{pag.formaPagamento}</span>
                        </span>
                      ) : pag.boletoOrigem ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                          <Barcode className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          <span>Liquidação de boleto</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Não informada</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {pag.banco ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <Building className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                          <span>{pag.banco}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Não informado</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap text-xs">
                      {formatCurrency(pag.valor)}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-0.5 justify-center">
                        <button
                          id={`btn-edit-pag-${pag.id}`}
                          onClick={() => handleOpenEditModal(pag)}
                          title="Editar lançamento"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-pag-${pag.id}`}
                          onClick={() => {
                            setItemParaExcluir(pag);
                            setRetornarAosBoletos(true);
                          }}
                          title="Excluir ou cancelar lançamento"
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cancelamento de Pagamento oriundo de Baixa de Título */}
      {itemParaExcluir && Boolean(
        itemParaExcluir.boletoOrigem ||
        itemParaExcluir.observacoes?.toLowerCase().includes('baixa de boleto') ||
        itemParaExcluir.observacoes?.toLowerCase().includes('baixa')
      ) ? (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Cancelar Pagamento de Título
                  </h3>
                  <p className="text-xs text-amber-800">
                    Estorno de baixa e retorno aos boletos em aberto
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Card Resumo do Lançamento */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiário:</span>
                  <span className="font-semibold text-slate-900">{itemParaExcluir.beneficiario}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NF de Origem:</span>
                  <span className="font-mono font-semibold text-slate-900">{itemParaExcluir.numeroNotaFiscal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data do Pagamento:</span>
                  <span className="font-semibold text-slate-900">{formatDateBR(itemParaExcluir.dataPagamento)}</span>
                </div>
                {itemParaExcluir.banco && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Banco:</span>
                    <span className="font-semibold text-slate-900">{itemParaExcluir.banco}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                  <span className="font-bold text-slate-700">Valor Pago:</span>
                  <span className="font-bold text-rose-600 text-sm">{formatCurrency(itemParaExcluir.valor)}</span>
                </div>
              </div>

              {/* Aviso e Pergunta de Retorno aos Boletos em Aberto */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed font-medium">
                    Este pagamento é <strong>oriundo da baixa de um título</strong>. Deseja retornar aquele título para a lista de boletos em aberto?
                  </div>
                </div>

                {/* Opção Selecionável */}
                <label 
                  htmlFor="checkbox-retornar-boleto"
                  className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-amber-300/80 cursor-pointer hover:border-amber-400 transition-colors shadow-2xs"
                >
                  <input
                    type="checkbox"
                    id="checkbox-retornar-boleto"
                    checked={retornarAosBoletos}
                    onChange={(e) => setRetornarAosBoletos(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-900 block">
                      Sim, retornar este título aos boletos em aberto
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      O título voltará a constar como pendente na aba <strong>3. Boletos a Pagar</strong>.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-confirmar-cancelamento-pagamento"
                onClick={() => {
                  onDeletePagamento(itemParaExcluir.id, retornarAosBoletos);
                  setItemParaExcluir(null);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-colors cursor-pointer ${
                  retornarAosBoletos
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {retornarAosBoletos ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>
                  {retornarAosBoletos ? 'Cancelar e Retornar Boleto' : 'Apenas Excluir Lançamento'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Modal padrão para pagamentos manuais não originados de boleto */
        <ConfirmModal
          isOpen={!!itemParaExcluir}
          title="Excluir Lançamento de Pagamento"
          description={
            itemParaExcluir
              ? `Tem certeza que deseja excluir o pagamento de ${formatCurrency(itemParaExcluir.valor)} para "${itemParaExcluir.beneficiario}" (NF nº ${itemParaExcluir.numeroNotaFiscal})?`
              : ''
          }
          confirmText="Sim, Excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={() => {
            if (itemParaExcluir) {
              onDeletePagamento(itemParaExcluir.id, false);
              setItemParaExcluir(null);
            }
          }}
          onClose={() => setItemParaExcluir(null)}
        />
      )}

      {/* Modal: Editar Lançamento de Pagamento */}
      {pagamentoParaEditar && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Editar Lançamento de Pagamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atualize os detalhes financeiros deste pagamento realizado
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPagamentoParaEditar(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditModal} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {editModalError && (
                  <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                    {editModalError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Data do Pagamento */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data do Pagamento *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={editDataPagamento}
                        onChange={(e) => setEditDataPagamento(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Valor Pago (R$) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor Pago (R$) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                        R$
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="0,00"
                        value={editValorInput}
                        onChange={(e) => setEditValorInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Beneficiário */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Beneficiário / Fornecedor *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Nome do favorecido"
                        value={editBeneficiario}
                        onChange={(e) => setEditBeneficiario(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Número da NF */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número da Nota Fiscal *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Hash className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Ex: NF-1234"
                        value={editNumeroNF}
                        onChange={(e) => setEditNumeroNF(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Mês de Emissão da NF */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mês de Emissão da NF *
                  </label>
                  <input
                    type="month"
                    required
                    value={editMesEmissaoNF}
                    onChange={(e) => setEditMesEmissaoNF(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Forma de Pagamento
                    </label>
                    {!editShowNovaForma && (
                      <button
                        type="button"
                        onClick={() => setEditShowNovaForma(true)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        + Lançar Outra Forma
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formasPagamentoOpcoes.map((forma) => (
                      <button
                        key={forma}
                        type="button"
                        onClick={() => setEditFormaPagamento(forma)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          editFormaPagamento === forma
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {forma}
                      </button>
                    ))}
                  </div>
                  {editShowNovaForma && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nome da nova forma (ex: TED)"
                        value={editNovaFormaNome}
                        onChange={(e) => setEditNovaFormaNome(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editNovaFormaNome.trim()) {
                            const nova = editNovaFormaNome.trim();
                            if (!formasPagamentoOpcoes.some(f => f.toLowerCase() === nova.toLowerCase())) {
                              const updated = [...formasPagamentoOpcoes, nova];
                              setFormasPagamentoOpcoes(updated);
                              try {
                                localStorage.setItem('transuniao_formas_pagamento_opcoes', JSON.stringify(updated));
                              } catch {}
                            }
                            setEditFormaPagamento(nova);
                            setEditNovaFormaNome('');
                            setEditShowNovaForma(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditShowNovaForma(false);
                          setEditNovaFormaNome('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Banco / Conta */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Banco / Conta Origem
                    </label>
                    {!editShowNovoBanco && (
                      <button
                        type="button"
                        onClick={() => setEditShowNovoBanco(true)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        + Lançar Novo Banco
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bancosOpcoes.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setEditBanco(editBanco === b ? '' : b)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          editBanco === b
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  {editShowNovoBanco && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nome da instituição (ex: Santander)"
                        value={editNovoBancoNome}
                        onChange={(e) => setEditNovoBancoNome(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editNovoBancoNome.trim()) {
                            const novo = editNovoBancoNome.trim();
                            if (!bancosOpcoes.some(b => b.toLowerCase() === novo.toLowerCase())) {
                              const updated = [...bancosOpcoes, novo];
                              setBancosOpcoes(updated);
                              try {
                                localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(updated));
                              } catch {}
                            }
                            setEditBanco(novo);
                            setEditNovoBancoNome('');
                            setEditShowNovoBanco(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditShowNovoBanco(false);
                          setEditNovoBancoNome('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais do pagamento..."
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPagamentoParaEditar(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
