import React from 'react';
import { CreditCard, FileText, ReceiptText, AlertCircle, ClipboardCheck } from 'lucide-react';
import { TabType, BoletoAPagar } from '../types';
import { getStatusVencimento } from '../utils/formatters';

interface TabsNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  countPagamentos: number;
  countNotasFiscais: number;
  boletos: BoletoAPagar[];
  countOrdensServico?: number;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onChangeTab,
  countPagamentos,
  countNotasFiscais,
  boletos,
  countOrdensServico = 0,
}) => {
  const countVencidos = boletos.filter(b => {
    const st = getStatusVencimento(b.dataVencimento);
    return st.tipo === 'vencido' || st.tipo === 'hoje';
  }).length;

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2" aria-label="Abas de Gestão">
          {/* Aba 1: Pagamentos Feitos */}
          <button
            id="tab-btn-pagamentos"
            onClick={() => onChangeTab('pagamentos')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'pagamentos'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>1. Pagamentos Feitos</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                activeTab === 'pagamentos'
                  ? 'bg-emerald-700/80 text-emerald-50'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {countPagamentos}
            </span>
          </button>

          {/* Aba 2: Notas Fiscais de Entrada */}
          <button
            id="tab-btn-notas-fiscais"
            onClick={() => onChangeTab('notas_fiscais')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'notas_fiscais'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Notas Fiscais de Entrada</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                activeTab === 'notas_fiscais'
                  ? 'bg-blue-700/80 text-blue-50'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {countNotasFiscais}
            </span>
          </button>

          {/* Aba 3: Boletos a Pagar */}
          <button
            id="tab-btn-boletos"
            onClick={() => onChangeTab('boletos')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap relative ${
              activeTab === 'boletos'
                ? 'bg-amber-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>3. Boletos a Pagar</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                activeTab === 'boletos'
                  ? 'bg-amber-700/80 text-amber-50'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {boletos.length}
            </span>

            {countVencidos > 0 && (
              <span
                title={`${countVencidos} boleto(s) vencido(s) ou com vencimento hoje!`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse"
              >
                <AlertCircle className="w-3 h-3" />
                {countVencidos} urgente
              </span>
            )}
          </button>

          {/* Aba 4: Baixa de OS */}
          <button
            id="tab-btn-baixa-os"
            onClick={() => onChangeTab('baixa_os')}
            className={`flex items-center gap-2.5 py-3 px-4 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'baixa_os'
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>4. Baixa de OS</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                activeTab === 'baixa_os'
                  ? 'bg-indigo-700/80 text-indigo-50'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {countOrdensServico}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};
