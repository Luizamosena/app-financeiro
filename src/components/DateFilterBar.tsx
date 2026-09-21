import React, { useState } from 'react';
import { 
  Calendar, 
  CalendarRange, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  RotateCcw,
  Check,
  X
} from 'lucide-react';
import { FiltroData, PeriodoPreset, getPresetDates, getPeriodoDescricao } from '../utils/dateFilter';

interface DateFilterBarProps {
  filtro: FiltroData;
  onFilterChange: (novoFiltro: FiltroData) => void;
  onExportExcelGeral?: () => void;
  onExportPdfGeral?: () => void;
  totalFiltradoPagamentos?: number;
  totalFiltradoBoletos?: number;
  totalFiltradoNotas?: number;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  filtro,
  onFilterChange,
  onExportExcelGeral,
  onExportPdfGeral,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCustomInputs, setShowCustomInputs] = useState(filtro.preset === 'custom');
  const [dataInicioTemp, setDataInicioTemp] = useState(filtro.dataInicio);
  const [dataFimTemp, setDataFimTemp] = useState(filtro.dataFim);

  const presets: { id: PeriodoPreset; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'hoje', label: 'Hoje' },
    { id: 'ultimos_7', label: '7 Dias' },
    { id: 'ultimos_30', label: '30 Dias' },
    { id: 'mes_atual', label: 'Mês Atual' },
    { id: 'mes_anterior', label: 'Mês Anterior' },
    { id: 'ano_atual', label: 'Este Ano' },
    { id: 'custom', label: 'Personalizado' },
  ];

  const handleSelectPreset = (preset: PeriodoPreset) => {
    if (preset === 'custom') {
      setShowCustomInputs(true);
      onFilterChange({
        preset: 'custom',
        dataInicio: dataInicioTemp || filtro.dataInicio,
        dataFim: dataFimTemp || filtro.dataFim,
      });
    } else {
      setShowCustomInputs(false);
      const presetDates = getPresetDates(preset);
      setDataInicioTemp(presetDates.dataInicio);
      setDataFimTemp(presetDates.dataFim);
      onFilterChange({
        preset,
        dataInicio: presetDates.dataInicio,
        dataFim: presetDates.dataFim,
      });
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      preset: 'custom',
      dataInicio: dataInicioTemp,
      dataFim: dataFimTemp,
    });
  };

  const handleClear = () => {
    setShowCustomInputs(false);
    setDataInicioTemp('');
    setDataFimTemp('');
    onFilterChange({
      preset: 'todos',
      dataInicio: '',
      dataFim: '',
    });
  };

  const isFilterActive = filtro.preset !== 'todos';
  const descricaoPeriodo = getPeriodoDescricao(filtro);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs mb-3 transition-all overflow-hidden">
      {/* Compact Collapsed Header Bar */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap bg-slate-50/70">
        {/* Left: Current filter indicator & Quick Clear */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
            <div className={`p-1 rounded-md ${isFilterActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-600'}`}>
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-500 font-normal">Período:</span>
            <span className={`font-semibold px-2 py-0.5 rounded-md text-xs border ${
              isFilterActive 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-slate-700 border-slate-200'
            }`}>
              {descricaoPeriodo}
            </span>
          </div>

          {isFilterActive && (
            <button
              type="button"
              id="btn-limpar-filtro-rapido"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition-colors cursor-pointer"
              title="Remover filtro e exibir todos os registros"
            >
              <X className="w-3 h-3" />
              <span>Limpar Filtro</span>
            </button>
          )}
        </div>

        {/* Right: Toggle Expand Button and Consolidated Reports */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Export Buttons in Compact Bar */}
          {(onExportExcelGeral || onExportPdfGeral) && (
            <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-200 pr-2">
              {onExportExcelGeral && (
                <button
                  type="button"
                  id="btn-export-excel-consolidado"
                  onClick={onExportExcelGeral}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                  title="Exportar Excel com o período selecionado"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Excel Geral</span>
                </button>
              )}
              {onExportPdfGeral && (
                <button
                  type="button"
                  id="btn-export-pdf-consolidado"
                  onClick={onExportPdfGeral}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                  title="Exportar PDF com o período selecionado"
                >
                  <FileText className="w-3 h-3 text-rose-600" />
                  <span>PDF Geral</span>
                </button>
              )}
            </div>
          )}

          {/* Expand/Collapse Trigger */}
          <button
            type="button"
            id="btn-toggle-filtro-periodo"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isExpanded
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : isFilterActive
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'Recolher Filtro' : 'Filtrar por Período'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Filter Options Section */}
      {isExpanded && (
        <div className="p-3.5 border-t border-slate-200 bg-white space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Quick presets pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                <span>Opções rápidas:</span>
              </span>
              {presets.map((p) => {
                const active = filtro.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    id={`btn-preset-${p.id}`}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile Export Buttons if on small screen */}
            {(onExportExcelGeral || onExportPdfGeral) && (
              <div className="flex sm:hidden items-center gap-1.5 pt-2 border-t border-slate-100">
                {onExportExcelGeral && (
                  <button
                    type="button"
                    onClick={onExportExcelGeral}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>Excel</span>
                  </button>
                )}
                {onExportPdfGeral && (
                  <button
                    type="button"
                    onClick={onExportPdfGeral}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md"
                  >
                    <FileText className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Custom Date Range Selector (expanded when 'custom' or user wants specific dates) */}
          {showCustomInputs && (
            <form onSubmit={handleApplyCustom} className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">De:</span>
                <input
                  type="date"
                  id="input-filtro-data-inicio"
                  value={dataInicioTemp}
                  onChange={(e) => setDataInicioTemp(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Até:</span>
                <input
                  type="date"
                  id="input-filtro-data-fim"
                  value={dataFimTemp}
                  onChange={(e) => setDataFimTemp(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
              </div>

              <button
                type="submit"
                id="btn-aplicar-filtro-datas"
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar Intervalo</span>
              </button>
            </form>
          )}

          {/* Helper footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <span>O filtro selecionado atualiza instantaneamente as abas e listagens do sistema.</span>
            {isFilterActive && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar para Todos</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
