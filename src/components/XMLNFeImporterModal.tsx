import React, { useState, useRef } from 'react';
import { 
  FileCode2, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  Hash, 
  Calendar, 
  DollarSign, 
  Layers, 
  Barcode, 
  Check, 
  Sparkles,
  ClipboardPaste,
  FileText,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { parseNFeXML, ParsedNFeData } from '../utils/xmlNFeParser';
import { formatCurrency, getCategoriaLabel, getFormaPagamentoLabel } from '../utils/formatters';
import { NotaFiscalEntrada } from '../types';

interface XMLNFeImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: ParsedNFeData) => void;
  notasFiscais?: NotaFiscalEntrada[];
}

export const XMLNFeImporterModal: React.FC<XMLNFeImporterModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
  notasFiscais,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedNFeData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedXML, setPastedXML] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const duplicateFound = React.useMemo(() => {
    if (!parsedData || !notasFiscais || notasFiscais.length === 0) return null;
    const numTrim = parsedData.numeroNF.trim().toLowerCase();
    const digitsInput = parsedData.numeroNF.replace(/\D/g, '');

    return notasFiscais.find(nf => {
      const existingTrim = nf.numeroNF.trim().toLowerCase();
      if (existingTrim === numTrim) return true;
      const existingDigits = nf.numeroNF.replace(/\D/g, '');
      if (digitsInput && existingDigits && digitsInput === existingDigits) return true;
      if (parsedData.chaveAcesso && nf.observacoes && nf.observacoes.includes(parsedData.chaveAcesso)) {
        return true;
      }
      return false;
    });
  }, [parsedData, notasFiscais]);

  if (!isOpen) return null;

  const handleProcessXMLString = (content: string, name?: string) => {
    try {
      setErrorMessage(null);
      const parsed = parseNFeXML(content);
      setParsedData(parsed);
      if (name) setFileName(name);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao analisar o arquivo XML da NF-e.');
      setParsedData(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErrorMessage('Por favor, selecione um arquivo no formato .xml');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessXMLString(text, file.name);
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErrorMessage('Por favor, selecione um arquivo com extensão .xml');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessXMLString(text, file.name);
    };
    reader.onerror = () => {
      setErrorMessage('Erro ao ler o arquivo arrastado.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedXML.trim()) {
      setErrorMessage('Cole o conteúdo XML da nota fiscal.');
      return;
    }
    handleProcessXMLString(pastedXML, 'XML Colado Manualmente');
  };

  const handleConfirmApply = () => {
    if (parsedData) {
      onApplyData(parsedData);
      onClose();
    }
  };

  const resetAll = () => {
    setParsedData(null);
    setErrorMessage(null);
    setFileName(null);
    setPastedXML('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <span>Puxar Dados da Nota pelo XML (NF-e)</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  SEFAZ XML
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Importe o arquivo .xml da Nota Fiscal Eletrônica de Entrada para preenchimento automático.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4">
          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Certifique-se de que o arquivo é um XML oficial de NF-e (layout SEFAZ padrão contendo &lt;infNFe&gt;).
                </p>
              </div>
            </div>
          )}

          {/* Upload Dropzone (if not parsed yet) */}
          {!parsedData ? (
            <div className="space-y-3">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/70 scale-[0.99]' 
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/70 bg-slate-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,text/xml"
                  onChange={handleFileChange}
                  className="hidden"
                  id="xml-file-input"
                />

                <div className="flex flex-col items-center">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Arraste o arquivo .XML da NF-e aqui
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ou <span className="text-blue-600 font-semibold underline">clique para selecionar do seu computador</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Compatível com notas modelo 55 (NF-e) de fornecedores em todo o Brasil
                  </p>
                </div>
              </div>

              {/* Paste XML alternative */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{showPasteArea ? 'Ocultar área de texto XML' : 'Prefere colar o texto do XML diretamente?'}</span>
                </button>
              </div>

              {showPasteArea && (
                <form onSubmit={handlePasteSubmit} className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                  <label className="block text-xs font-semibold text-slate-700">
                    Cole o código XML abaixo:
                  </label>
                  <textarea
                    rows={5}
                    value={pastedXML}
                    onChange={(e) => setPastedXML(e.target.value)}
                    placeholder="<nfeProc xmlns=...><NFe>..."
                    className="w-full font-mono text-[11px] p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Processar XML Colado
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Parsed Data Preview Card */
            <div className="space-y-4 animate-in fade-in">
              {/* Duplicate Notice if already exists in system */}
              {duplicateFound && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>Aviso: Esta Nota Fiscal já foi lançada no sistema!</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full">
                        Duplicidade Detectada
                      </span>
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      A nota <strong>{duplicateFound.numeroNF}</strong> já consta cadastrada para o fornecedor <strong>{duplicateFound.fornecedor}</strong> no valor de <strong>{formatCurrency(duplicateFound.valorTotal)}</strong> (Emissão: <strong>{new Date(duplicateFound.dataEmissao).toLocaleDateString('pt-BR')}</strong>).
                    </p>
                    <p className="text-[11px] text-amber-900 font-semibold mt-1.5">
                      Para prosseguir, você precisa dar OK para continuar com o lançamento da nota ou cancelar o lançamento duplicado.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Dados da NF-e extraídos com sucesso!
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      {fileName ? `Arquivo: ${fileName}` : 'XML validado'} • Verifique o resumo antes de preencher o formulário.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Trocar Arquivo
                </button>
              </div>

              {/* Grid of Extracted Data */}
              <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Número e Data */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Identificação da Nota
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-black text-slate-900 font-mono">
                        {parsedData.numeroNF}
                      </span>
                      {parsedData.serie && (
                        <span className="text-xs text-slate-500 font-medium">
                          Série: {parsedData.serie}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 mt-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Emissão: <strong>{new Date(parsedData.dataEmissao).toLocaleDateString('pt-BR')}</strong></span>
                    </div>
                  </div>

                  {/* Valor Total */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Valor Total da NF
                    </span>
                    <span className="text-base font-black text-emerald-700">
                      {formatCurrency(parsedData.valorTotal)}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-600 mt-1.5">
                      <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Categoria: Definição manual obrigatória no formulário
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fornecedor */}
                <div className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Emitente / Fornecedor
                  </span>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 text-sm">
                      {parsedData.fornecedorNome}
                    </span>
                  </div>
                  {parsedData.fornecedorCNPJ && (
                    <p className="text-[11px] text-slate-500 mt-1 ml-6">
                      CNPJ: <strong className="text-slate-700">{parsedData.fornecedorCNPJ}</strong>
                      {parsedData.fornecedorMunicipio && ` • ${parsedData.fornecedorMunicipio}/${parsedData.fornecedorUF}`}
                    </p>
                  )}
                </div>

                {/* Duplicatas / Parcelas de Boleto */}
                {parsedData.duplicatas.length > 0 ? (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                        <Barcode className="w-4 h-4 text-amber-700" />
                        <span>Duplicatas / Boletos Identificados no XML ({parsedData.duplicatas.length})</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                        Forma: Boleto Bancário
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsedData.duplicatas.map((dup, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-amber-200 text-[11px] flex items-center justify-between">
                          <span className="font-bold text-slate-700">
                            Parcela {dup.numeroParcela} ({dup.numeroDuplicata ? `Dup. ${dup.numeroDuplicata}` : `Parc. ${dup.numeroParcela}`})
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 block">
                              {formatCurrency(dup.valor)}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              Venc: {new Date(dup.dataVencimento).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100/80 rounded-lg p-2.5 text-[11px] text-slate-600 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Nenhuma duplicata de cobrança identificada no XML. Forma sugerida: <strong>{getFormaPagamentoLabel(parsedData.formaPagamentoSugerida)}</strong>.</span>
                  </div>
                )}

                {/* Chave de Acesso e Itens */}
                {parsedData.chaveAcesso && (
                  <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">Chave da NF-e: </span>
                    <span className="font-mono text-[10px] text-slate-600 break-all">{parsedData.chaveAcesso}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          {duplicateFound ? (
            <button
              type="button"
              id="btn-cancelar-xml-duplicado"
              onClick={() => {
                resetAll();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Cancelar Lançamento Duplicado</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {parsedData && (
            <button
              type="button"
              id="btn-aplicar-dados-xml"
              onClick={handleConfirmApply}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors cursor-pointer ${
                duplicateFound
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {duplicateFound ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>OK, Continuar com o Lançamento</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Preencher Formulário da Nota</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
