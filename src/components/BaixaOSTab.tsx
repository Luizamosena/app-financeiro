import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Check, 
  Trash2, 
  RotateCcw, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Layers, 
  Hash, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileEdit,
  X
} from 'lucide-react';
import { OrdemServico } from '../types';
import { exportOrdemServicoExcel, exportOrdemServicoPDF } from '../utils/reports';
import { ConfirmModal } from './ConfirmModal';

interface BaixaOSTabProps {
  ordens: OrdemServico[];
  onDarBaixa: (id: string, observacao?: string) => void;
  onDesfazerBaixa: (id: string) => void;
  onExcluirOS: (id: string) => void;
  onAddOS: (numero: number, observacao?: string) => boolean;
  onGerarSequencia: (inicio: number, quantidade: number) => number;
}

export const BaixaOSTab: React.FC<BaixaOSTabProps> = ({
  ordens,
  onDarBaixa,
  onDesfazerBaixa,
  onExcluirOS,
  onAddOS,
  onGerarSequencia,
}) => {
  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'pendente' | 'baixada'>('todas');

  // Modals state
  const [deleteModalOS, setDeleteModalOS] = useState<OrdemServico | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editObservacaoOS, setEditObservacaoOS] = useState<OrdemServico | null>(null);

  // Form states
  const [novoNumero, setNovoNumero] = useState<string>('');
  const [novaObservacao, setNovaObservacao] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Batch generator state
  const [batchInicio, setBatchInicio] = useState<number>(5480);
  const [batchQuantidade, setBatchQuantidade] = useState<number>(20);

  // Note editor
  const [tempObs, setTempObs] = useState('');

  // Quick stats
  const totalGeral = ordens.length;
  const totalPendentes = ordens.filter(o => o.status === 'pendente').length;
  const totalBaixadas = ordens.filter(o => o.status === 'baixada').length;

  // Next suggested number
  const proximoNumero = useMemo(() => {
    if (ordens.length === 0) return 5480;
    const maxNum = Math.max(...ordens.map(o => o.numero));
    return maxNum < 5480 ? 5480 : maxNum + 1;
  }, [ordens]);

  // Filtered and sorted in strict numerical order
  const filteredOrdens = useMemo(() => {
    return [...ordens]
      .filter(o => {
        // Status filter
        if (statusFilter !== 'todas' && o.status !== statusFilter) return false;

        // Search term (by OS number or observation)
        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase();
          const matchNumero = o.numero.toString().includes(term);
          const matchObs = o.observacao?.toLowerCase().includes(term);
          return matchNumero || matchObs;
        }

        return true;
      })
      .sort((a, b) => a.numero - b.numero);
  }, [ordens, statusFilter, searchTerm]);

  // Handlers
  const handleOpenAddModal = (sugerido?: number) => {
    setNovoNumero((sugerido || proximoNumero).toString());
    setNovaObservacao('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(novoNumero, 10);
    if (isNaN(num) || num <= 0) {
      setFormError('Informe um número válido de OS.');
      return;
    }

    const success = onAddOS(num, novaObservacao.trim() || undefined);
    if (success) {
      setIsAddModalOpen(false);
      setNovoNumero('');
      setNovaObservacao('');
      setFormError('');
    } else {
      setFormError(`A numeração OS-${num} já existe na lista.`);
    }
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchInicio <= 0 || batchQuantidade <= 0) return;
    onGerarSequencia(batchInicio, batchQuantidade);
    setIsBatchModalOpen(false);
  };

  const handleSaveObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editObservacaoOS) return;
    if (editObservacaoOS.status === 'baixada') {
      onDarBaixa(editObservacaoOS.id, tempObs.trim());
    } else {
      // Just update observation
      onDarBaixa(editObservacaoOS.id, tempObs.trim());
      // Revert status to pendente if it wasn't baixada yet
    }
    setEditObservacaoOS(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">4. Baixa de Ordens de Serviço (OS)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle sequencial numérico a partir do nº 5480 com baixa manual e exclusão de numerações.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-adicionar-proxima-os"
            onClick={() => onAddOS(proximoNumero)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            title={`Inserir automaticamente a próxima numeração (OS ${proximoNumero})`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Adicionar Próxima (OS {proximoNumero})</span>
          </button>

          <button
            type="button"
            id="btn-adicionar-os-avulsa"
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
          >
            <Hash className="w-4 h-4 text-slate-500" />
            <span>Inserir Nº Avulso</span>
          </button>

          <button
            type="button"
            id="btn-gerar-sequencia-os"
            onClick={() => {
              setBatchInicio(proximoNumero);
              setIsBatchModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-200"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Gerar Sequência</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Export options */}
          <button
            type="button"
            id="btn-export-excel-os"
            onClick={() => {
              const filtroInfo = statusFilter !== 'todas' 
                ? (statusFilter === 'pendente' ? 'Apenas Pendentes' : 'Apenas Baixadas')
                : undefined;
              exportOrdemServicoExcel(filteredOrdens, filtroInfo);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
            title="Exportar lista de OS em Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            id="btn-export-pdf-os"
            onClick={() => {
              const filtroInfo = statusFilter !== 'todas' 
                ? (statusFilter === 'pendente' ? 'Apenas Pendentes' : 'Apenas Baixadas')
                : undefined;
              exportOrdemServicoPDF(filteredOrdens, filtroInfo);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            title="Gerar relatório de OS em PDF"
          >
            <FileText className="w-4 h-4 text-rose-700" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total OS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total na Lista
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">
              {totalGeral}
            </span>
            <p className="text-xs text-slate-500 mt-0.5">numerações cadastradas</p>
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Aguardando Baixa
            </span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-700">
              {totalPendentes}
            </span>
            <p className="text-xs text-amber-800/80 mt-0.5">ordens pendentes de baixa</p>
          </div>
        </div>

        {/* Baixadas */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200/80 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Baixas Realizadas
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-700">
              {totalBaixadas}
            </span>
            <p className="text-xs text-emerald-800/80 mt-0.5">ordens baixadas e finalizadas</p>
          </div>
        </div>

        {/* Sequência / Próximo Número */}
        <div className="bg-white rounded-xl p-4 border border-indigo-200/80 shadow-xs bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
              Próxima Numeração
            </span>
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Hash className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-indigo-700">
              OS {proximoNumero}
            </span>
            <p className="text-xs text-indigo-800/80 mt-0.5">próxima sequência numérica</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-busca-os"
            placeholder="Buscar por número (ex: 5480) ou nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 bg-slate-50 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('todas')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'todas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Todas ({totalGeral})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pendente')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'pendente'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pendentes ({totalPendentes})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('baixada')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'baixada'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Baixadas ({totalBaixadas})</span>
          </button>
        </div>
      </div>

      {/* Main OS Numerical Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-2.5 w-36 whitespace-nowrap">Numeração da OS</th>
                <th className="py-2.5 px-2 w-32 whitespace-nowrap">Situação</th>
                <th className="py-2.5 px-2.5 w-44 whitespace-nowrap">Registro da Baixa</th>
                <th className="py-2.5 px-2.5">Observações</th>
                <th className="py-2.5 px-2 text-right w-44 whitespace-nowrap">Ações Manuais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrdens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto flex flex-col items-center">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
                        <ClipboardCheck className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-700">Nenhuma Ordem de Serviço encontrada</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchTerm ? 'Tente buscar por outro número.' : 'Adicione novas OS utilizando os botões acima.'}
                      </p>
                      {ordens.length === 0 && (
                        <button
                          type="button"
                          onClick={() => onGerarSequencia(5480, 25)}
                          className="mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                        >
                          Gerar Sequência Inicial (5480 a 5504)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrdens.map((os) => {
                  const isBaixada = os.status === 'baixada';
                  return (
                    <tr 
                      key={os.id} 
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isBaixada ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* OS Number */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-black font-mono rounded-md border ${
                            isBaixada
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                          }`}>
                            OS {os.numero}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {isBaixada ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Baixada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Pendente</span>
                          </span>
                        )}
                      </td>

                      {/* Date of Baixa */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600">
                        {isBaixada && os.dataBaixa ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs">
                              {new Date(os.dataBaixa).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              às {new Date(os.dataBaixa).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Aguardando baixa manual</span>
                        )}
                      </td>

                      {/* Observations */}
                      <td className="py-2.5 px-2.5">
                        <div className="flex items-center gap-2 group">
                          <span className="text-slate-700 text-xs truncate max-w-xs" title={os.observacao || ''}>
                            {os.observacao || <span className="text-slate-400 italic">-</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditObservacaoOS(os);
                              setTempObs(os.observacao || '');
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-indigo-50 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                            title="Editar observação"
                          >
                            <FileEdit className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isBaixada ? (
                            <button
                              type="button"
                              id={`btn-dar-baixa-${os.numero}`}
                              onClick={() => onDarBaixa(os.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                              title={`Dar baixa manual na OS ${os.numero}`}
                            >
                              <Check className="w-3 h-3" />
                              <span>Dar Baixa</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              id={`btn-desfazer-baixa-${os.numero}`}
                              onClick={() => onDesfazerBaixa(os.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Reabrir / Desfazer baixa"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              <span>Reabrir</span>
                            </button>
                          )}

                          {/* Excluir da lista */}
                          <button
                            type="button"
                            id={`btn-excluir-os-${os.numero}`}
                            onClick={() => setDeleteModalOS(os)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title={`Excluir numeração OS ${os.numero} da lista`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50/70 border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Exibindo <strong className="text-slate-700">{filteredOrdens.length}</strong> de <strong className="text-slate-700">{ordens.length}</strong> numerações
          </span>
          <span className="hidden sm:inline text-slate-400">
            Ordem numérica crescente (a partir de 5480)
          </span>
        </div>
      </div>

      {/* Modal: Adicionar Número Avulso */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-slate-900 font-bold mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Hash className="w-5 h-5" />
              </div>
              <h3 className="text-base">Inserir Numeração de OS</h3>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número da Ordem de Serviço (OS):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">OS-</span>
                  <input
                    type="number"
                    id="input-novo-numero-os"
                    min="1"
                    value={novoNumero}
                    onChange={(e) => {
                      setNovoNumero(e.target.value);
                      setFormError('');
                    }}
                    placeholder="Ex: 5480"
                    required
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                  />
                </div>
                {formError && (
                  <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formError}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações / Referência (Opcional):
                </label>
                <input
                  type="text"
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Ex: Placa veículo, cliente ou oficina"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Adicionar à Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerar Sequência em Lote */}
      {isBatchModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsBatchModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-slate-900 font-bold mb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base">Gerar Sequência de OS</h3>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Gere números contínuos em lote a partir de uma numeração inicial. Números já existentes na lista serão mantidos sem duplicação.
            </p>

            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número Inicial:
                </label>
                <input
                  type="number"
                  min="1"
                  value={batchInicio}
                  onChange={(e) => setBatchInicio(parseInt(e.target.value, 10) || 5480)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantidade de Números a Gerar:
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={batchQuantidade}
                  onChange={(e) => setBatchQuantidade(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Irá gerar de <strong>OS-{batchInicio}</strong> até <strong>OS-{batchInicio + batchQuantidade - 1}</strong>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Gerar Sequência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Observação */}
      {editObservacaoOS && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setEditObservacaoOS(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-slate-900 font-bold mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base">Observação da OS {editObservacaoOS.numero}</h3>
                <span className="text-xs text-slate-500 font-normal">
                  {editObservacaoOS.status === 'baixada' ? 'Ordem Baixada' : 'Ordem Pendente'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveObservation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Texto da Observação:
                </label>
                <textarea
                  rows={3}
                  value={tempObs}
                  onChange={(e) => setTempObs(e.target.value)}
                  placeholder="Informe detalhes, placa do veículo, prestador, etc..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditObservacaoOS(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Salvar Observação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Numeração da Lista */}
      <ConfirmModal
        isOpen={Boolean(deleteModalOS)}
        title={`Excluir OS ${deleteModalOS?.numero}?`}
        description={`Tem certeza que deseja excluir a numeração OS-${deleteModalOS?.numero} definitivamente da lista? Esta numeração deixará de constar na sequência.`}
        confirmText="Sim, Excluir Numeração"
        cancelText="Cancelar"
        variant="danger"
        onClose={() => setDeleteModalOS(null)}
        onConfirm={() => {
          if (deleteModalOS) {
            onExcluirOS(deleteModalOS.id);
            setDeleteModalOS(null);
          }
        }}
      />
    </div>
  );
};
