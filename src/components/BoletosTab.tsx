import React, { useState, useMemo, useEffect } from 'react';
import { 
  ReceiptText, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Copy, 
  Check, 
  Plus, 
  X, 
  Clock, 
  Building, 
  Hash, 
  DollarSign, 
  Tag, 
  FileCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  Edit3,
  Unlink,
  Settings
} from 'lucide-react';
import { BoletoAPagar, CategoriaNF } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  getStatusVencimento, 
  getCategoriaLabel, 
  getCategoriaBadgeClass,
  parseCurrencyInput,
  formatNumberToCurrencyInput,
  sanitizeCurrencyInputOnBlur,
  maskCurrencyInput
} from '../utils/formatters';
import { exportBoletosExcel, exportBoletosPDF } from '../utils/reports';
import { FiltroData, isDateInRange, getPeriodoDescricao } from '../utils/dateFilter';
import { ConfirmModal } from './ConfirmModal';
import { AgruparBoletosModal } from './AgruparBoletosModal';

interface BoletosTabProps {
  boletos: BoletoAPagar[];
  filtroDataGlobal?: FiltroData;
  onDeleteBoleto: (id: string) => void;
  onUpdateBoleto?: (id: string, updates: Partial<BoletoAPagar>) => void;
  onDesvincularBoleto?: (id: string) => void;
  onPagarELancar: (boleto: BoletoAPagar, dataPagamento: string, banco?: string, observacoes?: string) => void;
  onAddBoletoAvulso: (boleto: Omit<BoletoAPagar, 'id' | 'criadoEm'>) => void;
  onAgruparBoletos?: (
    idsOrigem: string[],
    novosBoletos: Omit<BoletoAPagar, 'id' | 'criadoEm'>[]
  ) => void;
}

export const BoletosTab: React.FC<BoletosTabProps> = ({
  boletos,
  filtroDataGlobal,
  onDeleteBoleto,
  onUpdateBoleto,
  onDesvincularBoleto,
  onPagarELancar,
  onAddBoletoAvulso,
  onAgruparBoletos,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'vencidos' | 'hoje' | 'proximos7dias'>('todos');
  const [aplicarFiltroData, setAplicarFiltroData] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Multi-selection for grouping titles
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Modal for quick payment & auto-creation in Pagamentos Feitos
  const [boletoParaBaixa, setBoletoParaBaixa] = useState<BoletoAPagar | null>(null);
  const [dataPagamentoBaixa, setDataPagamentoBaixa] = useState(() => new Date().toISOString().split('T')[0]);
  const [bancoBaixa, setBancoBaixa] = useState('');
  const [bancoCustomBaixa, setBancoCustomBaixa] = useState('');
  const [obsBaixa, setObsBaixa] = useState('');
  const [boletoParaExcluir, setBoletoParaExcluir] = useState<BoletoAPagar | null>(null);

  // Bank options for payment confirmation: only Banco do Brasil, Itaú, Pagbank by default, expandable with "+"
  const [bancosOpcoes, setBancosOpcoes] = useState<string[]>(() => {
    const defaultBanks = ['Banco do Brasil', 'Itaú', 'Pagbank'];
    const legacyExcluded = ['bradesco', 'caixa econômica', 'caixa economica', 'santander', 'nubank', 'inter', 'banco inter', 'sicoob', 'sicredi'];
    try {
      const saved = localStorage.getItem('transuniao_bancos_opcoes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((b: string) => {
            const bLower = b.toLowerCase().trim();
            if (legacyExcluded.includes(bLower)) return false;
            return true;
          });
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

  // Modal for adding a standalone boleto
  const [showAddModal, setShowAddModal] = useState(false);
  const [novoNumeroNF, setNovoNumeroNF] = useState('');
  const [novoFornecedor, setNovoFornecedor] = useState('');
  const [novaCategoria, setNovaCategoria] = useState<CategoriaNF>('consumo');
  const [novaDataEmissao, setNovaDataEmissao] = useState(() => new Date().toISOString().split('T')[0]);
  const [novoValorInput, setNovoValorInput] = useState('0,00');
  const [novoVencimento, setNovoVencimento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [novoCodigoBarras, setNovoCodigoBarras] = useState('');
  const [modalError, setModalError] = useState('');

  // Modal for editing boleto
  const [boletoParaEditar, setBoletoParaEditar] = useState<BoletoAPagar | null>(null);
  const [editNumeroNF, setEditNumeroNF] = useState('');
  const [editFornecedor, setEditFornecedor] = useState('');
  const [editDataVencimento, setEditDataVencimento] = useState('');
  const [editValorInput, setEditValorInput] = useState('0,00');
  const [editDataEmissaoNF, setEditDataEmissaoNF] = useState('');
  const [editCategoria, setEditCategoria] = useState<CategoriaNF>('consumo');
  const [editParcelaInfo, setEditParcelaInfo] = useState('');
  const [editCodigoBarras, setEditCodigoBarras] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editModalError, setEditModalError] = useState('');

  // Modal / Action for unlinking titles
  const [boletoParaDesvincular, setBoletoParaDesvincular] = useState<BoletoAPagar | null>(null);

  // Menu de engrenagem para ações do boleto (Editar, Desvincular, Excluir)
  const [menuAbertoBoletoId, setMenuAbertoBoletoId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuAbertoBoletoId && !(e.target as HTMLElement).closest('.gear-menu-container')) {
        setMenuAbertoBoletoId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuAbertoBoletoId]);

  const handleOpenEditBoleto = (bol: BoletoAPagar) => {
    setBoletoParaEditar(bol);
    setEditNumeroNF(bol.numeroNF);
    setEditFornecedor(bol.fornecedor);
    setEditDataVencimento(bol.dataVencimento);
    setEditValorInput(formatNumberToCurrencyInput(bol.valor));
    setEditDataEmissaoNF(bol.dataEmissaoNF);
    setEditCategoria(bol.categoria);
    setEditParcelaInfo(bol.parcelaInfo || 'Única');
    setEditCodigoBarras(bol.codigoBarras || '');
    setEditObservacoes(bol.observacoes || '');
    setEditModalError('');
  };

  const handleSalvarEdicaoBoleto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boletoParaEditar) return;
    const valorNumerico = parseCurrencyInput(editValorInput);

    if (valorNumerico <= 0) {
      setEditModalError('Informe um valor válido maior que zero.');
      return;
    }
    if (!editFornecedor.trim()) {
      setEditModalError('Informe o nome do fornecedor.');
      return;
    }
    if (!editNumeroNF.trim()) {
      setEditModalError('Informe o número da nota fiscal de origem.');
      return;
    }
    if (!editDataVencimento) {
      setEditModalError('Informe a data de vencimento.');
      return;
    }

    if (onUpdateBoleto) {
      onUpdateBoleto(boletoParaEditar.id, {
        numeroNF: editNumeroNF.trim(),
        fornecedor: editFornecedor.trim(),
        dataVencimento: editDataVencimento,
        valor: valorNumerico,
        dataEmissaoNF: editDataEmissaoNF || boletoParaEditar.dataEmissaoNF,
        categoria: editCategoria,
        parcelaInfo: editParcelaInfo.trim() || undefined,
        codigoBarras: editCodigoBarras.trim() || undefined,
        observacoes: editObservacoes.trim() || undefined,
      });
    }

    setBoletoParaEditar(null);
  };

  // Copy barcode helper
  const handleCopyBarcode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Sort strictly by due date (vencimento) ascending (earliest/most overdue first)
  const boletosOrdenados = useMemo(() => {
    return [...boletos].sort((a, b) => {
      const timeA = new Date(a.dataVencimento).getTime();
      const timeB = new Date(b.dataVencimento).getTime();
      return timeA - timeB;
    });
  }, [boletos]);

  // Filter list
  const filteredBoletos = useMemo(() => {
    return boletosOrdenados.filter(b => {
      const matchSearch = 
        b.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.numeroNF.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.codigoBarras && b.codigoBarras.includes(searchTerm));

      if (!matchSearch) return false;

      const status = getStatusVencimento(b.dataVencimento);
      if (filtroStatus === 'vencidos') {
        return status.tipo === 'vencido';
      }
      if (filtroStatus === 'hoje') {
        return status.tipo === 'hoje';
      }
      if (filtroStatus === 'proximos7dias') {
        if (!(status.diasDiferenca >= 0 && status.diasDiferenca <= 7)) return false;
      }

      const matchData = !aplicarFiltroData || !filtroDataGlobal || filtroDataGlobal.preset === 'todos' || 
        isDateInRange(b.dataVencimento, filtroDataGlobal.dataInicio, filtroDataGlobal.dataFim);

      return matchData;
    });
  }, [boletosOrdenados, searchTerm, filtroStatus, aplicarFiltroData, filtroDataGlobal]);

  // Statistics
  const stats = useMemo(() => {
    let totalValor = 0;
    let vencidosCount = 0;
    let vencidosValor = 0;
    let hojeCount = 0;
    let hojeValor = 0;

    boletos.forEach(b => {
      totalValor += b.valor;
      const st = getStatusVencimento(b.dataVencimento);
      if (st.tipo === 'vencido') {
        vencidosCount++;
        vencidosValor += b.valor;
      } else if (st.tipo === 'hoje') {
        hojeCount++;
        hojeValor += b.valor;
      }
    });

    return { totalValor, vencidosCount, vencidosValor, hojeCount, hojeValor };
  }, [boletos]);

  // Multi-selection helpers for grouping titles
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredBoletos.map(b => b.id);
    const isAllSelected =
      allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const totalSelectedValue = useMemo(() => {
    return boletos
      .filter(b => selectedIds.includes(b.id))
      .reduce((acc, b) => acc + (b.valor || 0), 0);
  }, [boletos, selectedIds]);

  const handleAdicionarNovoBanco = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeLimpo = novoBancoNome.trim();
    if (!nomeLimpo) return;
    if (!bancosOpcoes.some(b => b.toLowerCase() === nomeLimpo.toLowerCase())) {
      const novasOpcoes = [...bancosOpcoes, nomeLimpo];
      setBancosOpcoes(novasOpcoes);
      try {
        localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(novasOpcoes));
      } catch {
        // ignore
      }
    }
    setBancoBaixa(nomeLimpo);
    setNovoBancoNome('');
    setShowNovoBancoInput(false);
  };

  const handleConfirmarBaixa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boletoParaBaixa) return;
    const bancoFinal = bancoBaixa.trim();
    onPagarELancar(
      boletoParaBaixa,
      dataPagamentoBaixa,
      bancoFinal || undefined,
      obsBaixa.trim() || undefined
    );
    setBoletoParaBaixa(null);
    setBancoBaixa('');
    setBancoCustomBaixa('');
    setObsBaixa('');
    setShowNovoBancoInput(false);
    setNovoBancoNome('');
  };

  const handleSalvarBoletoAvulso = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseCurrencyInput(novoValorInput);

    if (!novoNumeroNF.trim()) {
      setModalError('Informe o número da Nota Fiscal.');
      return;
    }
    if (!novoFornecedor.trim()) {
      setModalError('Informe o nome do fornecedor.');
      return;
    }
    if (val <= 0) {
      setModalError('Informe um valor válido.');
      return;
    }
    if (!novoVencimento) {
      setModalError('Informe a data de vencimento.');
      return;
    }

    onAddBoletoAvulso({
      numeroNF: novoNumeroNF.trim(),
      fornecedor: novoFornecedor.trim(),
      categoria: novaCategoria,
      dataEmissaoNF: novaDataEmissao,
      valor: val,
      dataVencimento: novoVencimento,
      parcelaInfo: 'Avulso',
      codigoBarras: novoCodigoBarras.trim() || undefined,
      pago: false,
    });

    setShowAddModal(false);
    setNovoNumeroNF('');
    setNovoFornecedor('');
    setNovoValorInput('0,00');
    setNovoCodigoBarras('');
    setModalError('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Boletos a Pagar por Vencimento
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
              Contas a Pagar
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Lista de títulos organizada cronologicamente com exclusão manual imediata assim que pagos
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Relatório Excel */}
          <button
            id="btn-relatorio-excel-boletos"
            onClick={() => {
              const filtrosArr: string[] = [];
              if (aplicarFiltroData && filtroDataGlobal && filtroDataGlobal.preset !== 'todos') {
                filtrosArr.push(`Período: ${getPeriodoDescricao(filtroDataGlobal)}`);
              }
              if (filtroStatus !== 'todos') {
                filtrosArr.push(`Filtro: ${filtroStatus === 'vencidos' ? 'Apenas Vencidos' : filtroStatus === 'hoje' ? 'Vencem Hoje' : 'Próximos 7 dias'}`);
              }
              const filtroText = filtrosArr.length > 0 ? filtrosArr.join(' | ') : undefined;
              exportBoletosExcel(filteredBoletos, filtroText);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-lg border border-amber-200 transition-colors shadow-2xs cursor-pointer"
            title="Baixar relatório de Boletos em formato Excel (.xlsx) com filtros ativos"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-700" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Relatório PDF */}
          <button
            id="btn-relatorio-pdf-boletos"
            onClick={() => {
              const filtrosArr: string[] = [];
              if (aplicarFiltroData && filtroDataGlobal && filtroDataGlobal.preset !== 'todos') {
                filtrosArr.push(`Período: ${getPeriodoDescricao(filtroDataGlobal)}`);
              }
              if (filtroStatus !== 'todos') {
                filtrosArr.push(`Filtro: ${filtroStatus === 'vencidos' ? 'Apenas Vencidos' : filtroStatus === 'hoje' ? 'Vencem Hoje' : 'Próximos 7 dias'}`);
              }
              const filtroText = filtrosArr.length > 0 ? filtrosArr.join(' | ') : undefined;
              exportBoletosPDF(filteredBoletos, filtroText);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            title="Gerar relatório de Boletos em formato PDF com filtros ativos"
          >
            <FileText className="w-4 h-4 text-rose-700" />
            <span>PDF (.pdf)</span>
          </button>

          {/* Botão de Agrupar Títulos */}
          <button
            id="btn-agrupar-titulos"
            onClick={() => setShowGroupModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Agrupar títulos de duas ou mais notas nos mesmos boletos a pagar"
          >
            <Layers className="w-4 h-4" />
            <span>Agrupar Títulos</span>
            {selectedIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-800 text-white rounded-full text-[11px] font-bold">
                {selectedIds.length}
              </span>
            )}
          </button>

          <button
            id="btn-novo-boleto-avulso"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Título</span>
          </button>
        </div>
      </div>

      {/* Critical Vencimento Alert Banner */}
      {(stats.vencidosCount > 0 || stats.hojeCount > 0) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Atenção ao Fluxo de Caixa: Boletos Vencidos ou Vencendo Hoje!
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Existem <strong>{stats.vencidosCount} boleto(s) vencido(s) ({formatCurrency(stats.vencidosValor)})</strong> e <strong>{stats.hojeCount} boleto(s) que vencem hoje ({formatCurrency(stats.hojeValor)})</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stats.vencidosCount > 0 && (
              <button
                onClick={() => setFiltroStatus('vencidos')}
                className="text-xs font-semibold px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Ver Vencidos ({stats.vencidosCount})
              </button>
            )}
            {stats.hojeCount > 0 && (
              <button
                onClick={() => setFiltroStatus('hoje')}
                className="text-xs font-semibold px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Ver Hoje ({stats.hojeCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Chips & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              id="search-boletos"
              type="text"
              placeholder="Buscar por fornecedor, NF de origem ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filtroStatus === 'todos'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({boletos.length})
            </button>
            <button
              onClick={() => setFiltroStatus('vencidos')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filtroStatus === 'vencidos'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Vencidos ({stats.vencidosCount})
            </button>
            <button
              onClick={() => setFiltroStatus('hoje')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filtroStatus === 'hoje'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Vence Hoje ({stats.hojeCount})
            </button>
            <button
              onClick={() => setFiltroStatus('proximos7dias')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filtroStatus === 'proximos7dias'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              Próximos 7 dias
            </button>
          </div>
        </div>

        {/* Total Badge */}
        <div className="flex items-center gap-2 shrink-0 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
          <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
            Total em Aberto:
          </span>
          <span className="text-xs font-bold text-amber-800">
            {formatCurrency(filteredBoletos.reduce((acc, b) => acc + b.valor, 0))}
          </span>
        </div>
      </div>

      {/* Active Global Date Filter Pill */}
      {filtroDataGlobal && filtroDataGlobal.preset !== 'todos' && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-semibold text-amber-900">Filtro de Período Ativo:</span>
            <span className="text-amber-950 font-medium">{getPeriodoDescricao(filtroDataGlobal)}</span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 font-medium">
            <input
              type="checkbox"
              checked={aplicarFiltroData}
              onChange={(e) => setAplicarFiltroData(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>Aplicar a esta tabela e aos relatórios</span>
          </label>
        </div>
      )}

      {/* Floating Action Banner for Multi-Selection */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">
                {selectedIds.length} {selectedIds.length === 1 ? 'título selecionado' : 'títulos selecionados'} para agrupamento
              </p>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Valor total consolidado: <strong>{formatCurrency(totalSelectedValue)}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Limpar Seleção
            </button>
            <button
              type="button"
              id="btn-confirm-agrupar-selecionados"
              onClick={() => setShowGroupModal(true)}
              className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Agrupar {selectedIds.length} Títulos</span>
            </button>
          </div>
        </div>
      )}

      {/* Table of Boletos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={filteredBoletos.length > 0 && filteredBoletos.every(b => selectedIds.includes(b.id))}
                    onChange={handleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    title="Selecionar todos os títulos filtrados"
                  />
                </th>
                <th className="py-2.5 px-2 whitespace-nowrap">Vencimento</th>
                <th className="py-2.5 px-2.5 min-w-[130px]">Fornecedor</th>
                <th className="py-2.5 px-2 whitespace-nowrap">NF Origem</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Emissão NF</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Categoria</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Valor</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBoletos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ReceiptText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Nenhum boleto encontrado nesta listagem</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {filtroStatus !== 'todos' || searchTerm
                        ? 'Altere os filtros de busca para ver outros títulos.'
                        : 'Cadastre uma Nota Fiscal de Entrada com forma de pagamento "Boleto" para gerar novos títulos automaticamente.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBoletos.map((bol, index) => {
                  const status = getStatusVencimento(bol.dataVencimento);
                  const isSelected = selectedIds.includes(bol.id);
                  const isGrouped = Boolean(
                    bol.agrupado || 
                    (bol.boletosOriginais && bol.boletosOriginais.length > 0) || 
                    (bol.notasOrigem && bol.notasOrigem.length > 1) || 
                    (bol.titulosOrigemQtd && bol.titulosOrigemQtd > 1)
                  );
                  const isMenuOpen = menuAbertoBoletoId === bol.id;
                  const openUpwards = index >= filteredBoletos.length - 2 && filteredBoletos.length >= 3;
                  return (
                    <tr 
                      key={bol.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected 
                          ? 'bg-indigo-50/50' 
                          : status.tipo === 'vencido' 
                            ? 'bg-rose-50/30' 
                            : status.tipo === 'hoje' 
                              ? 'bg-amber-50/40' 
                              : ''
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(bol.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                          title="Selecionar título para agrupar"
                        />
                      </td>

                      {/* Vencimento e Status */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDateBR(bol.dataVencimento)}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] border w-max ${status.badgeClass}`}>
                            {status.texto}
                          </span>
                        </div>
                      </td>

                      {/* Fornecedor & Linha Digitável */}
                      <td className="py-2.5 px-2.5 max-w-[200px]">
                        <div className="font-semibold text-slate-900 flex items-center gap-1 truncate" title={bol.fornecedor}>
                          <span className="truncate">{bol.fornecedor}</span>
                          {bol.parcelaInfo && (
                            <span className="text-[10px] font-mono font-medium px-1 py-0.2 bg-slate-100 text-slate-600 rounded shrink-0">
                              {bol.parcelaInfo}
                            </span>
                          )}
                        </div>
                        {bol.codigoBarras ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[160px] sm:max-w-[220px]" title={bol.codigoBarras}>
                              {bol.codigoBarras}
                            </span>
                            <button
                              id={`btn-copy-bar-${bol.id}`}
                              onClick={() => handleCopyBarcode(bol.id, bol.codigoBarras!)}
                              className="text-[11px] text-amber-700 hover:text-amber-900 flex items-center gap-0.5 p-0.5 rounded hover:bg-amber-50 cursor-pointer"
                              title="Copiar linha digitável"
                            >
                              {copiedId === bol.id ? (
                                <span className="text-emerald-600 flex items-center gap-0.5 text-[10px] font-medium">
                                  <Check className="w-3 h-3" /> Copiado
                                </span>
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Boleto anexado via NF</span>
                        )}
                      </td>

                      {/* NF de Origem */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {bol.agrupado ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                              {bol.numeroNF}
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white w-max shadow-2xs">
                              <Layers className="w-2.5 h-2.5" />
                              Agrupado ({bol.titulosOrigemQtd || '2+'} tít.)
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {bol.numeroNF}
                          </span>
                        )}
                      </td>

                      {/* Data Emissão da NF */}
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                        {formatDateBR(bol.dataEmissaoNF)}
                      </td>

                      {/* Categoria */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${getCategoriaBadgeClass(bol.categoria)}`}>
                          {getCategoriaLabel(bol.categoria)}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap text-xs">
                        {formatCurrency(bol.valor)}
                      </td>

                      {/* Ações: Pagar & Lançar sempre visível + Engrenagem para Mais Opções */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 relative">
                          {/* 1. Botão rápido: Pagar & Lançar (SEMPRE VISÍVEL) */}
                          <button
                            id={`btn-baixa-boleto-${bol.id}`}
                            onClick={() => {
                              setBoletoParaBaixa(bol);
                              setDataPagamentoBaixa(new Date().toISOString().split('T')[0]);
                              setBancoBaixa('');
                              setBancoCustomBaixa('');
                              setObsBaixa('');
                              setMenuAbertoBoletoId(null);
                            }}
                            title="Dar baixa e lançar automaticamente em Pagamentos Feitos"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>Pagar & Lançar</span>
                          </button>

                          {/* 2. Botão de Engrenagem com Menu Dropdown */}
                          <div className="relative gear-menu-container">
                            <button
                              id={`btn-gear-boleto-${bol.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuAbertoBoletoId(prev => prev === bol.id ? null : bol.id);
                              }}
                              title="Configurações e ações do boleto (Editar, Desvincular, Excluir)"
                              aria-expanded={isMenuOpen}
                              className={`p-1 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                                isMenuOpen
                                  ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-400/30'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 shadow-2xs'
                              }`}
                            >
                              <Settings className={`w-3.5 h-3.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div 
                                className={`absolute right-0 ${
                                  openUpwards ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
                                } w-52 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                                  Ações do Título
                                </div>

                                {/* Opção: Editar */}
                                <button
                                  type="button"
                                  id={`menu-edit-boleto-${bol.id}`}
                                  onClick={() => {
                                    setMenuAbertoBoletoId(null);
                                    handleOpenEditBoleto(bol);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4 text-blue-600 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span>Editar</span>
                                    <span className="text-[10px] font-normal text-slate-400">Alterar dados do boleto</span>
                                  </div>
                                </button>

                                {/* Opção: Desvincular */}
                                {isGrouped ? (
                                  <button
                                    type="button"
                                    id={`menu-desvincular-boleto-${bol.id}`}
                                    onClick={() => {
                                      setMenuAbertoBoletoId(null);
                                      setBoletoParaDesvincular(bol);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Unlink className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <div className="flex flex-col text-left">
                                      <span>Desvincular</span>
                                      <span className="text-[10px] font-normal text-indigo-500">Restaurar títulos individuais</span>
                                    </div>
                                  </button>
                                ) : (
                                  <div 
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-300 rounded-lg cursor-not-allowed select-none"
                                    title="Desvinculação disponível apenas para boletos agrupados"
                                  >
                                    <Unlink className="w-4 h-4 text-slate-300 shrink-0" />
                                    <div className="flex flex-col text-left">
                                      <span>Desvincular</span>
                                      <span className="text-[10px] text-slate-300">Apenas títulos agrupados</span>
                                    </div>
                                  </div>
                                )}

                                <div className="my-1 border-t border-slate-100" />

                                {/* Opção: Excluir */}
                                <button
                                  type="button"
                                  id={`menu-delete-boleto-${bol.id}`}
                                  onClick={() => {
                                    setMenuAbertoBoletoId(null);
                                    setBoletoParaExcluir(bol);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span>Excluir</span>
                                    <span className="text-[10px] font-normal text-rose-400">Remover boleto da lista</span>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* Modal: Pagar e Lançar automaticamente */}
      {boletoParaBaixa && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Confirmar Pagamento do Título
                  </h3>
                  <p className="text-xs text-slate-500">
                    Baixar boleto e lançar automaticamente em Pagamentos Feitos
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setBoletoParaBaixa(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmarBaixa} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Info Card do Boleto */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Fornecedor:</span>
                    <span className="font-semibold text-slate-900 text-right">{boletoParaBaixa.fornecedor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">NF de Origem:</span>
                    <span className="font-mono font-semibold text-slate-900">{boletoParaBaixa.numeroNF}</span>
                  </div>
                  {boletoParaBaixa.parcelaInfo && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Parcela:</span>
                      <span className="font-semibold text-slate-800">{boletoParaBaixa.parcelaInfo}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Vencimento Original:</span>
                    <span className="font-semibold text-slate-900">{formatDateBR(boletoParaBaixa.dataVencimento)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-1">
                    <span className="font-bold text-slate-800 text-sm">Valor a Liquidar:</span>
                    <span className="font-bold text-emerald-700 text-lg">{formatCurrency(boletoParaBaixa.valor)}</span>
                  </div>
                </div>

                {/* Data Efetiva do Pagamento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Data Efetiva do Pagamento *</span>
                  </label>
                  <input
                    id="input-data-baixa"
                    type="date"
                    required
                    value={dataPagamentoBaixa}
                    onChange={(e) => setDataPagamentoBaixa(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Banco de Saída do Pagamento: apenas Banco do Brasil, Itaú e botão + */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      <span>Banco de Saída do Pagamento</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Opcional</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {bancosOpcoes.map((bName) => {
                      const isSelected = bancoBaixa === bName;
                      return (
                        <button
                          key={bName}
                          type="button"
                          id={`btn-banco-${bName.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => setBancoBaixa(isSelected ? '' : bName)}
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

                    {/* Botão + para adicionar outro banco às opções */}
                    {!showNovoBancoInput && (
                      <button
                        type="button"
                        id="btn-adicionar-outro-banco"
                        onClick={() => setShowNovoBancoInput(true)}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        title="Adicionar outro banco às opções"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Outro Banco</span>
                      </button>
                    )}
                  </div>

                  {/* Campo + aberto para cadastrar novo banco */}
                  {showNovoBancoInput && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                      <label className="block text-[11px] font-semibold text-blue-900">
                        Nome do novo banco / instituição:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          id="input-novo-banco-nome"
                          placeholder="Ex: Santander, Bradesco, Caixa, Nubank..."
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
                          id="btn-salvar-novo-banco"
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
                </div>

                {/* Observações Adicionais */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Observações do Pagamento (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Comprovante anexado, débito automático, etc."
                    value={obsBaixa}
                    onChange={(e) => setObsBaixa(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    O boleto será baixado de pendentes e registrado na aba <strong>1. Pagamentos Feitos</strong>.
                  </p>
                </div>
              </div>

              {/* Sticky / Pinned Footer - SEMPRE VISÍVEL */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  id="btn-cancelar-baixa-boleto"
                  onClick={() => setBoletoParaBaixa(null)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirmar-baixa-boleto"
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Pagamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Boleto Avulso */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">
                  Lançar Boleto Avulso
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setModalError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSalvarBoletoAvulso} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número da NF de Origem *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NF-5521"
                    value={novoNumeroNF}
                    onChange={(e) => setNovoNumeroNF(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Emissão da NF *
                  </label>
                  <input
                    type="date"
                    required
                    value={novaDataEmissao}
                    onChange={(e) => setNovaDataEmissao(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fornecedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora Alpha"
                  value={novoFornecedor}
                  onChange={(e) => setNovoFornecedor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria da NF *
                  </label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as CategoriaNF)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="consumo">Consumo</option>
                    <option value="revenda">Revenda</option>
                    <option value="remessa de conserto">Remessa de Conserto</option>
                    <option value="retorno de conserto">Retorno de Conserto</option>
                    <option value="servico">Serviço</option>
                    <option value="frete">Frete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor do Boleto (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 850,00"
                    value={novoValorInput}
                    onChange={(e) => setNovoValorInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-bold focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={novoVencimento}
                  onChange={(e) => setNovoVencimento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Linha Digitável / Código de Barras (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 34191.79001 01043.510047..."
                  value={novoCodigoBarras}
                  onChange={(e) => setNovoCodigoBarras(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono text-xs focus:bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setModalError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Cadastrar Boleto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Exclusão Manual do Boleto */}
      <ConfirmModal
        isOpen={!!boletoParaExcluir}
        title="Exclusão Manual do Boleto"
        description={
          boletoParaExcluir
            ? `Confirmar a exclusão manual do boleto de ${formatCurrency(boletoParaExcluir.valor)} (${boletoParaExcluir.fornecedor}) com vencimento em ${formatDateBR(boletoParaExcluir.dataVencimento)}${boletoParaExcluir.parcelaInfo ? ` - Parcela ${boletoParaExcluir.parcelaInfo}` : ''}?`
            : ''
        }
        confirmText="Confirmar Exclusão"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (boletoParaExcluir) {
            onDeleteBoleto(boletoParaExcluir.id);
            setBoletoParaExcluir(null);
          }
        }}
        onClose={() => setBoletoParaExcluir(null)}
      />

      {/* Modal para Agrupar Títulos em Boletos a Pagar */}
      <AgruparBoletosModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        allBoletos={boletos}
        initialSelectedIds={selectedIds}
        onConfirmAgrupamento={(idsOrigem, novosBoletos) => {
          if (onAgruparBoletos) {
            onAgruparBoletos(idsOrigem, novosBoletos);
          } else {
            idsOrigem.forEach(id => onDeleteBoleto(id));
            novosBoletos.forEach(nb => onAddBoletoAvulso(nb));
          }
          setSelectedIds([]);
        }}
      />

      {/* Modal: Editar Boleto a Pagar */}
      {boletoParaEditar && (
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
                    Editar Boleto a Pagar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modifique vencimento, valor, fornecedor ou desvincule títulos
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setBoletoParaEditar(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSalvarEdicaoBoleto} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {editModalError && (
                  <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                    {editModalError}
                  </div>
                )}

                {/* Banner especial para boletos agrupados / vinculados */}
                {(boletoParaEditar.agrupado || (boletoParaEditar.boletosOriginais && boletoParaEditar.boletosOriginais.length > 0) || (boletoParaEditar.notasOrigem && boletoParaEditar.notasOrigem.length > 1) || (boletoParaEditar.titulosOrigemQtd && boletoParaEditar.titulosOrigemQtd > 1)) && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <Unlink className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-indigo-900">
                          Título Vinculado / Agrupado
                        </h4>
                        <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                          Este boleto agrupa <strong>{boletoParaEditar.titulosOrigemQtd || boletoParaEditar.notasOrigem?.length || boletoParaEditar.boletosOriginais?.length || 2} títulos</strong>. Se preferir pagar separadamente, você pode desvincular agora e restaurar os títulos originais.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const bolToUnlink = boletoParaEditar;
                        setBoletoParaEditar(null);
                        setBoletoParaDesvincular(bolToUnlink);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      <Unlink className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Desvincular Títulos (Restaurar Individuais)</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fornecedor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fornecedor / Favorecido *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Nome da empresa"
                        value={editFornecedor}
                        onChange={(e) => setEditFornecedor(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* NF de Origem */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número da NF de Origem *
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Vencimento */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de Vencimento *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={editDataVencimento}
                        onChange={(e) => setEditDataVencimento(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Valor do Boleto */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Valor a Pagar (R$) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                        R$
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="0,00"
                        value={editValorInput}
                        onFocus={(e) => {
                          if (editValorInput === '0,00' || editValorInput === '') e.target.select();
                        }}
                        onChange={(e) => setEditValorInput(maskCurrencyInput(e.target.value))}
                        onBlur={() => setEditValorInput(sanitizeCurrencyInputOnBlur(editValorInput))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categoria da NF */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Categoria da NF *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Tag className="w-4 h-4" />
                      </div>
                      <select
                        value={editCategoria}
                        onChange={(e) => setEditCategoria(e.target.value as CategoriaNF)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      >
                        <option value="pecas">Peças</option>
                        <option value="servico">Serviço</option>
                        <option value="frete">Frete</option>
                        <option value="consumo">Consumo</option>
                      </select>
                    </div>
                  </div>

                  {/* Parcela / Identificador */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Parcela / Descrição
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Parcela 1/3 ou Única"
                      value={editParcelaInfo}
                      onChange={(e) => setEditParcelaInfo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Código de Barras / Linha Digitável */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código de Barras / Linha Digitável
                  </label>
                  <input
                    type="text"
                    placeholder="Cole a linha digitável do boleto..."
                    value={editCodigoBarras}
                    onChange={(e) => setEditCodigoBarras(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais para este boleto..."
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
                  onClick={() => setBoletoParaEditar(null)}
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

      {/* Modal: Confirmar Desvinculação de Títulos */}
      {boletoParaDesvincular && (
        <ConfirmModal
          isOpen={!!boletoParaDesvincular}
          title="Desvincular Títulos Agrupados"
          description={`Deseja realmente desvincular este boleto de ${formatCurrency(boletoParaDesvincular.valor)} referente a "${boletoParaDesvincular.fornecedor}"? Os títulos vinculados retornarão imediatamente de forma individual para a lista de boletos a pagar com seus valores originais.`}
          confirmText="Sim, Desvincular Títulos"
          cancelText="Cancelar"
          variant="warning"
          onConfirm={() => {
            if (onDesvincularBoleto && boletoParaDesvincular) {
              onDesvincularBoleto(boletoParaDesvincular.id);
            }
            setBoletoParaDesvincular(null);
          }}
          onClose={() => setBoletoParaDesvincular(null)}
        />
      )}
    </div>
  );
};
