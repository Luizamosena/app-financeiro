export type CategoriaNF = 'consumo' | 'revenda' | 'remessa de conserto' | 'retorno de conserto' | 'servico' | 'frete';

export type FormaPagamento = 'boleto' | 'pix' | 'transferencia' | 'cartao' | 'dinheiro' | 'sem faturamento';

export interface PagamentoFeito {
  id: string;
  dataPagamento: string; // YYYY-MM-DD
  valor: number;
  beneficiario: string;
  numeroNotaFiscal: string;
  mesEmissaoNF: string; // YYYY-MM or formatted "Mês/Ano"
  banco?: string;
  formaPagamento?: string;
  observacoes?: string;
  criadoEm: string;
  boletoOrigem?: BoletoAPagar;
}

export interface ParcelaBoletoInput {
  numeroParcela: number;
  dataVencimento: string; // YYYY-MM-DD
  valor: number;
  valorInput?: string;
  codigoBarras?: string;
}

export interface NotaFiscalEntrada {
  id: string;
  numeroNF: string;
  dataEmissao: string; // YYYY-MM-DD
  valorTotal: number;
  fornecedor: string;
  categoria: CategoriaNF;
  formaPagamento: FormaPagamento;
  quantidadeParcelas?: number;
  observacoes?: string;
  criadoEm: string;
  pixLancado?: boolean;
  pixBanco?: string;
  pixDataPagamento?: string;
  pixPagamentoId?: string;
}

export interface BoletoAPagar {
  id: string;
  notaFiscalId?: string;
  numeroNF: string;
  fornecedor: string;
  categoria: CategoriaNF;
  dataEmissaoNF: string; // YYYY-MM-DD
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  parcelaInfo?: string; // ex: "1/3" ou "Única"
  codigoBarras?: string;
  pago?: boolean;
  criadoEm: string;
  agrupado?: boolean;
  grupoId?: string;
  notasOrigem?: string[];
  titulosOrigemQtd?: number;
  boletosOriginais?: BoletoAPagar[];
  observacoes?: string;
}

export interface OrdemServico {
  id: string;
  numero: number;
  status: 'pendente' | 'baixada';
  dataBaixa?: string;
  observacao?: string;
  criadoEm: string;
}

export type TabType = 'pagamentos' | 'notas_fiscais' | 'boletos' | 'baixa_os';

export type ProfileId = 'perfil_1' | 'perfil_2';

export interface ProfileConfig {
  id: ProfileId;
  name: string;
  subtitle: string;
  documento?: string; // CNPJ / Razão Social
  color: 'emerald' | 'indigo' | 'blue' | 'purple' | 'amber';
}

export interface ProfileData {
  pagamentos: PagamentoFeito[];
  notasFiscais: NotaFiscalEntrada[];
  boletos: BoletoAPagar[];
  ordensServico: OrdemServico[];
}

export interface UserSession {
  isAuthenticated: boolean;
  username: string;
  loginTime: string;
  activeProfileId: ProfileId;
  rememberMe: boolean;
}

export interface UserProfileData {
  nomeCompleto: string;
  email: string;
  telefone: string;
  cargo?: string;
  atualizadoEm?: string;
}
