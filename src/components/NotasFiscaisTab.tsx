import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3,
  X, 
  Check, 
  Calendar, 
  Hash, 
  Building, 
  DollarSign, 
  Receipt, 
  Tag, 
  CreditCard,
  Barcode,
  ArrowRight,
  Info,
  FileSpreadsheet,
  FileText,
  FileCode2,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Copy,
  FileCheck,
  Zap
} from 'lucide-react';
import { 
  NotaFiscalEntrada, 
  CategoriaNF, 
  FormaPagamento, 
  ParcelaBoletoInput,
  BoletoAPagar,
  PagamentoFeito
} from '../types';
import { 
  formatCurrency, 
  formatDateBR, 
  parseCurrencyInput, 
  formatNumberToCurrencyInput,
  sanitizeCurrencyInputOnBlur,
  maskCurrencyInput,
  getBancoBadgeClass,
  getCategoriaLabel, 
  getCategoriaBadgeClass,
  getFormaPagamentoLabel,
  getStatusVencimento
} from '../utils/formatters';
import { exportNotasFiscaisExcel, exportNotasFiscaisPDF } from '../utils/reports';
import { FiltroData, isDateInRange, getPeriodoDescricao } from '../utils/dateFilter';
import { ConfirmModal } from './ConfirmModal';
import { XMLNFeImporterModal } from './XMLNFeImporterModal';
import { ParsedNFeData } from '../utils/xmlNFeParser';
import { subscribeToFinancialOptions, syncSaveFinancialOptions } from '../services/firestoreSync';

interface NotasFiscaisTabProps {
  notasFiscais: NotaFiscalEntrada[];
  boletos: BoletoAPagar[];
  pagamentos?: PagamentoFeito[];
  filtroDataGlobal?: FiltroData;
  onAddNotaFiscal: (
    notaFiscal: Omit<NotaFiscalEntrada, 'id' | 'criadoEm'>, 
    parcelasBoletos?: ParcelaBoletoInput[],
    pagamentoPixData?: {
      banco: string;
      dataPagamento: string;
      observacoes?: string;
    }
  ) => void;
  onUpdateNotaFiscal: (
    id: string,
    notaFiscal: Partial<NotaFiscalEntrada>,
    parcelasBoletos?: ParcelaBoletoInput[],
    pagamentoPixData?: {
      banco: string;
      dataPagamento: string;
      observacoes?: string;
    }
  ) => void;
  onDeleteNotaFiscal: (id: string, deleteRelatedBoletos: boolean, deleteRelatedPagamentos: boolean) => void;
  onNavigateToBoletos: () => void;
  onPagarELancarBoleto?: (boleto: BoletoAPagar, dataPagamento: string, banco?: string, observacoes?: string) => void;
  onAddPagamento?: (pagamento: Omit<PagamentoFeito, 'id' | 'criadoEm'>) => void;
  onNavigateToPagamentos?: () => void;
}

export const NotasFiscaisTab: React.FC<NotasFiscaisTabProps> = ({
  notasFiscais,
  boletos,
  pagamentos = [],
  filtroDataGlobal,
  onAddNotaFiscal,
  onUpdateNotaFiscal,
  onDeleteNotaFiscal,
  onNavigateToBoletos,
  onPagarELancarBoleto,
  onAddPagamento,
  onNavigateToPagamentos,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal para ver boletos e histórico de baixas da NF
  const [nfParaVerBoletos, setNfParaVerBoletos] = useState<NotaFiscalEntrada | null>(null);
  const [copiedBarcodeId, setCopiedBarcodeId] = useState<string | null>(null);

  // Sub-modal de baixa rápida de boleto dentro da visualização da NF
  const [boletoParaBaixarModal, setBoletoParaBaixarModal] = useState<BoletoAPagar | null>(null);
  const [dataPagamentoBaixaModal, setDataPagamentoBaixaModal] = useState(() => new Date().toISOString().split('T')[0]);
  const [bancoBaixaModal, setBancoBaixaModal] = useState('');
  const [bancoCustomBaixaModal, setBancoCustomBaixaModal] = useState('');
  const [obsBaixaModal, setObsBaixaModal] = useState('');

  // Form states
  const [numeroNF, setNumeroNF] = useState('');
  const [dataEmissao, setDataEmissao] = useState(() => new Date().toISOString().split('T')[0]);
  const [valorTotalInput, setValorTotalInput] = useState('0,00');
  const [fornecedor, setFornecedor] = useState('');
  const [categoria, setCategoria] = useState<CategoriaNF | ''>('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('boleto');
  const [observacoes, setObservacoes] = useState('');
  const [nfParaExcluir, setNfParaExcluir] = useState<{ 
    nf: NotaFiscalEntrada; 
    boletosQtd: number;
    pagamentosQtd: number;
  } | null>(null);
  const [excluirBoletosVinculados, setExcluirBoletosVinculados] = useState(true);
  const [excluirPagamentosVinculados, setExcluirPagamentosVinculados] = useState(true);

  // Bank options (synced with Firestore / localStorage)
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
          return filtered;
        }
      }
    } catch {
      // fallback
    }
    return defaultBanks;
  });

  // Subscribe to real-time financial options
  React.useEffect(() => {
    const unsubscribe = subscribeToFinancialOptions((opts) => {
      if (opts.bancos && opts.bancos.length > 0) {
        setBancosOpcoes(opts.bancos);
      }
    });
    return () => unsubscribe();
  }, []);

  // PIX specific settings for auto-launching into Pagamentos Feitos
  const [lancarPixAutomatico, setLancarPixAutomatico] = useState(true);
  const [bancoPix, setBancoPix] = useState('Banco do Brasil');
  const [bancoCustomPix, setBancoCustomPix] = useState('');
  const [dataPagamentoPix, setDataPagamentoPix] = useState(() => new Date().toISOString().split('T')[0]);
  const [obsPix, setObsPix] = useState('');
  const [showNovoBancoPixInput, setShowNovoBancoPixInput] = useState(false);
  const [novoBancoPixNome, setNovoBancoPixNome] = useState('');

  const handleAdicionarNovoBancoPix = () => {
    const nomeLimpo = novoBancoPixNome.trim();
    if (!nomeLimpo) return;
    if (bancosOpcoes.some(b => b.toLowerCase() === nomeLimpo.toLowerCase())) {
      setBancoPix(nomeLimpo);
      setShowNovoBancoPixInput(false);
      setNovoBancoPixNome('');
      return;
    }
    const novasOpcoes = [...bancosOpcoes, nomeLimpo];
    setBancosOpcoes(novasOpcoes);
    localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(novasOpcoes));
    syncSaveFinancialOptions({ bancos: novasOpcoes });
    setBancoPix(nomeLimpo);
    setShowNovoBancoPixInput(false);
    setNovoBancoPixNome('');
  };

  // Quick Modal: Lançar Pagamento PIX no Caixa
  const [nfParaLancarPixModal, setNfParaLancarPixModal] = useState<NotaFiscalEntrada | null>(null);
  const [dataPagamentoPixModal, setDataPagamentoPixModal] = useState(() => new Date().toISOString().split('T')[0]);
  const [bancoPixModal, setBancoPixModal] = useState('Banco do Brasil');
  const [bancoCustomPixModal, setBancoCustomPixModal] = useState('');
  const [obsPixModal, setObsPixModal] = useState('');
  const [showNovoBancoModalPix, setShowNovoBancoModalPix] = useState(false);
  const [novoBancoModalPixNome, setNovoBancoModalPixNome] = useState('');

  const handleAbrirModalLancarPix = (nf: NotaFiscalEntrada) => {
    setNfParaLancarPixModal(nf);
    setDataPagamentoPixModal(new Date().toISOString().split('T')[0]);
    setBancoPixModal(nf.pixBanco || 'Banco do Brasil');
    setBancoCustomPixModal('');
    setObsPixModal('');
    setShowNovoBancoModalPix(false);
    setNovoBancoModalPixNome('');
  };

  const handleConfirmarLancarPixModal = () => {
    if (!nfParaLancarPixModal) return;
    const bancoFinal = bancoPixModal === '__custom__' ? bancoCustomPixModal.trim() : bancoPixModal.trim();
    if (!bancoFinal) {
      alert('Por favor, selecione ou informe o banco onde o pagamento PIX foi efetuado.');
      return;
    }

    if (onAddPagamento) {
      onAddPagamento({
        dataPagamento: dataPagamentoPixModal,
        valor: nfParaLancarPixModal.valorTotal,
        beneficiario: nfParaLancarPixModal.fornecedor,
        numeroNotaFiscal: nfParaLancarPixModal.numeroNF,
        mesEmissaoNF: nfParaLancarPixModal.dataEmissao.substring(0, 7),
        formaPagamento: 'PIX',
        banco: bancoFinal,
        observacoes: obsPixModal.trim() || undefined,
      });
    }

    onUpdateNotaFiscal(nfParaLancarPixModal.id, {
      formaPagamento: 'pix',
      pixLancado: true,
      pixBanco: bancoFinal,
      pixDataPagamento: dataPagamentoPixModal,
    });

    setNfParaLancarPixModal(null);
  };

  // Helper to detect if NF was paid via PIX
  const getPixInfo = (nf: NotaFiscalEntrada) => {
    const payment = pagamentos.find(p => 
      (p.numeroNotaFiscal && p.numeroNotaFiscal.trim().toLowerCase() === nf.numeroNF.trim().toLowerCase()) ||
      (nf.pixPagamentoId && p.id === nf.pixPagamentoId)
    );
    const isLancado = Boolean(nf.pixLancado || payment);
    const banco = payment?.banco || nf.pixBanco;
    const dataPagamento = payment?.dataPagamento || nf.pixDataPagamento;
    return { isLancado, banco, dataPagamento, payment };
  };
  
  // Boleto specific settings
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState<ParcelaBoletoInput[]>([
    {
      numeroParcela: 1,
      dataVencimento: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
      })(),
      valor: 0,
      valorInput: '0,00',
      codigoBarras: '',
    }
  ]);

  const [formError, setFormError] = useState('');

  // Duplicate NF detection states
  const [showDuplicateAlertModal, setShowDuplicateAlertModal] = useState(false);
  const [duplicateConfirmedByOk, setDuplicateConfirmedByOk] = useState(false);
  const [isSubmittingDuplicate, setIsSubmittingDuplicate] = useState(false);
  const [duplicateCancelFeedback, setDuplicateCancelFeedback] = useState<string | null>(null);

  // XML Import states
  const [isXMLModalOpen, setIsXMLModalOpen] = useState(false);
  const [xmlSuccessNotice, setXmlSuccessNotice] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [selectedFormaPagamento, setSelectedFormaPagamento] = useState<string>('todos');
  const [aplicarFiltroData, setAplicarFiltroData] = useState(true);

  // Detect if the entered numeroNF already exists in the system
  const duplicateFoundNF = useMemo(() => {
    if (!numeroNF.trim()) return null;
    const numTrim = numeroNF.trim().toLowerCase();
    const digitsInput = numeroNF.replace(/\D/g, '');

    return notasFiscais.find(nf => {
      // Don't flag the NF currently being edited
      if (editingId && nf.id === editingId) return false;

      const existingTrim = nf.numeroNF.trim().toLowerCase();
      if (existingTrim === numTrim) return true;

      const existingDigits = nf.numeroNF.replace(/\D/g, '');
      if (digitsInput && existingDigits && digitsInput === existingDigits) return true;

      return false;
    });
  }, [numeroNF, notasFiscais, editingId]);

  const handleNumeroNFChange = (value: string) => {
    setNumeroNF(value);
    setDuplicateCancelFeedback(null);
    if (duplicateConfirmedByOk) {
      setDuplicateConfirmedByOk(false);
    }
  };

  const handleNumeroNFBlur = () => {
    if (duplicateFoundNF && !duplicateConfirmedByOk) {
      setIsSubmittingDuplicate(false);
      setShowDuplicateAlertModal(true);
    }
  };

  const handleCancelarLancamentoDuplicado = () => {
    setShowDuplicateAlertModal(false);
    setIsSubmittingDuplicate(false);
    setDuplicateConfirmedByOk(false);
    setNumeroNF('');
    setXmlSuccessNotice(null);
    setDuplicateCancelFeedback('Lançamento duplicado cancelado. O número da nota foi limpo com sucesso.');
  };

  const handleOkContinuarLancamento = () => {
    setDuplicateConfirmedByOk(true);
    setShowDuplicateAlertModal(false);
    if (isSubmittingDuplicate) {
      setIsSubmittingDuplicate(false);
      executeSave();
    }
  };

  // Update installments when total value or quantity changes
  const updateParcelasCount = (count: number, currentTotalVal?: number) => {
    const total = currentTotalVal !== undefined ? currentTotalVal : parseCurrencyInput(valorTotalInput);
    const numParcelas = Math.max(1, count);
    setQtdParcelas(numParcelas);

    const valorPorParcela = total > 0 ? parseFloat((total / numParcelas).toFixed(2)) : 0;
    
    const novasParcelas: ParcelaBoletoInput[] = [];
    for (let i = 1; i <= numParcelas; i++) {
      const d = new Date();
      // Default spacing: 30 days per installment
      d.setDate(d.getDate() + (30 * i));
      const val = i === numParcelas && total > 0 
        ? parseFloat((total - (valorPorParcela * (numParcelas - 1))).toFixed(2)) 
        : valorPorParcela;
      
      novasParcelas.push({
        numeroParcela: i,
        dataVencimento: d.toISOString().split('T')[0],
        valor: val,
        valorInput: formatNumberToCurrencyInput(val),
        codigoBarras: '',
      });
    }
    setParcelas(novasParcelas);
  };

  const handleApplyXMLData = (data: ParsedNFeData) => {
    setShowForm(true);
    setEditingId(null);
    setNumeroNF(data.numeroNF);
    setDataEmissao(data.dataEmissao);
    setValorTotalInput(data.valorTotalFormatado || formatNumberToCurrencyInput(data.valorTotal));
    setFornecedor(data.fornecedorNome);
    setCategoria(''); // Nunca preencher automaticamente a categoria da NF
    setFormaPagamento(data.formaPagamentoSugerida);
    setObservacoes('');
    setFormError('');
    setDuplicateCancelFeedback(null);
    setDuplicateConfirmedByOk(false);

    if (data.formaPagamentoSugerida === 'pix') {
      setLancarPixAutomatico(true);
      setDataPagamentoPix(data.dataEmissao || new Date().toISOString().split('T')[0]);
      setObsPix('');
      setQtdParcelas(1);
      setParcelas([]);
    } else if (data.duplicatas && data.duplicatas.length > 0) {
      setQtdParcelas(data.duplicatas.length);
      setParcelas(
        data.duplicatas.map(d => ({
          numeroParcela: d.numeroParcela,
          dataVencimento: d.dataVencimento,
          valor: d.valor,
          valorInput: formatNumberToCurrencyInput(d.valor),
          codigoBarras: '',
        }))
      );
    } else if (data.formaPagamentoSugerida === 'boleto') {
      updateParcelasCount(1, data.valorTotal);
    }

    setXmlSuccessNotice(
      `Dados da nota fiscal ${data.numeroNF} (${data.fornecedorNome}) importados com sucesso pelo XML!`
    );

    // Se a nota do XML já está cadastrada, abre o alerta imediatamente
    const numTrim = data.numeroNF.trim().toLowerCase();
    const digitsInput = data.numeroNF.replace(/\D/g, '');
    const alreadyExists = notasFiscais.some(nf => {
      const existingTrim = nf.numeroNF.trim().toLowerCase();
      if (existingTrim === numTrim) return true;
      const existingDigits = nf.numeroNF.replace(/\D/g, '');
      return Boolean(digitsInput && existingDigits && digitsInput === existingDigits);
    });

    if (alreadyExists) {
      setIsSubmittingDuplicate(false);
      setShowDuplicateAlertModal(true);
    }
  };

  const handleValorTotalChange = (valStr: string) => {
    const masked = maskCurrencyInput(valStr);
    setValorTotalInput(masked);
    const parsed = parseCurrencyInput(masked);
    if (formaPagamento === 'boleto') {
      updateParcelasCount(qtdParcelas, parsed);
    }
  };

  const handleParcelaChange = (index: number, field: keyof ParcelaBoletoInput, value: any) => {
    setParcelas(prev => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const resetForm = () => {
    setNumeroNF('');
    setDataEmissao(new Date().toISOString().split('T')[0]);
    setValorTotalInput('0,00');
    setFornecedor('');
    setCategoria(''); // Nunca preencher automaticamente
    setFormaPagamento('boleto');
    setObservacoes('');
    setQtdParcelas(1);
    setEditingId(null);
    setFormError('');
    setXmlSuccessNotice(null);
    setShowDuplicateAlertModal(false);
    setDuplicateConfirmedByOk(false);
    setIsSubmittingDuplicate(false);
    setLancarPixAutomatico(true);
    setBancoPix('Banco do Brasil');
    setBancoCustomPix('');
    setDataPagamentoPix(new Date().toISOString().split('T')[0]);
    setObsPix('');
    setShowNovoBancoPixInput(false);
    setNovoBancoPixNome('');
    setShowForm(false);
  };

  const handleStartEdit = (nf: NotaFiscalEntrada) => {
    setEditingId(nf.id);
    setNumeroNF(nf.numeroNF);
    setDataEmissao(nf.dataEmissao);
    setValorTotalInput(formatNumberToCurrencyInput(nf.valorTotal));
    setFornecedor(nf.fornecedor);
    setCategoria(nf.categoria);
    setFormaPagamento(nf.formaPagamento);
    setObservacoes(nf.observacoes || '');
    setFormError('');
    setShowDuplicateAlertModal(false);
    setDuplicateConfirmedByOk(true); // Don't block editing an existing invoice
    setIsSubmittingDuplicate(false);
    setDuplicateCancelFeedback(null);

    // Pre-populate installments if payment method is 'boleto'
    if (nf.formaPagamento === 'boleto') {
      const boletosVinculados = boletos
        .filter(b => b.notaFiscalId === nf.id || b.numeroNF === nf.numeroNF)
        .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

      if (boletosVinculados.length > 0) {
        setQtdParcelas(boletosVinculados.length);
        setParcelas(boletosVinculados.map((b, idx) => ({
          numeroParcela: idx + 1,
          dataVencimento: b.dataVencimento,
          valor: b.valor,
          valorInput: formatNumberToCurrencyInput(b.valor),
          codigoBarras: b.codigoBarras || '',
        })));
      } else {
        updateParcelasCount(nf.quantidadeParcelas || 1, nf.valorTotal);
      }
    } else if (nf.formaPagamento === 'pix') {
      const pixInfo = getPixInfo(nf);
      setLancarPixAutomatico(!pixInfo.isLancado);
      setBancoPix(pixInfo.banco || nf.pixBanco || 'Banco do Brasil');
      setDataPagamentoPix(pixInfo.dataPagamento || nf.pixDataPagamento || nf.dataEmissao || new Date().toISOString().split('T')[0]);
      setObsPix(nf.observacoes || '');
    }

    setShowForm(true);
  };

  const executeSave = () => {
    const valNumerico = parseCurrencyInput(valorTotalInput);

    if (!categoria) {
      setFormError('Selecione obrigatoriamente a categoria da Nota Fiscal.');
      return;
    }

    let pixDataToSend: { banco: string; dataPagamento: string; observacoes?: string; } | undefined = undefined;

    if (formaPagamento === 'pix' && lancarPixAutomatico) {
      const bancoFinal = bancoPix === '__custom__' ? bancoCustomPix.trim() : bancoPix.trim();
      if (!bancoFinal) {
        setFormError('Selecione ou informe obrigatoriamente o Banco onde o pagamento PIX foi efetuado.');
        return;
      }
      pixDataToSend = {
        banco: bancoFinal,
        dataPagamento: dataPagamentoPix || dataEmissao,
        observacoes: obsPix.trim() || undefined,
      };
    }

    if (editingId) {
      onUpdateNotaFiscal(
        editingId,
        {
          numeroNF: numeroNF.trim(),
          dataEmissao,
          valorTotal: valNumerico,
          fornecedor: fornecedor.trim(),
          categoria: categoria as CategoriaNF,
          formaPagamento,
          quantidadeParcelas: formaPagamento === 'boleto' ? qtdParcelas : undefined,
          observacoes: observacoes.trim() || undefined,
          pixLancado: pixDataToSend ? true : undefined,
          pixBanco: pixDataToSend ? pixDataToSend.banco : undefined,
          pixDataPagamento: pixDataToSend ? pixDataToSend.dataPagamento : undefined,
        },
        formaPagamento === 'boleto' ? parcelas : undefined,
        pixDataToSend
      );
    } else {
      onAddNotaFiscal(
        {
          numeroNF: numeroNF.trim(),
          dataEmissao,
          valorTotal: valNumerico,
          fornecedor: fornecedor.trim(),
          categoria: categoria as CategoriaNF,
          formaPagamento,
          quantidadeParcelas: formaPagamento === 'boleto' ? qtdParcelas : undefined,
          observacoes: observacoes.trim() || undefined,
        },
        formaPagamento === 'boleto' ? parcelas : undefined,
        pixDataToSend
      );
    }

    setShowDuplicateAlertModal(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valNumerico = parseCurrencyInput(valorTotalInput);

    if (!numeroNF.trim()) {
      setFormError('Informe o número da Nota Fiscal.');
      return;
    }
    if (!dataEmissao) {
      setFormError('Informe a data de emissão da NF.');
      return;
    }
    if (valNumerico <= 0) {
      setFormError('Informe um valor total válido maior que zero.');
      return;
    }
    if (!fornecedor.trim()) {
      setFormError('Informe o nome do fornecedor.');
      return;
    }
    if (!categoria) {
      setFormError('Selecione obrigatoriamente a Categoria da Nota Fiscal.');
      return;
    }

    if (formaPagamento === 'boleto') {
      // Validate parcels
      for (const p of parcelas) {
        if (!p.dataVencimento) {
          setFormError(`Informe a data de vencimento da parcela ${p.numeroParcela}.`);
          return;
        }
        if (p.valor <= 0) {
          setFormError(`O valor da parcela ${p.numeroParcela} deve ser maior que zero.`);
          return;
        }
      }
    }

    // Se detectou que a nota já foi lançada e o usuário ainda não deu OK no aviso de duplicidade
    if (duplicateFoundNF && !duplicateConfirmedByOk) {
      setIsSubmittingDuplicate(true);
      setShowDuplicateAlertModal(true);
      return;
    }

    executeSave();
  };

  // Cálculos de boletos e histórico de baixas para o modal de detalhamento da NF
  const boletosAbertosModal = useMemo(() => {
    if (!nfParaVerBoletos) return [];
    const nfNum = nfParaVerBoletos.numeroNF.toLowerCase().trim();
    const nId = nfParaVerBoletos.id;
    return boletos.filter(b => {
      if (b.pago) return false;
      if (b.notaFiscalId && b.notaFiscalId === nId) return true;
      if (b.numeroNF && b.numeroNF.toLowerCase().trim() === nfNum) return true;
      if (b.notasOrigem && b.notasOrigem.some(n => n.toLowerCase().trim() === nfNum)) return true;
      return false;
    });
  }, [nfParaVerBoletos, boletos]);

  const boletosPagosModal = useMemo(() => {
    if (!nfParaVerBoletos) return [];
    const nfNum = nfParaVerBoletos.numeroNF.toLowerCase().trim();
    const nId = nfParaVerBoletos.id;

    const itens: {
      id: string;
      valor: number;
      dataVencimento?: string;
      dataBaixa: string;
      parcelaInfo?: string;
      banco?: string;
      formaPagamento?: string;
      observacoes?: string;
      codigoBarras?: string;
      agrupado?: boolean;
      titulosOrigemQtd?: number;
    }[] = [];

    // Pagamentos feitos vinculados a esta NF
    (pagamentos || []).forEach(p => {
      let isMatch = false;
      let parcela = '';
      let venc = '';
      let barCode = '';
      let isAgrup = false;
      let qtdTitulos = 0;

      if (p.boletoOrigem) {
        const bo = p.boletoOrigem;
        if (
          (bo.notaFiscalId && bo.notaFiscalId === nId) ||
          (bo.numeroNF && bo.numeroNF.toLowerCase().trim() === nfNum) ||
          (bo.notasOrigem && bo.notasOrigem.some(n => n.toLowerCase().trim() === nfNum)) ||
          (bo.boletosOriginais && bo.boletosOriginais.some(o => 
            (o.notaFiscalId && o.notaFiscalId === nId) || 
            (o.numeroNF && o.numeroNF.toLowerCase().trim() === nfNum)
          ))
        ) {
          isMatch = true;
          parcela = bo.parcelaInfo || '';
          venc = bo.dataVencimento || '';
          barCode = bo.codigoBarras || '';
          isAgrup = !!bo.agrupado;
          qtdTitulos = bo.titulosOrigemQtd || 0;
        }
      } else if (p.numeroNotaFiscal && p.numeroNotaFiscal.toLowerCase().trim() === nfNum) {
        isMatch = true;
      }

      if (isMatch) {
        itens.push({
          id: p.id,
          valor: p.valor,
          dataVencimento: venc,
          dataBaixa: p.dataPagamento,
          parcelaInfo: parcela || 'Única / Total',
          banco: p.banco,
          formaPagamento: p.formaPagamento || 'Liquidação de boleto',
          observacoes: p.observacoes,
          codigoBarras: barCode,
          agrupado: isAgrup,
          titulosOrigemQtd: qtdTitulos,
        });
      }
    });

    // Boletos com flag pago === true ainda no array de boletos
    boletos.forEach(b => {
      if (!b.pago) return;
      const isMatch = (
        (b.notaFiscalId && b.notaFiscalId === nId) ||
        (b.numeroNF && b.numeroNF.toLowerCase().trim() === nfNum) ||
        (b.notasOrigem && b.notasOrigem.some(n => n.toLowerCase().trim() === nfNum))
      );
      if (isMatch && !itens.some(it => it.id === b.id)) {
        itens.push({
          id: b.id,
          valor: b.valor,
          dataVencimento: b.dataVencimento,
          dataBaixa: b.dataEmissaoNF || new Date().toISOString().split('T')[0],
          parcelaInfo: b.parcelaInfo || 'Única',
          banco: undefined,
          formaPagamento: 'Boleto liquidado',
          observacoes: b.observacoes,
          codigoBarras: b.codigoBarras,
          agrupado: b.agrupado,
          titulosOrigemQtd: b.titulosOrigemQtd,
        });
      }
    });

    return itens;
  }, [nfParaVerBoletos, pagamentos, boletos]);

  const totalValorAbertoModal = useMemo(() => {
    return boletosAbertosModal.reduce((acc, b) => acc + b.valor, 0);
  }, [boletosAbertosModal]);

  const totalValorPagoModal = useMemo(() => {
    return boletosPagosModal.reduce((acc, p) => acc + p.valor, 0);
  }, [boletosPagosModal]);

  // Filtered NFs
  const filteredNotas = useMemo(() => {
    return notasFiscais.filter(nf => {
      const matchSearch = 
        nf.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nf.numeroNF.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (nf.observacoes && nf.observacoes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategoria === 'todos' || nf.categoria === selectedCategoria;
      const matchForma = selectedFormaPagamento === 'todos' || nf.formaPagamento === selectedFormaPagamento;

      const matchData = !aplicarFiltroData || !filtroDataGlobal || filtroDataGlobal.preset === 'todos' || 
        isDateInRange(nf.dataEmissao, filtroDataGlobal.dataInicio, filtroDataGlobal.dataFim);

      return matchSearch && matchCat && matchForma && matchData;
    }).sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime());
  }, [notasFiscais, searchTerm, selectedCategoria, selectedFormaPagamento, aplicarFiltroData, filtroDataGlobal]);

  const totalFiltrado = useMemo(() => {
    return filteredNotas.reduce((sum, nf) => sum + (nf.valorTotal || 0), 0);
  }, [filteredNotas]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Lançamento de Notas Fiscais de Entrada
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
              Compras & Serviços
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre notas fiscais com fornecedor, categoria e forma de pagamento gerando boletos automáticos
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Relatório Excel */}
          <button
            id="btn-relatorio-excel-nfs"
            onClick={() => {
              const filtrosArr: string[] = [];
              if (aplicarFiltroData && filtroDataGlobal && filtroDataGlobal.preset !== 'todos') {
                filtrosArr.push(`Período: ${getPeriodoDescricao(filtroDataGlobal)}`);
              }
              if (selectedCategoria !== 'todos') filtrosArr.push(`Categoria: ${getCategoriaLabel(selectedCategoria as CategoriaNF)}`);
              if (selectedFormaPagamento !== 'todos') filtrosArr.push(`Forma: ${getFormaPagamentoLabel(selectedFormaPagamento as FormaPagamento)}`);
              const filtroInfo = filtrosArr.length > 0 ? filtrosArr.join(' | ') : undefined;
              exportNotasFiscaisExcel(filteredNotas, filtroInfo);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
            title="Baixar relatório de Notas Fiscais em Excel (.xlsx) com filtros ativos"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Relatório PDF */}
          <button
            id="btn-relatorio-pdf-nfs"
            onClick={() => {
              const filtrosArr: string[] = [];
              if (aplicarFiltroData && filtroDataGlobal && filtroDataGlobal.preset !== 'todos') {
                filtrosArr.push(`Período: ${getPeriodoDescricao(filtroDataGlobal)}`);
              }
              if (selectedCategoria !== 'todos') filtrosArr.push(`Categoria: ${getCategoriaLabel(selectedCategoria as CategoriaNF)}`);
              if (selectedFormaPagamento !== 'todos') filtrosArr.push(`Forma: ${getFormaPagamentoLabel(selectedFormaPagamento as FormaPagamento)}`);
              const filtroInfo = filtrosArr.length > 0 ? filtrosArr.join(' | ') : undefined;
              exportNotasFiscaisPDF(filteredNotas, filtroInfo);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            title="Gerar relatório de Notas Fiscais em PDF com filtros ativos"
          >
            <FileText className="w-4 h-4 text-rose-700" />
            <span>PDF (.pdf)</span>
          </button>

          {/* Puxar Dados pelo XML */}
          <button
            type="button"
            id="btn-puxar-xml-nf"
            onClick={() => setIsXMLModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-lg border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
            title="Puxar dados da Nota Fiscal automaticamente pelo arquivo XML da SEFAZ"
          >
            <FileCode2 className="w-4 h-4 text-indigo-700" />
            <span>Puxar pelo XML</span>
          </button>

          <button
            id="btn-nova-nf"
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Fechar Formulário' : 'Lançar Nota Fiscal'}</span>
          </button>
        </div>
      </div>

      {/* Form Container */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${editingId ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                {editingId ? `Editar Nota Fiscal de Entrada nº ${numeroNF || ''}` : 'Cadastrar Nova Nota Fiscal de Entrada'}
              </h3>
              {editingId && (
                <p className="text-xs text-slate-500 mt-0.5 ml-4.5">
                  Atualize as informações da nota fiscal e os boletos vinculados
                </p>
              )}
            </div>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner de Preenchimento Rápido via XML */}
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/90 rounded-xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-2xs shrink-0">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Puxar dados automaticamente pelo arquivo XML da NF-e</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-200/80 text-blue-900 rounded">
                    SEFAZ
                  </span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Carrega instantaneamente número da nota, data de emissão, fornecedor, valor total e duplicatas de boletos.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-form-importar-xml"
              onClick={() => setIsXMLModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Selecionar Arquivo .XML</span>
            </button>
          </div>

          {/* Aviso de Sucesso da Importação do XML */}
          {xmlSuccessNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{xmlSuccessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setXmlSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Aviso de Cancelamento do Lançamento Duplicado */}
          {duplicateCancelFeedback && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800 font-medium animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{duplicateCancelFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateCancelFeedback(null)}
                className="text-blue-700 hover:text-blue-900 p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* AVISO DE NOTA FISCAL JÁ LANÇADA (DUPLICIDADE) */}
          {duplicateFoundNF && (
            <div 
              id="aviso-nf-duplicada-banner"
              className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in"
            >
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Atenção: Nota Fiscal Já Lançada no Sistema!
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full">
                    Duplicidade Detectada
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  A nota fiscal <strong>{duplicateFoundNF.numeroNF}</strong> já está cadastrada para o fornecedor <strong>{duplicateFoundNF.fornecedor}</strong> no valor de <strong>{formatCurrency(duplicateFoundNF.valorTotal)}</strong> (Data de emissão: <strong>{formatDateBR(duplicateFoundNF.dataEmissao)}</strong>).
                </p>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowDuplicateAlertModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Abrir Aviso de Confirmação</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelarLancamentoDuplicado}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancelar Lançamento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(duplicateFoundNF)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ver Lançamento Original</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {formError && (
            <div className="mb-4 p-3 text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    id="input-nf-numero"
                    type="text"
                    required
                    placeholder="Ex: NF-11290 ou 11290"
                    value={numeroNF}
                    onChange={(e) => handleNumeroNFChange(e.target.value)}
                    onBlur={handleNumeroNFBlur}
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                      duplicateFoundNF
                        ? 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/20'
                        : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                </div>
                {duplicateFoundNF && (
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>Nota já lançada ({duplicateFoundNF.fornecedor} • {formatCurrency(duplicateFoundNF.valorTotal)})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDuplicateAlertModal(true)}
                      className="text-amber-800 underline font-bold hover:text-amber-950 cursor-pointer ml-1"
                    >
                      Ver Aviso
                    </button>
                  </div>
                )}
              </div>

              {/* Data de Emissão */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Emissão *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="input-nf-data-emissao"
                    type="date"
                    required
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Valor Total */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Total da Nota (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    id="input-nf-valor-total"
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="0,00"
                    value={valorTotalInput}
                    onFocus={(e) => {
                      if (valorTotalInput === '0,00' || valorTotalInput === '') e.target.select();
                    }}
                    onChange={(e) => handleValorTotalChange(e.target.value)}
                    onBlur={() => {
                      const num = parseCurrencyInput(valorTotalInput);
                      const formatted = formatNumberToCurrencyInput(num);
                      setValorTotalInput(formatted);
                      if (formaPagamento === 'boleto') {
                        updateParcelasCount(qtdParcelas, num);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fornecedor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Fornecedor *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    id="input-nf-fornecedor"
                    type="text"
                    required
                    placeholder="Ex: Distribuidora Nacional S.A."
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Categoria da NF *</span>
                  {!categoria ? (
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      Obrigatório Selecionar
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                      Selecionada
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Tag className="w-4 h-4" />
                  </div>
                  <select
                    id="select-nf-categoria"
                    required
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaNF)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 ${
                      !categoria
                        ? 'border-amber-400 bg-amber-50/30 text-slate-600 focus:border-amber-500 focus:ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  >
                    <option value="">-- Selecione a Categoria (Obrigatório) --</option>
                    <option value="consumo">Consumo</option>
                    <option value="revenda">Revenda</option>
                    <option value="remessa de conserto">Remessa de Conserto</option>
                    <option value="retorno de conserto">Retorno de Conserto</option>
                    <option value="servico">Serviço</option>
                    <option value="frete">Frete</option>
                  </select>
                </div>
                {!categoria && (
                  <p className="text-[11px] text-amber-700 font-medium mt-1">
                    * A categorização deve ser realizada pelo usuário no ato da entrada.
                  </p>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de Pagamento *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <select
                    id="select-nf-forma-pagamento"
                    value={formaPagamento}
                    onChange={(e) => {
                      const newForma = e.target.value as FormaPagamento;
                      setFormaPagamento(newForma);
                      if (newForma === 'boleto') {
                        updateParcelasCount(qtdParcelas);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="boleto">Boleto Bancário (Gera títulos a pagar)</option>
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência (TED/DOC)</option>
                    <option value="cartao">Cartão de Crédito/Débito</option>
                    <option value="dinheiro">Dinheiro em Espécie</option>
                    <option value="sem faturamento">Sem Faturamento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sub-painel dinâmico quando a forma de pagamento for Boleto */}
            {formaPagamento === 'boleto' && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-4">
                <div className="flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Geração Automática de Boletos a Pagar
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Os títulos preenchidos abaixo serão adicionados na aba <strong>Boletos a Pagar</strong>, organizados cronologicamente por vencimento.
                    </p>
                  </div>
                </div>

                {/* Quantidade de Parcelas */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Condição de Pagamento:
                  </label>
                  <select
                    id="select-qtd-parcelas"
                    value={qtdParcelas}
                    onChange={(e) => updateParcelasCount(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={1}>1 Parcela (Boleto Único)</option>
                    <option value={2}>2 Parcelas (2x)</option>
                    <option value={3}>3 Parcelas (3x)</option>
                    <option value={4}>4 Parcelas (4x)</option>
                    <option value={5}>5 Parcelas (5x)</option>
                    <option value={6}>6 Parcelas (6x)</option>
                  </select>
                </div>

                {/* Lista de Parcelas com Vencimento e Valor */}
                <div className="space-y-2.5">
                  {parcelas.map((parc, idx) => (
                    <div 
                      key={idx}
                      className="bg-white p-3 rounded-lg border border-amber-200/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                    >
                      <div className="sm:col-span-2 font-bold text-amber-950 flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-amber-700" />
                        <span>Parcela {parc.numeroParcela}/{qtdParcelas}</span>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block font-medium text-slate-600 mb-0.5">
                          Data de Vencimento *
                        </label>
                        <input
                          type="date"
                          required
                          value={parc.dataVencimento}
                          onChange={(e) => handleParcelaChange(idx, 'dataVencimento', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium focus:bg-white focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block font-medium text-slate-600 mb-0.5">
                          Valor da Parcela (R$) *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="0,00"
                          value={parc.valorInput !== undefined ? parc.valorInput : formatNumberToCurrencyInput(parc.valor)}
                          onFocus={(e) => {
                            if (parc.valor === 0 || parc.valorInput === '0,00' || parc.valorInput === '') e.target.select();
                          }}
                          onChange={(e) => {
                            const masked = maskCurrencyInput(e.target.value);
                            const num = parseCurrencyInput(masked);
                            handleParcelaChange(idx, 'valorInput', masked);
                            handleParcelaChange(idx, 'valor', num);
                          }}
                          onBlur={(e) => {
                            const num = parseCurrencyInput(e.target.value);
                            handleParcelaChange(idx, 'valor', num);
                            handleParcelaChange(idx, 'valorInput', formatNumberToCurrencyInput(num));
                          }}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block font-medium text-slate-600 mb-0.5">
                          Linha Digitável / Código de Barras (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 34191.79001..."
                          value={parc.codigoBarras || ''}
                          onChange={(e) => handleParcelaChange(idx, 'codigoBarras', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono text-[11px] focus:bg-white focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-painel dinâmico / Aba quando a forma de pagamento for PIX */}
            {formaPagamento === 'pix' && (
              <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-2xs shrink-0 mt-0.5">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-emerald-950">
                          Lançamento Automático em Pagamentos Feitos (PIX)
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-200 text-emerald-900 rounded-md">
                          Aba de Integração com o Caixa
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Como o pagamento desta nota foi via PIX, lance simultaneamente este pagamento na aba <strong>1. Pagamentos Feitos</strong> selecionando o banco de saída abaixo.
                      </p>
                    </div>
                  </div>

                  {/* Toggle para habilitar/desabilitar lançamento automático */}
                  <label className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 cursor-pointer shadow-2xs shrink-0">
                    <input
                      type="checkbox"
                      id="check-lancar-pix-automatico"
                      checked={lancarPixAutomatico}
                      onChange={(e) => setLancarPixAutomatico(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-emerald-900">
                      Lançar no Caixa
                    </span>
                  </label>
                </div>

                {lancarPixAutomatico && (
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-3 shadow-2xs animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      {/* Banco do Pagamento */}
                      <div className="sm:col-span-5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Banco de Saída do PIX *
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowNovoBancoPixInput(!showNovoBancoPixInput)}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Outro Banco</span>
                          </button>
                        </div>

                        {showNovoBancoPixInput ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Nome do novo banco..."
                              value={novoBancoPixNome}
                              onChange={(e) => setNovoBancoPixNome(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-emerald-400 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <button
                              type="button"
                              onClick={handleAdicionarNovoBancoPix}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shrink-0 cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowNovoBancoPixInput(false);
                                setNovoBancoPixNome('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <Building className="w-4 h-4" />
                            </div>
                            <select
                              id="select-pix-banco"
                              value={bancoPix}
                              onChange={(e) => setBancoPix(e.target.value)}
                              required
                              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                              <option value="">Selecione o Banco...</option>
                              {bancosOpcoes.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                              <option value="__custom__">+ Outro Banco...</option>
                            </select>
                          </div>
                        )}

                        {bancoPix === '__custom__' && !showNovoBancoPixInput && (
                          <input
                            type="text"
                            placeholder="Digite o nome do banco..."
                            value={bancoCustomPix}
                            onChange={(e) => setBancoCustomPix(e.target.value)}
                            required
                            className="mt-1.5 w-full px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </div>

                      {/* Data do Pagamento PIX */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Data do Pagamento *
                        </label>
                        <input
                          type="date"
                          id="input-pix-data-pagamento"
                          required
                          value={dataPagamentoPix}
                          onChange={(e) => setDataPagamentoPix(e.target.value)}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Valor do PIX (Espelhado da NF) */}
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Valor Lançado no Caixa
                        </label>
                        <div className="px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-950 font-mono">
                            {formatCurrency(parseCurrencyInput(valorTotalInput))}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                            Total da NF
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Observações / Chave PIX */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Observações / Chave PIX / Comprovante (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Chave PIX CNPJ do fornecedor, código de autenticação bancária..."
                        value={obsPix}
                        onChange={(e) => setObsPix(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações Adicionais (Opcional)
              </label>
              <input
                id="input-nf-observacoes"
                type="text"
                placeholder="Ex: Pedido nº 450, frete FOB, peças sob garantia"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
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
                id="btn-salvar-nf"
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Atualizar Nota Fiscal' : 'Salvar Nota Fiscal'}</span>
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
              id="search-notas-fiscais"
              type="text"
              placeholder="Buscar por fornecedor, nº da NF ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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

          {/* Categoria Filter */}
          <select
            id="filter-categoria-nf"
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[170px]"
          >
            <option value="todos">Todas as Categorias</option>
            <option value="consumo">Consumo</option>
            <option value="revenda">Revenda</option>
            <option value="remessa de conserto">Remessa de Conserto</option>
            <option value="retorno de conserto">Retorno de Conserto</option>
            <option value="servico">Serviço</option>
            <option value="frete">Frete</option>
          </select>

          {/* Forma Pagamento Filter */}
          <select
            id="filter-forma-pagamento"
            value={selectedFormaPagamento}
            onChange={(e) => setSelectedFormaPagamento(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-w-[170px]"
          >
            <option value="todos">Todas as Formas</option>
            <option value="boleto">Boleto Bancário</option>
            <option value="pix">PIX</option>
            <option value="transferencia">Transferência</option>
            <option value="cartao">Cartão</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="sem faturamento">Sem Faturamento</option>
          </select>
        </div>

        {/* Total Badge */}
        <div className="flex items-center gap-2 shrink-0 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
            Total NFs ({filteredNotas.length}):
          </span>
          <span className="text-xs font-bold text-blue-700">
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

      {/* Table of Notas Fiscais */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-2 whitespace-nowrap">Nº NF</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Emissão</th>
                <th className="py-2.5 px-2.5 min-w-[130px]">Fornecedor</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Categoria</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Forma Pagto</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Valor Total</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredNotas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Nenhuma nota fiscal encontrada</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || selectedCategoria !== 'todos' || selectedFormaPagamento !== 'todos'
                        ? 'Ajuste os filtros de busca para visualizar mais resultados.'
                        : 'Clique no botão "Lançar Nota Fiscal" para cadastrar.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredNotas.map((nf) => {
                  const nfNumLower = nf.numeroNF.toLowerCase().trim();
                  const boletosAbertosNF = boletos.filter(b => {
                    if (b.pago) return false;
                    return (
                      (b.notaFiscalId && b.notaFiscalId === nf.id) ||
                      (b.numeroNF && b.numeroNF.toLowerCase().trim() === nfNumLower) ||
                      (b.notasOrigem && b.notasOrigem.some(n => n.toLowerCase().trim() === nfNumLower))
                    );
                  });

                  const pagamentosNF = (pagamentos || []).filter(p => {
                    if (p.boletoOrigem) {
                      const bo = p.boletoOrigem;
                      if (
                        (bo.notaFiscalId && bo.notaFiscalId === nf.id) ||
                        (bo.numeroNF && bo.numeroNF.toLowerCase().trim() === nfNumLower) ||
                        (bo.notasOrigem && bo.notasOrigem.some(n => n.toLowerCase().trim() === nfNumLower)) ||
                        (bo.boletosOriginais && bo.boletosOriginais.some(o => 
                          (o.notaFiscalId && o.notaFiscalId === nf.id) || 
                          (o.numeroNF && o.numeroNF.toLowerCase().trim() === nfNumLower)
                        ))
                      ) {
                        return true;
                      }
                    }
                    if (p.numeroNotaFiscal && p.numeroNotaFiscal.toLowerCase().trim() === nfNumLower) {
                      return true;
                    }
                    return false;
                  });

                  const boletosMarcadosPagosNF = boletos.filter(b => {
                    if (!b.pago) return false;
                    return (
                      (b.notaFiscalId && b.notaFiscalId === nf.id) ||
                      (b.numeroNF && b.numeroNF.toLowerCase().trim() === nfNumLower) ||
                      (b.notasOrigem && b.notasOrigem.some(n => n.toLowerCase().trim() === nfNumLower))
                    );
                  });

                  const totalPagosNF = pagamentosNF.length + boletosMarcadosPagosNF.filter(b => !pagamentosNF.some(p => p.id === b.id)).length;
                  const totalBoletosRelacionados = boletosAbertosNF.length + totalPagosNF;

                  return (
                    <tr 
                      key={nf.id} 
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-2 font-medium text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {nf.numeroNF}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                        {formatDateBR(nf.dataEmissao)}
                      </td>
                      <td className="py-2.5 px-2.5 max-w-[200px]">
                        <div className="font-semibold text-slate-900 truncate" title={nf.fornecedor}>
                          {nf.fornecedor}
                        </div>
                        {nf.observacoes && (
                          <div className="text-[11px] text-slate-400 truncate" title={nf.observacoes}>
                            {nf.observacoes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${getCategoriaBadgeClass(nf.categoria)}`}>
                          {getCategoriaLabel(nf.categoria)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {(() => {
                            const pixInfo = getPixInfo(nf);
                            const isPix = nf.formaPagamento === 'pix' || Boolean(nf.pixLancado) || Boolean(nf.pixPagamentoId) || (pixInfo.isLancado && (Boolean(pixInfo.payment?.formaPagamento?.toLowerCase().includes('pix')) || Boolean(nf.pixBanco)));

                            if (isPix) {
                              // NF paga ou vinculada a PIX: mostra APENAS o aviso de PIX (o aviso de boletos nunca deve aparecer)
                              return pixInfo.isLancado ? (
                                <button
                                  type="button"
                                  id={`btn-ver-pix-nf-${nf.id}`}
                                  onClick={() => setNfParaVerBoletos(nf)}
                                  title="Ver detalhes do pagamento PIX lançado"
                                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>PIX Pago ({pixInfo.banco || 'Caixa'} ✓)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  id={`btn-lancar-pix-nf-${nf.id}`}
                                  onClick={() => handleAbrirModalLancarPix(nf)}
                                  title="Lançar este pagamento PIX na lista de Pagamentos Feitos"
                                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold rounded-md border bg-amber-50 hover:bg-emerald-50 text-amber-900 hover:text-emerald-900 border-amber-300 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs animate-pulse"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>PIX (⚡ Lançar em Pagamentos)</span>
                                </button>
                              );
                            }

                            return (
                              <>
                                <span className="text-[11px] font-medium text-slate-700">
                                  {getFormaPagamentoLabel(nf.formaPagamento)}
                                </span>
                                {(nf.formaPagamento === 'boleto' || totalBoletosRelacionados > 0) && (
                                  <button
                                    id={`btn-ver-boletos-nf-${nf.id}`}
                                    type="button"
                                    onClick={() => setNfParaVerBoletos(nf)}
                                    title="Clique para ver os boletos desta Nota Fiscal e respectivas datas de baixa"
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border transition-all cursor-pointer shadow-2xs ${
                                      totalPagosNF > 0 && boletosAbertosNF.length === 0
                                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : totalPagosNF > 0 && boletosAbertosNF.length > 0
                                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300'
                                        : boletosAbertosNF.length > 0
                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    <Receipt className="w-3 h-3 shrink-0" />
                                    <span>
                                      {totalPagosNF > 0 && boletosAbertosNF.length === 0
                                        ? `Boletos (${totalPagosNF} pago${totalPagosNF > 1 ? 's' : ''} ✓)`
                                        : totalPagosNF > 0 && boletosAbertosNF.length > 0
                                        ? `Boletos (${boletosAbertosNF.length} ab, ${totalPagosNF} pg)`
                                        : boletosAbertosNF.length > 0
                                        ? `Boletos (${boletosAbertosNF.length} a pagar)`
                                        : 'Ver Boletos'}
                                    </span>
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap text-xs">
                        {formatCurrency(nf.valorTotal)}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            id={`btn-edit-nf-${nf.id}`}
                            onClick={() => handleStartEdit(nf)}
                            title="Editar lançamento da Nota Fiscal"
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-nf-${nf.id}`}
                            onClick={() => {
                              const nfNumClean = nf.numeroNF.replace(/\D/g, '');
                              const nfNumLower = nf.numeroNF.trim().toLowerCase();
                              
                              const bRel = boletos.filter(b => 
                                b.notaFiscalId === nf.id ||
                                (b.numeroNF && b.numeroNF.trim().toLowerCase() === nfNumLower) ||
                                (b.notasOrigem && b.notasOrigem.some(n => n.trim().toLowerCase() === nfNumLower || (Boolean(nfNumClean) && n.replace(/\D/g, '') === nfNumClean)))
                              );
                              
                              const pRel = pagamentos.filter(p => 
                                (nf.pixPagamentoId && p.id === nf.pixPagamentoId) ||
                                (p.numeroNotaFiscal && p.numeroNotaFiscal.trim().toLowerCase() === nfNumLower) ||
                                (Boolean(nfNumClean) && p.numeroNotaFiscal && p.numeroNotaFiscal.replace(/\D/g, '') === nfNumClean)
                              );

                              setNfParaExcluir({ 
                                nf, 
                                boletosQtd: bRel.length,
                                pagamentosQtd: pRel.length 
                              });
                              setExcluirBoletosVinculados(true);
                              setExcluirPagamentosVinculados(true);
                            }}
                            title="Excluir Nota Fiscal"
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
      </div>
      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={!!nfParaExcluir}
        title="Excluir Nota Fiscal de Entrada"
        description={
          nfParaExcluir
            ? `Tem certeza que deseja excluir a Nota Fiscal nº ${nfParaExcluir.nf.numeroNF} de "${nfParaExcluir.nf.fornecedor}" no valor de ${formatCurrency(nfParaExcluir.nf.valorTotal)}?`
            : ''
        }
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
        extraContent={
          nfParaExcluir && (nfParaExcluir.boletosQtd > 0 || nfParaExcluir.pagamentosQtd > 0) ? (
            <div className="space-y-3 mt-3 text-left">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Vínculos identificados no sistema:</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  Esta Nota Fiscal possui registros associados. Deseja excluir os pagamentos já realizados ou boletos a pagar vinculados a essa nota também?
                </p>
              </div>

              <div className="space-y-2">
                {nfParaExcluir.boletosQtd > 0 && (
                  <label className="flex items-start gap-2.5 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      id="check-excluir-boletos-nf"
                      checked={excluirBoletosVinculados}
                      onChange={(e) => setExcluirBoletosVinculados(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Excluir também {nfParaExcluir.boletosQtd} boleto(s) a pagar vinculado(s)
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Remove os boletos gerados desta nota fiscal na aba de Boletos a Pagar.
                      </span>
                    </div>
                  </label>
                )}

                {nfParaExcluir.pagamentosQtd > 0 && (
                  <label className="flex items-start gap-2.5 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      id="check-excluir-pagamentos-nf"
                      checked={excluirPagamentosVinculados}
                      onChange={(e) => setExcluirPagamentosVinculados(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Excluir também {nfParaExcluir.pagamentosQtd} pagamento(s) já realizado(s) vinculado(s)
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Estorna e apaga do Caixa / Pagamentos Feitos os pagamentos vinculados a esta nota.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          ) : undefined
        }
        onConfirm={() => {
          if (nfParaExcluir) {
            onDeleteNotaFiscal(
              nfParaExcluir.nf.id, 
              excluirBoletosVinculados, 
              excluirPagamentosVinculados
            );
            setNfParaExcluir(null);
          }
        }}
        onClose={() => setNfParaExcluir(null)}
      />

      {/* Modal de Alerta de Nota Fiscal Já Lançada (OK para Continuar ou Cancelar Lançamento) */}
      {showDuplicateAlertModal && duplicateFoundNF && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 relative animate-in zoom-in-95 duration-150">
            {/* Cabeçalho do Alerta */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0 shadow-2xs">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 rounded-md">
                    Aviso do Sistema
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded-md">
                    Nota Já Cadastrada
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Nota Fiscal Já Lançada no Sistema!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  O sistema identificou um registro prévio com este mesmo número de nota.
                </p>
              </div>
            </div>

            {/* Informações da Nota Original */}
            <div className="my-4 p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Número da NF Identificada:</span>
                <span className="text-sm font-black font-mono text-slate-900 bg-white px-2.5 py-0.5 rounded border border-amber-200">
                  {duplicateFoundNF.numeroNF}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fornecedor
                  </span>
                  <span className="font-bold text-slate-800 line-clamp-1 mt-0.5" title={duplicateFoundNF.fornecedor}>
                    {duplicateFoundNF.fornecedor}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Valor Total
                  </span>
                  <span className="font-black text-emerald-700 mt-0.5 block">
                    {formatCurrency(duplicateFoundNF.valorTotal)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Data de Emissão
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDateBR(duplicateFoundNF.dataEmissao)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Forma de Pagamento
                  </span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {getFormaPagamentoLabel(duplicateFoundNF.formaPagamento)}
                  </span>
                </div>
              </div>

              <div className="bg-white/90 p-3 rounded-lg border border-amber-200/80 text-xs text-amber-950 font-medium leading-relaxed">
                ⚠️ <strong>Atenção:</strong> Registrar a mesma nota fiscal pode gerar lançamentos e boletos repetidos no seu Contas a Pagar.
              </div>
            </div>

            {/* Pergunta de Decisão */}
            <p className="text-xs text-slate-700 font-medium text-center mb-5">
              Deseja dar <strong>OK para continuar com o lançamento</strong> desta nota fiscal ou prefere <strong>cancelar o lançamento duplicado</strong>?
            </p>

            {/* Ações: Cancelar Duplicado ou Dar OK para Continuar */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                id="btn-cancelar-lancamento-duplicado"
                onClick={handleCancelarLancamentoDuplicado}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Cancelar o Lançamento Duplicado</span>
              </button>

              <button
                type="button"
                id="btn-ok-continuar-lancamento"
                onClick={handleOkContinuarLancamento}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>OK, Continuar com o Lançamento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importador de XML da NF-e */}
      <XMLNFeImporterModal
        isOpen={isXMLModalOpen}
        onClose={() => setIsXMLModalOpen(false)}
        onApplyData={handleApplyXMLData}
        notasFiscais={notasFiscais}
      />

      {/* Modal: Visualizar Boletos da Nota Fiscal com Histórico de Baixas */}
      {nfParaVerBoletos && (
        <div
          id="modal-ver-boletos-nf"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho do Modal */}
            {(() => {
              const pixInfo = getPixInfo(nfParaVerBoletos);
              const isModalPix = nfParaVerBoletos.formaPagamento === 'pix' || Boolean(nfParaVerBoletos.pixLancado) || Boolean(nfParaVerBoletos.pixPagamentoId) || (pixInfo.isLancado && (Boolean(pixInfo.payment?.formaPagamento?.toLowerCase().includes('pix')) || Boolean(nfParaVerBoletos.pixBanco)));

              return (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isModalPix ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isModalPix ? <Zap className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {isModalPix 
                            ? `Pagamento da Nota Fiscal: ${nfParaVerBoletos.numeroNF}` 
                            : `Boletos da Nota Fiscal: ${nfParaVerBoletos.numeroNF}`}
                        </h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          {getCategoriaLabel(nfParaVerBoletos.categoria)}
                        </span>
                        {isModalPix && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            PIX
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {nfParaVerBoletos.fornecedor} • Emissão: {formatDateBR(nfParaVerBoletos.dataEmissao)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-fechar-modal-boletos-nf-x"
                    onClick={() => setNfParaVerBoletos(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              );
            })()}

            {/* Conteúdo com Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Seção Especial para Nota Fiscal via PIX */}
              {(nfParaVerBoletos.formaPagamento === 'pix' || Boolean(nfParaVerBoletos.pixLancado) || Boolean(nfParaVerBoletos.pixPagamentoId) || getPixInfo(nfParaVerBoletos).isLancado) ? (() => {
                const pixInfo = getPixInfo(nfParaVerBoletos);
                return (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border ${pixInfo.isLancado ? 'bg-emerald-50/80 border-emerald-300' : 'bg-amber-50/80 border-amber-300'} space-y-3`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2.5 rounded-xl ${pixInfo.isLancado ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'} shadow-2xs`}>
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {pixInfo.isLancado ? 'Pagamento via PIX Liquidado & Lançado no Caixa' : 'Pagamento via PIX Pendente de Lançamento no Caixa'}
                            </h4>
                            <p className="text-xs text-slate-600">
                              {pixInfo.isLancado
                                ? 'Este valor já está devidamente lançado na lista de Pagamentos Feitos.'
                                : 'Esta nota fiscal foi cadastrada como PIX, mas o registro ainda não foi adicionado em Pagamentos Feitos.'}
                            </p>
                          </div>
                        </div>

                        {!pixInfo.isLancado && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetNf = nfParaVerBoletos;
                              setNfParaVerBoletos(null);
                              handleAbrirModalLancarPix(targetNf);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Lançar Pagamento Agora</span>
                          </button>
                        )}
                      </div>

                      {/* Detalhes do Pagamento PIX */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Banco de Saída do PIX
                          </span>
                          <span className="text-xs font-bold text-slate-800 mt-1 block">
                            {pixInfo.banco || (nfParaVerBoletos.pixBanco ?? 'Não informado')}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Data do Pagamento
                          </span>
                          <span className="text-xs font-bold text-slate-800 mt-1 block">
                            {pixInfo.dataPagamento ? formatDateBR(pixInfo.dataPagamento) : formatDateBR(nfParaVerBoletos.dataEmissao)}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Valor Pago
                          </span>
                          <span className="text-xs font-black text-emerald-800 mt-1 block font-mono">
                            {formatCurrency(pixInfo.payment?.valor || nfParaVerBoletos.valorTotal)}
                          </span>
                        </div>
                      </div>

                      {pixInfo.payment?.observacoes && !(() => {
                        const obsLower = pixInfo.payment.observacoes.trim().toLowerCase();
                        return (
                          obsLower.startsWith('lançamento automático via pix') ||
                          obsLower.startsWith('lançamento manual via pix') ||
                          obsLower.startsWith('pagamento via pix ref. nf') ||
                          obsLower === 'pagamento via pix'
                        );
                      })() && (
                        <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          <strong>Observações do Lançamento:</strong> {pixInfo.payment.observacoes}
                        </div>
                      )}

                      {pixInfo.isLancado && onNavigateToPagamentos && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setNfParaVerBoletos(null);
                              onNavigateToPagamentos();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Ir para 1. Pagamentos Feitos</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <>
                  {/* Barra de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Valor Total da NF
                  </span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">
                    {formatCurrency(nfParaVerBoletos.valorTotal)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Total Pago / Baixado
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-base font-black text-emerald-800">
                      {formatCurrency(totalValorPagoModal)}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {boletosPagosModal.length} {boletosPagosModal.length === 1 ? 'título' : 'títulos'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    Total a Pagar (Em Aberto)
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-base font-black text-amber-900">
                      {formatCurrency(totalValorAbertoModal)}
                    </span>
                    <span className="text-xs font-bold text-amber-800">
                      {boletosAbertosModal.length} {boletosAbertosModal.length === 1 ? 'título' : 'títulos'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção 1: Boletos Pagos com Data de Baixa em Destaque */}
              {boletosPagosModal.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-100/60 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        Boletos Pagos & Baixados ({boletosPagosModal.length})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-800">
                      Total Baixado: {formatCurrency(totalValorPagoModal)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {boletosPagosModal.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/90 space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-white text-emerald-900 border border-emerald-300">
                              {item.parcelaInfo ? `Parcela ${item.parcelaInfo}` : 'Título Liquidado'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              PAGO / LIQUIDADO
                            </span>
                            {item.agrupado && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                Boleto Agrupado ({item.titulosOrigemQtd || '2+'} títulos)
                              </span>
                            )}
                          </div>
                          <span className="text-base font-black text-emerald-800">
                            {formatCurrency(item.valor)}
                          </span>
                        </div>

                        {/* Detalhamento com Data de Baixa em Evidência */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                          {/* Data de Baixa (Destaque Principal) */}
                          <div className="p-2.5 bg-white rounded-lg border-2 border-emerald-400 shadow-2xs">
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                              Data de Baixa / Pagamento
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-black text-emerald-950">
                              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{formatDateBR(item.dataBaixa)}</span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Vencimento Original
                            </span>
                            <span className="text-xs font-semibold text-slate-800 mt-1 block">
                              {item.dataVencimento ? formatDateBR(item.dataVencimento) : 'Original da NF'}
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Banco de Liquidação
                            </span>
                            <span className="text-xs font-semibold text-slate-800 mt-1 block truncate" title={item.banco || 'Não informado'}>
                              {item.banco || 'Não informado'}
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Forma Registrada
                            </span>
                            <span className="text-xs font-semibold text-slate-800 mt-1 block truncate" title={item.formaPagamento || 'Liquidação de boleto'}>
                              {item.formaPagamento || 'Liquidação de boleto'}
                            </span>
                          </div>
                        </div>

                        {item.observacoes && (
                          <div className="text-xs text-slate-600 bg-white/90 p-2.5 rounded-lg border border-slate-200">
                            <strong className="text-slate-700">Observações:</strong> {item.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção 2: Boletos em Aberto (A Pagar) */}
              {boletosAbertosModal.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-amber-100/60 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Boletos a Pagar em Aberto ({boletosAbertosModal.length})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-800">
                      Total a Pagar: {formatCurrency(totalValorAbertoModal)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {boletosAbertosModal.map((bol) => {
                      const st = getStatusVencimento(bol.dataVencimento);
                      return (
                        <div
                          key={bol.id}
                          className="p-4 bg-white rounded-xl border border-amber-200 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                {bol.parcelaInfo ? `Parcela ${bol.parcelaInfo}` : 'Título'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${st.badgeClass}`}>
                                {st.texto}
                              </span>
                              {bol.agrupado && (
                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  Agrupado
                                </span>
                              )}
                            </div>
                            <span className="text-base font-black text-slate-900">
                              {formatCurrency(bol.valor)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Data de Vencimento
                              </span>
                              <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-900">
                                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                                <span>{formatDateBR(bol.dataVencimento)}</span>
                              </div>
                            </div>

                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Linha Digitável / Código de Barras
                              </span>
                              {bol.codigoBarras ? (
                                <div className="flex items-center justify-between gap-1 mt-1">
                                  <span className="font-mono text-xs text-slate-800 truncate" title={bol.codigoBarras}>
                                    {bol.codigoBarras}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(bol.codigoBarras!);
                                      setCopiedBarcodeId(bol.id);
                                      setTimeout(() => setCopiedBarcodeId(null), 2000);
                                    }}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                    title="Copiar código de barras"
                                  >
                                    {copiedBarcodeId === bol.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic mt-1 block">Não informado</span>
                              )}
                            </div>
                          </div>

                          {bol.observacoes && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <strong className="text-slate-700">Observações:</strong> {bol.observacoes}
                            </div>
                          )}

                          {/* Ação rápida: Baixa direta do boleto */}
                          {onPagarELancarBoleto && (
                            <div className="pt-1 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setBoletoParaBaixarModal(bol);
                                  setDataPagamentoBaixaModal(new Date().toISOString().split('T')[0]);
                                  setBancoBaixaModal('');
                                  setBancoCustomBaixaModal('');
                                  setObsBaixaModal('');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Pagar & Lançar Este Boleto</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Se não houver nenhum boleto (nem aberto nem pago) */}
              {boletosPagosModal.length === 0 && boletosAbertosModal.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Nenhum boleto encontrado
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Não há boletos em aberto ou baixas registradas para a NF {nfParaVerBoletos.numeroNF}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNfParaVerBoletos(null);
                      onNavigateToBoletos();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Ir para Aba de Boletos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
                </>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
              {(nfParaVerBoletos.formaPagamento === 'pix' || Boolean(nfParaVerBoletos.pixLancado) || Boolean(nfParaVerBoletos.pixPagamentoId) || getPixInfo(nfParaVerBoletos).isLancado) ? (
                onNavigateToPagamentos ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNfParaVerBoletos(null);
                      onNavigateToPagamentos();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Ir para 1. Pagamentos Feitos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : <div />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNfParaVerBoletos(null);
                    onNavigateToBoletos();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  <span>Ir para a Aba de Boletos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                id="btn-fechar-modal-boletos-nf"
                onClick={() => setNfParaVerBoletos(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Confirmação de Baixa & Lançamento de Boleto */}
      {boletoParaBaixarModal && (
        <div
          id="modal-baixa-boleto-nf"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Confirmar Baixa do Boleto
                  </h3>
                  <p className="text-xs text-emerald-800">
                    NF {boletoParaBaixarModal.numeroNF} • {formatCurrency(boletoParaBaixarModal.valor)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBoletoParaBaixarModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Data do Pagamento / Baixa *
                </label>
                <input
                  type="date"
                  value={dataPagamentoBaixaModal}
                  onChange={(e) => setDataPagamentoBaixaModal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Banco / Conta de Saída
                </label>
                <select
                  value={bancoBaixaModal}
                  onChange={(e) => setBancoBaixaModal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione um banco...</option>
                  <option value="Itaú">Itaú</option>
                  <option value="Bradesco">Bradesco</option>
                  <option value="Banco do Brasil">Banco do Brasil</option>
                  <option value="Santander">Santander</option>
                  <option value="Caixa Econômica">Caixa Econômica</option>
                  <option value="Sicoob">Sicoob</option>
                  <option value="Sicredi">Sicredi</option>
                  <option value="Inter">Inter</option>
                  <option value="Nubank">Nubank</option>
                  <option value="Outro">Outro banco...</option>
                </select>

                {bancoBaixaModal === 'Outro' && (
                  <input
                    type="text"
                    placeholder="Nome do banco..."
                    value={bancoCustomBaixaModal}
                    onChange={(e) => setBancoCustomBaixaModal(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações Adicionais (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago com desconto, autorização fulano..."
                  value={obsBaixaModal}
                  onChange={(e) => setObsBaixaModal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBoletoParaBaixarModal(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPagarELancarBoleto && boletoParaBaixarModal) {
                    const bancoFinal = bancoBaixaModal === 'Outro' ? bancoCustomBaixaModal : bancoBaixaModal;
                    onPagarELancarBoleto(
                      boletoParaBaixarModal,
                      dataPagamentoBaixaModal,
                      bancoFinal || undefined,
                      obsBaixaModal || undefined
                    );
                    setBoletoParaBaixarModal(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
              >
                Confirmar Pagamento & Lançar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lançamento Rápido de Pagamento PIX em Pagamentos Feitos */}
      {nfParaLancarPixModal && (
        <div
          id="modal-lancar-pix-caixa"
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-emerald-300 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lançar Pagamento PIX no Caixa
                  </h3>
                  <p className="text-xs text-slate-500">
                    NF {nfParaLancarPixModal.numeroNF} • {nfParaLancarPixModal.fornecedor}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNfParaLancarPixModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Valor a ser Lançado
                  </span>
                  <span className="text-lg font-black text-emerald-950 font-mono">
                    {formatCurrency(nfParaLancarPixModal.valorTotal)}
                  </span>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold bg-white text-emerald-800 border border-emerald-300 rounded-md shadow-2xs">
                  Forma: PIX
                </span>
              </div>

              {/* Seleção do Banco */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Banco de Saída do Pagamento *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNovoBancoModalPix(!showNovoBancoModalPix)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Outro Banco</span>
                  </button>
                </div>

                {showNovoBancoModalPix ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Nome do banco..."
                      value={novoBancoModalPixNome}
                      onChange={(e) => setNovoBancoModalPixNome(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-emerald-400 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nome = novoBancoModalPixNome.trim();
                        if (!nome) return;
                        if (!bancosOpcoes.some(b => b.toLowerCase() === nome.toLowerCase())) {
                          const nov = [...bancosOpcoes, nome];
                          setBancosOpcoes(nov);
                          localStorage.setItem('transuniao_bancos_opcoes', JSON.stringify(nov));
                          syncSaveFinancialOptions({ bancos: nov });
                        }
                        setBancoPixModal(nome);
                        setShowNovoBancoModalPix(false);
                        setNovoBancoModalPixNome('');
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shrink-0 cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNovoBancoModalPix(false);
                        setNovoBancoModalPixNome('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <select
                      id="select-modal-pix-banco"
                      value={bancoPixModal}
                      onChange={(e) => setBancoPixModal(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Selecione o Banco...</option>
                      {bancosOpcoes.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__custom__">+ Outro Banco...</option>
                    </select>
                  </div>
                )}

                {bancoPixModal === '__custom__' && !showNovoBancoModalPix && (
                  <input
                    type="text"
                    placeholder="Digite o nome do banco..."
                    value={bancoCustomPixModal}
                    onChange={(e) => setBancoCustomPixModal(e.target.value)}
                    required
                    className="mt-1.5 w-full px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Data do Pagamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  required
                  value={dataPagamentoPixModal}
                  onChange={(e) => setDataPagamentoPixModal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-emerald-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações do Pagamento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chave PIX, código de autenticação bancária..."
                  value={obsPixModal}
                  onChange={(e) => setObsPixModal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setNfParaLancarPixModal(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirmar-lancar-pix-modal"
                onClick={handleConfirmarLancarPixModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Lançar em Pagamentos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
