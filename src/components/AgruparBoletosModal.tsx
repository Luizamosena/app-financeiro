import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  X, 
  Check, 
  AlertTriangle, 
  Calendar, 
  Search, 
  DollarSign, 
  Building, 
  Hash, 
  Clock, 
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Minus,
  CalendarDays,
  Wand2
} from 'lucide-react';
import { BoletoAPagar, CategoriaNF } from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  getCategoriaLabel, 
  formatNumberToCurrencyInput, 
  parseCurrencyInput,
  sanitizeCurrencyInputOnBlur,
  maskCurrencyInput
} from '../utils/formatters';

interface AgruparBoletosModalProps {
  isOpen: boolean;
  onClose: () => void;
  allBoletos: BoletoAPagar[];
  initialSelectedIds: string[];
  onConfirmAgrupamento: (
    idsOrigem: string[],
    novosBoletos: Omit<BoletoAPagar, 'id' | 'criadoEm'>[]
  ) => void;
}

interface ParcelaGroupInput {
  numeroParcela: number;
  dataVencimento: string;
  valor: number;
  valorInput: string;
  codigoBarras: string;
}

export const AgruparBoletosModal: React.FC<AgruparBoletosModalProps> = ({
  isOpen,
  onClose,
  allBoletos,
  initialSelectedIds,
  onConfirmAgrupamento,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fornecedor, setFornecedor] = useState('');
  const [numeroNF, setNumeroNF] = useState('');
  const [categoria, setCategoria] = useState<CategoriaNF>('consumo');
  const [dataEmissao, setDataEmissao] = useState(() => new Date().toISOString().split('T')[0]);
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [intervaloDias, setIntervaloDias] = useState(30);
  const [parcelas, setParcelas] = useState<ParcelaGroupInput[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [searchBoletoTerm, setSearchBoletoTerm] = useState('');
  const [error, setError] = useState('');
  const [showAllAvailable, setShowAllAvailable] = useState(false);

  // Initialize modal state whenever it opens
  useEffect(() => {
    if (isOpen) {
      const validIds = initialSelectedIds.filter(id => allBoletos.some(b => b.id === id));
      setSelectedIds(validIds);

      const selectedObjects = allBoletos.filter(b => validIds.includes(b.id));
      const total = selectedObjects.reduce((acc, b) => acc + (b.valor || 0), 0);

      // Suppliers
      const suppliers = Array.from(new Set(selectedObjects.map(b => b.fornecedor).filter(Boolean)));
      setFornecedor(suppliers.length === 1 ? suppliers[0] : suppliers.join(' / '));

      // NFs
      const nfs = Array.from(new Set(selectedObjects.map(b => b.numeroNF).filter(Boolean)));
      setNumeroNF(nfs.join(', '));

      // Categoria
      setCategoria(selectedObjects[0]?.categoria || 'consumo');

      // Emissão
      const latestEmissao = selectedObjects.map(b => b.dataEmissaoNF).filter(Boolean).sort().reverse()[0];
      setDataEmissao(latestEmissao || new Date().toISOString().split('T')[0]);

      // Vencimento default
      const earliestDue = selectedObjects.map(b => b.dataVencimento).filter(Boolean).sort()[0];
      const defaultDue = earliestDue || new Date().toISOString().split('T')[0];

      setQtdParcelas(1);
      setIntervaloDias(30);
      setParcelas([
        {
          numeroParcela: 1,
          dataVencimento: defaultDue,
          valor: total,
          valorInput: total > 0 ? formatNumberToCurrencyInput(total) : '0,00',
          codigoBarras: '',
        },
      ]);
      setObservacoes('');
      setError('');
      setSearchBoletoTerm('');
      setShowAllAvailable(validIds.length < 2);
    }
  }, [isOpen, initialSelectedIds, allBoletos]);

  // Selected boletos objects & sum
  const selectedBoletos = useMemo(() => {
    return allBoletos.filter(b => selectedIds.includes(b.id));
  }, [allBoletos, selectedIds]);

  const totalSelecionado = useMemo(() => {
    return selectedBoletos.reduce((acc, b) => acc + (b.valor || 0), 0);
  }, [selectedBoletos]);

  const somaParcelas = useMemo(() => {
    return parcelas.reduce((acc, p) => acc + (p.valor || 0), 0);
  }, [parcelas]);

  const diferencaValores = useMemo(() => {
    return parseFloat((totalSelecionado - somaParcelas).toFixed(2));
  }, [totalSelecionado, somaParcelas]);

  // Filtered available boletos to add/remove
  const filteredAvailableBoletos = useMemo(() => {
    return allBoletos.filter(b => {
      if (!searchBoletoTerm) return true;
      const term = searchBoletoTerm.toLowerCase();
      return (
        b.fornecedor.toLowerCase().includes(term) ||
        b.numeroNF.toLowerCase().includes(term) ||
        (b.codigoBarras && b.codigoBarras.includes(term))
      );
    });
  }, [allBoletos, searchBoletoTerm]);

  // Helper to recalculate parcelas evenly
  const recalculateParcelas = (
    total: number, 
    qtd: number, 
    baseDueDate?: string,
    intervalDays: number = intervaloDias
  ) => {
    const baseDate = baseDueDate ? new Date(baseDueDate) : new Date();
    const safeQtd = Math.max(1, qtd);
    const parcelaBase = parseFloat((total / safeQtd).toFixed(2));
    const diff = parseFloat((total - parcelaBase * safeQtd).toFixed(2));

    const novas: ParcelaGroupInput[] = Array.from({ length: safeQtd }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i * intervalDays);
      const val = i === safeQtd - 1 ? parseFloat((parcelaBase + diff).toFixed(2)) : parcelaBase;
      return {
        numeroParcela: i + 1,
        dataVencimento: d.toISOString().split('T')[0],
        valor: val,
        valorInput: formatNumberToCurrencyInput(val),
        codigoBarras: parcelas[i]?.codigoBarras || '',
      };
    });
    setParcelas(novas);
  };

  // Toggle boleto selection in modal
  const handleToggleBoleto = (id: string) => {
    const isCurrentlySelected = selectedIds.includes(id);
    const nextIds = isCurrentlySelected
      ? selectedIds.filter(item => item !== id)
      : [...selectedIds, id];

    setSelectedIds(nextIds);
    const nextObjects = allBoletos.filter(b => nextIds.includes(b.id));
    const newTotal = nextObjects.reduce((acc, b) => acc + (b.valor || 0), 0);

    // Update NFs text
    const nfs = Array.from(new Set(nextObjects.map(b => b.numeroNF).filter(Boolean)));
    setNumeroNF(nfs.join(', '));

    // Update supplier if was matching single supplier
    const suppliers = Array.from(new Set(nextObjects.map(b => b.fornecedor).filter(Boolean)));
    if (suppliers.length > 0) {
      setFornecedor(suppliers.length === 1 ? suppliers[0] : suppliers.join(' / '));
    }

    // Recalculate parcelas
    recalculateParcelas(newTotal, qtdParcelas, parcelas[0]?.dataVencimento, intervaloDias);
  };

  // Change number of parcelas
  const handleChangeQtdParcelas = (num: number) => {
    const safeNum = Math.max(1, Math.min(24, num));
    setQtdParcelas(safeNum);
    recalculateParcelas(totalSelecionado, safeNum, parcelas[0]?.dataVencimento, intervaloDias);
  };

  // Add 1 parcela
  const handleAddParcela = () => {
    handleChangeQtdParcelas(qtdParcelas + 1);
  };

  // Remove 1 parcela
  const handleRemoveParcela = () => {
    if (qtdParcelas <= 1) return;
    handleChangeQtdParcelas(qtdParcelas - 1);
  };

  // Apply custom interval between installments
  const handleApplyIntervalo = (dias: number) => {
    setIntervaloDias(dias);
    const baseDate = parcelas[0]?.dataVencimento ? new Date(parcelas[0].dataVencimento) : new Date();
    setParcelas(prev =>
      prev.map((p, i) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i * dias);
        return {
          ...p,
          dataVencimento: d.toISOString().split('T')[0],
        };
      })
    );
  };

  // Adjust difference to the last installment
  const handleAjustarSaldoUltimaParcela = () => {
    if (parcelas.length === 0) return;
    const somaExcetoUltima = parcelas.slice(0, -1).reduce((acc, p) => acc + (p.valor || 0), 0);
    const novoValorUltima = parseFloat((totalSelecionado - somaExcetoUltima).toFixed(2));
    if (novoValorUltima < 0) return;
    setParcelas(prev =>
      prev.map((p, i) =>
        i === prev.length - 1
          ? {
              ...p,
              valor: novoValorUltima,
              valorInput: formatNumberToCurrencyInput(novoValorUltima),
            }
          : p
      )
    );
  };

  // Update specific parcela
  const handleUpdateParcelaValor = (index: number, valStr: string) => {
    const num = parseCurrencyInput(valStr);
    setParcelas(prev =>
      prev.map((p, i) => (i === index ? { ...p, valor: num, valorInput: valStr } : p))
    );
  };

  const handleUpdateParcelaData = (index: number, dateStr: string) => {
    setParcelas(prev =>
      prev.map((p, i) => (i === index ? { ...p, dataVencimento: dateStr } : p))
    );
  };

  const handleUpdateParcelaCodigoBarras = (index: number, codeStr: string) => {
    setParcelas(prev =>
      prev.map((p, i) => (i === index ? { ...p, codigoBarras: codeStr } : p))
    );
  };

  // Submit confirmation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedIds.length < 2) {
      setError('Selecione pelo menos 2 títulos para realizar o agrupamento.');
      return;
    }

    if (!fornecedor.trim()) {
      setError('Por favor, informe o fornecedor / beneficiário dos títulos.');
      return;
    }

    if (!numeroNF.trim()) {
      setError('Por favor, informe a identificação das notas fiscais de origem.');
      return;
    }

    for (let i = 0; i < parcelas.length; i++) {
      const p = parcelas[i];
      if (!p.dataVencimento) {
        setError(`Informe a data de vencimento da Parcela ${p.numeroParcela}.`);
        return;
      }
      if (p.valor <= 0) {
        setError(`O valor da Parcela ${p.numeroParcela} deve ser maior que zero.`);
        return;
      }
    }

    if (Math.abs(diferencaValores) > 0.05) {
      setError(
        `O somatório das parcelas (${formatCurrency(somaParcelas)}) deve coincidir exatamente com o valor total dos títulos selecionados (${formatCurrency(totalSelecionado)}). Diferença: ${formatCurrency(Math.abs(diferencaValores))}.`
      );
      return;
    }

    const novosBoletos: Omit<BoletoAPagar, 'id' | 'criadoEm'>[] = parcelas.map(p => ({
      numeroNF: numeroNF.trim(),
      fornecedor: fornecedor.trim(),
      categoria,
      dataEmissaoNF: dataEmissao || new Date().toISOString().split('T')[0],
      valor: p.valor,
      dataVencimento: p.dataVencimento,
      parcelaInfo: qtdParcelas > 1 ? `${p.numeroParcela}/${qtdParcelas}` : 'Única',
      codigoBarras: p.codigoBarras.trim() || undefined,
      pago: false,
      agrupado: true,
      titulosOrigemQtd: selectedIds.length,
      notasOrigem: Array.from(new Set(selectedBoletos.map(b => b.numeroNF))),
      boletosOriginais: selectedBoletos,
      observacoes: observacoes.trim() || `Agrupamento de ${selectedIds.length} títulos: ${numeroNF.trim()}`,
    }));

    onConfirmAgrupamento(selectedIds, novosBoletos);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Agrupar Títulos em Boletos a Pagar
              </h3>
              <p className="text-xs text-slate-500">
                Consolide títulos de duas ou mais notas fiscais nos mesmos boletos a pagar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-700">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Atenção ao Agrupamento:</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* SECTION 1: SELEÇÃO DE TÍTULOS */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h4 className="font-bold text-slate-900 text-sm">
                  Títulos Selecionados para Agrupamento ({selectedIds.length})
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowAllAvailable(!showAllAvailable)}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                {showAllAvailable ? 'Ocultar seletor de títulos' : '+ Adicionar / alterar títulos a agrupar'}
              </button>
            </div>

            {/* Total Indicator Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Títulos a consolidar:</span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedIds.length} {selectedIds.length === 1 ? 'título' : 'títulos'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Valor Total Consolidado:</span>
                <span className="text-base font-extrabold text-indigo-700">
                  {formatCurrency(totalSelecionado)}
                </span>
              </div>
            </div>

            {/* List of currently selected boletos */}
            {selectedBoletos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {selectedBoletos.map(bol => (
                  <div
                    key={bol.id}
                    className="flex items-center justify-between p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950 truncate">
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                          {bol.numeroNF}
                        </span>
                        <span className="truncate">{bol.fornecedor}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                        <span>Venc: {formatDateBR(bol.dataVencimento)}</span>
                        {bol.parcelaInfo && <span>• Parc: {bol.parcelaInfo}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-indigo-900 block">
                        {formatCurrency(bol.valor)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleBoleto(bol.id)}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold mt-0.5 cursor-pointer"
                        title="Remover título deste agrupamento"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Nenhum título selecionado. Escolha ao menos 2 títulos abaixo para agrupá-los.
              </p>
            )}

            {/* Available Boletos Selector (Collapsible) */}
            {showAllAvailable && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Selecione os títulos que farão parte deste agrupamento:
                  </span>
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por NF ou fornecedor..."
                      value={searchBoletoTerm}
                      onChange={e => setSearchBoletoTerm(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {filteredAvailableBoletos.length === 0 ? (
                    <p className="p-3 text-center text-xs text-slate-400">
                      Nenhum título encontrado com a busca.
                    </p>
                  ) : (
                    filteredAvailableBoletos.map(bol => {
                      const isChecked = selectedIds.includes(bol.id);
                      return (
                        <label
                          key={bol.id}
                          className={`flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                            isChecked ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleBoleto(bol.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              {bol.numeroNF}
                            </span>
                            <span className="text-slate-800 font-medium truncate">
                              {bol.fornecedor}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              (Venc: {formatDateBR(bol.dataVencimento)})
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0">
                            {formatCurrency(bol.valor)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <form id="form-agrupar-boletos" onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 2: DADOS DO TÍTULO CONSOLIDADO */}
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <h4 className="font-bold text-slate-900 text-sm">
                  Dados do Título Consolidado
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fornecedor / Beneficiário *
                  </label>
                  <input
                    type="text"
                    required
                    value={fornecedor}
                    onChange={e => setFornecedor(e.target.value)}
                    placeholder="Nome do fornecedor dos títulos agrupados"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas Fiscais de Origem *
                  </label>
                  <input
                    type="text"
                    required
                    value={numeroNF}
                    onChange={e => setNumeroNF(e.target.value)}
                    placeholder="Ex: NF-10290, NF-10482"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Referência para conferência e histórico de pagamentos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value as CategoriaNF)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    Data de Referência / Emissão
                  </label>
                  <input
                    type="date"
                    value={dataEmissao}
                    onChange={e => setDataEmissao(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Observações adicionais do agrupamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações / Detalhes do Agrupamento (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Ex: Acordo comercial com fornecedor, unificação de faturas..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* SECTION 3: DESDOBRAMENTO / NOVOS BOLETOS */}
            <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Desdobramento e Parcelamento dos Novos Boletos
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Defina a quantidade de parcelas (1x a 24x) e ajuste valores e datas de vencimento.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-600 font-medium">Parcelas:</span>

                  {/* Decrement / Increment buttons */}
                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={handleRemoveParcela}
                      disabled={qtdParcelas <= 1}
                      title="Diminuir parcela"
                      className="p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={qtdParcelas}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) handleChangeQtdParcelas(v);
                      }}
                      className="w-10 text-center text-xs font-bold text-slate-900 border-x border-slate-200 py-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddParcela}
                      disabled={qtdParcelas >= 24}
                      title="Adicionar parcela"
                      className="p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preset quick buttons */}
                  {[1, 2, 3, 4, 6, 12].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleChangeQtdParcelas(num)}
                      className={`px-2 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                        qtdParcelas === num
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num === 1 ? '1x' : `${num}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval & Schedule Helper Bar (when multiple installments) */}
              {qtdParcelas > 1 && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                      Intervalo entre parcelas:
                    </span>
                    {[
                      { label: '15 dias (Quinzenal)', dias: 15 },
                      { label: '28 dias', dias: 28 },
                      { label: '30 dias (Mensal)', dias: 30 },
                      { label: '45 dias', dias: 45 },
                      { label: '60 dias (Bimestral)', dias: 60 },
                    ].map(intv => (
                      <button
                        key={intv.dias}
                        type="button"
                        onClick={() => handleApplyIntervalo(intv.dias)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          intervaloDias === intv.dias
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {intv.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    A partir do vencimento da 1ª parcela
                  </span>
                </div>
              )}

              {/* Installments Form Rows */}
              <div className="space-y-2.5">
                {parcelas.map((parc, index) => (
                  <div
                    key={parc.numeroParcela}
                    className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-2 font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-mono font-bold">
                        {parc.numeroParcela}
                      </span>
                      <span>
                        {qtdParcelas > 1 ? `Boleto ${parc.numeroParcela}/${qtdParcelas}` : 'Boleto Único'}
                      </span>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Vencimento *
                      </label>
                      <input
                        type="date"
                        required
                        value={parc.dataVencimento}
                        onChange={e => handleUpdateParcelaData(index, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Valor (R$) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="0,00"
                        value={parc.valorInput}
                        onFocus={e => {
                          if (parc.valorInput === '0,00' || parc.valorInput === '') e.target.select();
                        }}
                        onChange={e => handleUpdateParcelaValor(index, maskCurrencyInput(e.target.value))}
                        onBlur={() => {
                          const formatted = sanitizeCurrencyInputOnBlur(parc.valorInput);
                          handleUpdateParcelaValor(index, formatted);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Linha Digitável / Cód. Barras (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Código do boleto agrupado"
                        value={parc.codigoBarras}
                        onChange={e => handleUpdateParcelaCodigoBarras(index, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Comparison and Reconciliation Panel */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <span className="text-slate-500">Soma das Parcelas: </span>
                    <strong className="text-slate-900 font-bold">{formatCurrency(somaParcelas)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Total dos Títulos: </span>
                    <strong className="text-indigo-700 font-bold">{formatCurrency(totalSelecionado)}</strong>
                  </div>
                  {Math.abs(diferencaValores) <= 0.01 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valores 100% conferidos
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" /> Diferença: {formatCurrency(diferencaValores)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {Math.abs(diferencaValores) > 0.01 && (
                    <button
                      type="button"
                      onClick={handleAjustarSaldoUltimaParcela}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                      title="Ajustar automaticamente a diferença na última parcela"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Ajustar saldo na última</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => recalculateParcelas(totalSelecionado, qtdParcelas, parcelas[0]?.dataVencimento, intervaloDias)}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                    title="Recalcular e distribuir o valor total igualmente entre as parcelas"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Redistribuir igualmente</span>
                  </button>
                </div>
              </div>

              {/* Informative Note */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs text-indigo-900 leading-relaxed">
                <strong>Atenção:</strong> Ao confirmar o agrupamento, os <strong>{selectedIds.length} títulos individuais originais</strong> serão retirados da lista de boletos e substituídos por este(s) <strong>{qtdParcelas} boleto(s) agrupado(s)</strong>, mantendo as referências originais das notas fiscais para histórico e baixa financeira.
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="form-agrupar-boletos"
            disabled={selectedIds.length < 2 || Math.abs(diferencaValores) > 0.05}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar Agrupamento ({selectedIds.length} Títulos)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
