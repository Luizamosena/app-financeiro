import { CategoriaNF, FormaPagamento } from '../types';

export interface ParsedDuplicata {
  numeroParcela: number;
  numeroDuplicata?: string;
  dataVencimento: string; // YYYY-MM-DD
  valor: number;
}

export interface ParsedNFeData {
  numeroNF: string;
  serie?: string;
  chaveAcesso?: string;
  dataEmissao: string; // YYYY-MM-DD
  fornecedorNome: string;
  fornecedorCNPJ?: string;
  fornecedorMunicipio?: string;
  fornecedorUF?: string;
  valorTotal: number;
  valorTotalFormatado: string; // ex: "4.850,00"
  naturezaOperacao?: string;
  categoriaSugerida: CategoriaNF;
  formaPagamentoSugerida: FormaPagamento;
  duplicatas: ParsedDuplicata[];
  itensResumo?: string[];
  informacoesComplementares?: string;
  observacoesFormatadas: string;
}

/**
 * Format CNPJ 14 digits to 00.000.000/0000-00
 */
export function formatCNPJ(cnpjRaw: string): string {
  const digits = cnpjRaw.replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return cnpjRaw;
}

/**
 * Format a number into Brazilian currency string without R$ (e.g. 4850.5 -> "4.850,50")
 */
export function formatNumberToCurrencyInput(val: number): string {
  if (isNaN(val) || val <= 0) return '';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Extract text from the first matching tag name in a node or doc
 */
function getTagText(parent: Element | Document, tagName: string): string {
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length > 0 && elements[0].textContent) {
    return elements[0].textContent.trim();
  }
  return '';
}

/**
 * Parse an XML string representing a Brazilian NF-e (SEFAZ layout v3.10 / v4.00)
 */
export function parseNFeXML(xmlContent: string): ParsedNFeData {
  if (!xmlContent || typeof xmlContent !== 'string') {
    throw new Error('Conteúdo do arquivo XML vazio ou inválido.');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  // Check for XML parsing error
  const parserError = xmlDoc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error('Falha ao analisar o XML da Nota Fiscal. Verifique se o arquivo é um XML válido da NF-e.');
  }

  // Verify that it is an NF-e
  const infNFeElements = xmlDoc.getElementsByTagName('infNFe');
  if (infNFeElements.length === 0) {
    // Check if it has NFe or nfeProc
    const nfeElements = xmlDoc.getElementsByTagName('NFe');
    if (nfeElements.length === 0) {
      throw new Error('O arquivo XML fornecido não contém uma estrutura de NF-e (Nota Fiscal Eletrônica) reconhecida.');
    }
  }

  const infNFe = infNFeElements.length > 0 ? infNFeElements[0] : xmlDoc.documentElement;

  // 1. Chave de Acesso
  let chaveAcesso = '';
  const infNFeId = infNFe.getAttribute('Id');
  if (infNFeId && infNFeId.startsWith('NFe')) {
    chaveAcesso = infNFeId.replace(/^NFe/, '');
  }
  if (!chaveAcesso) {
    chaveAcesso = getTagText(xmlDoc, 'chNFe');
  }

  // 2. Identificação da NF-e (<ide>)
  const nNF = getTagText(xmlDoc, 'nNF');
  const serie = getTagText(xmlDoc, 'serie');
  const dhEmi = getTagText(xmlDoc, 'dhEmi') || getTagText(xmlDoc, 'dEmi');
  const natOp = getTagText(xmlDoc, 'natOp');

  let dataEmissao = new Date().toISOString().split('T')[0];
  if (dhEmi) {
    // Standard format: YYYY-MM-DDTHH:mm:ss-03:00 or YYYY-MM-DD
    const datePart = dhEmi.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      dataEmissao = datePart;
    }
  }

  // Clean and format Número NF
  let numeroNF = '';
  if (nNF) {
    // Convert 00001234 to 1234 or keep clean
    const parsedNumber = parseInt(nNF, 10);
    numeroNF = isNaN(parsedNumber) ? nNF : `NF-${parsedNumber}`;
  }

  // 3. Emitente / Fornecedor (<emit>)
  const emitElements = xmlDoc.getElementsByTagName('emit');
  let fornecedorNome = '';
  let fornecedorCNPJ = '';
  let fornecedorMunicipio = '';
  let fornecedorUF = '';

  if (emitElements.length > 0) {
    const emit = emitElements[0];
    fornecedorNome = getTagText(emit, 'xNome') || getTagText(emit, 'xFant');
    fornecedorCNPJ = getTagText(emit, 'CNPJ') || getTagText(emit, 'CPF');
    fornecedorMunicipio = getTagText(emit, 'xMun');
    fornecedorUF = getTagText(emit, 'UF');
  } else {
    fornecedorNome = getTagText(xmlDoc, 'xNome');
    fornecedorCNPJ = getTagText(xmlDoc, 'CNPJ');
  }

  // 4. Valor Total (<total> -> <ICMSTot> -> <vNF>)
  let valorTotal = 0;
  const vNF = getTagText(xmlDoc, 'vNF');
  if (vNF) {
    valorTotal = parseFloat(vNF.replace(',', '.'));
  }
  if (isNaN(valorTotal) || valorTotal <= 0) {
    const vProd = getTagText(xmlDoc, 'vProd');
    if (vProd) {
      valorTotal = parseFloat(vProd.replace(',', '.'));
    }
  }

  // 5. Categoria Sugerida
  let categoriaSugerida: CategoriaNF = 'consumo';
  const natOpLower = (natOp || '').toLowerCase();
  if (
    natOpLower.includes('retorno de conserto') ||
    (natOpLower.includes('retorno') && (natOpLower.includes('conserto') || natOpLower.includes('reparo') || natOpLower.includes('manuten')))
  ) {
    categoriaSugerida = 'retorno de conserto';
  } else if (natOpLower.includes('conserto') || natOpLower.includes('reparo') || natOpLower.includes('manuten')) {
    categoriaSugerida = 'remessa de conserto';
  } else if (natOpLower.includes('servico') || natOpLower.includes('serviço')) {
    categoriaSugerida = 'servico';
  } else if (
    natOpLower.includes('frete') ||
    natOpLower.includes('transporte') ||
    natOpLower.includes('cte') ||
    natOpLower.includes('conhecimento de transporte')
  ) {
    categoriaSugerida = 'frete';
  } else if (
    natOpLower.includes('revenda') ||
    natOpLower.includes('comercializa') ||
    natOpLower.includes('venda de mercadoria')
  ) {
    categoriaSugerida = 'revenda';
  } else {
    categoriaSugerida = 'consumo';
  }

  // 6. Duplicatas e Cobrança (<cobr> -> <dup>)
  const dupElements = xmlDoc.getElementsByTagName('dup');
  const duplicatas: ParsedDuplicata[] = [];

  for (let i = 0; i < dupElements.length; i++) {
    const dupNode = dupElements[i];
    const nDup = getTagText(dupNode, 'nDup');
    const dVenc = getTagText(dupNode, 'dVenc');
    const vDup = getTagText(dupNode, 'vDup');

    let dtVencimento = '';
    if (dVenc) {
      const vPart = dVenc.substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(vPart)) {
        dtVencimento = vPart;
      }
    }

    const valParc = vDup ? parseFloat(vDup.replace(',', '.')) : 0;

    duplicatas.push({
      numeroParcela: i + 1,
      numeroDuplicata: nDup || `${i + 1}`,
      dataVencimento: dtVencimento || dataEmissao,
      valor: isNaN(valParc) ? 0 : valParc,
    });
  }

  // 7. Forma de Pagamento Sugerida (<pag> -> <detPag> -> <tPag>)
  let formaPagamentoSugerida: FormaPagamento = 'boleto';
  const tPag = getTagText(xmlDoc, 'tPag');

  if (tPag === '90' || natOpLower.includes('sem faturamento') || categoriaSugerida === 'retorno de conserto') {
    formaPagamentoSugerida = 'sem faturamento';
  } else if (duplicatas.length > 0) {
    formaPagamentoSugerida = 'boleto';
  } else {
    if (tPag === '01') {
      formaPagamentoSugerida = 'dinheiro';
    } else if (tPag === '03' || tPag === '04') {
      formaPagamentoSugerida = 'cartao';
    } else if (tPag === '15') {
      formaPagamentoSugerida = 'boleto';
    } else if (tPag === '17') {
      formaPagamentoSugerida = 'pix';
    } else {
      formaPagamentoSugerida = 'boleto';
    }
  }

  // 8. Itens / Produtos da NF
  const prodElements = xmlDoc.getElementsByTagName('prod');
  const itensResumo: string[] = [];
  const maxItensToExtract = 4;

  for (let i = 0; i < Math.min(prodElements.length, maxItensToExtract); i++) {
    const xProd = getTagText(prodElements[i], 'xProd');
    const qCom = getTagText(prodElements[i], 'qCom');
    const uCom = getTagText(prodElements[i], 'uCom');
    if (xProd) {
      const qtdStr = qCom ? ` (${parseFloat(qCom).toFixed(0)} ${uCom || 'un'})` : '';
      itensResumo.push(`${xProd}${qtdStr}`);
    }
  }
  if (prodElements.length > maxItensToExtract) {
    itensResumo.push(`+ ${prodElements.length - maxItensToExtract} outro(s) item(ns)`);
  }

  // 9. Informações Complementares (<infAdic> -> <infCpl>)
  const infCpl = getTagText(xmlDoc, 'infCpl');

  // Observações adicionais não devem ser preenchidas automaticamente ao importar do XML
  const observacoesFormatadas = '';

  return {
    numeroNF: numeroNF || (nNF ? `NF-${nNF}` : ''),
    serie: serie || undefined,
    chaveAcesso: chaveAcesso || undefined,
    dataEmissao,
    fornecedorNome,
    fornecedorCNPJ: fornecedorCNPJ ? formatCNPJ(fornecedorCNPJ) : undefined,
    fornecedorMunicipio: fornecedorMunicipio || undefined,
    fornecedorUF: fornecedorUF || undefined,
    valorTotal: isNaN(valorTotal) ? 0 : valorTotal,
    valorTotalFormatado: formatNumberToCurrencyInput(valorTotal),
    naturezaOperacao: natOp || undefined,
    categoriaSugerida,
    formaPagamentoSugerida,
    duplicatas,
    itensResumo,
    informacoesComplementares: infCpl || undefined,
    observacoesFormatadas,
  };
}
